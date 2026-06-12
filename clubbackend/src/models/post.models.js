import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
        image: {
            type: String, // Cloudinary URL
            required: [true, "Post image is required"]
        },
        caption: {
            type: String,
            trim: true,
            maxLength: [2200, "Caption cannot exceed 2200 characters"]
        },
        // Which club made this post?
        club: {
            type: Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },
        // Which executive/lead actually posted it?
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // Users who liked the post
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        // Simple comments array
        comments: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                text: {
                    type: String,
                    required: true,
                    maxLength: 500
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

export const Post = mongoose.model("Post", postSchema);
