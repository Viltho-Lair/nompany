"use client";
import { motion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";

/* Shared section header: eyebrow → title → description.

   IT NO LONGER STARTS INVISIBLE. This used the shared `fadeUp` variant behind
   `whileInView`, so every heading on the marketing site shipped as
   `style="opacity:0"` in the server-rendered HTML and became readable only
   once JavaScript ran AND an intersection observer fired. Google renders
   JavaScript; ChatGPT, Claude and Perplexity's crawlers do not — they were
   served headings that were not there. On the pricing page it was the page
   title itself.

   The movement is kept and the disappearing is dropped: these variants
   translate on the y axis only, from a fully opaque resting state, so the text
   is present and legible in the first byte and the animation is decoration
   over something that already reads.

   `as` EXISTS BECAUSE A PAGE HAS ONE H1. This was hardcoded to `h2`, which was
   right while it only ever introduced a section of the landing page and wrong
   the moment it introduced a page of its own — the pricing route rendered with
   no h1 at all. */

const rise = {
  hidden: { y: 14 },
  show: { y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

export function SectionHeading({ eyebrow, title, description, align = "left", as = "h2" }) {
  const Title = motion[as];
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35, margin: "0px 0px -10% 0px" }}
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <motion.p variants={rise} className="text-xs tracking-[0.22em] text-iris-bright uppercase">
        {eyebrow}
      </motion.p>
      <Title
        variants={rise}
        className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </Title>
      {description && (
        <motion.p variants={rise} className="mt-4 text-fg-muted">
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
