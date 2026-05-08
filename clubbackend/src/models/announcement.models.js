import mongoose, { Schema } from "mongoose";

const announcementSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Announcement title is required"],
            trim: true,
            maxLength: [100, "Title cannot exceed 100 characters"]
        },
        content: {
            type: String,
            required: [true, "Announcement content is required"]
        },
        isImportant: {
            type: Boolean,
            default: false // If true, the frontend can render this with a distinct color or pin it to the top
        },
        // Relational Data: Which club does this belong to?
        club: {
            type: Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },
        // Relational Data: Which LEAD posted this?
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt dates
    }
);

export const Announcement = mongoose.model("Announcement", announcementSchema);