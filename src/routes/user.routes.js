import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { loginUser, registerUser, logoutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router() ;

router.route("/register").post(
    //Middleware to handle files
    //the below upload is fetched from multer middleware that gives us req.files
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
//Protected Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword) ;
router.route("/current-user").get(verifyJWT, getCurrentUser) ;
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

export default router ;