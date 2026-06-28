import { User } from "../models/user.models.js";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// GET /users/:username/profile — public profile of any user.
// Accepts either a username or a Mongo ObjectId so callers that only
// have a userId (e.g. opening a DM) can resolve a profile too.
const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const query = mongoose.isValidObjectId(username)
        ? { _id: username }
        : { username: username.toLowerCase() };

    const user = await User.findOne(query)
        .select("-password -refreshToken -email")
        .populate("joinedClubs.club", "name logo category");

    if (!user) throw new ApiError(404, "User not found");

    let connectionStatus = "NONE";
    if (req.user) {
        const myConnections = req.user.connections || [];
        const myEntry = myConnections.find(
            (c) => c.user.toString() === user._id.toString()
        );
        if (myEntry) {
            connectionStatus =
                myEntry.status === "ACCEPTED"
                    ? "CONNECTED"
                    : myEntry.initiatedBy.toString() === req.user._id.toString()
                    ? "PENDING_SENT"
                    : "PENDING_RECEIVED";
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { ...user.toObject(), connectionStatus }, "Profile fetched")
    );
});

// POST /users/:userId/connect — send connection request
const sendConnectionRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (userId === req.user._id.toString())
        throw new ApiError(400, "You can't connect with yourself");

    const target = await User.findById(userId);
    if (!target) throw new ApiError(404, "User not found");

    const myConnections = req.user.connections || [];
    const alreadyExists = myConnections.find((c) => c.user.toString() === userId);
    if (alreadyExists) throw new ApiError(409, "Connection request already exists");

    await User.findByIdAndUpdate(req.user._id, {
        $push: { connections: { user: userId, status: "PENDING", initiatedBy: req.user._id } }
    });
    await User.findByIdAndUpdate(userId, {
        $push: { connections: { user: req.user._id, status: "PENDING", initiatedBy: req.user._id } }
    });

    // Notify the target user
    await Notification.create({
        recipient: userId,
        message: `${req.user.fullName} sent you a connection request.`,
        type: "CONNECTION_REQUEST",
        relatedUser: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, {}, "Connection request sent"));
});

// POST /users/:userId/connect/accept
const acceptConnectionRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const myEntry = (req.user.connections || []).find(
        (c) => c.user.toString() === userId && c.status === "PENDING"
    );
    if (!myEntry) throw new ApiError(404, "No pending request from this user");
    if (myEntry.initiatedBy.toString() === req.user._id.toString())
        throw new ApiError(400, "You can't accept your own request");

    await User.updateOne(
        { _id: req.user._id, "connections.user": userId },
        { $set: { "connections.$.status": "ACCEPTED" } }
    );
    await User.updateOne(
        { _id: userId, "connections.user": req.user._id },
        { $set: { "connections.$.status": "ACCEPTED" } }
    );

    // Notify the original requester that their request was accepted
    await Notification.create({
        recipient: userId,
        message: `${req.user.fullName} accepted your connection request.`,
        type: "CONNECTION_ACCEPTED",
        relatedUser: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, {}, "Connection accepted"));
});

// DELETE /users/:userId/connect — withdraw request or remove connection
const removeConnection = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { connections: { user: userId } } });
    await User.findByIdAndUpdate(userId, { $pull: { connections: { user: req.user._id } } });
    return res.status(200).json(new ApiResponse(200, {}, "Connection removed"));
});

// GET /users/connections — list accepted connections
const getMyConnections = asyncHandler(async (req, res) => {
    const me = await User.findById(req.user._id)
        .select("connections")
        .populate("connections.user", "fullName username avatar bio batchYear");

    const connections = (me.connections || []);
    const accepted = connections
        .filter((c) => c.status === "ACCEPTED")
        .map((c) => c.user);

    return res.status(200).json(new ApiResponse(200, accepted, "Connections fetched"));
});

// GET /users/connection-requests — pending requests sent TO me
const getPendingRequests = asyncHandler(async (req, res) => {
    const me = await User.findById(req.user._id)
        .select("connections")
        .populate("connections.user", "fullName username avatar bio batchYear");

    const connections = (me.connections || []);
    const pending = connections
        .filter(
            (c) =>
                c.status === "PENDING" &&
                c.initiatedBy.toString() !== req.user._id.toString()
        )
        .map((c) => ({ ...c.user.toObject(), connectionEntryId: c._id }));

    return res.status(200).json(new ApiResponse(200, pending, "Pending requests fetched"));
});

// GET /users/search?q=name
const searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
        throw new ApiError(400, "Query must be at least 2 characters");

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
        $or: [{ fullName: regex }, { username: regex }],
        _id: { $ne: req.user._id },
    })
        .select("fullName username avatar bio batchYear")
        .limit(20);

    return res.status(200).json(new ApiResponse(200, users, "Search results"));
});

export {
    getUserProfile,
    sendConnectionRequest,
    acceptConnectionRequest,
    removeConnection,
    getMyConnections,
    getPendingRequests,
    searchUsers,
};
