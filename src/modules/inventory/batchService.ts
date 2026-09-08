// THE BATCH REGISTER — the store half of `./batches`, which holds the rules.
//
// NO PERMISSION KEY OF ITS OWN, for the reason a bin has none: a batch is how
// the stock is labelled, so it answers to `inventory.stock`, the right somebody
// already holds to move what carries the label.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import {
  batchProblems, cleanBatch, batchView, batchBalances, expiryAlerts, fefoSuggestion,
  serialStates, serialGap,
} from "./batches";
import type { Batch } from "./batches";
import { movementDelta } from "./bins";
import type { BinMovement } from "./bins";
import type { InventoryContext } from "./types";

const Batches = repo<Batch>("stockBatches");
const Stock = repo<BinMovement>("inventoryStock");
const Items = repo<{ id: string; sku?: string; name?: string; serials?: string[] }>("inventoryItems");
const Sheets = repo<{ lines?: Record<string, { serials?: string[] }> }>("projectSheets");

const scope = (ctx: InventoryContext) => ({ studio: ctx.studio, section: ctx.stockSection });

/**
 * THE REGISTER, plus what is about to go out of date and which unit is where.
 *
 * `asOf` IS READ ONCE, HERE, and travels in the response. A screen that read its
 * own clock would disagree with the server across midnight and after a tab had
 * been open all day — the rule the tender register already follows.
 */
export async function listBatches(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;

  const [batches, movements, items] = await Promise.all([
    Batches.find(scope(ctx)),
    Stock.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
  ]);

  const asOf = new Date().toISOString().slice(0, 10);
  const rows = batchView(batches, movements, asOf);
  const label = Object.fromEntries(items.map((i) => [i.id, `${i.sku || ""} · ${i.name || ""}`.trim()]));
  const named = rows.map((b) => ({ ...b, itemLabel: label[b.itemId] || "(removed item)" }));

  const { untracked } = batchBalances(movements, new Set(batches.map((b) => b.id)));

  return {
    asOf,
    batches: named,
    // WHAT TO ACT ON TODAY, separated rather than left for somebody to spot in
    // a list: an expiry nobody looks for is an expiry found by picking the drum
    // up, which is after it has been counted, valued and promised to a job.
    alerts: expiryAlerts(named),
    // WHICH BATCH TO PICK NEXT for each item that has one. A suggestion, never
    // a rule — see `fefoSuggestion`.
    fefo: items
      .map((i) => ({ itemId: i.id, itemLabel: label[i.id] || "", batch: fefoSuggestion(i.id, named) }))
      .filter((f) => f.batch),
    // Stock the ledger knows about that carries no batch. Every movement
    // written before this existed is here, so it is a first-class total rather
    // than a leftover — the same shape `unbinned` takes.
    untracked: Object.entries(untracked)
      .filter(([, qty]) => qty !== 0)
      .map(([itemId, qty]) => ({ itemId, itemLabel: label[itemId] || "(removed item)", qty })),
    items: items.map((i) => ({ id: i.id, label: label[i.id] })),
    canManage: ctx.canManageStock,
  };
}

/**
 * EVERY SERIAL AND WHAT STATE IT IS IN — a join of what already existed.
 *
 * `item.serials` has recorded which units are held since Inventory was written
 * and a sheet has been able to allocate one for nearly as long; nothing put the
 * two together, so "is this unit spoken for" meant opening every sheet in the
 * studio.
 */
export async function listSerials(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;

  const [items, movements, sheets] = await Promise.all([
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
    Stock.find(scope(ctx)),
    Sheets.find({ studio: ctx.studio, section: ctx.sheetsSection }),
  ]);

  // Every serial spoken for anywhere in the studio. One unit cannot be on two
  // jobs, so this is studio-wide rather than per sheet.
  const allocated = new Set<string>();
  for (const sheet of sheets) {
    for (const line of Object.values(sheet.lines || {})) {
      for (const sn of line?.serials || []) allocated.add(sn);
    }
  }

  // `movementDelta` rather than the same expression a fourth time: what a
  // movement contributes is one rule, and four copies of it are four things to
  // remember the day a kind is added.
  const onHand: Record<string, number> = {};
  for (const m of movements) {
    onHand[m.itemId] = Math.round(((onHand[m.itemId] || 0) + movementDelta(m)) * 1000) / 1000;
  }

  return {
    items: items
      .filter((i) => (i.serials || []).length > 0)
      .map((i) => ({
        id: i.id,
        label: `${i.sku || ""} · ${i.name || ""}`.trim(),
        serials: serialStates(i.serials || [], allocated),
        // THE LEDGER AND THE LIST DISAGREEING is worth saying out loud: the gap
        // is the number of units nobody can trace back to a serial.
        gap: serialGap(i.serials || [], onHand[i.id] || 0),
      })),
  };
}

export async function createBatch(ctx: InventoryContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const [existing, items] = await Promise.all([
    Batches.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
  ]);
  const problems = batchProblems(body, { items, existing });
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  return { batch: await Batches.create(scope(ctx), cleanBatch(body)) };
}

export async function editBatch(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const [existing, items] = await Promise.all([
    Batches.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
  ]);
  const row = existing.find((b) => b.id === id);
  if (!row) return { error: "notfound" };

  // THE WHOLE BATCH IS REVALIDATED, not just the fields that arrived: both
  // uniqueness and the expiry-after-receipt rule are properties of the RESULT,
  // and an edit that moved one date past the other would otherwise pass.
  const next = {
    itemId: row.itemId,     // an item is not re-pointed; that is a different batch
    lot: body.lot ?? row.lot,
    expiresOn: body.expiresOn ?? row.expiresOn,
    receivedOn: body.receivedOn ?? row.receivedOn,
  };
  const problems = batchProblems(next, { items, existing, selfId: id });
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const updated = await Batches.update(scope(ctx), id, cleanBatch(next));
  return updated ? { batch: updated } : { error: "notfound" };
}

/**
 * DELETING A BATCH CASCADES NOTHING, and a batch still holding something is
 * refused — the two rules a bin follows, for the two reasons a bin follows them.
 */
export async function deleteBatch(ctx: InventoryContext, id: string) {
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const [batches, movements] = await Promise.all([Batches.find(scope(ctx)), Stock.find(scope(ctx))]);
  const row = batches.find((b) => b.id === id);
  if (!row) return { error: "notfound" };

  const held = batchBalances(movements, new Set(batches.map((b) => b.id))).byBatch[id] || {};
  if (Object.values(held).some((q) => q !== 0)) return { error: "not-empty" };

  await Batches.remove(scope(ctx), id);
  return { ok: true };
}
