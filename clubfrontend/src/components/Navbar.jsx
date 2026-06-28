import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import api from "../api/axios";

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [unread, setUnread] = useState(0);

    // Poll unread count every 30s while logged in
    useEffect(() => {
        if (!user) { setUnread(0); return; }
        const fetch = () => {
            api.get("/notifications")
                .then(r => setUnread(r.data.data.filter(n => !n.isRead).length))
                .catch(() => {});
        };
        fetch();
        const id = setInterval(fetch, 30000);
        return () => clearInterval(id);
    }, [user]);

    // Reset badge when user opens notifications
    useEffect(() => {
        if (pathname === "/notifications") setUnread(0);
    }, [pathname]);

    const navLink = (label, to, badge) => {
        const active = pathname === to;
        return (
            <button
                onClick={() => navigate(to)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--ink)" : "var(--muted)",
                    fontFamily: "var(--sans)",
                    padding: "6px 2px",
                    position: "relative",
                    transition: "color 0.2s var(--ease)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = active ? "var(--ink)" : "var(--muted)")}
            >
                {label}
                {badge > 0 && (
                    <span style={{
                        background: "var(--rust)",
                        color: "var(--forest-deep)",
                        fontSize: 10,
                        fontWeight: 800,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 4px",
                        lineHeight: 1,
                    }}>
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </button>
        );
    };

    return (
        <nav className="nav">
            <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
                <span className="brand" onClick={() => navigate("/")}>
                    Clubhouse<span className="brand-dot">.</span>
                </span>
                {user && (
                    <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                        {navLink("Home", "/")}
                        {navLink("Explore", "/explore")}
                        {navLink("My Clubs", "/my-clubs")}
                        {navLink("My Events", "/my-events")}
                        {navLink("Connections", "/connections")}
                        {navLink("Messages", "/messages")}
                        {navLink("Notifications", "/notifications", unread)}
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                {user ? (
                    <>
                        <GlobalSearch navigate={navigate} />
                        <button className="btn btn-rust" onClick={() => navigate("/create-club")}>
                            Create Club
                        </button>
                        <div
                            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                            onClick={() => navigate("/profile")}
                            title="View profile"
                        >
                            <img src={user.avatar} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                                {user.fullName?.split(" ")[0]}
                            </span>
                        </div>
                        <button className="btn btn-ghost" onClick={() => { logout(); navigate("/login"); }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-ghost" onClick={() => navigate("/login")}>Login</button>
                        <button className="btn btn-primary" onClick={() => navigate("/register")}>Join now</button>
                    </>
                )}
            </div>
        </nav>
    );
}

/* ── Global search dropdown ── */
function GlobalSearch({ navigate }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [results, setResults] = useState({ clubs: [], users: [], events: [] });
    const [loading, setLoading] = useState(false);
    const boxRef = useRef(null);
    const debounceRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // Debounced search
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (q.trim().length < 2) {
            setResults({ clubs: [], users: [], events: [] });
            setLoading(false);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(() => {
            api.get(`/feed/search?q=${encodeURIComponent(q.trim())}`)
                .then((r) => setResults(r.data.data))
                .catch(() => {})
                .finally(() => setLoading(false));
        }, 280);
        return () => clearTimeout(debounceRef.current);
    }, [q]);

    const go = (path) => {
        setOpen(false);
        setQ("");
        navigate(path);
    };

    const total = results.clubs.length + results.users.length + results.events.length;
    const cap = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : "";

    return (
        <div ref={boxRef} style={{ position: "relative" }}>
            <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search clubs, people…"
                className="field"
                style={{ width: 200, padding: "8px 14px", fontSize: 13.5 }}
            />
            {open && q.trim().length >= 2 && (
                <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 340, maxHeight: 440, overflowY: "auto",
                    background: "var(--card)", border: "1px solid var(--line)",
                    borderRadius: 14, boxShadow: "0 12px 40px rgba(28,38,32,0.18)",
                    padding: 8, zIndex: 1000,
                }}>
                    {loading && <p style={{ padding: 14, fontSize: 13, color: "var(--muted)", margin: 0 }}>Searching…</p>}
                    {!loading && total === 0 && (
                        <p style={{ padding: 14, fontSize: 13, color: "var(--muted)", margin: 0 }}>No results for "{q}"</p>
                    )}

                    {results.clubs.length > 0 && (
                        <Section label="Clubs">
                            {results.clubs.map((c) => (
                                <Row key={c._id} onClick={() => go(`/clubs/${c._id}`)}
                                    img={c.logo} imgRadius={9}
                                    title={c.name} sub={cap(c.category)} />
                            ))}
                        </Section>
                    )}
                    {results.users.length > 0 && (
                        <Section label="People">
                            {results.users.map((u) => (
                                <Row key={u._id} onClick={() => go(`/users/${u.username}`)}
                                    img={u.avatar} imgRadius="50%"
                                    title={u.fullName} sub={`@${u.username} · Batch ${u.batchYear}`} />
                            ))}
                        </Section>
                    )}
                    {results.events.length > 0 && (
                        <Section label="Events">
                            {results.events.map((ev) => (
                                <Row key={ev._id} onClick={() => go(`/clubs/${ev.hostedBy?._id}?tab=events`)}
                                    img={ev.bannerImage} imgRadius={9}
                                    title={ev.title}
                                    sub={`${ev.hostedBy?.name} · ${new Date(ev.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`} />
                            ))}
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div style={{ marginBottom: 4 }}>
            <p style={{ margin: "6px 10px", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: "var(--muted)", textTransform: "uppercase" }}>{label}</p>
            {children}
        </div>
    );
}

function Row({ img, imgRadius, title, sub, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%",
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 10px", borderRadius: 9, textAlign: "left",
                fontFamily: "var(--sans)", transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
            <img src={img} alt="" style={{ width: 34, height: 34, borderRadius: imgRadius, objectFit: "cover", flexShrink: 0, background: "var(--cream-2)" }} />
            <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
            </div>
        </button>
    );
}

export default Navbar;
