"use client";

import { useEffect, useRef, useState } from "react";

// THE WALL'S SMALL VISUALS, hand-drawn in SVG.
//
// components/charts is the house chart kit and this deliberately does not use
// it: that kit is SERVER-RENDERED BY CONTRACT — it mints gradient ids from a
// module counter, which is safe only while nothing hydrates, and its own header
// says so. Every panel here re-renders on a poll, so they are client components,
// and importing the kit into one would give the server and the browser different
// ids and a hydration error on a screen nobody is watching closely.
//
// The vocabulary is kept deliberately identical — same tokens, same stroke
// weights, same tabular figures — so the wall and the console's Analytics screen
// look like one product rather than two.

export const fmt = (n) => Number(n || 0).toLocaleString("en-US");

// ---- panel shell -----------------------------------------------------------

export function Panel({ title, sub, children, className = "", bodyClass = "" }) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border ${className}`}
      style={{ background: "var(--ad-card)", borderColor: "var(--ad-border)" }}
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <h2
          className="text-[11px] font-700 uppercase tracking-[0.14em]"
          style={{ color: "var(--ad-foreground)" }}
        >
          {title}
        </h2>
        {sub ? (
          <span className="truncate text-[11px]" style={{ color: "var(--ad-muted-foreground)" }}>{sub}</span>
        ) : null}
      </header>
      <div className={`min-h-0 flex-1 px-4 pb-3 pt-2 ${bodyClass}`}>{children}</div>
    </section>
  );
}

// ---- numbers that move -----------------------------------------------------

// A 500ms ease-out onto the new value.
//
// It animates from the PREVIOUS value rather than from zero on every render:
// counting up from nothing each time a poll returns the same number is a screen
// that looks busy while nothing is happening, which on a wall is worse than a
// static figure. Reduced motion snaps.
export function Ticker({ value, className = "" }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const start = from.current;
    const end = Number(value) || 0;
    if (start === end) return undefined;
    // SNAP, in a frame rather than in the effect body. Setting state
    // synchronously here would cascade a render inside the render that
    // scheduled it (and ESLint's react-hooks rule says so); one frame is
    // indistinguishable from instant to a reader and is a plain assignment to
    // React.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf.current = requestAnimationFrame(() => { from.current = end; setShown(end); });
      return () => cancelAnimationFrame(raf.current);
    }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 500);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (end - start) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else from.current = end;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span className={`num ${className}`}>{fmt(shown)}</span>;
}

// ---- sparkline -------------------------------------------------------------

export function Sparkline({ points, height = 44 }) {
  const data = (points || []).map((n) => Number(n) || 0);
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const w = 100;
  const step = w / (data.length - 1);
  const y = (n) => height - 3 - (n / max) * (height - 8);
  const line = data.map((n, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y(n).toFixed(2)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden="true">
      <path d={area} fill="rgb(var(--ad-primary-rgb) / 0.14)" />
      <path d={line} fill="none" stroke="var(--ad-primary)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <circle cx={w} cy={y(data[data.length - 1])} r="2" fill="var(--ad-primary)" />
    </svg>
  );
}

// ---- a labelled bar row ----------------------------------------------------

export function BarRow({ label, lead, value, pct, tone = "primary" }) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      {lead ? <span className="w-5 shrink-0 text-center text-sm leading-none">{lead}</span> : null}
      <span className="w-0 flex-1 truncate text-xs" style={{ color: "var(--ad-foreground)" }}>{label}</span>
      <span className="h-1.5 w-[38%] shrink-0 overflow-hidden rounded-full" style={{ background: "var(--ad-muted)" }}>
        <span
          className="block h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: `var(--ad-${tone})` }}
        />
      </span>
      <span className="num w-12 shrink-0 text-end text-xs" style={{ color: "var(--ad-muted-foreground)" }}>{value}</span>
    </div>
  );
}

// ---- donut -----------------------------------------------------------------

// Shares of a whole, as arcs on one ring. A slice of exactly nothing is drawn as
// nothing rather than as a hairline, so "no tablets" does not read as "a few".
export function Donut({ slices, size = 108 }) {
  const total = slices.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ad-muted)" strokeWidth="10" />
      {total > 0
        ? slices.map((s) => {
            const frac = (Number(s.value) || 0) / total;
            if (frac <= 0) return null;
            const dash = `${(frac * c).toFixed(2)} ${(c - frac * c).toFixed(2)}`;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="10"
                strokeDasharray={dash}
                strokeDashoffset={-offset * c}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += frac;
            return el;
          })
        : null}
    </svg>
  );
}

// ---- the continent x day heat grid -----------------------------------------

// One row per continent, one cell per day, coloured on the same five-step ramp
// the map uses — so a continent reading hot on the grid reads hot on the map.
//
// A DAY WITH NO VISITS IS THE EMPTY CELL COLOUR, not the ramp's lowest step. The
// map makes the same distinction for the same reason: the bottom of a ramp is a
// measurement, and nothing happening is not one.
export function HeatGrid({ rows, days, levelOf }) {
  return (
    <div className="flex min-h-0 flex-col gap-[3px]">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <span className="w-[86px] shrink-0 truncate text-[11px]" style={{ color: "var(--ad-muted-foreground)" }}>
            {row.name}
          </span>
          <div className="flex min-w-0 flex-1 gap-[2px]">
            {days.map((d) => {
              const n = row.byDay[d] || 0;
              const level = levelOf(n);
              return (
                <span
                  key={d}
                  title={`${row.name} · ${d} · ${fmt(n)}`}
                  className="h-3.5 min-w-0 flex-1 rounded-[2px] transition-colors duration-500"
                  style={{
                    background: level < 0
                      ? "var(--ad-muted)"
                      : `rgb(var(--ad-warning-rgb) / ${[0.22, 0.38, 0.56, 0.78, 1][level]})`,
                  }}
                />
              );
            })}
          </div>
          <span className="num w-12 shrink-0 text-end text-[11px]" style={{ color: "var(--ad-foreground)" }}>
            {fmt(row.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- the signups chart -----------------------------------------------------

// Bars for studios signed each day, a line for the running total on its own
// axis. THE ONE DUAL-AXIS CHART IN THE PRODUCT, and it earns it: both series are
// the same quantity at two time scales, the axes are labelled, and splitting
// them into two stacked charts would put ninety days of mostly-empty bars above
// a line that never moves. Anything else with two units gets two charts.
export function SignupChart({ days, height = 96 }) {
  const n = days.length;
  if (!n) return <div style={{ height }} />;
  const maxDaily = Math.max(...days.map((d) => d.n), 1);
  const maxCum = Math.max(...days.map((d) => d.cumulative), 1);
  const w = 300;
  const step = w / n;
  const cumY = (v) => height - 2 - (v / maxCum) * (height - 10);
  const line = days
    .map((d, i) => `${i === 0 ? "M" : "L"}${(i * step + step / 2).toFixed(2)},${cumY(d.cumulative).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      {days.map((d, i) => {
        if (!d.n) return null;
        const h = (d.n / maxDaily) * (height - 14);
        return (
          <rect
            key={d.d}
            x={i * step + step * 0.15}
            y={height - 2 - h}
            width={Math.max(0.8, step * 0.7)}
            height={h}
            fill="var(--ad-warning)"
          >
            <title>{`${d.d} · ${d.n} signed · ${d.cumulative} total`}</title>
          </rect>
        );
      })}
      <path d={line} fill="none" stroke="var(--ad-primary)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
