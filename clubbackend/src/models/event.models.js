import mongoose, { Schema } from "mongoose";

const eventSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Event title is required"],
            trim: true,
            maxLength: [100, "Title cannot exceed 100 characters"]
        },
        description: {
            type: String,
            required: [true, "Event description is required"]
        },
        eventDate: {
            type: Date,
            required: [true, "Event date and time are required"]
        },
        venue: {
            type: String,
            required: [true, "Event venue or meeting link is required"]
        },
        bannerImage: {
            type: String, // Cloudinary URL
            required: [true, "Event banner image is required"]
        },
        isPublished: {
            type: Boolean,
            default: true // If true, the event is public. If false, it acts as a "draft" for the LEAD.
        },
        // Relational Data: Which club is hosting this?
        hostedBy: {
            type: Schema.Types.ObjectId,
            ref: "Club",
            required: true
        },
        // Relational Data: Which specific user actually clicked "Create Event"?
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // Relational Data: Who is coming? (RSVP Poll)
        rsvp: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User"
                },
                status: {
                    type: String,
                    enum: ["GOING", "NOT_GOING", "MAYBE"],
                    default: "GOING"
                }
            }
        ]
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

export const Event = mongoose.model("Event", eventSchema);