import cron from "node-cron";
import { Event } from "../models/event.models.js";
import { Notification } from "../models/notification.models.js";

// Run every hour
export const startCronJobs = () => {
    cron.schedule("0 * * * *", async () => {
        try {
            console.log("Running cron job: Checking for upcoming events...");
            
            const now = new Date();
            // Look for events happening between 24 and 25 hours from now
            const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const next25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

            const upcomingEvents = await Event.find({
                eventDate: {
                    $gte: next24Hours,
                    $lt: next25Hours
                }
            });

            for (const event of upcomingEvents) {
                // Find users who RSVP'd as GOING
                const goingUsers = event.rsvp.filter(r => r.status === "GOING");
                
                for (const rsvp of goingUsers) {
                    // Create reminder notification
                    await Notification.create({
                        recipient: rsvp.user,
                        message: `Reminder: The event "${event.title}" is happening tomorrow!`,
                        type: "REMINDER",
                        relatedEvent: event._id,
                        relatedClub: event.hostedBy
                    });
                }
            }
        } catch (error) {
            console.error("Error running reminder cron job:", error);
        }
    });
};
