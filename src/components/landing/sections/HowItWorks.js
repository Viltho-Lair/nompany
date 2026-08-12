"use client";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
import { SectionHeading } from "../ui/SectionHeading";
const STEPS = [
    {
        id: "capture",
        label: "01 — Capture",
        title: "Every transaction lands in one ledger",
        body: "Point-of-sale, purchase orders, payroll and bank feeds stream into a single normalised event log the moment they happen. No nightly batch, no reconciliation spreadsheets.",
        bullets: ["Real-time ingestion", "180+ connectors", "Immutable audit trail"],
        color: "var(--color-iris-bright)",
        x: 73,
        y: 154,
        icon: "M4 12h5l2-5 3 10 2-5h4",
    },
    {
        id: "unify",
        label: "02 — Unify",
        title: "One data model across every department",
        body: "Finance, HR, inventory and manufacturing read and write the same records. When procurement receives a shipment, the balance sheet already knows.",
        bullets: ["Shared entity graph", "Cross-module integrity", "Zero double entry"],
        color: "var(--color-cyan)",
        x: 327,
        y: 154,
        icon: "M6 6h5v5H6zM13 13h5v5h-5zM11 8.5h2M8.5 11v2",
    },
    {
        id: "automate",
        label: "03 — Automate",
        title: "Workflows that run themselves",
        body: "Rules and agents watch the event stream: approvals route by policy, stock reorders fire at threshold, anomalies escalate before they become write-offs.",
        bullets: ["Policy-based approvals", "Agentic exception handling", "SLA timers"],
        color: "var(--color-violet)",
        x: 303,
        y: 287,
        icon: "M12 4v4m0 8v4m8-8h-4M8 12H4m11.5-3.5l-2.5 2.5m-2 2l-2.5 2.5m0-7l2.5 2.5m2 2l2.5 2.5",
    },
    {
        id: "decide",
        label: "04 — Decide",
        title: "Forecasts your board can act on",
        body: "Live dashboards and scenario models sit on top of the same ledger, so the number the CFO quotes is the number the warehouse just produced.",
        bullets: ["Rolling forecasts", "Scenario modelling", "Board-ready exports"],
        color: "var(--color-mint)",
        x: 97,
        y: 287,
        icon: "M5 17V9m5 8V5m5 12v-6m4 6V8",
    },
];
const CENTER = { x: 200, y: 200 };
export function HowItWorks() {
    const reduceMotion = useReducedMotion();
    const wrapperRef = useRef(null);
    const [active, setActive] = useState(0);
    // Progress 0→1 across the entire multi-screen wrapper.
    const { scrollYProgress } = useScroll({
        target: wrapperRef,
        offset: ["start start", "end end"],
    });
    const smooth = useSpring(scrollYProgress, {
        stiffness: 90,
        damping: 24,
        restDelta: 0.001,
    });
    const orbitRotate = useTransform(smooth, [0, 1], [0, 90]);
    const counterRotate = useTransform(smooth, [0, 1], [0, -90]);
    const ringLength = useTransform(smooth, [0.02, 0.96], [0.02, 1]);
    const coreScale = useTransform(smooth, [0, 0.5, 1], [0.94, 1.06, 0.98]);
    // One state write per step boundary — keeps React out of the scroll loop.
    useMotionValueEvent(scrollYProgress, "change", (v) => {
        const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length + 0.15)));
        setActive((prev) => (prev === next ? prev : next));
    });
    return (<section id="how" className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeading eyebrow="How it works" title="Four moves from raw event to board decision" description="Scroll to watch the data flow through the Nompany core."/>

      <div ref={wrapperRef} className="relative mt-14">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          {/* ---------------- Pinned hub ---------------- */}
          <div className="sticky top-20 z-20 order-1 lg:order-2 lg:top-28">
            <div className="surface relative overflow-hidden rounded-3xl p-4 lg:aspect-square lg:p-8">
              <HubVisual active={active} orbitRotate={orbitRotate} counterRotate={counterRotate} ringLength={ringLength} coreScale={coreScale} reduceMotion={Boolean(reduceMotion)}/>
            </div>
          </div>

          {/* ---------------- Scrolling narrative ---------------- */}
          <div className="order-2 lg:order-1">
            {STEPS.map((step, i) => (<div key={step.id} className="flex min-h-[62vh] items-center lg:min-h-screen">
                <motion.div 
        // Inactive steps recede rather than disappear, so the
        // reader keeps their place in the sequence.
        animate={{
                opacity: active === i ? 1 : 0.32,
                filter: active === i ? "blur(0px)" : "blur(1.5px)",
                x: active === i ? 0 : -6,
            }} transition={{ duration: 0.5, ease: EASE_OUT_EXPO }} className="max-w-lg">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8" style={{ background: step.color }}/>
                    <span className="text-xs tracking-[0.2em] uppercase" style={{ color: step.color }}>
                      {step.label}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-fg-muted">{step.body}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {step.bullets.map((b) => (<li key={b} className="rounded-full border border-line bg-ink-soft/60 px-3 py-1.5 text-xs text-fg-muted">
                        {b}
                      </li>))}
                  </ul>
                </motion.div>
              </div>))}
          </div>
        </div>
      </div>
    </section>);
}
/* ------------------------------------------------------------------
   The hub. Pure SVG; all scroll-linked props arrive as MotionValues so
   this component renders only when `active` changes (4× per section).
------------------------------------------------------------------ */
function HubVisual({ active, orbitRotate, counterRotate, ringLength, coreScale, reduceMotion, }) {
    const activeStep = STEPS[active];
    return (<div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <radialGradient id="core-glow">
            <stop offset="0%" stopColor={activeStep.color} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={activeStep.color} stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-iris)"/>
            <stop offset="100%" stopColor="var(--color-cyan)"/>
          </linearGradient>
        </defs>

        {/* Halo tinted by the active module */}
        <motion.circle cx={CENTER.x} cy={CENTER.y} r="150" fill="url(#core-glow)" initial={{ opacity: 0.7 }} animate={{ opacity: [0.7, 1, 0.7] }} transition={reduceMotion
            ? { duration: 0 }
            : { duration: 5, repeat: Infinity, ease: "easeInOut" }}/>

        {/* Orbit rings — rotation is bound to scroll progress */}
        <motion.g style={{ rotate: orbitRotate, originX: "200px", originY: "200px" }}>
          <circle cx={CENTER.x} cy={CENTER.y} r="135" fill="none" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="4 8"/>
          <circle cx={CENTER.x} cy={CENTER.y} r="98" fill="none" stroke="var(--color-line)" strokeWidth="1"/>
        </motion.g>

        {/* Inner ring counter-rotates — two speeds read as machinery */}
        <motion.g style={{ rotate: counterRotate, originX: "200px", originY: "200px" }}>
          <circle cx={CENTER.x} cy={CENTER.y} r="66" fill="none" stroke="var(--color-line)" strokeWidth="1" strokeDasharray="2 10"/>
        </motion.g>

        {/* Scroll progress ring */}
        <motion.circle cx={CENTER.x} cy={CENTER.y} r="164" fill="none" stroke="url(#ring-grad)" strokeWidth="2" strokeLinecap="round" transform="rotate(-90 200 200)" style={{ pathLength: ringLength }}/>

        {/* Connectors */}
        {STEPS.map((step, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (<motion.line key={`line-${step.id}`} x1={CENTER.x} y1={CENTER.y} x2={step.x} y2={step.y} stroke={isActive || isDone ? step.color : "var(--color-line)"} strokeWidth={isActive ? 2 : 1} initial={{ opacity: 0.3 }} animate={{ opacity: isActive ? 1 : isDone ? 0.55 : 0.3 }} transition={{ duration: 0.45 }}/>);
        })}

        {/* Packet travelling out to the active node */}
        {!reduceMotion && (<motion.circle key={`packet-${active}`} r="4" fill={activeStep.color} initial={{ cx: CENTER.x, cy: CENTER.y, opacity: 0 }} animate={{
                cx: [CENTER.x, activeStep.x],
                cy: [CENTER.y, activeStep.y],
                opacity: [0, 1, 1, 0],
            }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}/>)}

        {/* Core */}
        <motion.g style={{ scale: coreScale, originX: "200px", originY: "200px" }}>
          <rect x="158" y="158" width="84" height="84" rx="26" fill="var(--color-ink-card)" stroke="var(--color-line)" strokeWidth="1.5"/>
          <motion.rect x="158" y="158" width="84" height="84" rx="26" fill="none" stroke={activeStep.color} strokeWidth="1.5" initial={{ opacity: 0.35 }} animate={{ opacity: [0.35, 0.9, 0.35] }} transition={reduceMotion
            ? { duration: 0 }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}/>
          <g transform="translate(200 200)">
            <path d="M-13 13V-13l26 26v-26" fill="none" stroke="var(--color-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </motion.g>

        {/* Module nodes */}
        {STEPS.map((step, i) => {
            const isActive = i === active;
            return (<motion.g key={step.id} initial={{ scale: 1, opacity: 0.5 }} animate={{
                    scale: isActive ? 1.14 : 1,
                    opacity: isActive ? 1 : 0.5,
                }} transition={{ duration: 0.45, ease: EASE_OUT_EXPO }} style={{ originX: `${step.x}px`, originY: `${step.y}px` }}>
              <circle cx={step.x} cy={step.y} r="30" fill="var(--color-ink-card)" stroke={isActive ? step.color : "var(--color-line)"} strokeWidth={isActive ? 2 : 1}/>
              {isActive && (<motion.circle cx={step.x} cy={step.y} r="30" fill="none" stroke={step.color} strokeWidth="1.5" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.55, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} style={{ originX: `${step.x}px`, originY: `${step.y}px` }}/>)}
              <g transform={`translate(${step.x - 12} ${step.y - 12}) scale(1)`}>
                <path d={step.icon} fill="none" stroke={isActive ? step.color : "var(--color-fg-dim)"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </motion.g>);
        })}
      </svg>

      {/* Caption below the graph, swapped with the active step */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <motion.div key={activeStep.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} className="surface rounded-full px-4 py-2 text-xs text-fg-muted">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: activeStep.color }}/>
          {activeStep.title}
        </motion.div>
      </div>
    </div>);
}
