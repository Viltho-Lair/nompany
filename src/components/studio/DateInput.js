"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";

// A date field that ALWAYS shows and accepts dd/mm/yyyy, regardless of the
// browser's locale (native <input type="date"> renders in the OS locale, which
// we can't control). It stores the value as ISO (yyyy-mm-dd) so the rest of the
// app and the back-end are unchanged, and keeps a real calendar via a hidden
// native picker opened by the calendar button.
function isoToDisplay(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function displayToIso(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  const y = m[3];
  const dt = new Date(`${y}-${mo}-${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  // Reject impossible dates that JS would roll over (e.g. 31/02).
  if (dt.getUTCDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
}

export default function DateInput({ value, onChange, className = "", disabled = false, id, min, max, ...rest }) {
  const [text, setText] = useState(isoToDisplay(value));
  const nativeRef = useRef(null);
  useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        className={`${className} pe-9`}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (v === "") { onChange(""); return; }
          const iso = displayToIso(v);
          if (iso) onChange(iso);
        }}
        onBlur={() => setText(isoToDisplay(value))}
        {...rest}
      />
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        aria-label="Open calendar"
        onClick={() => { const el = nativeRef.current; if (el) { el.showPicker ? el.showPicker() : el.focus(); } }}
        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-50 dark:text-slate-500 dark:hover:text-brand-400"
      >
        <Icon name="calendar" className="h-4 w-4" />
      </button>
      {/* Hidden native picker — supplies the calendar UI; its ISO value flows straight through. */}
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 end-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
