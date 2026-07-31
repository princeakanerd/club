import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";

function RegisterPage() {
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [batchYear, setBatchYear] = useState(2024);
    const [rollNumber, setRollNumber] = useState("");
    const [avatarName, setAvatarName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const avatarRef = useRef(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("username", username);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("batchYear", batchYear);
            formData.append("rollNumber", rollNumber);
            if (avatarRef.current.files[0]) formData.append("avatar", avatarRef.current.files[0]);

            await api.post("/users/register", formData);
            navigate("/login");
        } catch (err) {
            // Prefer the specific per-field validation messages so the user
            // knows what to fix, not just a generic "Validation failed".
            const data = err.response?.data;
            const detail = Array.isArray(data?.errors) && data.errors.length
                ? data.errors.join(" • ")
                : data?.message;
            setError(detail || "Registration failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 };

    return (
        <AuthLayout quote="Every great club started with one person who showed up. Be that person.">
            <span className="chip chip-rust" style={{ marginBottom: 18 }}>Get started</span>
            <h1 style={{ fontSize: 38, marginBottom: 8 }}>Create account</h1>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>Join your campus communities in a minute.</p>

            {error && (
                <div style={{ background: "var(--rust-soft)", color: "var(--rust-dark)", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                    <label style={labelStyle}>Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="field" placeholder="Prince Gajnani" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={labelStyle}>Username</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="field" placeholder="prince" />
                    </div>
                    <div>
                        <label style={labelStyle}>Roll Number</label>
                        <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required className="field" placeholder="21CS045" />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="field" placeholder="you@college.edu" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                        <label style={labelStyle}>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="field" placeholder="••••••••" />
                    </div>
                    <div>
                        <label style={labelStyle}>Batch Year</label>
                        <input type="number" min="1990" max={new Date().getFullYear() + 6} step="1" value={batchYear} onChange={(e) => setBatchYear(e.target.value)} required className="field" placeholder="e.g. 2025" />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Avatar</label>
                    <label
                        className="field"
                        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: avatarName ? "var(--ink)" : "var(--muted)" }}
                    >
                        <span style={{ background: "var(--cream-2)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Choose file</span>
                        <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {avatarName || "No file selected"}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            ref={avatarRef}
                            required
                            onChange={(e) => setAvatarName(e.target.files[0]?.name || "")}
                            style={{ display: "none" }}
                        />
                    </label>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "13px", fontSize: 15, marginTop: 4 }}>
                    {loading ? "Creating account…" : "Create account"}
                </button>
            </form>

            <p style={{ marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
                Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
            </p>
        </AuthLayout>
    );
}

export default RegisterPage;
