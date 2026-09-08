// THE BIN REGISTER — the store half of `./bins`, which holds the rules.
//
// LOCATIONS ARE READ, NEVER WRITTEN, and they are Administration's rows. A bin
// names one; Inventory keeps no list of places of its own, because a second
// list would be free to disagree with the first about where the company works.
// The section is FOREIGN and therefore nullable: a studio that has not opened
// Administration's Master data has no locations, and the honest answer then is
// "you have nowhere to put a bin yet" rather than a bin floating in no place.
//
// NO PERMISSION KEY OF ITS OWN. A bin is how the warehouse is arranged, so it
// answers to `inventory.stock` — the right somebody already holds to move the
// stock that sits in it. A separate right over the shelving would be a right
// nobody could exercise without the first one anyway.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { binProblems, cleanBin, binView, binBalances, negativeBins } from "./bins";
import type { Bin, BinMovement } from "./bins";
import type { InventoryContext } from "./types";

const Bins = repo<Bin>("stockBins");
const Stock = repo<BinMovement>("inventoryStock");
const Items = repo<{ id: string; sku?: string; name?: string }>("inventoryItems");
const Locations = repo<{ id: string; name?: string }>("locations");

const scope = (ctx: InventoryContext) => ({ studio: ctx.studio, section: ctx.stockSection });

/** Administration's locations, or none when the studio has no Master data yet. */
async function placesOf(ctx: InventoryContext) {
  if (!ctx.masterSection) return [];
  return Locations.find({ studio: ctx.studio, section: ctx.masterSection });
}

/**
 * THE REGISTER, WITH WHAT EACH BIN HOLDS.
 *
 * `unbinned` rides beside the rows rather than being left implicit. Every
 * movement written before this existed names no bin, so on the day a studio
 * turns bins on, ALL of its stock is unbinned — and a screen that only listed
 * bins would show a warehouse of empty shelves and no sign of the stock. It is
 * the number a studio watches fall as it puts things away.
 */
export async function listBins(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;

  const [bins, movements, items, locations] = await Promise.all([
    Bins.find(scope(ctx)),
    Stock.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
    placesOf(ctx),
  ]);

  const label = Object.fromEntries(items.map((i) => [i.id, `${i.sku || ""} · ${i.name || ""}`.trim()]));
  const { unbinned, byBin } = binBalances(movements, new Set(bins.map((b) => b.id)));
  const name = (itemId: string) => label[itemId] || "(removed item)";

  return {
    bins: binView(bins, locations, movements).map((b) => ({
      ...b, lines: b.lines.map((l) => ({ ...l, itemLabel: name(l.itemId) })),
    })),
    // The places a bin may be put, so the form offers exactly what the server
    // will accept — the same posture the unit list takes.
    locations: locations.map((l) => ({ id: l.id, name: String(l.name || "") })),
    unbinned: Object.entries(unbinned)
      .filter(([, qty]) => qty !== 0)
      .map(([itemId, qty]) => ({ itemId, itemLabel: name(itemId), qty }))
      .sort((a, b) => b.qty - a.qty),
    // Stock that left a bin without having arrived in it. Reported rather than
    // refused — see `negativeBins` for why the total is not in doubt.
    negative: negativeBins(byBin).map((n) => ({ ...n, itemLabel: name(n.itemId) })),
    canManage: ctx.canManageStock,
  };
}

export async function createBin(ctx: InventoryContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const [existing, locations] = await Promise.all([Bins.find(scope(ctx)), placesOf(ctx)]);
  const problems = binProblems(body, { locations, existing });
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  return { bin: await Bins.create(scope(ctx), cleanBin(body)) };
}

export async function editBin(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const [existing, locations] = await Promise.all([Bins.find(scope(ctx)), placesOf(ctx)]);
  const row = existing.find((b) => b.id === id);
  if (!row) return { error: "notfound" };

  // THE WHOLE BIN IS REVALIDATED, not just the fields that arrived, because
  // uniqueness is a property of the result rather than of the edit: moving a
  // bin to another location can collide with a code that was fine where it was.
  const next = { code: body.code ?? row.code, name: body.name ?? row.name, locationId: body.locationId ?? row.locationId };
  const problems = binProblems(next, { locations, existing, selfId: id });
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const updated = await Bins.update(scope(ctx), id, cleanBin(next));
  return updated ? { bin: updated } : { error: "notfound" };
}

/**
 * DELETING A BIN CASCADES NOTHING.
 *
 * The movements that named it keep naming it and are counted as `unbinned` —
 * the stock is still in the building. Deleting the row and the history with it
 * would make the company total fall because somebody tidied a list, which is
 * the rule a deleted cost code already follows for the same reason.
 *
 * A BIN STILL HOLDING SOMETHING IS REFUSED, though, because that is a mistake
 * rather than housekeeping: it strands real units in a place nobody can pick
 * from, and the fix — issue or move them first — is one somebody can do.
 */
export async function deleteBin(ctx: InventoryContext, id: string) {
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const [bins, movements] = await Promise.all([Bins.find(scope(ctx)), Stock.find(scope(ctx))]);
  if (!bins.some((b) => b.id === id)) return { error: "notfound" };

  const held = binBalances(movements, new Set(bins.map((b) => b.id))).byBin[id] || {};
  const holding = Object.values(held).filter((q) => q !== 0).length;
  if (holding) return { error: "not-empty", holding };

  await Bins.remove(scope(ctx), id);
  return { ok: true };
}

/**
 * PUT STOCK AWAY, OR MOVE IT BETWEEN BINS — the same act, and one function.
 *
 * PUT-AWAY IS A MOVE FROM NOWHERE. On the day a studio turns bins on all of its
 * stock is `unbinned`, and saying "five of these are on A-01" is moving five
 * from no bin to A-01. Writing that as its own operation would be a second way
 * to change a bin balance, free to disagree with the first about what a move is.
 *
 * TWO MOVEMENTS, NETTING TO NOUGHT. Nothing entered or left the company, so the
 * item's own total must not move by a unit: this writes `-qty` where the stock
 * was and `+qty` where it went, both `adjust`, both naming the other end. The
 * alternative — a `binId` field somebody edits — would mean rewriting history,
 * and the stock ledger is append-only precisely so that a balance can always be
 * re-derived from what happened.
 *
 * REFUSED WHEN THE SOURCE DOES NOT HOLD IT, which is the opposite of how a
 * NEGATIVE bin balance is treated, and the two are not in tension. A negative
 * arises when stock genuinely left the building and the paperwork lagged; the
 * company total is right and only the split is behind, so refusing would stop a
 * warehouse whose shelves are correct. A move is somebody standing at a shelf
 * saying they are carrying five units off it — if the records say there are
 * three, one of the two is wrong and moving five would only bury it.
 */
export async function moveStock(ctx: InventoryContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const itemId = String(body?.itemId ?? "").trim();
  const fromBinId = String(body?.fromBinId ?? "").trim();
  const toBinId = String(body?.toBinId ?? "").trim();
  const amount = Math.round(Number(body?.qty) * 1000) / 1000;

  if (!Number.isFinite(amount) || amount <= 0) return { error: "qty" };
  // BOTH ENDS THE SAME IS A NO-OP THAT WRITES TWO MOVEMENTS, so it is refused
  // by name rather than silently accepted: the balances would be unchanged and
  // the ledger would carry a pair of entries recording nothing.
  if (fromBinId === toBinId) return { error: "same-bin" };

  const [bins, movements, items] = await Promise.all([
    Bins.find(scope(ctx)),
    Stock.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
  ]);
  if (!items.some((i) => i.id === itemId)) return { error: "item" };

  const known = new Set(bins.map((b) => b.id));
  // A DESTINATION MUST EXIST; a SOURCE need not be a bin at all, because "" is
  // the legitimate source that put-away starts from.
  if (toBinId && !known.has(toBinId)) return { error: "bin" };
  if (fromBinId && !known.has(fromBinId)) return { error: "bin" };
  if (!toBinId && !fromBinId) return { error: "bin" };

  const { byBin, unbinned } = binBalances(movements, known);
  const have = fromBinId ? (byBin[fromBinId]?.[itemId] || 0) : (unbinned[itemId] || 0);
  if (have < amount) return { error: "insufficient", have, needed: amount };

  const at = new Date().toISOString();
  const reason = String(body?.reason ?? "").trim().slice(0, 300)
    || (fromBinId ? "Moved between bins" : "Put away");
  const write = (qty: number, binId: string, otherEnd: string) => Stock.create(scope(ctx), {
    itemId, kind: "adjust", qty, reason,
    // WHICH MOVE THIS HALF BELONGS TO. Without it the ledger shows two
    // unexplained adjustments of opposite sign and nobody can tell they were
    // one act — which is exactly how a stock ledger stops being an audit trail.
    sourceType: "bin-move", sourceId: otherEnd,
    binId, byCollaboratorId: ctx.collaborator.id, at,
  } as unknown as BinMovement);

  // OUT FIRST. If the second write fails, the studio is short in the ledger and
  // sees it; the other order would create units that never existed.
  const out = await write(-amount, fromBinId, toBinId);
  const into = await write(amount, toBinId, fromBinId);
  return { moved: { itemId, qty: amount, fromBinId, toBinId }, movements: [out, into] };
}
