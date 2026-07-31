import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PANELS = [
    { key: "TECHNICAL", title: "Technical", blurb: "Hackathons, robotics, dev circles — build things that ship." },
    { key: "CULTURAL", title: "Cultural", blurb: "Dance, music, drama — the heartbeat of campus nights." },
    { key: "SPORTS", title: "Sports", blurb: "Teams, tournaments, and the thrill of game day." },
    { key: "LITERARY", title: "Literary", blurb: "Debate, poetry, journalism — words with weight." },
    { key: "SOCIAL", title: "Social", blurb: "Volunteering and causes that leave a mark." },
];

/* Pinned horizontal scroll: the section locks to the viewport while the
   panels slide sideways as you scroll down (classic GSAP technique). */
export default function CategoryScroll() {
    const root = useRef(null);
    const track = useRef(null);
    const navigate = useNavigate();

    useGSAP(() => {
        const el = track.current;
        const totalScroll = () => el.scrollWidth - window.innerWidth;

        const tween = gsap.to(el, {
            x: () => -totalScroll(),
            ease: "none",
            scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: () => `+=${totalScroll()}`,
                pin: true,
                pinSpacing: true,
                scrub: 1,
                invalidateOnRefresh: true,
                anticipatePin: 1,
                // Refresh this (earlier) pin before HowItWorks so the stacked
                // pin-spacer heights stay consistent when scrolling back up.
                refreshPriority: 1,
            },
        });

        // Parallax the panel labels slightly within the horizontal motion
        gsap.utils.toArray(".cs-panel").forEach((p) => {
            gsap.from(p.querySelector(".cs-inner"), {
                y: 60, opacity: 0, ease: "power2.out", duration: 0.8,
                scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 80%" },
            });
        });
    }, { scope: root });

    return (
        <section ref={root} className="cs-section">
            <div ref={track} className="cs-track">
                {/* Intro panel */}
                <div className="cs-panel cs-intro">
                    <div className="cs-inner">
                        <p className="cs-kicker">BY CATEGORY</p>
                        <h2 className="cs-headline">Find your <em>lane.</em></h2>
                        <p className="cs-lead">Five worlds of campus life — scroll across and pick where you belong.</p>
                    </div>
                </div>

                {PANELS.map((p, i) => (
                    <div
                        key={p.key}
                        className="cs-panel"
                        onClick={() => navigate(`/explore?cat=${p.key}`)}
                    >
                        <div className="cs-inner">
                            <span className="cs-index">{String(i + 1).padStart(2, "0")}</span>
                            <h3 className="cs-title">{p.title}</h3>
                            <p className="cs-blurb">{p.blurb}</p>
                            <span className="cs-go">Browse {p.title.toLowerCase()} clubs →</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
