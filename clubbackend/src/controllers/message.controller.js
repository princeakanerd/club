import { Message } from "../models/message.models.js";
import { User } from "../models/user.models.js";
import { Club } from "../models/club.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { io, emitToUser } from "../index.js";
import { parsePageQuery, buildPage } from "../utils/pagination.js";

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

    // Live-deliver to every socket the receiver has open
    emitToUser(receiverId, "new_dm", msg);

    return res.status(201).json(new ApiResponse(201, msg, "Message sent"));
});

// GET /messages/dm/:otherUserId — fetch DM thread
const getDMThread = asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.user._id;

    // Chat pages "backwards": fetch the newest `limit` (older than ?cursor if
    // loading history), then reverse to ascending so the frontend still renders
    // oldest→newest as before. nextCursor points at older messages.
    const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 40 });
    const docs = await Message.find({
        receiverId: { $ne: null },
        ...cursorFilter,
        $or: [
            { sender: myId, receiverId: otherUserId },
            { sender: otherUserId, receiverId: myId },
        ],
    })
        .populate("sender", "fullName username avatar")
        .sort({ _id: -1 })
        .limit(limit + 1);

    const { items, meta } = buildPage(docs, limit);
    const messages = items.reverse(); // ascending for display

    // Mark everything the partner sent me as read (#16), then tell them live.
    const unreadFromPartner = await Message.updateMany(
        {
            sender: otherUserId,
            receiverId: myId,
            "readBy.user": { $ne: myId },
        },
        { $push: { readBy: { user: myId } } }
    );
    if (unreadFromPartner.modifiedCount > 0) {
        emitToUser(otherUserId, "dm_read", { by: myId.toString() });
    }

    return res.status(200).json(new ApiResponse(200, messages, "DM thread fetched", meta));
});

// PATCH /messages/dm/:otherUserId/read — explicitly mark a DM thread read (#16)
const markDMRead = asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.user._id;

    const result = await Message.updateMany(
        { sender: otherUserId, receiverId: myId, "readBy.user": { $ne: myId } },
        { $push: { readBy: { user: myId } } }
    );
    if (result.modifiedCount > 0) {
        emitToUser(otherUserId, "dm_read", { by: myId.toString() });
    }

    return res.status(200).json(new ApiResponse(200, { marked: result.modifiedCount }, "Marked as read"));
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

    const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 40 });
    const docs = await Message.find({ clubId, ...cursorFilter })
        .populate("sender", "fullName username avatar")
        .sort({ _id: -1 })
        .limit(limit + 1);
    const { items, meta } = buildPage(docs, limit);
    const messages = items.reverse(); // ascending for display

    // Mark club messages (not sent by me) as read by me (#16)
    await Message.updateMany(
        { clubId, sender: { $ne: req.user._id }, "readBy.user": { $ne: req.user._id } },
        { $push: { readBy: { user: req.user._id } } }
    );

    return res.status(200).json(new ApiResponse(200, messages, "Club chat fetched", meta));
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
                // Unread = messages the partner sent me that I haven't read (#16)
                unread: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$receiverId", myId] },
                                    { $not: [{ $in: [myId, "$readBy.user"] }] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
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
        unread: d.unread,
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
                // Unread club messages = not sent by me and not yet read by me
                unread: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$sender", myId] },
                                    { $not: [{ $in: [myId, "$readBy.user"] }] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
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
        unread: c.unread,
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

export { sendDM, getDMThread, markDMRead, sendClubMessage, getClubMessages, getInbox };
