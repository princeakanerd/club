import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import PageHeader from "../components/PageHeader";
import { getCoverImage, getLogoImage } from "../utils/clubImages";

function MyClubsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        api.get("/clubs/my-clubs")
            .then((res) => setClubs(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

    const roleStyle = (role) => {
        if (role === "LEAD") return { background: "var(--rust)", color: "var(--forest-deep)" };
        if (role === "EXECUTIVE") return { background: "var(--forest)", color: "var(--ivory)" };
        return { background: "var(--cream-2)", color: "var(--ink-soft)" };
    };

    return (
        <div className="shell">
            <Navbar />
            <div className="container" style={{ padding: "0 20px 80px" }}>
                <PageHeader
                    kicker="Your space"
                    title="My"
                    accent="Clubs"
                    subtitle="Communities you lead and the ones you've joined."
                />

                {loading && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 24 }}>
                        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
                    </div>
                )}

                {!loading && clubs.length === 0 && (
                    <div className="card" style={{ padding: 64, textAlign: "center" }}>
                        <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 18 }}>You haven't joined any clubs yet.</p>
                        <button className="btn btn-rust" onClick={() => navigate("/explore")}>Browse Clubs</button>
                    </div>
                )}

                {!loading && clubs.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 24 }}>
                        {clubs.map((membership, idx) => {
                            const club = membership.club;
                            const role = membership.role || "MEMBER";
                            if (!club) return null;
                            return (
                                <article
                                    key={club._id}
                                    onClick={() => navigate(`/clubs/${club._id}`)}
                                    className="card card-hover"
                                    data-reveal="up"
                                    style={{ overflow: "hidden", cursor: "pointer", "--i": idx }}
                                >
                                    <div style={{ height: 100, overflow: "hidden", background: "var(--cream-2)" }}>
                                        <img src={getCoverImage(club)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ padding: "0 20px 20px" }}>
                                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -28, marginBottom: 12 }}>
                                            <img src={getLogoImage(club)} alt={club.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", border: "3px solid var(--card)", background: "var(--card)", boxShadow: "var(--shadow-sm)" }} />
                                            <span style={{ ...roleStyle(role), fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.02em" }}>
                                                {role === "LEAD" ? "Lead" : role === "EXECUTIVE" ? "Executive" : "Member"}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: 19, marginBottom: 8 }}>{club.name}</h3>
                                        <span className="chip" style={{ fontSize: 11, padding: "3px 9px" }}>{cap(club.category)}</span>
                                        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 12, marginBottom: 0, lineHeight: 1.55 }}>
                                            {club.description?.length > 80 ? club.description.slice(0, 80) + "…" : club.description}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyClubsPage;
