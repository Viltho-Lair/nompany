// ITEM CATEGORIES — Administration's Master data (22/09/2026).
//
// The route lives here because the collection does. Reading is open to any
// member, like the reference data beside it: a category is a name on a picker
// and every screen offering one needs the list. Writing answers to
// `administration.master.*`, asked inside each service call rather than once at
// the door — the shape the locations route settled on.
//
// GET also carries the SUGGESTIONS: the distinct `itemType` values on this
// studio's own items that no category is named after yet. Offered, never
// written — see the module header for why importing them automatically would be
// wrong rather than merely presumptuous.
import { route, refused } from "@/platform/http/route";
import { masterContext } from "@/modules/administration/master";
import { repo } from "@/platform/db/repo";
import type { Item } from "@/modules/inventory/types";
import {
  listItemCategories, createItemCategory, createItemCategories,
  editItemCategory, removeItemCategory, suggestionsFrom,
} from "@/modules/administration/itemCategories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Items = repo<Item>("inventoryItems");
const spec = { auth: "studio", context: masterContext, body: true, name: "administration/item-categories" } as const;

export const GET = route(
  { auth: "studio", context: masterContext, name: "administration/item-categories" },
  async (master) => {
    const categories = await listItemCategories(master);
    // A studio with no Inventory has nothing to suggest FROM, which is an empty
    // list rather than a refusal — the register is still perfectly writable.
    const items = master.inventoryItemsSection
      ? await Items.find({ studio: master.studio, section: master.inventoryItemsSection })
      : [];
    return { ok: true, categories, suggestions: suggestionsFrom(items, categories) };
  },
);

export const POST = route(spec, async (master) => {
  // A LIST OR ONE. The suggestion panel accepts several at once; the form sends
  // one. Two verbs for one act would be two sets of rules over one collection.
  const many = master.body.names;
  const result = Array.isArray(many)
    ? await createItemCategories(master, many)
    : await createItemCategory(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

export const PUT = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };
  const result = await editItemCategory(master, String(master.body.id), master.body);
  if (refused(result)) return result;
  return { ok: true, category: result.category };
});

// A CATEGORY WITH CHILDREN IS REFUSED, not cascaded: a dangling parent reads as
// top level, so deleting a middle row would quietly promote its whole subtree.
export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };
  const result = await removeItemCategory(master, String(master.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
