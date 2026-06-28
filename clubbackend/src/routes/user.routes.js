import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"
import { loginUser, registerUser, logoutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, updateUserProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

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

router.route("/login").post(loginUser);
//Protected Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/avatar").patch(
    verifyJWT,
    upload.single("avatar"), // <-- Multer intercepts the file here
    updateUserAvatar
);
router.route("/cover-image").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);
router.route("/profile").patch(verifyJWT, updateUserProfile);

export default router;