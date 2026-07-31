import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({ path: './.env' });

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { parseCookie } from "cookie";
import app from "./app.js";
import { startCronJobs } from "./utils/cronJobs.js";

const httpServer = createServer(app);

const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

export const io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

// Track userId → Set of socketIds (a user may have multiple tabs/devices)
const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socketId);
};
const removeSocket = (userId, socketId) => {
    const set = onlineUsers.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) onlineUsers.delete(userId);
};

/* Authenticate the socket handshake with the same access token the REST API
   uses — read it from the auth payload, the Authorization header, or the
   cookie. Reject the connection if it's missing/invalid (no more trusting a
   spoofable query param). */
io.use((socket, next) => {
    try {
        const { token: authToken } = socket.handshake.auth || {};
        const headerToken = socket.handshake.headers?.authorization?.replace("Bearer ", "");
        const cookieToken = socket.handshake.headers?.cookie
            ? parseCookie(socket.handshake.headers.cookie).accessToken
            : undefined;
        const token = authToken || headerToken || cookieToken;
        if (!token) return next(new Error("Unauthorized: no token"));

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.userId = decoded._id;
        next();
    } catch {
        next(new Error("Unauthorized: invalid token"));
    }
});

io.on("connection", (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);
    // Let others know presence changed
    socket.broadcast.emit("presence", { userId, online: true });

    // Join club rooms for group chat
    socket.on("join_club", (clubId) => socket.join(`club_${clubId}`));
    socket.on("leave_club", (clubId) => socket.leave(`club_${clubId}`));

    // Typing indicators (#15) — relayed, not persisted.
    // DM: notify the specific partner. Club: broadcast to the room.
    socket.on("typing", ({ to, clubId, isTyping }) => {
        if (clubId) {
            socket.to(`club_${clubId}`).emit("typing", { clubId, userId, isTyping });
        } else if (to) {
            emitToUser(to, "typing", { from: userId, isTyping });
        }
    });

    // Client signals it has read a thread; controllers also emit read events,
    // this is the lightweight live ping for the other side.
    socket.on("read_dm", ({ partnerId }) => {
        if (partnerId) emitToUser(partnerId, "dm_read", { by: userId });
    });

    socket.on("disconnect", () => {
        removeSocket(userId, socket.id);
        if (!onlineUsers.has(userId)) {
            socket.broadcast.emit("presence", { userId, online: false });
        }
    });
});

/* Emit an event to every socket a given user has open. Used by REST
   controllers (e.g. on new message / read receipt). */
export const emitToUser = (userId, event, payload) => {
    const set = onlineUsers.get(userId?.toString());
    if (!set) return;
    for (const socketId of set) io.to(socketId).emit(event, payload);
};

export { onlineUsers };

const PORT = process.env.PORT || 8000;

// If the port is already held (e.g. a previous instance didn't release it yet
// on a fast restart), don't hard-crash with an uncaught 'error' event — log a
// clear message and exit cleanly so the process manager can retry.
httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Another server instance is still running — free it and retry.`);
    } else {
        console.error("HTTP server error:", err);
    }
    process.exit(1);
});

// Graceful shutdown: close the HTTP server (releases the port) so the next
// start can bind immediately instead of colliding.
const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    httpServer.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
    // Force-exit if close() hangs (e.g. lingering sockets)
    setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Don't let an unexpected async error take the whole process down silently.
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

connectDB()
    .then(() => {
        startCronJobs();
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err?.message || err);
        process.exit(1);
    });
