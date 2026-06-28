import { useEffect, useRef } from "react";

/* Clean, elegant interactive background (trionn-style):
   a fine dot matrix on a near-solid dark canvas where dots near the
   cursor brighten and grow, plus a soft cursor halo. Crisp, calm,
   no grain — pure <canvas>, no dependencies. */
export default function InteractiveBackground() {
    const canvasRef = useRef(null);
    const glowRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0, h = 0;
        let dots = [];

        const GAP = 34;          // spacing between dots
        const BASE_R = 1.0;      // resting dot radius
        const MAX_R = 2.6;       // radius right under the cursor
        const RADIUS = 150;      // cursor influence radius

        // Pointer state (eased)
        const pointer = { x: -9999, y: -9999 };
        const eased = { x: -9999, y: -9999 };

        const build = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            dots = [];
            const cols = Math.ceil(w / GAP) + 1;
            const rows = Math.ceil(h / GAP) + 1;
            const offX = (w - (cols - 1) * GAP) / 2;
            const offY = (h - (rows - 1) * GAP) / 2;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    dots.push({ x: offX + c * GAP, y: offY + r * GAP });
                }
            }
        };

        const onMove = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; };
        const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };

        let raf = 0;
        const draw = () => {
            // ease cursor
            eased.x += (pointer.x - eased.x) * 0.12;
            eased.y += (pointer.y - eased.y) * 0.12;

            ctx.clearRect(0, 0, w, h);
            const r2 = RADIUS * RADIUS;
            for (let i = 0; i < dots.length; i++) {
                const d = dots[i];
                const dx = d.x - eased.x;
                const dy = d.y - eased.y;
                const dist2 = dx * dx + dy * dy;
                let t = 0;
                if (dist2 < r2) t = 1 - Math.sqrt(dist2) / RADIUS; // 0..1 falloff
                const radius = BASE_R + (MAX_R - BASE_R) * t;
                const alpha = 0.10 + 0.55 * t;
                ctx.beginPath();
                ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = t > 0.04
                    ? `rgba(210, 169, 72, ${alpha})`        // gold near cursor
                    : `rgba(245, 239, 233, ${alpha})`;      // faint ivory at rest
                ctx.fill();
            }

            // move the soft halo
            const glow = glowRef.current;
            if (glow && pointer.x > -9000) {
                glow.style.opacity = "1";
                glow.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0) translate(-50%, -50%)`;
            } else if (glow) {
                glow.style.opacity = "0";
            }

            raf = requestAnimationFrame(draw);
        };

        const onResize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            build();
        };

        build();
        raf = requestAnimationFrame(draw);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerleave", onLeave);
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <div className="ix-bg" aria-hidden="true">
            <canvas ref={canvasRef} className="ix-canvas" />
            <div ref={glowRef} className="ix-halo" />
        </div>
    );
}
