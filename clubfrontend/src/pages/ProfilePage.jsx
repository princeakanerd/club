import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function ProfilePage() {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState("profile");
    const [fullName, setFullName] = useState(user?.fullName || "");
    const [email, setEmail] = useState(user?.email || "");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [avatarName, setAvatarName] = useState("");
    const [bio, setBio] = useState(user?.bio || "");
    const [interests, setInterests] = useState((user?.interests || []).join(", "));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null); // { type: "ok"|"err", text }

    const avatarRef = useRef(null);

    if (!user) { navigate("/login"); return null; }

    const flash = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3500);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch("/users/update-account", { fullName, email });
            await refreshUser();
            flash("ok", "Profile updated.");
        } catch (err) {
            flash("err", err.response?.data?.message || "Failed to update.");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAbout = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch("/users/profile", { bio, interests });
            await refreshUser();
            flash("ok", "About section updated.");
        } catch (err) {
            flash("err", err.response?.data?.message || "Failed to update.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post("/users/change-password", { oldPassword, newPassword });
            setOldPassword("");
            setNewPassword("");
            flash("ok", "Password changed successfully.");
        } catch (err) {
            flash("err", err.response?.data?.message || "Failed to change password.");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpdate = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarName(file.name);
        const fd = new FormData();
        fd.append("avatar", file);
        setSaving(true);
        try {
            await api.patch("/users/avatar", fd);
            await refreshUser();
            flash("ok", "Avatar updated.");
        } catch (err) {
            flash("err", err.response?.data?.message || "Failed to update avatar.");
        } finally {
            setSaving(false);
            setAvatarName("");
        }
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 };
    const TABS = ["profile", "about", "password", "connections"];

    return (
        <div className="shell">
            <Navbar />

            {/* Header banner */}
            <div style={{ background: "linear-gradient(135deg, var(--forest) 0%, var(--forest-deep) 100%)", height: 180, position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", right: "10%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,154,59,0.2), transparent 70%)", transform: "translateY(-50%)" }} />
            </div>

            <div className="container" style={{ maxWidth: 700, padding: "0 20px 80px" }}>
                {/* Avatar + name card */}
                <div className="card fade-up" style={{ padding: "24px 28px", marginTop: -56, display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                        <img
                            src={user.avatar}
                            alt={user.fullName}
                            style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--card)", boxShadow: "var(--shadow)" }}
                        />
                        <label style={{
                            position: "absolute", bottom: 4, right: 4,
                            width: 28, height: 28, borderRadius: "50%",
                            background: "var(--rust)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, boxShadow: "var(--shadow-sm)",
                            transition: "transform 0.2s var(--ease)",
                        }}
                            title="Change avatar"
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                            ✎
                            <input type="file" accept="image/*" ref={avatarRef} onChange={handleAvatarUpdate} style={{ display: "none" }} />
                        </label>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 28, marginBottom: 4 }}>{user.fullName}</h1>
                        <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>@{user.username} · Batch {user.batchYear}</p>
                        <p style={{ color: "var(--muted)", fontSize: 14, margin: "2px 0 0" }}>{user.rollNumber}</p>
                    </div>
                    <div style={{ display: "flex", gap: 24, textAlign: "center" }}>
                        <div>
                            <p style={{ fontSize: 22, fontFamily: "var(--serif)", fontWeight: 600, color: "var(--ink)", margin: 0 }}>{user.joinedClubs?.length || 0}</p>
                            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Clubs</p>
                        </div>
                    </div>
                </div>

                {/* Flash message */}
                {msg && (
                    <div className="fade-in" style={{
                        marginTop: 16, padding: "12px 16px", borderRadius: 10, fontSize: 14,
                        background: msg.type === "ok" ? "rgba(192,138,130,0.15)" : "var(--rust-soft)",
                        color: msg.type === "ok" ? "var(--sage)" : "var(--rust-dark)",
                        border: `1px solid ${msg.type === "ok" ? "rgba(192,138,130,0.3)" : "rgba(201,154,59,0.3)"}`,
                    }}>
                        {msg.type === "ok" ? "✓ " : "✕ "}{msg.text}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, marginTop: 28, borderBottom: "1px solid var(--line)" }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                            fontFamily: "var(--sans)", fontWeight: tab === t ? 600 : 500, fontSize: 15,
                            borderBottom: tab === t ? "2px solid var(--rust)" : "2px solid transparent",
                            marginBottom: -1, color: tab === t ? "var(--ink)" : "var(--muted)",
                            transition: "color 0.2s var(--ease)",
                        }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: 24 }}>
                    {/* Profile tab */}
                    {tab === "profile" && (
                        <div className="card fade-up" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Account Details</h3>
                            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Full Name</label>
                                    <input className="field" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={labelStyle}>Email</label>
                                    <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Username</label>
                                        <input className="field" value={user.username} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Roll Number</label>
                                        <input className="field" value={user.rollNumber} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: "11px 28px" }}>
                                        {saving ? "Saving…" : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* About tab */}
                    {tab === "about" && (
                        <div className="card fade-up" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 18, marginBottom: 6 }}>About You</h3>
                            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
                                This appears on your public profile so others can get to know you.
                            </p>
                            <form onSubmit={handleUpdateAbout} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Bio</label>
                                    <textarea
                                        className="field"
                                        value={bio}
                                        onChange={e => setBio(e.target.value.slice(0, 250))}
                                        rows={4}
                                        placeholder="Tell people a bit about yourself…"
                                        style={{ resize: "vertical", fontFamily: "var(--sans)" }}
                                    />
                                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0", textAlign: "right" }}>
                                        {bio.length}/250
                                    </p>
                                </div>
                                <div>
                                    <label style={labelStyle}>Interests</label>
                                    <input
                                        className="field"
                                        value={interests}
                                        onChange={e => setInterests(e.target.value)}
                                        placeholder="e.g. Coding, Debate, Music, Photography"
                                    />
                                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>
                                        Separate with commas (up to 10).
                                    </p>
                                    {interests.trim() && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                                            {interests.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10).map((it, i) => (
                                                <span key={i} style={{
                                                    fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999,
                                                    background: "var(--rust-soft)", color: "var(--rust-dark)",
                                                }}>
                                                    {it}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: "11px 28px", width: "fit-content", marginTop: 4 }}>
                                    {saving ? "Saving…" : "Save About"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Connections tab */}
                    {tab === "connections" && <ConnectionsTab navigate={navigate} me={user} />}

                    {/* Password tab */}
                    {tab === "password" && (
                        <div className="card fade-up" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Change Password</h3>
                            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={labelStyle}>Current Password</label>
                                    <input className="field" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required placeholder="••••••••" />
                                </div>
                                <div>
                                    <label style={labelStyle}>New Password</label>
                                    <input className="field" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="••••••••" />
                                </div>
                                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: "11px 28px", width: "fit-content", marginTop: 4 }}>
                                    {saving ? "Updating…" : "Change Password"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Danger zone */}
                <div style={{ marginTop: 32, padding: "20px 24px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card)" }}>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>Signed in as <strong style={{ color: "var(--ink)" }}>{user.email}</strong></p>
                    <button
                        onClick={async () => { await logout(); navigate("/login"); }}
                        className="btn btn-ghost"
                        style={{ fontSize: 14 }}
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConnectionsTab({ navigate, me }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [connections, setConnections] = useState([]);
    const [pending, setPending] = useState([]);
    const [actionLoading, setActionLoading] = useState({});
    const [searchErr, setSearchErr] = useState("");

    useEffect(() => {
        api.get("/users/connections").then(r => setConnections(r.data.data)).catch(() => {});
        api.get("/users/connection-requests").then(r => setPending(r.data.data)).catch(() => {});
    }, []);

    const search = async () => {
        if (query.trim().length < 2) return;
        setSearching(true);
        setSearchErr("");
        try {
            const r = await api.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
            setResults(r.data.data);
        } catch (e) {
            setSearchErr(e.response?.data?.message || "Search failed");
        } finally { setSearching(false); }
    };

    const setAL = (id, v) => setActionLoading(p => ({ ...p, [id]: v }));

    const connect = async (userId) => {
        setAL(userId, true);
        try {
            await api.post(`/users/${userId}/connect`);
            setResults(prev => prev.filter(u => u._id !== userId));
            api.get("/users/connections").then(r => setConnections(r.data.data));
        } catch (e) { alert(e.response?.data?.message || "Error"); }
        finally { setAL(userId, false); }
    };

    const accept = async (userId) => {
        setAL(userId, true);
        try {
            await api.post(`/users/${userId}/connect/accept`);
            setPending(prev => prev.filter(u => u._id !== userId));
            api.get("/users/connections").then(r => setConnections(r.data.data));
        } finally { setAL(userId, false); }
    };

    const remove = async (userId) => {
        setAL(userId, true);
        try {
            await api.delete(`/users/${userId}/connect`);
            setConnections(prev => prev.filter(u => u._id !== userId));
        } finally { setAL(userId, false); }
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 };

    const UserRow = ({ u, action }) => (
        <div
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}
        >
            <img
                src={u.avatar}
                alt={u.fullName}
                style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
                onClick={() => navigate(`/users/${u.username}`)}
            />
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/users/${u.username}`)}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{u.fullName}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>@{u.username} · Batch {u.batchYear}</p>
            </div>
            {action}
        </div>
    );

    return (
        <div className="card fade-up" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Search */}
            <div>
                <h3 style={{ fontSize: 17, marginBottom: 14 }}>Find People</h3>
                <div style={{ display: "flex", gap: 10 }}>
                    <input
                        className="field"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name or username…"
                        onKeyDown={e => e.key === "Enter" && search()}
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={search} disabled={searching} style={{ padding: "0 20px" }}>
                        {searching ? "…" : "Search"}
                    </button>
                </div>
                {searchErr && <p style={{ fontSize: 13, color: "var(--rust-dark)", marginTop: 8 }}>{searchErr}</p>}
                {results.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                        {results.map(u => (
                            <UserRow key={u._id} u={u} action={
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: "7px 16px", fontSize: 13 }}
                                    disabled={actionLoading[u._id]}
                                    onClick={() => connect(u._id)}
                                >
                                    {actionLoading[u._id] ? "…" : "Connect"}
                                </button>
                            } />
                        ))}
                    </div>
                )}
            </div>

            {/* Pending requests */}
            {pending.length > 0 && (
                <div>
                    <h3 style={{ fontSize: 17, marginBottom: 14 }}>Pending Requests ({pending.length})</h3>
                    {pending.map(u => (
                        <UserRow key={u._id} u={u} action={
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} disabled={actionLoading[u._id]} onClick={() => accept(u._id)}>
                                    Accept
                                </button>
                                <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 13 }} disabled={actionLoading[u._id]} onClick={() => remove(u._id)}>
                                    Decline
                                </button>
                            </div>
                        } />
                    ))}
                </div>
            )}

            {/* Connections */}
            <div>
                <h3 style={{ fontSize: 17, marginBottom: 14 }}>My Connections ({connections.length})</h3>
                {connections.length === 0 && (
                    <p style={{ fontSize: 14, color: "var(--muted)" }}>No connections yet. Search for people above!</p>
                )}
                {connections.map(u => (
                    <UserRow key={u._id} u={u} action={
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => navigate(`/messages?dm=${u._id}`)}>
                                Message
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 13 }} disabled={actionLoading[u._id]} onClick={() => remove(u._id)}>
                                Remove
                            </button>
                        </div>
                    } />
                ))}
            </div>
        </div>
    );
}

export default ProfilePage;
