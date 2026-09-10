// DEPENDENCY-FREE SVG CHARTS, for the console and the studio alike.
//
// The reference console renders these with ApexCharts. A charting library would
// mean touching package.json, so these are hand-drawn instead: same shapes, no
// client JavaScript, and they render identically on the server. Recharts is
// ~100 KB gzipped and hydrates; this is nothing and does not.
//
// PROMOTED OUT OF /super, because Wave 4 gives every department a dashboard and
// a second copy of a chart kit is how two surfaces come to disagree about what
// a series looks like. Colours now read the `--chart-*` ramp on :root rather
// than the `--ad-*` aliases, which never leave the console's own scope.
//
// SERVER-RENDERED, AND IT HAS TO STAY THAT WAY. `nextId()` below is a module
// counter, which is safe only because nothing here hydrates: were one of these
// to render on the client, the server and the browser would mint different
// gradient ids and React would complain about the mismatch. If a chart ever
// needs interaction, the interactive part goes in a client island beside it and
// the drawing stays here.

import { Fragment, type ReactNode } from "react";

/* ONE SERIES SHAPE FOR THE WHOLE KIT. Area and Bar take the same object, so a
   card can swap between them without reshaping its data — which is most of why
   the console's cards were able to change chart type during the rebuild.
   `color` is an escape hatch: leave it off and the series takes its slot in the
   ramp, which is what keeps a legend and a status pill agreeing. */
export type Series = { name?: string; data: number[]; color?: string };
export type Legend = { name: string; color?: string };
/* `value` is a percentage 0..100 — the meter's width. `display` is what the row
   SAYS, which is often not the percentage: "1,284 sessions" over a bar that is
   62% wide. Keeping them separate is the only way a meter can be honest about
   proportion and precise about quantity at once. */
export type BarListItem = {
  label: string;
  value: number;
  display?: ReactNode;
  color?: string;
  icon?: ReactNode;
};
export type Slice = { label: string; value: number; color?: string };

type Point = readonly [number, number];

const PALETTE = [
  "rgb(var(--chart-1))",
  "rgb(var(--chart-2))",
  "rgb(var(--chart-3))",
  "rgb(var(--chart-4))",
  "rgb(var(--chart-5))",
];

let uid = 0;
const nextId = () => `adc${++uid}`;

function scale(values: number[], height: number, pad: number, max?: number, min?: number) {
  const hi = max ?? Math.max(...values);
  const lo = min ?? 0;
  const span = hi - lo || 1;
  return (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);
}

/* Catmull-Rom → cubic bezier, for the smooth curves the reference uses. */
function smoothPath(pts: Point[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function linePath(pts: Point[]) {
  return pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Area / line                                                                */
/* -------------------------------------------------------------------------- */

export function AreaChart({
  series = [],
  labels = [],
  height = 300,
  fill = true,
  smooth = true,
  dashed = [],
  yTicks = 5,
  showY = true,
  rtl = false,
  className = "",
}: {
  series?: Series[];
  labels?: string[];
  height?: number;
  fill?: boolean;
  smooth?: boolean;
  /** Indices drawn as a dashed line with no area fill — "last period". */
  dashed?: number[];
  yTicks?: number;
  showY?: boolean;
  /**
   * Draw index 0 at the RIGHT edge, for a studio reading Arabic.
   *
   * This is a prop and not a stylesheet because an SVG path is arithmetic: the
   * browser mirrors `ps-`/`pe-` and it mirrors a CSS grid, but nothing mirrors
   * `d="M 0 40 C …"`. And the grid IS mirrored — `ChartFrame` lays its x-axis
   * labels out in one, so in Arabic they already run right-to-left. Without
   * this the labels and the line point at each other's data, which is worse
   * than not mirroring at all.
   */
  rtl?: boolean;
  className?: string;
}) {
  const W = 800;
  const padY = 16;
  const padL = showY ? 34 : 8;
  const padR = 8;
  const padB = labels.length ? 24 : 8;
  const plotW = W - padL - padR;
  const plotH = height - padB;

  // Series arrive from the network now, not from a hard-coded array, so an
  // EMPTY one is an ordinary state: the first render before a fetch resolves,
  // or a range with no traffic in it. Dropping them here means the rest of this
  // function can still assume every series it draws has points.
  const drawable = series.filter((s) => Array.isArray(s.data) && s.data.length > 0);
  const all = drawable.flatMap((s) => s.data);
  const rawMax = Math.max(...all, 1);
  const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2 || 1;
  const max = Math.ceil(rawMax / step) * step;
  const y = scale([], plotH, padY, max, 0);
  const x = (i: number, n: number) => {
    if (n <= 1) return padL + plotW / 2;
    const f = i / (n - 1);
    return padL + (rtl ? 1 - f : f) * plotW;
  };

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className={`w-full ${className}`}
      style={{ height }}
      preserveAspectRatio="none"
      role="img"
    >
      {/* gridlines */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={padL}
          x2={W - padR}
          y1={y(t)}
          y2={y(t)}
          stroke="rgb(var(--doc-border))"
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {drawable.map((s, si) => {
        const color = s.color || PALETTE[si % PALETTE.length];
        const pts: Point[] = s.data.map((v, i) => [x(i, s.data.length), y(v)]);
        const d = smooth ? smoothPath(pts) : linePath(pts);
        const gid = nextId();
        return (
          <g key={s.name || si}>
            {fill && !dashed.includes(si) ? (
              <>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${d} L ${pts[pts.length - 1][0]} ${plotH} L ${pts[0][0]} ${plotH} Z`} fill={`url(#${gid})`} />
              </>
            ) : null}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeDasharray={dashed.includes(si) ? "6 5" : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      {/* Axis text is drawn outside the non-uniform scale via a nested svg so it
          does not stretch with the viewBox. */}
    </svg>
  );
}

/* Axis labels are rendered as HTML so they stay crisp under `preserveAspectRatio="none"`. */
export function ChartFrame({
  children,
  labels = [],
  yLabels = [],
  legend = [],
  height = 300,
}: {
  children?: ReactNode;
  labels?: ReactNode[];
  yLabels?: ReactNode[];
  legend?: Legend[];
  height?: number;
}) {
  return (
    <div>
      <div className="flex gap-3">
        {yLabels.length ? (
          <div
            className="flex shrink-0 flex-col justify-between py-1 text-end text-[11px] text-[rgb(var(--doc-muted-foreground))]"
            style={{ height }}
          >
            {[...yLabels].reverse().map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {labels.length ? (
        <div
          className="mt-2 grid text-center text-[11px] text-[rgb(var(--doc-muted-foreground))]"
          style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0,1fr))` }}
        >
          {labels.map((l, i) => (
            <span key={i} className="truncate">
              {l}
            </span>
          ))}
        </div>
      ) : null}
      {legend.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-5">
          {legend.map((l, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-xs text-[rgb(var(--doc-muted-foreground))]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: l.color || PALETTE[i % PALETTE.length] }}
              />
              {l.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

// A chart-shaped placeholder, for the cards that fetch their series after
// hydration.
//
// It reserves the SAME BOX the chart will occupy — the y-axis gutter, the plot
// height, the x-axis label strip — so the series lands in place instead of
// shoving the card open. Before this, the analytics cards rendered a real
// AreaChart over an empty array while the fetch was in flight: a chart frame
// with nothing drawn in it, which reads as "no traffic" rather than "not yet".
//
// The bar heights come from a fixed sequence, not Math.random(): a random
// skeleton renders differently on the server and on the client and React calls
// that a hydration mismatch.
const SKELETON_HEIGHTS = [42, 58, 35, 71, 49, 84, 62, 38, 76, 55, 67, 44];

export function ChartSkeleton({
  height = 280,
  bars = 12,
  yLabels = 6,
  labels = 0,
  className = "",
}: {
  height?: number;
  bars?: number;
  yLabels?: number;
  labels?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className="flex gap-3">
        {yLabels ? (
          <div className="flex shrink-0 flex-col justify-between py-1" style={{ height }}>
            {Array.from({ length: yLabels }, (_, i) => (
              <span key={i} className="skel skel-text block h-2 w-6" />
            ))}
          </div>
        ) : null}
        <div
          className="grid min-w-0 flex-1 items-end gap-[3%]"
          style={{ height, gridTemplateColumns: `repeat(${bars}, minmax(0,1fr))` }}
        >
          {Array.from({ length: bars }, (_, i) => (
            <span
              key={i}
              className="skel block w-full rounded-t-md"
              style={{ height: `${SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length]}%` }}
            />
          ))}
        </div>
      </div>
      {labels ? (
        <div
          className="mt-2 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${labels}, minmax(0,1fr))` }}
        >
          {Array.from({ length: labels }, (_, i) => (
            <span key={i} className="skel skel-text mx-auto block h-2 w-6" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bars                                                                        */
/* -------------------------------------------------------------------------- */

export function BarChart({
  series = [],
  labels = [],
  height = 260,
  stacked = false,
  radius = 4,
  rtl = false,
  className = "",
}: {
  series?: Series[];
  labels?: string[];
  height?: number;
  stacked?: boolean;
  radius?: number;
  /** Group 0 on the RIGHT. See the note on `AreaChart`. */
  rtl?: boolean;
  className?: string;
}) {
  const W = 800;
  const padB = 0;
  const plotH = height - padB;
  const n = labels.length || (series[0]?.data.length ?? 0);
  const groupW = W / Math.max(n, 1);
  const totals = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + (s.data[i] || 0), 0));
  const max = stacked ? Math.max(...totals, 1) : Math.max(...series.flatMap((s) => s.data), 1);
  const barCount = stacked ? 1 : series.length;
  const gap = groupW * 0.34;
  const barW = Math.max(4, (groupW - gap) / barCount);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={`w-full ${className}`} style={{ height }} role="img">
      {Array.from({ length: n }, (_, i) => {
        let acc = 0;
        return series.map((s, si) => {
          const color = s.color || PALETTE[si % PALETTE.length];
          const v = s.data[i] || 0;
          const h = (v / max) * (plotH - 8);
          // The whole group is reflected about the plot's midline, then the
          // bars WITHIN it are re-ordered too — otherwise a grouped chart's
          // series would silently swap places against its own legend.
          const slot = rtl ? n - 1 - i : i;
          const seat = rtl ? series.length - 1 - si : si;
          const xPos = stacked ? slot * groupW + gap / 2 : slot * groupW + gap / 2 + seat * barW;
          const yPos = stacked ? plotH - acc - h : plotH - h;
          acc += h;
          return (
            <rect
              key={`${i}-${si}`}
              x={xPos}
              y={yPos}
              width={stacked ? groupW - gap : barW - 2}
              height={Math.max(h, 1)}
              rx={radius}
              fill={color}
            />
          );
        });
      })}
    </svg>
  );
}

/* Thin horizontal meter rows — "Device Analytics", "Goal Progress". */
export function BarList({
  items = [],
  showValue = true,
  className = "",
}: {
  items?: BarListItem[];
  showValue?: boolean;
  className?: string;
}) {
  return (
    <ul className={`space-y-4 ${className}`}>
      {items.map((it, i) => {
        const color = it.color || PALETTE[i % PALETTE.length];
        return (
          <li key={it.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2">
                {it.icon ? <span className="text-[rgb(var(--doc-muted-foreground))]">{it.icon}</span> : null}
                <span>{it.label}</span>
              </span>
              {showValue ? <span className="num font-500">{it.display ?? `${it.value}%`}</span> : null}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--doc-muted))]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, it.value)}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut / radial                                                              */
/* -------------------------------------------------------------------------- */

export function Donut({
  data = [],
  size = 180,
  thickness = 22,
  center,
  className = "",
}: {
  data?: Slice[];
  size?: number;
  thickness?: number;
  /** Drawn in the hole. A total, usually. */
  center?: ReactNode;
  className?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--doc-muted))" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color || PALETTE[i % PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center ? <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div> : null}
    </div>
  );
}

export function Radial({
  value = 0,
  size = 130,
  thickness = 10,
  color,
  label,
  sub,
  className = "",
}: {
  /** 0..100. Clamped, so a caller cannot draw more than a full ring. */
  value?: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--doc-muted))" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color || "rgb(var(--chart-1))"}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-700">{label ?? `${value}%`}</span>
        {sub ? <span className="mt-0.5 text-[11px] text-[rgb(var(--doc-muted-foreground))]">{sub}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                   */
/* -------------------------------------------------------------------------- */

export function Sparkline({
  data = [],
  color,
  height = 40,
  width = 120,
  fill = true,
  className = "",
}: {
  data?: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
  className?: string;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts: Point[] = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * width,
    height - 3 - ((v - min) / span) * (height - 6),
  ]);
  const d = smoothPath(pts);
  const gid = nextId();
  const stroke = color || "rgb(var(--chart-1))";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} style={{ width: "100%", height }} preserveAspectRatio="none">
      {fill ? (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gid})`} />
        </>
      ) : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Combo: bars and a line, each on its own scale                               */
/* -------------------------------------------------------------------------- */

// TWO QUANTITIES THAT DO NOT SHARE A UNIT, on one time axis — value in money
// and count in deals, income and expense with the month's net riding over
// them. Two separate charts make the reader line up the months by eye; one
// axis with two scales does it for them. The LINE HAS ITS OWN SCALE and may go
// below zero (a month that lost money), so its baseline is computed from its
// own minimum rather than pinned to the bars' floor.
//
// `preserveAspectRatio="none"` so the groups stretch to exactly the width
// ChartFrame's label grid divides into — group i sits over label i at every
// width. The cost is that nothing round is drawn here: a circle would become
// an ellipse, which is why the line has no dots.
export function ComboChart({
  bars = [],
  line,
  height = 240,
  stacked = false,
  rtl = false,
  className = "",
}: {
  bars?: Series[];
  line?: Series;
  height?: number;
  stacked?: boolean;
  /** Group 0 on the RIGHT. See the note on `AreaChart`. */
  rtl?: boolean;
  className?: string;
}) {
  const W = 800;
  const top = 10;
  const n = Math.max(bars[0]?.data.length ?? 0, line?.data.length ?? 0);
  if (!n) return null;
  const plotH = height - top;
  const groupW = W / n;
  const totals = Array.from({ length: n }, (_, i) => bars.reduce((a, s) => a + Math.max(0, s.data[i] || 0), 0));
  const barMax = Math.max(1, stacked ? Math.max(0, ...totals) : Math.max(0, ...bars.flatMap((s) => s.data)));
  const lineData = line?.data ?? [];
  const lineMax = Math.max(1, ...lineData);
  const lineMin = Math.min(0, ...lineData);
  const gap = groupW * 0.3;
  const count = stacked ? 1 : Math.max(bars.length, 1);
  const barW = Math.max(3, (groupW - gap) / count);
  const slot = (i: number) => (rtl ? n - 1 - i : i);
  const yBar = (v: number) => (Math.max(0, v) / barMax) * (plotH - 6);
  const yLine = (v: number) => top + plotH - ((v - lineMin) / (lineMax - lineMin || 1)) * (plotH - 6);
  const pts: Point[] = lineData.map((v, i) => [slot(i) * groupW + groupW / 2, yLine(v)]);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={`w-full ${className}`} style={{ height }} preserveAspectRatio="none" role="img">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={top + plotH - f * (plotH - 6)} y2={top + plotH - f * (plotH - 6)}
          stroke="rgb(var(--doc-border))" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        let acc = 0;
        return bars.map((s, si) => {
          const h = yBar(s.data[i] || 0);
          const seat = rtl ? count - 1 - si : si;
          const x = stacked ? slot(i) * groupW + gap / 2 : slot(i) * groupW + gap / 2 + seat * barW;
          const y = stacked ? top + plotH - acc - h : top + plotH - h;
          acc += h;
          return (
            <rect key={`${i}-${si}`} x={x} y={y} width={stacked ? groupW - gap : barW - 2} height={Math.max(h, h > 0 ? 1 : 0)}
              rx={2} fill={s.color || PALETTE[si % PALETTE.length]} opacity={0.9} />
          );
        });
      })}
      {pts.length > 1 ? (
        <path d={smoothPath(pts)} fill="none" stroke={line?.color || PALETTE[bars.length % PALETTE.length]}
          strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Heat grid                                                                   */
/* -------------------------------------------------------------------------- */

// A GRID OF CELLS WHOSE DEPTH IS THE COUNT — weekday by week, location by day.
// Drawn in HTML rather than SVG so the labels stay crisp and the grid mirrors
// itself in Arabic for free. The hue is one ramp colour at an opacity scaled to
// the busiest cell, so the reading is RELATIVE: the darkest cell is the busiest
// moment on this grid, not a fixed threshold that a quiet studio never reaches.
export function HeatGrid({
  rows = [],
  columns = [],
  color = "rgb(var(--chart-1))",
  className = "",
}: {
  rows?: { label: ReactNode; values: number[] }[];
  columns?: ReactNode[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(0, ...rows.flatMap((r) => r.values));
  return (
    <div className={`overflow-x-auto ${className}`}>
      <div
        className="grid min-w-max gap-1"
        style={{ gridTemplateColumns: `minmax(4.5rem,auto) repeat(${columns.length}, minmax(1.5rem,1fr))` }}
      >
        <span />
        {columns.map((c, i) => (
          <span key={i} className="truncate text-center text-[10px] text-[rgb(var(--doc-muted-foreground))]">{c}</span>
        ))}
        {rows.map((r, ri) => (
          <Fragment key={ri}>
            <span className="truncate pe-2 text-[11px] leading-6 text-[rgb(var(--doc-muted-foreground))]">{r.label}</span>
            {r.values.map((v, ci) => (
              <span key={ci} title={String(v)} className="relative h-6 overflow-hidden rounded-[5px] bg-[rgb(var(--doc-muted))]">
                {v > 0 ? (
                  <span className="absolute inset-0" style={{ backgroundColor: color, opacity: 0.2 + 0.8 * (v / (max || 1)) }} />
                ) : null}
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Share bar                                                                   */
/* -------------------------------------------------------------------------- */

// ONE BAR, SPLIT BY SHARE, with its key underneath — a part-to-whole read that
// takes a line instead of a donut's square. ONLY FOR PARTS THAT ARE EXCLUSIVE:
// every slice is a share of the one total, so categories a row can belong to
// two of at once (late AND unchased) belong in a BarList instead.
//
// A slice's colour is decided BEFORE the empty ones are dropped, so a slice
// keeps its hue whether or not its neighbour happens to be zero today.
export function ShareBar({
  data = [],
  format,
  className = "",
}: {
  data?: Slice[];
  format?: (v: number) => ReactNode;
  className?: string;
}) {
  const parts = data
    .map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }))
    .filter((d) => d.value > 0);
  const total = parts.reduce((a, d) => a + d.value, 0);
  if (!total) return null;
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[rgb(var(--doc-muted))]">
        {parts.map((d) => (
          <span key={d.label} title={`${d.label}: ${d.value}`} className="h-full" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {parts.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="min-w-0 flex-1 truncate text-[rgb(var(--doc-muted-foreground))]">{d.label}</span>
            <span className="num shrink-0 font-600">{format ? format(d.value) : d.value}</span>
            <span className="num w-9 shrink-0 text-end text-[rgb(var(--doc-muted-foreground))]">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scatter                                                                     */
/* -------------------------------------------------------------------------- */

export type ScatterPoint = { x: number; y: number; color?: string; label?: string };

// ONE DOT PER RECORD, on two measures at once — value against progress, days
// against order. HTML dots positioned by percentage rather than SVG circles,
// because the plot stretches to its card and a stretched circle is an ellipse.
// `insetInlineStart` mirrors the x axis in Arabic with no arithmetic of its own.
export function Scatter({
  points = [],
  height = 220,
  xMax,
  yMax,
  xTicks = [],
  yTicks = [],
  className = "",
}: {
  points?: ScatterPoint[];
  height?: number;
  xMax?: number;
  yMax?: number;
  xTicks?: ReactNode[];
  yTicks?: ReactNode[];
  className?: string;
}) {
  const xm = xMax ?? Math.max(1, ...points.map((p) => p.x));
  const ym = yMax ?? Math.max(1, ...points.map((p) => p.y));
  return (
    <div className={className}>
      <div className="flex gap-3">
        {yTicks.length ? (
          <div className="flex shrink-0 flex-col justify-between py-1 text-end text-[11px] text-[rgb(var(--doc-muted-foreground))]" style={{ height }}>
            {[...yTicks].reverse().map((t, i) => <span key={i}>{t}</span>)}
          </div>
        ) : null}
        <div className="relative min-w-0 flex-1 rounded-lg border border-dashed border-[rgb(var(--doc-border))]" style={{ height }}>
          <div className="absolute inset-2.5">
            {points.map((p, i) => (
              <span
                key={i}
                title={p.label}
                className="absolute h-3 w-3 rounded-full ring-2 ring-white/70 dark:ring-black/30"
                style={{
                  insetInlineStart: `calc(${Math.min(100, Math.max(0, (p.x / xm) * 100))}% - 6px)`,
                  bottom: `calc(${Math.min(100, Math.max(0, (p.y / ym) * 100))}% - 6px)`,
                  backgroundColor: p.color || PALETTE[0],
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {xTicks.length ? (
        <div className="mt-2 flex justify-between text-[11px] text-[rgb(var(--doc-muted-foreground))]">
          {xTicks.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      ) : null}
    </div>
  );
}

export { PALETTE };
