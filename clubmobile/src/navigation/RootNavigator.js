import { useEffect, useRef } from "react";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import MainTabs from "./MainTabs";
import AuthStack from "./AuthStack";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

// Dark navigation theme so page transitions don't flash white
const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.rust },
};

const navRef = createNavigationContainerRef();

/* Route to the right screen based on a tapped notification's data payload
   (the backend attaches type + related ids). Falls back to Notifications. */
function routeFromNotification(data) {
    if (!navRef.isReady() || !data) return;
    const { type, clubId, postId } = data;
    try {
        if (postId && clubId) {
            navRef.navigate("Explore", { screen: "PostDetail", params: { postId, clubId } });
        } else if (clubId) {
            navRef.navigate("Explore", { screen: "ClubDetail", params: { clubId } });
        } else if (type === "CONNECTION_REQUEST" || type === "CONNECTION_ACCEPTED") {
            navRef.navigate("Network");
        } else {
            navRef.navigate("Profile", { screen: "Notifications" });
        }
    } catch {
        /* navigation not ready / route missing — ignore */
    }
}

/* Switches between the Auth stack and the main app based on login state.
   While the stored token is being checked on startup, show a spinner. */
export default function RootNavigator() {
    const { user, bootstrapping } = useAuth();
    const handledInitial = useRef(false);

    // Handle notification taps (both while running and cold-start).
    useEffect(() => {
        if (!user) return;

        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            routeFromNotification(response?.notification?.request?.content?.data);
        });

        // Cold start: app opened by tapping a notification
        if (!handledInitial.current) {
            handledInitial.current = true;
            Notifications.getLastNotificationResponseAsync().then((response) => {
                if (response) routeFromNotification(response.notification.request.content.data);
            });
        }

        return () => sub.remove();
    }, [user]);

    if (bootstrapping) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.rust} size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navRef} theme={navTheme}>
            {user ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
