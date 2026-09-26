"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { tourCopy } from "@/shared/marketing/tour";
import { SCREEN_H, SCREEN_W, screenSrc } from "./ScreenShot";

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
      <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">{tr.languageEyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{tr.languageTitle}</h2>
      <p className="mt-4 max-w-2xl text-fg-muted">{tr.languageLead}</p>

      {/* LEFT TO RIGHT WHATEVER THE PAGE'S LANGUAGE: English sits on the left of
          the divider and Arabic on the right in both, so the comparison reads
          the same way for everyone. */}
      <div dir="ltr" className="surface relative mt-10 overflow-hidden rounded-2xl shadow-2xl shadow-black/30">
        <div
          ref={box}
          className="relative cursor-ew-resize touch-none select-none"
          onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); moveTo(e.clientX); }}
          onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
          role="img"
          aria-label={`${tr.languageTitle}: ${tr.english} / ${tr.arabic}`}
        >
          {pair("light", "dark:hidden")}
          {pair("dark", "hidden dark:block")}

          <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur">{tr.english}</span>
          <span className="pointer-events-none absolute right-4 bottom-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white backdrop-blur">{tr.arabic}</span>

          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" style={{ left: `${pos}%` }} aria-hidden="true" />
          <button
            type="button"
            role="slider"
            aria-label={tr.languageHandle}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 4;
              if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => Math.max(0, p - step)); }
              if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(100, p + step)); }
              if (e.key === "Home") { e.preventDefault(); setPos(0); }
              if (e.key === "End") { e.preventDefault(); setPos(100); }
            }}
            className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-4 ring-white/30 focus:outline-none focus-visible:ring-iris"
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
