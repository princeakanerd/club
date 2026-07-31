import mongoose, { Schema } from "mongoose";

/* A pending relationship between a user and a club that hasn't yet become a
   membership. Two kinds:
     - REQUEST: the user asked to join (needs LEAD approval)
     - INVITE:  a LEAD invited the user (needs the user to accept)
   Resolved requests are kept (status APPROVED/REJECTED) for history, but a
   partial unique index ensures only ONE active PENDING row per user+club. */
const joinRequestSchema = new Schema(
    {
        club: {
            type: Schema.Types.ObjectId,
            ref: "Club",
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["REQUEST", "INVITE"],
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },
        // Optional applicant message ("why do you want to join?")
        message: {
            type: String,
            trim: true,
            maxLength: 500,
            default: "",
        },
        // For INVITE: the LEAD who sent it. For REQUEST: the LEAD who resolved it.
        actionedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Only one active pending row per (club, user) regardless of type.
joinRequestSchema.index(
    { club: 1, user: 1 },
    { unique: true, partialFilterExpression: { status: "PENDING" } }
);

export const JoinRequest = mongoose.model("JoinRequest", joinRequestSchema);
