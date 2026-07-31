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
        // Photos from previous editions of this event
        pastImages: [
            {
                type: String, // Cloudinary URLs
            }
        ],
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
                },
                reason: {
                    type: String,
                    default: "",
                    maxLength: 500,
                },
                // Attendance: flipped true on check-in (QR self-scan or manual)
                attended: {
                    type: Boolean,
                    default: false
                },
                checkedInAt: {
                    type: Date
                }
            }
        ],
        // Secret token encoded in the event's check-in QR. Regeneratable by
        // the LEAD so a leaked code can be rotated. Never returned in public
        // event listings (only via the lead-only checkin-code endpoint).
        checkInCode: {
            type: String,
            select: false
        },
        // Which reminders have already gone out, so the hourly cron never
        // double-sends. e.g. ["24h", "1h"].
        remindersSent: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

// Club event lists query by host + published, sorted by date.
eventSchema.index({ hostedBy: 1, isPublished: 1, eventDate: 1 });
// The reminder cron scans a date window; index eventDate for that range query.
eventSchema.index({ eventDate: 1 });

export const Event = mongoose.model("Event", eventSchema);