// A PRICE PER SUBCATEGORY — the owner, 02/10/2026.
//
// An item is filed under ONE category and its `sellPrice` is the price for
// that category. When the category has subcategories in the studio's register
// ("Box with Slice" holding "Slice"), the item may ALSO carry a price for each
// of them: `categoryPrices`, keyed by the subcategory's id. Typed by hand on
// the item form; optional, so an item with none is an item sold at its one
// price, exactly as before.
//
// KEYED BY ID, for the reason the register is stored by id at all
// (modules/administration/itemCategories): a studio renames and re-nests
// freely, and a price keyed by name would be stranded by the first rename.
//
// AND A QUANTITY PER SUBCATEGORY beside it (`categoryQuantities`, the same
// day): how many of that subcategory ONE of the item holds — a box holding
// twenty slices says 20 against "Slice". Optional like the price, and kept
// separately from it, so either may be known without the other.
//
// ONLY THE CHOSEN CATEGORY'S OWN SUBTREE IS KEPT. A price for a category the
// item is not under is a price nothing can ever offer, so re-filing an item
// drops what no longer sits beneath it rather than carrying it along.
//
// PURE. No store — the form, the import and the server ask the same questions.

import { subtreeIds, orderedTree } from "@/shared/departments/tree";
import { roundSum } from "@/shared/money";

/** What these functions read of a category; the stored row has more. */
export type CategoryNode = { id: string; name: string; nameAr?: string; parentId?: string };

export type CategoryPrices = Record<string, number>;

/**
 * Every category BENEATH this one, in the register's own order, each with the
 * depth it sits at below the chosen category (0 is a direct child). Empty for
 * a leaf, for no category, and for an id the register no longer holds.
 */
export function subcategoriesOf<T extends CategoryNode>(
  categories: readonly T[],
  categoryId: unknown,
): Array<T & { depth: number }> {
  const root = String(categoryId || "");
  const under = subtreeIds(categories, root);
  under.delete(root);
  if (!under.size) return [];
  const rootDepth = orderedTree(categories).find((c) => c.id === root)?.depth ?? 0;
  return orderedTree(categories)
    .filter((c) => under.has(c.id))
    .map((c) => ({ ...c, depth: Math.max(0, c.depth - rootDepth - 1) }));
}

/**
 * The subcategory prices as stored: only ids beneath the item's category, only
 * amounts above nought. A blank or a nought is UNPRICED and is not stored —
 * the same rule `sellPrice` keeps (shared/pricing, `basis: "none"`).
 */
export function cleanCategoryPrices(
  raw: unknown,
  categories: readonly CategoryNode[],
  categoryId: unknown,
): CategoryPrices {
  const given = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const out: CategoryPrices = {};
  for (const sub of subcategoriesOf(categories, categoryId)) {
    const n = Number(given[sub.id]);
    if (Number.isFinite(n) && n > 0) out[sub.id] = roundSum(n);
  }
  return out;
}

/** Three places, as every stock quantity is kept (inventory.ts, `qty`). */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The subcategory quantities as stored — how many of each subcategory one of
 * the item holds. The same containment as the prices: only ids beneath the
 * item's category, only amounts above nought; a blank is unknown, not zero.
 */
export function cleanCategoryQuantities(
  raw: unknown,
  categories: readonly CategoryNode[],
  categoryId: unknown,
): CategoryPrices {
  const given = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const out: CategoryPrices = {};
  for (const sub of subcategoriesOf(categories, categoryId)) {
    const n = Number(given[sub.id]);
    if (Number.isFinite(n) && n > 0 && round3(n) > 0) out[sub.id] = round3(n);
  }
  return out;
}

const fold = (v: unknown) => String(v ?? "").trim().toLowerCase();
const named = (c: CategoryNode, name: string) => fold(c.name) === name || (!!c.nameAr && fold(c.nameAr) === name);

/**
 * WHICH CATEGORY A FILE MEANS. "" for a blank cell, the id for a match, and
 * null when what was written is none of the studio's categories.
 *
 * A PATH ("Box with Slice / Slice", or with > or ›) is walked from the top. A
 * single name is matched in either language anywhere in the register; when
 * two categories share it, the top-level one is meant, and with no top-level
 * one the name is ambiguous and matches nothing — a guess here files goods on
 * the wrong shelf without anybody seeing it happen.
 */
export function resolveCategory(written: unknown, categories: readonly CategoryNode[]): string | null {
  const text = String(written ?? "").trim();
  if (!text) return "";
  const parts = text.split(/\s*(?:\/|>|›)\s*/).map(fold).filter(Boolean);
  if (!parts.length) return "";
  const ids = new Set(categories.map((c) => c.id));
  const parentOf = (c: CategoryNode) => (c.parentId && ids.has(c.parentId) ? c.parentId : "");

  if (parts.length === 1) {
    const hits = categories.filter((c) => named(c, parts[0]));
    if (hits.length === 1) return hits[0].id;
    const top = hits.filter((c) => parentOf(c) === "");
    return top.length === 1 ? top[0].id : null;
  }
  let parent = "";
  for (const part of parts) {
    const hit = categories.find((c) => parentOf(c) === parent && named(c, part));
    if (!hit) return null;
    parent = hit.id;
  }
  return parent;
}

// ---- selling by subcategory, and what each sale takes off stock ---------------
//
// STOCK IS COUNTED IN PIECES — the owner, 02/10/2026. An item whose category
// holds a subcategory with a quantity is counted in the SMALLEST thing it is
// sold as: a box holding twenty slices is twenty in stock, not one. So the
// item's on-hand, its reorder level, what is received and its unit cost are all
// per piece, and every figure is a whole number whatever the box size — which
// counting in boxes cannot promise (a box of three makes a piece 0.333).
//
// WHAT A SALE TAKES is then arithmetic on the quantities alone:
//   - the item sold at its own price (the category's — the whole box) takes
//     `piecesPerItem`: the largest quantity any of its subcategories carries;
//   - a subcategory holding q of itself per item takes piecesPerItem / q — one
//     for the smallest, more for anything between it and the whole.
// An item with no quantities takes one, exactly as it always did.
//
// A SUBCATEGORY WITH NO QUANTITY IS NOT SOLD AS SUCH: its price is known and
// what it takes off the shelf is not, and guessing "one" would sell a slice and
// remove a box.

export type SizedItem = { categoryId?: unknown; categoryPrices?: unknown; categoryQuantities?: unknown };

/** A way an item is sold besides whole: which subcategory, at what price, taking how many pieces. */
export type SellingSize = { id: string; name: string; nameAr?: string; price: number | null; units: number };

/** How many pieces ONE of the item, sold whole, takes off stock. 1 when it has no subcategory quantity. */
export function piecesPerItem(item: SizedItem, categories: readonly CategoryNode[]): number {
  const quantities = Object.values(cleanCategoryQuantities(item.categoryQuantities, categories, item.categoryId));
  return quantities.length ? Math.max(1, ...quantities) : 1;
}

/** The subcategories this item can be sold as — those with a quantity — in the register's order. */
export function sellingSizes(item: SizedItem, categories: readonly CategoryNode[]): SellingSize[] {
  const quantities = cleanCategoryQuantities(item.categoryQuantities, categories, item.categoryId);
  const prices = cleanCategoryPrices(item.categoryPrices, categories, item.categoryId);
  const whole = piecesPerItem(item, categories);
  return subcategoriesOf(categories, item.categoryId)
    .filter((c) => quantities[c.id] > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      ...(c.nameAr ? { nameAr: c.nameAr } : {}),
      price: prices[c.id] > 0 ? prices[c.id] : null,
      units: round3(whole / quantities[c.id]),
    }));
}
