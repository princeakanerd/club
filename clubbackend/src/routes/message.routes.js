import { Router } from "express";
import {
    sendDM,
    getDMThread,
    markDMRead,
    sendClubMessage,
    getClubMessages,
    getInbox,
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/inbox").get(getInbox);
router.route("/dm/:receiverId").post(sendDM);
router.route("/dm/:otherUserId").get(getDMThread);
router.route("/dm/:otherUserId/read").patch(markDMRead);
router.route("/club/:clubId").post(sendClubMessage);
router.route("/club/:clubId").get(getClubMessages);

export default router;
