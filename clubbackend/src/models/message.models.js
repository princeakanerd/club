import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // For DMs: set receiverId, leave clubId null
        // For club group chat: set clubId, leave receiverId null
        receiverId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        clubId: {
            type: Schema.Types.ObjectId,
            ref: "Club",
            default: null,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxLength: 2000,
        },
        // Read receipts (#16). For DMs this is just the recipient once they've
        // seen it; for club chats it accumulates each member who has read it.
        readBy: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User" },
                readAt: { type: Date, default: Date.now },
                _id: false,
            }
        ],
    },
    { timestamps: true }
);

// Index for fast DM thread lookup
messageSchema.index({ sender: 1, receiverId: 1, createdAt: -1 });
// Index for fast club chat lookup
messageSchema.index({ clubId: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
