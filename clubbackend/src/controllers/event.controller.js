import { Event } from "../models/event.models.js";
import { Club } from "../models/club.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const createEvent = asyncHandler(async (req, res) => {
    // 1. Extract the text payload from the request body
    const { title, description, eventDate, venue, isPublished, hostedBy } = req.body;

    // Validation: Ensure all core fields are provided
    if (!title || !description || !eventDate || !venue || !hostedBy) {
        throw new ApiError(400, "Title, description, eventDate, venue, and hostedBy (Club ID) are strictly required");
    }

    if (!mongoose.isValidObjectId(hostedBy)) {
        throw new ApiError(400, "Invalid Club ID format provided in hostedBy");
    }

    // 2. Cross-Collection Authorization (RBAC)
    // We must fetch the club to verify its existence AND to check who owns it
    const club = await Club.findById(hostedBy);

    if (!club) {
        throw new ApiError(404, "The specified club does not exist");
    }

    // Strictly enforce that only the creator of the club can attach an event to it
    if (club.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the club LEAD can create events for this club");
    }

    // 3. Extract and upload the file
    // Multer will inject the file into req.files.bannerImage
    const bannerLocalPath = req.files?.bannerImage?.[0]?.path;

    if (!bannerLocalPath) {
        throw new ApiError(400, "Event banner image is required");
    }

    const bannerImage = await uploadOnCloudinary(bannerLocalPath);

    if (!bannerImage?.url) {
        throw new ApiError(500, "Failed to upload the banner image to cloud storage");
    }

    // 4. Create the Event Document
    // We pass the raw eventDate string directly; Mongoose will automatically cast it to a JS Date object
    const event = await Event.create({
        title,
        description,
        eventDate,
        venue,
        bannerImage: bannerImage.url,
        isPublished: isPublished === undefined ? true : isPublished,
        hostedBy,
        createdBy: req.user._id
    });

    // 5. Return success response
    return res
        .status(201)
        .json(new ApiResponse(201, event, "Event successfully created"));
});
const getClubEvents = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId from the URL
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Execute the Database Read Operation
    // We query the Event collection to find all documents that map to this specific club.
    const events = await Event.find({
        hostedBy: clubId,
        isPublished: true // Strict filter: Do not return draft events to the public feed
    })
    .select("-rsvp") // Project out the rsvp array to save bandwidth
    .sort({ eventDate: 1 }); // Sort by eventDate ascending (1), so the soonest upcoming events appear at the top of the array

    // 3. Return the array of events
    return res
        .status(200)
        .json(new ApiResponse(200, events, "Club events fetched successfully"));
});
const rsvpToEvent = asyncHandler(async (req, res) => {
    // 1. Extract and validate the eventId and status
    const { eventId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid Event ID format");
    }

    if (!["GOING", "NOT_GOING", "MAYBE"].includes(status)) {
        throw new ApiError(400, "Invalid RSVP status. Must be GOING, NOT_GOING, or MAYBE.");
    }

    // 2. Verify the event actually exists
    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 3. Update or Add RSVP
    const existingRsvpIndex = event.rsvp.findIndex(r => r.user.toString() === req.user._id.toString());
    
    if (existingRsvpIndex > -1) {
        event.rsvp[existingRsvpIndex].status = status;
    } else {
        event.rsvp.push({ user: req.user._id, status });
    }

    await event.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, `Successfully RSVP'd as ${status}`));
});

const getEventAttendees = asyncHandler(async (req, res) => {
    // 1. Extract and validate the eventId
    const { eventId } = req.params;

    if (!mongoose.isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid Event ID format");
    }

    // 2. Fetch the event and hydrate the rsvp array
    const event = await Event.findById(eventId).populate(
        "rsvp.user",
        "fullName username email avatar"
    );

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 3. Authorization (RBAC)
    if (event.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the event creator can view the attendee roster");
    }

    // 4. Return the populated rsvp array
    return res
        .status(200)
        .json(new ApiResponse(200, event.rsvp, "Event RSVP list fetched successfully"));
});

const updateEventDetails = asyncHandler(async (req, res) => {
    // 1. Extract and validate the eventId
    const { eventId } = req.params;

    if (!mongoose.isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid Event ID format");
    }

    // 2. Extract the updated fields from the JSON payload
    const { title, description, eventDate, venue, isPublished } = req.body;

    // Validation: Ensure at least one field is provided
    if (!title && !description && !eventDate && !venue && isPublished === undefined) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    // 3. Fetch the event to verify existence and check authorization
    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 4. Authorization (RBAC)
    // Strictly enforce that only the creator can modify the event details
    if (event.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the event creator can modify this event");
    }

    // 5. Execute the Database Update
    // The $set operator ensures only the provided fields are overwritten
    const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        {
            $set: {
                title,
                description,
                eventDate,
                venue,
                isPublished
            }
        },
        { new: true, runValidators: true } 
    );

    // 6. Return the updated document
    return res
        .status(200)
        .json(new ApiResponse(200, updatedEvent, "Event details updated successfully"));
});

const deleteEvent = asyncHandler(async (req, res) => {
    // 1. Extract and validate the eventId
    const { eventId } = req.params;

    if (!mongoose.isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid Event ID format");
    }

    // 2. Locate the event to verify existence and ownership
    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 3. Authorization (RBAC)
    if (event.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the event creator can delete this event");
    }

    // 4. Execute the Database Deletion
    await Event.findByIdAndDelete(eventId);

    // 5. Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Event successfully deleted"));
});

const getMyUpcomingEvents = asyncHandler(async (req, res) => {
    // We query the Event collection to find any event where the user RSVP'd as GOING or MAYBE
    const upcomingEvents = await Event.find({
        "rsvp": {
            $elemMatch: {
                user: req.user._id,
                status: { $in: ["GOING", "MAYBE"] }
            }
        },
        eventDate: {
            $gte: new Date()
        }
    })
    .populate("hostedBy", "name logo category")
    .select("-rsvp") 
    .sort({ eventDate: 1 });

    return res
        .status(200)
        .json(new ApiResponse(200, upcomingEvents, "User's upcoming events fetched successfully"));
});

// Update the exports list at the bottom:
export { 
    createEvent, 
    getClubEvents, 
    rsvpToEvent, 
    getEventAttendees, 
    updateEventDetails, 
    deleteEvent,
    getMyUpcomingEvents 
};




