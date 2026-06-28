import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";

const INTEREST_COLORS = [
    { bg: "rgba(210,169,72,0.16)", color: "#e8c46b" },
    { bg: "rgba(110,146,117,0.18)", color: "#9fc0a5" },
    { bg: "rgba(210,169,72,0.10)", color: "#d2a948" },
    { bg: "rgba(110,146,117,0.12)", color: "#8fb096" },
];

function UserProfilePage() {
    const { username } = useParams();
    const { user: me } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProfile = () => {
        setLoading(true);
        api.get(`/users/${username}/profile`)
            .then(r => setProfile(r.data.data))
            .catch(() => setProfile(null))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchProfile(); }, [username]);

    const isMe = me && profile && me.username === profile.username;
    const status = profile?.connectionStatus;

    const handleConnect = async () => {
        setActionLoading(true);
        try { await api.post(`/users/${profile._id}/connect`); fetchProfile(); }
        catch (e) {
            const msg = e.response?.data?.message || e.message || "Could not send request";
            const status = e.response?.status;
            alert(`${status ? `[${status}] ` : ""}${msg}`);
        }
        finally { setActionLoading(false); }
    };
    const handleAccept = async () => {
        setActionLoading(true);
        try { await api.post(`/users/${profile._id}/connect/accept`); fetchProfile(); }
        finally { setActionLoading(false); }
    };
    const handleRemove = async () => {
        setActionLoading(true);
        try { await api.delete(`/users/${profile._id}/connect`); fetchProfile(); }
        finally { setActionLoading(false); }
    };

    return (
        <div className="shell">
            <Navbar />

            {loading && (
                <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px" }}>
                    <div className="skeleton" style={{ height: 280, borderRadius: 20, marginBottom: 0 }} />
                    <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
                        <div className="skeleton" style={{ flex: 2, height: 200, borderRadius: 16 }} />
                        <div className="skeleton" style={{ flex: 1, height: 200, borderRadius: 16 }} />
                    </div>
                </div>
            )}

            {!loading && !profile && (
                <div style={{ maxWidth: 900, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 18, color: "var(--muted)" }}>User not found.</p>
                    <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/")}>Go home</button>
                </div>
            )}

            {!loading && profile && (
                <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 80px" }} className="fade-up">

                    {/* ── Hero ── */}
                    <div style={{ position: "relative", marginBottom: 80 }}>
                        {/* Cover image */}
                        <div style={{
                            height: 260,
                            borderRadius: "0 0 24px 24px",
                            background: profile.coverImage
                                ? `url(${profile.coverImage}) center/cover no-repeat`
                                : "linear-gradient(135deg, var(--forest-deep) 0%, var(--forest) 60%, var(--sage) 100%)",
                            position: "relative",
                            overflow: "hidden",
                        }}>
                            {/* Subtle pattern overlay */}
                            <div style={{
                                position: "absolute", inset: 0,
                                background: "linear-gradient(to bottom, transparent 40%, rgba(28,38,32,0.5) 100%)",
                            }} />
                        </div>

                        {/* Avatar — lifted out of cover */}
                        <div style={{
                            position: "absolute",
                            bottom: -56,
                            left: 36,
                            display: "flex",
                            alignItems: "flex-end",
                            gap: 20,
                        }}>
                            <div style={{ position: "relative" }}>
                                <img
                                    src={profile.avatar}
                                    alt={profile.fullName}
                                    style={{
                                        width: 108,
                                        height: 108,
                                        borderRadius: "50%",
                                        border: "4px solid var(--cream)",
                                        objectFit: "cover",
                                        background: "var(--cream-2)",
                                        boxShadow: "0 8px 24px rgba(28,38,32,0.18)",
                                    }}
                                />
                                {/* Batch badge */}
                                <div style={{
                                    position: "absolute",
                                    bottom: 4,
                                    right: -4,
                                    background: "var(--rust)",
                                    color: "var(--forest-deep)",
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "3px 7px",
                                    borderRadius: 999,
                                    border: "2px solid var(--cream)",
                                    letterSpacing: "0.03em",
                                }}>
                                    '{String(profile.batchYear).slice(-2)}
                                </div>
                            </div>
                        </div>

                        {/* Action buttons top-right */}
                        <div style={{
                            position: "absolute",
                            bottom: -46,
                            right: 0,
                            display: "flex",
                            gap: 10,
                        }}>
                            {isMe ? (
                                <button className="btn btn-ghost" onClick={() => navigate("/profile")} style={{ padding: "10px 22px" }}>
                                    Edit Profile
                                </button>
                            ) : me && (
                                <>
                                    {status === "CONNECTED" && (
                                        <>
                                            <button className="btn btn-rust" onClick={() => navigate(`/messages?dm=${profile._id}`)} style={{ padding: "10px 22px" }}>
                                                Message
                                            </button>
                                            <button className="btn btn-ghost" onClick={handleRemove} disabled={actionLoading} style={{ padding: "10px 18px" }}>
                                                Connected ✓
                                            </button>
                                        </>
                                    )}
                                    {status === "PENDING_SENT" && (
                                        <button className="btn btn-ghost" disabled style={{ padding: "10px 22px" }}>
                                            Request Sent
                                        </button>
                                    )}
                                    {status === "PENDING_RECEIVED" && (
                                        <>
                                            <button className="btn btn-primary" onClick={handleAccept} disabled={actionLoading} style={{ padding: "10px 22px" }}>
                                                Accept Request
                                            </button>
                                            <button className="btn btn-ghost" onClick={handleRemove} disabled={actionLoading} style={{ padding: "10px 18px" }}>
                                                Decline
                                            </button>
                                        </>
                                    )}
                                    {(!status || status === "NONE") && (
                                        <button className="btn btn-primary" onClick={handleConnect} disabled={actionLoading} style={{ padding: "10px 28px" }}>
                                            {actionLoading ? "…" : "Connect"}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Name + meta ── */}
                    <div style={{ paddingLeft: 36, marginBottom: 32 }}>
                        <h1 style={{ fontSize: 32, margin: "0 0 6px", fontFamily: "var(--serif)", color: "var(--ink)" }}>
                            {profile.fullName}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, color: "var(--muted)" }}>@{profile.username}</span>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted)" }} />
                            <span style={{ fontSize: 14, color: "var(--muted)" }}>Batch of {profile.batchYear}</span>
                            {profile.joinedClubs?.length > 0 && (
                                <>
                                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted)" }} />
                                    <span style={{ fontSize: 14, color: "var(--muted)" }}>
                                        {profile.joinedClubs.length} club{profile.joinedClubs.length !== 1 ? "s" : ""}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Main grid ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

                        {/* Left column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                            {/* Bio card */}
                            {profile.bio && (
                                <div style={{
                                    background: "var(--card)",
                                    borderRadius: 16,
                                    padding: "24px 28px",
                                    border: "1px solid var(--line)",
                                }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>About</p>
                                    <p style={{ margin: 0, fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.75 }}>{profile.bio}</p>
                                </div>
                            )}

                            {/* Interests */}
                            {profile.interests?.length > 0 && (
                                <div style={{
                                    background: "var(--card)",
                                    borderRadius: 16,
                                    padding: "24px 28px",
                                    border: "1px solid var(--line)",
                                }}>
                                    <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Interests</p>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {profile.interests.map((interest, i) => {
                                            const c = INTEREST_COLORS[i % INTEREST_COLORS.length];
                                            return (
                                                <span key={interest} style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    padding: "6px 14px",
                                                    borderRadius: 999,
                                                    background: c.bg,
                                                    color: c.color,
                                                }}>
                                                    {interest}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Clubs */}
                            {profile.joinedClubs?.length > 0 && (
                                <div style={{
                                    background: "var(--card)",
                                    borderRadius: 16,
                                    padding: "24px 28px",
                                    border: "1px solid var(--line)",
                                }}>
                                    <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Clubs</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {profile.joinedClubs.map(({ club, role }) => club && (
                                            <div
                                                key={club._id}
                                                onClick={() => navigate(`/clubs/${club._id}`)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 14,
                                                    padding: "12px 16px",
                                                    borderRadius: 12,
                                                    border: "1px solid var(--line)",
                                                    background: "var(--cream)",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s var(--ease)",
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.borderColor = "var(--rust)";
                                                    e.currentTarget.style.transform = "translateX(4px)";
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.borderColor = "var(--line)";
                                                    e.currentTarget.style.transform = "translateX(0)";
                                                }}
                                            >
                                                <img src={club.logo} alt={club.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{club.name}</p>
                                                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{club.category}</p>
                                                </div>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: "4px 10px",
                                                    borderRadius: 999,
                                                    background: role === "LEAD" ? "var(--rust)" : role === "EXECUTIVE" ? "var(--forest)" : "var(--cream-2)",
                                                    color: role === "LEAD" ? "var(--forest-deep)" : role === "EXECUTIVE" ? "var(--cream)" : "var(--muted)",
                                                    letterSpacing: "0.04em",
                                                }}>
                                                    {role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column — stat card */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div style={{
                                background: "var(--forest)",
                                borderRadius: 16,
                                padding: "28px 24px",
                                color: "var(--ivory)",
                            }}>
                                <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>At a glance</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                    <StatRow icon="grad" label="Batch Year" value={profile.batchYear} />
                                    <StatRow icon="clubs" label="Clubs Joined" value={profile.joinedClubs?.length || 0} />
                                    <StatRow
                                        icon="star"
                                        label="Role"
                                        value={
                                            profile.joinedClubs?.some(m => m.role === "LEAD") ? "Club Lead" :
                                            profile.joinedClubs?.some(m => m.role === "EXECUTIVE") ? "Executive" :
                                            profile.joinedClubs?.length > 0 ? "Member" : "—"
                                        }
                                    />
                                </div>
                            </div>

                            {/* Empty state if no bio/interests */}
                            {!profile.bio && !profile.interests?.length && (
                                <div style={{
                                    background: "var(--card)",
                                    borderRadius: 16,
                                    padding: "24px",
                                    border: "1px solid var(--line)",
                                    textAlign: "center",
                                }}>
                                    <div style={{ display: "inline-flex", color: "var(--rust)", marginBottom: 10 }}><Icon name="wave" size={26} stroke={1.4} /></div>
                                    <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
                                        {isMe ? "Add a bio and interests to make your profile shine." : "This person hasn't filled in their profile yet."}
                                    </p>
                                    {isMe && (
                                        <button className="btn btn-primary" onClick={() => navigate("/profile")} style={{ marginTop: 14, padding: "9px 20px", fontSize: 13 }}>
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatRow({ icon, label, value }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,0.1)", color: "var(--rust)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Icon name={icon} size={17} />
            </div>
            <div>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ivory)" }}>{value}</p>
            </div>
        </div>
    );
}

export default UserProfilePage;
