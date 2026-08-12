"use client";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { SPRING_CURSOR } from "@/components/landing/lib/motion";
export function MagneticButton({ children, onClick, href, variant = "primary", strength = 14, className = "", type = "button", ariaLabel, }) {
    const reduceMotion = useReducedMotion();
    const ref = useRef(null);
    const rect = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, SPRING_CURSOR);
    const sy = useSpring(y, SPRING_CURSOR);
    // Stiffer spring for the label → it arrives first, shell trails behind.
    const labelX = useSpring(x, { ...SPRING_CURSOR, stiffness: 220 });
    const handleEnter = () => {
        // Measure once per hover, not once per frame.
        rect.current = ref.current?.getBoundingClientRect() ?? null;
    };
    const handleMove = (e) => {
        if (reduceMotion || !rect.current)
            return;
        const r = rect.current;
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        x.set(Math.max(-1, Math.min(1, dx)) * strength);
        y.set(Math.max(-1, Math.min(1, dy)) * strength * 0.6);
    };
    const handleLeave = () => {
        x.set(0);
        y.set(0);
    };
    const isPrimary = variant === "primary";
    // Shared between the button and anchor forms — identical motion + styling.
    const shellProps = {
        "aria-label": ariaLabel,
        onClick,
        onPointerEnter: handleEnter,
        onPointerMove: handleMove,
        onPointerLeave: handleLeave,
        style: { x: sx, y: sy },
        whileTap: { scale: 0.96 },
        transition: { duration: 0.2 },
        className: `group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium tracking-tight will-change-transform outline-none focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${isPrimary
            ? "bg-gradient-to-r from-iris to-violet text-white"
            : "surface text-fg hover:border-iris/50"} ${className}`,
    };
    const inner = (<>
      {/* Glow halo — scales/fades in on hover, sits behind the label */}
      {isPrimary && (<span aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-80" style={{
                background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-iris) 85%, transparent), transparent)",
            }}/>)}

      {/* Specular sweep on hover */}
      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"/>

      {/* Label leans a touch further than the shell */}
      <motion.span className="relative z-10 flex items-center gap-2.5" style={{ x: labelX }}>
        {children}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-1">
          <path d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.span>
    </>);
    if (href) {
        return (<motion.a ref={ref} href={href} {...shellProps}>
        {inner}
      </motion.a>);
    }
    return (<motion.button ref={ref} type={type} {...shellProps}>
      {inner}
    </motion.button>);
}
