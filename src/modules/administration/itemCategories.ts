// ITEM CATEGORIES — what the STUDIO calls its goods (22/09/2026).
//
// WHY THIS EXISTS, AND WHAT IT IS NOT REPLACING. An item already carries
// `itemType`, and it looks like a category until you read where it comes from:
// the item form populates that dropdown from the chosen VENDOR's own
// `itemTypes` list, and picking one fills the lead time from that vendor's row
// (`modules/inventory`, `StudioInventory`). So `itemType` is the SUPPLIER's
// product line, scoped to one supplier and load-bearing for procurement — two
// vendors both selling helmets produce two unrelated strings, and an item with
// no vendor has no type at all.
//
// That is a fine thing to have and a poor thing to price an offer against:
// "20% off Helmets" written against `itemType` means "20% off things whose
// supplier calls them Helmets", and silently misses identical goods bought from
// somebody who typed it differently. **`itemType` is therefore never touched by
// this file.** A category is a NEW field beside it.
//
// A REGISTER, NOT A TAXONOMY, for the reason `./clientTags` gives at length: a
// taxonomy value is stored BY NAME on every record using it, so renaming one
// strands them. A category is stored BY ID — an item carries `categoryId`, an
// offer's condition carries category ids — so a studio may rename and re-nest
// freely and nothing follows.
//
// IT NESTS, up to the same four levels a department register allows, and the
// walks are `shared/departments/tree` rather than a second copy of them.
//
// NOT SEEDED. A starter list would be a guess about a trade, and the studio
// already has an honest answer to "what do we sell": the distinct `itemType`
// values on its own items. `suggestionsFrom` offers exactly those, for a person
// to accept or ignore — it writes nothing by itself.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { depthOf, wouldCycle, MAX_DEPARTMENT_DEPTH } from "@/shared/departments/tree";
import type { MasterContext } from "./types";

/** One category: an id nothing may reuse, a name the studio may change, and where it sits. */
export type ItemCategory = {
  id: string;
  name: string;
  nameAr?: string;
  /** Empty is top level. A dangling parent reads as top level too — see tree.ts. */
  parentId?: string;
  createdAt: string;
};

const Categories = repo<ItemCategory>("itemCategories");
const str = (v: unknown, max = 80) => String(v ?? "").trim().slice(0, max);

/** Every category, parents before children is the SCREEN's job — this is the raw set. */
export async function listItemCategories(
  ctx: Pick<MasterContext, "studio" | "section">,
): Promise<ItemCategory[]> {
  const rows = await Categories.find({ studio: ctx.studio, section: ctx.section });
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/**
 * WHAT THIS STUDIO ALREADY CALLS ITS GOODS, from its own items — the distinct
 * `itemType` values not yet matched by a category name.
 *
 * OFFERED, NEVER WRITTEN. Importing these automatically would be a migration
 * nobody asked for and nobody could see happening, and it would be WRONG in a
 * specific way: a supplier's line and a shop's category are different sets, and
 * two suppliers' spellings of one category would arrive as two categories.
 * A person picks.
 */
export function suggestionsFrom(
  items: readonly { itemType?: unknown }[],
  existing: readonly ItemCategory[],
): string[] {
  const taken = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const seen = new Set<string>();
  for (const i of items) {
    const name = String(i?.itemType ?? "").trim();
    if (!name || taken.has(name.toLowerCase())) continue;
    seen.add(name);
  }
  return [...seen].sort((a, b) => a.localeCompare(b)).slice(0, 200);
}

/** Why this category cannot be written as asked, or "". Pure, so the screen refuses the same. */
export function categoryProblem(
  rows: readonly ItemCategory[],
  draft: { id?: string; name: string; parentId?: string },
): string {
  const name = str(draft.name);
  if (!name) return "name";
  // NO UNIQUE INDEX IN THIS STORE, so this IS the constraint. Two categories
  // with one name under one parent are two nobody can tell apart on a picker.
  const clash = rows.some((c) => c.id !== draft.id
    && (c.parentId || "") === (draft.parentId || "")
    && c.name.trim().toLowerCase() === name.toLowerCase());
  if (clash) return "duplicate";
  const parentId = str(draft.parentId, 60);
  if (parentId) {
    if (!rows.some((c) => c.id === parentId)) return "parent";
    if (draft.id && wouldCycle(rows, draft.id, parentId)) return "cycle";
    // Depth is measured on the PARENT plus this row, so the check reads the
    // tree as it would be rather than as it is.
    if (depthOf(rows, parentId) + 1 > MAX_DEPARTMENT_DEPTH) return "depth";
  }
  return "";
}

export async function createItemCategory(ctx: MasterContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;
  const rows = await listItemCategories(ctx);
  const draft = { name: str(body?.name), parentId: str(body?.parentId, 60) };
  const problem = categoryProblem(rows, draft);
  if (problem) return { error: problem as "name" | "duplicate" | "parent" | "cycle" | "depth" };
  const category = await Categories.create({ studio: ctx.studio, section: ctx.section }, {
    name: draft.name,
    nameAr: str(body?.nameAr),
    ...(draft.parentId ? { parentId: draft.parentId } : {}),
    createdAt: new Date().toISOString(),
  } as unknown as ItemCategory);
  return { category };
}

/**
 * MANY AT ONCE, for the suggestion list — one round trip rather than twenty,
 * and each name is judged against what the earlier ones in the same call
 * already took, so a batch cannot contain its own duplicate.
 */
export async function createItemCategories(ctx: MasterContext, names: readonly unknown[]) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;
  const rows = await listItemCategories(ctx);
  const at = new Date().toISOString();
  const made: Record<string, unknown>[] = [];
  const taken = [...rows];
  for (const raw of (names || []).slice(0, 200)) {
    const name = str(raw);
    if (!name || categoryProblem(taken, { name })) continue;
    made.push({ name, createdAt: at });
    // Pushed with a synthetic id so the NEXT name in this batch sees it.
    taken.push({ id: `pending:${made.length}`, name, createdAt: at });
  }
  if (!made.length) return { categories: [], count: 0 };
  const categories = await Categories.createMany({ studio: ctx.studio, section: ctx.section }, made);
  return { categories, count: categories.length };
}

/** Rename or re-nest. The id does not move, so nothing carrying it changes. */
export async function editItemCategory(ctx: MasterContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.edit");
  if (denied) return denied;
  const rows = await listItemCategories(ctx);
  const before = rows.find((c) => c.id === String(id || ""));
  if (!before) return { error: "notfound" as const };
  const draft = {
    id: before.id,
    name: body?.name === undefined ? before.name : str(body.name),
    parentId: body?.parentId === undefined ? (before.parentId || "") : str(body.parentId, 60),
  };
  const problem = categoryProblem(rows, draft);
  if (problem) return { error: problem as "name" | "duplicate" | "parent" | "cycle" | "depth" };
  const updated = await Categories.update({ studio: ctx.studio, section: ctx.section }, before.id, (row) => ({
    ...row,
    name: draft.name,
    ...(body?.nameAr !== undefined ? { nameAr: str(body.nameAr) } : {}),
    parentId: draft.parentId,
  }));
  return updated ? { category: updated } : { error: "notfound" as const };
}

/**
 * Delete a category. **NOTHING IS RE-FILED.** An item keeps its `categoryId`
 * and stops resolving to a name; an offer naming it stops matching. That is the
 * same containment a deleted cost code and a deleted milestone get — a reader
 * that resolves only what it can see is safe against deletion in a way no
 * write-time check is.
 *
 * ITS CHILDREN ARE NOT ORPHANED SILENTLY: a category with children is refused,
 * because a dangling parent reads as TOP LEVEL (tree.ts), so deleting a middle
 * row would quietly promote everything beneath it to the top of the register.
 */
export async function removeItemCategory(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.master.delete");
  if (denied) return denied;
  const rows = await listItemCategories(ctx);
  const target = String(id || "");
  const children = rows.filter((c) => (c.parentId || "") === target).length;
  if (children) return { error: "has-children" as const, children };
  const gone = await Categories.remove({ studio: ctx.studio, section: ctx.section }, target);
  return gone ? { ok: true as const } : { error: "notfound" as const };
}
