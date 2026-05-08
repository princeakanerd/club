import { Router } from "express";
import { createClub, deleteClub, getAllClubs, getClubMembers, getClubProfile, getMyClubs, joinClub, leaveClub, updateClubDetails } from "../controllers/club.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Apply verifyJWT to all routes in this file automatically
// Since every club action requires a logged-in user, this saves us from adding it to every single route
router.use(verifyJWT);
// Route: POST /api/v1/clubs/create
router.route("/create").post(
    upload.fields([
        {
            name: "logo",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    createClub
);

router.route("/").get(getAllClubs);
router.route("/create").post( createClub);
router.route("/:clubId").patch(updateClubDetails);
router.route("/my-clubs").get(getMyClubs); 

//Dynamic parameter routes
router.route("/:clubId").get(getClubProfile);
router.route("/:clubId/join").post(joinClub);
router.route("/:clubId/leave").post(leaveClub);
router.route("/:clubId").delete(deleteClub);
router.route("/:clubId/members").get(getClubMembers);


export default router;