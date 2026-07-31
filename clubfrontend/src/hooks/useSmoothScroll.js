import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger);

/* Buttery smooth scrolling (Lenis) synced with GSAP ScrollTrigger so all
   scrubbed/pinned animations track the eased scroll position. Scrolls to
   top on route change. Disabled for reduced-motion users. */
let lenis = null;

export default function useSmoothScroll() {
    const { pathname } = useLocation();

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        lenis = new Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.6,
        });

        // Drive Lenis from GSAP's ticker and keep ScrollTrigger in sync
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(raf);
            lenis.destroy();
            lenis = null;
        };
    }, []);

    // Jump to top instantly on navigation
    useEffect(() => {
        if (lenis) lenis.scrollTo(0, { immediate: true });
        else window.scrollTo(0, 0);
    }, [pathname]);
}
