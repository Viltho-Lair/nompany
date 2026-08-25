// THE EXECUTIVE OVERVIEW — cross-section trends for the studio's front door.
// Pure derivations live here; readAggregate() (Task 4) is the seam the route
// reads through, so a rollup can back it later without touching a widget (spec
// §4.0). Every read still passes through main.ts's readIfVisible, so a section
// the viewer cannot see contributes nothing — not a zero, nothing (invariant 2).

import type { Row } from "@/platform/db/store";

type Dated = Row & { createdAt?: string; updatedAt?: string };

/**
 * Daily counts of rows CREATED in the last `days`, oldest-first, one entry per
 * day INCLUDING empty days so a sparkline has a stable x-axis. `asOf` is injected
 * rather than read from the clock so the function is testable.
 */
export function activityByDay(
  rows: Dated[],
  days = 30,
  asOf: string = new Date().toISOString().slice(0, 10),
): { label: string; value: number }[] {
  const end = new Date(`${asOf}T00:00:00`);
  const series: { label: string; value: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    index.set(key, series.length);
    series.push({ label: key, value: 0 });
  }
  for (const r of rows) {
    if (!r.createdAt) continue;
    const at = index.get(r.createdAt.slice(0, 10));
    if (at !== undefined) series[at].value += 1;
  }
  return series;
}

/**
 * This-window vs prior-window counts of a dated flow, plus the signed delta as a
 * percentage — NULL when the prior window is empty, because a percentage on a
 * zero base is a lie, not "+100%". Windows are half-open [start,mid) and [mid,end).
 */
export function periodDelta(
  rows: Dated[],
  field: "createdAt" | "updatedAt",
  period: { start: string; mid: string; end: string },
): { current: number; previous: number; deltaPct: number | null } {
  let current = 0;
  let previous = 0;
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    const d = v.slice(0, 10);
    if (d >= period.mid && d < period.end) current += 1;
    else if (d >= period.start && d < period.mid) previous += 1;
  }
  const deltaPct = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}
