import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import Icon from "../components/Icon";
import { getCoverImage, getLogoImage } from "../utils/clubImages";
import { uploadImage } from "../utils/uploadImage";

function ClubPage() {
    const { clubId } = useParams();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    const [club, setClub] = useState(null);
    const [events, setEvents] = useState([]);
    const [posts, setPosts] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "about");

    // Modals
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
    const [showEditClub, setShowEditClub] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [openPost, setOpenPost] = useState(null);

    const myMembership = user?.joinedClubs?.find(
        (m) => m.club === clubId || m.club?._id === clubId
    );
    const isAlreadyMember = !!myMembership;
    const isLead = myMembership?.role === "LEAD" || myMembership?.role === "EXECUTIVE";

    const handleLeave = async () => {
        if (!window.confirm("Leave this club?")) return;
        try {
            await api.post(`/clubs/${clubId}/leave`);
            const [clubRes] = await Promise.all([
                api.get(`/clubs/${clubId}`),
                refreshUser(),
            ]);
            setClub(clubRes.data.data);
        } catch (err) {
            alert(err.response?.data?.message || "Could not leave club.");
        }
    };

    const handleJoin = async () => {
        if (!user) { navigate("/login"); return; }
        setJoinLoading(true);
        try {
            await api.post(`/clubs/${clubId}/join`);
            const [clubRes] = await Promise.all([
                api.get(`/clubs/${clubId}`),
                refreshUser(),
            ]);
            setClub(clubRes.data.data);
        } catch (err) {
            alert(err.response?.data?.message || "Could not join club.");
        } finally {
            setJoinLoading(false);
        }
    };

    const refetchPosts = async () => {
        const res = await api.get(`/posts/club/${clubId}`);
        setPosts(res.data.data);
    };
    const refetchEvents = async () => {
        const res = await api.get(`/events/club/${clubId}`);
        setEvents(res.data.data);
    };
    const refetchAnnouncements = async () => {
        const res = await api.get(`/announcements/club/${clubId}`);
        setAnnouncements(res.data.data);
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [clubRes, eventsRes, postsRes, annRes] = await Promise.all([
                    api.get(`/clubs/${clubId}`),
                    api.get(`/events/club/${clubId}`),
                    api.get(`/posts/club/${clubId}`),
                    api.get(`/announcements/club/${clubId}`),
                ]);
                setClub(clubRes.data.data);
                setEvents(eventsRes.data.data);
                setPosts(postsRes.data.data);
                setAnnouncements(annRes.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [clubId]);

    const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
    const fmtDate = (d) =>
        new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    if (loading) {
        return (
            <div className="shell">
                <Navbar />
                <div className="skeleton" style={{ height: 280, borderRadius: 0 }} />
                <div className="container" style={{ marginTop: -50 }}>
                    <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
                </div>
            </div>
        );
    }

    if (!club) {
        return (
            <div className="shell">
                <Navbar />
                <div className="container" style={{ padding: "80px 0", textAlign: "center" }}>
                    <h2>Club not found</h2>
                    <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/explore")}>Back to clubs</button>
                </div>
            </div>
        );
    }

    const TABS = ["about", "events", "posts", "announcements"];

    return (
        <div className="shell">
            <Navbar />

            {/* Cover */}
            <div style={{ height: 280, overflow: "hidden", position: "relative", background: "var(--cream-2)" }}>
                <img src={getCoverImage(club)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26, 10, 14,0.45), transparent 55%)" }} />
            </div>

            <div className="container">
                {/* Header card */}
                <div className="card fade-up" style={{ padding: 28, marginTop: -64, position: "relative", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <img
                        src={getLogoImage(club)}
                        alt={club.name}
                        style={{ width: 96, height: 96, borderRadius: 20, objectFit: "cover", border: "4px solid var(--card)", flexShrink: 0, boxShadow: "var(--shadow)" }}
                    />
                    <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                            <div>
                                <h1 style={{ fontSize: 34, marginBottom: 8 }}>{club.name}</h1>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span className="chip chip-rust">{cap(club.category)}</span>
                                    <span style={{ color: "var(--muted)", fontSize: 14 }}>
                                        {club.memberCount} {club.memberCount === 1 ? "member" : "members"}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                {isLead && (
                                    <>
                                        <button onClick={() => setShowEditClub(true)} className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                            <Icon name="edit" size={15} /> Edit Club
                                        </button>
                                        <button onClick={() => setShowMembers(true)} className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                            <Icon name="members" size={16} /> Members
                                        </button>
                                    </>
                                )}
                                {isAlreadyMember && (
                                    <button onClick={() => navigate(`/messages?club=${club._id}`)} className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                        <Icon name="message" size={15} /> Group Chat
                                    </button>
                                )}
                                {!isLead && isAlreadyMember && (
                                    <>
                                        <button onClick={() => setShowMembers(true)} className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                            <Icon name="members" size={16} /> Members
                                        </button>
                                        <button onClick={handleLeave} className="btn btn-ghost" style={{ fontSize: 13, padding: "9px 16px" }}>
                                            Leave
                                        </button>
                                    </>
                                )}
                                {club.isAcceptingMembers && !isAlreadyMember && (
                                    <button onClick={handleJoin} disabled={joinLoading} className="btn btn-rust" style={{ padding: "12px 28px", fontSize: 15 }}>
                                        {joinLoading ? "Joining…" : "Join Club"}
                                    </button>
                                )}
                                {isAlreadyMember && (
                                    <span className="chip" style={{ padding: "10px 18px", fontSize: 14 }}>✓ Member</span>
                                )}
                            </div>
                        </div>
                        <p style={{ marginTop: 16, color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>{club.description}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, margin: "32px 0 0", borderBottom: "1px solid var(--line)" }}>
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
                                fontFamily: "var(--sans)", fontWeight: activeTab === tab ? 600 : 500,
                                borderBottom: activeTab === tab ? "2px solid var(--rust)" : "2px solid transparent",
                                marginBottom: -1, fontSize: 15,
                                color: activeTab === tab ? "var(--ink)" : "var(--muted)",
                                transition: "color 0.2s var(--ease)",
                            }}
                        >
                            {cap(tab)}
                        </button>
                    ))}
                </div>

                <div style={{ padding: "28px 0 80px" }} key={activeTab}>

                    {/* About */}
                    {activeTab === "about" && (
                        <div className="card fade-up" style={{ padding: 32, maxWidth: 720 }}>
                            <h3 style={{ fontSize: 22, marginBottom: 14 }}>About</h3>
                            <p style={{ color: "var(--ink-soft)", lineHeight: 1.75, fontSize: 15 }}>{club.description}</p>
                            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                                {club.contactEmail && (
                                    <Row label="Contact"><a href={`mailto:${club.contactEmail}`}>{club.contactEmail}</a></Row>
                                )}
                                <Row label="Founded by"><strong style={{ color: "var(--ink)" }}>{club.createdBy?.fullName}</strong></Row>
                                <Row label="Status">
                                    <span style={{ color: club.isAcceptingMembers ? "var(--sage)" : "var(--muted)", fontWeight: 600 }}>
                                        {club.isAcceptingMembers ? "Accepting new members" : "Not accepting members"}
                                    </span>
                                </Row>
                            </div>
                        </div>
                    )}

                    {/* Events */}
                    {activeTab === "events" && (
                        <>
                            {isLead && (
                                <div className="fade-up" style={{ marginBottom: 20 }}>
                                    <button className="btn btn-primary" onClick={() => setShowCreateEvent(true)}>+ Create Event</button>
                                </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {events.length === 0 ? <EmptyState text="No events scheduled yet." /> : events.map((event, i) => (
                                    <EventCard key={event._id} event={event} club={club} user={user} isLead={isLead} onRsvp={refetchEvents} onDelete={refetchEvents} index={i} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Posts */}
                    {activeTab === "posts" && (
                        <>
                            {isLead && (
                                <div className="fade-up" style={{ marginBottom: 20 }}>
                                    <button className="btn btn-primary" onClick={() => setShowCreatePost(true)}>+ Create Post</button>
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                                {posts.length === 0 ? <EmptyState text="No posts yet." /> : posts.map((post, i) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        user={user}
                                        isLead={isLead}
                                        index={i}
                                        onLike={refetchPosts}
                                        onOpen={() => setOpenPost(post)}
                                        onDelete={refetchPosts}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Announcements */}
                    {activeTab === "announcements" && (
                        <>
                            {isLead && (
                                <div className="fade-up" style={{ marginBottom: 20 }}>
                                    <button className="btn btn-primary" onClick={() => setShowCreateAnnouncement(true)}>+ Announcement</button>
                                </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
                                {announcements.length === 0 ? <EmptyState text="No announcements yet." /> : announcements.map((a, i) => (
                                    <div key={a._id} className="card" data-reveal="up" style={{ padding: "22px 26px", borderLeft: "3px solid var(--rust)", "--i": i }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                                            <h3 style={{ fontSize: 18 }}>{a.title}</h3>
                                            <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{fmtDate(a.createdAt)}</span>
                                        </div>
                                        <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.65 }}>{a.content}</p>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <img src={a.postedBy?.avatar} alt="" className="avatar" style={{ width: 24, height: 24 }} />
                                            <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.postedBy?.fullName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateEvent && (
                <CreateEventModal
                    clubId={clubId}
                    onClose={() => setShowCreateEvent(false)}
                    onSuccess={() => { setShowCreateEvent(false); refetchEvents(); setActiveTab("events"); }}
                />
            )}
            {showCreatePost && (
                <CreatePostModal
                    clubId={clubId}
                    onClose={() => setShowCreatePost(false)}
                    onSuccess={() => { setShowCreatePost(false); refetchPosts(); }}
                />
            )}
            {showCreateAnnouncement && (
                <CreateAnnouncementModal
                    clubId={clubId}
                    onClose={() => setShowCreateAnnouncement(false)}
                    onSuccess={() => { setShowCreateAnnouncement(false); refetchAnnouncements(); }}
                />
            )}
            {openPost && (
                <PostDetailModal
                    post={openPost}
                    user={user}
                    onClose={() => setOpenPost(null)}
                    onUpdate={() => { refetchPosts(); }}
                />
            )}
            {showEditClub && (
                <EditClubModal
                    club={club}
                    onClose={() => setShowEditClub(false)}
                    onSuccess={(updated) => { setClub(updated); setShowEditClub(false); }}
                />
            )}
            {showMembers && (
                <MembersModal
                    clubId={clubId}
                    isCreator={String(club.createdBy?._id || club.createdBy) === String(user?._id)}
                    onClose={() => setShowMembers(false)}
                />
            )}
        </div>
    );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Row({ label, children }) {
    return (
        <div style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--ink-soft)" }}>
            <span style={{ color: "var(--muted)", minWidth: 100 }}>{label}</span>
            {children}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)", gridColumn: "1 / -1" }}>
            <p style={{ fontSize: 15, margin: 0 }}>{text}</p>
        </div>
    );
}

function EventCard({ event, club, user, isLead, onRsvp, onDelete, index = 0 }) {
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [showAttendees, setShowAttendees] = useState(false);
    const [showCantGo, setShowCantGo] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [cantGoReason, setCantGoReason] = useState("");
    const [cantGoLoading, setCantGoLoading] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm("Delete this event?")) return;
        try {
            await api.delete(`/events/${event._id}`);
            onDelete();
        } catch (err) {
            alert(err.response?.data?.message || "Could not delete event.");
        }
    };

    const myRsvp = event.rsvp?.find(
        (r) => String(r.user?._id || r.user) === String(user?._id)
    );
    const goingCount = event.rsvp?.filter(r => r.status === "GOING").length || 0;

    const handleRsvp = async (status) => {
        if (!user) return;
        setRsvpLoading(true);
        try {
            await api.post(`/events/${event._id}/rsvp`, { status });
            onRsvp();
        } catch (err) {
            alert(err.response?.data?.message || "Could not RSVP.");
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleCantGo = async (e) => {
        e.preventDefault();
        setCantGoLoading(true);
        try {
            await api.post(`/events/${event._id}/rsvp`, { status: "NOT_GOING", reason: cantGoReason.trim() });
            setShowCantGo(false);
            setCantGoReason("");
            onRsvp();
        } catch (err) {
            alert(err.response?.data?.message || "Could not update RSVP.");
        } finally {
            setCantGoLoading(false);
        }
    };

    const rsvpStatus = myRsvp?.status;

    return (
        <>
            <div
                className="card card-hover"
                data-reveal="up"
                style={{ overflow: "hidden", display: "flex", flexWrap: "wrap", cursor: "pointer", "--i": index }}
                onClick={() => setShowDetail(true)}
            >
                {event.bannerImage && (
                    <img src={event.bannerImage} alt={event.title} style={{ width: 180, minHeight: 150, objectFit: "cover", flexShrink: 0 }} />
                )}
                <div style={{ padding: 22, flex: 1, minWidth: 220 }}>
                    <span className="chip" style={{ fontSize: 11, marginBottom: 10 }}>
                        {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <h3 style={{ fontSize: 20, margin: "10px 0 8px" }}>{event.title}</h3>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><Icon name="location" size={14} /> {event.venue}</p>
                    <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.55 }}>
                        {event.description.length > 120 ? event.description.slice(0, 120) + "…" : event.description}
                    </p>
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {user && !rsvpStatus && (
                            <>
                                <button onClick={() => handleRsvp("GOING")} disabled={rsvpLoading} className="btn btn-rust" style={{ padding: "8px 20px", fontSize: 13 }}>
                                    {rsvpLoading ? "…" : "✓ Going"}
                                </button>
                                <button onClick={() => setShowCantGo(true)} className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>
                                    Can't Go
                                </button>
                            </>
                        )}
                        {rsvpStatus === "GOING" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="chip chip-rust" style={{ fontSize: 13, padding: "8px 16px" }}>✓ Going</span>
                                <button onClick={() => setShowCantGo(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", fontFamily: "var(--sans)", padding: 0 }}>
                                    Can't make it?
                                </button>
                            </div>
                        )}
                        {rsvpStatus === "NOT_GOING" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span className="chip" style={{ fontSize: 13, padding: "8px 16px", color: "var(--muted)" }}>✕ Can't go</span>
                                <button onClick={() => handleRsvp("GOING")} disabled={rsvpLoading} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--rust)", fontFamily: "var(--sans)", fontWeight: 600, padding: 0 }}>
                                    Changed mind?
                                </button>
                            </div>
                        )}
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>{goingCount} going</span>
                        {isLead && (
                            <>
                                <button onClick={() => setShowAttendees(true)} className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px" }}>
                                    Attendees
                                </button>
                                <button onClick={handleDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", fontFamily: "var(--sans)", padding: 0 }}>
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showCantGo && (
                <Modal title="Can't make it?" onClose={() => setShowCantGo(false)}>
                    <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 16 }}>
                        Let the organiser know you won't be attending <strong>{event.title}</strong>.
                    </p>
                    <form onSubmit={handleCantGo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                                Reason (optional)
                            </label>
                            <textarea
                                className="field"
                                rows={3}
                                value={cantGoReason}
                                onChange={e => setCantGoReason(e.target.value)}
                                placeholder="e.g. Have exams that day…"
                                style={{ resize: "none", fontFamily: "var(--sans)" }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button type="submit" disabled={cantGoLoading} className="btn btn-primary" style={{ padding: "11px 24px" }}>
                                {cantGoLoading ? "…" : "Confirm"}
                            </button>
                            <button type="button" onClick={() => setShowCantGo(false)} className="btn btn-ghost" style={{ padding: "11px 24px" }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showAttendees && (
                <AttendeesModal eventId={event._id} title={event.title} onClose={() => setShowAttendees(false)} />
            )}

            {showDetail && (
                <EventDetailModal
                    event={event}
                    club={club}
                    user={user}
                    isLead={isLead}
                    rsvpStatus={rsvpStatus}
                    goingCount={goingCount}
                    onRsvp={(status) => { handleRsvp(status); }}
                    onDelete={() => { setShowDetail(false); onDelete(); }}
                    onClose={() => setShowDetail(false)}
                />
            )}
        </>
    );
}

/* ─── Event Detail Modal ─────────────────────────────────── */
function EventDetailModal({ event, club, user, isLead, rsvpStatus, goingCount, onRsvp, onDelete, onClose }) {
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [lightbox, setLightbox] = useState(null); // index of enlarged past image

    const handleRsvp = async (status) => {
        setRsvpLoading(true);
        try { await onRsvp(status); } finally { setRsvpLoading(false); }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
    });

    const coverSrc = club?.coverImage || event.bannerImage;

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(28,38,32,0.72)", backdropFilter: "blur(6px)",
                overflowY: "auto", WebkitOverflowScrolling: "touch",
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    margin: "40px auto",
                    maxWidth: 780,
                    width: "calc(100% - 32px)",
                    borderRadius: 20,
                    background: "var(--card)",
                    overflow: "hidden",
                    boxShadow: "0 32px 80px rgba(28,38,32,0.35)",
                }}
            >
                {/* Hero banner — club cover as big backdrop */}
                <div style={{ position: "relative", height: 260 }}>
                    <img
                        src={coverSrc}
                        alt={event.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {/* Dark gradient overlay */}
                    <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(to top, rgba(28,38,32,0.85) 0%, rgba(28,38,32,0.15) 55%, transparent 100%)",
                    }} />
                    {/* Club logo + name floating over banner */}
                    {club && (
                        <div style={{
                            position: "absolute", bottom: 20, left: 24,
                            display: "flex", alignItems: "center", gap: 12,
                        }}>
                            <img
                                src={club.logo}
                                alt={club.name}
                                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "2px solid rgba(255,255,255,0.25)" }}
                            />
                            <div>
                                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Hosted by</p>
                                <p style={{ margin: 0, fontSize: 15, color: "#fff", fontWeight: 700 }}>{club.name}</p>
                            </div>
                        </div>
                    )}
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        style={{
                            position: "absolute", top: 16, right: 16,
                            width: 36, height: 36, borderRadius: "50%",
                            background: "rgba(0,0,0,0.4)", border: "none", cursor: "pointer",
                            color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "28px 32px 36px" }}>
                    {/* Title + date row */}
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: 28, margin: "0 0 10px", fontFamily: "var(--serif)" }}>{event.title}</h2>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "var(--rust)", display: "inline-flex" }}><Icon name="events" size={20} /></span>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{fmtDate(event.eventDate)}</p>
                                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{fmtTime(event.eventDate)}</p>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "var(--rust)", display: "inline-flex" }}><Icon name="location" size={20} /></span>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{event.venue}</p>
                                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Venue</p>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "var(--rust)", display: "inline-flex" }}><Icon name="members" size={20} /></span>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{goingCount} going</p>
                                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Attendees</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "var(--line)", margin: "20px 0" }} />

                    {/* Description */}
                    <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, margin: "0 0 24px" }}>
                        {event.description}
                    </p>

                    {/* RSVP actions */}
                    {user && (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
                            {!rsvpStatus && (
                                <>
                                    <button
                                        onClick={() => handleRsvp("GOING")}
                                        disabled={rsvpLoading}
                                        className="btn btn-rust"
                                        style={{ padding: "11px 28px" }}
                                    >
                                        {rsvpLoading ? "…" : "✓ I'm Going"}
                                    </button>
                                    <button
                                        onClick={() => handleRsvp("NOT_GOING")}
                                        disabled={rsvpLoading}
                                        className="btn btn-ghost"
                                        style={{ padding: "11px 24px" }}
                                    >
                                        Can't Go
                                    </button>
                                </>
                            )}
                            {rsvpStatus === "GOING" && (
                                <>
                                    <span className="chip chip-rust" style={{ fontSize: 14, padding: "11px 20px" }}>✓ You're going</span>
                                    <button onClick={() => handleRsvp("NOT_GOING")} disabled={rsvpLoading} className="btn btn-ghost" style={{ padding: "11px 20px", fontSize: 13 }}>
                                        Can't make it?
                                    </button>
                                </>
                            )}
                            {rsvpStatus === "NOT_GOING" && (
                                <>
                                    <span className="chip" style={{ fontSize: 14, padding: "11px 20px", color: "var(--muted)" }}>✕ Not attending</span>
                                    <button onClick={() => handleRsvp("GOING")} disabled={rsvpLoading} className="btn btn-primary" style={{ padding: "11px 24px", fontSize: 13 }}>
                                        Changed mind?
                                    </button>
                                </>
                            )}
                            {isLead && (
                                <button
                                    onClick={() => { if (window.confirm("Delete this event?")) onDelete(); }}
                                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", fontFamily: "var(--sans)", padding: "11px 0" }}
                                >
                                    Delete event
                                </button>
                            )}
                        </div>
                    )}

                    {/* Past images gallery */}
                    {event.pastImages?.length > 0 && (
                        <>
                            <div style={{ height: 1, background: "var(--line)", margin: "0 0 24px" }} />
                            <h3 style={{ fontSize: 16, margin: "0 0 14px", color: "var(--ink)" }}>
                                From last year
                            </h3>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                                gap: 10,
                            }}>
                                {event.pastImages.map((src, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setLightbox(i)}
                                        style={{
                                            aspectRatio: "4/3",
                                            borderRadius: 10,
                                            overflow: "hidden",
                                            cursor: "zoom-in",
                                            background: "var(--cream-2)",
                                        }}
                                    >
                                        <img
                                            src={src}
                                            alt=""
                                            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s var(--ease)" }}
                                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightbox !== null && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 1100,
                        background: "rgba(0,0,0,0.92)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={() => setLightbox(null)}
                >
                    <img
                        src={event.pastImages[lightbox]}
                        alt=""
                        style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
                    />
                    <button
                        onClick={() => setLightbox(null)}
                        style={{
                            position: "fixed", top: 20, right: 24,
                            background: "rgba(255,255,255,0.15)", border: "none",
                            color: "#fff", fontSize: 24, cursor: "pointer",
                            borderRadius: "50%", width: 44, height: 44,
                        }}
                    >
                        ✕
                    </button>
                    {lightbox > 0 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1); }}
                            style={{ position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", borderRadius: "50%", width: 48, height: 48 }}
                        >
                            ‹
                        </button>
                    )}
                    {lightbox < event.pastImages.length - 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1); }}
                            style={{ position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", borderRadius: "50%", width: 48, height: 48 }}
                        >
                            ›
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function AttendeesModal({ eventId, title, onClose }) {
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/events/${eventId}/attendees`)
            .then(res => setAttendees(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [eventId]);

    const going = attendees.filter(a => a.status === "GOING");
    const maybe = attendees.filter(a => a.status === "MAYBE");
    const notGoing = attendees.filter(a => a.status === "NOT_GOING");

    return (
        <Modal title={`Attendees — ${title}`} onClose={onClose}>
            {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>}
            {!loading && attendees.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No RSVPs yet.</p>
            )}
            {!loading && going.length > 0 && (
                <AttendeeGroup label="Going" dot="var(--sage)" people={going} />
            )}
            {!loading && maybe.length > 0 && (
                <AttendeeGroup label="Maybe" dot="var(--rust)" people={maybe} />
            )}
            {!loading && notGoing.length > 0 && (
                <AttendeeGroup label="Not going" dot="var(--muted)" people={notGoing} showReasons />
            )}
        </Modal>
    );
}

function AttendeeGroup({ label, dot, people, showReasons }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block" }} />
                {label} ({people.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {people.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <img src={a.user?.avatar} alt="" className="avatar" style={{ width: 34, height: 34, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{a.user?.fullName}</p>
                            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>@{a.user?.username}</p>
                            {showReasons && a.reason && (
                                <p style={{
                                    margin: "5px 0 0",
                                    fontSize: 13,
                                    color: "var(--ink-soft)",
                                    fontStyle: "italic",
                                    background: "var(--cream-2)",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    lineHeight: 1.5,
                                }}>
                                    "{a.reason}"
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PostCard({ post, user, isLead, onLike, onOpen, onDelete, index = 0 }) {
    const [loading, setLoading] = useState(false);
    const hasLiked = post.likes?.some((id) => String(id) === String(user?._id));
    const canDelete = isLead || String(post.author?._id) === String(user?._id);

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) return;
        setLoading(true);
        try {
            await api.patch(`/posts/${post._id}/like`);
            onLike();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this post?")) return;
        try {
            await api.delete(`/posts/${post._id}`);
            onDelete();
        } catch (err) {
            alert(err.response?.data?.message || "Could not delete post.");
        }
    };

    return (
        <div className="card card-hover" data-reveal="up" style={{ overflow: "hidden", cursor: "pointer", "--i": index }} onClick={onOpen}>
            <div style={{ position: "relative" }}>
                <img src={post.image} alt="" style={{ width: "100%", height: 220, objectFit: "cover" }} />
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        style={{
                            position: "absolute", top: 8, right: 8,
                            background: "rgba(26, 10, 14,0.7)", border: "none", borderRadius: 8,
                            color: "#fff", cursor: "pointer", padding: "4px 10px", fontSize: 12,
                        }}
                    >
                        Delete
                    </button>
                )}
            </div>
            <div style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src={post.author?.avatar} alt="" className="avatar" style={{ width: 30, height: 30 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{post.author?.fullName}</span>
                </div>
                {post.caption && <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{post.caption}</p>}
                <div style={{ display: "flex", gap: 18 }}>
                    <button onClick={handleLike} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: hasLiked ? "var(--rust)" : "var(--muted)", fontWeight: hasLiked ? 600 : 400, padding: 0, fontFamily: "var(--sans)", transition: "color 0.2s" }}>
                        <Icon name="heart" size={16} style={hasLiked ? { fill: "var(--rust)" } : undefined} /> {post.likes?.length || 0}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onOpen(); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", padding: 0, fontFamily: "var(--sans)" }}>
                        <Icon name="chat" size={16} /> {post.comments?.length || 0}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Create modals ──────────────────────────────────────── */

function CreateEventModal({ clubId, onClose, onSuccess }) {
    const [form, setForm] = useState({ title: "", description: "", eventDate: "", venue: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [bannerName, setBannerName] = useState("");
    const [pastNames, setPastNames] = useState([]);
    const bannerRef = useRef(null);
    const pastRef = useRef(null);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            // Upload images straight to Cloudinary, then send only URLs (JSON).
            const bannerFile = bannerRef.current?.files[0];
            if (!bannerFile) { setError("Banner image is required."); setLoading(false); return; }
            const bannerImageUrl = await uploadImage(bannerFile, "events");

            let pastImageUrls = [];
            if (pastRef.current?.files?.length) {
                pastImageUrls = await Promise.all(
                    Array.from(pastRef.current.files).map(f => uploadImage(f, "events"))
                );
            }
            await api.post("/events/create", { hostedBy: clubId, ...form, bannerImageUrl, pastImageUrls });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to create event.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Create Event" onClose={onClose}>
            {error && <ErrBox msg={error} />}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Event Title" required>
                    <input className="field" value={form.title} onChange={set("title")} required placeholder="e.g. Hackathon 2025" />
                </Field>
                <Field label="Description" required>
                    <textarea className="field" rows={3} value={form.description} onChange={set("description")} required placeholder="What's happening?" style={{ resize: "vertical", fontFamily: "var(--sans)" }} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Date & Time" required>
                        <input className="field" type="datetime-local" value={form.eventDate} onChange={set("eventDate")} required />
                    </Field>
                    <Field label="Venue" required>
                        <input className="field" value={form.venue} onChange={set("venue")} required placeholder="Room / Location" />
                    </Field>
                </div>
                <Field label="Banner Image">
                    <FileInput inputRef={bannerRef} name={bannerName} setName={setBannerName} />
                </Field>
                <Field label="Last Year's Photos (optional — up to 6)">
                    <label style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10,
                        border: "1.5px dashed var(--line)", cursor: "pointer",
                        fontSize: 13, color: "var(--ink-soft)", background: "var(--cream)",
                    }}>
                        <span style={{ color: "var(--rust)", display: "inline-flex" }}><Icon name="image" size={17} /></span>
                        <span>{pastNames.length > 0 ? `${pastNames.length} photo${pastNames.length > 1 ? "s" : ""} selected` : "Choose photos…"}</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={pastRef}
                            style={{ display: "none" }}
                            onChange={e => setPastNames(Array.from(e.target.files).map(f => f.name))}
                        />
                    </label>
                </Field>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 13, marginTop: 4 }}>
                    {loading ? "Creating…" : "Create Event"}
                </button>
            </form>
        </Modal>
    );
}

function CreatePostModal({ clubId, onClose, onSuccess }) {
    const [caption, setCaption] = useState("");
    const [imageName, setImageName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const imageRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageRef.current?.files[0]) { setError("Image is required."); return; }
        setError("");
        setLoading(true);
        try {
            // Upload the image straight to Cloudinary, then send only the URL.
            const imageUrl = await uploadImage(imageRef.current.files[0], "posts");
            await api.post("/posts", { clubId, caption, imageUrl });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to create post.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Create Post" onClose={onClose}>
            {error && <ErrBox msg={error} />}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Image" required>
                    <FileInput inputRef={imageRef} name={imageName} setName={setImageName} />
                </Field>
                <Field label="Caption (optional)">
                    <textarea className="field" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Say something…" style={{ resize: "vertical", fontFamily: "var(--sans)" }} />
                </Field>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 13, marginTop: 4 }}>
                    {loading ? "Posting…" : "Post"}
                </button>
            </form>
        </Modal>
    );
}

function CreateAnnouncementModal({ clubId, onClose, onSuccess }) {
    const [form, setForm] = useState({ title: "", content: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/announcements", { clubId, ...form });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to post announcement.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="New Announcement" onClose={onClose}>
            {error && <ErrBox msg={error} />}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Title" required>
                    <input className="field" value={form.title} onChange={set("title")} required placeholder="What's the update?" />
                </Field>
                <Field label="Content" required>
                    <textarea className="field" rows={4} value={form.content} onChange={set("content")} required placeholder="Write your announcement…" style={{ resize: "vertical", fontFamily: "var(--sans)" }} />
                </Field>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 13, marginTop: 4 }}>
                    {loading ? "Posting…" : "Post Announcement"}
                </button>
            </form>
        </Modal>
    );
}

function PostDetailModal({ post: initialPost, user, onClose, onUpdate }) {
    const [post, setPost] = useState(initialPost);
    const [comment, setComment] = useState("");
    const [likeLoading, setLikeLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);

    const hasLiked = post.likes?.some((id) => String(id) === String(user?._id));

    const refreshPost = async () => {
        try {
            // Re-fetch all club posts and find this one to get updated likes/comments
            const res = await api.get(`/posts/club/${post.club}`);
            const updated = res.data.data.find(p => p._id === post._id);
            if (updated) setPost(updated);
            onUpdate();
        } catch {}
    };

    const handleLike = async () => {
        if (!user) return;
        setLikeLoading(true);
        try {
            await api.patch(`/posts/${post._id}/like`);
            await refreshPost();
        } finally {
            setLikeLoading(false);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setCommentLoading(true);
        try {
            await api.post(`/posts/${post._id}/comment`, { text: comment });
            setComment("");
            await refreshPost();
        } finally {
            setCommentLoading(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(26, 10, 14, 0.55)",
                backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20,
                animation: "fadeIn 0.2s var(--ease) both",
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="card"
                style={{
                    width: "100%", maxWidth: 860,
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    overflow: "hidden", maxHeight: "90vh",
                    animation: "fadeUp 0.3s var(--ease) both",
                }}
            >
                {/* Left — image */}
                <div style={{ background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={post.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: "90vh" }} />
                </div>

                {/* Right — details + comments */}
                <div style={{ display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
                    {/* Header */}
                    <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={post.author?.avatar} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{post.author?.fullName}</p>
                            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>@{post.author?.username}</p>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--muted)", lineHeight: 1 }}>×</button>
                    </div>

                    {/* Caption + comments scroll area */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                        {post.caption && (
                            <div style={{ display: "flex", gap: 10 }}>
                                <img src={post.author?.avatar} alt="" className="avatar" style={{ width: 30, height: 30, flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
                                    <strong>{post.author?.fullName}</strong>{"  "}{post.caption}
                                </p>
                            </div>
                        )}
                        {post.comments?.length === 0 && (
                            <p style={{ color: "var(--muted)", fontSize: 13 }}>No comments yet.</p>
                        )}
                        {post.comments?.map((c, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <img src={c.user?.avatar} alt="" className="avatar" style={{ width: 30, height: 30, flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
                                    <strong>{c.user?.fullName}</strong>{"  "}{c.text}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Like bar */}
                    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16 }}>
                        <button
                            onClick={handleLike}
                            disabled={likeLoading || !user}
                            style={{
                                background: "none", border: "none", cursor: "pointer", display: "inline-flex",
                                color: hasLiked ? "var(--rust)" : "var(--muted)",
                                padding: 0, transition: "transform 0.15s, color 0.15s",
                                transform: likeLoading ? "scale(0.85)" : "scale(1)",
                            }}
                        >
                            <Icon name="heart" size={22} style={hasLiked ? { fill: "var(--rust)" } : undefined} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                            {post.likes?.length || 0} {post.likes?.length === 1 ? "like" : "likes"}
                        </span>
                    </div>

                    {/* Comment input */}
                    {user && (
                        <form onSubmit={handleComment} style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
                            <input
                                className="field"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Add a comment…"
                                style={{ flex: 1, fontSize: 14, padding: "9px 14px" }}
                            />
                            <button type="submit" disabled={commentLoading || !comment.trim()} className="btn btn-primary" style={{ padding: "0 16px" }}>
                                {commentLoading ? "…" : "Post"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Tiny shared helpers ────────────────────────────────── */

function Field({ label, required, children }) {
    return (
        <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
                {label}{required && " *"}
            </label>
            {children}
        </div>
    );
}

function FileInput({ inputRef, name, setName }) {
    return (
        <label className="field" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ background: "var(--cream-2)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)", flexShrink: 0 }}>Choose</span>
            <span style={{ fontSize: 14, color: name ? "var(--ink)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name || "No file selected"}
            </span>
            <input type="file" accept="image/*" ref={inputRef} onChange={(e) => setName(e.target.files[0]?.name || "")} style={{ display: "none" }} />
        </label>
    );
}

function ErrBox({ msg }) {
    return (
        <div style={{ background: "var(--rust-soft)", color: "var(--rust-dark)", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 4 }}>
            {msg}
        </div>
    );
}

/* ─── Edit Club Modal ────────────────────────────────────── */
function EditClubModal({ club, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: club.name || "",
        description: club.description || "",
        contactEmail: club.contactEmail || "",
        isAcceptingMembers: club.isAcceptingMembers ?? true,
    });
    const [logoName, setLogoName] = useState("");
    const [coverName, setCoverName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const logoRef = useRef(null);
    const coverRef = useRef(null);

    const set = (k) => (e) => setForm(f => ({
        ...f,
        [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                contactEmail: form.contactEmail,
                isAcceptingMembers: form.isAcceptingMembers,
            };
            if (logoRef.current?.files[0]) payload.logoUrl = await uploadImage(logoRef.current.files[0], "clubs");
            if (coverRef.current?.files[0]) payload.coverImageUrl = await uploadImage(coverRef.current.files[0], "covers");
            const res = await api.patch(`/clubs/${club._id}`, payload);
            onSuccess(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to update club.");
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 };

    return (
        <Modal title="Edit Club" onClose={onClose}>
            {error && <ErrBox msg={error} />}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <label style={labelStyle}>Club Name</label>
                    <input className="field" value={form.name} onChange={set("name")} required />
                </div>
                <div>
                    <label style={labelStyle}>Description</label>
                    <textarea className="field" rows={4} value={form.description} onChange={set("description")} required style={{ resize: "vertical", fontFamily: "var(--sans)" }} />
                </div>
                <div>
                    <label style={labelStyle}>Contact Email</label>
                    <input className="field" type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="club@college.edu" />
                </div>
                <div>
                    <label style={labelStyle}>Logo (optional — replaces current)</label>
                    <FileInput inputRef={logoRef} name={logoName} setName={setLogoName} />
                </div>
                <div>
                    <label style={labelStyle}>Cover Image (optional — replaces current)</label>
                    <FileInput inputRef={coverRef} name={coverName} setName={setCoverName} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "var(--ink)" }}>
                    <input
                        type="checkbox"
                        checked={form.isAcceptingMembers}
                        onChange={set("isAcceptingMembers")}
                        style={{ width: 16, height: 16, accentColor: "var(--forest)" }}
                    />
                    Accepting new members
                </label>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 13, marginTop: 4 }}>
                    {loading ? "Saving…" : "Save Changes"}
                </button>
            </form>
        </Modal>
    );
}

/* ─── Members Modal ──────────────────────────────────────── */
function MembersModal({ clubId, isCreator, onClose }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState({}); // memberId -> true
    const [manageId, setManageId] = useState(null); // which member's menu is open
    const navigate = useNavigate();

    const load = () => {
        api.get(`/clubs/${clubId}/members`)
            .then(res => setMembers(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, [clubId]);

    const roleLabel = (role) => {
        if (role === "LEAD") return { label: "Lead", bg: "var(--rust)", color: "var(--forest-deep)" };
        if (role === "EXECUTIVE") return { label: "Executive", bg: "var(--forest)", color: "var(--ivory)" };
        return { label: "Member", bg: "var(--cream-2)", color: "var(--ink-soft)" };
    };

    const setRole = async (memberId, role) => {
        setBusy(p => ({ ...p, [memberId]: true }));
        try {
            await api.patch(`/clubs/${clubId}/members/${memberId}/role`, { role });
            setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role } : m));
            setManageId(null);
        } catch (e) {
            alert(e.response?.data?.message || "Failed to update role");
        } finally {
            setBusy(p => ({ ...p, [memberId]: false }));
        }
    };

    const removeMember = async (memberId, name) => {
        if (!window.confirm(`Remove ${name} from the club?`)) return;
        setBusy(p => ({ ...p, [memberId]: true }));
        try {
            await api.delete(`/clubs/${clubId}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
            setManageId(null);
        } catch (e) {
            alert(e.response?.data?.message || "Failed to remove member");
        } finally {
            setBusy(p => ({ ...p, [memberId]: false }));
        }
    };

    return (
        <Modal title={`Members (${members.length})`} onClose={onClose}>
            {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>}
            {!loading && members.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No members found.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {members.map((m) => {
                    const rl = roleLabel(m.role || "MEMBER");
                    const canManage = isCreator && m.role !== "LEAD";
                    const isOpen = manageId === m._id;
                    return (
                        <div key={m._id} style={{ borderRadius: 10, transition: "background 0.15s", background: isOpen ? "var(--cream-2)" : "transparent" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px" }}>
                                <img
                                    src={m.avatar}
                                    alt=""
                                    className="avatar"
                                    style={{ width: 40, height: 40, cursor: "pointer" }}
                                    onClick={() => { onClose(); navigate(`/users/${m.username}`); }}
                                />
                                <div
                                    style={{ flex: 1, cursor: "pointer" }}
                                    onClick={() => { onClose(); navigate(`/users/${m.username}`); }}
                                >
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{m.fullName}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>@{m.username}</p>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: rl.bg, color: rl.color }}>
                                    {rl.label}
                                </span>
                                {canManage && (
                                    <button
                                        onClick={() => setManageId(isOpen ? null : m._id)}
                                        title="Manage"
                                        style={{
                                            border: "none", background: "none", cursor: "pointer",
                                            fontSize: 18, color: "var(--muted)", padding: "0 4px",
                                            lineHeight: 1,
                                        }}
                                    >
                                        ⋯
                                    </button>
                                )}
                            </div>
                            {canManage && isOpen && (
                                <div style={{ display: "flex", gap: 8, padding: "0 8px 10px 60px", flexWrap: "wrap" }}>
                                    {m.role === "MEMBER" ? (
                                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}
                                            disabled={busy[m._id]} onClick={() => setRole(m._id, "EXECUTIVE")}>
                                            ↑ Make Executive
                                        </button>
                                    ) : (
                                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}
                                            disabled={busy[m._id]} onClick={() => setRole(m._id, "MEMBER")}>
                                            ↓ Demote to Member
                                        </button>
                                    )}
                                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", color: "var(--rust-dark)" }}
                                        disabled={busy[m._id]} onClick={() => removeMember(m._id, m.fullName)}>
                                        ✕ Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}

export default ClubPage;
