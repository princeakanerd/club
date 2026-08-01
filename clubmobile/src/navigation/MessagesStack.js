import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InboxScreen from "../screens/InboxScreen";
import DMThreadScreen from "../screens/DMThreadScreen";
import ClubChatScreen from "../screens/ClubChatScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

/* Messages tab: inbox list → a DM thread or a club group chat. */
export default function MessagesStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.ink,
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="Inbox" component={InboxScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DMThread" component={DMThreadScreen} options={({ route }) => ({ title: route.params?.name || "Chat" })} />
            <Stack.Screen name="ClubChat" component={ClubChatScreen} options={({ route }) => ({ title: route.params?.name || "Club chat" })} />
        </Stack.Navigator>
    );
}
