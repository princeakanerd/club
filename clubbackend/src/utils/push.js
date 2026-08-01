import { User } from "../models/user.models.js";

/* Send push notifications via Expo's push service (https://exp.host).
   No SDK required — it's a simple HTTPS POST. We look up the recipient's
   stored Expo push tokens and fan out. Invalid tokens (DeviceNotRegistered)
   are pruned so we don't keep pushing to dead devices.

   Best-effort: failures are logged, never thrown, so notification creation
   is never blocked by push delivery. */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo push tokens look like ExponentPushToken[xxxxxxxx]
const isExpoToken = (t) => typeof t === "string" && t.startsWith("ExponentPushToken[");

/* Push to a single user id. `data` is delivered to the app for tap-routing. */
export const sendPushToUser = async (userId, { title, body, data = {} }) => {
    try {
        const user = await User.findById(userId).select("pushTokens");
        const tokens = (user?.pushTokens || []).filter(isExpoToken);
        if (!tokens.length) return;

        const messages = tokens.map((to) => ({
            to,
            title,
            body,
            data,
            sound: "default",
        }));

        const res = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(messages),
        });
        const json = await res.json().catch(() => null);

        // Prune tokens Expo reports as no longer registered
        const receipts = json?.data;
        if (Array.isArray(receipts)) {
            const dead = [];
            receipts.forEach((r, i) => {
                if (r.status === "error" && r.details?.error === "DeviceNotRegistered") dead.push(tokens[i]);
            });
            if (dead.length) {
                await User.findByIdAndUpdate(userId, { $pull: { pushTokens: { $in: dead } } });
            }
        }
    } catch (err) {
        console.error("sendPushToUser failed:", err?.message);
    }
};
