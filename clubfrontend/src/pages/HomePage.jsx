import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import InteractiveBackground from "../components/InteractiveBackground";
import ScrollMessage from "../components/ScrollMessage";
import CategoryScroll from "../components/CategoryScroll";
import HowItWorks from "../components/HowItWorks";
import { getCoverImage, getLogoImage } from "../utils/clubImages";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const CATEGORIES = ["TECHNICAL", "CULTURAL", "SPORTS", "LITERARY", "SOCIAL", "OTHER"];
const cap = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

function HomePage() {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [progress, setProgress] = useState(0);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(true);
    const navigate = useNavigate();

    const railRef = useRef(null);
    const stageRef = useRef(null);
    const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });

    /* SPYLT-style hero: char-by-char title rise + clip wipe on the accent
       word, content fade-in, then a scroll-scrubbed lift as you scroll past. */
    useGSAP(() => {
        const titleSplit = new SplitText(".hero-title", { type: "chars" });
        const tl = gsap.timeline({ delay: 0.2 });
        tl.to(".hero-content", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
            .from(titleSplit.chars, { yPercent: 160, opacity: 0, stagger: 0.018, ease: "power3.out", duration: 0.9 }, "-=0.3")
            .to(".hero-accent", { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 0.9, ease: "circ.out" }, "-=0.5")
            .from(".hero-foot, .hero-cats", { opacity: 0, y: 24, stagger: 0.12, ease: "power2.out", duration: 0.6 }, "-=0.4");

        // Scroll-scrubbed hero parallax lift
        gsap.to(".hero-block", {
            yPercent: -12,
            opacity: 0.6,
            ease: "none",
            scrollTrigger: { trigger: stageRef.current, start: "top top", end: "bottom 40%", scrub: true },
        });

        return () => titleSplit.revert();
    }, { scope: stageRef });

    /* Clip-path image wipes: card covers wipe open in sequence, and the
       whole rail fades up, once the clubs have loaded. */
    useGSAP(() => {
        if (!clubs.length) return;
        gsap.fromTo(".xcard",
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.08,
                scrollTrigger: { trigger: railRef.current, start: "top 92%", once: true },
            }
        );
        gsap.fromTo(".xcard__img",
            { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)", scale: 1.25 },
            {
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", scale: 1.08,
                duration: 1.1, ease: "circ.out", stagger: 0.08,
                scrollTrigger: { trigger: railRef.current, start: "top 92%", once: true },
            }
        );
    }, { scope: stageRef, dependencies: [clubs.length] });

    const fetchClubs = async (searchVal = search, categoryVal = category) => {
        setLoading(true);
        try {
            const params = {};
            if (searchVal) params.search = searchVal;
            if (categoryVal) params.category = categoryVal;
            const res = await api.get("/clubs", { params });
            setClubs(res.data.data);
        } catch {
            setError("Failed to load clubs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Pre-filter from ?cat= (set by the category scroll section)
        const cat = new URLSearchParams(window.location.search).get("cat");
        if (cat && CATEGORIES.includes(cat)) {
            setCategory(cat);
            fetchClubs("", cat);
            window.scrollTo({ top: 0 });
        } else {
            fetchClubs();
        }
        /* eslint-disable-next-line */
    }, []);

    /* Track scroll progress + arrow availability */
    const updateScrollState = useCallback(() => {
        const el = railRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        const p = max > 0 ? el.scrollLeft / max : 0;
        setProgress(p);
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft < max - 4);
    }, []);

    useEffect(() => {
        const el = railRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener("scroll", updateScrollState, { passive: true });
        return () => el.removeEventListener("scroll", updateScrollState);
    }, [clubs, updateScrollState]);

    /* Convert vertical wheel into horizontal scroll over the rail */
    const onWheel = (e) => {
        const el = railRef.current;
        if (!el) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
        }
    };

    /* Drag to scroll. We only switch into "dragging" mode (which disables
       card pointer events) once the pointer actually moves past a threshold,
       so a plain click always reaches the card and navigates. */
    const onPointerDown = (e) => {
        const el = railRef.current;
        if (!el) return;
        drag.current = { active: true, dragging: false, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
    };
    const onPointerMove = (e) => {
        if (!drag.current.active) return;
        const el = railRef.current;
        const dx = e.clientX - drag.current.startX;
        drag.current.moved = Math.abs(dx);
        if (!drag.current.dragging && drag.current.moved > 6) {
            drag.current.dragging = true;
            el.classList.add("dragging");
        }
        if (drag.current.dragging) el.scrollLeft = drag.current.startScroll - dx;
    };
    const endDrag = () => {
        const el = railRef.current;
        if (el) el.classList.remove("dragging");
        // keep `moved` readable for the click handler, then reset
        setTimeout(() => { drag.current.active = false; drag.current.dragging = false; }, 0);
    };

    const scrollByCards = (dir) => {
        const el = railRef.current;
        if (!el) return;
        const card = el.querySelector(".xcard");
        const amount = card ? card.offsetWidth + 32 : el.clientWidth * 0.7;
        el.scrollBy({ left: dir * amount, behavior: "smooth" });
    };

    const handleCategoryClick = (cat) => {
        const newCat = category === cat ? "" : cat;
        setCategory(newCat);
        fetchClubs(search, newCat);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchClubs();
    };

    const openClub = (id) => {
        if (drag.current.moved > 6) return; // was a drag, not a click
        navigate(`/clubs/${id}`);
    };

    /* Subtle cursor-follow tilt on each card */
    const onCardMove = (e) => {
        if (drag.current.active) return;
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translateY(-10px) perspective(1000px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
    };
    const onCardLeave = (e) => {
        e.currentTarget.style.transform = "";
    };

    return (
        <div className="shell shell--ix">
            <InteractiveBackground />
            <Navbar />

            <section ref={stageRef} className="explore-stage" style={{ minHeight: "calc(100vh - 68px)", display: "flex", flexDirection: "column" }}>
                {/* ── Marquee strip ── */}
                <div style={{ borderBottom: "1px solid rgba(243,241,236,0.1)", padding: "10px 0", overflow: "hidden", position: "relative", zIndex: 2 }}>
                    <div className="marquee">
                        {[...Array(2)].map((_, dup) => (
                            <span key={dup} style={{ display: "inline-flex", gap: 0, alignItems: "center" }}>
                                {["DISCOVER", "BELONG", "BUILD", "COMPETE", "CREATE", "LEAD", "CONNECT"].map((w) => (
                                    <span key={w} style={{ display: "inline-flex", alignItems: "center", color: "rgba(243,241,236,0.5)", fontSize: 13, fontWeight: 600, letterSpacing: "0.18em", whiteSpace: "nowrap" }}>
                                        <span style={{ padding: "0 28px" }}>{w}</span>
                                        <span style={{ color: "var(--rust)" }}>✦</span>
                                    </span>
                                ))}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Hero ── */}
                <div className="hero-block x-wrap" style={{ position: "relative", zIndex: 2, paddingTop: "clamp(36px, 6vw, 80px)" }}>
                    <div className="hero-content" style={{ opacity: 0, transform: "translateY(20px)" }}>
                        <span className="chip chip-rust" style={{ marginBottom: 28 }}>✦ Campus communities</span>

                        <h1 className="hero-title">
                            Find your <span className="hero-accent"><em>people.</em></span> Join the clubs that move you.
                        </h1>

                        <div className="hero-foot">
                            <p style={{ fontSize: 17, color: "rgba(243,241,236,0.66)", maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
                                A curated showcase of student-led communities. Scroll sideways,
                                explore the culture, and find where you belong.
                            </p>
                            {/* Big editorial search */}
                            <form onSubmit={handleSearch} style={{ width: "min(460px, 100%)", display: "flex", alignItems: "center", gap: 14 }}>
                                <input
                                    className="dsearch"
                                    placeholder="Search clubs…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <button type="submit" className="rail-arrow" style={{ flexShrink: 0 }} aria-label="search">→</button>
                            </form>
                        </div>
                    </div>

                    {/* ── Category rail ── */}
                    <div className="hero-cats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 40 }}>
                        <button onClick={() => { setCategory(""); fetchClubs(search, ""); }}
                            className={`dchip ${category === "" ? "dchip-active" : ""}`}>
                            All clubs
                        </button>
                        {CATEGORIES.map((catg) => (
                            <button key={catg} onClick={() => handleCategoryClick(catg)}
                                className={`dchip ${category === catg ? "dchip-active" : ""}`}>
                                {cap(catg)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Showcase header ── */}
                <div className="x-wrap" style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "clamp(40px, 5vw, 64px)", marginBottom: 22 }}>
                    <div>
                        <p style={{ fontSize: 12, letterSpacing: "0.2em", color: "var(--rust)", margin: "0 0 6px", fontWeight: 700 }}>
                            {(category ? cap(category) : "THE COLLECTION").toUpperCase()}
                        </p>
                        <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", margin: 0 }}>
                            {loading ? "Loading…" : `${clubs.length} ${clubs.length === 1 ? "club" : "clubs"} to explore`}
                        </h2>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button className="rail-arrow" onClick={() => scrollByCards(-1)} disabled={!canLeft} aria-label="previous">←</button>
                        <button className="rail-arrow" onClick={() => scrollByCards(1)} disabled={!canRight} aria-label="next">→</button>
                    </div>
                </div>

                {/* ── Horizontal rail ── */}
                {loading ? (
                    <div className="rail" style={{ position: "relative", zIndex: 2 }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="xcard skeleton" style={{ background: "rgba(243,241,236,0.06)" }} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="container" style={{ position: "relative", zIndex: 2, padding: "40px 0" }}>
                        <p style={{ color: "var(--rust)" }}>{error}</p>
                    </div>
                ) : clubs.length === 0 ? (
                    <div className="container" style={{ position: "relative", zIndex: 2, padding: "60px 0" }}>
                        <p style={{ color: "rgba(243,241,236,0.7)", fontSize: 18 }}>No clubs match your search.</p>
                    </div>
                ) : (
                    <>
                        <div
                            ref={railRef}
                            className="rail"
                            style={{ position: "relative", zIndex: 2 }}
                            onWheel={onWheel}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={endDrag}
                            onPointerLeave={endDrag}
                        >
                            {clubs.map((club, i) => (
                                <article
                                    key={club._id}
                                    className="xcard"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openClub(club._id)}
                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/clubs/${club._id}`); } }}
                                    onMouseMove={onCardMove}
                                    onMouseLeave={onCardLeave}
                                >
                                    <img className="xcard__img" src={getCoverImage(club)} alt="" draggable="false" />
                                    <div className="xcard__veil" />
                                    <span className="xcard__index">{String(i + 1).padStart(2, "0")} / {String(clubs.length).padStart(2, "0")}</span>
                                    <span className="xcard__cat">{cap(club.category)}</span>

                                    <div className="xcard__body">
                                        <img
                                            src={getLogoImage(club)}
                                            alt=""
                                            draggable="false"
                                            style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "2px solid rgba(243,241,236,0.4)", marginBottom: 14, boxShadow: "0 6px 18px rgba(0,0,0,0.4)" }}
                                        />
                                        <h3 className="xcard__title">{club.name}</h3>
                                        <p className="xcard__desc">
                                            {club.description?.length > 130 ? club.description.slice(0, 130) + "…" : club.description}
                                        </p>
                                        <div className="xcard__meta">
                                            <span className="xcard__members">
                                                <span style={{ fontSize: 15 }}>◍</span>
                                                {club.memberCount ?? 0} {club.memberCount === 1 ? "member" : "members"}
                                            </span>
                                            <span className="xcard__go">
                                                Enter <span className="xcard__go-arrow">→</span>
                                            </span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                            {/* trailing spacer so last card can center */}
                            <div style={{ flex: "0 0 1px" }} />
                        </div>

                        {/* Progress bar */}
                        <div className="x-wrap" style={{ position: "relative", zIndex: 2, paddingBottom: "clamp(40px, 6vw, 72px)", display: "flex", alignItems: "center", gap: 18 }}>
                            <div className="rail-progress" style={{ width: 280 }}>
                                <span style={{ width: `${Math.max(8, progress * 100)}%` }} />
                            </div>
                            <p style={{ fontSize: 11.5, color: "rgba(243,241,236,0.42)", margin: 0, letterSpacing: "0.14em", fontWeight: 600 }}>
                                DRAG · SCROLL · OR USE ARROWS
                            </p>
                        </div>
                    </>
                )}
            </section>

            {/* Scroll message */}
            <ScrollMessage
                lead="Every great campus story starts the moment you"
                highlight="show up"
                tail="and find the people who get you."
                sub="Clubs, events, late-night builds, and the friendships that outlast the lectures — it all begins with one step inside."
            />

            {/* Pinned horizontal category scroll */}
            <CategoryScroll />

            {/* Pinned how-it-works scrub */}
            <HowItWorks />
        </div>
    );
}

export default HomePage;
