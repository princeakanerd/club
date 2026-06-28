import { Router } from "express";
import { createClub, deleteClub, getAllClubs, getClubMembers, getClubProfile, getMyClubs, joinClub, leaveClub, updateClubDetails, updateMemberRole, removeMember } from "../controllers/club.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes — no login needed to browse clubs
router.route("/").get(getAllClubs);

// Protected routes — login required below this line
router.use(verifyJWT);

router.route("/my-clubs").get(getMyClubs);

// /:clubId must come after named routes to avoid swallowing them
router.route("/:clubId").get(getClubProfile);
router.route("/create").post(
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    createClub
);
router.route("/:clubId").patch(
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    updateClubDetails
).delete(deleteClub);
router.route("/:clubId/join").post(joinClub);
router.route("/:clubId/leave").post(leaveClub);
router.route("/:clubId/members").get(getClubMembers);
router.route("/:clubId/members/:memberId/role").patch(updateMemberRole);
router.route("/:clubId/members/:memberId").delete(removeMember);

export default router;
