/* ============================================================================
 * ANIMATED REQUEST DEMO WITH CLIENT EMAIL
 * ---------------------------------------------------------------------------
 * Archived from the landing hero on 2026-08-12. Not imported anywhere — kept
 * verbatim so the interaction can be restored or reused without rebuilding it.
 *
 * What it does: a work-email field paired with a magnetic "Request demo"
 * button. An invalid submit shakes the row (4-keyframe x wobble, fired
 * imperatively via useAnimate so the field keeps focus and caret). A valid
 * submit draws a green tick, then swaps the whole row for a confirmation that
 * scales in behind two expanding rings.
 *
 * Depends on: motion/react, ./FloatingField, ./MagneticButton and the motion
 * tokens in @/components/landing/lib/motion.
 * ========================================================================= */

"use client";
import { useState } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { EASE_OUT_EXPO, SPRING_SNAPPY } from "@/components/landing/lib/motion";
import { FloatingField } from "./FloatingField";
import { MagneticButton } from "./MagneticButton";
/* ==================================================================
   TECHNIQUE 5c — Microinteraction: email capture
   Invalid submit → the row shakes (a 4-keyframe x wobble).
   Valid submit  → the field ticks green, then the whole row is
   replaced by a confirmation that scales in with expanding rings.
================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function EmailCapture({ compact = false }) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState();
    const [submitted, setSubmitted] = useState(false);
    // `useAnimate` fires the shake imperatively — no remount, so the field
    // keeps focus and its caret position while it wobbles.
    const [scope, animate] = useAnimate();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email)) {
            setStatus("error");
            setError("Enter a valid work email so we can reach you.");
            animate(scope.current, { x: [0, -9, 7, -4, 0] }, { duration: 0.42, ease: "easeInOut" });
            return;
        }
        setStatus("valid");
        setError(undefined);
        // Let the tick finish drawing before the row swaps out.
        window.setTimeout(() => setSubmitted(true), 620);
    };
    return (<div className={compact ? "w-full" : "w-full max-w-lg"}>
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (<motion.div key="done" initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={SPRING_SNAPPY} className="surface flex items-center gap-3.5 rounded-xl px-4 py-4">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center">
              {/* Two rings expanding outward = "received" feedback */}
              {[0, 1].map((i) => (<motion.span key={i} className="absolute inset-0 rounded-full border border-mint/60" initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.9, opacity: 0 }} transition={{
                    duration: 1.2,
                    delay: i * 0.28,
                    ease: EASE_OUT_EXPO,
                }}/>))}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-mint/15">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <motion.path d="M5 10.4l3 3L15 6.6" stroke="var(--color-mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}/>
                </svg>
              </span>
            </span>
            <div className="text-sm">
              <p className="font-medium">You&rsquo;re on the list.</p>
              <p className="text-fg-muted">
                A solutions engineer will reach out within one business day.
              </p>
            </div>
          </motion.div>) : (<motion.form key="form" ref={scope} onSubmit={handleSubmit} noValidate initial={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <FloatingField label="Work email" type="email" autoComplete="email" value={email} status={status} error={error} onChange={(v) => {
                setEmail(v);
                if (status !== "idle") {
                    setStatus("idle");
                    setError(undefined);
                }
            }}/>
            <MagneticButton type="submit" className="shrink-0 sm:mt-0.5">
              Request demo
            </MagneticButton>
          </motion.form>)}
      </AnimatePresence>
    </div>);
}
