import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { getAccessToken } from "../storage/tokens";
import { useAuth } from "./AuthContext";

/* Owns the single Socket.IO connection for the app. Connects when a user is
   logged in (authenticating with the stored Bearer access token, which the
   backend's socket middleware accepts), and tears down on logout.
   Exposes the raw socket + a set of online user ids (presence). */
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(() => new Set());

    useEffect(() => {
        let cancelled = false;
        let socket;

        (async () => {
            if (!user) return; // only connect when authenticated
            const token = await getAccessToken();
            if (!token || cancelled) return;

            socket = io(SOCKET_URL, {
                transports: ["websocket"],
                auth: { token },
            });
            socketRef.current = socket;

            socket.on("connect", () => setConnected(true));
            socket.on("disconnect", () => setConnected(false));

            // Presence: server broadcasts { userId, online } on connect/disconnect
            socket.on("presence", ({ userId, online }) => {
                setOnlineUsers((prev) => {
                    const next = new Set(prev);
                    online ? next.add(userId) : next.delete(userId);
                    return next;
                });
            });
        })();

        return () => {
            cancelled = true;
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
            }
            socketRef.current = null;
            setConnected(false);
            setOnlineUsers(new Set());
        };
    }, [user?._id]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
