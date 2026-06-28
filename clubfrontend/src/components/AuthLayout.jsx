import { useNavigate } from "react-router-dom";

function AuthLayout({ children, quote }) {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--cream)" }}>
            {/* Left — form side */}
            <div style={{ display: "flex", flexDirection: "column", padding: "clamp(28px, 5vw, 56px)" }}>
                <span className="brand" onClick={() => navigate("/")} style={{ alignSelf: "flex-start" }}>
                    Clubhouse<span className="brand-dot">.</span>
                </span>
                <div className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 400, width: "100%", margin: "0 auto" }}>
                    {children}
                </div>
            </div>

            {/* Right — editorial panel with flowing aurora */}
            <div
                className="auth-panel"
                style={{
                    padding: "clamp(36px, 5vw, 64px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    position: "relative",
                    overflow: "hidden",
                    background: "var(--forest-deep)",
                }}
            >
                {/* Clean animated background layers */}
                <div className="auth-sheen" />
                <div className="auth-dots" />

                <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", color: "rgba(244,241,234,0.45)", fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", zIndex: 2 }}>
                    Campus Communities
                </div>
                <blockquote style={{ margin: 0, position: "relative", zIndex: 2 }}>
                    <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(26px, 3vw, 40px)", lineHeight: 1.2, color: "var(--ivory)", fontStyle: "italic", margin: 0 }}>
                        {quote}
                    </p>
                </blockquote>
            </div>
        </div>
    );
}

export default AuthLayout;
