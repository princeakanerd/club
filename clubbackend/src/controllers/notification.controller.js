import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parsePageQuery, buildPage } from "../utils/pagination.js";

const getUserNotifications = asyncHandler(async (req, res) => {
    // Newest-first, cursor-paginated (?limit&cursor). Backward compatible:
    // callers that pass nothing get the most recent page in `data` as before.
    const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 20 });

    const docs = await Notification.find({ recipient: req.user._id, ...cursorFilter })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate("relatedEvent", "title eventDate")
        .populate("relatedClub", "name")
        .populate("relatedUser", "fullName username avatar");

    const { items, meta } = buildPage(docs, limit);

    return res.status(200).json(new ApiResponse(200, items, "Notifications fetched successfully", meta));
});

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { $set: { isRead: true } },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found or unauthorized");
    }

    return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read"));
});

const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    return res.status(200).json(new ApiResponse(200, {}, "All notifications marked as read"));
});

export { getUserNotifications, markAsRead, markAllAsRead };
