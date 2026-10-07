// STOCK COUNTS — the store half of ./stockCounts.
//
// NO PERMISSION KEY OF ITS OWN. A count is how the stock register is checked,
// and posting one IS writing stock adjustments, so it answers to
// `inventory.stock` exactly as an adjustment does: `.view` to read, `.create`
// to count and post — the right `adjustStock` already asks. A separate right
// would be free to disagree with the one the adjustments themselves ask.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { listCollaborators } from "@/platform/auth/collaborators";
import { adjustStock, balances } from "./inventory";
import { cleanCountLines, countDifferences, postProblem } from "./stockCounts";
import type { CountResult, StockCount } from "./stockCounts";
import type { InventoryContext, Item, Movement } from "./types";

const Counts = repo<StockCount>("stockCounts");
const Items = repo<Item>("inventoryItems");
const Stock = repo<Movement>("inventoryStock");

const scope = (ctx: InventoryContext) => ({ studio: ctx.studio, section: ctx.stockSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function listCounts(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;
  const [counts, items, movements, people] = await Promise.all([
    Counts.find(scope(ctx)),
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
    Stock.find(scope(ctx)),
    listCollaborators(ctx.studio.id),
  ]);
  const alias = new Map((people as { id?: unknown; alias?: unknown }[])
    .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const));
  // THE LIVE BOOK FIGURE PER ITEM, so a counter sees the difference as they
  // type it — and the same figure posting will use (./stockCounts says why the
  // book figure is read at posting rather than frozen at the start).
  const onHand = balances(movements);
  return {
    counts: [...counts]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map((c) => ({
        ...c,
        createdByAlias: alias.get(String(c.createdByCollaboratorId || "")) || "",
        postedByAlias: alias.get(String(c.postedByCollaboratorId || "")) || "",
      })),
    items: items
      .map((i) => ({ id: String(i.id), name: String(i.name || ""), sku: String(i.sku || ""), unit: String(i.unit || ""), onHand: Number(onHand[i.id]) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    canCount: !requirePermission(ctx.access, "inventory.stock.create"),
  };
}

/**
 * START A COUNT, with a line for every registered item, all blank. Counting a
 * subset is leaving the rest blank — a blank line is left alone at posting —
 * which is simpler for somebody walking racks than choosing items up front.
 */
export async function createCount(ctx: InventoryContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;
  const [items, counts] = await Promise.all([
    Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
    Counts.find(scope(ctx)),
  ]);
  if (!items.length) return { error: "no-items" };
  const count = await Counts.create(scope(ctx), {
    // A COUNT IS QUOTED BY ITS NUMBER on the adjustments it writes, so it is
    // derived like every other reference and never reissued (invariant 10).
    reference: await nextReference(ctx.studio.id, { rows: counts, field: "reference", ...seriesSetting("stockCount", ctx.studio.numbering) }),
    note: str(body?.note, 300),
    status: "Counting",
    lines: items.map((i) => ({ itemId: String(i.id), counted: "" as const })),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { count };
}

/** SAVE WHAT HAS BEEN COUNTED SO FAR — a count is walked over hours, and saved as it goes. */
export async function saveCount(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;
  const items = await Items.find({ studio: ctx.studio, section: ctx.itemsSection });
  const known = new Set(items.map((i) => String(i.id)));
  const lines = body?.lines === undefined ? undefined : cleanCountLines(body.lines, known);
  let refused = "";
  // A FUNCTION PATCH, so two people typing into one count at once each land
  // their own lines on the row as it now is rather than the row they loaded.
  const updated = await Counts.update(scope(ctx), id, (row) => {
    if (row.status !== "Counting") { refused = "not-counting"; return {}; }
    refused = "";
    const patch: Record<string, unknown> = {};
    if (lines) {
      const typed = new Map(lines.map((l) => [l.itemId, l.counted]));
      patch.lines = (row.lines || []).map((l) => (typed.has(l.itemId) ? { ...l, counted: typed.get(l.itemId) } : l));
    }
    if (body?.note !== undefined) patch.note = str(body.note, 300);
    return patch;
  });
  if (!updated) return { error: "notfound" };
  if (refused) return { error: refused };
  return { count: updated };
}

/**
 * POST THE COUNT: every counted line that differs from the books becomes a
 * stock adjustment, cause `count`, through `adjustStock` — so one over the
 * studio's limit waits on the Approvals page exactly as a hand-typed one does,
 * and one that would take an item below nought is refused the same way.
 *
 * CLAIMED BEFORE ANYTHING MOVES. The status goes Counting → Posting in one
 * function patch, which only one writer can win, so a double click cannot
 * adjust the same shelf twice. A crash between the claim and the end leaves
 * the count at Posting, which the screen shows rather than hides.
 */
export async function postCount(ctx: InventoryContext, id: string) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;
  const current = await Counts.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const problem = postProblem(current);
  if (problem) return { error: problem };

  let claimed = false;
  const held = await Counts.update(scope(ctx), id, (row) => {
    claimed = row.status === "Counting";
    return claimed ? { status: "Posting" } : {};
  });
  if (!held || !claimed) return { error: "not-counting" };

  const onHand = balances(await Stock.find(scope(ctx)));
  const results: CountResult[] = [];
  for (const d of countDifferences(held.lines || [], onHand)) {
    const answer = await adjustStock(ctx, {
      itemId: d.itemId, qty: d.difference, cause: "count",
      reason: `Count ${held.reference}`,
    }) as { error?: unknown; pending?: unknown };
    results.push({
      ...d,
      outcome: answer?.error ? "refused" : answer?.pending ? "pending" : "applied",
      ...(answer?.error ? { detail: String(answer.error) } : {}),
    });
  }

  const count = await Counts.update(scope(ctx), id, {
    status: "Posted",
    results,
    postedByCollaboratorId: ctx.collaborator.id,
    postedAt: new Date().toISOString(),
  });
  return { count, results };
}

/** CANCEL A COUNT nobody is going to post. Nothing it recorded moved stock. */
export async function cancelCount(ctx: InventoryContext, id: string) {
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;
  let refused = "";
  const updated = await Counts.update(scope(ctx), id, (row) => {
    refused = row.status === "Counting" ? "" : "not-counting";
    return refused ? {} : { status: "Cancelled" };
  });
  if (!updated) return { error: "notfound" };
  if (refused) return { error: refused };
  return { count: updated };
}
