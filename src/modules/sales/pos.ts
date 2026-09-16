// THE POINT OF SALE — tills, shifts and sales, for a shop's walk-in customers.
// `docs/functionality/pos.md` is the file.
//
// A GENERAL RETAIL TILL, designed around no one trade (the owner, 16/09/2026).
// What a pharmacy or a supermarket needs beyond it — drug tracking, weighed
// items, age checks — is an add-on, and a country's fiscal machinery (a signed
// QR, reporting a receipt to a tax authority) is a layer built per country when
// a studio in it needs one. Neither lives here.
//
// ONLINE ONLY. A till with no connection stops selling; nothing here queues a
// sale for later.
//
// WHO SELLS: `crmSales.pos.create` opens a shift and sells, `crmSales.pos.edit`
// manages tills and the till's settings, `crmSales.pos.discount` changes a
// price at the till, and `crmSales.pos.closeShift` closes a drawer. Each is
// asked for here, in the function that does the act, never only at the route.

import { requirePermission, can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { balances } from "@/modules/inventory/inventory";
import { batchView, batchBalances, pickBatches, type Batch } from "@/modules/inventory/batches";
import type { Item, Movement } from "@/modules/inventory/types";
import { studioVatRate } from "@/shared/vat";
import { documentTaxMethod, studioTaxProfile } from "@/shared/taxProfile";
import { roundMoney } from "@/shared/money";
import {
  cleanPosLines, cleanPayments, posTotals, settle, shiftReport, unitsOf,
  type PosLine, type PosPayment, type ShiftReport,
} from "./posModel";
import type { TaxBreakdown } from "@/shared/documentTotals";
import type { PosContext } from "./types";

export type PosTerminal = { id: string; name: string; active: boolean; createdAt?: string };
export type PosShift = {
  id: string;
  number: string;
  terminalId: string;
  status: "Open" | "Closed";
  openingFloat: number;
  openedAt: string;
  openedByCollaboratorId: string;
  closedAt?: string;
  closedByCollaboratorId?: string;
  countedCash?: number;
  /** THE REPORT AS IT STOOD AT CLOSE — a fact about that moment, stored once. */
  report?: ShiftReport;
  notes?: string;
};
export type PosReceipt = {
  id: string;
  number: string;
  kind: "sale";
  status: "Completed";
  terminalId: string;
  shiftId: string;
  at: string;
  cashierCollaboratorId: string;
  currency: string;
  vatRate: number;
  taxMethod: string;
  pricesIncludeTax: boolean;
  lines: (PosLine & { units: number; picks: { batchId: string; qty: number }[] })[];
  payments: PosPayment[];
  paid: number;
  change: number;
  subtotal: number;
  vat: number;
  total: number;
  breakdown: TaxBreakdown[];
};

const Terminals = repo<PosTerminal>("posTerminals");
const Shifts = repo<PosShift>("posShifts");
const Receipts = repo<PosReceipt>("posReceipts");
const Items = repo<Item>("inventoryItems");
const Stock = repo<Movement>("inventoryStock");
const Batches = repo<Batch>("stockBatches");

export const posContext = moduleContext<PosContext>({
  root: "crm-sales",
  sub: { pos: "crm-sales-pos" },
  // INVENTORY'S, and therefore nullable: a studio with no Inventory has nothing
  // to sell, and the screen says so rather than failing.
  foreign: {
    items: ["inventory-items", "inventory"],
    stock: ["inventory-stock", "inventory"],
  },
  flags: ["pos"],
});

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const scope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.posSection });

type PosSettings = { pricesIncludeTax?: boolean; footer?: string };
const settingsOf = (ctx: PosContext): PosSettings =>
  ((ctx.posSection as { settings?: PosSettings }).settings) || {};

/**
 * HOW THIS STUDIO'S TILL PRICES AND TAXES, resolved once per request.
 *
 * SHELF PRICES INCLUDE TAX unless the studio says otherwise — the default is
 * its country's (shared/taxProfile), and a studio can set it on the till's
 * settings. The item's sell price is read AS the shelf price, which is the
 * convention retail works in; a studio that quotes the same items net to
 * business customers should know the one field serves both.
 */
export function tillTerms(ctx: PosContext) {
  const profile = studioTaxProfile(ctx.studio);
  const s = settingsOf(ctx);
  return {
    currency: String(ctx.studio.currency || ""),
    vatRate: studioVatRate(ctx.studio) ?? 0,
    taxName: profile.taxName,
    // A receipt freezes a method like any document; a studio in no listed
    // country totals per rate on the receipt, the EU's safe reading.
    taxMethod: documentTaxMethod(ctx.studio) || "document",
    pricesIncludeTax: typeof s.pricesIncludeTax === "boolean" ? s.pricesIncludeTax : profile.pricesIncludeTax,
    footer: str(s.footer, 300),
  };
}

// ---- reading ----------------------------------------------------------------

/** Everything the till opens with: its tills, the open shifts, what it can sell. */
export async function posView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "crmSales.pos.view");
  if (denied) return denied;

  const [terminals, shifts, items] = await Promise.all([
    Terminals.find(scope(ctx), { order: "name" }),
    Shifts.find(scope(ctx), { where: { status: "Open" } }),
    ctx.itemsSection ? Items.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([]),
  ]);
  const legal = Array.isArray(ctx.studio.legalInfo) ? ctx.studio.legalInfo as { key?: unknown; value?: unknown }[] : [];

  return {
    terms: tillTerms(ctx),
    studio: {
      name: String(ctx.studio.name || ""),
      logo: String(ctx.studio.logo || ""),
      // The legal rows the studio prints on its documents — its VAT number
      // among them — carried onto the receipt the same way.
      legal: legal
        .map((r) => ({ key: String(r.key ?? ""), value: String(r.value ?? "") }))
        .filter((r) => r.key && r.value.trim()),
    },
    terminals,
    openShifts: shifts,
    // WHAT CAN BE SOLD, without the cost: a cashier has no business reading
    // what the shop paid, and the till needs only the price.
    items: items.map((i) => ({
      id: i.id, name: i.name, sku: i.sku, unit: i.unit,
      barcode: i.barcode || "", packs: i.packs || [],
      sellPrice: Number(i.sellPrice) || 0,
      ...(i.taxCategory ? { taxCategory: i.taxCategory } : {}),
    })),
    hasInventory: Boolean(ctx.itemsSection && ctx.stockSection),
    can: {
      sell: can(ctx.access, "crmSales.pos.create"),
      manage: can(ctx.access, "crmSales.pos.edit"),
      discount: can(ctx.access, "crmSales.pos.discount"),
      closeShift: can(ctx.access, "crmSales.pos.closeShift"),
    },
    me: ctx.collaborator.id,
    asOf: now(),
  };
}

/** One shift, its sales, and what it has taken so far (or took, once closed). */
export async function shiftDetail(ctx: PosContext, id: string) {
  const denied = requirePermission(ctx.access, "crmSales.pos.view");
  if (denied) return denied;
  const shift = await Shifts.byId(scope(ctx), str(id, 60));
  if (!shift) return { error: "notfound" as const };
  const receipts = await Receipts.find(scope(ctx), { where: { shiftId: shift.id }, order: { field: "at", dir: "desc" } });
  const report = shift.status === "Closed" && shift.report
    ? shift.report
    : shiftReport(receipts, { openingFloat: shift.openingFloat, currency: ctx.studio.currency });
  return { shift, receipts, report };
}

// ---- tills and settings ------------------------------------------------------

/** Add a till, or rename or retire one. A till is never deleted: its receipts name it. */
export async function saveTerminal(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.edit");
  if (denied) return denied;
  const name = str(body?.name, 60);
  if (!name) return { error: "name" as const };
  const id = str(body?.id, 60);
  const rows = await Terminals.find(scope(ctx));
  if (rows.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" as const };
  const active = body?.active === undefined ? true : body.active !== false;
  if (id) {
    if (!rows.some((t) => t.id === id)) return { error: "notfound" as const };
    // A TILL WITH AN OPEN SHIFT IS NOT RETIRED under the person using it.
    if (!active) {
      const open = await Shifts.find(scope(ctx), { where: { terminalId: id, status: "Open" } });
      if (open.length) return { error: "shift-open" as const };
    }
    const terminal = await Terminals.update(scope(ctx), id, () => ({ name, active }));
    return terminal ? { terminal } : { error: "notfound" as const };
  }
  return { terminal: await Terminals.create(scope(ctx), { name, active: true, createdAt: now() }) };
}

/** Whether shelf prices include tax, and the line printed at the foot of a receipt. */
export async function savePosSettings(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.edit");
  if (denied) return denied;
  const current = settingsOf(ctx);
  const next: PosSettings = { ...current };
  if (body?.pricesIncludeTax !== undefined) next.pricesIncludeTax = body.pricesIncludeTax === true;
  if (body?.footer !== undefined) next.footer = str(body.footer, 300);
  const section = await updateSection(ctx.studio.id, ctx.posSection.id, { settings: { ...(ctx.posSection.settings || {}), ...next } });
  if (!section) return { error: "notfound" as const };
  return { settings: next };
}

// ---- shifts -----------------------------------------------------------------

/** Open a drawer on a till, with the cash it starts with. One open shift per till. */
export async function openShift(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.create");
  if (denied) return denied;
  const terminalId = str(body?.terminalId, 60);
  const terminal = await Terminals.byId(scope(ctx), terminalId);
  if (!terminal) return { error: "terminal" as const };
  if (terminal.active === false) return { error: "inactive" as const };
  const open = await Shifts.find(scope(ctx), { where: { terminalId, status: "Open" } });
  if (open.length) return { error: "shift-open" as const, shiftId: open[0].id };

  const float = Number(body?.openingFloat);
  if (!Number.isFinite(float) || float < 0) return { error: "float" as const };

  const number = await nextReference(ctx.studio.id, {
    rows: [], field: "number", ...seriesSetting("posShift", ctx.studio.numbering),
  });
  const shift = await Shifts.create(scope(ctx), {
    number,
    terminalId,
    status: "Open",
    openingFloat: roundMoney(float, ctx.studio.currency),
    openedAt: now(),
    openedByCollaboratorId: ctx.collaborator.id,
  });
  return { shift };
}

/**
 * CLOSE A DRAWER: the counted cash is typed, the report is computed from the
 * shift's sales and STORED — what the drawer held at close is a fact about that
 * moment, and a report recomputed later could move under the person who signed
 * it off. The difference is reported, never corrected.
 */
export async function closeShift(ctx: PosContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.closeShift");
  if (denied) return denied;
  const shift = await Shifts.byId(scope(ctx), str(id, 60));
  if (!shift) return { error: "notfound" as const };
  if (shift.status !== "Open") return { error: "closed" as const };
  const counted = Number(body?.countedCash);
  if (!Number.isFinite(counted) || counted < 0) return { error: "counted" as const };

  const receipts = await Receipts.find(scope(ctx), { where: { shiftId: shift.id } });
  const report = shiftReport(receipts, { openingFloat: shift.openingFloat, countedCash: counted, currency: ctx.studio.currency });
  const closed = await Shifts.update(scope(ctx), shift.id, (row) => (row.status !== "Open" ? row : {
    ...row,
    status: "Closed",
    closedAt: now(),
    closedByCollaboratorId: ctx.collaborator.id,
    countedCash: report.countedCash ?? 0,
    report,
    notes: str(body?.notes, 500),
  }));
  if (!closed) return { error: "notfound" as const };
  if (closed.status !== "Closed" || closed.closedByCollaboratorId !== ctx.collaborator.id) return { error: "closed" as const };
  return { shift: closed, report };
}

// ---- selling ----------------------------------------------------------------

/**
 * A SALE: the basket is priced from the items, never from the screen; the
 * stock is checked and taken batch by batch, soonest expiry first; the
 * payments must cover it; then the receipt is written and the stock moved.
 *
 * NOT ONE TRANSACTION, and the order is chosen: the receipt is written first
 * and every movement names it, so a sale whose movements failed to land is a
 * receipt with no movements — findable — rather than stock gone with no receipt.
 * Two tills selling the last unit at once can both pass the check; the ledger
 * then reads below nought, which the stock screen already reports.
 */
export async function createSale(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.create");
  if (denied) return denied;
  if (!ctx.itemsSection || !ctx.stockSection) return { error: "no-inventory" as const };

  const shift = await Shifts.byId(scope(ctx), str(body?.shiftId, 60));
  if (!shift) return { error: "shift" as const };
  if (shift.status !== "Open") return { error: "closed" as const };

  const asked = cleanPosLines(body?.lines);
  if (!asked.length) return { error: "lines" as const };

  const terms = tillTerms(ctx);
  const ids = [...new Set(asked.map((l) => l.itemId))];
  const itemScope = { studio: ctx.studio, section: ctx.itemsSection };
  const stockScope = { studio: ctx.studio, section: ctx.stockSection };
  const [items, movements, batches] = await Promise.all([
    Items.find(itemScope, { where: { id: ids } }),
    Stock.find(stockScope, { where: { itemId: ids } }),
    Batches.find(stockScope, { where: { itemId: ids } }),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const mayReprice = can(ctx.access, "crmSales.pos.discount");

  // PRICED FROM THE ITEM. What the screen sent is only a price when the person
  // holds the right to change one — otherwise the item's own price stands,
  // whatever arrived.
  const lines: PosLine[] = [];
  for (const l of asked) {
    const item = byId.get(l.itemId);
    if (!item) return { error: "item" as const, itemId: l.itemId };
    const pack = l.packName ? (item.packs || []).find((p) => p.name === l.packName) : undefined;
    if (l.packName && !pack) return { error: "pack" as const, itemId: l.itemId, pack: l.packName };
    const unitPrice = Number(item.sellPrice) > 0 ? Number(item.sellPrice) : null;
    const listed = pack
      ? (pack.sellPrice && pack.sellPrice > 0 ? pack.sellPrice : unitPrice !== null ? unitPrice * pack.qty : null)
      : unitPrice;
    const price = mayReprice && l.price > 0 ? l.price : listed;
    if (price === null) return { error: "unpriced" as const, itemId: item.id, name: item.name };
    lines.push({
      itemId: item.id,
      description: pack ? `${item.name} — ${pack.name}` : item.name,
      ...(pack ? { packName: pack.name } : {}),
      packQty: pack ? pack.qty : 1,
      count: l.count,
      price,
      ...(item.taxCategory && item.taxCategory !== "standard" ? { taxCategory: item.taxCategory as "zero" | "exempt" } : {}),
    });
  }

  // THE STOCK, per item across every line of it (a box and two singles are one
  // item's units), taken batch by batch.
  const onHand = balances(movements);
  const rows = batchView(batches, movements, now().slice(0, 10));
  const { untracked } = batchBalances(movements, new Set(batches.map((b) => b.id)));
  const need = new Map<string, number>();
  for (const l of lines) need.set(l.itemId, Math.round(((need.get(l.itemId) || 0) + unitsOf(l)) * 1000) / 1000);
  const picked = new Map<string, ReturnType<typeof pickBatches>>();
  for (const [itemId, units] of need) {
    const pick = pickBatches(itemId, units, rows, Number(untracked[itemId]) || 0);
    if (pick.short > 0) {
      return {
        error: "insufficient" as const,
        itemId,
        name: byId.get(itemId)?.name || "",
        have: Math.max(0, (Number(onHand[itemId]) || 0) - pick.expired),
        needed: units,
        expired: pick.expired,
      };
    }
    picked.set(itemId, pick);
  }

  const totals = posTotals(lines, terms);
  const payments = cleanPayments(body?.payments, terms.currency);
  const settled = settle(totals.total, payments, terms.currency);
  if (settled.problem) return { error: settled.problem, total: totals.total, paid: settled.paid };

  // WHICH BATCH EACH LINE'S UNITS LEFT FROM, handed out line by line from the
  // item's picks so a recall can name the receipt line.
  const remaining = new Map([...picked].map(([k, v]) => [k, v.picks.map((p) => ({ ...p }))]));
  const stored = lines.map((l) => {
    let want = unitsOf(l);
    const picks: { batchId: string; qty: number }[] = [];
    for (const p of remaining.get(l.itemId) || []) {
      if (want <= 0) break;
      const take = Math.min(p.qty, want);
      if (take <= 0) continue;
      picks.push({ batchId: p.batchId, qty: take });
      p.qty = Math.round((p.qty - take) * 1000) / 1000;
      want = Math.round((want - take) * 1000) / 1000;
    }
    return { ...l, units: unitsOf(l), picks };
  });

  const number = await nextReference(ctx.studio.id, {
    rows: [], field: "number", ...seriesSetting("posReceipt", ctx.studio.numbering),
  });
  const at = now();
  const receipt = await Receipts.create(scope(ctx), {
    number,
    kind: "sale",
    status: "Completed",
    terminalId: shift.terminalId,
    shiftId: shift.id,
    at,
    cashierCollaboratorId: ctx.collaborator.id,
    currency: terms.currency,
    vatRate: terms.vatRate,
    taxMethod: terms.taxMethod,
    pricesIncludeTax: terms.pricesIncludeTax,
    lines: stored,
    payments,
    paid: settled.paid,
    change: settled.change,
    subtotal: totals.subtotal,
    vat: totals.vat,
    total: totals.total,
    breakdown: totals.breakdown,
  });

  // ONE MOVEMENT PER BATCH TAKEN, plus one for units from no batch, each at the
  // item's cost that day so what the sale cost can be read later.
  const moves: Record<string, unknown>[] = [];
  for (const [itemId, pick] of picked) {
    const unitCost = Number(byId.get(itemId)?.unitCost);
    const base = {
      itemId, kind: "out", reason: `POS ${number}`,
      sourceType: "pos", sourceId: receipt.id,
      ...(Number.isFinite(unitCost) && unitCost > 0 ? { unitCost } : {}),
      byCollaboratorId: ctx.collaborator.id, at,
    };
    for (const p of pick.picks) moves.push({ ...base, qty: p.qty, batchId: p.batchId });
    if (pick.fromUntracked > 0) moves.push({ ...base, qty: pick.fromUntracked });
  }
  if (moves.length) await Stock.createMany(stockScope, moves);

  return { receipt };
}

/** A shift's receipts, newest first — the till's own history. */
export async function listReceipts(ctx: PosContext, shiftId: string) {
  const denied = requirePermission(ctx.access, "crmSales.pos.view");
  if (denied) return denied;
  return { receipts: await Receipts.find(scope(ctx), { where: { shiftId: str(shiftId, 60) }, order: { field: "at", dir: "desc" } }) };
}
