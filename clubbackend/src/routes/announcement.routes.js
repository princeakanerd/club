import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createAnnouncement, getClubAnnouncements } from "../controllers/announcement.controller.js";

const router = Router();

router.route("/club/:clubId").get(getClubAnnouncements);

router.use(verifyJWT);
router.route("/").post(createAnnouncement);

export default router;
