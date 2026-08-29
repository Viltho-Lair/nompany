// INVENTORY — what the studio buys, holds, and issues to its projects.
//
// Rows live under the studio's *inventory section*:
//   s:<StudioID>:sec:<SectionID>:c:inventoryVendors
//   s:<StudioID>:sec:<SectionID>:c:inventoryItems
//   s:<StudioID>:sec:<SectionID>:c:inventoryStock      (the movement ledger)
//   s:<StudioID>:sec:<SectionID>:c:materialOrders
//   s:<StudioID>:sec:<SectionID>:c:deliveries
//
// STOCK IS A LEDGER, NOT A NUMBER. inventoryStock holds movements (+in, -out,
// adjustments) and on-hand is summed from them on every read. A stored counter
// would be one failed write away from lying, and it could never answer "why".
// This is the same rule as derived money in Technical and derived progress in
// Projects: the number you see is computed from the records that justify it.
//
// The loop is: order from a vendor -> receive it (stock in) -> issue it to a
// project (stock out). Receiving and issuing never touch quantities directly;
// they append movements, and the balance follows.

import { requirePermission } from "@/platform/access";
import { isKnownCurrency } from "@/shared/currencies";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { attachToProjectEngagement, detachFromItsEngagement } from "@/platform/db/engagement";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { nextReference } from "@/modules/main/references";
// What each department adds to a quotation row, and who owns which column.
import { SHEET_OWNERS, cleanSheetLine } from "./sheetColumns";
import type {
  InventoryContext, Vendor, Item, Movement, Order, OrderLine, Delivery, Sheet,
  SheetLineView, SheetGroup, StockAvailability, VendorLookup,
} from "./types";
import type { PermissionKey } from "@/platform/access";
import type { Section } from "@/platform/db/sections";
import type { Quotation, QuotationTable, QuotationLine } from "@/modules/technical/types";
import type { Project } from "@/modules/projects/types";
import type { Row } from "@/platform/db/store";
import type { Task } from "@/modules/tasks/types";

const VENDORS = "inventoryVendors";
const ITEMS = "inventoryItems";

// A currency CODE, or nothing. Unknown codes are dropped rather than stored:
// a three-letter string nobody can price against is worse than no answer.
const cur = (v: unknown) => {
  const c = String(v ?? "").trim().toUpperCase();
  return isKnownCurrency(c) ? c : "";
};
// FOREIGN means "not what the studio counts in". A blank item currency is the
// studio's own money, so it is never foreign; a blank studio currency makes any
// named currency foreign, because nothing here says otherwise.
const foreignTo = (itemCurrency: string, studioCurrency: unknown) =>
  !!itemCurrency && itemCurrency !== cur(studioCurrency);
// A charge that was TYPED, kept apart from one that was left blank: 0 is a real
// answer ("nothing was paid to ship it") and "" is no answer at all, which is
// what makes the two landed-cost fields mandatory rather than defaulted.
const charge = (v: unknown) => {
  if (v === "" || v == null) return "";
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : "";
};
// A picture of the thing, held as the URL /api/media hands back — the same way
// the studio and client logos are held. The bytes never touch the item row.
const img = (v: unknown) => String(v ?? "").trim().slice(0, 500);
const STOCK = "inventoryStock";
const ORDERS = "materialOrders";
// THE SHEET ITSELF. Projects writes one when a project is opened, drawn from
// what the quotation priced; nothing read it, so it existed and was invisible.
// Inventory is where it belongs — Project Sheets is an Inventory screen — and
// this is the read that puts it on that screen.
const SHEETS = "projectSheets";
const DELIVERIES = "deliveries";
const PROJECTS = "projects";
const TASKS = "tasks";
const QUOTATIONS = "quotations";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Deliveries = repo<Delivery>(DELIVERIES);
const Items = repo<Item>(ITEMS);
const Orders = repo<Order>(ORDERS);
const Projects = repo(PROJECTS);
const Quotations = repo(QUOTATIONS);
const Sheets = repo<Sheet>(SHEETS);
const Stock = repo<Movement>(STOCK);
const Tasks = repo<Task>(TASKS);
const Vendors = repo<Vendor>(VENDORS);

export const ORDER_STATUSES = ["Draft", "Ordered", "Partly received", "Received", "Cancelled"];
export const DELIVERY_STATUSES = ["Draft", "Issued", "Cancelled"];
export const UNITS = ["pcs", "box", "m", "m²", "kg", "L", "set", "roll"];
export const MOVEMENT_KINDS = ["in", "out", "adjust"];

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const qty = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0; };
const money = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const weeks = (v: unknown) => (v === "" || v == null ? "" : Math.max(0, Math.round(Number(v)) || 0));

// What a vendor supplies, and how long each kind takes to arrive. Picking a type
// on an item is what fills in its delivery estimate, so the estimate is the
// vendor's own promise rather than a number somebody retyped per item.
function cleanItemTypes(list: unknown) {
  const seen = new Set<string>();
  return (Array.isArray(list) ? list : []).slice(0, 60).map((t) => ({
    type: str(t?.type, 80),
    weeks: weeks(t?.weeks),
  })).filter((t) => {
    if (!t.type) return false;
    const key = t.type.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Which of the STUDIO's own service actions this item needs once it lands.
// Kept only if it is one of theirs — a studio that renames or removes an
// action does not leave a stray string sitting on an old item — de-duplicated
// and order-preserved, the same shape as `cleanSerials`.
function cleanScope(raw: unknown, studio: Record<string, unknown>) {
  // Active AND retired: a retired action is one removed from the pool but still
  // in use here, so a stored scope that names it is carried, never filtered away.
  // Only an action that is neither — truly unknown — is dropped.
  const known = new Set([
    ...(Array.isArray(studio?.serviceActions) ? studio.serviceActions as unknown[] : []),
    ...(Array.isArray(studio?.retiredServiceActions) ? studio.retiredServiceActions as unknown[] : []),
  ].map((a) => str(a, 80)));
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : []).slice(0, 40).map((s) => str(s, 80)).filter((s) => {
    if (!s || !known.has(s) || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// Serial numbers held for an item. De-duplicated and trimmed; the ORDER is kept
// because it is the order they were entered in, which is usually the order they
// arrived in.
function cleanSerials(list: unknown) {
  const seen = new Set<string>();
  return (Array.isArray(list) ? list : []).slice(0, 2000).map((s) => str(s, 80)).filter((s) => {
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// Resolve studio + membership + the inventory section. The PROJECTS section is
// resolved too but is optional — inventory works without it; you just can't
// point an order or a delivery at a project.
export const inventoryContext = moduleContext<InventoryContext>({
  root: "inventory",
  sub: {
    stock: "inventory-stock", vendors: "inventory-vendors", items: "inventory-items",
    sheets: "inventory-sheets", awb: "inventory-awb",
  },
  foreign: {
    projects: "projects",
    projectsList: ["projects-list", "projects"],
    quotations: ["technical-quotations", "technical"],
    tasks: "tasks",
  },
  flags: ["stock", "vendors", "items", "sheets", "awb"],
  // Deliveries have no sub-section of their own and never had: the notes live on
  // the parent, so naming it explicitly is clearer than a caller remembering to
  // reach for `section`.
  extend: ({ section }) => ({ deliveriesSection: section }),
});

// ---- vendors ---------------------------------------------------------------
export async function listVendors({ studio, vendorsSection }: Pick<InventoryContext, "studio" | "vendorsSection">) {
  const rows = await Vendors.find({ studio, section: vendorsSection });
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createVendor(ctx: InventoryContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.vendors.create");
  if (denied) return denied;

  const { studio, vendorsSection } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  const rows = await Vendors.find({ studio, section: vendorsSection });
  if (rows.some((v) => v.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const vendor = await Vendors.create({ studio, section: vendorsSection }, {
    name,
    contactName: str(body?.contactName, 120),
    email: str(body?.email, 160).toLowerCase(),
    phone: str(body?.phone, 40),
    notes: str(body?.notes, 1000),
    itemTypes: cleanItemTypes(body?.itemTypes),
    createdAt: new Date().toISOString(),
  });
  return { vendor };
}

export async function editVendor(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.vendors.edit");
  if (denied) return denied;

  const { studio, vendorsSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await Vendors.find({ studio, section: vendorsSection });
    if (rows.some((v) => v.id !== id && v.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  for (const f of ["contactName", "phone"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 120);
  if (body?.email !== undefined) patch.email = str(body.email, 160).toLowerCase();
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.itemTypes !== undefined) patch.itemTypes = cleanItemTypes(body.itemTypes);

  const vendor = await Vendors.update({ studio, section: vendorsSection }, id, patch);
  return vendor ? { vendor } : { error: "notfound" };
}

export async function removeVendor(ctx: InventoryContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.vendors.delete");
  if (denied) return denied;

  const { studio, vendorsSection, sheetsSection, itemsSection } = ctx;
  const [items, orders] = await Promise.all([
    Items.find({ studio, section: itemsSection }),
    Orders.find({ studio, section: sheetsSection }),
  ]);
  const used = items.filter((i) => i.vendorId === id).length;
  const ordered = orders.filter((o) => o.vendorId === id).length;
  if (used || ordered) return { error: "in-use", items: used, orders: ordered };

  const removed = await Vendors.remove({ studio, section: vendorsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- items -----------------------------------------------------------------
// Every serial spoken for by a project sheet. One read for the whole list, so
// the item rows do not each go looking.
async function reservedSerials({ studio, sheetsSection }: Pick<InventoryContext, "studio" | "sheetsSection">) {
  if (!sheetsSection) return new Set<string>();
  const sheets = await Sheets.find({ studio, section: sheetsSection });
  const out = new Set();
  for (const sh of sheets) {
    const lines = sh.lines && typeof sh.lines === "object" ? sh.lines : {};
    // A SHEET LINE IS INVENTORY'S OWN COLUMNS on a quotation row, keyed by that
    // row's id — see SheetSchema. `serials` is the one this reads.
    for (const line of Object.values(lines) as { serials?: string[] }[]) {
      for (const sn of line?.serials || []) out.add(sn);
    }
  }
  return out;
}

// Every registered item's scope, for one studio, with NO permission gate of its
// own — see the caller in studioServiceActions.ts for why. The service-action
// pool transition runs behind studio.settings.edit, a right that says nothing
// about inventory.items.view; reading through inventoryContext there would make
// the retire-vs-drop decision only as complete as the CALLER's own inventory
// grant, and an incomplete read used to be read as "nothing is referenced" and
// silently DROP an in-use action instead of retiring it. The caller here has
// already resolved membership + settings authority through its own route guard,
// so this only needs the studio id — never a second identity to prove itself
// with, and never a key this repo call could name outside that one studio.
export async function itemScopesForStudio(studioId: string): Promise<string[][]> {
  // Same child-falls-back-to-parent resolution `ownerOf` already does for
  // cross-section reads below (see `projectRows`) — reused rather than
  // restated, so the sub-section fallback rule lives in one place.
  const itemsSection = await ownerOf(studioId, "inventory-items", "inventory");
  if (!itemsSection) return [];
  const items = await Items.find({ studio: { id: studioId }, section: itemsSection });
  // Same default as listItems: an item saved before `scope` existed carries no
  // field at all, and reads as an empty scope rather than a guess.
  return items.map((i) => (Array.isArray(i.scope) ? i.scope : []));
}

export async function listItems(ctx: InventoryContext) {
  const { studio, itemsSection, vendorsSection, stockSection } = ctx;
  const [items, vendors, movements, reserved] = await Promise.all([
    Items.find({ studio, section: itemsSection }),
    Vendors.find({ studio, section: vendorsSection }),
    Stock.find({ studio, section: stockSection }),
    reservedSerials(ctx),
  ]);
  const vendorName = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
  const onHand = balances(movements);

  return [...items]
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .map((i) => {
      const serials = Array.isArray(i.serials) ? i.serials : [];
      const held = onHand[i.id] || 0;
      return {
        ...i,
        serials,
        // EMPTY BY DEFAULT: an item saved before `scope` existed carries no
        // field at all, and it reads as an empty scope rather than any
        // guess at what its old needsInstallation/needsProgramming meant —
        // see the doc comment on ItemSchema.
        scope: Array.isArray(i.scope) ? i.scope : [],
        // RESERVED: allocated to a project sheet, so still physically on the
        // shelf but no longer available to anybody else. It is not a state
        // stored on the item — it is derived from what the sheets have taken,
        // so releasing a line frees the unit with nothing to remember to undo.
        reservedSerials: serials.filter((sn) => reserved.has(sn)),
        vendorName: vendorName[i.vendorId] || "",
        onHand: held,
        // "Below reorder level" is derived, so it can never be a stale flag.
        low: (i.reorderLevel || 0) > 0 && held <= (i.reorderLevel || 0),
        // On-hand is the LEDGER's answer; the serial list is a record of which
        // units are held. When a serial-tracked item's two disagree, somebody
        // has moved stock without noting the serial — worth saying so out loud
        // rather than quietly trusting one of them.
        serialMismatch: serials.length > 0 && serials.length !== held,
      };
    });
}

export async function createItem(ctx: InventoryContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.items.create");
  if (denied) return denied;

  const { studio, vendorsSection, itemsSection } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  const vendorId = str(body?.vendorId, 60);
  if (vendorId) {
    const vendors = await Vendors.find({ studio, section: vendorsSection });
    if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };
  }

  const currency = cur(body?.currency);
  const foreign = foreignTo(currency, studio.currency);
  const shippingCharges = charge(body?.shippingCharges);
  const customsCharges = charge(body?.customsCharges);
  if (foreign && (shippingCharges === "" || customsCharges === "")) return { error: "charges" };

  const rows = await Items.find({ studio, section: itemsSection });
  const sku = str(body?.sku, 40).toUpperCase() || nextSku(rows);
  if (rows.some((i) => i.sku.toUpperCase() === sku)) return { error: "duplicate-sku" };

  const item = await Items.create({ studio, section: itemsSection }, {
    sku, name,
    // The vendor's own part number, which is what a purchase order quotes and
    // what somebody searches for when the name is ambiguous.
    modelNumber: str(body?.modelNumber, 80),
    unit: UNITS.includes(String(body?.unit)) ? String(body?.unit) : UNITS[0],
    vendorId,
    // Picked from the vendor's own list of what it supplies; the estimate comes
    // with it rather than being typed again per item.
    itemType: str(body?.itemType, 80),
    deliveryWeeks: weeks(body?.deliveryWeeks),
    // Scope: which of the studio's own service actions does this thing need
    // once it lands? Chosen from studio.serviceActions, not a fixed pair.
    scope: cleanScope(body?.scope, studio),
    // Serials for a serial-tracked item. On-hand still comes from the LEDGER —
    // this records WHICH units are held, not how many.
    serials: cleanSerials(body?.serials),
    reorderLevel: qty(body?.reorderLevel) > 0 ? qty(body.reorderLevel) : 0,
    unitCost: money(body?.unitCost),
    // What that cost is IN. Blank means the studio's own currency, so an item
    // priced in the studio's money needs nothing said about it.
    currency,
    // WHAT IT COSTS TO GET IT HERE. Only an item bought in somebody else's
    // money is shipped in and cleared through customs, so the two charges are
    // asked for exactly then — and held blank the rest of the time rather than
    // stored as a zero that would read as "we checked, it was free".
    shippingCharges: foreign ? shippingCharges : "",
    customsCharges: foreign ? customsCharges : "",
    image: img(body?.image),
    notes: str(body?.notes, 1000),
    createdAt: new Date().toISOString(),
  });
  return { item };
}

export async function editItem(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.items.edit");
  if (denied) return denied;

  const { studio, vendorsSection, itemsSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) { const v = str(body.name, 160); if (!v) return { error: "name" }; patch.name = v; }
  if (body?.sku !== undefined) {
    const sku = str(body.sku, 40).toUpperCase();
    if (!sku) return { error: "sku" };
    const rows = await Items.find({ studio, section: itemsSection });
    if (rows.some((i) => i.id !== id && i.sku.toUpperCase() === sku)) return { error: "duplicate-sku" };
    patch.sku = sku;
  }
  if (body?.vendorId !== undefined) {
    const vendorId = str(body.vendorId, 60);
    if (vendorId) {
      const vendors = await Vendors.find({ studio, section: vendorsSection });
      if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };
    }
    patch.vendorId = vendorId;
  }
  if (body?.unit !== undefined && UNITS.includes(String(body.unit))) patch.unit = String(body.unit);
  if (body?.modelNumber !== undefined) patch.modelNumber = str(body.modelNumber, 80);
  if (body?.itemType !== undefined) patch.itemType = str(body.itemType, 80);
  if (body?.deliveryWeeks !== undefined) patch.deliveryWeeks = weeks(body.deliveryWeeks);
  if (body?.scope !== undefined) patch.scope = cleanScope(body.scope, studio);
  if (body?.serials !== undefined) patch.serials = cleanSerials(body.serials);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.reorderLevel !== undefined) patch.reorderLevel = qty(body.reorderLevel) > 0 ? qty(body.reorderLevel) : 0;
  if (body?.unitCost !== undefined) patch.unitCost = money(body.unitCost);
  // The currency and its two charges are decided together: what the charges
  // must be follows the currency the item ENDS UP with, not the one this
  // request happened to mention. An edit that touches none of the three — a
  // serial list, a picture — costs nothing extra.
  if (body?.currency !== undefined || body?.shippingCharges !== undefined || body?.customsCharges !== undefined) {
    const rows = await Items.find({ studio, section: itemsSection });
    const current = rows.find((r) => r.id === id);
    if (!current) return { error: "notfound" };
    const currency = body?.currency !== undefined ? cur(body.currency) : cur(current.currency);
    patch.currency = currency;
    if (!foreignTo(currency, studio.currency)) {
      patch.shippingCharges = "";
      patch.customsCharges = "";
    } else {
      const shippingCharges = body?.shippingCharges !== undefined ? charge(body.shippingCharges) : charge(current.shippingCharges);
      const customsCharges = body?.customsCharges !== undefined ? charge(body.customsCharges) : charge(current.customsCharges);
      if (shippingCharges === "" || customsCharges === "") return { error: "charges" };
      patch.shippingCharges = shippingCharges;
      patch.customsCharges = customsCharges;
    }
  }
  // "" is a real value — it is how a picture is removed.
  if (body?.image !== undefined) patch.image = img(body.image);

  const item = await Items.update({ studio, section: itemsSection }, id, patch);
  return item ? { item } : { error: "notfound" };
}

// An item with movement history is never deleted — that would erase the record
// of stock that really moved. Items with a clean history can go.
export async function removeItem(ctx: InventoryContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.items.delete");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection, deliveriesSection, stockSection } = ctx;
  const [movements, orders, deliveries] = await Promise.all([
    Stock.find({ studio, section: stockSection }),
    Orders.find({ studio, section: sheetsSection }),
    Deliveries.find({ studio, section: deliveriesSection as Section }),
  ]);
  const moved = movements.filter((m) => m.itemId === id).length;
  const onOrder = orders.filter((o) => (o.lines || []).some((l) => l.itemId === id)).length;
  const onDn = deliveries.filter((d) => (d.lines || []).some((l) => l.itemId === id)).length;
  if (moved || onOrder || onDn) return { error: "in-use", movements: moved, orders: onOrder, deliveries: onDn };

  const removed = await Items.remove({ studio, section: itemsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function nextSku(rows: Item[]) {
  const n = rows.length + 1;
  const taken = new Set(rows.map((i) => String(i.sku || "").toUpperCase()));
  for (let i = n; i < n + 1000; i++) {
    const candidate = `ITM-${String(i).padStart(4, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `ITM-${Date.now()}`;
}

// ---- the stock ledger ------------------------------------------------------
// On-hand per item, summed from every movement. `out` is stored as a positive
// quantity with kind "out" so a movement always reads naturally on its own; the
// sign is applied here, in one place.
// STOCK IS THE SUM OF THE LEDGER, never a number anybody keeps. Rounded to
// three places at each step so a long run of fractional adjustments cannot
// drift the way repeated float addition does.
export function balances(movements: Movement[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movements) {
    const delta = m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty);
    out[m.itemId] = Math.round(((out[m.itemId] || 0) + delta) * 1000) / 1000;
  }
  return out;
}

export async function listMovements(
  { studio, stockSection, itemsSection }: Pick<InventoryContext, "studio" | "stockSection" | "itemsSection">,
  { limit = 200 }: { limit?: number } = {},
) {
  const [movements, items, people] = await Promise.all([
    Stock.find({ studio, section: stockSection }),
    Items.find({ studio, section: itemsSection }),
    listCollaborators(studio.id),
  ]);
  const itemName = Object.fromEntries(items.map((i) => [i.id, `${i.sku} · ${i.name}`]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return [...movements]
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
    .slice(0, limit)
    .map((m) => ({ ...m, itemLabel: itemName[m.itemId] || "(removed item)", byAlias: alias[m.byCollaboratorId] || "" }));
}

// Append-only. Everything that changes stock goes through here, so there is
// exactly one way for a balance to move.
async function record(
  ctx: InventoryContext,
  { itemId, kind, quantity, reason, sourceType = "", sourceId = "" }: {
    itemId: string;
    kind: string;
    quantity: number;
    reason: string;
    sourceType?: string;
    sourceId?: string;
  },
) {
  const { studio, stockSection, collaborator } = ctx;
  return Stock.create({ studio, section: stockSection }, {
    itemId,
    kind: MOVEMENT_KINDS.includes(kind) ? kind : "adjust",
    qty: quantity,
    reason: str(reason, 300),
    sourceType, sourceId,
    byCollaboratorId: collaborator.id,
    at: new Date().toISOString(),
  });
}

// A manual correction — stock-take differences, damage, opening balances.
export async function adjustStock(ctx: InventoryContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  //
  // This was the ONE write in the file with no guard of its own, and the route
  // above it only asks the coarse section question ("may you write anything in
  // Inventory?"), which is true for somebody granted nothing but vendors. That
  // is enough to move the ledger every other number in the section is derived
  // from, so the declared right is asked for here like everywhere else.
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const { studio, stockSection, itemsSection } = ctx;
  const itemId = str(body?.itemId, 60);
  const items = await Items.find({ studio, section: itemsSection });
  if (!items.some((i) => i.id === itemId)) return { error: "item" };

  const amount = qty(body?.qty);
  if (!amount) return { error: "qty" };

  // A negative adjustment can't take an item below zero — you cannot have less
  // than none of something.
  if (amount < 0) {
    const movements = await Stock.find({ studio, section: stockSection });
    const have = Number(balances(movements)[itemId]) || 0;
    if (have + amount < 0) return { error: "insufficient", have, needed: Math.abs(amount) };
  }

  const movement = await record(ctx, {
    itemId, kind: "adjust", quantity: amount,
    reason: str(body?.reason, 300) || "Manual adjustment",
    sourceType: "adjustment",
  });
  return { movement };
}

// ---- purchase orders -------------------------------------------------------
// WHERE THE QUOTATION'S ROWS AND THE SHEET'S OWN DATA ARE PUT TOGETHER.
//
// A sheet stores no lines. The quotation owns the tables and the rows; a sheet
// stores only what THIS department added to them, keyed by the quotation row it
// belongs to. So every read composes the two, and a quotation that is edited or
// revised shows through immediately rather than leaving the sheet stale.
//
// PRICES ARE DROPPED HERE, not stored-without. The rows are the same rows Sales
// reads with prices on; what a department may see of them is decided at the
// point of reading, so there is one list and three views of it rather than
// three lists.
//
// MAIN keeps the quotation's own divisions — its tables, in its order, because
// those divisions are what was sold. BULK asks the same rows a different way:
// each item summed across the whole project, then split by the vendor it is
// bought from. Both are readings; neither can disagree with the quotation,
// because neither holds a line.
function composeSheet(
  sheet: Sheet,
  quote: Quotation | null | undefined,
  vendorOf: VendorLookup,
  stockFor: (itemId: string, mine: string[]) => StockAvailability,
  modelOf: (itemId: string) => string,
): SheetGroup[] {
  const tables = Array.isArray(quote?.tables) ? quote.tables : [];
  const own = (sheet.lines && typeof sheet.lines === "object"
    ? sheet.lines
    : {}) as Record<string, Record<string, unknown> | undefined>;
  // Carried, then added to. `qty` is what was SOLD and belongs to the
  // quotation; everything the sheet knows rides beside it under its own names.
  const carry = (t: QuotationTable, r: QuotationLine): SheetLineView => {
    const line: SheetLineView = {
      rowId: r.id,
      tableId: t.id,
      tableTitle: t.title || "",
      itemId: r.itemId || "",
      description: r.description || "",
      // THE MODEL NUMBER IS THE REGISTERED ITEM'S, read back through itemId on
      // every read. Storing it on the sheet would be a copy that stops matching
      // the catalogue the first time somebody corrects a model.
      modelNumber: modelOf(r.itemId),
      unit: r.unit || "",
      qty: Number(r.qty) || 0,
      ...(own[r.id] || {}),
    };
    // WHAT CAN STILL BE ALLOCATED TO THIS LINE. Read off Registered Items and
    // reduced by every serial already spoken for elsewhere — one unit cannot be
    // on two jobs, so a serial allocated to another row is not offered here.
    // This line's own allocation stays in the list, or unticking would be
    // impossible.
    const { pool, onHand } = stockFor(line.itemId, line.serials || []);
    line.availableSerials = pool;
    line.inStock = onHand;
    return line;
  };

  if (sheet.kind !== "bulk") {
    return tables.map((t) => ({
      id: t.id,
      title: t.title || "",
      rows: (Array.isArray(t.rows) ? t.rows : []).map((r) => carry(t, r)),
    })).filter((t) => t.rows.length);
  }

  // BULK: sum each item across every table first — the same camera under three
  // floors is one order — then group those totals under the vendor each is
  // bought from. A line with no registered item cannot be summed against
  // anything, so it stands on its own.
  const summed = new Map<string, SheetLineView>();
  for (const t of tables) {
    for (const r of Array.isArray(t.rows) ? t.rows : []) {
      const line = carry(t, r);
      const key = line.itemId || `free:${line.rowId}`;
      const at = summed.get(key);
      if (at) { at.qty += line.qty; (at.fromRows ||= []).push(line.rowId); continue; }
      summed.set(key, { ...line, tableTitle: "", fromRows: [line.rowId] });
    }
  }

  const byVendor = new Map<string, SheetGroup>();
  for (const line of summed.values()) {
    const vendor = vendorOf(line.itemId);
    const key = vendor?.id || "";
    if (!byVendor.has(key)) {
      byVendor.set(key, { id: key || "unassigned", title: vendor?.name || "No vendor yet", rows: [] });
    }
    byVendor.get(key)!.rows.push(line);
  }
  // Unassigned last: it is the pile still to be placed, not a vendor.
  return [...byVendor.values()].sort((a, b) => {
    if (a.id === "unassigned") return 1;
    if (b.id === "unassigned") return -1;
    return a.title.localeCompare(b.title);
  });
}

// Every project with a quotation behind it has a Main and a Bulk. Created on
// first read rather than migrated, and idempotent — two readers racing cannot
// make four sheets, because the write checks again inside the lock.
async function ensureSheetsExist(
  { studio, sheetsSection, projectsListSection }:
  Pick<SheetReader, "studio" | "sheetsSection" | "projectsListSection">,
) {
  if (!sheetsSection || !projectsListSection) return;
  const [sheets, projects] = await Promise.all([
    Sheets.find({ studio, section: sheetsSection }),
    Projects.find({ studio, section: projectsListSection }),
  ]);
  // THE SHEET THAT ALREADY EXISTED IS NOT LOST. The first version of this wrote
  // ONE row per project with no `kind` and a `rows` array copied off the
  // quotation. That row is still here and has been read as the Main sheet all
  // along — everything treats a missing kind as main — so only its Bulk was
  // ever missing.
  //
  // It is labelled properly now rather than inferred, and its copied `rows` are
  // dropped: rows come from the quotation on every read, so the copy is a
  // second answer that can only go stale. Nothing typed by anybody is in it —
  // there was never a screen that wrote those rows — and it is reconstructible
  // from the quotation regardless.
  for (const old of sheets) {
    // `rows` IS THE OLD SHAPE. Sheets used to carry an array of rows; they
    // carry a `lines` map keyed by quotation line id now. A sheet that has a
    // kind and no `rows` has already been migrated, and this loop skips it.
    if (old.kind && (old as { rows?: unknown }).rows === undefined) continue;
    await Sheets.update({ studio, section: sheetsSection }, old.id, {
      kind: old.kind || "main",
      rows: undefined,
      lines: old.lines && typeof old.lines === "object" ? old.lines : {},
    });
  }

  const have = new Set(sheets.map((s) => `${s.projectId}:${s.kind || "main"}`));
  for (const p of projects) {
    // NO GUARD ON quotationId. This used to skip a project with none, on the
    // reasoning that there was nothing to read rows back from — true, and no
    // longer a reason to skip: a project raised directly has no quotation by
    // design, and its sheets are deliberately empty rather than absent. Leaving
    // the guard would mean openProject creates them and this seeder never
    // would, so the two paths disagree about whether a project has sheets.
    // composeSheet with no quotation returns no tables, which the viewer says
    // in words.
    for (const kind of ["main", "bulk"]) {
      if (have.has(`${p.id}:${kind}`)) continue;
      const seeded = await Sheets.create({ studio, section: sheetsSection }, {
        projectId: p.id,
        quotationId: p.quotationId, rfqId: p.rfqId || "", ticketId: p.ticketId || "",
        kind,
        lines: {},
        createdAt: new Date().toISOString(),
      });
      // A SHEET SEEDED HERE IS STILL A SHEET CREATED, so it joins its project's
      // deal exactly as one drawn up by openProject does. Missing this would
      // leave every project opened before sheets existed with two sheets that
      // no engagement knows about — the same silent under-report this whole
      // increment exists to remove, in the one create path that is easy to
      // forget because it lives on a read.
      await attachToProjectEngagement(
        studio.id, "sheet", String(seeded.id), String(p.id), String(seeded.createdAt || ""),
      );
    }
  }
}

// WRITE ONE DEPARTMENT'S COLUMNS ON ONE ROW.
//
// The row belongs to the quotation and is never touched. What is written is the
// sheet's own record for that row — and only the columns this department owns,
// decided by cleanSheetLine rather than by the caller, so a payload naming
// somebody else's column cannot smuggle it through.
//
// Which department is asking is decided by WHICH RIGHT THEY HOLD, not by what
// they claim to be. Somebody holding both writes both, which is correct: a small
// studio where one person runs stores and site should not have to pretend to be
// two people.
export async function saveSheetLine(ctx: InventoryContext, body: Record<string, unknown>) {
  const { studio, sheetsSection } = ctx;
  if (!sheetsSection) return { error: "no-section" };

  const sheetId = String(body?.sheetId ?? "").slice(0, 60);
  const rowId = String(body?.rowId ?? "").slice(0, 60);
  if (!sheetId || !rowId) return { error: "missing" };

  const owner = body?.owner === "projects" ? "projects" : "inventory";
  // The template literal builds a key the catalogue does have — the owner map
  // holds `inventory.sheets` and `projects.list` — but a template's type is
  // `${string}.edit`, which PermissionKey cannot accept without being told.
  const denied = requirePermission(ctx.access, `${SHEET_OWNERS[owner].permission}.edit` as PermissionKey);
  if (denied) return denied;

  const sheets = await Sheets.find({ studio, section: sheetsSection });
  const sheet = sheets.find((x) => x.id === sheetId);
  if (!sheet) return { error: "notfound" };

  const patch = cleanSheetLine(body?.values, owner);
  if (!Object.keys(patch).length) return { error: "nothing" };

  // Applied to the live row inside the write lock: Inventory setting a serial
  // and Projects marking installation done at the same moment must not
  // overwrite each other, and they write different keys of the same record.
  const updated = await Sheets.update({ studio, section: sheetsSection }, sheetId, (row) => {
    const lines = (row.lines && typeof row.lines === "object"
      ? row.lines
      : {}) as Record<string, Record<string, unknown> | undefined>;
    return { lines: { ...lines, [rowId]: { ...(lines[rowId] || {}), ...patch } } };
  });
  return updated ? { ok: true, line: updated.lines?.[rowId] || {} } : { error: "notfound" };
}

// Every sheet in the studio, composed. Keys only on the row itself: the project
// number, the client and the quotation number are read back through the ids the
// sheet carries, so a renumbered project or a renamed client needs no migration.
export type SheetReader = {
  studio: { id: string } & Record<string, unknown>;
  sheetsSection: Section | null;
  projectsListSection: Section | null;
  quotationsSection: Section | null;
  itemsSection: Section | null;
  vendorsSection: Section | null;
  tasksSection?: Section | null;
};

export async function listProjectSheets(ctx: SheetReader) {
  const { studio, sheetsSection, projectsListSection, quotationsSection, itemsSection, vendorsSection } = ctx;
  if (!sheetsSection) return [];
  // SEEDED LAZILY, the same way the starter roles are. Sheets were written at
  // openProject, so every project opened BEFORE they existed had none — and the
  // bar that lists projects was empty for exactly the studios that already had
  // work in them. A sheet holds no lines of its own, so there is nothing to
  // migrate and nothing to guess: the pair is created the first time anybody
  // looks, and a project that already has them is left alone.
  await ensureSheetsExist(ctx);
  const [sheets, projects, quotes, items, vendors, tasks] = await Promise.all([
    Sheets.find({ studio, section: sheetsSection }),
    projectsListSection ? Projects.find({ studio, section: projectsListSection }) : ([] as Project[]),
    quotationsSection ? Quotations.find({ studio, section: quotationsSection }) : ([] as Quotation[]),
    itemsSection ? Items.find({ studio, section: itemsSection }) : ([] as Item[]),
    vendorsSection ? Vendors.find({ studio, section: vendorsSection }) : ([] as Vendor[]),
    // The PO the client sent lives on the `po` TASK raised against this
    // sheet's quotation. Read back through quotationId like everything else,
    // so searching a PO number finds the sheet it belongs to.
    ctx.tasksSection ? Tasks.find({ studio, section: ctx.tasksSection as Section }) : ([] as Task[]),
  ]);
  // THE ELEMENT TYPE IS NAMED ON EACH MAP, because `new Map(rows.map(...))`
  // infers a tuple type from the callback and loses which side is the key. The
  // three cross-module ones are read-only here: Inventory never writes a
  // project or a quotation, which is the rule sales.js states in so many words.
  const projectById = new Map<string, Project>(projects.map((p) => [p.id, p] as [string, Project]));
  const quoteById = new Map<string, Quotation>(quotes.map((q) => [q.id, q] as [string, Quotation]));
  const itemById = new Map<string, Item>(items.map((i) => [i.id, i]));
  const vendorById = new Map<string, Vendor>(vendors.map((v) => [v.id, v]));
  const vendorOf = (itemId: string) => vendorById.get(String(itemById.get(itemId)?.vendorId || "")) || null;

  // Every serial already allocated anywhere in the studio, so the same unit is
  // never offered to two rows. Built once for all sheets rather than per row.
  const spoken = new Set();
  for (const sh of sheets) {
    const lines = sh.lines && typeof sh.lines === "object" ? sh.lines : {};
    for (const line of Object.values(lines) as { serials?: string[] }[]) {
      for (const sn of line?.serials || []) spoken.add(sn);
    }
  }
  const modelOf = (itemId: string) => itemById.get(itemId)?.modelNumber || "";
  const stockFor = (itemId: string, mine: string[]): StockAvailability => {
    const all = itemById.get(itemId)?.serials || [];
    const own = new Set(mine);
    // Free, plus this row's own — otherwise its own allocation would vanish
    // from the list it was chosen from and could never be undone.
    const pool = all.filter((sn) => own.has(sn) || !spoken.has(sn));
    return { pool, onHand: pool.filter((sn) => !own.has(sn)).length };
  };
  const poFor = (quotationId: string) => tasks.find((t) => t.type === "po" && t.quotationId === quotationId) || null;

  return [...sheets]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .map((sheet) => {
      const project = projectById.get(sheet.projectId) || null;
      const quote = quoteById.get(sheet.quotationId) || null;
      const tables = composeSheet(sheet, quote, vendorOf, stockFor, modelOf);
      return {
        id: sheet.id,
        kind: sheet.kind === "bulk" ? "bulk" : "main",
        // THE WHOLE CHAIN, as keys. Every label beside them is read back.
        projectId: sheet.projectId, quotationId: sheet.quotationId,
        rfqId: sheet.rfqId || "", ticketId: sheet.ticketId || "",
        // Blank until Finance issues one — the state this is designed around,
        // so the screen can say so rather than showing an empty cell.
        projectNumber: project?.number || "",
        projectTitle: project?.title || "",
        clientName: project?.clientName || "",
        quotationNumber: quote?.number || "",
        // What the client's own order says — the PO's description is where a PO
        // number is written, since a PO is a document rather than a field.
        poNumber: poFor(sheet.quotationId)?.po?.description || "",
        tables,
        lineCount: tables.reduce((n, t) => n + t.rows.length, 0),
        // The serials held for the items on this sheet, so a search for one
        // finds the sheet it belongs to. Read off Registered Items, never
        // stored here.
        serials: [...new Set(tables.flatMap((t) => t.rows)
          .flatMap((r) => (itemById.get(r.itemId)?.serials || [])))].slice(0, 200),
      };
    });
}

export async function listOrders({ studio, sheetsSection, vendorsSection, itemsSection }: Pick<InventoryContext,
  "studio" | "sheetsSection" | "vendorsSection" | "itemsSection">) {
  const [orders, vendors, items, projects] = await Promise.all([
    Orders.find({ studio, section: sheetsSection }),
    Vendors.find({ studio, section: vendorsSection }),
    Items.find({ studio, section: itemsSection }),
    projectRows({ studio }),
  ]);
  const vendorName = Object.fromEntries(vendors.map((v) => [v.id, v.name]));
  const itemLabel = Object.fromEntries(items.map((i) => [i.id, `${i.sku} · ${i.name}`]));
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));

  return [...orders]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((o) => ({
      ...o,
      vendorName: vendorName[o.vendorId] || "",
      projectNumber: projectNumber[o.projectId] || "",
      lines: (o.lines || []).map((l) => ({ ...l, itemLabel: itemLabel[String(l.itemId || "")] || "(removed item)" })),
      total: orderTotal(o.lines),
      outstanding: (o.lines || []).reduce((n, l) => n + Math.max(0, (l.qty || 0) - Number(l.received || 0)), 0),
    }));
}

// The order total is computed from its lines on every read — a client can never
// tell the server what something cost.
export function orderTotal(lines: unknown) {
  return Math.round((Array.isArray(lines) ? lines : [])
    .reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0) * 100) / 100;
}

export async function createOrder(ctx: InventoryContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection, vendorsSection } = ctx;
  const vendorId = str(body?.vendorId, 60);
  const vendors = await Vendors.find({ studio, section: vendorsSection });
  if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };

  const projectId = str(body?.projectId, 60);
  if (projectId && !(await projectExists(ctx, projectId))) return { error: "project" };

  const items = await Items.find({ studio, section: itemsSection });
  const lines = cleanLines(body?.lines, items);
  if (!lines.length) return { error: "lines" };

  const orders = await Orders.find({ studio, section: sheetsSection });
  const order = await Orders.create({ studio, section: sheetsSection }, {
    // A purchase order number goes to a vendor, so it cannot be reused after a
    // draft is deleted — derived, not counted. See modules/main/references.js.
    reference: await nextReference(studio.id, { rows: orders, field: "reference", prefix: "PO" }),
    vendorId, projectId,
    lines,
    status: "Draft",
    expectedAt: day(body?.expectedAt),
    notes: str(body?.notes, 2000),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  // BOUGHT FOR THIS DEAL'S PROJECT, so it joins that deal. A purchase order
  // raised with no project — stock bought for the shelf, or against a blanket
  // vendor agreement — attaches to nothing, which is correct: there is no
  // customer deal behind it to join.
  await attachToProjectEngagement(ctx.studio.id, "order", order.id, projectId, order.createdAt as string);
  return { order };
}

export async function editOrder(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection } = ctx;
  const orders = await Orders.find({ studio, section: sheetsSection });
  const order = orders.find((o) => o.id === id);
  if (!order) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.status !== undefined) {
    if (!ORDER_STATUSES.includes(String(body.status))) return { error: "status" };
    // Received/Partly received are consequences of receiving goods, not things
    // you assert — otherwise the status could contradict the ledger.
    if (body.status === "Received" || body.status === "Partly received") return { error: "derived-status" };
    patch.status = body.status;
  }
  if (body?.expectedAt !== undefined) patch.expectedAt = day(body.expectedAt);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.lines !== undefined) {
    // Lines are frozen once anything has been received against them.
    if ((order.lines || []).some((l) => Number(l.received || 0) > 0)) return { error: "received-already" };
    const items = await Items.find({ studio, section: itemsSection });
    const lines = cleanLines(body.lines, items);
    if (!lines.length) return { error: "lines" };
    patch.lines = lines;
  }
  if (body?.projectId !== undefined) {
    const projectId = str(body.projectId, 60);
    if (projectId && !(await projectExists(ctx, projectId))) return { error: "project" };
    patch.projectId = projectId;
  }

  const updated = await Orders.update({ studio, section: sheetsSection }, id, patch);
  return updated ? { order: updated } : { error: "notfound" };
}

// Receiving is the only way stock comes IN from an order. It appends one
// movement per line received and lets the status follow the numbers.
export async function receiveOrder(ctx: InventoryContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, sheetsSection } = ctx;
  const orders = await Orders.find({ studio, section: sheetsSection });
  const order = orders.find((o) => o.id === id);
  if (!order) return { error: "notfound" };
  if (order.status === "Cancelled") return { error: "cancelled" };
  if (order.status === "Draft") return { error: "not-ordered" };

  const asked = new Map();
  for (const r of Array.isArray(body?.lines) ? body.lines : []) {
    const amount = qty(r?.qty);
    if (amount > 0) asked.set(str(r?.itemId, 60), amount);
  }
  if (!asked.size) return { error: "nothing" };

  // Over-receiving is refused outright rather than silently clamped — a
  // mismatch with the delivery note is something a human needs to look at.
  const lines = order.lines.map((l) => ({ ...l }));
  for (const [itemId, amount] of asked) {
    const line = lines.find((l) => l.itemId === itemId);
    if (!line) return { error: "line", itemId };
    const remaining = (line.qty || 0) - Number(line.received || 0);
    if (amount > remaining) return { error: "over-receive", itemId, remaining };
  }

  for (const [itemId, amount] of asked) {
    // The loop above already refused every id that has no line, so this cannot
    // miss — but the compiler cannot see across the two loops, and asserting it
    // here is cheaper than merging them and losing the "check everything before
    // writing anything" property that makes a partial receive impossible.
    const line = lines.find((l) => l.itemId === itemId) as OrderLine;
    line.received = Math.round((Number(line.received || 0) + amount) * 1000) / 1000;
    await record(ctx, {
      itemId, kind: "in", quantity: amount,
      reason: `Received on ${order.reference}`,
      sourceType: "order", sourceId: order.id,
    });
  }

  const complete = lines.every((l) => Number(l.received || 0) >= (l.qty || 0));
  const updated = await Orders.update({ studio, section: sheetsSection }, id, {
    lines,
    status: complete ? "Received" : "Partly received",
    receivedAt: complete ? new Date().toISOString() : order.receivedAt || "",
  });

  // "A new PO was received." The person who placed the order hears it landed —
  // not the storekeeper booking it in, who is standing over the goods. Only on
  // a FULL receipt: a partial arrival is an in-progress delivery, and a bell per
  // box would train the recipient to ignore the one that says it is all here.
  const buyerId = String(order.createdByCollaboratorId || "");
  if (complete && updated && buyerId && buyerId !== ctx.collaborator.id) {
    const buyer = (await listCollaborators(studio.id)).find((c) => c.id === buyerId);
    if (buyer) {
      await notifyCollaborators(
        studio.id,
        [buyerId],
        {
          type: NOTIFY.purchaseReceived,
          title: "A purchase order was received in full",
          body: String(order.reference || ""),
          href: "inventory-orders",
          tone: "success",
        },
        { userIdOf: (cid) => (cid === buyer.id ? String(buyer.userId) : undefined) },
      );
    }
  }
  return { order: updated };
}

// An order that has received stock is never deleted — the movements it created
// are real. Cancel it instead.
export async function removeOrder(ctx: InventoryContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const { studio, sheetsSection } = ctx;
  const orders = await Orders.find({ studio, section: sheetsSection });
  const order = orders.find((o) => o.id === id);
  if (!order) return { error: "notfound" };
  if ((order.lines || []).some((l) => Number(l.received || 0) > 0)) return { error: "received-already" };

  // Engagement state first, the row second — the recoverable direction, and the
  // mirror of the attach in createOrder.
  await detachFromItsEngagement(studio.id, "order", id);

  const removed = await Orders.remove({ studio, section: sheetsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- deliveries (stock out, to a project) ----------------------------------
export async function listDeliveries({ studio, itemsSection, deliveriesSection }: InventoryContext) {
  const [deliveries, items, projects, people] = await Promise.all([
    Deliveries.find({ studio, section: deliveriesSection }),
    Items.find({ studio, section: itemsSection }),
    projectRows({ studio }),
    listCollaborators(studio.id),
  ]);
  const itemLabel = Object.fromEntries(items.map((i) => [i.id, `${i.sku} · ${i.name}`]));
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return [...deliveries]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((d) => ({
      ...d,
      projectNumber: projectNumber[d.projectId] || "",
      issuedByAlias: alias[d.issuedByCollaboratorId || ""] || "",
      lines: (d.lines || []).map((l) => ({ ...l, itemLabel: itemLabel[String(l.itemId || "")] || "(removed item)" })),
      units: (d.lines || []).reduce((n, l) => n + (l.qty || 0), 0),
    }));
}

export async function createDelivery(ctx: InventoryContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const { studio, itemsSection, deliveriesSection } = ctx;
  const projectId = str(body?.projectId, 60);
  if (!projectId) return { error: "project" };
  if (!(await projectExists(ctx, projectId))) return { error: "project" };

  const items = await Items.find({ studio, section: itemsSection });
  const lines = cleanLines(body?.lines, items).map(({ itemId, qty: q }) => ({ itemId, qty: q }));
  if (!lines.length) return { error: "lines" };

  const deliveries = await Deliveries.find({ studio, section: deliveriesSection });
  const delivery = await Deliveries.create({ studio, section: deliveriesSection }, {
    reference: await nextReference(studio.id, { rows: deliveries, field: "reference", prefix: "DN" }),
    projectId, lines,
    status: "Draft",
    notes: str(body?.notes, 2000),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  // Issued to this deal's project — a delivery note always names one (refused
  // above without it), so this always has a deal to look for.
  await attachToProjectEngagement(ctx.studio.id, "delivery", delivery.id, projectId, delivery.createdAt as string);
  return { delivery };
}

// Issuing is the only way stock goes OUT to a project. Availability is checked
// against the ledger at the moment of issue, not when the note was drafted.
export async function issueDelivery(ctx: InventoryContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, stockSection, deliveriesSection } = ctx;
  const [deliveries, movements] = await Promise.all([
    Deliveries.find({ studio, section: deliveriesSection }),
    Stock.find({ studio, section: stockSection }),
  ]);
  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return { error: "notfound" };
  if (delivery.status === "Issued") return { error: "already-issued" };
  if (delivery.status === "Cancelled") return { error: "cancelled" };

  // Check every line BEFORE writing any movement, so a short line can't leave
  // the note half-issued.
  const have = balances(movements);
  const short = delivery.lines
    .filter((l) => (have[String(l.itemId || "")] || 0) < (l.qty || 0))
    .map((l) => ({ itemId: l.itemId, have: have[String(l.itemId || "")] || 0, needed: l.qty }));
  if (short.length) return { error: "insufficient", short };

  for (const l of delivery.lines) {
    await record(ctx, {
      itemId: l.itemId, kind: "out", quantity: l.qty,
      reason: `Issued on ${delivery.reference}`,
      sourceType: "delivery", sourceId: delivery.id,
    });
  }

  const updated = await Deliveries.update({ studio, section: deliveriesSection }, id, {
    status: "Issued",
    issuedAt: new Date().toISOString(),
    issuedByCollaboratorId: ctx.collaborator.id,
  });
  return { delivery: updated };
}

export async function removeDelivery(ctx: InventoryContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const { studio, deliveriesSection } = ctx;
  const deliveries = await Deliveries.find({ studio, section: deliveriesSection });
  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return { error: "notfound" };
  if (delivery.status === "Issued") return { error: "already-issued" };

  // Engagement state first, the row second — the recoverable direction, and the
  // mirror of the attach in createDelivery.
  await detachFromItsEngagement(studio.id, "delivery", id);

  const removed = await Deliveries.remove({ studio, section: deliveriesSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- shared ----------------------------------------------------------------
function cleanLines(list: unknown, items: Item[]): OrderLine[] {
  const known = new Set(items.map((i) => i.id));
  const seen = new Set<string>();
  return (Array.isArray(list) ? list : [])
    .map((l) => ({ itemId: str(l?.itemId, 60), qty: qty(l?.qty), unitPrice: money(l?.unitPrice), received: 0 }))
    .filter((l) => {
      if (!known.has(l.itemId) || l.qty <= 0 || seen.has(l.itemId)) return false;
      seen.add(l.itemId); // one line per item — two lines for the same thing is a mistake
      return true;
    })
    .slice(0, 200);
}

// Projects live in another section, so they're read directly rather than through
// projectsContext — inventory shouldn't need Projects access to name a project
// it is buying for. The links to them are still permission-gated in the UI.
// Cross-section reads resolve the sub-section that OWNS the collection, falling
// back to the parent so a studio predating the sub-section model still works.
async function ownerOf(studioId: string, childKey: string, parentKey: string) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }: Pick<InventoryContext, "studio">) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return Projects.find({ studio, section: owner });
}

async function projectExists(ctx: InventoryContext, projectId: string) {
  const rows = await projectRows(ctx);
  return rows.some((p) => p.id === projectId);
}

// Projects an order or delivery can be pointed at.
export async function openProjects(ctx: InventoryContext) {
  const rows = await projectRows(ctx);
  return rows
    .filter((p) => p.stage !== "Completed")
    .map((p) => ({ id: p.id, number: p.number, title: p.title || "" }));
}

// What Inventory is worth right now, valued at each item's unit cost.
export function stockValue(items: { onHand?: number; unitCost?: number }[]) {
  return Math.round(items.reduce((sum, i) => sum + (i.onHand || 0) * (i.unitCost || 0), 0) * 100) / 100;
}
