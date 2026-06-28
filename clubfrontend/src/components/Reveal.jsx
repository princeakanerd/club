import { useEffect, useRef, useState } from "react";

/* Scroll-reveal wrapper (trionn-style). Elements fade + rise into view
   as they enter the viewport, with optional stagger delay. Uses a single
   IntersectionObserver, reveals once, and respects reduced-motion. */
export default function Reveal({
    children,
    as: Tag = "div",
    delay = 0,
    y = 28,
    duration = 0.85,
    once = true,
    className = "",
    style = {},
    ...rest
}) {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) { setShown(true); return; }

        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    if (once) io.disconnect();
                } else if (!once) {
                    setShown(false);
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [once]);

    return (
        <Tag
            ref={ref}
            className={className}
            style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : `translateY(${y}px)`,
                transition: `opacity ${duration}s var(--ease) ${delay}s, transform ${duration}s var(--ease) ${delay}s`,
                willChange: "opacity, transform",
                ...style,
            }}
            {...rest}
        >
            {children}
        </Tag>
    );
}
