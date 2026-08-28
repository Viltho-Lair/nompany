"use client";
import { motion, useReducedMotion, useSpring, useTransform, } from "motion/react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { EASE_OUT_EXPO, SPRING_SOFT } from "@/components/landing/lib/motion";
import { usePointer } from "../providers/PointerProvider";
import { CountUp } from "@/components/motion/CountUp";
/* ==================================================================
   TECHNIQUE 4 — Hero animation
   An abstract Nompany dashboard that assembles itself: chrome drops in,
   the rail slides from the left, cards float up in sequence, bars grow
   from their baseline and the trend line draws itself. Afterwards the
   whole panel tilts with the cursor and two satellite cards keep a slow
   float loop, so the composition never feels frozen.

   Every child animates opacity/transform only. The panel is a single
   composited layer (`transform-3d` + translateZ), so the tilt costs one
   matrix update per frame.
================================================================== */
const panel = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const dropIn = {
    hidden: { opacity: 0, y: -18 },
    show: { opacity: 1, y: 0, transition: SPRING_SOFT },
};
const slideFromLeft = {
    hidden: { opacity: 0, x: -28 },
    show: { opacity: 1, x: 0, transition: SPRING_SOFT },
};
const floatUp = {
    hidden: { opacity: 0, y: 26, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
};
const BARS = [38, 56, 44, 72, 60, 88, 66, 96];
const RAIL = [0, 1, 2, 3, 4, 5];
// `id` is the React key, not the label — the label changes with the reader's
// language and the tiles would otherwise remount on a switch.
const kpisFor = (tr) => [
    { id: "revenue", label: tr.dashRevenue, value: 4.82, prefix: "$", suffix: "M", decimals: 2, tone: "text-fg" },
    { id: "orders", label: tr.dashOrders, value: 12480, decimals: 0, tone: "text-cyan" },
    { id: "margin", label: tr.dashMargin, value: 38.4, suffix: "%", decimals: 1, tone: "text-mint" },
];
export function DashboardAssembly() {
  const tr = landingDict(useLandingLocale());
    const reduceMotion = useReducedMotion();
    const { nx, ny } = usePointer();
    // Cursor tilt — springs give it weight instead of a 1:1 twitch.
    const rotateY = useSpring(useTransform(nx, [-0.5, 0.5], [-7, 7]), {
        stiffness: 90,
        damping: 18,
    });
    const rotateX = useSpring(useTransform(ny, [-0.5, 0.5], [5, -5]), {
        stiffness: 90,
        damping: 18,
    });
    return (<motion.div className="relative w-full [perspective:1400px]" variants={panel} initial="hidden" animate="show">
      <motion.div className="relative gpu" style={reduceMotion
            ? undefined
            : { rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {/* Glow bed beneath the panel */}
        <div aria-hidden className="absolute -inset-8 -z-10 rounded-[2.5rem] opacity-70 blur-3xl" style={{
            background: "radial-gradient(60% 55% at 50% 45%, color-mix(in oklab, var(--color-iris) 45%, transparent), transparent 72%)",
        }}/>

        <div className="surface relative overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
          {/* ---------- window chrome ---------- */}
          <motion.div variants={dropIn} className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70"/>
            <span className="h-2.5 w-2.5 rounded-full bg-gold/70"/>
            <span className="h-2.5 w-2.5 rounded-full bg-mint/70"/>
            <div className="ml-3 h-6 flex-1 rounded-md border border-line-soft bg-ink/60"/>
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-iris to-cyan"/>
          </motion.div>

          <div className="flex">
            {/* ---------- sidebar rail ---------- */}
            <motion.div variants={slideFromLeft} className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-line py-4 md:w-14">
              {RAIL.map((i) => (<motion.div key={i} className={`h-7 w-7 rounded-lg ${i === 1
                ? "bg-gradient-to-br from-iris to-violet"
                : "bg-line-soft"}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.05, ...SPRING_SOFT }}/>))}
            </motion.div>

            {/* ---------- content ---------- */}
            <div className="min-w-0 flex-1 space-y-3 p-3 md:space-y-4 md:p-4">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-2.5 md:gap-3">
                {kpisFor(tr).map((kpi, i) => (<motion.div key={kpi.id} variants={floatUp} className="rounded-xl border border-line-soft bg-ink/50 p-2.5 md:p-3">
                    <p className="truncate text-[10px] tracking-wider text-fg-dim uppercase">
                      {kpi.label}
                    </p>
                    <p className={`font-display text-sm font-semibold md:text-lg ${kpi.tone}`}>
                      <CountUp to={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} decimals={kpi.decimals ?? 0} delay={0.7 + i * 0.1}/>
                    </p>
                  </motion.div>))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1.55fr_1fr]">
                {/* Bar chart */}
                <motion.div variants={floatUp} className="rounded-xl border border-line-soft bg-ink/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] text-fg-muted">{tr.cashFlow}</p>
                    <span className="rounded-full bg-mint/12 px-2 py-0.5 text-[10px] text-mint">
                      +18.2%
                    </span>
                  </div>
                  <div className="flex h-20 items-end gap-1.5 md:h-24">
                    {BARS.map((h, i) => (<motion.div key={i} className="flex-1 origin-bottom rounded-t-[3px] will-change-transform" style={{
                height: `${h}%`,
                background: i === BARS.length - 1
                    ? "linear-gradient(180deg, var(--color-cyan), var(--color-iris))"
                    : "linear-gradient(180deg, color-mix(in oklab, var(--color-iris) 70%, transparent), color-mix(in oklab, var(--color-iris) 18%, transparent))",
            }} initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{
                delay: 0.6 + i * 0.055,
                duration: 0.75,
                ease: EASE_OUT_EXPO,
            }}/>))}
                  </div>
                </motion.div>

                {/* Donut + trend */}
                <motion.div variants={floatUp} className="flex flex-col gap-3 rounded-xl border border-line-soft bg-ink/50 p-3">
                  <p className="text-[11px] text-fg-muted">{tr.moduleHealth}</p>
                  <div className="flex items-center gap-3">
                    <svg width="62" height="62" viewBox="0 0 62 62" className="shrink-0">
                      <circle cx="31" cy="31" r="25" fill="none" stroke="var(--color-line)" strokeWidth="7"/>
                      {/* pathLength drives stroke-dashoffset under the hood */}
                      <motion.circle cx="31" cy="31" r="25" fill="none" stroke="url(#donut-grad)" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 31 31)" initial={{ pathLength: 0 }} animate={{ pathLength: 0.78 }} transition={{ duration: 1.4, delay: 0.85, ease: EASE_OUT_EXPO }}/>
                      <defs>
                        <linearGradient id="donut-grad" x1="0" y1="0" x2="62" y2="62">
                          <stop offset="0%" stopColor="var(--color-cyan)"/>
                          <stop offset="100%" stopColor="var(--color-violet)"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">
                        <CountUp to={78} suffix="%" delay={0.9}/>
                      </p>
                      <p className="text-[11px] text-fg-dim">automated</p>
                    </div>
                  </div>

                  {/* Self-drawing trend line + area */}
                  <svg viewBox="0 0 120 34" className="h-9 w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity="0.35"/>
                        <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <motion.path d="M0 26L15 22L30 27L45 15L60 19L75 9L90 13L105 5L120 8V34H0Z" fill="url(#area-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.5 }}/>
                    <motion.path d="M0 26L15 22L30 27L45 15L60 19L75 9L90 13L105 5L120 8" fill="none" stroke="var(--color-cyan)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 1, ease: EASE_OUT_EXPO }}/>
                  </svg>
                </motion.div>
              </div>

              {/* Activity rows */}
              <motion.div variants={floatUp} className="space-y-2 rounded-xl border border-line-soft bg-ink/50 p-3">
                {[
            { label: tr.po4821Approved, tone: "bg-mint" },
            { label: tr.payrollRunScheduled, tone: "bg-iris-bright" },
            { label: tr.stockReorderTriggered, tone: "bg-gold" },
        ].map((row, i) => (<motion.div key={row.label} className="flex items-center gap-2.5" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.15 + i * 0.12, duration: 0.6, ease: EASE_OUT_EXPO }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${row.tone}`}/>
                    <span className="truncate text-[11px] text-fg-muted">
                      {row.label}
                    </span>
                    <span className="ml-auto h-1.5 w-10 rounded-full bg-line-soft"/>
                  </motion.div>))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* ---------- satellite cards (float loop) ---------- */}
        <FloatingCard className="-top-5 -right-3 md:-right-8" delay={1.4} drift={-9} disabled={Boolean(reduceMotion)}>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint/15 text-mint">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 11l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-medium">{tr.forecastAccuracy}</p>
            <p className="text-[10px] text-fg-dim">
              <CountUp to={96.4} decimals={1} suffix="%" delay={1.7}/> {tr.thisQuarter}
            </p>
          </div>
        </FloatingCard>

        <FloatingCard className="-bottom-6 -left-2 md:-left-10" delay={1.65} drift={8} disabled={Boolean(reduceMotion)}>
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-iris/20 text-iris-bright">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5l5.5 3v7L8 14.5 2.5 11.5v-7L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-medium">3 modules synced</p>
            <p className="text-[10px] text-fg-dim">{tr.financeHrSupply}</p>
          </div>
        </FloatingCard>
      </motion.div>
    </motion.div>);
}
/** Small satellite card: pops in, then breathes on an infinite y loop. */
function FloatingCard({ children, className = "", delay = 0, drift = 8, disabled = false, }) {
    return (<motion.div className={`surface absolute z-10 flex items-center gap-2.5 rounded-xl px-3 py-2.5 shadow-xl shadow-black/40 ${className}`} initial={{ opacity: 0, scale: 0.85, y: 14 }} animate={disabled
            ? { opacity: 1, scale: 1, y: 0 }
            : {
                opacity: 1,
                scale: 1,
                y: [0, drift, 0],
            }} transition={disabled
            ? { duration: 0.4 }
            : {
                opacity: { duration: 0.5, delay },
                scale: { ...SPRING_SOFT, delay },
                y: {
                    duration: 6,
                    delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                },
            }} style={{ translateZ: 40 }}>
      {children}
    </motion.div>);
}
