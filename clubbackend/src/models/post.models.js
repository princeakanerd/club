import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
        image: {
            type: String, // Cloudinary URL
            // Required only for image posts; poll-only posts may omit it.
            required: [
                function () { return !this.poll || !this.poll.question; },
                "Post image is required"
            ]
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
        // Users who liked the post (kept for backward compatibility; a "like"
        // is also represented as a 👍 reaction below)
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        // Emoji reactions (#17). One reaction per user — toggling/replacing.
        reactions: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User", required: true },
                emoji: { type: String, required: true },
                _id: false,
            }
        ],
        // Optional attached poll (#17). Present only on poll posts.
        poll: {
            question: { type: String, trim: true, maxLength: 280 },
            options: [
                {
                    text: { type: String, required: true, trim: true, maxLength: 120 },
                    votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
                }
            ],
            // Once closed, no further votes are accepted
            closed: { type: Boolean, default: false },
        },
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

// Club feed: fetch a club's posts newest-first.
postSchema.index({ club: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
