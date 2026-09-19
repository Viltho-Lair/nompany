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
// WHO SELLS: `crmSales.pos.create` opens a shift and sells,
// `crmSales.pos.discount` changes a price at the till, and
// `crmSales.pos.closeShift` closes a drawer. Since Point of Sale became a
// department (17/09/2026): `pos.settings.edit` manages the tills and the till's
// settings, `pos.sales.view` reads every sale (`.export` downloads them),
// `pos.shifts.view` reads every drawer and `pos.dashboard.view` the summary.
// Each is asked for here, in the function that does the act, never only at the
// route.

import { requirePermission, can, type PermissionKey } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import { repo } from "@/platform/db/repo";
import { updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { balances } from "@/modules/inventory/inventory";
import { batchView, batchBalances, pickBatches, type Batch } from "@/modules/inventory/batches";
import { alertIfLow, reorderList, STOCK_ALERT_RIGHT } from "@/modules/inventory/stockAlerts";
import type { Item, Movement } from "@/modules/inventory/types";
import { studioVatRate } from "@/shared/vat";
import { documentTaxMethod, studioTaxProfile } from "@/shared/compliance/rules";
import { roundMoney } from "@/shared/money";
import {
  cleanPosLines, cleanPayments, posTotals, settle, shiftReport, unitsOf,
  cleanDiscount, priceBasket, discountPercentOf,
  type PosLine, type PosPayment, type ShiftReport,
} from "./posModel";
import type { TaxBreakdown } from "@/shared/documentTotals";
import {
  cleanSalesFilter, filterReceipts, itemsSold, localStamp, salesTotals, soldLines, toCsvFile,
  type SalesFilter,
} from "./posReports";
import type { PosContext } from "./types";
import { clientSlug } from "./salesClients";
import { refundsByShift } from "./posReturns";
import { normalizePhone, maskPhone } from "@/shared/phone";
import { studioLocale } from "@/shared/locale";
import { officialForDocument } from "@/shared/compliance/resolve";
import { legalRowsBeside } from "@/shared/compliance/printing";
import { phoneLookupKey, phoneLookupKeys } from "@/platform/db/lookupKeys";
import { tillLimitOf } from "@/lib/plans";
import { currentSession } from "@/platform/auth/identity";
import { pairedTerminalIn, newPairing, type TillPairing } from "./tillPairing";

/**
 * A TILL. `code` is the till's ID the owner sets up (TILL-01), `pairing` the
 * device it is paired to — its secret's DIGEST only, never shown to anybody
 * (`publicTerminal`). Both 18/09/2026.
 */
export type PosTerminal = {
  id: string; name: string; code?: string; active: boolean; createdAt?: string;
  pairing?: TillPairing | null;
};

/** A till as a screen may see it: whether and when it is paired, never the secret. */
export function publicTerminal(t: PosTerminal) {
  const { pairing, ...rest } = t;
  return {
    ...rest,
    code: t.code || "",
    paired: pairing ? { at: pairing.pairedAt, by: pairing.pairedByCollaboratorId, label: pairing.label } : null,
  };
}

// ---- the paired till (18/09/2026) ---------------------------------------------
//
// EVERY ACT OF THE TILL ITSELF asks this first: opening it, a drawer, a sale, a
// customer's number, its receipts. The answer is the till THIS DEVICE is paired
// to, never one named by the request — so a request cannot sell on a till the
// device is not. A cashier's till session is also held to its own till.
async function requireTill(ctx: PosContext): Promise<PosTerminal | { error: "not-a-till" }> {
  const terminal = await pairedTerminalIn(ctx.studio, ctx.posSection);
  if (!terminal) return { error: "not-a-till" };
  const { state } = await currentSession();
  if (state?.scope === "till" && (state.studioId !== ctx.studio.id || state.terminalId !== terminal.id)) {
    return { error: "not-a-till" };
  }
  return terminal;
}
const isRefusal = (v: unknown): v is { error: string } => Boolean(v && typeof v === "object" && "error" in v);
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
  /** The customer the phone number named, when one was given (18/09/2026). */
  clientId?: string;
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
type PosClient = { id: string; name: string; phoneKey?: string; source?: string; autoNamed?: boolean; contacts?: { name: string; phone: string }[]; createdAt: string };
const Clients = repo<PosClient>("salesClients");

export const posContext = moduleContext<PosContext>({
  // THE POINT OF SALE DEPARTMENT (17/09/2026). The records stay FILED under
  // `crm-sales-pos`, unchanged; the root is where the counter is run from.
  root: "pos",
  // Returns own their rows under `pos-returns` (18/09/2026).
  sub: { pos: "crm-sales-pos", returns: "pos-returns" },
  // INVENTORY'S, and therefore nullable: a studio with no Inventory has nothing
  // to sell, and the screen says so rather than failing.
  foreign: {
    items: ["inventory-items", "inventory"],
    stock: ["inventory-stock", "inventory"],
    // CRM'S CLIENTS, and therefore nullable too: a studio without them keeps
    // selling and simply cannot register a customer's number.
    clients: ["crm-sales-clients", "crm-sales"],
    // FINANCE → CASH, where invoices and credit notes are filed: a return can be
    // against a Documents invoice (18/09/2026). Nullable — no Finance, no
    // invoice returns.
    cash: ["finance-cash", "finance"],
    // APPROVALS', where a return's approval is filed: the Returns screen shows
    // how far each has got. Nullable like every foreign section.
    approvals: "approvals",
  },
  flags: ["pos"],
});

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const scope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.posSection });

// `maxDiscountPercent`: the most a till may take off any line, as a percentage
// of the item's own price — typed price, line discount and basket share
// together. Absent means no cap. Whoever may change this setting is not held
// to it: they could raise it anyway, and a cap they had to lift and lower
// again for one sale would be a cap nobody set back.
type PosSettings = { pricesIncludeTax?: boolean; footer?: string; maxDiscountPercent?: number };
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
    maxDiscountPercent: typeof s.maxDiscountPercent === "number" ? s.maxDiscountPercent : null,
  };
}

// ---- reading ----------------------------------------------------------------

/** Everything the till opens with: its tills, the open shifts, what it can sell. */
export async function posView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "crmSales.pos.view");
  if (denied) return denied;
  const till = await requireTill(ctx);
  if (isRefusal(till)) return { ...till, canPair: can(ctx.access, "pos.settings.edit") };

  const [shifts, items] = await Promise.all([
    Shifts.find(scope(ctx), { where: { status: "Open", terminalId: till.id } }),
    ctx.itemsSection ? Items.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([]),
  ]);

  return {
    terms: tillTerms(ctx),
    studio: {
      name: String(ctx.studio.name || ""),
      logo: String(ctx.studio.logo || ""),
      ...receiptHeading(ctx),
    },
    // THIS DEVICE'S TILL, and only it: the screen no longer picks one.
    terminal: publicTerminal(till),
    terminals: [publicTerminal(till)],
    openShifts: shifts,
    // WHAT CAN BE SOLD, without the cost: a cashier has no business reading
    // what the shop paid, and the till needs only the price.
    items: items.map((i) => ({
      id: i.id, name: i.name, sku: i.sku, unit: i.unit,
      barcode: i.barcode || "",
      sellPrice: Number(i.sellPrice) || 0,
      ...(i.taxCategory ? { taxCategory: i.taxCategory } : {}),
    })),
    hasInventory: Boolean(ctx.itemsSection && ctx.stockSection),
    can: {
      sell: can(ctx.access, "crmSales.pos.create"),
      // Managing the tills is the Settings screen's now; the till links there.
      manage: can(ctx.access, "pos.settings.edit"),
      discount: can(ctx.access, "crmSales.pos.discount"),
      closeShift: can(ctx.access, "crmSales.pos.closeShift"),
      // A customer's number can be taken only where CRM keeps clients.
      customers: Boolean(ctx.clientsSection),
    },
    me: ctx.collaborator.id,
    asOf: now(),
  };
}

/** One shift, its sales, and what it has taken so far (or took, once closed). */
export async function shiftDetail(ctx: PosContext, id: string) {
  // THE TILL'S OWN DRAWER, or any drawer from the shift history.
  if (!can(ctx.access, "crmSales.pos.view") && !can(ctx.access, "pos.shifts.view")) {
    return requirePermission(ctx.access, "pos.shifts.view");
  }
  const shift = await Shifts.byId(scope(ctx), str(id, 60));
  if (!shift) return { error: "notfound" as const };
  const receipts = await Receipts.find(scope(ctx), { where: { shiftId: shift.id }, order: { field: "at", dir: "desc" } });
  const report = shift.status === "Closed" && shift.report
    ? shift.report
    : shiftReport(receipts, {
      openingFloat: shift.openingFloat, currency: ctx.studio.currency,
      refunds: (await refundsByShift(ctx, [shift.id])).get(shift.id) || [],
    });
  return { shift, receipts, report };
}

// ---- tills and settings ------------------------------------------------------

/** Add a till, or rename or retire one. A till is never deleted: its receipts name it. */
export async function saveTerminal(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.settings.edit");
  if (denied) return denied;
  const name = str(body?.name, 60);
  if (!name) return { error: "name" as const };
  const id = str(body?.id, 60);
  const rows = await Terminals.find(scope(ctx));
  if (rows.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" as const };
  // THE TILL'S ID (18/09/2026): typed by the owner, or the next TILL-NN. A code
  // is how a paired device, a receipt and a shift report name the till, so two
  // tills may not share one.
  const code = str(body?.code, 20).toUpperCase() || (rows.find((t) => t.id === id)?.code || nextTillCode(rows));
  if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(code)) return { error: "code" as const };
  if (rows.some((t) => t.id !== id && (t.code || "").toUpperCase() === code)) return { error: "duplicate-code" as const };
  const active = body?.active === undefined ? true : body.active !== false;
  const existing = rows.find((t) => t.id === id);
  if (id && !existing) return { error: "notfound" as const };
  // THE PLAN'S TILLS: a new till, or a retired one brought back, may not take
  // the studio past what its package allows. Renaming never counts.
  const becomesActive = active && (!existing || existing.active === false);
  if (becomesActive) {
    const limit = await tillLimitOf(ctx.studio);
    if (limit !== null && rows.filter((t) => t.active !== false && t.id !== id).length >= limit) {
      return { error: "till-limit" as const, max: limit };
    }
  }
  if (existing) {
    // A TILL WITH AN OPEN SHIFT IS NOT RETIRED under the person using it.
    if (!active) {
      const open = await Shifts.find(scope(ctx), { where: { terminalId: id, status: "Open" } });
      if (open.length) return { error: "shift-open" as const };
    }
    // Retiring a till unpairs it: a retired till's device must not keep selling.
    const terminal = await Terminals.update(scope(ctx), id, () => ({ name, code, active, ...(active ? {} : { pairing: null }) }));
    return terminal ? { terminal: publicTerminal(terminal) } : { error: "notfound" as const };
  }
  return { terminal: publicTerminal(await Terminals.create(scope(ctx), { name, code, active: true, createdAt: now() })) };
}

/** TILL-01, TILL-02 … the first free number. */
function nextTillCode(rows: readonly PosTerminal[]) {
  const taken = new Set(rows.map((t) => (t.code || "").toUpperCase()));
  for (let n = 1; ; n++) {
    const code = `TILL-${String(n).padStart(2, "0")}`;
    if (!taken.has(code)) return code;
  }
}

/**
 * PAIR THE DEVICE MAKING THIS REQUEST TO A TILL. The manager does it from the
 * counter's own computer; the route puts the secret in that browser's cookie.
 * One device per till: a new pairing replaces the old one, whose device stops
 * being a till the moment this is written. Pairing counts against the plan's
 * tills like an active till does.
 */
export async function pairTerminal(ctx: PosContext, terminalId: string, label: string) {
  const denied = requirePermission(ctx.access, "pos.settings.edit");
  if (denied) return denied;
  const rows = await Terminals.find(scope(ctx));
  const terminal = rows.find((t) => t.id === terminalId);
  if (!terminal) return { error: "notfound" as const };
  if (terminal.active === false) return { error: "inactive" as const };
  const limit = await tillLimitOf(ctx.studio);
  if (limit !== null && rows.filter((t) => t.id !== terminalId && t.pairing).length >= limit) {
    return { error: "till-limit" as const, max: limit };
  }
  const { cookieValue, tokenHash } = newPairing(ctx.studio.id, terminalId);
  const pairing: TillPairing = {
    tokenHash, pairedAt: now(), pairedByCollaboratorId: ctx.collaborator.id, label: str(label, 120),
  };
  const updated = await Terminals.update(scope(ctx), terminalId, (row) => ({
    ...row, code: row.code || nextTillCode(rows), pairing,
  }));
  if (!updated) return { error: "notfound" as const };
  return { terminal: publicTerminal(updated), cookieValue };
}

/** Unpair a till from wherever its device is — a lost or replaced counter computer. */
export async function unpairTerminal(ctx: PosContext, terminalId: string) {
  const denied = requirePermission(ctx.access, "pos.settings.edit");
  if (denied) return denied;
  const updated = await Terminals.update(scope(ctx), terminalId, (row) => ({ ...row, pairing: null }));
  return updated ? { terminal: publicTerminal(updated) } : { error: "notfound" as const };
}

/** Whether shelf prices include tax, and the line printed at the foot of a receipt. */
export async function savePosSettings(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.settings.edit");
  if (denied) return denied;
  const current = settingsOf(ctx);
  const next: PosSettings = { ...current };
  if (body?.pricesIncludeTax !== undefined) next.pricesIncludeTax = body.pricesIncludeTax === true;
  if (body?.footer !== undefined) next.footer = str(body.footer, 300);
  if (body?.maxDiscountPercent !== undefined) {
    const raw = body.maxDiscountPercent;
    if (raw === null || raw === "") delete next.maxDiscountPercent;
    else {
      const cap = Number(raw);
      if (!Number.isFinite(cap) || cap < 0 || cap > 100) return { error: "discount-cap" as const };
      next.maxDiscountPercent = Math.round(cap * 100) / 100;
    }
  }
  const section = await updateSection(ctx.studio.id, ctx.posSection.id, { settings: { ...(ctx.posSection.settings || {}), ...next } });
  if (!section) return { error: "notfound" as const };
  return { settings: next };
}

// ---- customers --------------------------------------------------------------
//
// A PHONE NUMBER REGISTERS A REPEAT CUSTOMER (the owner, 18/09/2026). The till
// still sells to walk-ins with no list to pick from; a number, when the
// customer gives one, finds the client it belongs to or makes one. The client
// is CRM's ordinary client, with a PLACEHOLDER name ("Customer ···4567", in the
// studio's language, `autoNamed`) until somebody edits it in CRM.
//
// THE TILL'S OWN RIGHT IS ENOUGH to register one. A cashier holds
// `crmSales.pos.create` and not `crmSales.clients.create`, and requiring the
// second would mean the counter never recognises anybody — the same argument
// that lets a record rule create with the studio's authority. What it can make
// is narrow: a nameless client carrying one phone number, nothing else.
//
// FOUND BY A KEYED HASH, never by the number (platform/db/lookupKeys), because
// every client field is sealed.

const PLACEHOLDER = { en: "Customer", ar: "عميل" } as const;

async function findCustomer(ctx: PosContext, phone: string): Promise<PosClient | null> {
  if (!ctx.clientsSection) return null;
  const keys = phoneLookupKeys(ctx.studio.id, phone);
  if (!keys.length) return null;
  const rows = await Clients.find({ studio: ctx.studio, section: ctx.clientsSection }, { where: { phoneKey: keys } });
  return rows[0] || null;
}

/** Who this number belongs to, and how often they have bought — asked while the basket is open. */
export async function customerLookup(ctx: PosContext, raw: unknown) {
  const denied = requirePermission(ctx.access, "crmSales.pos.create");
  if (denied) return denied;
  const till = await requireTill(ctx);
  if (isRefusal(till)) return till;
  if (!ctx.clientsSection) return { error: "no-clients" as const };
  const phone = normalizePhone(raw, ctx.studio.country);
  if (!phone) return { error: "phone" as const };
  const masked = maskPhone(phone);
  const client = await findCustomer(ctx, phone);
  if (!client) return { known: false, masked };
  const visits = (await Receipts.find(scope(ctx), { where: { clientId: client.id } })).length;
  return { known: true, masked, clientId: client.id, name: client.name, autoNamed: client.autoNamed === true, visits };
}

/** The client a sale's number names — found, or made. Called after every check, just before the write. */
async function customerFor(ctx: PosContext, phone: string): Promise<{ id: string } | { error: "customers-unavailable" }> {
  const found = await findCustomer(ctx, phone);
  if (found) return found;
  const key = phoneLookupKey(ctx.studio.id, phone);
  // NO KEY, NO REGISTRATION: an unhashed number could never be found again.
  if (!key || !ctx.clientsSection) return { error: "customers-unavailable" };
  const name = `${PLACEHOLDER[studioLocale(ctx.studio)] || PLACEHOLDER.en} ${maskPhone(phone)}`;
  return Clients.create({ studio: ctx.studio, section: ctx.clientsSection }, {
    name,
    code: clientSlug(name),
    industry: "",
    website: "",
    notes: "",
    contacts: [{ name: "", email: "", phone, position: "" }],
    locations: [],
    source: "pos",
    autoNamed: true,
    phoneKey: key,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: now(),
  } as unknown as PosClient);
}

// ---- shifts -----------------------------------------------------------------

/** Open a drawer on a till, with the cash it starts with. One open shift per till. */
export async function openShift(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.pos.create");
  if (denied) return denied;
  // THE TILL IS THIS DEVICE'S, whatever the request names.
  const terminal = await requireTill(ctx);
  if (isRefusal(terminal)) return terminal;
  if (body?.terminalId && str(body.terminalId, 60) !== terminal.id) return { error: "not-a-till" as const };
  const terminalId = terminal.id;
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
  // A DRAWER IS COUNTED AT ITS TILL.
  const till = await requireTill(ctx);
  if (isRefusal(till)) return till;
  if (shift.terminalId !== till.id) return { error: "not-a-till" as const };
  if (shift.status !== "Open") return { error: "closed" as const };
  const counted = Number(body?.countedCash);
  if (!Number.isFinite(counted) || counted < 0) return { error: "counted" as const };

  const [receipts, refunds] = await Promise.all([
    Receipts.find(scope(ctx), { where: { shiftId: shift.id } }),
    refundsByShift(ctx, [shift.id]),
  ]);
  // CASH PAID BACK FOR A RETURN LEFT THIS DRAWER, so it is not expected in it.
  const report = shiftReport(receipts, {
    openingFloat: shift.openingFloat, countedCash: counted, currency: ctx.studio.currency,
    refunds: refunds.get(shift.id) || [],
  });
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
  // SOLD AT THIS DEVICE'S TILL, into its own drawer.
  const till = await requireTill(ctx);
  if (isRefusal(till)) return till;
  if (shift.terminalId !== till.id) return { error: "not-a-till" as const };
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
    const listed = Number(item.sellPrice) > 0 ? Number(item.sellPrice) : null;
    const price = mayReprice && l.price > 0 ? l.price : listed;
    if (price === null) return { error: "unpriced" as const, itemId: item.id, name: item.name };
    lines.push({
      itemId: item.id,
      description: item.name,
      count: l.count,
      price,
      ...(listed !== null ? { listPrice: listed } : {}),
      ...(item.taxCategory && item.taxCategory !== "standard" ? { taxCategory: item.taxCategory as "zero" | "exempt" } : {}),
      ...(l.discount ? { discount: l.discount } : {}),
    });
  }

  // ---- discounts ----------------------------------------------------------
  // A DISCOUNT IS THE SAME POWER AS A LOWER PRICE, so it answers to the same
  // right; and the cap is measured against the item's own price, so neither a
  // typed price nor a stack of discounts can walk round it.
  const basket = cleanDiscount(body?.discount);
  const discounted = Boolean(basket) || lines.some((l) => l.discount);
  if (discounted && !mayReprice) return { error: "forbidden" as const };
  const basketPriced = priceBasket(lines, basket, terms.currency);
  const cap = terms.maxDiscountPercent;
  if (cap !== null && !can(ctx.access, "pos.settings.edit")) {
    const over = basketPriced.lines.find((l) => discountPercentOf(l, terms.currency) > cap);
    if (over) return { error: "discount-cap" as const, max: cap, name: over.description };
  }
  lines.splice(0, lines.length, ...basketPriced.lines);

  // THE STOCK, per item across every line of it, taken batch by batch.
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

  // THE CUSTOMER, LAST OF THE CHECKS AND FIRST OF THE WRITES: a number that
  // is not one refuses the sale before anything is written, and a new client
  // is made only for a sale that is otherwise certain to go through.
  let clientId = "";
  if (String(body?.phone ?? "").trim()) {
    if (!ctx.clientsSection) return { error: "no-clients" as const };
    const phone = normalizePhone(body?.phone, ctx.studio.country);
    if (!phone) return { error: "phone" as const };
    const customer = await customerFor(ctx, phone);
    if ("error" in customer) return customer;
    clientId = customer.id;
  }

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
    ...(clientId ? { clientId } : {}),
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
    ...(basketPriced.discountTotal > 0 ? {
      ...(basket ? { discount: basket, basketDiscount: basketPriced.basketDiscount } : {}),
      discountTotal: basketPriced.discountTotal,
    } : {}),
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
  // A SALE CAN TAKE AN ITEM TO ITS REORDER LEVEL — whoever holds the alert is
  // told (modules/inventory/stockAlerts).
  await alertIfLow(ctx.studio, { itemsSection: ctx.itemsSection, stockSection: ctx.stockSection }, Object.fromEntries(need));

  return { receipt };
}

/** A shift's receipts, newest first — the till's own history. */
export async function listReceipts(ctx: PosContext, shiftId: string) {
  const denied = requirePermission(ctx.access, "crmSales.pos.view");
  if (denied) return denied;
  const till = await requireTill(ctx);
  if (isRefusal(till)) return till;
  return { receipts: await Receipts.find(scope(ctx), { where: { shiftId: str(shiftId, 60), terminalId: till.id }, order: { field: "at", dir: "desc" } }) };
}

// ---- the department's screens (17/09/2026) ------------------------------------

type Names = { cashiers: Record<string, string>; tills: Record<string, string>; items: Record<string, string> };

// WHO, WHICH TILL, WHAT ITEM — by the names they carry TODAY. A receipt stores
// ids (invariant 6: a CollaboratorID, never a name), so the list reads the
// person's current name, and a person removed since reads as the id's absence.
async function namesFor(ctx: PosContext): Promise<Names> {
  const [people, terminals, items] = await Promise.all([
    listCollaborators(ctx.studio.id),
    Terminals.find(scope(ctx)),
    ctx.itemsSection ? Items.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([] as Item[]),
  ]);
  return {
    cashiers: Object.fromEntries((people as { id?: unknown; alias?: unknown }[]).map((c) => [String(c.id), String(c.alias || "")])),
    tills: Object.fromEntries(terminals.map((t) => [t.id, t.name])),
    items: Object.fromEntries(items.map((i) => [i.id, i.name])),
  };
}

const allReceipts = (ctx: PosContext) => Receipts.find(scope(ctx));

/**
 * EVERY SALE, filtered — the Sales screen. A row carries what the list shows
 * and the lines with it, so opening one needs no second read. Totals are for
 * what the filter kept.
 */
export async function salesList(ctx: PosContext, raw: Record<string, unknown> | URLSearchParams) {
  const denied = requirePermission(ctx.access, "pos.sales.view");
  if (denied) return denied;
  const filter = cleanSalesFilter(raw);
  const [receipts, names, shifts] = await Promise.all([allReceipts(ctx), namesFor(ctx), Shifts.find(scope(ctx))]);
  const kept = filterReceipts(receipts, filter);
  const shiftNumber = new Map(shifts.map((sh) => [sh.id, sh.number]));
  // The people who have EVER rung a sale up, for the cashier filter — not the
  // whole studio.
  const cashierIds = [...new Set(receipts.map((r) => r.cashierCollaboratorId))];
  return {
    filter,
    terms: tillTerms(ctx),
    totals: salesTotals(kept),
    receipts: kept.slice(0, 2000).map((r) => ({
      ...r,
      cashier: names.cashiers[r.cashierCollaboratorId] || "",
      till: names.tills[r.terminalId] || "",
      shiftNumber: shiftNumber.get(r.shiftId) || "",
    })),
    truncated: kept.length > 2000,
    tills: Object.entries(names.tills).map(([id, name]) => ({ id, name })),
    cashiers: cashierIds.map((id) => ({ id, name: names.cashiers[id] || "" })),
    can: { export: can(ctx.access, "pos.sales.export") },
  };
}

/**
 * WHAT THE TOP OF A RECEIPT SAYS ABOUT THE STUDIO, for the till and for a
 * reprint alike. First the country's OFFICIAL VALUES that a receipt prints
 * (shared/compliance: the country file decides which, the resolver whether each
 * is filled and applies — a Saudi receipt carries the VAT number once the
 * Studio has a VAT rate, a US one carries none). Then the Studio's own Legal
 * information rows, less any that repeat an official number, so a VAT number
 * typed in both places prints once. Labels in both languages: the slip prints in
 * the reader's.
 */
function receiptHeading(ctx: PosContext) {
  const official = officialForDocument(ctx.studio, "receipt", { sectionOn: ctx.on });
  const legal = legalRowsBeside(ctx.studio.legalInfo as { key?: unknown; value?: unknown }[] | undefined, official);
  return {
    official: official.map((p) => ({ key: p.key, label: p.label, value: p.value })),
    legal: legal.map((r) => ({ key: String(r.key ?? ""), value: String(r.value ?? "") })),
  };
}

/** One sale, as stored, with the names and the studio's heading for a reprint. */
export async function receiptDetail(ctx: PosContext, id: string) {
  if (!can(ctx.access, "pos.sales.view") && !can(ctx.access, "crmSales.pos.view")) {
    return requirePermission(ctx.access, "pos.sales.view");
  }
  const receipt = await Receipts.byId(scope(ctx), str(id, 60));
  if (!receipt) return { error: "notfound" as const };
  const names = await namesFor(ctx);
  const shift = await Shifts.byId(scope(ctx), receipt.shiftId);
  return {
    receipt: {
      ...receipt,
      cashier: names.cashiers[receipt.cashierCollaboratorId] || "",
      till: names.tills[receipt.terminalId] || "",
      shiftNumber: shift?.number || "",
    },
    terms: tillTerms(ctx),
    studio: {
      name: String(ctx.studio.name || ""),
      ...receiptHeading(ctx),
    },
  };
}

/**
 * EVERY DRAWER, newest first — the Shift history. A closed shift carries the
 * report stored at close; an open one, what it has taken so far.
 */
export async function shiftsList(ctx: PosContext, raw: Record<string, unknown> | URLSearchParams) {
  const denied = requirePermission(ctx.access, "pos.shifts.view");
  if (denied) return denied;
  const filter = cleanSalesFilter(raw);
  const [shifts, receipts, names] = await Promise.all([Shifts.find(scope(ctx)), allReceipts(ctx), namesFor(ctx)]);
  const byShift = new Map<string, PosReceipt[]>();
  for (const r of receipts) byShift.set(r.shiftId, [...(byShift.get(r.shiftId) || []), r]);
  // Only an OPEN shift's report is computed here; a closed one's is stored.
  const refunds = await refundsByShift(ctx, shifts.filter((sh) => sh.status === "Open").map((sh) => sh.id));
  const rows = shifts
    .filter((sh) => (!filter.from || sh.openedAt >= filter.from) && (!filter.to || sh.openedAt < filter.to))
    .filter((sh) => !filter.terminalIds?.length || filter.terminalIds.includes(sh.terminalId))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .map((sh) => ({
      ...sh,
      till: names.tills[sh.terminalId] || "",
      openedBy: names.cashiers[sh.openedByCollaboratorId] || "",
      closedBy: sh.closedByCollaboratorId ? names.cashiers[sh.closedByCollaboratorId] || "" : "",
      report: sh.status === "Closed" && sh.report
        ? sh.report
        : shiftReport(byShift.get(sh.id) || [], { openingFloat: sh.openingFloat, currency: ctx.studio.currency, refunds: refunds.get(sh.id) || [] }),
    }));
  return {
    terms: tillTerms(ctx),
    studioName: String(ctx.studio.name || ""),
    shifts: rows,
    tills: Object.entries(names.tills).map(([id, name]) => ({ id, name })),
    can: { sales: can(ctx.access, "pos.sales.view") },
  };
}

/**
 * THE COUNTER'S SUMMARY for a period: what it took, what sold most, and every
 * item sold. The period arrives as two instants worked out where the reader is.
 */
export async function posDashboard(ctx: PosContext, raw: Record<string, unknown> | URLSearchParams) {
  const denied = requirePermission(ctx.access, "pos.dashboard.view");
  if (denied) return denied;
  const filter = cleanSalesFilter(raw);
  // WHAT IS RUNNING LOW, for whoever holds the stock alert — the list the owner
  // asked to see beside the takings (modules/inventory/stockAlerts).
  const alerts = can(ctx.access, STOCK_ALERT_RIGHT as PermissionKey) && ctx.itemsSection && ctx.stockSection;
  const [receipts, names, shifts, items, movements] = await Promise.all([
    allReceipts(ctx), namesFor(ctx), Shifts.find(scope(ctx), { where: { status: "Open" } }),
    alerts ? Items.find({ studio: ctx.studio, section: ctx.itemsSection! }) : Promise.resolve([] as Item[]),
    alerts ? Stock.find({ studio: ctx.studio, section: ctx.stockSection! }) : Promise.resolve([] as Movement[]),
  ]);
  const kept = filterReceipts(receipts, { from: filter.from, to: filter.to });
  // DAY BY DAY across the period, by the instant each sale was rung — the
  // screen buckets them into the reader's own days.
  return {
    terms: tillTerms(ctx),
    totals: salesTotals(kept),
    items: itemsSold(kept, names.items),
    sales: kept.map((r) => ({ at: r.at, total: r.total })),
    openShifts: shifts.length,
    reorder: alerts ? reorderList(items, balances(movements)) : null,
    may: {
      sales: can(ctx.access, "pos.sales.view"),
      shifts: can(ctx.access, "pos.shifts.view"),
      export: can(ctx.access, "pos.sales.export"),
    },
  };
}

export const EXPORT_KINDS = ["receipts", "items", "lines"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/**
 * A DOWNLOAD — sales for a period, or what they sold:
 *   receipts  one row per sale
 *   items     one row per item: units, value, receipts, most units first
 *   lines     one row per line sold: when, receipt, cashier, till, item, units
 * Filtered exactly as the list is (period, tills, cashiers, chosen receipts).
 */
export async function exportSales(ctx: PosContext, raw: URLSearchParams) {
  const denied = requirePermission(ctx.access, "pos.sales.export" as PermissionKey);
  if (denied) return denied;
  const kind = (EXPORT_KINDS as readonly string[]).includes(String(raw.get("kind"))) ? String(raw.get("kind")) as ExportKind : "receipts";
  const filter: SalesFilter = cleanSalesFilter(raw);
  const [receipts, names] = await Promise.all([allReceipts(ctx), namesFor(ctx)]);
  const kept = filterReceipts(receipts, filter);
  const currency = String(ctx.studio.currency || "");
  // THE READER'S CLOCK, sent by the screen, so a time in the file is the time
  // the shop saw.
  const offset = Number(raw.get("tz"));
  const when = (iso: string) => localStamp(iso, Number.isFinite(offset) ? offset : 0);

  if (kind === "items") {
    return {
      kind,
      csv: toCsvFile(
        ["Item", "Units sold", `Value${currency ? ` (${currency})` : ""}`, "Receipts"],
        itemsSold(kept, names.items).map((i) => [i.name, i.units, i.value, i.receipts]),
      ),
    };
  }
  if (kind === "lines") {
    return {
      kind,
      csv: toCsvFile(
        ["Date and time", "Receipt", "Cashier", "Till", "Item", "Units", "Price", `Value${currency ? ` (${currency})` : ""}`],
        soldLines(kept, { names: names.items, cashiers: names.cashiers, tills: names.tills })
          .map((l) => [when(l.at), l.receipt, l.cashier, l.till, l.item, l.units, l.price, l.value]),
      ),
    };
  }
  return {
    kind,
    csv: toCsvFile(
      ["Receipt", "Date and time", "Till", "Cashier", "Items", "Subtotal", "Tax", `Total${currency ? ` (${currency})` : ""}`, "Cash", "Card", "Transfer", "Change"],
      kept.map((r) => {
        const paid = (m: string) => (r.payments || []).filter((x) => x.method === m).reduce((t, x) => t + Number(x.amount || 0), 0);
        return [
          r.number, when(r.at), names.tills[r.terminalId] || "", names.cashiers[r.cashierCollaboratorId] || "",
          r.lines.reduce((t, l) => t + Number(l.units ?? l.count), 0),
          r.subtotal, r.vat, r.total, paid("cash"), paid("card"), paid("transfer"), r.change,
        ];
      }),
    ),
  };
}

/** The tills — retired ones too — and how the counter prices: the Settings screen. */
export async function settingsView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "pos.settings.view");
  if (denied) return denied;
  return {
    terms: tillTerms(ctx),
    terminals: (await Terminals.find(scope(ctx), { order: "name" })).map(publicTerminal),
    // WHICH TILL, IF ANY, THIS DEVICE IS — so the screen can say "this device"
    // beside it — and how many the plan allows.
    thisDevice: (await pairedTerminalIn(ctx.studio, ctx.posSection))?.id || "",
    maxTills: await tillLimitOf(ctx.studio),
    can: { edit: can(ctx.access, "pos.settings.edit") },
  };
}
