import { Post } from "../models/post.models.js";
import { Club } from "../models/club.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const createPost = asyncHandler(async (req, res) => {
    const { caption, clubId } = req.body;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
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

    const imageLocalPath = req.file?.path;
    if (!imageLocalPath) {
        throw new ApiError(400, "Post image is required");
    }

    const image = await uploadOnCloudinary(imageLocalPath);
    if (!image?.url) {
        throw new ApiError(500, "Error uploading image");
    }

    const post = await Post.create({
        caption: caption || "",
        image: image.url,
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

    const posts = await Post.find({ club: clubId })
        .populate("author", "fullName username avatar")
        .populate("comments.user", "fullName username avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, posts, "Club posts fetched successfully"));
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

export { createPost, getClubPosts, likePost, addComment, deletePost };
