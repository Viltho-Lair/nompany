// ANALYTICS IS PAID. A studio's tier buys a RUNG, and each dashboard widget
// belongs to a rung; a studio sees the widgets at or below its rung and a locked
// teaser for the ones above (naming what it would show, so the value is visible
// and the upgrade is obvious). This is the one place the ladder is defined.
//
// The names are deliberate — "basic / simple / moderate / advanced" — because
// "standard" and "basic" read as the same rung and one of them had to go.

export const ANALYTICS_LEVELS = ["basic", "simple", "moderate", "advanced"] as const;
export type AnalyticsLevel = (typeof ANALYTICS_LEVELS)[number];

const RANK: Record<string, number> = { basic: 0, simple: 1, moderate: 2, advanced: 3 };

/** The rung a resolved plan (from planOf) is entitled to; "basic" is the floor. */
export function analyticsLevelOf(plan: { analyticsLevel?: string } | null | undefined): AnalyticsLevel {
  const v = plan?.analyticsLevel;
  return (v && v in RANK ? v : "basic") as AnalyticsLevel;
}

/**
 * May a studio on `have` see a widget whose rung is `need`? A rung includes
 * everything below it, so "moderate" sees basic, simple and moderate widgets and
 * a locked teaser for advanced. An unknown rung is treated as the floor so a
 * typo never hides a free widget or unlocks a paid one.
 */
export function analyticsAllows(have: string | undefined, need: string | undefined): boolean {
  const h = have && have in RANK ? RANK[have] : 0;
  const n = need && need in RANK ? RANK[need] : 0;
  return h >= n;
}
