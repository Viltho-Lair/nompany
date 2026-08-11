"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A calendar date picker (no typing): the field shows dd/mm/yyyy and opens a
// month/year calendar to click a date. Stores + emits ISO (yyyy-mm-dd). The
// popover is portalled to <body> and prefers opening ABOVE the field so it's
// never clipped by a scrollable modal.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function fmt(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const POP_H = 336; // approx popover height for placement

export default function DatePicker({ value, onChange, max, placeholder = "Select date", inputCls = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const today = new Date();
  const seed = value ? new Date(`${value}T00:00:00`) : today;
  const [viewY, setViewY] = useState(seed.getFullYear());
  const [viewM, setViewM] = useState(seed.getMonth());

  // Re-seed the view when opening, so it lands on the current value's month.
  useEffect(() => {
    if (!open) return;
    const d = value ? new Date(`${value}T00:00:00`) : today;
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 288);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const above = r.top > POP_H + 16; // enough room above?
    const top = above ? r.top - POP_H - 8 : Math.min(r.bottom + 8, window.innerHeight - POP_H - 8);
    setPos({ left, top: Math.max(8, top), width });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    const onDoc = (e) => { if (!btnRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxDate = max ? new Date(`${max}T00:00:00`) : null;
  const years = [];
  for (let y = today.getFullYear(); y >= 1920; y--) years.push(y);
  const nDays = daysInMonth(viewY, viewM);
  const firstDow = new Date(viewY, viewM, 1).getDay();

  const pick = (d) => {
    const iso = `${viewY}-${String(viewM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };

  const selMatch = (d) => value === `${viewY}-${String(viewM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} className={`flex items-center justify-between text-start ${inputCls}`}>
        <span className={fmt(value) ? "" : "text-steel-400"}>{fmt(value) || placeholder}</span>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-steel-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width }}
          className="z-[120] rounded-2xl border border-steel-200 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-steel-800"
        >
          <div className="mb-2 flex gap-2">
            <select value={viewM} onChange={(e) => setViewM(Number(e.target.value))} className="flex-1 rounded-lg border border-steel-200 bg-white px-2 py-1.5 text-sm text-brand-950 outline-none dark:border-white/15 dark:bg-steel-900 dark:text-white">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={viewY} onChange={(e) => setViewY(Number(e.target.value))} className="w-24 rounded-lg border border-steel-200 bg-white px-2 py-1.5 text-sm text-brand-950 outline-none dark:border-white/15 dark:bg-steel-900 dark:text-white">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[0.65rem] font-700 uppercase text-steel-400">
            {DOW.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: nDays }).map((_, i) => {
              const d = i + 1;
              const disabled = maxDate && new Date(viewY, viewM, d) > maxDate;
              const selected = selMatch(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  className={`flex h-8 items-center justify-center rounded-lg text-sm transition-colors ${
                    selected ? "bg-brand-600 font-700 text-white" : "text-brand-950 hover:bg-steel-100 dark:text-white dark:hover:bg-white/10"
                  } ${disabled ? "cursor-not-allowed opacity-30 hover:bg-transparent" : ""}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
