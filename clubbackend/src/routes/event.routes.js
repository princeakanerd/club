import { Router } from "express";
import { createEvent, getClubEvents, rsvpToEvent, getEventAttendees, getMyUpcomingEvents, updateEventDetails, deleteEvent } from "../controllers/event.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes — anyone can view club events
router.route("/club/:clubId").get(getClubEvents);

// Protected routes — login required below this line
router.use(verifyJWT);

router.route("/create").post(
    upload.fields([
        { name: "bannerImage", maxCount: 1 },
        { name: "pastImages", maxCount: 6 },
    ]),
    createEvent
);
router.route("/my-upcoming").get(getMyUpcomingEvents);
router.route("/:eventId/rsvp").post(rsvpToEvent);
router.route("/:eventId/attendees").get(getEventAttendees);
router.route("/:eventId").patch(updateEventDetails).delete(deleteEvent);

export default router;
