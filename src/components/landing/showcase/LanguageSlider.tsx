"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { tourCopy } from "@/shared/marketing/tour";
import { SCREEN_H, SCREEN_W, screenSrc } from "./ScreenShot";
import { SectionHead } from "../sections/SectionHead";

/* ==================================================================
   ARABIC AND ENGLISH, ONE SCREEN — drag across to compare.

   The same captured screen in both languages, stacked, with the Arabic
   one revealed from the divider. It is the product's claim made visible:
   the Arabic studio is laid out right to left throughout, sidebar and all,
   not English text swapped for Arabic in an English layout.

   A REAL SLIDER, NOT A PICTURE OF ONE. The handle is `role="slider"`,
   takes the arrow keys, Home and End, and reports its value, so it works
   without a pointer; dragging anywhere on the image moves it too.
================================================================== */

const SCREEN = "pipeline";

export function LanguageSlider({ locale }: { locale: string }) {
  const tr = tourCopy(locale);
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // ONE SWEEP, THE FIRST TIME IT IS SEEN, so nobody has to guess the picture
  // moves: across to the Arabic, back past the English, home to the middle.
  // Anybody who touches it first stops it, and reduced motion never starts it.
  const touched = useRef(false);
  const reduce = useReducedMotion();
  const seen = useInView(box, { once: true, amount: 0.6 });
  useEffect(() => {
    if (!seen || reduce || touched.current) return;
    const controls = animate(50, [50, 22, 78, 50], {
      duration: 2.6,
      delay: 0.35,
      ease: [0.65, 0, 0.35, 1],
      times: [0, 0.32, 0.72, 1],
      onUpdate: (v) => { if (!touched.current) setPos(v); },
    });
    return () => controls.stop();
  }, [seen, reduce]);

  const moveTo = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const pair = (theme: "light" | "dark", cls: string) => (
    <div className={`relative ${cls}`}>
      <Image src={screenSrc(SCREEN, "en", theme)} alt="" width={SCREEN_W} height={SCREEN_H} sizes="(min-width: 1024px) 1100px, 100vw" loading="lazy" className="block h-auto w-full" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <Image src={screenSrc(SCREEN, "ar", theme)} alt="" width={SCREEN_W} height={SCREEN_H} sizes="(min-width: 1024px) 1100px, 100vw" loading="lazy" className="block h-auto w-full" />
      </div>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <SectionHead label={tr.languageEyebrow} title={tr.languageTitle} lead={tr.languageLead} />

      {/* LEFT TO RIGHT WHATEVER THE PAGE'S LANGUAGE: English sits on the left of
          the divider and Arabic on the right in both, so the comparison reads
          the same way for everyone. */}
      <div dir="ltr" data-reveal="scale" className="lh-sheet relative mt-12 overflow-hidden">
        <div
          ref={box}
          className="relative cursor-ew-resize touch-none select-none"
          onPointerDown={(e) => { touched.current = true; dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); moveTo(e.clientX); }}
          onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
          role="img"
          aria-label={`${tr.languageTitle}: ${tr.english} / ${tr.arabic}`}
        >
          {pair("light", "dark:hidden")}
          {pair("dark", "hidden dark:block")}

          <span className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-[#0e111c]/85 px-2.5 py-1 font-display text-xs text-white">{tr.english}</span>
          <span className="pointer-events-none absolute right-4 bottom-4 rounded-md bg-[#0e111c]/85 px-2.5 py-1 font-display text-xs text-white" lang="ar">{tr.arabic}</span>

          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-iris shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" style={{ left: `${pos}%` }} aria-hidden="true" />
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
              if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => Math.max(0, p - step)); }
              if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(100, p + step)); }
              if (e.key === "Home") { e.preventDefault(); setPos(0); }
              if (e.key === "End") { e.preventDefault(); setPos(100); }
            }}
            className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-iris text-white shadow-[0_8px_20px_-8px_rgb(0_0_0/0.55)] ring-4 ring-white/40"
            style={{ left: `${pos}%` }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-fg-dim">{tr.sampleNote}</p>
    </section>
  );
}
