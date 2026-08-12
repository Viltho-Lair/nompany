"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT_EXPO, fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { MagneticButton } from "../ui/MagneticButton";
export function CtaBand({ onNavigate }) {
    // The primary action follows where the visitor actually is: a stranger is
    // asked to start, someone signed in without a studio is asked to create one,
    // and someone who already has one is simply let back into it.
    const [session, setSession] = useState(null); // null = still unknown
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const me = await fetch("/api/identity/me", { cache: "no-store" });
                if (!me.ok) { if (alive) setSession({ signedIn: false }); return; }
                const st = await fetch("/api/studios", { cache: "no-store" });
                const studios = st.ok ? await st.json() : { owned: null };
                if (alive) setSession({ signedIn: true, studio: studios.owned || null });
            } catch {
                if (alive) setSession({ signedIn: false }); // resolve to guest, never hang
            }
        })();
        return () => { alive = false; };
    }, []);

    const cta = !session
        ? { label: "Start free now", href: "/en/signup" }              // unknown yet: safe default
        : !session.signedIn
            ? { label: "Start free now", href: "/en/signup" }
            : session.studio
                ? { label: "Go to Studio", href: `/${session.studio.slug}` }
                : { label: "Create your studio", href: "/en/account" };

    return (<section className="relative mx-auto max-w-7xl px-6 pt-8 pb-28">
      <motion.div variants={stagger(0.09)} initial="hidden" whileInView="show" viewport={VIEWPORT} className="surface relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16">
        {/* Slowly rotating conic sheen behind the copy */}
        <motion.div aria-hidden className="pointer-events-none absolute -inset-1/2 opacity-25 gpu" style={{
            background: "conic-gradient(from 0deg, transparent, var(--color-iris) 20%, transparent 40%, var(--color-cyan) 65%, transparent 85%)",
        }} animate={{ rotate: 360 }} transition={{ duration: 42, repeat: Infinity, ease: "linear" }}/>
        <div aria-hidden className="pointer-events-none absolute inset-[1px] rounded-3xl bg-ink/85 backdrop-blur-2xl"/>

        <div className="relative">
          <motion.h2 variants={fadeUp} className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Replace nine systems with one operating layer
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-fg-muted">
            Most teams are live in under six weeks. Bring your data, keep your
            processes, retire the spreadsheets.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton onClick={() => { window.location.assign(cta.href); }}>
              {cta.label}
            </MagneticButton>
            <MagneticButton variant="ghost" strength={8} onClick={() => onNavigate("pricing")}>
              See pricing
            </MagneticButton>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-6 text-xs text-fg-dim">
            Average implementation: 38 days · Dedicated migration engineer
          </motion.p>
        </div>
      </motion.div>
    </section>);
}
/** Small shared divider used between long sections. */
export function GradientRule() {
    return (<motion.div initial={{ scaleX: 0, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE_OUT_EXPO }} className="mx-auto h-px max-w-7xl origin-center" style={{
            background: "linear-gradient(90deg, transparent, var(--color-line), transparent)",
        }}/>);
}
