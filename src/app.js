import express from "express"
import userRouter from "./routes/user.routes.js"
const app = express() ;

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use("/", (req, res) => {
    res.send("<h1>Server is running!</h1><p>Go to /api/v1/users (or your specific route) to test the API.</p>");
});
export default app ;