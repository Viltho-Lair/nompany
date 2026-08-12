"use client";
import { useRef } from "react";
import { motion, useInView, useReducedMotion, useSpring, useTransform, } from "motion/react";
import { usePointer } from "../providers/PointerProvider";
import { useElementCenter } from "@/components/landing/lib/useElementCenter";
/* ==================================================================
   TECHNIQUE 8 — Character animation: "Nova", the Nompany assistant
   Three independent motion layers stacked on one character:
     1. Idle:   a slow float (y) + breathing (scaleY) loop.
     2. Attend: head/body lean toward the cursor.
     3. Gaze:   pupils track the cursor, clamped inside the sclera.
   Plus a blink on a repeating delay so it never feels like a decal.

   Gaze is computed from the shared pointer MotionValues against the
   element's own centre, so it stays correct as the page scrolls — and
   because it's all MotionValues, the component re-renders zero times
   while the user moves the mouse.
================================================================== */
const CLAMP = (v, min, max) => Math.min(max, Math.max(min, v));
export function AiAssistant({ size = 280 }) {
    const reduceMotion = useReducedMotion();
    const ref = useRef(null);
    // Only track while visible — off-screen mascots shouldn't cost frames.
    const inView = useInView(ref, { amount: 0.2 });
    const { x: px, y: py, active } = usePointer();
    const { cx, cy } = useElementCenter(ref, inView && !reduceMotion);
    // Normalised offset from the mascot's own centre, -1 … 1.
    const dx = useTransform([px, cx, active], ([p, c, on]) => on ? CLAMP((p - c) / 320, -1, 1) : 0);
    const dy = useTransform([py, cy, active], ([p, c, on]) => on ? CLAMP((p - c) / 260, -1, 1) : 0);
    const gazeSpring = { stiffness: 260, damping: 22, mass: 0.5 };
    const leanSpring = { stiffness: 90, damping: 18, mass: 0.8 };
    // Pupils travel furthest, the head leans a little, the body barely moves.
    const pupilX = useSpring(useTransform(dx, [-1, 1], [-6, 6]), gazeSpring);
    const pupilY = useSpring(useTransform(dy, [-1, 1], [-4.5, 4.5]), gazeSpring);
    const headX = useSpring(useTransform(dx, [-1, 1], [-7, 7]), leanSpring);
    const headRotate = useSpring(useTransform(dx, [-1, 1], [-5, 5]), leanSpring);
    const bodyX = useSpring(useTransform(dx, [-1, 1], [-3, 3]), leanSpring);
    const still = Boolean(reduceMotion);
    return (<div ref={ref} className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Ground glow */}
      <div aria-hidden className="absolute inset-x-8 bottom-6 h-10 rounded-[50%] blur-2xl" style={{
            background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-iris) 70%, transparent), transparent)",
            opacity: 0.55,
        }}/>

      {/* Layer 1 — idle float */}
      <motion.div className="relative h-full w-full gpu" animate={still ? undefined : { y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}>
        <motion.svg viewBox="0 0 240 240" className="h-full w-full overflow-visible" fill="none" role="img" aria-label="Nova, the Nompany AI assistant">
          <defs>
            <linearGradient id="nova-body" x1="60" y1="40" x2="190" y2="220">
              <stop offset="0%" stopColor="#1a2340"/>
              <stop offset="100%" stopColor="#0b1020"/>
            </linearGradient>
            <linearGradient id="nova-visor" x1="70" y1="80" x2="170" y2="140">
              <stop offset="0%" stopColor="var(--color-iris)"/>
              <stop offset="60%" stopColor="var(--color-violet)"/>
              <stop offset="100%" stopColor="var(--color-cyan)"/>
            </linearGradient>
            <radialGradient id="nova-halo">
              <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Halo pulse */}
          <motion.circle cx="120" cy="118" r="96" fill="url(#nova-halo)" 
    // Explicit `initial` for every keyframed SVG attribute: without
    // it Framer's first render writes attr="undefined" before the
    // animation resolves, which the SVG parser rejects.
    initial={{ opacity: 0.35, scale: 1 }} animate={still ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.06, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "120px", originY: "118px" }}/>

          {/* ---- Body (leans slightly) ---- */}
          <motion.g style={still ? undefined : { x: bodyX }}>
            <motion.rect x="72" y="150" width="96" height="62" rx="26" fill="url(#nova-body)" stroke="var(--color-line)" strokeWidth="1.5" 
    // Layer 1b — breathing
    initial={{ scaleY: 1 }} animate={still ? undefined : { scaleY: [1, 1.045, 1] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "120px", originY: "212px" }}/>
            {/* Chest status bars */}
            {[0, 1, 2].map((i) => (<motion.rect key={i} x={100 + i * 14} y={176} width="8" height="14" rx="4" fill="var(--color-iris-bright)" initial={{ opacity: 0.25 }} animate={still ? undefined : { opacity: [0.25, 1, 0.25] }} transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.22,
                ease: "easeInOut",
            }}/>))}
          </motion.g>

          {/* ---- Head (leans + rotates toward cursor) ---- */}
          <motion.g style={still
            ? undefined
            : { x: headX, rotate: headRotate, originX: "120px", originY: "150px" }}>
            {/* Antenna */}
            <path d="M120 62V44" stroke="var(--color-line)" strokeWidth="3" strokeLinecap="round"/>
            <motion.circle cx="120" cy="38" r="7" fill="var(--color-cyan)" initial={{ scale: 1, opacity: 0.8 }} animate={still ? undefined : { scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "120px", originY: "38px" }}/>

            {/* Skull */}
            <rect x="58" y="62" width="124" height="98" rx="34" fill="url(#nova-body)" stroke="var(--color-line)" strokeWidth="1.5"/>
            {/* Visor */}
            <rect x="72" y="82" width="96" height="58" rx="26" fill="url(#nova-visor)" opacity="0.16"/>
            <rect x="72" y="82" width="96" height="58" rx="26" fill="none" stroke="url(#nova-visor)" strokeWidth="1.4" opacity="0.7"/>

            {/* ---- Eyes ---- */}
            <g>
              {[98, 142].map((eyeX) => (<g key={eyeX}>
                  <ellipse cx={eyeX} cy="111" rx="13" ry="14" fill="#060912"/>
                  {/* Pupil: follows the cursor */}
                  <motion.g style={still ? undefined : { x: pupilX, y: pupilY }}>
                    <circle cx={eyeX} cy="111" r="7" fill="var(--color-cyan)"/>
                    <circle cx={eyeX - 2.4} cy="108.4" r="2.2" fill="#ffffff" opacity="0.9"/>
                  </motion.g>
                  {/* Eyelid: scaleY blink on a long repeatDelay */}
                  <motion.rect x={eyeX - 14} y="96" width="28" height="30" fill="url(#nova-body)" initial={{ scaleY: 0 }} animate={still ? undefined : { scaleY: [0, 1, 0] }} transition={{
                duration: 0.22,
                repeat: Infinity,
                repeatDelay: 4.2,
                ease: "easeInOut",
            }} style={{ originY: "96px", originX: `${eyeX}px` }}/>
                </g>))}
            </g>

            {/* Smile */}
            <motion.path d="M108 132q12 8 24 0" stroke="var(--color-cyan)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" initial={{ d: "M108 132q12 8 24 0" }} animate={still ? undefined : { d: ["M108 132q12 8 24 0", "M108 133q12 10 24 0", "M108 132q12 8 24 0"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}/>
          </motion.g>

          {/* Floating side particles */}
          {[
            { x: 34, y: 96, r: 4, d: 0 },
            { x: 206, y: 84, r: 3, d: 0.8 },
            { x: 198, y: 172, r: 5, d: 1.6 },
            { x: 40, y: 168, r: 3.5, d: 2.4 },
        ].map((p, i) => (<motion.circle key={i} cx={p.x} cy={p.y} r={p.r} fill="var(--color-iris-bright)" initial={{ y: 0, opacity: 0.25 }} animate={still ? undefined : { y: [0, -10, 0], opacity: [0.25, 0.85, 0.25] }} transition={{
                duration: 4 + i * 0.6,
                repeat: Infinity,
                delay: p.d,
                ease: "easeInOut",
            }}/>))}
        </motion.svg>
      </motion.div>
    </div>);
}
