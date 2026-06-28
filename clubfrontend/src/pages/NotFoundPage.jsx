import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function NotFoundPage() {
    const navigate = useNavigate();
    return (
        <div className="shell">
            <Navbar />
            <div className="container" style={{
                minHeight: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 18,
                padding: "40px 20px",
            }}>
                <p style={{
                    fontFamily: "var(--serif)",
                    fontSize: "clamp(80px, 18vw, 160px)",
                    lineHeight: 1,
                    margin: 0,
                    color: "var(--forest)",
                    fontStyle: "italic",
                }}>
                    404
                </p>
                <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: 0 }}>
                    This page wandered off.
                </h1>
                <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 440, margin: 0, lineHeight: 1.6 }}>
                    The page you're looking for doesn't exist or may have moved. Let's get you back to your clubs.
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={() => navigate("/")} style={{ padding: "12px 28px" }}>
                        Back home
                    </button>
                    <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: "12px 24px" }}>
                        Go back
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NotFoundPage;
