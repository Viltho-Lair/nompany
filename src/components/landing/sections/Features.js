"use client";
import { motion } from "motion/react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { EASE_OUT_EXPO, fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { DrawIcon } from "../svg/DrawIcon";
import { MorphShape } from "../svg/MorphShape";
import { SectionHeading } from "../ui/SectionHeading";
const featuresFor = (tr) => [
    {
        title: tr.featZeroTrust,
        body: tr.featZeroTrustBody,
        color: "var(--color-iris-bright)",
        shapes: [
            { type: "path", d: "M20 5l12 5v9c0 8-5.2 13.4-12 16-6.8-2.6-12-8-12-16v-9l12-5z" },
            { type: "path", d: "M14.5 20.5l4 4 7.5-8" },
        ],
    },
    {
        title: tr.featLiveAnalytics,
        body: tr.featLiveAnalyticsBody,
        color: "var(--color-cyan)",
        shapes: [
            { type: "path", d: "M6 33h28" },
            { type: "path", d: "M11 33V21" },
            { type: "path", d: "M19 33V12" },
            { type: "path", d: "M27 33V17" },
        ],
    },
    {
        title: tr.featAutomation,
        body: tr.featAutomationBody,
        color: "var(--color-violet)",
        shapes: [
            { type: "circle", cx: 20, cy: 20, r: 6.5 },
            { type: "path", d: "M20 4v6m0 20v6M4 20h6m20 0h6M9 9l4.4 4.4m13.2 13.2L31 31M31 9l-4.4 4.4M13.4 26.6L9 31" },
        ],
    },
    {
        title: tr.featMultiEntity,
        body: tr.featMultiEntityBody,
        color: "var(--color-mint)",
        shapes: [
            { type: "circle", cx: 20, cy: 20, r: 14 },
            { type: "path", d: "M6 20h28" },
            { type: "path", d: "M20 6c4 4 6 9 6 14s-2 10-6 14c-4-4-6-9-6-14s2-10 6-14z" },
        ],
    },
    {
        title: tr.featSupplyChain,
        body: tr.featSupplyChainBody,
        color: "var(--color-gold)",
        shapes: [
            { type: "path", d: "M20 5l13 7v16l-13 7-13-7V12l13-7z" },
            { type: "path", d: "M7 12l13 7 13-7M20 19v20" },
        ],
    },
    {
        title: tr.featWorkforce,
        body: tr.featWorkforceBody,
        color: "var(--color-iris)",
        shapes: [
            { type: "circle", cx: 20, cy: 14, r: 6 },
            { type: "path", d: "M8 34c0-6.6 5.4-12 12-12s12 5.4 12 12" },
        ],
    },
];
export function Features() {
  const tr = landingDict(useLandingLocale());
    return (<section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeading eyebrow={tr.featEyebrow} title={tr.enterpriseDepthWithoutEnterprise} description={tr.sixPillarsOneDeployment}/>

      <motion.div variants={stagger(0.07)} initial="hidden" whileInView="show" viewport={VIEWPORT} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featuresFor(tr).map((feature) => (<motion.article key={feature.title} variants={fadeUp} whileHover={{ y: -6 }} transition={{ duration: 0.35, ease: EASE_OUT_EXPO }} className="group surface relative overflow-hidden rounded-2xl p-6 will-change-transform">
            {/* Hover wash tinted per feature */}
            <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{
                background: `radial-gradient(120% 80% at 20% 0%, color-mix(in oklab, ${feature.color} 14%, transparent), transparent 70%)`,
            }}/>
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{
                background: `linear-gradient(90deg, transparent, ${feature.color}, transparent)`,
            }}/>

            <div className="relative">
              {/* TECHNIQUE 7a — icon draws itself when scrolled into view */}
              <DrawIcon shapes={feature.shapes} color={feature.color} size={36}/>
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">
                {feature.body}
              </p>
            </div>
          </motion.article>))}
      </motion.div>

      {/* ---------------- Morphing showcase ---------------- */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VIEWPORT} className="surface mt-6 grid items-center gap-8 overflow-hidden rounded-2xl p-8 md:grid-cols-[auto_1fr] md:p-10">
        <div className="mx-auto">
          {/* TECHNIQUE 7b — hover to morph */}
          <MorphShape size={228}/>
        </div>
        <div className="max-w-xl">
          <p className="text-xs tracking-[0.22em] text-cyan uppercase">
            {tr.adaptiveSchema}
          </p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {tr.adaptiveTitle}
          </h3>
          <p className="mt-4 text-fg-muted">
            {tr.adaptiveBody}
          </p>
          <p className="mt-5 text-xs text-fg-dim">
            {tr.adaptiveHint}
          </p>
        </div>
      </motion.div>
    </section>);
}
