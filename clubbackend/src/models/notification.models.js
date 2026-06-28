import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true // Indexed for fast queries by user
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["EVENT_INVITE", "REMINDER", "ANNOUNCEMENT", "CLUB_UPDATE", "CONNECTION_REQUEST", "CONNECTION_ACCEPTED"],
            required: true
        },
        // Optional link to the event this notification is about
        relatedEvent: {
            type: Schema.Types.ObjectId,
            ref: "Event"
        },
        // Optional link to the club
        relatedClub: {
            type: Schema.Types.ObjectId,
            ref: "Club"
        },
        // Optional link to a user (for connection requests)
        relatedUser: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = mongoose.model("Notification", notificationSchema);
