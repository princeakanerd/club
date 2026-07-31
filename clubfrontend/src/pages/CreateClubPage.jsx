import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { uploadImage } from "../utils/uploadImage";

const CATEGORIES = ["TECHNICAL", "CULTURAL", "SPORTS", "LITERARY", "SOCIAL", "OTHER"];

function CreateClubPage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("TECHNICAL");
    const [contactEmail, setContactEmail] = useState("");
    const [logoName, setLogoName] = useState("");
    const [coverName, setCoverName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const logoRef = useRef(null);
    const coverRef = useRef(null);

    if (!user) {
        navigate("/login");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!logoRef.current.files[0]) {
            setError("Club logo is required.");
            return;
        }
        setLoading(true);
        try {
            const logoUrl = await uploadImage(logoRef.current.files[0], "clubs");
            const payload = { name, description, category, logoUrl };
            if (contactEmail) payload.contactEmail = contactEmail;
            if (coverRef.current.files[0]) payload.coverImageUrl = await uploadImage(coverRef.current.files[0], "covers");

            const res = await api.post("/clubs/create", payload);
            await refreshUser();
            navigate(`/clubs/${res.data.data._id}`);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to create club.");
        } finally {
            setLoading(false);
        }
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 };
    const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

    const fileField = (ref, fileName, setFileName, label, required) => (
        <div>
            <label style={labelStyle}>{label}</label>
            <label className="field" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <span style={{ background: "var(--cream-2)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Choose</span>
                <span style={{ fontSize: 14, color: fileName ? "var(--ink)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fileName || "No file selected"}
                </span>
                <input
                    type="file" accept="image/*" ref={ref} required={required}
                    onChange={(e) => setFileName(e.target.files[0]?.name || "")}
                    style={{ display: "none" }}
                />
            </label>
        </div>
    );

    return (
        <div className="shell">
            <Navbar />
            <div className="container" style={{ maxWidth: 620, padding: "48px 20px 80px" }}>
                <div className="fade-up">
                    <span className="chip chip-rust" style={{ marginBottom: 16 }}>New club</span>
                    <h1 style={{ fontSize: 40, marginBottom: 8 }}>Start something.</h1>
                    <p style={{ color: "var(--muted)", marginBottom: 32 }}>You'll automatically become the club lead.</p>
                </div>

                <div className="card fade-up" style={{ padding: 32 }}>
                    {error && (
                        <div style={{ background: "var(--rust-soft)", color: "var(--rust-dark)", padding: "10px 14px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        <div>
                            <label style={labelStyle}>Club Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="field" placeholder="e.g. Robotics Society" />
                        </div>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} maxLength={1000} className="field" style={{ resize: "vertical", fontFamily: "var(--sans)" }} placeholder="What's your club about?" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="field" style={{ cursor: "pointer" }}>
                                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cap(cat)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Contact Email (optional)</label>
                                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="field" placeholder="club@college.edu" />
                            </div>
                        </div>
                        {fileField(logoRef, logoName, setLogoName, "Logo", true)}
                        {fileField(coverRef, coverName, setCoverName, "Cover Image (optional)", false)}

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 14, fontSize: 15, marginTop: 6 }}>
                            {loading ? "Creating…" : "Create Club"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateClubPage;
