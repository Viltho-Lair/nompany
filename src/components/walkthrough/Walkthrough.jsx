"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import NovaHead from "@/components/studio2/NovaHead";
import { useFocusTrap } from "@/components/studio2/useFocusTrap";
import { walkthroughDict, resolveSteps } from "@/shared/walkthrough";

// NOVA'S WALKTHROUGH. A dimmed page with a lit window over one control at a
// time, and Nova beside it saying what it is for. Skip, Back, Next — and a
// "don't show this again" box that the caller turns into a stored preference.
//
// LOADED LAZILY by both callers (next/dynamic inside a CLIENT module, which is a
// real boundary — see HeavyScreens.jsx): it runs once per sign-in at most, so
// nobody else's first load should carry it.
//
// TARGETS ARE `[data-tour=…]` ATTRIBUTES on the real controls, never a copy of
// them. A step whose control is not on screen — a department list folded into
// the phone menu, a Nova the package does not include — is left out rather than
// pointing at nothing, and a selector matching several elements (the two
// header marks) lights the box around all of them.
//
// NO requestAnimationFrame and no transition the steps depend on: the browser
// pane never fires rAF, and a tour that only advances when a frame paints is a
// tour stuck on step one there. Plain resize/scroll listeners re-measure.

const PAD = 8;       // the lit window's margin around its control
const GAP = 14;      // between the window and Nova's card
const EDGE = 16;     // the card never comes nearer the viewport's edge than this

// Every visible element a step names, as one box. null when none is showing —
// display:none, a closed drawer, or never rendered.
function boxOf(selector) {
  if (!selector || typeof document === "undefined") return null;
  const rects = [...document.querySelectorAll(selector)]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const right = Math.max(...rects.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

const sel = (name) => `[data-tour="${name}"]`;

// WHERE NOVA'S LAUNCHER WOULD SIT, in a studio whose package does not include
// her — there is no element to measure, so the box is worked out from the
// launcher's own classes in NovaLauncher.jsx: 64px square, `bottom-4` (16px)
// or `bottom-20` (80px) under the phone's bottom bar, and `end-5` (20px) or
// `end-24` (96px) when the support chat shares the corner. Change one and
// change the other, or this step points a little beside the place it names.
function cornerBox(rtl, besideChat) {
  const size = 64;
  const bottom = document.documentElement.hasAttribute("data-bottom-bar") ? 80 : 16;
  const end = besideChat ? 96 : 20;
  const top = window.innerHeight - bottom - size;
  const left = rtl ? end : window.innerWidth - end - size;
  return { top, left, width: size, height: size };
}

// THE TWO TOURS. A step: `target` (a data-tour name, or none for a centred
// card), `copy` (its words), and `unless` — a step shown only when an EARLIER
// step's control was missing, which is how the phone gets "open the menu" in
// place of "here are your departments". `corner` marks the one step with no
// element at all: the empty place Nova's launcher would occupy.
function stepsFor(tour, t, { nova }) {
  if (tour === "account") {
    const a = t.account;
    return [
      { key: "welcome", copy: a.welcome },
      { key: "nav", target: "account-nav", copy: a.nav },
      { key: "create", target: "account-create", copy: a.create },
      { key: "join", target: "account-join", copy: a.join },
      { key: "security", target: "account-security", copy: a.security },
      { key: "prefs", target: "account-prefs", copy: a.prefs },
      { key: "menu", target: "account-avatar", copy: a.menu },
    ];
  }
  const s = t.studio;
  return [
    { key: "welcome", copy: s.welcome },
    { key: "nav", target: "studio-nav", copy: s.nav },
    { key: "menuButton", target: "studio-menu", copy: s.menuButton, unless: "nav" },
    { key: "marks", target: "studio-marks", copy: s.marks },
    { key: "bell", target: "studio-bell", copy: s.bell },
    { key: "prefs", target: "studio-prefs", copy: s.prefs },
    { key: "account", target: "studio-account", copy: s.account },
    // THE LAST WORD POINTS AT NOVA — "if you need any more help, ask me".
    // Without her in the package it points at the SAME CORNER, empty, and
    // says which packages bring her (the owner, 26/09/2026): the place is
    // worth learning before the assistant is there to fill it.
    ...(nova
      ? [{ key: "nova", target: "nova-launcher", copy: s.nova }, { key: "end", copy: s.end, unless: "nova" }]
      : [{ key: "novaPlan", corner: true, copy: s.novaPlan }]),
  ];
}

export default function Walkthrough({ tour, locale = "en", nova = false, support = false, onClose }) {
  const t = walkthroughDict(locale);
  // RESOLVED ONCE, on open. The screen under a tour does not change while it
  // runs — the dimmed page takes every click — so what is on it now is what
  // will be on it at the last step. A TICK AFTER MOUNT rather than during
  // render: a caller that switches to the screen the tour is about in the same
  // update (the account's "Start now" jumps to Overview) has not put that
  // screen in the document yet while this renders.
  const [steps, setSteps] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setSteps(resolveSteps(stepsFor(tour, t, { nova }), (name) => Boolean(boxOf(sel(name)))));
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);
  const [i, setI] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [box, setBox] = useState(null);
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  useFocusTrap(cardRef, Boolean(steps?.length));

  const step = steps?.[i];
  const last = Boolean(steps) && i === steps.length - 1;
  // The box belongs to a TARGETED step; a centred step ignores whatever the
  // previous one measured rather than clearing it.
  const lit = step?.target || step?.corner ? box : null;
  const finish = useCallback(() => onClose?.(dontShow), [onClose, dontShow]);

  // Bring the control into view, then measure it. `nearest` so a control
  // already on screen does not make the page jump.
  useEffect(() => {
    if (!step?.target && !step?.corner) return undefined;
    if (step.target) document.querySelector(sel(step.target))?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const measure = step.corner
      ? () => setBox(cornerBox(cardRef.current ? getComputedStyle(cardRef.current).direction === "rtl" : false, support))
      : () => setBox(boxOf(sel(step.target)));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step, support]);

  // Nova's card goes below the control when there is room, above when not,
  // beside it when neither (a tall sidebar), and centred when there is no
  // control at all. Measured against the card's real size, so a long Arabic
  // sentence is placed as carefully as a short English one.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const box = lit;
    if (!box) { setPos({ left: (vw - cw) / 2, top: Math.max(EDGE, (vh - ch) / 2) }); return; }
    const clampX = (x) => Math.min(Math.max(EDGE, x), vw - cw - EDGE);
    const clampY = (y) => Math.min(Math.max(EDGE, y), vh - ch - EDGE);
    const below = box.top + box.height + PAD + GAP;
    const above = box.top - PAD - GAP - ch;
    const centreX = clampX(box.left + box.width / 2 - cw / 2);
    if (below + ch <= vh - EDGE) { setPos({ left: centreX, top: below }); return; }
    if (above >= EDGE) { setPos({ left: centreX, top: above }); return; }
    const right = box.left + box.width + PAD + GAP;
    const left = box.left - PAD - GAP - cw;
    const top = clampY(box.top + box.height / 2 - ch / 2);
    if (right + cw <= vw - EDGE) { setPos({ left: right, top }); return; }
    if (left >= EDGE) { setPos({ left, top }); return; }
    setPos({ left: centreX, top: clampY(vh - ch - EDGE) });
  }, [lit, i, dontShow, steps]);

  useEffect(() => { nextRef.current?.focus(); }, [i, steps]);

  // Escape skips — a tour is always one key from gone. The arrows step,
  // mirrored in Arabic so "forward" is the way the page reads.
  useEffect(() => {
    const onKey = (e) => {
      // The CARD's direction, not the document's: the studio declares `dir` on
      // its shell rather than on <html>, so the first [dir] in the page is the
      // root layout's and says ltr in an Arabic studio.
      const rtl = cardRef.current ? getComputedStyle(cardRef.current).direction === "rtl" : false;
      if (e.key === "Escape") { e.preventDefault(); finish(); return; }
      const fwd = rtl ? "ArrowLeft" : "ArrowRight";
      const bwd = rtl ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd) { e.preventDefault(); if (last) finish(); else setI((n) => n + 1); }
      if (e.key === bwd) { e.preventDefault(); setI((n) => Math.max(0, n - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, last]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[100] print:hidden">
      {/* The page stays visible and takes no clicks: a tour that let somebody
          wander off mid-sentence would leave its window lit over a screen that
          has changed underneath it. */}
      <div className="absolute inset-0" aria-hidden="true" onClick={(e) => e.stopPropagation()} />
      {lit ? (
        <div
          aria-hidden="true"
          // The empty corner is DASHED and round, the launcher's own shape:
          // a place, not a control, so it must not look like one to click.
          className={`pointer-events-none absolute transition-all duration-200 motion-reduce:transition-none ${
            step.corner ? "rounded-full border-2 border-dashed border-cyan-300" : "rounded-2xl ring-2 ring-cyan-300/80"}`}
          style={{
            top: lit.top - PAD, left: lit.left - PAD, width: lit.width + PAD * 2, height: lit.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/55" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
        className="absolute w-[22rem] max-w-[calc(100vw-2rem)] rounded-geex bg-white p-5 text-slate-700 shadow-geex ring-1 ring-slate-200/70 dark:bg-[#20202c] dark:text-slate-300 dark:ring-white/10"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-md">
            <NovaHead className="h-9 w-9" idle label={t.nova} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-700 text-slate-900 dark:text-white">{t.nova}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.guide}</p>
          </div>
          <span className="shrink-0 text-[11px] font-600 tabular-nums text-slate-400 dark:text-slate-500">{t.stepOf(i + 1, steps.length)}</span>
          <button type="button" onClick={finish} aria-label={t.close}
            className="-me-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <h2 id={titleId} className="mt-4 font-display text-base font-700 text-slate-900 dark:text-white">{step.copy.title}</h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.copy.body}</p>

        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((s, n) => (
            <span key={s.key} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-brand-600 dark:bg-brand-400" : "w-1.5 bg-slate-200 dark:bg-white/15"}`} />
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/50 dark:border-white/20 dark:bg-white/5" />
          {t.dontShow}
        </label>

        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={finish}
              className="rounded-lg px-2.5 py-1.5 text-sm font-500 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200">
              {t.skip}
            </button>
          )}
          <div className="ms-auto flex items-center gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI((n) => n - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-500 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">
                {t.back}
              </button>
            )}
            <button ref={nextRef} type="button" onClick={() => (last ? finish() : setI((n) => n + 1))}
              className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-600 text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
              {last ? t.done : t.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
