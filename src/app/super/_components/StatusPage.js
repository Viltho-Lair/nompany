import Link from "next/link";
import Icon from "./Icon";
import { BASE } from "./nav";

// Shared full-bleed screen for the error / maintenance family: a big glyph, a
// code, a headline and one or two actions. Same surface tokens as the console,
// so these follow the site theme too.

const TONES = {
  primary: { bg: "rgba(70,128,255,.12)", fg: "var(--ad-primary)" },
  warning: { bg: "rgba(229,138,0,.14)", fg: "var(--ad-warning)" },
  danger: { bg: "rgba(220,38,38,.14)", fg: "var(--ad-destructive)" },
  muted: { bg: "var(--ad-muted)", fg: "var(--ad-muted-foreground)" },
  info: { bg: "rgba(4,169,245,.14)", fg: "var(--ad-info)" },
};

export default function StatusPage({
  code,
  icon = "alert",
  tone = "primary",
  title,
  body,
  primaryAction = { label: "Back to Dashboard", href: `${BASE}/dashboard/analytics` },
  secondaryAction,
  extra,
}) {
  const t = TONES[tone] || TONES.primary;
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute left-[12%] top-[18%] h-[280px] w-[280px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05]" />
        <span className="absolute bottom-[14%] right-[12%] h-[220px] w-[220px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05] [animation-delay:1.2s]" />
      </div>

      <div className="relative z-10 w-full max-w-[560px] text-center">
        <span
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ backgroundColor: t.bg, color: t.fg }}
        >
          <Icon name={icon} className="h-9 w-9" strokeWidth={1.5} />
        </span>

        {code ? (
          <p className="text-6xl font-bold tracking-tight sm:text-8xl" style={{ color: t.fg }}>
            {code}
          </p>
        ) : null}

        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--ad-muted-foreground)]">{body}</p>

        {extra ? <div className="mt-8">{extra}</div> : null}

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <Link href={primaryAction.href} className="ad-btn ad-btn-primary">
              <Icon name="arrowLeft" className="h-4 w-4" />
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link href={secondaryAction.href} className="ad-btn ad-btn-outline">
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
