import express from "express"
import cors from "cors";
import helmet from "helmet";
import userRouter from "./routes/user.routes.js"
import clubRouter from './routes/club.routes.js';
import cookieParser from "cookie-parser";
import eventRouter from "./routes/event.routes.js";
import postRouter from "./routes/post.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import announcementRouter from "./routes/announcement.routes.js";
import connectionRouter from "./routes/connection.routes.js";
import messageRouter from "./routes/message.routes.js";
import feedRouter from "./routes/feed.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
const app = express() ;

// Security headers. crossOriginResourcePolicy is relaxed so the frontend on a
// different origin can still load any static assets served from here.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],  // your Vite frontend URL
    credentials: true                 // allows cookies to be sent
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser()) ;

// Broad rate limit across the whole API surface
app.use("/api", apiLimiter);

app.use("/api/v1/users", userRouter) ;
app.use("/api/v1/clubs", clubRouter); 
app.use("/api/v1/events", eventRouter); 
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/announcements", announcementRouter);
app.use("/api/v1/users", connectionRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/feed", feedRouter);
app.use("/api/v1/uploads", uploadRouter);

// Health/landing — only the exact root so unmatched API routes fall through
// to the 404 handler below instead of being swallowed here.
app.get("/", (req, res) => {
    res.send("<h1>Server is running!</h1><p>Go to /api/v1/users (or your specific route) to test the API.</p>");
});

// Unmatched route -> 404 ApiError, then the centralized error handler.
// These two MUST stay last.
app.use(notFound);
app.use(errorHandler);


export default app ;