// Dependency-free SVG charts for /super.
//
// The reference console renders these with ApexCharts. Adding a charting
// library would mean touching package.json, so these are hand-drawn SVG
// instead: same shapes, same token colours, no client JS, and they render
// identically on the server. Every colour comes from the --ad-chart-* tokens so
// light/dark follow the site theme automatically.

const PALETTE = [
  "var(--ad-chart-1)",
  "var(--ad-chart-2)",
  "var(--ad-chart-3)",
  "var(--ad-chart-4)",
  "var(--ad-chart-5)",
];

let uid = 0;
const nextId = () => `adc${++uid}`;

function scale(values, height, pad, max, min) {
  const hi = max ?? Math.max(...values);
  const lo = min ?? 0;
  const span = hi - lo || 1;
  return (v) => height - pad - ((v - lo) / span) * (height - pad * 2);
}

/* Catmull-Rom → cubic bezier, for the smooth curves the reference uses. */
function smoothPath(pts) {
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

function linePath(pts) {
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
  className = "",
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
  const x = (i, n) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);

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
          stroke="var(--ad-border)"
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {drawable.map((s, si) => {
        const color = s.color || PALETTE[si % PALETTE.length];
        const pts = s.data.map((v, i) => [x(i, s.data.length), y(v)]);
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
export function ChartFrame({ children, labels = [], yLabels = [], legend = [], height = 300 }) {
  return (
    <div>
      <div className="flex gap-3">
        {yLabels.length ? (
          <div
            className="flex shrink-0 flex-col justify-between py-1 text-end text-[11px] text-[var(--ad-muted-foreground)]"
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
          className="mt-2 grid text-center text-[11px] text-[var(--ad-muted-foreground)]"
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
            <span key={i} className="inline-flex items-center gap-2 text-xs text-[var(--ad-muted-foreground)]">
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
/* Bars                                                                        */
/* -------------------------------------------------------------------------- */

export function BarChart({ series = [], labels = [], height = 260, stacked = false, radius = 4, className = "" }) {
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
          const xPos = stacked ? i * groupW + gap / 2 : i * groupW + gap / 2 + si * barW;
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
export function BarList({ items = [], showValue = true, className = "" }) {
  return (
    <ul className={`space-y-4 ${className}`}>
      {items.map((it, i) => {
        const color = it.color || PALETTE[i % PALETTE.length];
        return (
          <li key={it.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2">
                {it.icon ? <span className="text-[var(--ad-muted-foreground)]">{it.icon}</span> : null}
                <span>{it.label}</span>
              </span>
              {showValue ? <span className="font-medium">{it.display ?? `${it.value}%`}</span> : null}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-muted)]">
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

export function Donut({ data = [], size = 180, thickness = 22, center, className = "" }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ad-muted)" strokeWidth={thickness} />
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

export function Radial({ value = 0, size = 130, thickness = 10, color, label, sub, className = "" }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ad-muted)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color || "var(--ad-chart-1)"}
          strokeWidth={thickness}
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold">{label ?? `${value}%`}</span>
        {sub ? <span className="mt-0.5 text-[11px] text-[var(--ad-muted-foreground)]">{sub}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                   */
/* -------------------------------------------------------------------------- */

export function Sparkline({ data = [], color, height = 40, width = 120, fill = true, className = "" }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * width,
    height - 3 - ((v - min) / span) * (height - 6),
  ]);
  const d = smoothPath(pts);
  const gid = nextId();
  const stroke = color || "var(--ad-chart-1)";
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

export { PALETTE };
