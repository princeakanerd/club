import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";

function ConnectionsPage() {
    const { user: me } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState("connections");
    const [connections, setConnections] = useState([]);
    const [pending, setPending] = useState([]);
    const [searchQ, setSearchQ] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const loadConnections = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        Promise.all([
            api.get("/users/connections"),
            api.get("/users/connection-requests"),
        ]).then(([c, p]) => {
            setConnections(c.data.data);
            setPending(p.data.data);
        }).catch(() => {})
          .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!me) { navigate("/login"); return; }
        loadConnections();
    }, [me]);

    const setAL = (id, v) => setActionLoading(p => ({ ...p, [id]: v }));

    const handleConnect = async (userId) => {
        setAL(userId, "connecting");
        try {
            await api.post(`/users/${userId}/connect`);
            setSearchResults(prev => prev.filter(u => u._id !== userId));
            showToast("Connection request sent!");
            loadConnections(true);
        } catch (e) {
            alert(e.response?.data?.message || "Could not send request");
        } finally { setAL(userId, null); }
    };

    const handleAccept = async (userId, userName) => {
        setAL(userId, "accepting");
        try {
            await api.post(`/users/${userId}/connect/accept`);
            // Optimistically remove from pending and add to connections
            const accepted = pending.find(u => u._id === userId);
            setPending(prev => prev.filter(u => u._id !== userId));
            if (accepted) setConnections(prev => [...prev, accepted]);
            showToast(userName ? `You're now connected with ${userName}` : "Request accepted!");
            // Switch to connections tab so user sees the result
            setTab("connections");
        } catch (e) {
            alert(e.response?.data?.message || "Failed to accept");
            loadConnections(true);
        } finally { setAL(userId, null); }
    };

    const handleDecline = async (userId) => {
        setAL(userId, "declining");
        try {
            await api.delete(`/users/${userId}/connect`);
            setPending(prev => prev.filter(u => u._id !== userId));
            showToast("Request declined.");
        } finally { setAL(userId, null); }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm("Remove this connection?")) return;
        setAL(userId, "removing");
        try {
            await api.delete(`/users/${userId}/connect`);
            setConnections(prev => prev.filter(u => u._id !== userId));
        } finally { setAL(userId, null); }
    };

    const search = async () => {
        if (searchQ.trim().length < 2) return;
        setSearching(true);
        try {
            const r = await api.get(`/users/search?q=${encodeURIComponent(searchQ.trim())}`);
            setSearchResults(r.data.data);
        } catch (e) {
            alert(e.response?.data?.message || "Search failed");
        } finally { setSearching(false); }
    };

    const TABS = [
        { id: "connections", label: "My Connections", count: connections.length },
        { id: "requests", label: "Requests", count: pending.length },
        { id: "find", label: "Find People" },
    ];

    return (
        <div className="shell" style={{ minHeight: "100vh" }}>
            <Navbar />
            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
                    background: "var(--forest)", color: "var(--ivory)",
                    padding: "12px 24px", borderRadius: 999,
                    fontSize: 14, fontWeight: 600, zIndex: 9999,
                    boxShadow: "0 8px 32px rgba(28,38,32,0.25)",
                    animation: "fadeUp 0.25s var(--ease)",
                }}>
                    {toast}
                </div>
            )}
            <div className="container" style={{ maxWidth: 760, padding: "0 20px 80px" }}>

                <PageHeader
                    kicker="Network"
                    title="Your"
                    accent="circle"
                    subtitle={`${connections.length} connection${connections.length !== 1 ? "s" : ""}${pending.length > 0 ? ` · ${pending.length} pending request${pending.length !== 1 ? "s" : ""}` : ""}`}
                />

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 32 }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                padding: "10px 18px",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                fontFamily: "var(--sans)",
                                fontSize: 14,
                                fontWeight: tab === t.id ? 700 : 500,
                                color: tab === t.id ? "var(--ink)" : "var(--muted)",
                                borderBottom: tab === t.id ? "2px solid var(--rust)" : "2px solid transparent",
                                marginBottom: -1,
                                transition: "color 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span style={{
                                    background: t.id === "requests" ? "var(--rust)" : "var(--cream-2)",
                                    color: t.id === "requests" ? "var(--forest-deep)" : "var(--muted)",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 999,
                                }}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── My Connections tab ── */}
                {tab === "connections" && (
                    <div className="stagger">
                        {loading && [...Array(3)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 12 }} />
                        ))}
                        {!loading && connections.length === 0 && (
                            <EmptyState
                                icon="connect"
                                title="No connections yet"
                                subtitle="Search for classmates and send them a request."
                                action={{ label: "Find People", onClick: () => setTab("find") }}
                            />
                        )}
                        {!loading && connections.map((u, i) => (
                            <PersonCard key={u._id} user={u} index={i}>
                                <button
                                    className="btn btn-rust"
                                    style={{ padding: "8px 18px", fontSize: 13 }}
                                    onClick={() => navigate(`/messages?dm=${u._id}`)}
                                >
                                    Message
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: "8px 14px", fontSize: 13 }}
                                    onClick={() => navigate(`/users/${u.username}`)}
                                >
                                    Profile
                                </button>
                                <button
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", fontFamily: "var(--sans)", padding: "8px 4px" }}
                                    disabled={!!actionLoading[u._id]}
                                    onClick={() => handleRemove(u._id)}
                                >
                                    {actionLoading[u._id] === "removing" ? "…" : "Remove"}
                                </button>
                            </PersonCard>
                        ))}
                    </div>
                )}

                {/* ── Requests tab ── */}
                {tab === "requests" && (
                    <div className="stagger">
                        {loading && [...Array(2)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 12 }} />
                        ))}
                        {!loading && pending.length === 0 && (
                            <EmptyState
                                icon="inbox"
                                title="No pending requests"
                                subtitle="When someone sends you a connection request, it'll appear here."
                            />
                        )}
                        {!loading && pending.map((u, i) => (
                            <PersonCard key={u._id} user={u} badge="Wants to connect" index={i}>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: "8px 20px", fontSize: 13 }}
                                    disabled={!!actionLoading[u._id]}
                                    onClick={() => handleAccept(u._id, u.fullName)}
                                >
                                    {actionLoading[u._id] === "accepting" ? "…" : "Accept"}
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: "8px 14px", fontSize: 13 }}
                                    disabled={!!actionLoading[u._id]}
                                    onClick={() => handleDecline(u._id)}
                                >
                                    {actionLoading[u._id] === "declining" ? "…" : "Decline"}
                                </button>
                            </PersonCard>
                        ))}
                    </div>
                )}

                {/* ── Find People tab ── */}
                {tab === "find" && (
                    <div>
                        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                            <input
                                className="field"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && search()}
                                placeholder="Search by name or username…"
                                style={{ flex: 1 }}
                                autoFocus
                            />
                            <button
                                className="btn btn-primary"
                                onClick={search}
                                disabled={searching || searchQ.trim().length < 2}
                                style={{ padding: "0 24px" }}
                            >
                                {searching ? "…" : "Search"}
                            </button>
                        </div>

                        {searchResults.length === 0 && !searching && (
                            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 14 }}>
                                {searchQ.trim().length >= 2 ? "No results found." : "Type at least 2 characters to search."}
                            </div>
                        )}

                        <div className="stagger">
                            {searchResults.map((u, i) => (
                                <PersonCard key={u._id} user={u} index={i}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: "8px 20px", fontSize: 13 }}
                                        disabled={!!actionLoading[u._id]}
                                        onClick={() => handleConnect(u._id)}
                                    >
                                        {actionLoading[u._id] === "connecting" ? "…" : "Connect"}
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ padding: "8px 14px", fontSize: 13 }}
                                        onClick={() => navigate(`/users/${u.username}`)}
                                    >
                                        Profile
                                    </button>
                                </PersonCard>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Person Card ── */
function PersonCard({ user, badge, children, index = 0 }) {
    const navigate = useNavigate();
    return (
        <div data-reveal="up" style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 20px",
            background: "var(--card)",
            borderRadius: 14,
            border: "1px solid var(--line)",
            marginBottom: 10,
            "--i": index,
        }}>
            <img
                src={user.avatar}
                alt={user.fullName}
                onClick={() => navigate(`/users/${user.username}`)}
                style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", cursor: "pointer", flexShrink: 0 }}
            />
            <div onClick={() => navigate(`/users/${user.username}`)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{user.fullName}</p>
                    {badge && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--rust-soft)", color: "var(--rust-dark)" }}>
                            {badge}
                        </span>
                    )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    @{user.username}
                    {user.batchYear && ` · Batch ${user.batchYear}`}
                    {user.bio && ` · ${user.bio.slice(0, 60)}${user.bio.length > 60 ? "…" : ""}`}
                </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {children}
            </div>
        </div>
    );
}

/* ── Empty State ── */
function EmptyState({ icon, title, subtitle, action }) {
    return (
        <div style={{ textAlign: "center", padding: "56px 32px" }}>
            <div style={{ display: "inline-flex", color: "var(--rust)", marginBottom: 16 }}><Icon name={icon} size={38} stroke={1.3} /></div>
            <h3 style={{ fontSize: 18, margin: "0 0 8px", color: "var(--ink)" }}>{title}</h3>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: action ? 20 : 0 }}>{subtitle}</p>
            {action && (
                <button className="btn btn-primary" onClick={action.onClick} style={{ padding: "10px 24px" }}>
                    {action.label}
                </button>
            )}
        </div>
    );
}

export default ConnectionsPage;
