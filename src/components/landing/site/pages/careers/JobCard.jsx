"use client";
import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Forward } from "../../Chrome";
import { CELL_IN, useInViewReveal } from "../../primitives";

/**
 * ONE OPENING, as a card: the home page's Bento cell (a light follows the
 * cursor and lights the edge) made into a link. The openings arrive out of
 * focus in a short cascade, capped so a long list does not keep the last
 * card waiting.
 *
 * `children` is the card's content, rendered by the SERVER page — the title,
 * the tags and the sanitised description are in the HTML a job board's
 * crawler reads, whatever this component does after hydration.
 */
export function JobCard({ href, index, cta, children }) {
  const reveal = useInViewReveal(Math.min(index, 5) * 0.06, CELL_IN, 0.2);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(440px circle at ${mx}px ${my}px, rgba(139,124,255,0.12), transparent 60%)`;
  const edge = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(214,208,255,0.55), transparent 70%)`;

  function move(e) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }
  function leave() {
    mx.set(-600);
    my.set(-600);
  }

  return (
    <motion.li {...reveal} onPointerMove={move} onPointerLeave={leave}>
      <Link
        href={href}
        className="group relative isolate flex flex-col gap-7 overflow-hidden rounded-3xl bg-white/[0.025] p-6 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-200 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] md:flex-row md:items-center md:justify-between md:gap-10 md:p-9"
      >
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: glow }} />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl p-px"
          style={{
            background: edge,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
        <div className="min-w-0 max-w-[60ch]">{children}</div>
        <span className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-white/[0.05] px-4 text-[14px] font-medium text-[#ececf1] ring-1 ring-inset ring-white/10 transition-colors duration-200 group-hover:bg-[#ececf1] group-hover:text-[#0b0b10] md:self-center">
          {cta}
          <Forward size={15} />
        </span>
      </Link>
    </motion.li>
  );
}
