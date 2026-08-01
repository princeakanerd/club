import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ExploreScreen from "../screens/ExploreScreen";
import ClubDetailScreen from "../screens/ClubDetailScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import CreateEventScreen from "../screens/CreateEventScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

/* The Explore tab is a stack: the clubs list pushes to a club's detail page.
   ClubDetail shows a native header (with a back button) titled after the club. */
export default function ExploreStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.bg },
                headerTintColor: colors.ink,
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="ExploreList" component={ExploreScreen} options={{ headerShown: false }} />
            <Stack.Screen
                name="ClubDetail"
                component={ClubDetailScreen}
                options={({ route }) => ({ title: route.params?.name || "Club" })}
            />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: "Post" }} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "New post" }} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ title: "New event" }} />
        </Stack.Navigator>
    );
}
