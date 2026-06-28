import { Router } from "express";
import { getFeed, globalSearch } from "../controllers/feed.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getFeed);
router.route("/search").get(globalSearch);

export default router;
