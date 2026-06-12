import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: './.env'
});
import app from "./app.js";

import { startCronJobs } from "./utils/cronJobs.js";

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.error(error) ;
        throw error ;
    });
    
    // Start background jobs
    startCronJobs();
    
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server running on port ${process.env.PORT || 8000}`);
    })
})
.catch((error) => {
    console.log("MONGO DB Connection failed");
    
})
