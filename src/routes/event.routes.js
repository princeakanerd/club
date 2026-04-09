import { Router } from "express";
import { createEvent, getClubEvents, rsvpToEvent, getEventAttendees,getMyUpcomingEvents, updateEventDetails, deleteEvent} from "../controllers/event.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Enforce authentication for all event operations
router.use(verifyJWT);

// static routes
// Route: POST /api/v1/events/create
router.route("/create").post(
    upload.fields([
        { name: "bannerImage", maxCount: 1 }
    ]),
    createEvent
);

// dynamic routes
router.route("/club/:clubId").get(getClubEvents);
router.route("/:eventId/rsvp").post(rsvpToEvent); 
router.route("/:eventId/attendees").get(getEventAttendees);
router.route("/:eventId").patch(updateEventDetails);
router.route("/:eventId").delete(deleteEvent);
router.route("/my-upcoming").get(getMyUpcomingEvents); // <-- ADD THIS HERE

export default router;