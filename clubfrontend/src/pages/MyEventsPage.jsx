import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";

function MyEventsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        api.get("/events/my-upcoming")
            .then(res => setEvents(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "long", year: "numeric",
    });
    const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
    });

    const upcoming = events.filter(e => new Date(e.eventDate) >= new Date());
    const past = events.filter(e => new Date(e.eventDate) < new Date());

    return (
        <div className="shell">
            <Navbar />
            <div className="container" style={{ padding: "0 20px 80px" }}>
                <PageHeader
                    kicker="Your schedule"
                    title="My"
                    accent="Events"
                    subtitle="Everything you've RSVP'd to, all in one place."
                />

                {loading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
                    </div>
                )}

                {!loading && events.length === 0 && (
                    <div className="card" style={{ padding: 64, textAlign: "center" }}>
                        <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 18 }}>No events yet — RSVP to some!</p>
                        <button className="btn btn-rust" onClick={() => navigate("/explore")}>Browse Clubs</button>
                    </div>
                )}

                {!loading && upcoming.length > 0 && (
                    <>
                        <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--ink)" }}>Coming up</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                            {upcoming.map((event, i) => <EventRow key={event._id} event={event} fmtDate={fmtDate} fmtTime={fmtTime} navigate={navigate} upcoming index={i} />)}
                        </div>
                    </>
                )}

                {!loading && past.length > 0 && (
                    <>
                        <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--muted)" }}>Past</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {past.map((event, i) => <EventRow key={event._id} event={event} fmtDate={fmtDate} fmtTime={fmtTime} navigate={navigate} index={i} />)}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function EventRow({ event, fmtDate, fmtTime, navigate, upcoming, index = 0 }) {
    return (
        <div
            className="card card-hover"
            data-reveal="up"
            onClick={() => navigate(`/clubs/${event.hostedBy?._id || event.hostedBy}`)}
            style={{ display: "flex", overflow: "hidden", cursor: "pointer", "--i": index, filter: upcoming ? "none" : "grayscale(0.4)" }}
        >
            {event.bannerImage && (
                <img src={event.bannerImage} alt="" style={{ width: 140, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ padding: "18px 22px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, margin: 0 }}>{event.title}</h3>
                    {upcoming && <span className="chip chip-rust" style={{ fontSize: 11 }}>Attending</span>}
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--rust)", fontWeight: 600 }}>
                    {fmtDate(event.eventDate)} · {fmtTime(event.eventDate)}
                </p>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="location" size={14} /> {event.venue}</p>
                {event.hostedBy?.name && (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                        {event.hostedBy.name}
                    </p>
                )}
            </div>
        </div>
    );
}

export default MyEventsPage;
