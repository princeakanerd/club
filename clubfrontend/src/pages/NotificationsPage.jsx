import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";

const TYPE_META = {
    EVENT_INVITE:          { icon: "events",    color: "var(--rust-soft)" },
    ANNOUNCEMENT:          { icon: "megaphone", color: "rgba(192,138,130,0.18)" },
    REMINDER:              { icon: "bell",      color: "var(--cream-2)" },
    CLUB_UPDATE:           { icon: "clubs",     color: "var(--cream-2)" },
    CONNECTION_REQUEST:    { icon: "connect",   color: "rgba(192,138,130,0.18)" },
    CONNECTION_ACCEPTED:   { icon: "check",     color: "rgba(192,138,130,0.18)" },
};

function NotificationsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState({});

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        api.get("/notifications")
            .then((res) => setNotifications(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const markAllRead = async () => {
        try {
            await api.patch("/notifications/mark-all-read");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch {}
    };

    const markOneRead = async (id) => {
        try { await api.patch(`/notifications/${id}/read`); } catch {}
    };

    const handleAccept = async (e, n) => {
        e.stopPropagation();
        const userId = n.relatedUser?._id || n.relatedUser;
        if (!userId) return;
        setAccepting(p => ({ ...p, [n._id]: true }));
        try {
            await api.post(`/users/${userId}/connect/accept`);
            // Refresh notifications so the request disappears / updates
            const res = await api.get("/notifications");
            setNotifications(res.data.data);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to accept");
        } finally {
            setAccepting(p => ({ ...p, [n._id]: false }));
        }
    };

    const handleDecline = async (e, n) => {
        e.stopPropagation();
        const userId = n.relatedUser?._id || n.relatedUser;
        if (!userId) return;
        try {
            await api.delete(`/users/${userId}/connect`);
            const res = await api.get("/notifications");
            setNotifications(res.data.data);
        } catch {}
    };

    const getDestination = (n) => {
        if (n.type === "CONNECTION_REQUEST" || n.type === "CONNECTION_ACCEPTED") {
            const u = n.relatedUser;
            return u ? `/users/${u.username || u._id}` : "/connections";
        }
        const clubId = n.relatedClub?._id || n.relatedClub;
        if (clubId) return `/clubs/${clubId}${n.relatedEvent ? "?tab=events" : ""}`;
        return null;
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="shell">
            <Navbar />
            <div className="container" style={{ maxWidth: 720, padding: "0 20px 80px" }}>
                <PageHeader
                    kicker="Activity"
                    title="Notifications"
                    subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
                    right={unreadCount > 0 && (
                        <button onClick={markAllRead} className="btn btn-ghost">Mark all read</button>
                    )}
                />

                {loading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />)}
                    </div>
                )}

                {!loading && notifications.length === 0 && (
                    <div className="card" style={{ padding: 64, textAlign: "center", color: "var(--muted)" }}>
                        <div style={{ display: "inline-flex", color: "var(--rust)", marginBottom: 14 }}><Icon name="bell" size={36} stroke={1.3} /></div>
                        <p style={{ fontSize: 15, margin: 0 }}>No notifications yet.</p>
                    </div>
                )}

                {!loading && notifications.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {notifications.map((n, idx) => {
                            const meta = TYPE_META[n.type] || { icon: "bell", color: "var(--cream-2)" };
                            const destination = getDestination(n);
                            const isConnectionReq = n.type === "CONNECTION_REQUEST";
                            const relatedUser = n.relatedUser;

                            return (
                                <div
                                    key={n._id}
                                    data-reveal="up"
                                    onClick={() => {
                                        if (!n.isRead) markOneRead(n._id);
                                        if (destination) navigate(destination);
                                    }}
                                    style={{
                                        padding: "16px 20px",
                                        borderRadius: 14,
                                        display: "flex",
                                        gap: 14,
                                        alignItems: "flex-start",
                                        cursor: destination ? "pointer" : "default",
                                        background: n.isRead ? "var(--card)" : "var(--rust-soft)",
                                        border: `1px solid var(--line)`,
                                        borderLeft: n.isRead ? "1px solid var(--line)" : "3px solid var(--rust)",
                                        boxShadow: n.isRead ? "none" : "0 2px 16px rgba(210,169,72,0.12)",
                                        "--i": idx,
                                    }}
                                    onMouseEnter={e => destination && (e.currentTarget.style.transform = "translateX(4px)")}
                                    onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}
                                >
                                    {/* Icon or avatar */}
                                    {relatedUser?.avatar ? (
                                        <img
                                            src={relatedUser.avatar}
                                            alt={relatedUser.fullName}
                                            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                            background: meta.color, color: "var(--rust)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <Icon name={meta.icon} size={20} />
                                        </div>
                                    )}

                                    {/* Text */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--ink)", lineHeight: 1.5, fontWeight: n.isRead ? 400 : 600 }}>
                                            {n.message}
                                        </p>
                                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                                            {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>

                                        {/* Accept / Decline inline for connection requests */}
                                        {isConnectionReq && (
                                            <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: "6px 18px", fontSize: 13 }}
                                                    disabled={accepting[n._id]}
                                                    onClick={e => handleAccept(e, n)}
                                                >
                                                    {accepting[n._id] ? "…" : "Accept"}
                                                </button>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: "6px 14px", fontSize: 13 }}
                                                    onClick={e => handleDecline(e, n)}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {!n.isRead && (
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--rust)", flexShrink: 0, marginTop: 6 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationsPage;
