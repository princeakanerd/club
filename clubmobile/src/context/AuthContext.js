import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setAuthFailureHandler } from "../api/client";
import { saveTokens, clearTokens, getAccessToken } from "../storage/tokens";
import { registerForPush, unregisterFromPush } from "../utils/push";

/* Global auth state, mirroring the web app's AuthContext. On startup it reads
   the stored access token and asks the backend who the user is; that keeps the
   user logged in across app restarts. */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true); // initial token check

    // Fetch the current user using whatever token is stored.
    const loadCurrentUser = useCallback(async () => {
        const res = await api.get("/users/current-user");
        setUser(res.data.data);
        return res.data.data;
    }, []);

    // On mount: if a token exists, try to resolve the session.
    useEffect(() => {
        (async () => {
            try {
                const token = await getAccessToken();
                if (token) await loadCurrentUser();
            } catch {
                await clearTokens(); // stale/invalid token
                setUser(null);
            } finally {
                setBootstrapping(false);
            }
        })();
    }, [loadCurrentUser]);

    // Let the axios layer force a logout when a token refresh fails.
    useEffect(() => {
        setAuthFailureHandler(() => setUser(null));
    }, []);

    // Register this device for push whenever we have a logged-in user.
    // Safe no-op in Expo Go / on simulators.
    useEffect(() => {
        if (user) registerForPush();
    }, [user?._id]);

    // Called by LoginScreen after POST /users/login returns tokens + user.
    const login = useCallback(async ({ user: u, accessToken, refreshToken }) => {
        await saveTokens({ accessToken, refreshToken });
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        await unregisterFromPush(); // stop pushing to this device
        try {
            await api.post("/users/logout");
        } catch {
            /* ignore network errors on logout */
        }
        await clearTokens();
        setUser(null);
    }, []);

    const value = { user, setUser, bootstrapping, login, logout, refreshUser: loadCurrentUser };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
