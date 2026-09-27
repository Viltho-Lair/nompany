"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { ChevronsLeftRight } from "lucide-react";
import { SCREEN_H, SCREEN_W, screenSrc } from "@/components/landing/showcase/ScreenShot";
import { tourCopy } from "@/shared/marketing/tour";
import { useSite } from "./locale";
import { useInViewReveal } from "./primitives";

const SCREEN = "pipeline";

/**
 * ARABIC AND ENGLISH, ONE SCREEN — drag across to compare.
 *
 * The same captured screen in both languages, stacked, with the Arabic one
 * revealed from the divider: the claim made visible, sidebar and all, rather
 * than English text swapped for Arabic in an English layout.
 *
 * A REAL SLIDER, NOT A PICTURE OF ONE. The handle is `role="slider"`, takes the
 * arrow keys, Home and End, and reports its value, so it works without a
 * pointer. The first time it is seen it sweeps once on its own to show that it
 * moves; the first touch stops that for good.
 */
export function LanguageCompare() {
  const { locale } = useSite();
  const tr = tourCopy(locale);
  const [pos, setPos] = useState(50);
  const box = useRef(null);
  const dragging = useRef(false);
  const touched = useRef(false);
  const reduce = useReducedMotion();
  const seen = useInView(box, { once: true, amount: 0.6 });
  const head = useInViewReveal(0);
  const frame = useInViewReveal(0.1);

  useEffect(() => {
    if (!seen || reduce || touched.current) return undefined;
    const controls = animate(50, [50, 22, 78, 50], {
      duration: 2.6,
      delay: 0.35,
      ease: [0.65, 0, 0.35, 1],
      times: [0, 0.32, 0.72, 1],
      onUpdate: (v) => {
        if (!touched.current) setPos(v);
      },
    });
    return () => controls.stop();
  }, [seen, reduce]);

  const moveTo = useCallback((clientX) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <section className="relative px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1280px]">
        <motion.div {...head}>
          <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">{tr.languageTitle}</h2>
          <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.languageLead}</p>
        </motion.div>

        {/* LEFT TO RIGHT WHATEVER THE PAGE'S LANGUAGE: English on the left of
            the divider and Arabic on the right in both, so it reads the same
            way for everybody. */}
        <motion.div
          {...frame}
          dir="ltr"
          className="relative mt-12 overflow-hidden rounded-3xl bg-white/[0.035] p-2 ring-1 ring-inset ring-white/10 shadow-[0_50px_120px_-30px_rgba(24,16,80,0.85)]"
        >
          <div
            ref={box}
            className="relative cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl"
            onPointerDown={(e) => {
              touched.current = true;
              dragging.current = true;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              moveTo(e.clientX);
            }}
            onPointerMove={(e) => {
              if (dragging.current) moveTo(e.clientX);
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
            role="img"
            aria-label={`${tr.languageTitle}: ${tr.english} / ${tr.arabic}`}
          >
            <Image src={screenSrc(SCREEN, "en", "dark")} alt="" width={SCREEN_W} height={SCREEN_H} sizes="(min-width: 1280px) 1240px, 100vw" className="block h-auto w-full" />
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
              <Image src={screenSrc(SCREEN, "ar", "dark")} alt="" width={SCREEN_W} height={SCREEN_H} sizes="(min-width: 1280px) 1240px, 100vw" className="block h-auto w-full" />
            </div>

            <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-[#0b0b11]/80 px-3 py-1 text-[12px] text-white backdrop-blur-md">{tr.english}</span>
            <span lang="ar" className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-[#0b0b11]/80 px-3 py-1 text-[12px] text-white backdrop-blur-md">
              {tr.arabic}
            </span>

            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-[#c9c2ff] shadow-[0_0_16px_2px_rgba(139,124,255,0.6)]" style={{ left: `${pos}%` }} />
            <button
              type="button"
              role="slider"
              aria-label={tr.languageHandle}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              onKeyDown={(e) => {
                touched.current = true;
                const step = e.shiftKey ? 10 : 4;
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setPos((p) => Math.max(0, p - step));
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setPos((p) => Math.min(100, p + step));
                }
                if (e.key === "Home") {
                  e.preventDefault();
                  setPos(0);
                }
                if (e.key === "End") {
                  e.preventDefault();
                  setPos(100);
                }
              }}
              className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ececf1] text-[#0b0b10] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] ring-4 ring-[#8b7cff]/40 focus-visible:outline-none focus-visible:ring-[#8b7cff]"
              style={{ left: `${pos}%` }}
            >
              <ChevronsLeftRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
        <p className="mt-4 text-center text-[12px] text-white/35">{tr.sampleNote}</p>
      </div>
    </section>
  );
}
