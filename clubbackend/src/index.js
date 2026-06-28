import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({ path: './.env' });

import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { startCronJobs } from "./utils/cronJobs.js";

const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        credentials: true,
    },
});

// Track userId → socketId mappings for targeted delivery
const onlineUsers = new Map();

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) onlineUsers.set(userId, socket.id);

    // Join club room for group chat
    socket.on("join_club", (clubId) => socket.join(`club_${clubId}`));
    socket.on("leave_club", (clubId) => socket.leave(`club_${clubId}`));

    socket.on("disconnect", () => {
        if (userId) onlineUsers.delete(userId);
    });
});

export { onlineUsers };

connectDB()
    .then(() => {
        startCronJobs();
        httpServer.listen(process.env.PORT || 8000, () => {
            console.log(`Server running on port ${process.env.PORT || 8000}`);
        });
    })
    .catch(() => {
        console.log("MongoDB connection failed");
    });
