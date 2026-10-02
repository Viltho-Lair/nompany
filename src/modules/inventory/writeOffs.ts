// WHAT WAS WRITTEN OFF — damaged, expired, lost, counted short (the owner,
// 02/10/2026).
//
// A WRITE-OFF IS AN ADJUSTMENT THAT TOOK STOCK AWAY. Nothing else is one: a
// sale, a delivery note and a part issued to a work order all leave the shelf
// for a reason somebody was paid or charged for. An adjustment downward is
// stock that is simply gone, and until now the ledger kept each one and nothing
// added them up — a studio could not say what it loses to expiry.
//
// THE REASON IS THE MOVEMENT'S OWN (`cause`, ./sealedLoose). One written before
// reasons existed, or under "Other", is counted under "" rather than guessed
// from its free-text note.
//
// WHAT IT WAS WORTH is the cost a unit carried THE DAY IT WAS WRITTEN OFF, kept
// on the movement. A movement older than that has no such figure, and is valued
// at the item's cost today and COUNTED as estimated — a repricing since would
// otherwise restate a loss already booked without anybody seeing it. An item
// with no cost at all is unvalued, and said, never valued at nought.
//
// PURE. No store and no clock: the service hands in the movements with the
// studio's own day already on each.

import { ADJUST_CAUSES } from "./sealedLoose";

export type WriteOffMovement = {
  id?: string; itemId: string; kind: string; qty: number; at: string;
  /** The studio's own date for `at` (shared/timezone) — what a period is cut by. */
  day: string;
  cause?: string; reason?: string; unitCost?: number; byCollaboratorId?: string;
};
export type WriteOffItem = { id: string; name?: string; sku?: string; unit?: string; unitCost?: number };

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const positive = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/** An adjustment that took stock away. */
export const isWriteOff = (m: Pick<WriteOffMovement, "kind" | "qty">) => m.kind === "adjust" && Number(m.qty) < 0;

/** The reason a movement carries, or "" for none of the named ones. */
export const causeOf = (m: Pick<WriteOffMovement, "cause">) =>
  ((ADJUST_CAUSES as readonly string[]).includes(String(m.cause)) ? String(m.cause) : "");

/**
 * THE REPORT for a period, both ends inclusive and either end open ("" is no
 * bound). Rows newest first; reasons and items by value, largest first.
 */
export function writeOffReport(
  movements: readonly WriteOffMovement[],
  items: readonly WriteOffItem[],
  period: { from: string; to: string },
  round: (n: number) => number = round3,
) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows = movements
    .filter(isWriteOff)
    .filter((m) => (!period.from || m.day >= period.from) && (!period.to || m.day <= period.to))
    .map((m) => {
      const item = byId.get(m.itemId);
      const units = round3(Math.abs(Number(m.qty)));
      const then = positive(m.unitCost);
      const now = positive(item?.unitCost);
      const cost = then || now;
      return {
        id: m.id || "", at: m.at, day: m.day, itemId: m.itemId,
        name: item?.name || "", sku: item?.sku || "", unit: item?.unit || "",
        units, cause: causeOf(m), reason: String(m.reason || ""),
        byCollaboratorId: String(m.byCollaboratorId || ""),
        // NULL IS NOT NOUGHT: an item nobody costed lost something worth an unknown amount.
        value: cost ? round(units * cost) : null,
        estimated: !then && !!now,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  const causes = new Map<string, { cause: string; entries: number; value: number }>();
  const perItem = new Map<string, { itemId: string; name: string; sku: string; unit: string; units: number; value: number; entries: number }>();
  let total = 0;
  let unvalued = 0;
  let estimated = 0;
  for (const r of rows) {
    const c = causes.get(r.cause) || { cause: r.cause, entries: 0, value: 0 };
    c.entries += 1;
    c.value = round(c.value + (r.value || 0));
    causes.set(r.cause, c);
    const i = perItem.get(r.itemId) || { itemId: r.itemId, name: r.name, sku: r.sku, unit: r.unit, units: 0, value: 0, entries: 0 };
    i.units = round3(i.units + r.units);
    i.value = round(i.value + (r.value || 0));
    i.entries += 1;
    perItem.set(r.itemId, i);
    total = round(total + (r.value || 0));
    if (r.value === null) unvalued += 1;
    if (r.estimated) estimated += 1;
  }
  const byValue = <T extends { value: number; entries: number }>(a: T, b: T) => b.value - a.value || b.entries - a.entries;
  return {
    from: period.from, to: period.to,
    entries: rows.length, total, unvalued, estimated,
    byCause: [...causes.values()].sort(byValue),
    byItem: [...perItem.values()].sort(byValue),
    rows,
  };
}

/** The periods the screen offers. The server turns one into days, in the studio's own time. */
export const WRITE_OFF_PERIODS = ["month", "last-month", "year", "all"] as const;
export type WriteOffPeriod = (typeof WRITE_OFF_PERIODS)[number];

/** The first and last day of a period, given the studio's own today (YYYY-MM-DD). */
export function periodDays(period: WriteOffPeriod, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (period === "all") return { from: "", to: "" };
  if (period === "year") return { from: `${y}-01-01`, to: today };
  if (period === "last-month") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    // Day 0 of this month is the last day of the one before it.
    const last = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
    return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` };
  }
  return { from: `${y}-${pad(m)}-01`, to: today };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day written YYYY-MM-DD, or "". "2026-02-31" is not one. */
const dayOr = (v: unknown): string => {
  const s = String(v ?? "").trim();
  if (!DAY.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
};

/**
 * THE DAYS SOMEBODY CHOSE THEMSELVES, or null when they chose none. Either end
 * may be left open. Ends typed the wrong way round are swapped rather than
 * answered with an empty report that reads as "nothing was written off".
 */
export function customDays(from: unknown, to: unknown): { from: string; to: string } | null {
  const a = dayOr(from);
  const b = dayOr(to);
  if (!a && !b) return null;
  return a && b && a > b ? { from: b, to: a } : { from: a, to: b };
}
