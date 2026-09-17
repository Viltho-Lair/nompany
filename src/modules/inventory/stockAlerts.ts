// STOCK AT ITS REORDER LEVEL — who is told, and what the dashboards list
// (17/09/2026, the owner's decision). `docs/functionality/stock-alerts.md`.
//
// WHO: whoever holds `inventory.stock.alerts`. The studio's owner holds it
// by default (the Admin role holds everything); the owner gives it to anybody
// else on the Access screen. Nobody else is told, because a notice about stock
// somebody cannot reorder is noise to the one person who reads it.
//
// WHEN: the moment an item FALLS to or below its level — a sale, an issue, a
// delivery, a write-off — once per fall. An item that stays low is not
// re-announced on every later sale; it is on the dashboards' list until it is
// restocked, and the next fall after a restock is announced again.
//
// WHAT IS LOW is decided by ./stockLevels, which the dashboards share.

import { repo } from "@/platform/db/repo";
import type { Section } from "@/platform/db/sections";
import { notifyHolders } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import type { Item, Movement } from "./types";
import { fellToLevel } from "./stockLevels";

export { reorderList, stockState, NEAR_MARGIN } from "./stockLevels";
export type { ReorderRow, StockState } from "./stockLevels";

export const STOCK_ALERT_RIGHT = "inventory.stock.alerts";

// ---- telling people -----------------------------------------------------------

const Items = repo<Item>("inventoryItems");
const Stock = repo<Movement>("inventoryStock");

const balanceOf = (movements: readonly Movement[], itemId: string) => {
  let n = 0;
  for (const m of movements) {
    if (m.itemId !== itemId) continue;
    n += m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty);
  }
  return Math.round(n * 1000) / 1000;
};

/**
 * AFTER STOCK HAS LEFT: `taken` is each item's units that just went out
 * (positive). Reads the ledger as it now stands, works out what it stood at
 * before, and tells the holders about every item that has just reached its
 * level. BEST-EFFORT: the stock has already moved, and failing to announce it
 * must never fail the sale or the issue that moved it.
 */
export async function alertIfLow(
  studio: { id: string },
  { itemsSection, stockSection }: { itemsSection: Section | null; stockSection: Section | null },
  taken: Readonly<Record<string, number>>,
) {
  try {
    const ids = Object.keys(taken).filter((id) => Number(taken[id]) > 0);
    if (!ids.length || !itemsSection || !stockSection) return;
    const items = (await Items.find({ studio, section: itemsSection }, { where: { id: ids } }))
      .filter((i) => Number(i.reorderLevel) > 0);
    if (!items.length) return;
    const movements = await Stock.find({ studio, section: stockSection }, { where: { itemId: items.map((i) => i.id) } });
    for (const item of items) {
      const after = balanceOf(movements, item.id);
      const before = Math.round((after + Number(taken[item.id])) * 1000) / 1000;
      if (!fellToLevel(before, after, item.reorderLevel)) continue;
      const detail = `${item.name}${item.sku ? ` (${item.sku})` : ""}: ${after} ${item.unit || ""} left, reorder at ${item.reorderLevel}`.replace(/\s+/g, " ");
      await notifyHolders(studio.id, STOCK_ALERT_RIGHT, {
        type: NOTIFY.stockLow,
        title: "Stock at reorder level",
        body: detail,
        href: "inventory-stock",
        tone: after <= 0 ? "danger" : "warning",
        params: { detail },
      });
    }
  } catch { /* best-effort: see above */ }
}
