"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COUNTRIES, DEFAULT_COUNTRY, flagEmoji, parsePhone } from "@/lib/countries";

// Phone-number field with a searchable country-code selector (flag + dial code),
// matching the reference: a country button on the left opens a search-filtered
// list; the number goes in the input on the right. Emits the composed value
// "+<dial> <number>" via onChange so the account stores a single string. The
// country list is portalled to <body> and prefers opening ABOVE the field, so a
// scrollable modal never clips it.
const POP_H = 300;

export default function PhoneInput({ value, onChange, autoFocus = false }) {
  const init = useMemo(() => parsePhone(value), []); // seed once from the stored value
  const [code, setCode] = useState(init.code);
  const [number, setNumber] = useState(init.number);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const searchRef = useRef(null);

  const country = COUNTRIES.find((c) => c.code === code) || COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY);
  const emit = (dial, num) => onChange(`${dial} ${String(num).trim()}`.trim());

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 260);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const above = r.top > POP_H + 16;
    const top = above ? r.top - POP_H - 8 : Math.min(r.bottom + 8, window.innerHeight - POP_H - 8);
    setPos({ left, top: Math.max(8, top), width });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    const onDoc = (e) => { if (!triggerRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) { setOpen(false); setQuery(""); } };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase() === s);
  }, [query]);

  const pick = (c) => { setCode(c.code); setOpen(false); setQuery(""); emit(c.dial, number); };

  return (
    <div className="relative">
      <div className="flex items-stretch overflow-hidden rounded-xl border border-steel-300 transition-colors focus-within:border-brand-500 dark:border-white/15">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 border-e border-steel-300 bg-steel-50 px-3 text-sm text-brand-950 transition-colors hover:bg-steel-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          <span className="text-lg leading-none">{flagEmoji(country.code)}</span>
          <span className="tabular-nums">{country.dial}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <input
          type="tel"
          inputMode="tel"
          autoFocus={autoFocus}
          value={number}
          onChange={(e) => { setNumber(e.target.value); emit(country.dial, e.target.value); }}
          placeholder="55 000 0000"
          className="w-full min-w-0 border-0 bg-white px-3 py-2.5 text-sm text-brand-950 outline-none placeholder:text-steel-400 dark:bg-steel-900 dark:text-white"
        />
      </div>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, maxHeight: POP_H }}
          className="z-[120] flex flex-col overflow-hidden rounded-xl border border-steel-200 bg-white shadow-2xl dark:border-white/10 dark:bg-steel-800"
          role="listbox"
        >
          <div className="border-b border-steel-100 p-2 dark:border-white/10">
            <div className="flex items-center gap-2 rounded-lg bg-steel-100 px-3 dark:bg-white/5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-steel-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for country"
                className="w-full border-0 bg-transparent py-2 text-sm text-brand-950 outline-none placeholder:text-steel-400 dark:text-white"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-steel-400">No countries match “{query}”.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pick(c)}
                  aria-selected={c.code === code}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors hover:bg-steel-50 dark:hover:bg-white/5 ${c.code === code ? "bg-brand-500/5" : ""}`}
                >
                  <span className="text-lg leading-none">{flagEmoji(c.code)}</span>
                  <span className="min-w-0 flex-1 truncate text-brand-950 dark:text-white">{c.name}</span>
                  <span className="tabular-nums text-steel-500 dark:text-slate-400">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
