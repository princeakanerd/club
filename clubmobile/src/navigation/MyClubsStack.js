import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyClubsScreen from "../screens/MyClubsScreen";
import MyEventsScreen from "../screens/MyEventsScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

/* "My Clubs" tab also houses "My Events" (reached via a link on the clubs
   screen), keeping the bottom tab bar from getting crowded. */
export default function MyClubsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.ink,
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="MyClubsHome" component={MyClubsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MyEvents" component={MyEventsScreen} options={{ title: "My events" }} />
        </Stack.Navigator>
    );
}
