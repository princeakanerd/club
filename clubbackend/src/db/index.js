import dotenv from "dotenv"
import mongoose from "mongoose"
import { DB_NAME } from "../constants.js";
dotenv.config() ;

// Hello This was edited

const connectDB = async() => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MONGODB Connected!!!`, `Info about the connectionInstance Host ${connectionInstance.connection.host}`);
        
    } catch(error){
        console.log("MongoDB Connection Error", error) ;
        process.exit(1);
    }
}
export default connectDB ;
