// THE EXECUTIVE OVERVIEW — cross-section trends for the studio's front door.
// Pure derivations live here; readAggregate() (Task 4) is the seam the route
// reads through, so a rollup can back it later without touching a widget (spec
// §4.0). Every read still passes through main.ts's readIfVisible, so a section
// the viewer cannot see contributes nothing — not a zero, nothing (invariant 2).

import type { Row } from "@/platform/db/store";
import { readIfVisible } from "./main";
import type { MainContext } from "./main";

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
  const end = new Date(`${asOf}T00:00:00Z`);
  const series: { label: string; value: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
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

// The sections Main tracks, and the collection each activity series counts.
const ACTIVITY_SOURCES: { section: string; fallback: string | null; collection: string }[] = [
  { section: "sales-tickets", fallback: "sales", collection: "salesTickets" },
  { section: "technical-quotations", fallback: "technical", collection: "quotations" },
  { section: "technical-rfq", fallback: "technical", collection: "rfqs" },
  { section: "projects-list", fallback: "projects", collection: "projects" },
  { section: "inventory-items", fallback: "inventory", collection: "inventoryItems" },
  { section: "tasks", fallback: null, collection: "tasks" },
];

export type ExecutiveAggregate = {
  activity: { section: string; series: { label: string; value: number }[] }[];
  ribbon: { label: string; value: number }[];
  trends: { key: string; current: number; previous: number; deltaPct: number | null }[];
};

/**
 * THE SEAM. deriveExecutive reads through here; Phase 2 swaps this body for one
 * HGETALL of the rollup with no widget change (spec §4.0). Every source is read
 * through readIfVisible, so an unreadable section yields null and contributes
 * nothing to activity, ribbon or trends.
 */
export async function readAggregate(
  ctx: MainContext,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<ExecutiveAggregate> {
  const lists = await Promise.all(
    ACTIVITY_SOURCES.map((s) => readIfVisible(ctx, s.section, s.fallback, s.collection)),
  );
  const activity: ExecutiveAggregate["activity"] = [];
  const combined: (Row & { createdAt?: string })[] = [];
  const trends: ExecutiveAggregate["trends"] = [];
  const period = trailingTwoMonths(asOf);
  lists.forEach((rows, i) => {
    if (!rows) return; // not visible — nothing, not a zero
    const src = ACTIVITY_SOURCES[i];
    activity.push({ section: src.section, series: activityByDay(rows as Dated[], 30, asOf) });
    trends.push({ key: src.section, ...periodDelta(rows as Dated[], "createdAt", period) });
    combined.push(...(rows as (Row & { createdAt?: string })[]));
  });
  return { activity, ribbon: activityByDay(combined as Dated[], 30, asOf), trends };
}

/**
 * Two calendar months ending at asOf: [start, mid) prior, [mid, end) current.
 * UTC throughout — activityByDay and periodDelta above already do their date
 * math in UTC (fixed after a timezone bug), so mixing in local-time
 * `new Date(y, m, 1)` here while still comparing against `.toISOString()`
 * slices would reintroduce the same class of bug this file was already fixed
 * for: a studio west of UTC would see its month boundary shift by a day.
 */
function trailingTwoMonths(asOf: string): { start: string; mid: string; end: string } {
  const end = new Date(`${asOf}T00:00:00Z`);
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const mid = new Date(Date.UTC(y, m, 1));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(end.getUTCDate() + 1);
  return { start: iso(start), mid: iso(mid), end: iso(endExclusive) };
}
