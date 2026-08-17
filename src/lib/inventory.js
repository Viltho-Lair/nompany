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

import { sectionViewable, sectionManageable, requirePermission, dashboardViewable } from "@/lib/access";
import { isKnownCurrency } from "@/lib/currencies";
import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listSections } from "@/lib/data/sections";
import { studioContext, sectionNav, manageMap } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { nextReference } from "@/lib/references";
import { currentUser } from "@/lib/identity";
// What each department adds to a quotation row, and who owns which column.
import { SHEET_OWNERS, cleanSheetLine } from "@/lib/sheetColumns";

const VENDORS = "inventoryVendors";
const ITEMS = "inventoryItems";

// A currency CODE, or nothing. Unknown codes are dropped rather than stored:
// a three-letter string nobody can price against is worse than no answer.
const cur = (v) => {
  const c = String(v ?? "").trim().toUpperCase();
  return isKnownCurrency(c) ? c : "";
};
// A picture of the thing, held as the URL /api/media hands back — the same way
// the studio and client logos are held. The bytes never touch the item row.
const img = (v) => String(v ?? "").trim().slice(0, 500);
const STOCK = "inventoryStock";
const ORDERS = "materialOrders";
// THE SHEET ITSELF. Projects writes one when a project is opened, drawn from
// what the quotation priced; nothing read it, so it existed and was invisible.
// Inventory is where it belongs — Project Sheets is an Inventory screen — and
// this is the read that puts it on that screen.
const SHEETS = "projectSheets";
const DELIVERIES = "deliveries";
const PROJECTS = "projects";

export const ORDER_STATUSES = ["Draft", "Ordered", "Partly received", "Received", "Cancelled"];
export const DELIVERY_STATUSES = ["Draft", "Issued", "Cancelled"];
export const UNITS = ["pcs", "box", "m", "m²", "kg", "L", "set", "roll"];
export const MOVEMENT_KINDS = ["in", "out", "adjust"];

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const qty = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0; };
const money = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const weeks = (v) => (v === "" || v == null ? "" : Math.max(0, Math.round(Number(v)) || 0));

// What a vendor supplies, and how long each kind takes to arrive. Picking a type
// on an item is what fills in its delivery estimate, so the estimate is the
// vendor's own promise rather than a number somebody retyped per item.
function cleanItemTypes(list) {
  const seen = new Set();
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

// Serial numbers held for an item. De-duplicated and trimmed; the ORDER is kept
// because it is the order they were entered in, which is usually the order they
// arrived in.
function cleanSerials(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).slice(0, 2000).map((s) => str(s, 80)).filter((s) => {
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// Resolve studio + membership + the inventory section. The PROJECTS section is
// resolved too but is optional — inventory works without it; you just can't
// point an order or a delivery at a project.
export async function inventoryContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` is resolved in studioContext; forwarding it is what lets every
  // service function guard itself without resolving anything again.
  // `roles` travels with `access`: scopeFor needs it, and a context that
  // carries one without the other is half an answer.
  const { studio, collaborator, access, roles } = context;

  const sections = await listSections(studio.id);
  const byKey = Object.fromEntries(sections.map((x) => [x.key, x]));
  const section = byKey["inventory"];
  const projects = byKey["projects"];
  if (!section) return { error: "no-section" };
  // THE VIEW GUARD, asked of the permission set. It read grants until now, so
  // anybody holding a role but no legacy grant — every new hire once roles are
  // in use — was shown the section in the nav and refused when they opened it.
  if (!sectionViewable(access, section.key, sections.map((s) => s.key))) return { error: "forbidden" };

  // Each collection sits under the sub-section that owns it. `deliveries` stays
  // on the parent: it is raised from several places, not from one screen.
  const stockSection = byKey["inventory-stock"] || section;
  const vendorsSection = byKey["inventory-vendors"] || section;
  const itemsSection = byKey["inventory-items"] || section;
  const sheetsSection = byKey["inventory-sheets"] || section;
  const awbSection = byKey["inventory-awb"] || section;
  const projectsListSection = byKey["projects-list"] || projects;
  // The quotation OWNS the sheet's rows. Inventory reads it and never
  // writes it — see composeSheet.
  const quotationsSection = byKey["technical-quotations"] || byKey["technical"] || null;

  return {
    studio, collaborator, access, roles, section, projectsSection: projects,
    stockSection, vendorsSection, itemsSection, sheetsSection, awbSection, projectsListSection,
    quotationsSection,
    deliveriesSection: section,
    canManage: sectionManageable(access, section.key, (sections || []).map((x) => x.key)),
    canManageStock: sectionManageable(access, stockSection.key, (sections || []).map((x) => x.key)),
    canManageVendors: sectionManageable(access, vendorsSection.key, (sections || []).map((x) => x.key)),
    canManageItems: sectionManageable(access, itemsSection.key, (sections || []).map((x) => x.key)),
    canManageSheets: sectionManageable(access, sheetsSection.key, (sections || []).map((x) => x.key)),
    canManageAwb: sectionManageable(access, awbSection.key, (sections || []).map((x) => x.key)),
    // May they open the module's OWN screen — the dashboard is a summary of
    // everything underneath it, and is withheld on a right of its own.
    canViewDashboard: dashboardViewable(access, section.key),
    nav: sectionNav(studio, collaborator, sections, access),
    // Manage, per section key — each screen asks about itself.
    manage: manageMap(studio, collaborator, sections, access),
  };
}

export async function inventoryGuard(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const inv = await inventoryContext(user, slug);
  if (inv.error) {
    const status = inv.error === "notfound" || inv.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: inv.error }, { status }) };
  }
  if (write && !inv.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return inv;
}

// ---- vendors ---------------------------------------------------------------
export async function listVendors({ studio, vendorsSection }) {
  const rows = await readCol(studio.id, vendorsSection.id, VENDORS);
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createVendor(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.vendors.create");
  if (denied) return denied;

  const { studio, vendorsSection } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  const rows = await readCol(studio.id, vendorsSection.id, VENDORS);
  if (rows.some((v) => v.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const vendor = await addRow(studio.id, vendorsSection.id, VENDORS, {
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

export async function editVendor(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.vendors.edit");
  if (denied) return denied;

  const { studio, vendorsSection } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, vendorsSection.id, VENDORS);
    if (rows.some((v) => v.id !== id && v.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  for (const f of ["contactName", "phone"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 120);
  if (body?.email !== undefined) patch.email = str(body.email, 160).toLowerCase();
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.itemTypes !== undefined) patch.itemTypes = cleanItemTypes(body.itemTypes);

  const vendor = await updateRow(studio.id, vendorsSection.id, VENDORS, id, patch);
  return vendor ? { vendor } : { error: "notfound" };
}

export async function removeVendor(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.vendors.delete");
  if (denied) return denied;

  const { studio, vendorsSection, sheetsSection, itemsSection } = ctx;
  const [items, orders] = await Promise.all([
    readCol(studio.id, itemsSection.id, ITEMS),
    readCol(studio.id, sheetsSection.id, ORDERS),
  ]);
  const used = items.filter((i) => i.vendorId === id).length;
  const ordered = orders.filter((o) => o.vendorId === id).length;
  if (used || ordered) return { error: "in-use", items: used, orders: ordered };

  const removed = await deleteRow(studio.id, vendorsSection.id, VENDORS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- items -----------------------------------------------------------------
export async function listItems({ studio, itemsSection, vendorsSection, stockSection }) {
  const [items, vendors, movements] = await Promise.all([
    readCol(studio.id, itemsSection.id, ITEMS),
    readCol(studio.id, vendorsSection.id, VENDORS),
    readCol(studio.id, stockSection.id, STOCK),
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
        vendorName: vendorName[i.vendorId] || "",
        onHand: held,
        // "Below reorder level" is derived, so it can never be a stale flag.
        low: i.reorderLevel > 0 && held <= i.reorderLevel,
        // On-hand is the LEDGER's answer; the serial list is a record of which
        // units are held. When a serial-tracked item's two disagree, somebody
        // has moved stock without noting the serial — worth saying so out loud
        // rather than quietly trusting one of them.
        serialMismatch: serials.length > 0 && serials.length !== held,
      };
    });
}

export async function createItem(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.items.create");
  if (denied) return denied;

  const { studio, vendorsSection, itemsSection } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  const vendorId = str(body?.vendorId, 60);
  if (vendorId) {
    const vendors = await readCol(studio.id, vendorsSection.id, VENDORS);
    if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };
  }

  const rows = await readCol(studio.id, itemsSection.id, ITEMS);
  const sku = str(body?.sku, 40).toUpperCase() || nextSku(rows);
  if (rows.some((i) => i.sku.toUpperCase() === sku)) return { error: "duplicate-sku" };

  const item = await addRow(studio.id, itemsSection.id, ITEMS, {
    sku, name,
    // The vendor's own part number, which is what a purchase order quotes and
    // what somebody searches for when the name is ambiguous.
    modelNumber: str(body?.modelNumber, 80),
    unit: UNITS.includes(body?.unit) ? body.unit : UNITS[0],
    category: str(body?.category, 80),
    vendorId,
    // Picked from the vendor's own list of what it supplies; the estimate comes
    // with it rather than being typed again per item.
    itemType: str(body?.itemType, 80),
    deliveryWeeks: weeks(body?.deliveryWeeks),
    // Scope: does this thing need fitting, or configuring, once it lands? The
    // ticket's per-service "without installation/programming" opts out of it.
    needsInstallation: !!body?.needsInstallation,
    needsProgramming: !!body?.needsProgramming,
    // Serials for a serial-tracked item. On-hand still comes from the LEDGER —
    // this records WHICH units are held, not how many.
    serials: cleanSerials(body?.serials),
    reorderLevel: qty(body?.reorderLevel) > 0 ? qty(body.reorderLevel) : 0,
    unitCost: money(body?.unitCost),
    // What that cost is IN. Blank means the studio's own currency, so an item
    // priced in the studio's money needs nothing said about it.
    currency: cur(body?.currency),
    image: img(body?.image),
    notes: str(body?.notes, 1000),
    createdAt: new Date().toISOString(),
  });
  return { item };
}

export async function editItem(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.items.edit");
  if (denied) return denied;

  const { studio, vendorsSection, itemsSection } = ctx;
  const patch = {};
  if (body?.name !== undefined) { const v = str(body.name, 160); if (!v) return { error: "name" }; patch.name = v; }
  if (body?.sku !== undefined) {
    const sku = str(body.sku, 40).toUpperCase();
    if (!sku) return { error: "sku" };
    const rows = await readCol(studio.id, itemsSection.id, ITEMS);
    if (rows.some((i) => i.id !== id && i.sku.toUpperCase() === sku)) return { error: "duplicate-sku" };
    patch.sku = sku;
  }
  if (body?.vendorId !== undefined) {
    const vendorId = str(body.vendorId, 60);
    if (vendorId) {
      const vendors = await readCol(studio.id, vendorsSection.id, VENDORS);
      if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };
    }
    patch.vendorId = vendorId;
  }
  if (body?.unit !== undefined && UNITS.includes(body.unit)) patch.unit = body.unit;
  if (body?.category !== undefined) patch.category = str(body.category, 80);
  if (body?.modelNumber !== undefined) patch.modelNumber = str(body.modelNumber, 80);
  if (body?.itemType !== undefined) patch.itemType = str(body.itemType, 80);
  if (body?.deliveryWeeks !== undefined) patch.deliveryWeeks = weeks(body.deliveryWeeks);
  if (body?.needsInstallation !== undefined) patch.needsInstallation = !!body.needsInstallation;
  if (body?.needsProgramming !== undefined) patch.needsProgramming = !!body.needsProgramming;
  if (body?.serials !== undefined) patch.serials = cleanSerials(body.serials);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.reorderLevel !== undefined) patch.reorderLevel = qty(body.reorderLevel) > 0 ? qty(body.reorderLevel) : 0;
  if (body?.unitCost !== undefined) patch.unitCost = money(body.unitCost);
  if (body?.currency !== undefined) patch.currency = cur(body.currency);
  // "" is a real value — it is how a picture is removed.
  if (body?.image !== undefined) patch.image = img(body.image);

  const item = await updateRow(studio.id, itemsSection.id, ITEMS, id, patch);
  return item ? { item } : { error: "notfound" };
}

// An item with movement history is never deleted — that would erase the record
// of stock that really moved. Items with a clean history can go.
export async function removeItem(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.items.delete");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection, deliveriesSection, stockSection } = ctx;
  const [movements, orders, deliveries] = await Promise.all([
    readCol(studio.id, stockSection.id, STOCK),
    readCol(studio.id, sheetsSection.id, ORDERS),
    readCol(studio.id, deliveriesSection.id, DELIVERIES),
  ]);
  const moved = movements.filter((m) => m.itemId === id).length;
  const onOrder = orders.filter((o) => (o.lines || []).some((l) => l.itemId === id)).length;
  const onDn = deliveries.filter((d) => (d.lines || []).some((l) => l.itemId === id)).length;
  if (moved || onOrder || onDn) return { error: "in-use", movements: moved, orders: onOrder, deliveries: onDn };

  const removed = await deleteRow(studio.id, itemsSection.id, ITEMS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function nextSku(rows) {
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
export function balances(movements) {
  const out = {};
  for (const m of movements) {
    const delta = m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty);
    out[m.itemId] = Math.round(((out[m.itemId] || 0) + delta) * 1000) / 1000;
  }
  return out;
}

export async function listMovements({ studio, stockSection, itemsSection }, { limit = 200 } = {}) {
  const [movements, items, people] = await Promise.all([
    readCol(studio.id, stockSection.id, STOCK),
    readCol(studio.id, itemsSection.id, ITEMS),
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
async function record(ctx, { itemId, kind, quantity, reason, sourceType = "", sourceId = "" }) {
  const { studio, stockSection, collaborator } = ctx;
  return addRow(studio.id, stockSection.id, STOCK, {
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
export async function adjustStock(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
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
  const items = await readCol(studio.id, itemsSection.id, ITEMS);
  if (!items.some((i) => i.id === itemId)) return { error: "item" };

  const amount = qty(body?.qty);
  if (!amount) return { error: "qty" };

  // A negative adjustment can't take an item below zero — you cannot have less
  // than none of something.
  if (amount < 0) {
    const movements = await readCol(studio.id, stockSection.id, STOCK);
    const have = balances(movements)[itemId] || 0;
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
function composeSheet(sheet, quote, vendorOf) {
  const tables = Array.isArray(quote?.tables) ? quote.tables : [];
  const own = sheet.lines && typeof sheet.lines === "object" ? sheet.lines : {};
  // Carried, then added to. `qty` is what was SOLD and belongs to the
  // quotation; everything the sheet knows rides beside it under its own names.
  const carry = (t, r) => ({
    rowId: r.id,
    tableId: t.id,
    tableTitle: t.title || "",
    itemId: r.itemId || "",
    description: r.description || "",
    unit: r.unit || "",
    qty: Number(r.qty) || 0,
    ...(own[r.id] || {}),
  });

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
  const summed = new Map();
  for (const t of tables) {
    for (const r of Array.isArray(t.rows) ? t.rows : []) {
      const line = carry(t, r);
      const key = line.itemId || `free:${line.rowId}`;
      const at = summed.get(key);
      if (at) { at.qty += line.qty; at.fromRows.push(line.rowId); continue; }
      summed.set(key, { ...line, tableTitle: "", fromRows: [line.rowId] });
    }
  }

  const byVendor = new Map();
  for (const line of summed.values()) {
    const vendor = vendorOf(line.itemId);
    const key = vendor?.id || "";
    if (!byVendor.has(key)) {
      byVendor.set(key, { id: key || "unassigned", title: vendor?.name || "No vendor yet", rows: [] });
    }
    byVendor.get(key).rows.push(line);
  }
  // Unassigned last: it is the pile still to be placed, not a vendor.
  return [...byVendor.values()].sort((a, b) => {
    if (a.id === "unassigned") return 1;
    if (b.id === "unassigned") return -1;
    return a.title.localeCompare(b.title);
  });
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
export async function saveSheetLine(ctx, body) {
  const { studio, sheetsSection } = ctx;
  if (!sheetsSection) return { error: "no-section" };

  const sheetId = String(body?.sheetId ?? "").slice(0, 60);
  const rowId = String(body?.rowId ?? "").slice(0, 60);
  if (!sheetId || !rowId) return { error: "missing" };

  const owner = body?.owner === "projects" ? "projects" : "inventory";
  const denied = requirePermission(ctx.access, `${SHEET_OWNERS[owner].permission}.edit`);
  if (denied) return denied;

  const sheets = await readCol(studio.id, sheetsSection.id, SHEETS);
  const sheet = sheets.find((x) => x.id === sheetId);
  if (!sheet) return { error: "notfound" };

  const patch = cleanSheetLine(body?.values, owner);
  if (!Object.keys(patch).length) return { error: "nothing" };

  // Applied to the live row inside the write lock: Inventory setting a serial
  // and Projects marking installation done at the same moment must not
  // overwrite each other, and they write different keys of the same record.
  const updated = await updateRow(studio.id, sheetsSection.id, SHEETS, sheetId, (row) => {
    const lines = row.lines && typeof row.lines === "object" ? row.lines : {};
    return { lines: { ...lines, [rowId]: { ...(lines[rowId] || {}), ...patch } } };
  });
  return updated ? { ok: true, line: updated.lines?.[rowId] || {} } : { error: "notfound" };
}

// Every sheet in the studio, composed. Keys only on the row itself: the project
// number, the client and the quotation number are read back through the ids the
// sheet carries, so a renumbered project or a renamed client needs no migration.
export async function listProjectSheets(ctx) {
  const { studio, sheetsSection, projectsListSection, quotationsSection, itemsSection, vendorsSection } = ctx;
  if (!sheetsSection) return [];
  const [sheets, projects, quotes, items, vendors] = await Promise.all([
    readCol(studio.id, sheetsSection.id, SHEETS),
    projectsListSection ? readCol(studio.id, projectsListSection.id, "projects") : [],
    quotationsSection ? readCol(studio.id, quotationsSection.id, "quotations") : [],
    itemsSection ? readCol(studio.id, itemsSection.id, ITEMS) : [],
    vendorsSection ? readCol(studio.id, vendorsSection.id, VENDORS) : [],
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const vendorOf = (itemId) => vendorById.get(itemById.get(itemId)?.vendorId) || null;

  return [...sheets]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .map((sheet) => {
      const project = projectById.get(sheet.projectId) || null;
      const quote = quoteById.get(sheet.quotationId) || null;
      const tables = composeSheet(sheet, quote, vendorOf);
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

export async function listOrders({ studio, sheetsSection, vendorsSection, itemsSection }) {
  const [orders, vendors, items, projects] = await Promise.all([
    readCol(studio.id, sheetsSection.id, ORDERS),
    readCol(studio.id, vendorsSection.id, VENDORS),
    readCol(studio.id, itemsSection.id, ITEMS),
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
      lines: (o.lines || []).map((l) => ({ ...l, itemLabel: itemLabel[l.itemId] || "(removed item)" })),
      total: orderTotal(o.lines),
      outstanding: (o.lines || []).reduce((n, l) => n + Math.max(0, l.qty - (l.received || 0)), 0),
    }));
}

// The order total is computed from its lines on every read — a client can never
// tell the server what something cost.
export function orderTotal(lines) {
  return Math.round((Array.isArray(lines) ? lines : [])
    .reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0) * 100) / 100;
}

export async function createOrder(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection, vendorsSection } = ctx;
  const vendorId = str(body?.vendorId, 60);
  const vendors = await readCol(studio.id, vendorsSection.id, VENDORS);
  if (!vendors.some((v) => v.id === vendorId)) return { error: "vendor" };

  const projectId = str(body?.projectId, 60);
  if (projectId && !(await projectExists(ctx, projectId))) return { error: "project" };

  const items = await readCol(studio.id, itemsSection.id, ITEMS);
  const lines = cleanLines(body?.lines, items);
  if (!lines.length) return { error: "lines" };

  const orders = await readCol(studio.id, sheetsSection.id, ORDERS);
  const order = await addRow(studio.id, sheetsSection.id, ORDERS, {
    // A purchase order number goes to a vendor, so it cannot be reused after a
    // draft is deleted — derived, not counted. See lib/references.js.
    reference: await nextReference(studio.id, { rows: orders, field: "reference", prefix: "PO" }),
    vendorId, projectId,
    lines,
    status: "Draft",
    expectedAt: day(body?.expectedAt),
    notes: str(body?.notes, 2000),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { order };
}

export async function editOrder(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, itemsSection, sheetsSection } = ctx;
  const orders = await readCol(studio.id, sheetsSection.id, ORDERS);
  const order = orders.find((o) => o.id === id);
  if (!order) return { error: "notfound" };

  const patch = {};
  if (body?.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return { error: "status" };
    // Received/Partly received are consequences of receiving goods, not things
    // you assert — otherwise the status could contradict the ledger.
    if (body.status === "Received" || body.status === "Partly received") return { error: "derived-status" };
    patch.status = body.status;
  }
  if (body?.expectedAt !== undefined) patch.expectedAt = day(body.expectedAt);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.lines !== undefined) {
    // Lines are frozen once anything has been received against them.
    if ((order.lines || []).some((l) => (l.received || 0) > 0)) return { error: "received-already" };
    const items = await readCol(studio.id, itemsSection.id, ITEMS);
    const lines = cleanLines(body.lines, items);
    if (!lines.length) return { error: "lines" };
    patch.lines = lines;
  }
  if (body?.projectId !== undefined) {
    const projectId = str(body.projectId, 60);
    if (projectId && !(await projectExists(ctx, projectId))) return { error: "project" };
    patch.projectId = projectId;
  }

  const updated = await updateRow(studio.id, sheetsSection.id, ORDERS, id, patch);
  return updated ? { order: updated } : { error: "notfound" };
}

// Receiving is the only way stock comes IN from an order. It appends one
// movement per line received and lets the status follow the numbers.
export async function receiveOrder(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, sheetsSection } = ctx;
  const orders = await readCol(studio.id, sheetsSection.id, ORDERS);
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
    const remaining = line.qty - (line.received || 0);
    if (amount > remaining) return { error: "over-receive", itemId, remaining };
  }

  for (const [itemId, amount] of asked) {
    const line = lines.find((l) => l.itemId === itemId);
    line.received = Math.round(((line.received || 0) + amount) * 1000) / 1000;
    await record(ctx, {
      itemId, kind: "in", quantity: amount,
      reason: `Received on ${order.reference}`,
      sourceType: "order", sourceId: order.id,
    });
  }

  const complete = lines.every((l) => (l.received || 0) >= l.qty);
  const updated = await updateRow(studio.id, sheetsSection.id, ORDERS, id, {
    lines,
    status: complete ? "Received" : "Partly received",
    receivedAt: complete ? new Date().toISOString() : order.receivedAt || "",
  });
  return { order: updated };
}

// An order that has received stock is never deleted — the movements it created
// are real. Cancel it instead.
export async function removeOrder(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const { studio, sheetsSection } = ctx;
  const orders = await readCol(studio.id, sheetsSection.id, ORDERS);
  const order = orders.find((o) => o.id === id);
  if (!order) return { error: "notfound" };
  if ((order.lines || []).some((l) => (l.received || 0) > 0)) return { error: "received-already" };

  const removed = await deleteRow(studio.id, sheetsSection.id, ORDERS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- deliveries (stock out, to a project) ----------------------------------
export async function listDeliveries({ studio, itemsSection, deliveriesSection }) {
  const [deliveries, items, projects, people] = await Promise.all([
    readCol(studio.id, deliveriesSection.id, DELIVERIES),
    readCol(studio.id, itemsSection.id, ITEMS),
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
      issuedByAlias: alias[d.issuedByCollaboratorId] || "",
      lines: (d.lines || []).map((l) => ({ ...l, itemLabel: itemLabel[l.itemId] || "(removed item)" })),
      units: (d.lines || []).reduce((n, l) => n + l.qty, 0),
    }));
}

export async function createDelivery(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.create");
  if (denied) return denied;

  const { studio, itemsSection, deliveriesSection } = ctx;
  const projectId = str(body?.projectId, 60);
  if (!projectId) return { error: "project" };
  if (!(await projectExists(ctx, projectId))) return { error: "project" };

  const items = await readCol(studio.id, itemsSection.id, ITEMS);
  const lines = cleanLines(body?.lines, items).map(({ itemId, qty: q }) => ({ itemId, qty: q }));
  if (!lines.length) return { error: "lines" };

  const deliveries = await readCol(studio.id, deliveriesSection.id, DELIVERIES);
  const delivery = await addRow(studio.id, deliveriesSection.id, DELIVERIES, {
    reference: await nextReference(studio.id, { rows: deliveries, field: "reference", prefix: "DN" }),
    projectId, lines,
    status: "Draft",
    notes: str(body?.notes, 2000),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { delivery };
}

// Issuing is the only way stock goes OUT to a project. Availability is checked
// against the ledger at the moment of issue, not when the note was drafted.
export async function issueDelivery(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.edit");
  if (denied) return denied;

  const { studio, stockSection, deliveriesSection } = ctx;
  const [deliveries, movements] = await Promise.all([
    readCol(studio.id, deliveriesSection.id, DELIVERIES),
    readCol(studio.id, stockSection.id, STOCK),
  ]);
  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return { error: "notfound" };
  if (delivery.status === "Issued") return { error: "already-issued" };
  if (delivery.status === "Cancelled") return { error: "cancelled" };

  // Check every line BEFORE writing any movement, so a short line can't leave
  // the note half-issued.
  const have = balances(movements);
  const short = delivery.lines
    .filter((l) => (have[l.itemId] || 0) < l.qty)
    .map((l) => ({ itemId: l.itemId, have: have[l.itemId] || 0, needed: l.qty }));
  if (short.length) return { error: "insufficient", short };

  for (const l of delivery.lines) {
    await record(ctx, {
      itemId: l.itemId, kind: "out", quantity: l.qty,
      reason: `Issued on ${delivery.reference}`,
      sourceType: "delivery", sourceId: delivery.id,
    });
  }

  const updated = await updateRow(studio.id, deliveriesSection.id, DELIVERIES, id, {
    status: "Issued",
    issuedAt: new Date().toISOString(),
    issuedByCollaboratorId: ctx.collaborator.id,
  });
  return { delivery: updated };
}

export async function removeDelivery(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "inventory.stock.delete");
  if (denied) return denied;

  const { studio, deliveriesSection } = ctx;
  const deliveries = await readCol(studio.id, deliveriesSection.id, DELIVERIES);
  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return { error: "notfound" };
  if (delivery.status === "Issued") return { error: "already-issued" };

  const removed = await deleteRow(studio.id, deliveriesSection.id, DELIVERIES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- shared ----------------------------------------------------------------
function cleanLines(list, items) {
  const known = new Set(items.map((i) => i.id));
  const seen = new Set();
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
async function ownerOf(studioId, childKey, parentKey) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return readCol(studio.id, owner.id, PROJECTS);
}

async function projectExists(ctx, projectId) {
  const rows = await projectRows(ctx);
  return rows.some((p) => p.id === projectId);
}

// Projects an order or delivery can be pointed at.
export async function openProjects(ctx) {
  const rows = await projectRows(ctx);
  return rows
    .filter((p) => p.stage !== "Completed")
    .map((p) => ({ id: p.id, number: p.number, title: p.title || "" }));
}

// What Inventory is worth right now, valued at each item's unit cost.
export function stockValue(items) {
  return Math.round(items.reduce((sum, i) => sum + i.onHand * (i.unitCost || 0), 0) * 100) / 100;
}
