import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/* Global scroll-reveal driver.
   Any element with [data-reveal] starts hidden (via CSS) and gets .is-in
   when it scrolls into view. A MutationObserver re-scans whenever new
   [data-reveal] nodes mount (async data loads, tab switches), and the
   effect re-runs on route change. Respects reduced-motion. */
export default function useScrollReveal() {
    const { pathname } = useLocation();

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const revealAll = (root = document) =>
            root.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => el.classList.add("is-in"));

        if (reduce) {
            revealAll();
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-in");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
        );

        const observeNew = () => {
            document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
        };

        // Initial scan (after a frame so route content is in the DOM)
        const raf = requestAnimationFrame(observeNew);

        // Re-scan when the DOM changes (async loads, tab switches)
        const mo = new MutationObserver(() => observeNew());
        mo.observe(document.body, { childList: true, subtree: true });

        return () => {
            cancelAnimationFrame(raf);
            io.disconnect();
            mo.disconnect();
        };
    }, [pathname]);
}
