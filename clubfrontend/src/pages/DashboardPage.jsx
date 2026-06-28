import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtEventDate = (d) => {
    const dt = new Date(d);
    return {
        day: dt.toLocaleDateString("en-IN", { day: "numeric" }),
        month: dt.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
        time: dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        weekday: dt.toLocaleDateString("en-IN", { weekday: "short" }),
    };
};

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Still up";
};

/* Section label like the explore page: gold kicker + serif heading */
function SectionLabel({ kicker, title, right }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
            <div>
                <p style={{ fontSize: 11.5, letterSpacing: "0.22em", color: "var(--rust)", margin: "0 0 8px", fontWeight: 700 }}>
                    {kicker}
                </p>
                <h2 style={{ fontSize: "clamp(22px, 2.6vw, 32px)", margin: 0 }}>{title}</h2>
            </div>
            {right}
        </div>
    );
}

function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        api.get("/feed")
            .then((r) => {
                setItems(r.data.data.items || []);
                setUpcoming(r.data.data.upcomingEvents || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const heroRef = useRef(null);

    // SPYLT-style hero: char-by-char greeting rise + stat panel slide-in
    useGSAP(() => {
        if (!user) return;
        const split = new SplitText(".dash-greeting", { type: "chars" });
        const tl = gsap.timeline({ delay: 0.15 });
        tl.from(split.chars, { yPercent: 140, opacity: 0, stagger: 0.02, ease: "power3.out", duration: 0.8 })
            .from(".dash-hero .chip-rust, .dash-sub, .dash-cta", { opacity: 0, y: 20, stagger: 0.1, ease: "power2.out", duration: 0.5 }, "-=0.5")
            .from(".dash-stats", { opacity: 0, x: 40, ease: "power2.out", duration: 0.6 }, "-=0.6");
        return () => split.revert();
    }, { scope: heroRef, dependencies: [!!user] });

    if (!user) return null;

    const clubCount = user.joinedClubs?.length || 0;
    const connectionCount = (user.connections || []).filter(c => c.status === "ACCEPTED").length;
    const hasClubs = clubCount > 0;
    const firstName = user.fullName?.split(" ")[0];

    const STATS = [
        { value: clubCount, label: "Clubs joined" },
        { value: connectionCount, label: "Connections" },
        { value: upcoming.length, label: "Upcoming events" },
    ];

    return (
        <div className="shell">
            <Navbar />

            {/* ── Hero ── */}
            <section ref={heroRef} style={{ paddingBottom: "clamp(28px, 4vw, 52px)" }}>
                <div className="x-wrap dash-hero" style={{ paddingTop: "clamp(40px, 6vw, 72px)", maxWidth: 1280, marginInline: "auto" }}>
                    {/* Left — greeting */}
                    <div style={{ flex: "1 1 460px", minWidth: 0 }}>
                        <span className="chip chip-rust" style={{ marginBottom: 22, display: "inline-flex" }}>✦ Your dashboard</span>
                        <h1 className="dash-greeting" style={{ fontSize: "clamp(40px, 6vw, 88px)", lineHeight: 0.96, letterSpacing: "-0.035em", margin: 0, color: "var(--ivory)" }}>
                            {greeting()}, <em style={{ fontStyle: "italic", color: "var(--rust)" }}>{firstName}</em>.
                        </h1>
                        <p className="dash-sub" style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 440, lineHeight: 1.7, marginTop: 24 }}>
                            {hasClubs
                                ? "Here's everything moving across the communities you're part of."
                                : "Your campus story starts here. Find your first club and watch this space come alive."}
                        </p>
                        <div className="dash-cta" style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                            <button className="btn btn-rust" onClick={() => navigate("/explore")} style={{ padding: "12px 26px" }}>
                                Explore clubs
                            </button>
                            <button className="btn btn-ghost" onClick={() => navigate("/my-events")} style={{ padding: "12px 24px" }}>
                                My events
                            </button>
                        </div>
                    </div>

                    {/* Right — stat panel */}
                    <div className="dash-stats card">
                        <p style={{ fontSize: 11.5, letterSpacing: "0.22em", color: "var(--rust)", margin: "0 0 4px", fontWeight: 700 }}>AT A GLANCE</p>
                        {STATS.map((s) => (
                            <div key={s.label} className="dash-stat">
                                <div style={{ fontFamily: "var(--serif)", fontSize: 46, color: "var(--ivory)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                                    {String(s.value).padStart(2, "0")}
                                </div>
                                <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, textAlign: "right" }}>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Body ── */}
            <div className="x-wrap" style={{ padding: "clamp(36px, 5vw, 60px) clamp(24px, 5vw, 72px) 90px", maxWidth: 1280, marginInline: "auto" }}>
                {!hasClubs ? (
                    <div className="card fade-up" style={{ padding: "clamp(40px, 6vw, 72px)", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", color: "var(--rust)", marginBottom: 18 }}>
                            <Icon name="sprout" size={40} stroke={1.3} />
                        </div>
                        <h3 style={{ fontSize: 24, margin: "0 0 10px" }}>Your feed is waiting</h3>
                        <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 auto 24px", maxWidth: 400, lineHeight: 1.6 }}>
                            Join a few clubs and their posts, events, and announcements will stream in right here.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate("/explore")} style={{ padding: "13px 30px" }}>
                            Explore clubs →
                        </button>
                    </div>
                ) : (
                    <div className="dash-grid">
                        {/* ── Activity stream ── */}
                        <div style={{ minWidth: 0 }}>
                            <SectionLabel kicker="WHAT'S NEW" title="Your feed" />

                            {loading && [...Array(3)].map((_, i) => (
                                <div key={i} className="card" style={{ padding: 22, marginBottom: 18 }}>
                                    <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 14 }} />
                                    <div className="skeleton" style={{ height: 180, borderRadius: 12, marginBottom: 12 }} />
                                    <div className="skeleton" style={{ height: 12, width: "70%" }} />
                                </div>
                            ))}

                            {!loading && items.length === 0 && (
                                <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                                    <p style={{ fontSize: 15, margin: 0 }}>It's quiet for now. New activity will appear here.</p>
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                {!loading && items.map((item, i) => (
                                    <FeedItem key={item.kind + item._id} item={item} navigate={navigate} index={i} />
                                ))}
                            </div>
                        </div>

                        {/* ── Sidebar ── */}
                        <aside className="dash-aside" data-reveal="right" style={{ "--i": 1 }}>
                            {/* Upcoming events */}
                            <div className="card" style={{ padding: 24 }}>
                                <SectionLabel kicker="ON THE HORIZON" title="Upcoming" />
                                {loading && [...Array(2)].map((_, i) => (
                                    <div key={i} className="skeleton" style={{ height: 62, borderRadius: 12, marginBottom: 12 }} />
                                ))}
                                {!loading && upcoming.length === 0 && (
                                    <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>Nothing on the calendar yet.</p>
                                )}
                                {!loading && upcoming.map((ev, i) => {
                                    const d = fmtEventDate(ev.eventDate);
                                    return (
                                        <div
                                            key={ev._id}
                                            onClick={() => navigate(`/clubs/${ev.hostedBy?._id}?tab=events`)}
                                            style={{
                                                display: "flex", gap: 14, padding: "14px 0", cursor: "pointer",
                                                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                                            }}
                                        >
                                            <div style={{
                                                flexShrink: 0, width: 52, textAlign: "center",
                                                background: "var(--forest)", color: "var(--ivory)",
                                                borderRadius: 12, padding: "9px 0", lineHeight: 1.05,
                                                border: "1px solid rgba(243,241,236,0.08)",
                                            }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "var(--rust)" }}>{d.weekday}</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--serif)" }}>{d.day}</div>
                                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}>{d.month}</div>
                                            </div>
                                            <div style={{ minWidth: 0, alignSelf: "center" }}>
                                                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
                                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>{ev.hostedBy?.name} · {d.time}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Quick links */}
                            <div className="card" style={{ padding: 24 }}>
                                <p style={{ fontSize: 11.5, letterSpacing: "0.22em", color: "var(--rust)", margin: "0 0 16px", fontWeight: 700 }}>JUMP TO</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <QuickLink label="My Clubs" icon="clubs" onClick={() => navigate("/my-clubs")} />
                                    <QuickLink label="My Events" icon="ticket" onClick={() => navigate("/my-events")} />
                                    <QuickLink label="Messages" icon="message" onClick={() => navigate("/messages")} />
                                    <QuickLink label="Connections" icon="connect" onClick={() => navigate("/connections")} />
                                    <QuickLink label="Explore clubs" icon="compass" onClick={() => navigate("/explore")} />
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickLink({ label, icon, onClick }) {
    return (
        <button
            onClick={onClick}
            className="quick-link"
            style={{
                display: "flex", alignItems: "center", gap: 13, width: "100%",
                background: "none", border: "none", cursor: "pointer",
                padding: "11px 12px", borderRadius: 10, fontSize: 14.5, fontWeight: 500,
                color: "var(--ink)", fontFamily: "var(--sans)", textAlign: "left",
                transition: "background 0.18s var(--ease), padding-left 0.18s var(--ease)",
            }}
        >
            <span style={{ color: "var(--rust)", display: "inline-flex" }}><Icon name={icon} size={18} /></span>
            <span style={{ flex: 1 }}>{label}</span>
            <span className="quick-link__arrow" style={{ color: "var(--muted)", transition: "transform 0.18s var(--ease)" }}>→</span>
        </button>
    );
}

function FeedItem({ item, navigate, index = 0 }) {
    const isAnn = item.kind === "ANNOUNCEMENT";
    const goClub = (e) => { e.stopPropagation(); navigate(`/clubs/${item.club?._id}`); };

    return (
        <article
            className="card card-hover"
            data-reveal="up"
            style={{ padding: 24, cursor: "pointer", "--i": index }}
            onClick={() => navigate(`/clubs/${item.club?._id}?tab=${isAnn ? "announcements" : "posts"}`)}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <img
                    src={item.club?.logo}
                    alt=""
                    onClick={goClub}
                    style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", background: "var(--cream-2)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }} onClick={goClub}>
                        {item.club?.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                        {item.author?.fullName} · {timeAgo(item.createdAt)}
                    </p>
                </div>
                <span style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "5px 11px", borderRadius: 999, flexShrink: 0,
                    background: isAnn ? "var(--rust-soft)" : "var(--cream-2)",
                    color: isAnn ? "var(--rust-dark)" : "var(--ink-soft)",
                }}>
                    {isAnn ? "Announcement" : "Post"}
                </span>
            </div>

            {/* Body */}
            {isAnn ? (
                <div style={item.isImportant ? { borderLeft: "3px solid var(--rust)", paddingLeft: 16 } : {}}>
                    <h3 style={{ margin: "0 0 6px", fontSize: 19 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                        {item.content.length > 240 ? item.content.slice(0, 240) + "…" : item.content}
                    </p>
                </div>
            ) : (
                <>
                    {item.image && (
                        <img src={item.image} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 14, marginBottom: 14 }} />
                    )}
                    {item.caption && (
                        <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                            {item.caption.length > 220 ? item.caption.slice(0, 220) + "…" : item.caption}
                        </p>
                    )}
                    <div style={{ display: "flex", gap: 20, fontSize: 13.5, color: "var(--muted)", fontWeight: 500 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="heart" size={16} /> {item.likeCount}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="chat" size={16} /> {item.commentCount}</span>
                    </div>
                </>
            )}
        </article>
    );
}

export default DashboardPage;
