import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
    return (
        <SafeAreaProvider>
            {/* light-content status bar text on our dark background */}
            <StatusBar style="light" />
            <AuthProvider>
                <SocketProvider>
                    <RootNavigator />
                </SocketProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
