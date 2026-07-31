import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import useSmoothScroll from "./hooks/useSmoothScroll";

// Logged-in users get their personalized dashboard at "/";
// everyone else sees the public explore/landing page.
function RootRoute() {
    const { user, authLoading } = useAuth();
    if (authLoading) return null;
    return user ? <DashboardPage /> : <HomePage />;
}

// Gate for auth-required routes. Crucially waits for authLoading to finish
// before deciding — otherwise a hard refresh (user still null while
// /current-user is in flight) would bounce an authenticated user to /login.
function ProtectedRoute({ children }) {
    const { user, authLoading } = useAuth();
    const location = useLocation();
    if (authLoading) return null; // still resolving the session cookie
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return children;
}

// Lives inside the Router so it can watch route changes and re-scan
// for [data-reveal] elements on each page.
function RoutedApp() {
    useSmoothScroll();
    useScrollReveal();
    return (
        <Routes>
            <Route path="/" element={<RootRoute />} />
                <Route path="/explore" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/clubs/:clubId" element={<ClubPage />} />
                <Route path="/create-club" element={<ProtectedRoute><CreateClubPage /></ProtectedRoute>} />
                <Route path="/my-clubs" element={<ProtectedRoute><MyClubsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/my-events" element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />
                <Route path="/users/:username" element={<UserProfilePage />} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
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
