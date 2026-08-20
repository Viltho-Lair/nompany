// Shared presentational primitives for /super. Server components (no state), so
// they can be used directly inside page files without a client boundary.
//
// Everything here now speaks the ERP's language rather than the template's: geex
// radius, pill buttons, uppercase micro-labels, and — the change with the widest
// reach — every figure rendered through `<Num>`, which is monospaced and
// tabular. See the `.ad-num` note in super.css for why that is not cosmetic.
//
// NO LITERAL COLOURS. The tone table below used to hold `rgba(70,128,255,.12)`
// and friends: tints hand-mixed from the template's palette, which meant a badge
// kept the template's blue no matter what the design system said, and stayed at
// 12% of a light-mode colour on a dark card. Each tone is now a channel triple
// composed at use, so the tint follows the token and the theme both.

import Link from "next/link";
import Icon from "./Icon";

/* ---- layout -------------------------------------------------------------- */

export function PageHeader({ title, breadcrumb = [], actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-1">
      <div className="min-w-0">
        {/* Title first, trail underneath — the Studio's header order. The
            template put a small bold label above a breadcrumb of the same
            weight, so neither read as the page's name. */}
        <h1 className="truncate font-display text-2xl font-800 tracking-tight text-[var(--ad-foreground)]">
          {title}
        </h1>
        {breadcrumb.length ? (
          <nav aria-label="Breadcrumb">
            <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-[var(--ad-muted-foreground)]">
              {breadcrumb.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="px-0.5 opacity-60" aria-hidden="true">
                      /
                    </span>
                  )}
                  {c.href ? (
                    <Link href={c.href} className="transition-colors hover:text-[var(--ad-primary)]">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current={i === breadcrumb.length - 1 ? "page" : undefined}>{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
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
        <h2 className="ad-card-title truncate">{title}</h2>
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

/* ---- numbers ------------------------------------------------------------- */

// EVERY reference, quantity, currency, ID and date goes through here. Two
// columns of figures only line up if the digits share an advance, and `INV-0042`
// only compares against `INV-0421` at a glance in a fixed one.
//
// `as` exists because the right element differs by context — a `<span>` in a
// sentence, a `<td>` in a table, a `<time>` for a date — and none of them should
// need a second wrapper just to pick up the face.
export function Num({ as: As = "span", className = "", children, ...rest }) {
  return (
    <As className={`ad-num ${className}`} {...rest}>
      {children}
    </As>
  );
}

/* ---- atoms --------------------------------------------------------------- */

// Each tone names the SEMANTIC token it draws from, never a colour. `bg` is the
// same token at 14%, which is what makes a pill legible on the card surface in
// both themes from one declaration.
const TONES = {
  primary: "--ad-primary-rgb",
  success: "--ad-success-rgb",
  warning: "--ad-warning-rgb",
  danger: "--ad-destructive-rgb",
  info: "--ad-info-rgb",
  muted: "--ad-muted-foreground-rgb",
};

const toneVar = (tone) => TONES[tone] || TONES.primary;

// EXPORTED, because eight files had their own copy of this table.
//
// `const TONE_BG = { primary: rgba(70,128,255,.14), success: rgba(44,168,127,.16), … }`
// appeared verbatim in the analytics, CRM, project, calendar, notifications and
// docs screens, in the header and in the status pages — nine hand-mixed tints of
// the template's palette, none of which changed when the design system did, and
// each at a slightly different alpha because they were copied at different
// times. There is one now, and it composes from the token.
export const toneFg = (tone) => `rgb(var(${toneVar(tone)}))`;
export const toneBg = (tone, alpha = 0.14) => `rgb(var(${toneVar(tone)}) / ${alpha})`;

// THE INK THAT GOES ON A toneBg WASH — and it is NOT toneFg.
//
// The obvious pairing is the token over a 14% wash of itself, and it is what
// this console did everywhere. Measured, it fails: an amber "Pending" pill puts
// #d97706 on a wash of #d97706 at 2.75:1, and the brand-blue pill manages 4.24.
// Small bold text needs 4.5:1. The reason is arithmetic rather than taste — a
// wash of a colour sits close to that colour in lightness, so a hue used for
// both the ground and the figure has almost nowhere to go.
//
// So the ink steps AWAY from the wash, toward the page's own ink. On light that
// darkens it; on dark the foreground is near-white, so the same declaration
// lightens it. One rule, both themes, and it stays the tone's hue.
//
// 65% is measured, not chosen: at 65 the worst pair in either theme is 4.57:1
// (amber on light) and the best is 6.9:1; at 75 amber drops to 3.92 and fails.
// oklab rather than sRGB so the mix keeps its chroma instead of going muddy
// through the middle.
export const toneInk = (tone) =>
  `color-mix(in oklab, rgb(var(${toneVar(tone)})) 65%, var(--ad-foreground))`;

export function Badge({ tone = "primary", solid = false, className = "", children }) {
  return (
    <span
      className={`ad-badge ${className}`}
      style={
        solid
          ? { backgroundColor: toneFg(tone), color: "var(--ad-primary-foreground)" }
          : { backgroundColor: toneBg(tone), color: toneInk(tone) }
      }
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "primary" }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: toneFg(tone) }} />;
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
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-600 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: toneBg(pick),
        color: toneInk(pick),
        fontSize: Math.max(10, Math.round(size * 0.34)),
      }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

export function Progress({ value = 0, tone = "primary", height = 6, className = "", label }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor: "var(--ad-muted)" }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: toneFg(tone) }}
      />
    </div>
  );
}

export function Delta({ value, suffix = "", invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-500"
      style={{ color: good ? "var(--ad-success)" : "var(--ad-destructive)" }}
    >
      <Icon name={up ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
      <Num>
        {up ? "+" : ""}
        {value}%
      </Num>
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/* Solid coloured KPI tile — the four blocks at the top of a dashboard.
   `tone` names a semantic token; `color` is the legacy escape hatch the
   subscription screens still pass and is left working on purpose rather than
   silently repainting a page this phase does not own. */
export function KpiTile({ label, value, delta, deltaLabel, icon, tone = "primary", color }) {
  return (
    <div
      className="rounded-geex p-6 text-white"
      style={{ backgroundColor: color || toneFg(tone) }}
    >
      <div className="flex items-center gap-4">
        {icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm text-white/80">{label}</p>
          <Num as="p" className="mt-0.5 text-2xl font-700 leading-tight">
            {value}
          </Num>
          {/* A tile with no delta still keeps its third line if it has something
              to say there. Dropping the line entirely made the tile change
              height and told the reader nothing about why. */}
          {delta != null ? (
            <p className="mt-1 text-xs text-white/75">
              <Num>
                {delta >= 0 ? "+" : ""}
                {delta}%
              </Num>{" "}
              {deltaLabel}
            </p>
          ) : deltaLabel ? (
            <p className="mt-1 text-xs text-white/60">{deltaLabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* Neutral stat card on the card surface. */
export function StatCard({ label, value, delta, deltaLabel, icon, tone = "primary" }) {
  return (
    <Card>
      <CardBody full className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">{label}</p>
          <Num as="p" className="mt-1.5 text-xl font-700">
            {value}
          </Num>
          {delta !== undefined ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Delta value={delta} />
              {deltaLabel ? <span className="text-xs text-[var(--ad-muted-foreground)]">{deltaLabel}</span> : null}
            </div>
          ) : null}
        </div>
        {icon ? (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: toneBg(tone), color: toneInk(tone) }}
          >
            <Icon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
      </CardBody>
    </Card>
  );
}

/* ---- skeletons ----------------------------------------------------------- */
//
// A skeleton's job is to RESERVE THE BOX. Every one of these takes the same
// dimensions as the thing it stands in for, so what arrives lands where the
// placeholder stood instead of shoving the page down — which is the entire
// reason to prefer a skeleton to a spinner. A spinner reserves nothing.
//
// `aria-busy` and a label go on the REGION, not on each bar: a screen reader
// should hear "loading users", once, not forty anonymous graphics.

export function Skeleton({ className = "", style }) {
  return <span className={`ad-skel block ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 1, className = "", widths = [] }) {
  return (
    <span className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="ad-skel ad-skel-text block" style={{ width: widths[i] || "100%" }} />
      ))}
    </span>
  );
}

/* Shaped to StatCard exactly: same padding, same 10×10 icon tile, a label bar at
   the label's height and a value bar at the value's. */
export function StatCardSkeleton() {
  return (
    <Card>
      <CardBody full className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="ad-skel-text h-2.5 w-24" />
          <Skeleton className="mt-2.5 h-5 w-20 rounded-md" />
          <Skeleton className="ad-skel-text mt-3 h-2.5 w-28" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </CardBody>
    </Card>
  );
}

/* ---- table --------------------------------------------------------------- */
//
// Semantic <table> — for SUMMARY tables: a handful of derived rows, a footer
// that has to add up, no sorting and no paging. List surfaces that a person
// actually works in (users, studios, orders) are MUI Data Grids instead; see
// src/components/super/SuperDataGrid.js.

export function Table({ head = [], children, className = "", caption }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="ad-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {head.length ? (
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col" className={h.align === "end" ? "text-end" : undefined}>
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
      <h3 className="text-base font-700">{title}</h3>
      {sub ? <p className="mt-1 max-w-sm text-sm text-[var(--ad-muted-foreground)]">{sub}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { Icon };
