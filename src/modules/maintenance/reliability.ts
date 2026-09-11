// HOW RELIABLE EACH MACHINE IS, purely — no store, no clock.
//
// Three figures, each defined the way the literature defines it and each null
// when it has no honest value (the earned-value rule: zero is a real answer to
// every one of these, and "we do not know" is a different one):
//
//   MTBF          operating hours in the window ÷ failures in it. No failure,
//                 no MTBF — not infinity.
//   MTTR          mean of (back in service − down since) over repairs with both
//                 ends recorded. From DOWNTIME, not labour: a repair that took an
//                 hour's work after three days waiting for a part kept the
//                 machine down three days, and that is what MTTR measures.
//   Availability  (window − downtime) ÷ window. Null for a machine with no work
//                 recorded in the window at all, because "never down" and
//                 "nobody records anything against it" read the same otherwise.
//
// A FAILURE is corrective work that was not cancelled, dated by when the
// machine went down (or, failing that, when the order was raised). Preventive
// and inspection work are not failures; that is the point of them.
//
// THE WINDOW IS THE LAST YEAR by default — long enough to hold a seasonal
// pattern, short enough that a machine rebuilt two years ago is judged on what
// it has done since. Downtime is clipped to it, and an open repair counts up to
// `now`.

import { orderOpen } from "./model";

type OrderLike = {
  assetId?: unknown; type?: unknown; status?: unknown; createdAt?: unknown;
  downSince?: unknown; upAt?: unknown; failure?: unknown;
};

const text = (v: unknown) => String(v ?? "").trim();
const HOUR = 3_600_000;
const round = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places;

export type Reliability = {
  failures: number;
  downtimeHours: number;
  mttrHours: number | null;
  mtbfHours: number | null;
  availability: number | null;
  openOrders: number;
  lastFailureAt: string;
  topProblems: { problem: string; count: number }[];
};

/**
 * Every machine that has work recorded against it, keyed by asset id.
 *
 * DOWNTIME ON TWO ORDERS THAT OVERLAP IS COUNTED TWICE. Two orders for one
 * machine down at once is rare and is itself worth seeing; merging intervals
 * would hide it. Said here so the figure is not mistaken for an exact one.
 */
export function reliabilityByAsset(orders: readonly OrderLike[], now: string, windowDays = 365): Map<string, Reliability> {
  const end = Date.parse(now);
  const start = end - windowDays * 24 * HOUR;
  const windowHours = windowDays * 24;
  const byAsset = new Map<string, OrderLike[]>();
  for (const o of orders) {
    const id = text(o.assetId);
    if (!id) continue;
    byAsset.set(id, [...(byAsset.get(id) || []), o]);
  }

  const out = new Map<string, Reliability>();
  for (const [id, list] of byAsset) {
    let downtime = 0;
    let recordedInWindow = false;
    const repairs: number[] = [];
    const failures: OrderLike[] = [];
    for (const o of list) {
      const raised = Date.parse(text(o.createdAt));
      const down = Date.parse(text(o.downSince));
      const up = Date.parse(text(o.upAt));
      const when = Number.isFinite(down) ? down : raised;
      if (Number.isFinite(when) && when >= start && when <= end) recordedInWindow = true;

      if (Number.isFinite(down)) {
        const to = Number.isFinite(up) ? up : end;
        const clipped = Math.min(to, end) - Math.max(down, start);
        if (clipped > 0) downtime += clipped / HOUR;
        if (Number.isFinite(up) && up >= down && down >= start) repairs.push((up - down) / HOUR);
      }
      if (text(o.type) === "corrective" && text(o.status) !== "Cancelled"
        && Number.isFinite(when) && when >= start && when <= end) {
        failures.push(o);
      }
    }

    const counts = new Map<string, number>();
    for (const f of failures) {
      const p = text((f.failure as { problem?: unknown } | undefined)?.problem);
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    }
    const lastFailure = failures
      .map((f) => text(f.downSince) || text(f.createdAt))
      .sort()
      .pop() || "";

    out.set(id, {
      failures: failures.length,
      downtimeHours: round(downtime),
      mttrHours: repairs.length ? round(repairs.reduce((a, b) => a + b, 0) / repairs.length) : null,
      mtbfHours: failures.length ? round(Math.max(0, windowHours - downtime) / failures.length) : null,
      availability: recordedInWindow ? round(Math.max(0, (windowHours - downtime) / windowHours) * 100) : null,
      openOrders: list.filter((o) => orderOpen(o)).length,
      lastFailureAt: lastFailure,
      topProblems: [...counts.entries()]
        .map(([problem, count]) => ({ problem, count }))
        .sort((a, b) => b.count - a.count || a.problem.localeCompare(b.problem))
        .slice(0, 3),
    });
  }
  return out;
}
