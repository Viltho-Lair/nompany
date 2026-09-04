"use client";
import Image from "next/image";
import { motion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
/**
 * The company logo — the nompany hexagon mark (`public/brand/logo-icon.png`).
 * `animated` reveals it with a scale/fade instead of showing it instantly; a
 * raster mark can't be stroke-drawn the way an SVG path can, so the preloader
 * gets a settle rather than a draw-on.
 */
export function LogoMark({ size = 32, animated = false, priority = false, }) {
    const mark = (<Image src="/brand/logo-icon.png" alt="" width={size} height={size} priority={priority} className="h-full w-full object-contain"/>);
    if (!animated) {
        return (<span aria-hidden="true" className="block shrink-0" style={{ width: size, height: size }}>
        {mark}
      </span>);
    }
    return (<motion.span aria-hidden="true" className="relative block shrink-0" style={{ width: size, height: size }} initial={{ opacity: 0, scale: 0.72, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: EASE_OUT_EXPO }}>
      {/* Soft halo that blooms once as the mark settles */}
      <motion.span className="pointer-events-none absolute -inset-3 -z-10 rounded-full blur-lg" style={{
            background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-gold) 55%, transparent), transparent)",
        }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 0.85, 0.35], scale: 1 }} transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay: 0.15 }}/>
      {mark}
    </motion.span>);
}
export function Wordmark({ className = "" }) {
    return (<span className={`font-display text-[1.05rem] font-semibold tracking-tight ${className}`}>
      Nompany
    </span>);
}
