import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPost, getClubPosts, likePost, addComment } from "../controllers/post.controller.js";

const router = Router();

// Public route to view posts
router.route("/club/:clubId").get(getClubPosts);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT to all routes below this line

router.route("/").post(upload.single("image"), createPost);
router.route("/:postId/like").patch(likePost);
router.route("/:postId/comment").post(addComment);

export default router;
