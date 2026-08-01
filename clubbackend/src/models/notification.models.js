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
            enum: [
                "EVENT_INVITE", "REMINDER", "ANNOUNCEMENT", "CLUB_UPDATE",
                "CONNECTION_REQUEST", "CONNECTION_ACCEPTED",
                "JOIN_REQUEST", "JOIN_APPROVED", "JOIN_REJECTED", "CLUB_INVITE",
                "POST_LIKE", "POST_COMMENT"
            ],
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
        // Optional link to a post (for likes/comments)
        relatedPost: {
            type: Schema.Types.ObjectId,
            ref: "Post"
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

// Inbox: list a user's notifications newest-first, and the unread-count /
// mark-all-read paths filter by recipient + isRead. This compound index
// covers both (and supersedes the single-field recipient index).
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

/* Fire a push notification whenever an in-app notification is created — for
   BOTH Notification.create() (post 'save') and Notification.insertMany()
   (post 'insertMany'). Centralizing here means every existing call site gets
   push for free, with no changes to controllers. Push is dynamically imported
   to avoid a circular dependency (push util imports the User model). */
async function pushFor(doc) {
    if (!doc?.recipient || !doc?.message) return;
    const { sendPushToUser } = await import("../utils/push.js");
    sendPushToUser(doc.recipient, {
        title: "Club App",
        body: doc.message,
        data: {
            type: doc.type,
            notificationId: String(doc._id),
            clubId: doc.relatedClub ? String(doc.relatedClub) : undefined,
            eventId: doc.relatedEvent ? String(doc.relatedEvent) : undefined,
            postId: doc.relatedPost ? String(doc.relatedPost) : undefined,
            userId: doc.relatedUser ? String(doc.relatedUser) : undefined,
        },
    });
}

notificationSchema.post("save", function (doc) {
    pushFor(doc);
});
notificationSchema.post("insertMany", function (docs) {
    (docs || []).forEach((d) => pushFor(d));
});

export const Notification = mongoose.model("Notification", notificationSchema);
