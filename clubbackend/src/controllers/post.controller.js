import { Post } from "../models/post.models.js";
import { Club } from "../models/club.models.js";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { parsePageQuery, buildPage } from "../utils/pagination.js";
import mongoose from "mongoose";

/* Notify a post's author about engagement, unless they're acting on their
   own post. Best-effort: a notification failure never breaks the action. */
const notifyAuthor = async ({ post, actor, type, verb }) => {
    if (post.author.toString() === actor._id.toString()) return;
    try {
        await Notification.create({
            recipient: post.author,
            message: `${actor.fullName} ${verb} your post.`,
            type,
            relatedPost: post._id,
            relatedClub: post.club,
            relatedUser: actor._id,
        });
    } catch (err) {
        console.error("notifyAuthor failed:", err?.message);
    }
};

const createPost = asyncHandler(async (req, res) => {
    const { caption, clubId } = req.body;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // Optional poll. Arrives as a JSON string in multipart, or an object in JSON.
    let poll;
    if (req.body.poll) {
        let parsed = req.body.poll;
        if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); }
            catch { throw new ApiError(400, "poll must be valid JSON"); }
        }
        const question = parsed?.question?.trim();
        const options = Array.isArray(parsed?.options) ? parsed.options.filter(Boolean) : [];
        if (!question) throw new ApiError(400, "Poll question is required");
        if (options.length < 2) throw new ApiError(400, "A poll needs at least 2 options");
        if (options.length > 6) throw new ApiError(400, "A poll can have at most 6 options");
        poll = {
            question,
            options: options.map((o) => ({ text: String(o).trim().slice(0, 120), votes: [] })),
        };
    }

    const club = await Club.findById(clubId);
    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // Creator, LEAD, or EXECUTIVE may post on behalf of the club
    const membership = (req.user.joinedClubs || []).find(
        m => m.club.toString() === clubId
    );
    const isAuthorised =
        club.createdBy.toString() === req.user._id.toString() ||
        (membership && ["LEAD", "EXECUTIVE"].includes(membership.role));
    if (!isAuthorised) {
        throw new ApiError(403, "Only the club lead or executives can create posts");
    }

    // Prefer a direct-uploaded Cloudinary URL (client uploaded straight to
    // Cloudinary via a signed request). Fall back to a legacy multipart file
    // so old clients keep working.
    const directUrl = typeof req.body.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    const imageLocalPath = req.file?.path;
    // An image is required for normal posts, but a poll post may be text-only.
    if (!directUrl && !imageLocalPath && !poll) {
        throw new ApiError(400, "Post image is required");
    }

    let imageUrl = directUrl;
    if (!imageUrl && imageLocalPath) {
        const image = await uploadOnCloudinary(imageLocalPath);
        if (!image?.url) {
            throw new ApiError(500, "Error uploading image");
        }
        imageUrl = image.url;
    }

    const post = await Post.create({
        caption: caption || "",
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(poll ? { poll } : {}),
        club: clubId,
        author: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, post, "Post created successfully"));
});

const getClubPosts = asyncHandler(async (req, res) => {
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 12 });

    const docs = await Post.find({ club: clubId, ...cursorFilter })
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate("author", "fullName username avatar")
        .populate("comments.user", "fullName username avatar")
        .populate("reactions.user", "fullName username avatar");

    const { items, meta } = buildPage(docs, limit);

    return res.status(200).json(new ApiResponse(200, items, "Club posts fetched successfully", meta));
});

const likePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid Post ID format");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
        post.likes.pull(req.user._id);
    } else {
        post.likes.push(req.user._id);
    }

    await post.save();

    // Notify the author only on a NEW like (not on unlike)
    if (!alreadyLiked) {
        await notifyAuthor({ post, actor: req.user, type: "POST_LIKE", verb: "liked" });
    }

    return res.status(200).json(new ApiResponse(200, {}, alreadyLiked ? "Post unliked" : "Post liked"));
});

const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid Post ID format");
    }

    if (!text || text.trim() === "") {
        throw new ApiError(400, "Comment text is required");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    post.comments.push({
        user: req.user._id,
        text
    });

    await post.save();

    await notifyAuthor({ post, actor: req.user, type: "POST_COMMENT", verb: "commented on" });

    return res.status(201).json(new ApiResponse(201, post.comments[post.comments.length - 1], "Comment added"));
});

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid Post ID format");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Author can delete their own post; club LEAD/EXECUTIVE can moderate
    const club = await Club.findById(post.club);
    const membership = (req.user.joinedClubs || []).find(
        m => m.club.toString() === post.club.toString()
    );
    const canDelete =
        post.author.toString() === req.user._id.toString() ||
        (club && club.createdBy.toString() === req.user._id.toString()) ||
        (membership && ["LEAD", "EXECUTIVE"].includes(membership.role));
    if (!canDelete) {
        throw new ApiError(403, "Forbidden: You cannot delete this post");
    }

    await Post.findByIdAndDelete(postId);

    return res.status(200).json(new ApiResponse(200, {}, "Post deleted successfully"));
});

/* ── PATCH /posts/:postId/react  { emoji }  (#17) ──
   Set/replace/remove the current user's single emoji reaction. Sending the
   same emoji again removes it (toggle); a different emoji replaces it. */
const ALLOWED_EMOJI = ["👍", "❤️", "🎉", "😮", "😂", "🔥"];

const reactToPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { emoji } = req.body;

    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID format");
    if (!ALLOWED_EMOJI.includes(emoji))
        throw new ApiError(400, `emoji must be one of: ${ALLOWED_EMOJI.join(" ")}`);

    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, "Post not found");

    const idx = post.reactions.findIndex((r) => r.user.toString() === req.user._id.toString());
    let action;
    if (idx === -1) {
        post.reactions.push({ user: req.user._id, emoji });
        action = "added";
    } else if (post.reactions[idx].emoji === emoji) {
        post.reactions.splice(idx, 1); // toggle off
        action = "removed";
    } else {
        post.reactions[idx].emoji = emoji; // replace
        action = "updated";
    }
    await post.save();

    // Aggregate counts per emoji for the response
    const counts = post.reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {});

    if (action === "added") {
        await notifyAuthor({ post, actor: req.user, type: "POST_LIKE", verb: `reacted ${emoji} to` });
    }

    return res.status(200).json(new ApiResponse(200, { action, counts }, `Reaction ${action}`));
});

/* ── PATCH /posts/:postId/poll/vote  { optionIndex }  (#17) ──
   One vote per user; voting again moves the vote to the new option. */
const voteOnPoll = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { optionIndex } = req.body;

    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID format");

    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (!post.poll || !post.poll.question) throw new ApiError(400, "This post has no poll");
    if (post.poll.closed) throw new ApiError(400, "This poll is closed");

    const i = Number(optionIndex);
    if (!Number.isInteger(i) || i < 0 || i >= post.poll.options.length)
        throw new ApiError(400, "Invalid option index");

    const me = req.user._id.toString();
    // Remove any existing vote by this user across all options (single-vote)
    post.poll.options.forEach((opt) => {
        const at = opt.votes.findIndex((v) => v.toString() === me);
        if (at > -1) opt.votes.splice(at, 1);
    });
    post.poll.options[i].votes.push(req.user._id);
    await post.save();

    const results = post.poll.options.map((o) => ({ text: o.text, votes: o.votes.length }));
    return res.status(200).json(new ApiResponse(200, { results }, "Vote recorded"));
});

/* ── PATCH /posts/:postId/poll/close  — author/lead closes voting ── */
const closePoll = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID format");

    const post = await Post.findById(postId);
    if (!post) throw new ApiError(404, "Post not found");
    if (!post.poll || !post.poll.question) throw new ApiError(400, "This post has no poll");

    const club = await Club.findById(post.club);
    const membership = (req.user.joinedClubs || []).find((m) => m.club.toString() === post.club.toString());
    const canClose =
        post.author.toString() === req.user._id.toString() ||
        (club && club.createdBy.toString() === req.user._id.toString()) ||
        (membership && ["LEAD", "EXECUTIVE"].includes(membership.role));
    if (!canClose) throw new ApiError(403, "You can't close this poll");

    post.poll.closed = true;
    await post.save();
    return res.status(200).json(new ApiResponse(200, {}, "Poll closed"));
});

export { createPost, getClubPosts, likePost, addComment, deletePost, reactToPost, voteOnPoll, closePoll };
