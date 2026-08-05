"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import LogoEmblem from "@/components/experience/LogoEmblem";
import ReviewForm from "@/components/experience/ReviewForm";

const SLOTS = 6;
const PERIOD = 60000; // ms for a full orbit
const CYCLE_MS = 7000; // swap the visible batch (when > SLOTS reviews)

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className="h-3 w-3" fill={n <= rating ? "#f5a623" : "none"} stroke="#f5a623" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="rounded-2xl border border-steel-400/20 bg-white/85 p-4 shadow-[0_18px_40px_-30px_rgba(3,31,93,0.5)] backdrop-blur-sm dark:border-white/10 dark:bg-[#263965]/85">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-700 text-brand-950 dark:text-white">{review.name}</p>
          {review.position && <p className="truncate text-xs text-steel-500 dark:text-slate-400">{review.position}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-600 text-brand-700 dark:text-brand-400">
          {review.rating}/5 <Stars rating={review.rating} />
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-steel-700 dark:text-slate-300">{review.comment}</p>
    </div>
  );
}

// One orbiting slot: positioned on the circle via a shared rotation value; the
// card itself stays upright (translation only). Content crossfades when the
// visible batch cycles.
function OrbitCard({ rotation, baseAngle, radius, review }) {
  const rad = (a) => (a * Math.PI) / 180;
  // Round to 2dp so the server-rendered string and the client's first paint
  // match exactly (avoids a Framer Motion SSR hydration mismatch).
  const round = (v) => Math.round(v * 100) / 100;
  const x = useTransform(rotation, (r) => round(Math.sin(rad(baseAngle + r)) * radius));
  const y = useTransform(rotation, (r) => round(-Math.cos(rad(baseAngle + r)) * radius));
  return (
    <div className="absolute left-1/2 top-1/2">
      <motion.div style={{ x, y }}>
        <div className="w-52 -translate-x-1/2 -translate-y-1/2 sm:w-56">
          <AnimatePresence mode="wait">
            <motion.div
              key={review?.id || "empty"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              {review ? <ReviewCard review={review} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

const ClientsFeedback = forwardRef(function ClientsFeedback({ locale, dict, reviews = [] }, ref) {
  const reduce = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  // Works whether or not a parent passes a ref: fall back to a local ref so the
  // in-view animation (emblem fade-in + orbit) still fires on its own.
  const localRef = useRef(null);
  const sectionRef = ref || localRef;
  const started = useInView(sectionRef, { once: true, amount: 0.35 });

  const rotation = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (!started || reduce || isMobile) return;
    rotation.set((rotation.get() + (delta / PERIOD) * 360) % 360);
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const total = reviews.length;

  // Desktop: cycle which batch of up to SLOTS reviews is shown.
  useEffect(() => {
    if (!started || isMobile || total <= SLOTS) return;
    const id = setInterval(() => setBatch((b) => b + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, [started, isMobile, total]);

  // Mobile: fade through reviews one at a time.
  useEffect(() => {
    if (!started || !isMobile || total <= 1) return;
    const id = setInterval(() => setMobileIdx((i) => (i + 1) % total), 5000);
    return () => clearInterval(id);
  }, [started, isMobile, total]);

  const radius = 250;
  const visibleCount = Math.min(SLOTS, total);
  const slots = Array.from({ length: visibleCount }, (_, i) => reviews[(batch * SLOTS + i) % total]);

  const writeBtn = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 font-display text-sm font-600 text-white shadow-lg transition-colors hover:bg-brand-950"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
      </svg>
      {dict.feedback.writeReview}
    </button>
  );

  return (
    <section ref={sectionRef} id="x-feedback" className="relative flex min-h-screen flex-col overflow-hidden px-6 py-24 lg:min-h-[120vh]">
      <div className="container-page relative flex flex-1 flex-col">
        <div className="max-w-2xl">
          <span className="eyebrow">{dict.home.clientsTitle}</span>
          <h2 className="mt-3 font-display text-3xl font-700 text-brand-950 dark:text-white sm:text-5xl">{dict.home.feedbackTitle}</h2>
        </div>

        {/* Stage: centred emblem with reviews around it */}
        <div className="relative flex flex-1 items-center justify-center py-10">
          {/* centred emblem (hands off from the travelling scroll logo) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={started ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-40 w-40 md:h-52 md:w-52"
          >
            <LogoEmblem className="drop-shadow-[0_0_30px_rgba(1,89,174,0.35)]" />
          </motion.div>

          {/* Desktop orbit */}
          {!isMobile && !reduce && total > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
                {slots.map((review, i) => (
                  <div key={i} className="pointer-events-auto">
                    <OrbitCard rotation={rotation} baseAngle={(360 / SLOTS) * i} radius={radius} review={review} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile / reduced-motion: single fading testimonial */}
          {(isMobile || reduce) && total > 0 && (
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-sm">
              <AnimatePresence mode="wait">
                <motion.div key={reviews[mobileIdx]?.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.6 }}>
                  <ReviewCard review={reviews[mobileIdx]} />
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {total === 0 && (
            <p className="absolute inset-x-0 bottom-6 text-center text-sm text-steel-500 dark:text-slate-400">{dict.feedback.empty}</p>
          )}
        </div>

        {/* Write-a-review button — mobile: full spacing under the testimonial;
            desktop: absolute in the bottom inner corner (right EN / left AR). */}
        <div className="mt-10 flex justify-center lg:absolute lg:bottom-4 lg:end-0 lg:mt-0 lg:justify-end">{writeBtn}</div>
      </div>

      <ReviewForm open={open} onClose={() => setOpen(false)} dict={dict} />
    </section>
  );
});

export default ClientsFeedback;
