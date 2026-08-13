"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/studio2/icons";

// SHARED STUDIO CHROME. The modules each own their own screens, but a dialog, a
// toolbar, an empty state and a bar chart have to look the same in Sales as in
// Technical or the studio stops reading as one product. They live here so there
// is one of each rather than one per module drifting apart.

// ---- style tokens ----------------------------------------------------------
export const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
export const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
export const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
export const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
export const inputRO =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-[#14141c] dark:text-slate-400";
export const microLabel = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
export const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
export const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
export const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
export const btnAmber = "rounded-full bg-amber-600 px-3 py-1.5 text-xs font-600 text-white transition-colors hover:bg-amber-700 disabled:opacity-60";
export const th = "pb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";

// A row still waiting for someone to act on it, marked with a stripe down its
// start edge so the work to be done is visible without reading every column.
export const stripeOn = "border-s-amber-400 bg-amber-50/40 dark:border-s-amber-500/70 dark:bg-amber-500/[0.06]";
export const stripeOff = "border-s-transparent";

export const URGENCY_BADGE = {
  Low: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Normal: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  High: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
export const URGENCY_TONE = {
  Critical: "text-rose-600 dark:text-rose-400",
  High: "text-amber-600 dark:text-amber-400",
};
export const URGENCY_DOT = {
  Critical: "bg-rose-500",
  High: "bg-amber-500",
  Normal: "bg-brand-500",
  Low: "bg-slate-400",
};

// ---- formatting ------------------------------------------------------------
export const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
export const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");
export function fmtDateTime(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); }
}

// ---- personal preferences --------------------------------------------------
// Column and filter choices are a PERSONAL working preference, not studio data:
// they say how one person likes to read a list, so they live in that browser
// keyed by studio rather than costing a row and a write on the server.
export const prefKey = (module, slug, name) => `nompany-${module}-${name}:${slug}`;

export function loadPref(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) ?? fallback) : fallback;
  } catch { return fallback; }
}
export function savePref(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode, full disk — a preference is not worth an error */ }
}

// ---- dialog ----------------------------------------------------------------
// Modal shell for the studio's forms — backdrop, Escape, a locked page scroll
// and a titled header, matching the dialogs on the account pages so they open
// and dismiss the same way. Some forms are taller than most viewports, so the
// BODY scrolls inside a dialog capped below the viewport height; the page
// behind it stays put rather than scrolling two things at once.
export function Dialog({ title, description, onClose, children, width = "max-w-[720px]" }) {
  // RENDERED INTO document.body, not where it is written. `position: fixed` is
  // only viewport-relative while no ancestor establishes a containing block —
  // any transform, filter, backdrop-filter, perspective, contain or
  // will-change on something above it silently re-anchors `inset-0` to THAT
  // element's box instead. In the studio the dialog is written deep inside the
  // shell (page → ps-72 column → sticky header sibling → main), so one such
  // property anywhere up that chain crops the backdrop to the content column
  // and pushes it below the header. Portalling to the body puts the dialog
  // outside the whole chain, so it cannot be caught by a style added later
  // somewhere else.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  if (!mounted) return null; // no document to portal into until the client runs

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* Light touch on purpose: a heavy tint flattened the whole studio —
          sidebar, header and the list behind it — into grey while the form was
          open. The blur separates the dialog from what is behind it, so the
          studio stays legible instead of being blanked out. */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm dark:bg-slate-950/30" onClick={onClose} />
      <div className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c] ${width}`}>
        <div className="flex items-start gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---- list chrome -----------------------------------------------------------
// Search, filters and whatever else a list needs on the left; the one action
// that creates a record on the right — or the badge saying you may not.
export function Toolbar({ canManage, label: addLabel, onAdd, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <span className="ms-auto">
        {canManage
          ? <button type="button" className={btn} onClick={onAdd}>{addLabel}</button>
          : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </span>
    </div>
  );
}

export function FilterButton({ active, open, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-600 transition-colors ${active
        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:text-brand-300"
        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
      Filters{active ? ` (${active})` : ""}
      <Icon name={open ? "chevronUp" : "chevronDown"} className="h-3.5 w-3.5" />
    </button>
  );
}

export function FilterPanel({ children, onClear }) {
  return (
    <div className="grid gap-3 rounded-geex border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#191921] sm:grid-cols-2 lg:grid-cols-3">
      {children}
      <div className="flex items-end justify-end sm:col-span-2 lg:col-span-3">
        <button type="button" onClick={onClear} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Clear all filters</button>
      </div>
    </div>
  );
}

// Which columns a table shows. The Actions column is never on the list — it is
// always drawn by the table itself.
export function ColumnPicker({ columns, selected, onToggle, onReset, onClose, title = "Choose columns" }) {
  return (
    <Dialog title={title} description="The Actions column is always shown. Your choice is kept in this browser." onClose={onClose} width="max-w-[520px]">
      <div className="grid grid-cols-2 gap-2">
        {columns.map((c) => {
          const on = selected.includes(c.key);
          return (
            <label key={c.key} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${on
              ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on} onChange={() => onToggle(c.key)} />
              {c.label}
            </label>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={onReset} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Reset to default</button>
        <button type="button" className={btn} onClick={onClose}>Done</button>
      </div>
    </Dialog>
  );
}

export function Empty({ title, body }) {
  return (
    <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

// A linked number on a dashboard. `href` is optional — a tile for a section the
// viewer cannot open still shows its figure, just without going anywhere.
export function StatTile({ label: tileLabel, value, href, tone = "" }) {
  const body = (
    <>
      <p className={microLabel}>{tileLabel}</p>
      <p className={`font-display text-lg font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
    </>
  );
  const cls = "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]";
  return href
    ? <a href={href} className={`${cls} block transition-colors hover:border-brand-500 dark:hover:border-brand-500/40`}>{body}</a>
    : <div className={cls}>{body}</div>;
}

// ---- charts ----------------------------------------------------------------
export function WidgetTitle({ children, hint }) {
  return (
    <div className="mb-3">
      <p className={microLabel}>{children}</p>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

// Horizontal funnel: bars scaled to the largest value, drawn top → bottom.
export function FunnelChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs font-600 text-slate-500 dark:text-slate-400">{d.label}</span>
          <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
            <div className="h-full rounded-lg bg-brand-500/80 dark:bg-brand-500/60"
              style={{ width: `${Math.max(Math.round((d.value / max) * 100), d.value > 0 ? 6 : 0)}%`, opacity: 1 - i * 0.13 }} />
            <span className="absolute inset-y-0 end-2 flex items-center text-xs font-700 text-slate-700 dark:text-white">{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Labelled horizontal bars for a categorical breakdown. An item may carry its
// own `color` (a Tailwind bg-* class); the default is brand.
export function BarBreakdown({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-600 text-slate-500 dark:text-slate-400">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div className={`h-full rounded-full ${d.color || "bg-brand-500"}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-end text-xs font-700 text-slate-700 dark:text-slate-200">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// Ranked list — rows are [{ id, name, total, … }].
export function Leaderboard({ rows, valueKey = "total", subtitle }) {
  if (!rows || rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id || r.name} className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-300">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-600 text-slate-700 dark:text-slate-200">{r.name}</span>
              <span className="shrink-0 text-sm font-700 text-slate-900 dark:text-white">{r[valueKey]}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full bg-brand-500/70" style={{ width: `${((Number(r[valueKey]) || 0) / max) * 100}%` }} />
            </div>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{subtitle(r)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Counts over a run of days. Drawn as inline SVG rather than with a chart
// library: two shapes do not justify the download, and `currentColor` lets the
// caller theme it with a text class like everything else in the studio.
export function TimelineChart({ data, height = 160, ariaLabel = "Timeline" }) {
  if (!data || data.length === 0) return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  const width = 500, padL = 32, padR = 12, padT = 12, padB = 28;
  const w = width - padL - padR, h = height - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = data.map((d, i) => [padL + i * stepX, padT + h - (d.value / maxV) * h]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `M ${pts[0][0].toFixed(1)} ${(padT + h).toFixed(1)} ${pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + h).toFixed(1)} Z`;
  // Only a subset of the x labels is drawn, or thirty dates overlap into a smudge.
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={ariaLabel}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={padL} x2={width - padR} y1={padT + h * (1 - t)} y2={padT + h * (1 - t)} stroke="currentColor" opacity="0.08" />
      ))}
      {[0, maxV].map((v) => (
        <text key={v} x={padL - 6} y={v === 0 ? padT + h : padT + 4} textAnchor="end" className="fill-current text-[9px] opacity-50">{v}</text>
      ))}
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="currentColor" />)}
      {data.map((d, i) => (
        (i % labelStep === 0 || i === data.length - 1) && (
          <text key={i} x={pts[i][0]} y={height - 8} textAnchor="middle" className="fill-current text-[9px] opacity-50">{d.label}</text>
        )
      ))}
    </svg>
  );
}

// One dot per finished record: x is where it sits in creation order, y is how
// many days it took. `points` = [{ x, y, label }].
export function ScatterChart({ points, height = 200, ariaLabel = "Scatter", emptyLabel = "Nothing finished yet." }) {
  if (!points || points.length === 0) return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  const width = 500, padL = 32, padR = 12, padT = 12, padB = 28;
  const w = width - padL - padR, h = height - padT - padB;
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const sx = (v) => padL + (maxX ? (v / maxX) * w : w / 2);
  const sy = (v) => padT + h - (v / maxY) * h;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label={ariaLabel}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={padL} x2={width - padR} y1={padT + h * (1 - t)} y2={padT + h * (1 - t)} stroke="currentColor" opacity="0.08" />
      ))}
      {[0, maxY].map((v) => (
        <text key={v} x={padL - 6} y={v === 0 ? padT + h : padT + 4} textAnchor="end" className="fill-current text-[9px] opacity-50">{v}d</text>
      ))}
      <text x={padL} y={height - 8} textAnchor="start" className="fill-current text-[9px] opacity-50">Oldest</text>
      <text x={width - padR} y={height - 8} textAnchor="end" className="fill-current text-[9px] opacity-50">Newest</text>
      {points.map((p, i) => (
        <g key={i}>
          <title>{p.label ? `${p.label}: ${p.y} days` : `${p.y} days`}</title>
          <circle cx={sx(p.x)} cy={sy(p.y)} r="4" fill="currentColor" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}
