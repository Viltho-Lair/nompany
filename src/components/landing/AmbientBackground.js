"use client";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { usePointer } from "./providers/PointerProvider";
import { SPRING_CURSOR } from "@/components/landing/lib/motion";
/* ==================================================================
   TECHNIQUE 2 — Background & ambient motion
   Three layers, all fixed and pointer-events-none:
     1. Mesh-gradient blobs drifting on long, offset CSS loops.
     2. An isometric grid plane that shifts perspective with the cursor.
     3. A vignette + grain veil that protects text contrast.

   Everything animates transform/opacity only, so the compositor owns it
   and the main thread stays free for scroll + React work.
================================================================== */
export function AmbientBackground() {
    const reduceMotion = useReducedMotion();
    const { nx, ny } = usePointer();
    // Springs smooth the raw cursor signal into inertial motion.
    const sx = useSpring(nx, SPRING_CURSOR);
    const sy = useSpring(ny, SPRING_CURSOR);
    // Parallax: layers move by different amounts → perceived depth.
    const blobX = useTransform(sx, [-0.5, 0.5], [26, -26]);
    const blobY = useTransform(sy, [-0.5, 0.5], [20, -20]);
    const blobX2 = useTransform(sx, [-0.5, 0.5], [-40, 40]);
    const blobY2 = useTransform(sy, [-0.5, 0.5], [-28, 28]);
    // The grid plane tilts: rotateX stays near-isometric, rotateZ/translate
    // react to the cursor for a subtle "looking around the room" feel.
    const gridRotateZ = useTransform(sx, [-0.5, 0.5], [-4, 4]);
    const gridRotateX = useTransform(sy, [-0.5, 0.5], [58, 68]);
    const gridX = useTransform(sx, [-0.5, 0.5], [40, -40]);
    const still = Boolean(reduceMotion);
    return (<div aria-hidden="true" className="landing-ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {/* ---------- Layer 1: mesh gradient blobs ---------- */}
      <motion.div className="absolute inset-0" style={still ? undefined : { x: blobX, y: blobY }}>
        <div className={`absolute -top-[18vh] left-[6vw] h-[62vh] w-[62vh] rounded-full blur-[110px] gpu ${still ? "" : "animate-blob-a"}`} style={{
            background: "radial-gradient(circle at 40% 40%, color-mix(in oklab, var(--color-iris) 78%, transparent), transparent 68%)",
            opacity: 0.5,
        }}/>
        <div className={`absolute top-[38vh] -right-[10vw] h-[70vh] w-[70vh] rounded-full blur-[130px] gpu ${still ? "" : "animate-blob-b"}`} style={{
            background: "radial-gradient(circle at 55% 45%, color-mix(in oklab, var(--color-violet) 62%, transparent), transparent 70%)",
            opacity: 0.38,
        }}/>
      </motion.div>

      <motion.div className="absolute inset-0" style={still ? undefined : { x: blobX2, y: blobY2 }}>
        <div className={`absolute top-[64vh] left-[24vw] h-[52vh] w-[52vh] rounded-full blur-[120px] gpu ${still ? "" : "animate-blob-c"}`} style={{
            background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-cyan) 55%, transparent), transparent 68%)",
            opacity: 0.26,
        }}/>
      </motion.div>

      {/* ---------- Layer 2: isometric grid ---------- */}
      <div className="absolute inset-x-0 bottom-0 h-[75vh]" style={{ perspective: "820px", perspectiveOrigin: "50% 0%" }}>
        <motion.div className="absolute inset-x-[-40%] bottom-[-30%] top-0 origin-bottom" style={{
            transformStyle: "preserve-3d",
            rotateX: still ? 62 : gridRotateX,
            rotateZ: still ? 0 : gridRotateZ,
            x: still ? 0 : gridX,
            // Fade the grid out towards the horizon so it never fights text.
            maskImage: "radial-gradient(70% 60% at 50% 100%, #000 10%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(70% 60% at 50% 100%, #000 10%, transparent 78%)",
        }}>
          {/* Inner element pans by exactly one tile → seamless infinite loop */}
          <div className={`absolute inset-[-80px] gpu ${still ? "" : "animate-grid-pan"}`} style={{
            backgroundImage: "linear-gradient(to right, color-mix(in oklab, var(--color-iris-bright) 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-iris-bright) 22%, transparent) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
        }}/>
        </motion.div>
      </div>

      {/* ---------- Layer 3: readability veil ---------- */}
      <div className="absolute inset-0" style={{
            background: "radial-gradient(120% 90% at 50% 0%, transparent 35%, color-mix(in oklab, var(--color-ink) 78%, transparent) 100%)",
        }}/>
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{
            // Inline SVG grain: no network request, no image decode cost.
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}/>
    </div>);
}
