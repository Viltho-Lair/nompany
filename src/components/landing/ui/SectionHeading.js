"use client";
import { motion } from "motion/react";
import { fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
/** Shared section header: eyebrow → title → description, staggered in view. */
export function SectionHeading({ eyebrow, title, description, align = "left", }) {
    return (<motion.div variants={stagger(0.09)} initial="hidden" whileInView="show" viewport={VIEWPORT} className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <motion.p variants={fadeUp} className="text-xs tracking-[0.22em] text-iris-bright uppercase">
        {eyebrow}
      </motion.p>
      <motion.h2 variants={fadeUp} className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </motion.h2>
      {description && (<motion.p variants={fadeUp} className="mt-4 text-fg-muted">
          {description}
        </motion.p>)}
    </motion.div>);
}
