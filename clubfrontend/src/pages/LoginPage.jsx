import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/users/login", { email, password });
            login(res.data.data.user);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout quote="The best part of campus isn't the lectures — it's the people you build with after.">
            <span className="chip chip-rust" style={{ marginBottom: 18 }}>Welcome back</span>
            <h1 style={{ fontSize: 40, marginBottom: 8 }}>Sign in</h1>
            <p style={{ color: "var(--muted)", marginBottom: 28 }}>Pick up right where you left off.</p>

            {error && (
                <div style={{ background: "var(--rust-soft)", color: "var(--rust-dark)", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="field" placeholder="you@college.edu" />
                </div>
                <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="field" placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "13px", fontSize: 15, marginTop: 6 }}>
                    {loading ? "Signing in…" : "Sign in"}
                </button>
            </form>

            <p style={{ marginTop: 24, fontSize: 14, color: "var(--muted)" }}>
                New here? <Link to="/register" style={{ fontWeight: 600 }}>Create an account</Link>
            </p>
        </AuthLayout>
    );
}

export default LoginPage;
