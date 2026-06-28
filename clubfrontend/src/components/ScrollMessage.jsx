import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger, SplitText } from "gsap/all";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/* SPYLT-style scroll message: a big statement whose words brighten
   from muted to ivory, word-by-word, as you scroll through it (scrubbed),
   with a gold highlight phrase that clip-path wipes in. */
export default function ScrollMessage({ lead, highlight, tail, sub }) {
    const root = useRef(null);

    useGSAP(() => {
        const leadSplit = new SplitText(".sm-lead", { type: "words" });
        const tailSplit = new SplitText(".sm-tail", { type: "words" });

        gsap.set([".sm-lead .word", ".sm-tail .word"], { color: "var(--muted)" });

        gsap.to(".sm-lead .word", {
            color: "var(--ivory)",
            ease: "none",
            stagger: 0.3,
            scrollTrigger: { trigger: root.current, start: "top 70%", end: "top 20%", scrub: true },
        });
        gsap.to(".sm-tail .word", {
            color: "var(--ivory)",
            ease: "none",
            stagger: 0.3,
            scrollTrigger: { trigger: ".sm-tail", start: "top 75%", end: "bottom 55%", scrub: true },
        });

        // Gold highlight clip-path wipe
        gsap.to(".sm-highlight", {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            ease: "circ.inOut",
            duration: 1,
            scrollTrigger: { trigger: ".sm-highlight", start: "top 70%" },
        });

        // Sub paragraph words rise up
        if (sub) {
            const subSplit = new SplitText(".sm-sub", { type: "words" });
            gsap.from(subSplit.words, {
                yPercent: 160,
                opacity: 0,
                ease: "power2.out",
                duration: 0.9,
                stagger: 0.015,
                scrollTrigger: { trigger: ".sm-sub", start: "top 85%" },
            });
        }

        return () => { leadSplit.revert(); tailSplit.revert(); };
    }, { scope: root });

    return (
        <section ref={root} className="scroll-msg">
            <div className="scroll-msg__wrap">
                <h2 className="sm-line">
                    <span className="sm-lead">{lead}</span>{" "}
                    <span className="sm-highlight"><em>{highlight}</em></span>{" "}
                    <span className="sm-tail">{tail}</span>
                </h2>
                {sub && (
                    <div className="sm-sub-wrap">
                        <p className="sm-sub">{sub}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
