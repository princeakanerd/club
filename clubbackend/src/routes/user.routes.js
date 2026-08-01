import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"
import { loginUser, registerUser, logoutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, updateUserProfile, refreshAccessToken, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, registerPushToken, unregisterPushToken } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/user.validators.js";

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
    // multer populates req.body from the multipart form before we validate it
    validate(registerSchema),
    registerUser
)

router.route("/login").post(authLimiter, validate(loginSchema), loginUser);
// Re-issue an access token from a valid refresh token (rotates the refresh token)
router.route("/refresh-token").post(refreshAccessToken);

// ── Email verification & password reset ──
// Verify supports GET (clicking the email link) and POST (frontend posting the token)
router.route("/verify-email").get(verifyEmail).post(verifyEmail);
router.route("/resend-verification").post(verifyJWT, authLimiter, resendVerificationEmail);
router.route("/forgot-password").post(authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password").post(authLimiter, validate(resetPasswordSchema), resetPassword);

//Protected Routes
router.route("/logout").post(verifyJWT, logoutUser);
// Expo push token register/unregister (mobile)
router.route("/push-token").post(verifyJWT, registerPushToken).delete(verifyJWT, unregisterPushToken);
router.route("/change-password").post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);
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