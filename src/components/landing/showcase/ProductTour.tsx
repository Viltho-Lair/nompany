"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { tourCopy } from "@/shared/marketing/tour";
import { ScreenShot } from "./ScreenShot";
import { SectionHead } from "../sections/SectionHead";

/* ==================================================================
   THE PRODUCT TOUR — the owner's three departments, each shown by its own
   real screens (26/09/2026: Sales & pipeline, Projects & Gantt, Inventory &
   procurement; the rest live on /platform).

   IT PLAYS BY ITSELF UNTIL SOMEBODY TAKES OVER. A step lasts STEP_MS, then
   the next, then the next department. Hovering, focusing or clicking stops
   it for good — a tour that moves on while someone is reading is the thing
   people hate about carousels — and the pause button says it is paused.
   It only runs while the section is on screen, and never under reduced
   motion, where the steps are simply buttons.

   THE WORDS ARE IN THE HTML. The titles and bodies of every step render on
   the server at full opacity; only the picture cross-fades. A crawler, a
   screen reader and a visitor with JavaScript off all get the whole tour.
================================================================== */

const STEP_MS = 6500;

type Tab = { key: "sales" | "projects" | "supply"; screens: [name: string, path: string][] };
const TABS: Tab[] = [
  { key: "sales", screens: [["pipeline", "/crm-sales-pipeline"], ["clients", "/crm-sales-clients"], ["quotations", "/quotations-register"]] },
  { key: "projects", screens: [["gantt", "/projects-list/…/plans/…"], ["projects", "/projects-list"], ["project-costs", "/projects-list/…/costs"]] },
  { key: "supply", screens: [["stock", "/inventory-stock"], ["requisitions", "/procurement-requisitions"], ["orders", "/procurement-orders"]] },
];

export function ProductTour({ locale }: { locale: string }) {
  const tr = tourCopy(locale);
  const reduce = useReducedMotion();
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = playing && inView && !reduce;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      const last = TABS[tab].screens.length - 1;
      if (step < last) setStep(step + 1);
      else { setStep(0); setTab((tab + 1) % TABS.length); }
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [running, tab, step]);

  const stop = () => setPlaying(false);
  const current = TABS[tab].screens[step];
  const [name, path] = current;

  return (
    <section ref={ref} id="tour" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28" onPointerEnter={stop} onFocusCapture={stop}>
      <SectionHead label={tr.tourEyebrow} title={tr.tourTitle} lead={tr.tourLead} />

      {/* FOLDER DIVIDERS, not pills: the three departments are three tabs of
          one file, and the open one sits on the ruled line below it. */}
      <div className="mt-12 flex items-end gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label={tr.tourTitle}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={i === tab}
            onClick={() => { stop(); setTab(i); setStep(0); }}
            className={`relative -mb-px shrink-0 px-4 py-2.5 text-sm transition-colors duration-200 ${i === tab ? "font-medium text-fg" : "text-fg-muted hover:text-fg"}`}
          >
            {/* THE OPEN FOLDER TAB SLIDES to whichever is chosen — one shared
                element that moves, rather than three that switch on and off. */}
            {i === tab && (
              <motion.span
                layoutId="tour-tab"
                aria-hidden="true"
                className="absolute inset-0 rounded-t-lg border border-line border-b-ink-card bg-ink-card"
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.18, visualDuration: 0.42 }}
              />
            )}
            <span className="relative">{tr.tabs[t.key]}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="ms-auto hidden shrink-0 px-3 py-2.5 text-xs text-fg-dim hover:text-fg sm:inline-flex"
          aria-pressed={!playing}
        >
          {playing && !reduce ? tr.pause : tr.play}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] lg:items-start">
        <ol className="isolate border-t border-line" role="tabpanel">
          {TABS[tab].screens.map(([key], i) => {
            const s = tr.screens[key];
            const active = i === step;
            return (
              <li key={key} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => { stop(); setStep(i); }}
                  aria-current={active ? "step" : undefined}
                  className={`relative grid w-full grid-cols-[1.75rem_minmax(0,1fr)] px-2 py-4 text-start transition-colors ${active ? "" : "hover:bg-ink-soft"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="tour-step"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 bg-ink-card"
                      transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0.12, visualDuration: 0.4 }}
                    />
                  )}
                  <span className={`lh-ref pt-0.5 text-[11px] ${active ? "text-iris" : "text-fg-dim"}`} dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className={`block font-medium ${active ? "text-fg" : "text-fg-muted"}`}>{s.title}</span>
                    <span className={`mt-1 block text-sm leading-relaxed ${active ? "text-fg-muted" : "text-fg-dim"}`}>{s.body}</span>
                  </span>
                  {/* How long until the next screen — only while the tour plays. */}
                  {active && running && (
                    <motion.span
                      key={`${tab}-${step}`}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-iris rtl:origin-right"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div data-reveal="scale" style={{ "--d": "150ms" } as React.CSSProperties} className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={name}
              initial={reduce ? false : { opacity: 0.001, y: 18, scale: 0.975, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.99, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <ScreenShot name={name} locale={locale} path={path} alt={`${tr.screens[name].title}. ${tr.screens[name].body}`} sizes="(min-width: 1024px) 700px, 100vw" />
            </motion.div>
          </AnimatePresence>
          <p className="mt-3 text-center text-[11px] text-fg-dim lg:text-start">{tr.sampleNote}</p>
        </div>
      </div>
    </section>
  );
}
