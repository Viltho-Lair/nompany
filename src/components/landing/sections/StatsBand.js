"use client";
import { motion } from "motion/react";
import { fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { CountUp } from "@/components/motion/CountUp";
const STATS = [
    { value: 3.2, suffix: "M", decimals: 1, label: "transactions processed / day" },
    { value: 41, suffix: "%", label: "faster month-end close" },
    { value: 99.99, suffix: "%", decimals: 2, label: "platform uptime" },
    { value: 120, suffix: "+", label: "countries supported" },
];
/** Numbers roll up when the band scrolls into view. */
export function StatsBand() {
    return (<section className="relative mx-auto max-w-7xl px-6 py-12">
      <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={VIEWPORT} className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (<motion.div key={stat.label} variants={fadeUp} className="bg-ink-soft/80 px-6 py-8 backdrop-blur-sm">
            <p className="font-display text-3xl font-semibold tracking-tight text-gradient">
              <CountUp to={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} onView/>
            </p>
            <p className="mt-2 text-sm text-fg-muted">{stat.label}</p>
          </motion.div>))}
      </motion.div>
    </section>);
}
