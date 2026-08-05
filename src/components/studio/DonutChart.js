// Dependency-free donut chart (inline SVG). `data` = [{ label, value, color }].
// Renders the ring plus a legend with values.
export default function DonutChart({ data, total, centerLabel }) {
  const sum = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" className="stroke-[#eef1f6] dark:stroke-[#1c2740]" strokeWidth="18" />
          {data.map((d) => {
            const fraction = d.value / sum;
            const dash = fraction * circumference;
            const seg = (
              <circle
                key={d.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-800 text-slate-900 dark:text-white">{total ?? sum}</span>
          {centerLabel && <span className="text-xs font-500 text-slate-400 dark:text-slate-500">{centerLabel}</span>}
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-1">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-600 text-slate-900 dark:text-white">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
