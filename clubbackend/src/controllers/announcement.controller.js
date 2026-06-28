import { Announcement } from "../models/announcement.models.js";
import { Club } from "../models/club.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const createAnnouncement = asyncHandler(async (req, res) => {
    // 1. Extract the payload
    // We use clubId in the body to strictly match the architecture we built for Events
    const { title, content, isImportant, clubId } = req.body;

    // Validation: Ensure core fields exist
    if (!title || !content || !clubId) {
        throw new ApiError(400, "Title, content, and clubId are strictly required");
    }

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Fetch the club to verify existence and check authorization
    const club = await Club.findById(clubId);

    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // 3. Authorization — LEAD (creator) or EXECUTIVE can post announcements
    const membership = req.user.joinedClubs.find(m => m.club.toString() === clubId);
    const isAuthorised =
        club.createdBy.toString() === req.user._id.toString() ||
        (membership && ["LEAD", "EXECUTIVE"].includes(membership.role));

    if (!isAuthorised) {
        throw new ApiError(403, "Forbidden: Only club LEAD or EXECUTIVE can post announcements");
    }

    // 4. Create the Announcement document
    const announcement = await Announcement.create({
        title,
        content,
        isImportant: isImportant === undefined ? false : isImportant,
        club: clubId,
        createdBy: req.user._id
    });

    // 5. Return the response
    return res
        .status(201)
        .json(new ApiResponse(201, announcement, "Announcement successfully posted"));
});

const getClubAnnouncements = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId from the URL
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Execute the Database Read Operation
    const announcements = await Announcement.find({ club: clubId })
        .populate("createdBy", "fullName avatar") // Hydrate the LEAD's details so the frontend shows who posted it
        .sort({ createdAt: -1 }); // -1 = Descending order (newest announcements appear at the top of the feed)

    // 3. Return the array
    return res
        .status(200)
        .json(new ApiResponse(200, announcements, "Club announcements fetched successfully"));
});

export { createAnnouncement, getClubAnnouncements };