import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import api from "../api/client";

/* Mobile push helper. Registers this device for Expo push, sends the token to
   our backend, and (un)registers on logout.

   NOTE: remote push does NOT work in Expo Go (SDK 53+). It only fires in a
   development/production build (EAS Build). The code is safe to run in Expo
   Go — it just won't receive real pushes there. */

// How notifications behave when received while the app is foregrounded.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true, // SDK 54: replaces shouldShowAlert
        shouldShowList: true,
    }),
});

/* Ask permission, get the Expo push token, and save it to the backend.
   Returns the token string, or null if unavailable/denied. */
export async function registerForPush() {
    // Push only works on physical devices, never simulators
    if (!Device.isDevice) return null;

    // Android needs a channel before the permission prompt / token
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
        const res = await Notifications.requestPermissionsAsync();
        status = res.status;
    }
    if (status !== "granted") return null;

    try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        // Persist to the backend so it can push to this device
        await api.post("/users/push-token", { token }).catch(() => {});
        return token;
    } catch {
        // e.g. running in Expo Go, or offline — non-fatal
        return null;
    }
}

/* Remove this device's token from the backend (call on logout). */
export async function unregisterFromPush() {
    if (!Device.isDevice) return;
    try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        await api.delete("/users/push-token", { data: { token } }).catch(() => {});
    } catch {
        /* ignore */
    }
}
