import mongoose from "mongoose";
import { JoinRequest } from "../models/joinRequest.models.js";
import { Club } from "../models/club.models.js";
import { User } from "../models/user.models.js";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* Throws unless the logged-in user is the LEAD (creator) of the club.
   Returns the loaded club so callers can reuse it. */
const assertClubLead = async (clubId, userId) => {
    if (!mongoose.isValidObjectId(clubId)) throw new ApiError(400, "Invalid Club ID format");
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, "Club not found");
    if (club.createdBy.toString() !== userId.toString())
        throw new ApiError(403, "Only the club LEAD can perform this action");
    return club;
};

/* True if `userId` already has the club in joinedClubs. */
const isMemberOf = async (userId, clubId) =>
    !!(await User.exists({ _id: userId, "joinedClubs.club": clubId }));

/* Add the user to the club as a MEMBER (used when a request/invite resolves).
   Also bumps the club's denormalized memberCount. Callers already guard with
   isMemberOf(), so this only runs when the user is genuinely new to the club. */
const addMembership = async (userId, clubId) => {
    await User.findByIdAndUpdate(userId, {
        $push: { joinedClubs: { club: clubId, role: "MEMBER" } },
    });
    await Club.findByIdAndUpdate(clubId, { $inc: { memberCount: 1 } });
};

/* ── POST /clubs/:clubId/requests  — user asks to join ──
   If the club doesn't require approval, this falls back to an instant join. */
export const requestToJoin = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { message = "" } = req.body;

    if (!mongoose.isValidObjectId(clubId)) throw new ApiError(400, "Invalid Club ID format");
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, "Club not found");
    if (!club.isAcceptingMembers) throw new ApiError(403, "This club is not accepting new members");

    if (await isMemberOf(req.user._id, clubId))
        throw new ApiError(400, "You are already a member of this club");

    // Instant join when approval isn't required
    if (!club.requiresApproval) {
        await addMembership(req.user._id, clubId);
        return res.status(200).json(new ApiResponse(200, { joined: true }, "Joined the club"));
    }

    // Otherwise create a pending REQUEST (unique index blocks duplicates)
    let request;
    try {
        request = await JoinRequest.create({
            club: clubId,
            user: req.user._id,
            type: "REQUEST",
            message: message.trim().slice(0, 500),
        });
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, "You already have a pending request for this club");
        throw err;
    }

    // Notify the club LEAD
    await Notification.create({
        recipient: club.createdBy,
        message: `${req.user.fullName} requested to join ${club.name}.`,
        type: "JOIN_REQUEST",
        relatedClub: club._id,
        relatedUser: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, request, "Join request sent"));
});

/* ── GET /clubs/:clubId/requests  — LEAD lists pending join requests ── */
export const getClubJoinRequests = asyncHandler(async (req, res) => {
    await assertClubLead(req.params.clubId, req.user._id);

    const requests = await JoinRequest.find({
        club: req.params.clubId,
        type: "REQUEST",
        status: "PENDING",
    })
        .sort({ createdAt: -1 })
        .populate("user", "fullName username avatar batchYear");

    return res.status(200).json(new ApiResponse(200, requests, "Pending join requests fetched"));
});

/* ── PATCH /clubs/:clubId/requests/:requestId  { action: "APPROVE"|"REJECT" } ── */
export const resolveJoinRequest = asyncHandler(async (req, res) => {
    const { clubId, requestId } = req.params;
    const { action } = req.body;

    if (!["APPROVE", "REJECT"].includes(action))
        throw new ApiError(400, "action must be APPROVE or REJECT");

    const club = await assertClubLead(clubId, req.user._id);

    const request = await JoinRequest.findOne({
        _id: requestId,
        club: clubId,
        type: "REQUEST",
        status: "PENDING",
    });
    if (!request) throw new ApiError(404, "Pending join request not found");

    if (action === "APPROVE") {
        if (!(await isMemberOf(request.user, clubId))) {
            await addMembership(request.user, clubId);
        }
        request.status = "APPROVED";
    } else {
        request.status = "REJECTED";
    }
    request.actionedBy = req.user._id;
    await request.save();

    await Notification.create({
        recipient: request.user,
        message:
            action === "APPROVE"
                ? `Your request to join ${club.name} was approved.`
                : `Your request to join ${club.name} was declined.`,
        type: action === "APPROVE" ? "JOIN_APPROVED" : "JOIN_REJECTED",
        relatedClub: club._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, request, `Request ${action === "APPROVE" ? "approved" : "rejected"}`));
});

/* ── POST /clubs/:clubId/invites  { userId }  — LEAD invites a user (#7) ── */
export const inviteToClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { userId } = req.body;

    if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");
    const club = await assertClubLead(clubId, req.user._id);

    const invitee = await User.findById(userId).select("fullName");
    if (!invitee) throw new ApiError(404, "User to invite not found");

    if (await isMemberOf(userId, clubId))
        throw new ApiError(400, "That user is already a member");

    let invite;
    try {
        invite = await JoinRequest.create({
            club: clubId,
            user: userId,
            type: "INVITE",
            actionedBy: req.user._id,
        });
    } catch (err) {
        if (err.code === 11000) throw new ApiError(409, "There's already a pending request/invite for this user");
        throw err;
    }

    await Notification.create({
        recipient: userId,
        message: `You've been invited to join ${club.name}.`,
        type: "CLUB_INVITE",
        relatedClub: club._id,
        relatedUser: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, invite, "Invitation sent"));
});

/* ── GET /clubs/invites/mine  — invites awaiting the logged-in user ── */
export const getMyInvites = asyncHandler(async (req, res) => {
    const invites = await JoinRequest.find({
        user: req.user._id,
        type: "INVITE",
        status: "PENDING",
    })
        .sort({ createdAt: -1 })
        .populate("club", "name logo category")
        .populate("actionedBy", "fullName username avatar");

    return res.status(200).json(new ApiResponse(200, invites, "Pending invites fetched"));
});

/* ── PATCH /clubs/invites/:requestId  { action: "ACCEPT"|"DECLINE" } ── */
export const respondToInvite = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!["ACCEPT", "DECLINE"].includes(action))
        throw new ApiError(400, "action must be ACCEPT or DECLINE");

    const invite = await JoinRequest.findOne({
        _id: requestId,
        user: req.user._id,
        type: "INVITE",
        status: "PENDING",
    });
    if (!invite) throw new ApiError(404, "Pending invite not found");

    if (action === "ACCEPT") {
        if (!(await isMemberOf(req.user._id, invite.club))) {
            await addMembership(req.user._id, invite.club);
        }
        invite.status = "APPROVED";
    } else {
        invite.status = "REJECTED";
    }
    await invite.save();

    return res
        .status(200)
        .json(new ApiResponse(200, invite, action === "ACCEPT" ? "Invite accepted — welcome!" : "Invite declined"));
});
