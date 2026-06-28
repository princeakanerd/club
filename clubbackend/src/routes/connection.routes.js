import { Router } from "express";
import {
    getUserProfile,
    sendConnectionRequest,
    acceptConnectionRequest,
    removeConnection,
    getMyConnections,
    getPendingRequests,
    searchUsers,
} from "../controllers/connection.controller.js";
import { verifyJWT, optionalJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public profile — attach user if logged in (for connection status)
router.route("/:username/profile").get(optionalJWT, getUserProfile);

// Protected
router.use(verifyJWT);
router.route("/search").get(searchUsers);
router.route("/connections").get(getMyConnections);
router.route("/connection-requests").get(getPendingRequests);
router.route("/:userId/connect").post(sendConnectionRequest).delete(removeConnection);
router.route("/:userId/connect/accept").post(acceptConnectionRequest);

export default router;
