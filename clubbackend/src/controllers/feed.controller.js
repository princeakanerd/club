import { Event } from "../models/event.models.js";
import { Post } from "../models/post.models.js";
import { Announcement } from "../models/announcement.models.js";
import { Club } from "../models/club.models.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /feed — personalized activity feed from the clubs the user has joined.
// Aggregates upcoming events, recent posts, and announcements into one
// reverse-chronological stream so the home screen feels alive.
const getFeed = asyncHandler(async (req, res) => {
    const clubIds = (req.user.joinedClubs || []).map((m) => m.club);

    if (clubIds.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, { items: [], upcomingEvents: [] }, "Feed fetched"));
    }

    const now = new Date();

    const [posts, announcements, upcomingEvents] = await Promise.all([
        Post.find({ club: { $in: clubIds } })
            .populate("club", "name logo")
            .populate("author", "fullName username avatar")
            .sort({ createdAt: -1 })
            .limit(20),
        Announcement.find({ club: { $in: clubIds } })
            .populate("club", "name logo")
            .populate("createdBy", "fullName username avatar")
            .sort({ createdAt: -1 })
            .limit(20),
        Event.find({ hostedBy: { $in: clubIds }, eventDate: { $gte: now } })
            .populate("hostedBy", "name logo coverImage")
            .sort({ eventDate: 1 })
            .limit(10),
    ]);

    // Normalise into a single stream of feed items
    const postItems = posts.map((p) => ({
        kind: "POST",
        _id: p._id,
        createdAt: p.createdAt,
        club: p.club,
        author: p.author,
        image: p.image,
        caption: p.caption,
        likeCount: p.likes?.length || 0,
        commentCount: p.comments?.length || 0,
    }));

    const announcementItems = announcements.map((a) => ({
        kind: "ANNOUNCEMENT",
        _id: a._id,
        createdAt: a.createdAt,
        club: a.club,
        author: a.createdBy,
        title: a.title,
        content: a.content,
        isImportant: a.isImportant,
    }));

    const items = [...postItems, ...announcementItems].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res
        .status(200)
        .json(new ApiResponse(200, { items, upcomingEvents }, "Feed fetched"));
});

// GET /search?q=... — global search across clubs, users, and events.
const globalSearch = asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
        return res
            .status(200)
            .json(new ApiResponse(200, { clubs: [], users: [], events: [] }, "Search results"));
    }

    const regex = new RegExp(q, "i");

    const [clubs, users, events] = await Promise.all([
        Club.find({ $or: [{ name: regex }, { description: regex }] })
            .select("name logo coverImage category description")
            .limit(8),
        User.find({
            $or: [{ fullName: regex }, { username: regex }],
            _id: { $ne: req.user._id },
        })
            .select("fullName username avatar batchYear")
            .limit(8),
        Event.find({ title: regex, eventDate: { $gte: new Date() } })
            .populate("hostedBy", "name logo")
            .select("title eventDate location bannerImage hostedBy")
            .sort({ eventDate: 1 })
            .limit(8),
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, { clubs, users, events }, "Search results"));
});

export { getFeed, globalSearch };
