// NAVIGATE — turn-by-turn to a place, in whichever app the reader uses.
//
// Three apps rather than one because the region does not agree on one: Waze is
// what a good share of drivers in Amman actually open, Google Maps is the
// default on Android, and Apple Maps is the default on an iPhone. None of the
// links needs an API key and none costs anything; they are ordinary URLs the
// apps register for (shared/places says which, and why no name goes in them).
//
// NO GOOGLE SCRIPT HERE. Navigating is a link, not a map, so this renders and
// works for a studio that has no Maps key at all.
"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { navigationLinks, formatLatLng } from "@/shared/places";
import { btnRow } from "@/components/studio2/ui";

// APPLE MAPS ONLY ON APPLE HARDWARE. Elsewhere it opens a web page in beta
// rather than an app, which is a worse answer than the two above it. Read at
// click time, never during render — the menu exists only after a click, so
// the server and the first client render cannot disagree about it.
const onApple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

const item = "block w-full px-3.5 py-2 text-start text-sm text-[var(--geex-ink)] transition-colors hover:bg-slate-50 dark:hover:bg-white/5";

export default function NavigateMenu({ at, className = btnRow }) {
  const tr = operationsDict(useStudioLocale());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const links = navigationLinks(at);
  const copy = () => {
    navigator.clipboard?.writeText(formatLatLng(at))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => {});
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" className={className} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {tr.navigate}
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-20 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-[var(--geex-surface)] py-1 shadow-lg dark:border-white/10">
          <a role="menuitem" className={item} href={links.google} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Google Maps</a>
          <a role="menuitem" className={item} href={links.waze} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Waze</a>
          {onApple() && (
            <a role="menuitem" className={item} href={links.apple} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Apple Maps</a>
          )}
          <div className="my-1 border-t border-slate-100 dark:border-white/5" />
          <button role="menuitem" type="button" className={item} onClick={copy}>
            {copied ? tr.copied : tr.copyCoordinates}
            <span className="ms-2 text-xs tabular-nums text-slate-400" dir="ltr">{formatLatLng(at)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
