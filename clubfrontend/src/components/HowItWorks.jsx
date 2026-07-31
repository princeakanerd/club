import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
    { n: "01", title: "Discover", body: "Browse student-led clubs across every category and find the ones that move you." },
    { n: "02", title: "Join", body: "One tap to become a member. Get the group chat, the events, the inside track." },
    { n: "03", title: "Show up", body: "RSVP to events, post to the feed, and build with people who get you." },
    { n: "04", title: "Belong", body: "Lead a club, grow your circle, and make the kind of memories that last." },
];

/* Pinned scroll-scrub sequence: the section pins and each step cross-fades
   in as you scroll through it, with a progress rail. */
export default function HowItWorks() {
    const root = useRef(null);

    useGSAP(() => {
        const steps = gsap.utils.toArray(".hiw-step");
        // Only the first step starts visible; the rest are fully hidden
        // (autoAlpha also sets visibility:hidden so they can't show through).
        gsap.set(steps, { autoAlpha: 0, y: 40 });
        gsap.set(steps[0], { autoAlpha: 1, y: 0 });

        // One timeline slot per transition, each the same length. Within a
        // slot the outgoing step fully fades out *before* the incoming one
        // fades in, so two steps are never visible at the same time.
        const tl = gsap.timeline({
            defaults: { ease: "power1.inOut" },
            scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: () => `+=${steps.length * 80}%`,
                pin: true,
                pinSpacing: true,
                scrub: 0.6,
                invalidateOnRefresh: true,
                // Refresh after CategoryScroll; no anticipatePin — on a second
                // stacked pin it shifts the start and makes the seam jitter /
                // the two sections overlap when scrolling up into the previous one.
                refreshPriority: 0,
            },
        });

        steps.forEach((step, i) => {
            if (i === 0) return;
            const slot = i; // 1-based slot position
            tl.to(steps[i - 1], { autoAlpha: 0, y: -40, duration: 0.5 }, slot)
              .fromTo(step, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 }, slot + 0.5);
        });

        // progress bar tied to the same scroll
        gsap.fromTo(".hiw-progress > span", { scaleX: 0 }, {
            scaleX: 1, ease: "none", transformOrigin: "left",
            scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${steps.length * 80}%`, scrub: true },
        });
    }, { scope: root });

    return (
        <section ref={root} className="hiw-section">
            <div className="hiw-stage">
                <p className="hiw-kicker">HOW IT WORKS</p>
                <div className="hiw-steps">
                    {STEPS.map((s) => (
                        <div key={s.n} className="hiw-step">
                            <span className="hiw-num">{s.n}</span>
                            <h2 className="hiw-title">{s.title}</h2>
                            <p className="hiw-body">{s.body}</p>
                        </div>
                    ))}
                </div>
                <div className="hiw-progress"><span /></div>
            </div>
        </section>
    );
}
