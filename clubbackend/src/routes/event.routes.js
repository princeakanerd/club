import { Router } from "express";
import { createEvent, getClubEvents, rsvpToEvent, getEventAttendees, getMyUpcomingEvents, updateEventDetails, deleteEvent, getCheckInCode, regenerateCheckInCode, checkInToEvent, setAttendance, downloadEventICS } from "../controllers/event.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes — anyone can view club events
router.route("/club/:clubId").get(getClubEvents);
// Public calendar export (#13)
router.route("/:eventId/calendar.ics").get(downloadEventICS);

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

// ── QR attendance check-in (#10) ──
router.route("/:eventId/checkin-code").get(getCheckInCode);
router.route("/:eventId/checkin-code/regenerate").post(regenerateCheckInCode);
router.route("/:eventId/checkin").post(checkInToEvent);
router.route("/:eventId/attendees/:userId/attendance").patch(setAttendance);

router.route("/:eventId").patch(updateEventDetails).delete(deleteEvent);

export default router;
