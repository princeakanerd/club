import mongoose, { Schema } from "mongoose";

const clubSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true // Indexed for fast searching
        },
        description: {
            type: String,
            required: true,
            maxLength: 1000 // Prevents massive text walls
        },
        category: {
            type: String,
            enum: ["TECHNICAL", "CULTURAL", "SPORTS", "LITERARY", "SOCIAL", "OTHER"],
            required: true
        },
        logo: {
            type: String, // Cloudinary URL
            required: true
        },
        coverImage: {
            type: String // Cloudinary URL
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User", // Links directly to the user who founded the club
            required: true
        },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true
        },
        isAcceptingMembers: {
            type: Boolean,
            default: true // Allows club leads to pause new registrations
        },
        // When true, joining creates a pending request a LEAD must approve
        // instead of adding the member instantly.
        requiresApproval: {
            type: Boolean,
            default: false
        },
        // Denormalized member count, kept in sync via $inc on join/leave/remove
        // so list queries don't need a per-club $lookup to count members.
        memberCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);

export const Club = mongoose.model("Club", clubSchema);