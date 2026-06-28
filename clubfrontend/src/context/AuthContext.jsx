import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

// Step 1 — create the context object
const AuthContext = createContext(null);

// Step 2 — create the Provider component that wraps the whole app
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // On app startup, check if the user is already logged in (via cookie)
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await api.get("/users/current-user");
                setUser(res.data.data);
            } catch {
                setUser(null); // not logged in
            } finally {
                setAuthLoading(false);
            }
        };
        fetchCurrentUser();
    }, []);

    
    const login = (userData) => setUser(userData);

    const refreshUser = async () => {
        try {
            const res = await api.get("/users/current-user");
            setUser(res.data.data);
        } catch {}
    };

    const logout = async () => {
        await api.post("/users/logout");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, authLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Step 3 — custom hook so any component can easily read the context
export function useAuth() {
    return useContext(AuthContext);
}
