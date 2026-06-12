import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUserNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getUserNotifications);
router.route("/mark-all-read").patch(markAllAsRead);
router.route("/:notificationId/read").patch(markAsRead);

export default router;
