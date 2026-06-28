import express from "express"
import cors from "cors";
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
const app = express() ;

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],  // your Vite frontend URL
    credentials: true                 // allows cookies to be sent
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser()) ;

app.use("/api/v1/users", userRouter) ;
app.use("/api/v1/clubs", clubRouter); 
app.use("/api/v1/events", eventRouter); 
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/announcements", announcementRouter);
app.use("/api/v1/users", connectionRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/feed", feedRouter);
app.use("/", (req, res) => {
    res.send("<h1>Server is running!</h1><p>Go to /api/v1/users (or your specific route) to test the API.</p>");
});


export default app ;