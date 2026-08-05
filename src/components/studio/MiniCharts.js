// Tiny SVG chart primitives used by the Technical dashboard. Kept dependency-
// free and small so we don't ship a chart lib for two visualisations.

// A line chart showing counts over a series of days. `data` = [{ label, value }].
export function TimelineChart({ data, height = 160, ariaLabel = "Timeline" }) {
  if (!data || data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  }
  const width = 500;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = data.map((d, i) => [padL + i * stepX, padT + h - (d.value / maxV) * h]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `M ${pts[0][0].toFixed(1)} ${(padT + h).toFixed(1)} ${pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} L ${pts[pts.length - 1][0].toFixed(1)} ${(padT + h).toFixed(1)} Z`;
  // Only render a subset of x-axis labels so they don't overlap.
  const labelStep = Math.max(1, Math.ceil(data.length / 6));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={ariaLabel}>
      {/* horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={padL} x2={width - padR} y1={padT + h * (1 - t)} y2={padT + h * (1 - t)} stroke="currentColor" opacity="0.08" />
      ))}
      {/* y ticks */}
      {[0, maxV].map((v) => (
        <text key={v} x={padL - 6} y={v === 0 ? padT + h : padT + 4} textAnchor="end" className="fill-current text-[9px] opacity-50">{v}</text>
      ))}
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="currentColor" />
      ))}
      {data.map((d, i) => (
        (i % labelStep === 0 || i === data.length - 1) && (
          <text key={i} x={pts[i][0]} y={height - 8} textAnchor="middle" className="fill-current text-[9px] opacity-50">
            {d.label}
          </text>
        )
      ))}
    </svg>
  );
}

// Scatter plot of completion durations. `points` = [{ x, y, label }] where x
// is the created-at ordinal (0..N-1) and y is days-to-complete.
export function ScatterChart({ points, height = 200, ariaLabel = "Scatter" }) {
  if (!points || points.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No completed quotations yet.</p>;
  }
  const width = 500;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;
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
