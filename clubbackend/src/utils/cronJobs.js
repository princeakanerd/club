import cron from "node-cron";
import { Event } from "../models/event.models.js";
import { Notification } from "../models/notification.models.js";

/* Send reminders to everyone who RSVP'd GOING/MAYBE for an event, but only
   once per (event, label) — guarded by the event's `remindersSent` array so a
   missed cron tick or overlap can't double-notify. */
const sendReminders = async (event, label, humanWhen) => {
    if (event.remindersSent?.includes(label)) return;

    const attendees = event.rsvp.filter((r) => r.status === "GOING" || r.status === "MAYBE");
    if (attendees.length) {
        await Notification.insertMany(
            attendees.map((rsvp) => ({
                recipient: rsvp.user,
                message: `Reminder: "${event.title}" is happening ${humanWhen}!`,
                type: "REMINDER",
                relatedEvent: event._id,
                relatedClub: event.hostedBy,
            }))
        );
    }

    // Mark this reminder as sent (atomic) so we never repeat it
    await Event.updateOne({ _id: event._id }, { $addToSet: { remindersSent: label } });
};

/* Runs every 15 minutes. Two reminder windows: ~24h before and ~1h before.
   Windows are wide enough to absorb a skipped tick; dedup handles overlap. */
export const startCronJobs = () => {
    cron.schedule("*/15 * * * *", async () => {
        try {
            const now = Date.now();

            // [label, fromOffsetMs, toOffsetMs, human text]
            const windows = [
                ["24h", 23 * 3600e3, 25 * 3600e3, "tomorrow"],
                ["1h", 0, 90 * 60e3, "in about an hour"],
            ];

            for (const [label, fromMs, toMs, humanWhen] of windows) {
                const events = await Event.find({
                    eventDate: { $gte: new Date(now + fromMs), $lt: new Date(now + toMs) },
                    remindersSent: { $ne: label },
                });
                for (const event of events) {
                    await sendReminders(event, label, humanWhen);
                }
            }
        } catch (error) {
            console.error("Error running reminder cron job:", error);
        }
    });
    console.log("Reminder cron scheduled (every 15 min; 24h + 1h windows)");
};
