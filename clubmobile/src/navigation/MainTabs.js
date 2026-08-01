import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import ExploreStack from "./ExploreStack";
import MyClubsStack from "./MyClubsStack";
import MessagesStack from "./MessagesStack";
import ConnectionsStack from "./ConnectionsStack";
import ProfileStack from "./ProfileStack";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

// Map each tab to an Ionicons name (filled when focused, outline otherwise)
const ICONS = {
    Explore: "compass",
    "My Clubs": "people",
    Messages: "chatbubbles",
    Network: "person-add",
    Profile: "person",
};

export default function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.rust,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.line,
                },
                tabBarIcon: ({ color, size, focused }) => {
                    const base = ICONS[route.name] || "ellipse";
                    return <Ionicons name={focused ? base : `${base}-outline`} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Explore" component={ExploreStack} />
            <Tab.Screen name="My Clubs" component={MyClubsStack} />
            <Tab.Screen name="Messages" component={MessagesStack} />
            <Tab.Screen name="Network" component={ConnectionsStack} />
            <Tab.Screen name="Profile" component={ProfileStack} />
        </Tab.Navigator>
    );
}
