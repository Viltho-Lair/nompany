// WHAT A PROJECT STILL NEEDS TO BUY, read off its Bulk sheet — pure.
//
// THE OWNER'S RULE IS "MATERIAL COMES FROM WHAT WAS QUOTED", and the Bulk sheet
// is already that rule drawn as a purchase list: every item the project sold,
// summed across the quotation's tables and grouped by the supplier it is bought
// from. Nothing turned it into a request to buy. `raiseFromBulk` does now, one
// requisition per supplier, so the spending control a requisition exists for
// still stands between the sheet and the supplier (tier 5, the owner's choice).
//
// PRESSING IT TWICE MUST NOT BUY TWICE. Nothing links an order back to a sheet
// row, so "needed" is worked out from what is already ASKED FOR: every live
// requisition for this project and every live order no requisition sits behind.
// A second press finds the first one's requisitions and asks for nothing.
//
// PURE, so tests/requisition-model.mjs holds the arithmetic without a store.

/** The requisition states that still stand for the quantity on them. */
export const LIVE_REQUISITION = new Set(["Draft", "Submitted", "Approved", "Ordered"]);

type Line = { itemId?: unknown; qty?: unknown };

/**
 * HOW MUCH OF EACH ITEM THIS PROJECT HAS ALREADY ASKED FOR.
 *
 * A requisition counts while it is live — a rejected or cancelled one asked for
 * nothing. An order counts only when no requisition is behind it (a direct
 * order, or one raised before requisitions existed): an order converted from a
 * requisition is that requisition's quantity, already counted once.
 */
export function askedFor(
  projectId: string,
  requisitions: { projectId?: unknown; status?: unknown; lines?: unknown }[],
  orders: { projectId?: unknown; status?: unknown; requisitionId?: unknown; lines?: unknown }[],
): Map<string, number> {
  const out = new Map<string, number>();
  const add = (lines: unknown) => {
    for (const l of (Array.isArray(lines) ? lines : []) as Line[]) {
      const itemId = String(l?.itemId || "");
      const qty = Number(l?.qty) || 0;
      if (itemId && qty > 0) out.set(itemId, (out.get(itemId) || 0) + qty);
    }
  };
  for (const r of requisitions) {
    if (String(r.projectId || "") === projectId && LIVE_REQUISITION.has(String(r.status || ""))) add(r.lines);
  }
  for (const o of orders) {
    if (String(o.projectId || "") !== projectId || String(o.status || "") === "Cancelled") continue;
    if (String(o.requisitionId || "")) continue;
    add(o.lines);
  }
  return out;
}

export type BulkRow = {
  itemId?: string;
  description?: string;
  modelNumber?: string;
  unit?: string;
  qty?: number;
  serials?: string[];
};
export type BulkGroup = { id: string; title: string; rows: BulkRow[] };
export type VendorNeed = {
  vendorId: string;
  vendorName: string;
  lines: { itemId: string; description: string; unit: string; qty: number }[];
};

/**
 * THE REQUISITIONS A BULK SHEET CALLS FOR — one per supplier, each line what is
 * still short: sold, less what is already allocated from stock (a serial on the
 * row), less what is already asked for.
 *
 * WHAT CANNOT BE ASKED FOR IS COUNTED, NOT DROPPED. A line with no Registered
 * Item cannot become an order (Inventory's `cleanLines` refuses it), and one
 * whose item names no supplier has nobody to ask — so both are reported as
 * `skipped` for the screen to say, rather than disappearing from a list that
 * then reads as complete. Every line of a project handed over from a tender is
 * one of these today (a bill line names no item).
 */
export function bulkNeeds(groups: BulkGroup[], asked: Map<string, number>): { needs: VendorNeed[]; skipped: number } {
  const needs: VendorNeed[] = [];
  let skipped = 0;
  for (const group of groups) {
    const lines: VendorNeed["lines"] = [];
    for (const row of group.rows || []) {
      const itemId = String(row.itemId || "");
      const allocated = Array.isArray(row.serials) ? row.serials.length : 0;
      const short = Math.max(0, (Number(row.qty) || 0) - allocated - (itemId ? asked.get(itemId) || 0 : 0));
      if (short <= 0) continue;
      if (!itemId || group.id === "unassigned") { skipped += 1; continue; }
      lines.push({
        itemId,
        description: String(row.description || row.modelNumber || ""),
        unit: String(row.unit || ""),
        qty: short,
      });
    }
    if (lines.length) needs.push({ vendorId: group.id, vendorName: group.title, lines });
  }
  return { needs, skipped };
}
