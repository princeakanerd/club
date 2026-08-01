import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConnectionsScreen from "../screens/ConnectionsScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

/* Connections tab: circle/requests/search → a user's public profile. */
export default function ConnectionsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.ink,
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="ConnectionsHome" component={ConnectionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
        </Stack.Navigator>
    );
}
