// Pure, client-safe analytics for the Technical dashboard. Every function takes
// the already-fetched lists /api/studios/<slug>/technical returns and gives back
// plain data the widgets draw. No fetching and no formatting happen here.

import { RFQ_STATUSES } from "./rfqs";
import { QUOTATION_STATUSES } from "./quotations";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Whole days between two timestamps, floored at zero — a record completed the
// same day took zero days, not a negative number.
export function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

// Counts per quotation status, plus the total, for the dashboard's tiles.
export function quotationStats(quotations) {
  const counts = { total: quotations.length };
  for (const s of QUOTATION_STATUSES) counts[s] = 0;
  for (const q of quotations) if (counts[q.status] !== undefined) counts[q.status] += 1;
  return counts;
}

// RFQs by workflow status: New → In-review → Converted, with Rejected shown
// alongside rather than as a stage.
export function rfqFunnel(rfqs) {
  return RFQ_STATUSES.map((s) => ({ label: s, value: rfqs.filter((r) => r.status === s).length }));
}

// Urgency breakdown for anything carrying an `urgency` — quotations or RFQs.
// Fixed order, so the bars don't reshuffle as the data changes.
export function urgencyBreakdown(items) {
  const order = ["Critical", "High", "Normal", "Low"];
  const counts = Object.fromEntries(order.map((u) => [u, 0]));
  for (const it of items) {
    const u = it.urgency || "Normal";
    if (counts[u] !== undefined) counts[u] += 1;
  }
  return order.map((u) => ({ label: u, value: counts[u] }));
}

// Who is carrying the work. `nameOf` resolves a handler to a display name —
// handlers are collaborator ids, but older rows hold a typed-in name, so
// whatever cannot be resolved is shown as it was written.
export function handlerLeaderboard(quotations, nameOf) {
  const by = new Map();
  for (const q of quotations) {
    const id = q.handledBy || "unassigned";
    if (!by.has(id)) by.set(id, { id, total: 0, approved: 0, open: 0 });
    const row = by.get(id);
    row.total += 1;
    if (q.status === "Approved") row.approved += 1;
    if (q.status === "Draft" || q.status === "Sent") row.open += 1;
  }
  return [...by.values()]
    .map((r) => ({ ...r, name: r.id === "unassigned" ? "Unassigned" : nameOf(r.id) }))
    .sort((a, b) => b.total - a.total || b.approved - a.approved);
}

// New quotations per day over the last `days`, bucketed so the line keeps a
// stable x axis even across days when nothing happened.
export function quotationTimeline(quotations, days = 30) {
  // Buckets are keyed by UTC day, because that is what `createdAt.slice(0, 10)`
  // is. Walking back from LOCAL midnight instead shifts every key a day earlier
  // for anyone east of UTC — which silently drops today's quotations off the end
  // of the window, since nothing would be keyed with today's UTC date at all.
  const now = new Date();
  const endOfWindow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // ONE BUCKET PER DAY, seeded at zero so a day with nothing in it draws as a
  // gap rather than being missing from the series.
  const buckets: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ date: new Date(endOfWindow - i * 86400000).toISOString().slice(0, 10), value: 0 });
  }
  const byDate = new Map(buckets.map((b) => [b.date, b] as [string, { date: string; value: number }]));
  for (const q of quotations) {
    const key = String(q.createdAt || "").slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) bucket.value += 1;
  }
  // Labels are day-and-month only; the year is the same across a 30-day window.
  return buckets.map((b) => ({ label: b.date.slice(5), value: b.value }));
}

// One dot per approved quotation: x is its place in creation order, y is how
// many days it took to get there.
export function completionScatter(quotations) {
  return quotations
    .filter((q) => q.completedAt && q.createdAt)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((q, i) => ({ x: i, y: daysBetween(q.createdAt, q.completedAt), label: q.number }));
}

// Average turnaround across everything that has been approved, or null when
// nothing has — which is a different thing from zero days.
export function averageTurnaround(quotations) {
  const done = quotations.filter((q) => q.completedAt && q.createdAt);
  if (done.length === 0) return null;
  return Math.round(done.reduce((a, q) => a + daysBetween(q.createdAt, q.completedAt), 0) / done.length);
}

// What the whole pipeline is worth, and how much of it has been approved.
export function quotationValue(quotations) {
  const all = quotations.reduce((a, q) => a + num(q.total), 0);
  const approved = quotations.filter((q) => q.status === "Approved").reduce((a, q) => a + num(q.total), 0);
  return { all, approved };
}

// An RFQ nobody has picked up: still New, so it is what the queue's amber
// stripe marks and what Technical owes Sales an answer on.
export const isUnworked = (rfq) => rfq?.status === "New";
