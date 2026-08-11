// Shared presentational primitives for /super. Server components (no state), so
// they can be used directly inside page files without a client boundary.

import Link from "next/link";
import Icon from "./Icon";

/* ---- layout -------------------------------------------------------------- */

export function PageHeader({ title, breadcrumb = [], actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h5 className="mb-0 text-base font-semibold">{title}</h5>
        <ul className="mt-2 flex flex-wrap items-center gap-1 text-sm text-[var(--ad-muted-foreground)]">
          {breadcrumb.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="px-1 opacity-60">/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:text-[var(--ad-primary)]">
                  {c.label}
                </Link>
              ) : (
                <span className="text-[var(--ad-foreground)]">{c.label}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={`ad-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, sub, action, className = "" }) {
  return (
    <div className={`ad-card-head ${className}`}>
      <div className="min-w-0">
        <h6 className="ad-card-title truncate">{title}</h6>
        {sub ? <p className="ad-card-sub">{sub}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", full = false, children }) {
  return <div className={`${full ? "ad-card-body-full" : "ad-card-body"} ${className}`}>{children}</div>;
}

/* Twelve-column grid, matching the reference's `md:grid-cols-12` rows. */
export function Row({ className = "", children }) {
  return <div className={`grid grid-cols-1 gap-6 md:grid-cols-12 ${className}`}>{children}</div>;
}

export function Col({ span = 12, className = "", children }) {
  const map = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
    5: "md:col-span-5",
    6: "md:col-span-6",
    7: "md:col-span-7",
    8: "md:col-span-8",
    9: "md:col-span-9",
    10: "md:col-span-10",
    11: "md:col-span-11",
    12: "md:col-span-12",
  };
  return <div className={`${map[span]} ${className}`}>{children}</div>;
}

/* ---- atoms --------------------------------------------------------------- */

const TONES = {
  primary: { bg: "rgba(70,128,255,.12)", fg: "var(--ad-primary)" },
  success: { bg: "rgba(44,168,127,.14)", fg: "var(--ad-success)" },
  warning: { bg: "rgba(229,138,0,.14)", fg: "var(--ad-warning)" },
  danger: { bg: "rgba(220,38,38,.14)", fg: "var(--ad-destructive)" },
  info: { bg: "rgba(4,169,245,.14)", fg: "var(--ad-info)" },
  muted: { bg: "var(--ad-muted)", fg: "var(--ad-muted-foreground)" },
};

export function Badge({ tone = "primary", solid = false, className = "", children }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <span
      className={`ad-badge ${className}`}
      style={solid ? { backgroundColor: t.fg, color: "#fff" } : { backgroundColor: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "primary" }) {
  const t = TONES[tone] || TONES.primary;
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.fg }} />;
}

const AVATAR_TONES = ["primary", "success", "warning", "danger", "info"];

export function Avatar({ name = "", size = 36, tone, src, className = "" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const pick = tone || AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
  const t = TONES[pick];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: t.bg,
        color: t.fg,
        fontSize: Math.max(10, Math.round(size * 0.34)),
      }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

export function Progress({ value = 0, tone = "primary", height = 6, className = "" }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor: "var(--ad-muted)" }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: t.fg }}
      />
    </div>
  );
}

export function Delta({ value, suffix = "", invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: good ? "var(--ad-success)" : "var(--ad-destructive)" }}
    >
      <Icon name={up ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {value}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/* Solid coloured KPI tile — the four blocks at the top of the analytics page. */
export function KpiTile({ label, value, delta, deltaLabel, icon, color = "var(--ad-primary)" }) {
  return (
    <div
      className="cursor-pointer rounded-lg p-6 text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center gap-4">
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm text-white/80">{label}</p>
          <h4 className="mt-0.5 text-2xl font-semibold leading-tight">{value}</h4>
          {delta !== undefined ? (
            <p className="mt-1 text-xs text-white/75">
              {delta >= 0 ? "+" : ""}
              {delta}% {deltaLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* Neutral stat card on the card surface. */
export function StatCard({ label, value, delta, deltaLabel, icon, tone = "primary" }) {
  const t = TONES[tone] || TONES.primary;
  return (
    <Card>
      <CardBody full className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">{label}</p>
          <h4 className="mt-1.5 text-xl font-semibold">{value}</h4>
          {delta !== undefined ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Delta value={delta} />
              {deltaLabel ? (
                <span className="text-xs text-[var(--ad-muted-foreground)]">{deltaLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        {icon ? (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: t.bg, color: t.fg }}
          >
            <Icon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
      </CardBody>
    </Card>
  );
}

/* ---- table --------------------------------------------------------------- */

export function Table({ head = [], children, className = "" }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="ad-table">
        {head.length ? (
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} className={h.align === "end" ? "text-end" : undefined}>
                  {h.label ?? h}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ---- buttons ------------------------------------------------------------- */

export function Button({ variant = "primary", size, as: As = "button", className = "", children, ...rest }) {
  const v = {
    primary: "ad-btn-primary",
    outline: "ad-btn-outline",
    ghost: "ad-btn-ghost",
    destructive: "ad-btn-destructive",
  }[variant];
  return (
    <As className={`ad-btn ${v} ${size === "sm" ? "ad-btn-sm" : ""} ${className}`} {...rest}>
      {children}
    </As>
  );
}

/* ---- empty / placeholder ------------------------------------------------- */

export function Empty({ icon = "file", title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ad-muted)] text-[var(--ad-muted-foreground)]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h6 className="text-base font-semibold">{title}</h6>
      {sub ? <p className="mt-1 max-w-sm text-sm text-[var(--ad-muted-foreground)]">{sub}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { Icon };
