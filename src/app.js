import express from "express"
import userRouter from "./routes/user.routes.js"
import clubRouter from './routes/club.routes.js'; 
import cookieParser from "cookie-parser";
import eventRouter from "./routes/event.routes.js"; 
const app = express() ;

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser()) ;

app.use("/api/v1/users", userRouter) ;
app.use("/api/v1/clubs", clubRouter); 
app.use("/api/v1/events", eventRouter); 
app.use("/", (req, res) => {
    res.send("<h1>Server is running!</h1><p>Go to /api/v1/users (or your specific route) to test the API.</p>");
});


export default app ;