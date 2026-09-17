// STOCK AGAINST ITS REORDER LEVEL — the pure half (17/09/2026). Client-safe:
// the Inventory and Point of Sale dashboards draw their "Stock to reorder" lists
// with the same rules the server alerts on (./stockAlerts), so the two cannot
// disagree about what is low.

import type { Item } from "./types";

// WHAT "CLOSE TO" MEANS: within NEAR_MARGIN above the level — 20%, so an item
// reordered at 10 is listed from 12. An item with no level is never listed:
// nothing says when it is low.
export const NEAR_MARGIN = 0.2;

export type StockState = "below" | "near" | "ok";

/** At or under the level is `below`; within the margin above it, `near`. */
export function stockState(onHand: unknown, level: unknown, margin = NEAR_MARGIN): StockState {
  const lvl = Number(level) || 0;
  if (lvl <= 0) return "ok";
  const have = Number(onHand) || 0;
  if (have <= lvl) return "below";
  return have <= Math.round(lvl * (1 + margin) * 1000) / 1000 ? "near" : "ok";
}

/** Whether a movement took an item from above its level to at or under it. */
export const fellToLevel = (before: number, after: number, level: unknown) => {
  const lvl = Number(level) || 0;
  return lvl > 0 && before > lvl && after <= lvl;
};

export type ReorderRow = {
  itemId: string;
  name: string;
  sku: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
  state: Exclude<StockState, "ok">;
};

/** Everything at or near its level: under first, then the closest to running out. */
export function reorderList(
  items: readonly Pick<Item, "id" | "name" | "sku" | "unit" | "reorderLevel">[],
  onHand: Readonly<Record<string, number>>,
  margin = NEAR_MARGIN,
): ReorderRow[] {
  const out: ReorderRow[] = [];
  for (const i of items) {
    const have = Number(onHand[i.id]) || 0;
    const state = stockState(have, i.reorderLevel, margin);
    if (state === "ok") continue;
    out.push({
      itemId: i.id, name: String(i.name || ""), sku: String(i.sku || ""), unit: String(i.unit || ""),
      onHand: have, reorderLevel: Number(i.reorderLevel) || 0, state,
    });
  }
  const ratio = (r: ReorderRow) => r.onHand / r.reorderLevel;
  return out.sort((a, b) => (a.state === b.state ? 0 : a.state === "below" ? -1 : 1) || ratio(a) - ratio(b) || a.name.localeCompare(b.name));
}
