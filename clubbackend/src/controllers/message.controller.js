import { Message } from "../models/message.models.js";
import { User } from "../models/user.models.js";
import { Club } from "../models/club.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { io, onlineUsers } from "../index.js";

// POST /messages/dm/:receiverId
const sendDM = asyncHandler(async (req, res) => {
    const { receiverId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) throw new ApiError(400, "Message content is required");

    // Must be connected to DM
    const me = await User.findById(req.user._id).select("connections");
    const isConnected = (me.connections || []).some(
        (c) => c.user.toString() === receiverId && c.status === "ACCEPTED"
    );
    if (!isConnected)
        throw new ApiError(403, "You must be connected to send a DM");

    const msg = await Message.create({
        sender: req.user._id,
        receiverId,
        content: content.trim(),
    });
    await msg.populate("sender", "fullName username avatar");

    // Emit to receiver if online
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit("new_dm", msg);

    return res.status(201).json(new ApiResponse(201, msg, "Message sent"));
});

// GET /messages/dm/:otherUserId — fetch DM thread
const getDMThread = asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
        receiverId: { $ne: null },
        $or: [
            { sender: myId, receiverId: otherUserId },
            { sender: otherUserId, receiverId: myId },
        ],
    })
        .populate("sender", "fullName username avatar")
        .sort({ createdAt: 1 })
        .limit(200);

    return res.status(200).json(new ApiResponse(200, messages, "DM thread fetched"));
});

// POST /messages/club/:clubId
const sendClubMessage = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) throw new ApiError(400, "Message content is required");

    // Must be a member of the club
    const isMember = req.user.joinedClubs.some(
        (m) => m.club.toString() === clubId
    );
    if (!isMember)
        throw new ApiError(403, "You must be a club member to send messages here");

    const msg = await Message.create({
        sender: req.user._id,
        clubId,
        content: content.trim(),
    });
    await msg.populate("sender", "fullName username avatar");

    // Broadcast to all club room members
    io.to(`club_${clubId}`).emit("new_club_message", msg);

    return res.status(201).json(new ApiResponse(201, msg, "Message sent"));
});

// GET /messages/club/:clubId
const getClubMessages = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const isMember = req.user.joinedClubs.some(
        (m) => m.club.toString() === clubId
    );
    if (!isMember)
        throw new ApiError(403, "You must be a club member to view this chat");

    const messages = await Message.find({ clubId })
        .populate("sender", "fullName username avatar")
        .sort({ createdAt: 1 })
        .limit(200);

    return res.status(200).json(new ApiResponse(200, messages, "Club chat fetched"));
});

// GET /messages/inbox — all conversations (DM partners + clubs)
const getInbox = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    // Unique DM partners (users I've talked to)
    const dmMessages = await Message.aggregate([
        {
            $match: {
                receiverId: { $ne: null },
                $or: [{ sender: myId }, { receiverId: myId }],
            },
        },
        {
            $addFields: {
                partnerId: {
                    $cond: [{ $eq: ["$sender", myId] }, "$receiverId", "$sender"],
                },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: "$partnerId",
                lastMessage: { $first: "$content" },
                lastAt: { $first: "$createdAt" },
            },
        },
    ]);

    const partnerIds = dmMessages.map((d) => d._id);
    const partners = await User.find({ _id: { $in: partnerIds } }).select(
        "fullName username avatar"
    );
    const partnerMap = Object.fromEntries(partners.map((p) => [p._id.toString(), p]));

    const dmInbox = dmMessages.map((d) => ({
        type: "DM",
        partnerId: d._id,
        partner: partnerMap[d._id.toString()],
        lastMessage: d.lastMessage,
        lastAt: d.lastAt,
    }));

    // Club group chats the user is a member of
    const clubIds = req.user.joinedClubs.map((m) => m.club);
    const clubLastMsgs = await Message.aggregate([
        { $match: { clubId: { $in: clubIds } } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: "$clubId",
                lastMessage: { $first: "$content" },
                lastAt: { $first: "$createdAt" },
            },
        },
    ]);

    const clubs = await Club.find({ _id: { $in: clubIds } }).select("name logo");
    const clubMap = Object.fromEntries(clubs.map((c) => [c._id.toString(), c]));

    const clubInbox = clubLastMsgs.map((c) => ({
        type: "CLUB",
        clubId: c._id,
        club: clubMap[c._id.toString()],
        lastMessage: c.lastMessage,
        lastAt: c.lastAt,
    }));

    // Also include clubs with no messages yet
    const clubsWithMessages = new Set(clubInbox.map((c) => c.clubId?.toString()));
    const silentClubs = clubs
        .filter((c) => !clubsWithMessages.has(c._id.toString()))
        .map((c) => ({
            type: "CLUB",
            clubId: c._id,
            club: c,
            lastMessage: null,
            lastAt: null,
        }));

    const all = [...dmInbox, ...clubInbox, ...silentClubs].sort(
        (a, b) => (b.lastAt || 0) - (a.lastAt || 0)
    );

    return res.status(200).json(new ApiResponse(200, all, "Inbox fetched"));
});

export { sendDM, getDMThread, sendClubMessage, getClubMessages, getInbox };
