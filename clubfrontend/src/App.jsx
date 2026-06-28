import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ClubPage from "./pages/ClubPage";
import CreateClubPage from "./pages/CreateClubPage";
import MyClubsPage from "./pages/MyClubsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import MyEventsPage from "./pages/MyEventsPage";
import UserProfilePage from "./pages/UserProfilePage";
import MessagesPage from "./pages/MessagesPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import NotFoundPage from "./pages/NotFoundPage";
import useScrollReveal from "./hooks/useScrollReveal";

// Logged-in users get their personalized dashboard at "/";
// everyone else sees the public explore/landing page.
function RootRoute() {
    const { user, authLoading } = useAuth();
    if (authLoading) return null;
    return user ? <DashboardPage /> : <HomePage />;
}

// Lives inside the Router so it can watch route changes and re-scan
// for [data-reveal] elements on each page.
function RoutedApp() {
    useScrollReveal();
    return (
        <Routes>
            <Route path="/" element={<RootRoute />} />
                <Route path="/explore" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/clubs/:clubId" element={<ClubPage />} />
                <Route path="/create-club" element={<CreateClubPage />} />
                <Route path="/my-clubs" element={<MyClubsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/my-events" element={<MyEventsPage />} />
                <Route path="/users/:username" element={<UserProfilePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/connections" element={<ConnectionsPage />} />
                <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <RoutedApp />
        </BrowserRouter>
    );
}

export default App;
