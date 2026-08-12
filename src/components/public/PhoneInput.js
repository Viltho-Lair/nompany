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
//
// The left button carries the FLAG and a chevron only — the dial code lives
// inside the field as a greyed prefix, so the number reads as one continuous
// "+31 576 908 413" rather than being split across two controls.
const POP_H = 300;

export default function PhoneInput({ value, onChange, autoFocus = false, error = "" }) {
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

  // RANKED, not merely filtered. A plain substring match puts Brunei and Guinea
  // above Nepal for "Ne", which is not what someone typing "Ne" is after. Names
  // starting with the query come first, then names with a WORD starting with it
  // ("New Zealand"), and only then matches buried mid-word — which stay
  // reachable rather than disappearing.
  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return COUNTRIES;
    const bare = s.replace(/^\+/, "");
    const scored = [];
    for (const c of COUNTRIES) {
      const name = c.name.toLowerCase();
      let rank;
      if (name.startsWith(s)) rank = 0;
      else if (c.code.toLowerCase() === s) rank = 1;
      else if (name.split(/[\s-]+/).some((w) => w.startsWith(s))) rank = 2;
      else if (bare && c.dial.replace("+", "").startsWith(bare)) rank = 3;
      else if (name.includes(s)) rank = 4;
      else continue;
      scored.push({ c, rank });
    }
    return scored.sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name)).map((x) => x.c);
  }, [query]);

  const pick = (c) => { setCode(c.code); setOpen(false); setQuery(""); emit(c.dial, number); };

  return (
    <div className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border transition-colors ${
          error
            ? "border-rose-400 bg-rose-50/60 dark:border-rose-500/60 dark:bg-rose-500/10"
            : "border-steel-300 hover:border-steel-400 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-white/15 dark:hover:border-white/25"
        }`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${country.name} (${country.dial})`}
          className={`flex shrink-0 items-center gap-1.5 border-e px-3 text-sm transition-colors ${
            error
              ? "border-rose-300 text-rose-900 hover:bg-rose-100/50 dark:border-rose-500/40 dark:text-white"
              : "border-steel-300 text-brand-950 hover:bg-steel-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          }`}
        >
          <span className="text-lg leading-none">{flagEmoji(country.code)}</span>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-3">
          {/* Static, not editable: the dial code belongs to the country chosen
              on the left, so it cannot be retyped or deleted by accident. */}
          <span className="shrink-0 text-sm tabular-nums text-steel-400 dark:text-slate-500">{country.dial}</span>
          <input
            type="tel"
            inputMode="tel"
            autoFocus={autoFocus}
            value={number}
            onChange={(e) => {
              // Digits and separators only — the plus belongs to the prefix.
              const next = e.target.value.replace(/[^\d\s-]/g, "");
              setNumber(next);
              emit(country.dial, next);
            }}
            placeholder="55 000 0000"
            aria-invalid={Boolean(error)}
            className="w-full min-w-0 border-0 bg-transparent py-2.5 text-sm text-brand-950 outline-none placeholder:text-steel-400 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-[11px] font-600 uppercase tracking-wide text-rose-600 dark:text-rose-400">{error}</p>
      )}

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
