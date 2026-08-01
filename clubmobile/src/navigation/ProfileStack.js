import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/ProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

/* Profile tab houses the profile plus the Notifications screen (reached via a
   bell on the profile header). */
export default function ProfileStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.ink,
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
        </Stack.Navigator>
    );
}
