import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getUserNotifications = asyncHandler(async (req, res) => {
    // Fetch notifications for the logged-in user, sorted by newest first
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .populate("relatedEvent", "title eventDate")
        .populate("relatedClub", "name")
        .populate("relatedUser", "fullName username avatar");

    return res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
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
