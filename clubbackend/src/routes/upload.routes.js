import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUploadSignature } from "../controllers/upload.controller.js";

const router = Router();

// Auth-gated: only logged-in users can mint an upload signature.
router.route("/signature").get(verifyJWT, getUploadSignature);

export default router;
