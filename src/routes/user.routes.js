import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { loginUser, registerUser } from "../controllers/user.controller.js";

const router = Router() ;

router.route("/register").post(
    //Middleware to handle files
    upload.fields([
        {
            //this name avatar should strictly be the same when sending form data from the frontend
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser) ;

export default router ;