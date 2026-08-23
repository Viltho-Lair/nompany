// FINANCE 1a — the dashboard's arithmetic, on data that already exists.
//
// Pure functions over the invoice and expense VIEWS the list routes already
// hand out (totals derived, `outstanding`/`dueDate`/`status` present). No new
// records, no schema change — this is the "real value on existing data" half of
// the Finance overhaul, and being pure it is testable to the cent without a
// studio, a session, or a screen.
//
// Every amount is money already (the views rounded it); these only bucket, group
// and divide. A day is compared as an ISO "yyyy-mm-dd" string, which sorts
// correctly and needs no Date to reason about "past due".

import type { InvoiceView, Expense, Bill } from "./types";

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// The minimal shape the aging and "owed by" reports read. An invoice VIEW and a
// bill VIEW both satisfy it — same fields, same meaning — which is the whole
// reason AR and AP share this arithmetic rather than each carrying a copy.
type Owing = { status: string; outstanding?: number; dueDate?: string };

// Only rows that are a live claim: issued/received, not cancelled, not a draft.
// A draft invoice is not yet a receivable and a draft bill is not yet a payable,
// so the same predicate serves both. Generic so it hands the caller back its own
// row type (a debtor lookup still sees `clientName`).
const live = <T extends { status: string }>(rows: T[]): T[] =>
  rows.filter((r) => r.status !== "Cancelled" && r.status !== "Draft");

// Whole days from `from` to `to`, both ISO dates. Positive when `to` is later.
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export type AgingBucket = { key: string; label: string; amount: number; count: number };

/**
 * AR AGING — outstanding money bucketed by how long it has been past due, as of
 * `asOf` (default today). "Current" is anything not yet overdue (including no due
 * date). This is the report a finance team reads first: what is owed, and how
 * stale it is.
 */
export function arAging(invoices: InvoiceView[], asOf = new Date().toISOString().slice(0, 10)) {
  return agingOf(invoices, asOf);
}

/**
 * AP AGING — the payables mirror of {@link arAging}: money WE owe bucketed by how
 * long each bill has been past its due date. Same buckets, same arithmetic, same
 * function underneath — a bill view is an {@link Owing} just as an invoice view
 * is — so the two reports can never drift apart. FINANCE 1b, moderate rung.
 */
export function apAging(bills: Bill[], asOf = new Date().toISOString().slice(0, 10)) {
  return agingOf(bills, asOf);
}

// The shared aging engine both reports run. Kept private: callers reach it
// through the AR/AP wrappers so the intent reads at the call site.
function agingOf(rows: Owing[], asOf: string): { buckets: AgingBucket[]; total: number } {
  const defs: [string, string, (d: number) => boolean][] = [
    ["current", "Current", (d) => d <= 0],
    ["d1_30", "1–30", (d) => d >= 1 && d <= 30],
    ["d31_60", "31–60", (d) => d >= 31 && d <= 60],
    ["d61_90", "61–90", (d) => d >= 61 && d <= 90],
    ["d90", "90+", (d) => d > 90],
  ];
  const buckets: AgingBucket[] = defs.map(([key, label]) => ({ key, label, amount: 0, count: 0 }));
  let total = 0;
  for (const row of live(rows)) {
    const outstanding = row.outstanding ?? 0;
    if (outstanding <= 0) continue;
    // No due date is not yet overdue — it sits in Current, not in the 90+ tail.
    const past = row.dueDate ? daysBetween(row.dueDate, asOf) : 0;
    const idx = defs.findIndex(([, , test]) => test(past));
    const b = buckets[idx < 0 ? 0 : idx];
    b.amount = round(b.amount + outstanding);
    b.count += 1;
    total = round(total + outstanding);
  }
  return { buckets, total };
}

export type Debtor = { clientName: string; owed: number; count: number; oldestDue: string };
export type Vendor = { vendorName: string; owed: number; count: number; oldestDue: string };
type Owed = { owed: number; count: number; oldestDue: string };

// GROUP WHAT IS OWED by a name, largest first, with the oldest unpaid due date so
// a chaser knows where to start. The one engine behind top-debtors (by client)
// and top-vendors (by vendor) — grouped by the NAME the record snapshotted, so it
// reads even if the client or vendor record changed later.
function owedByName<T extends Owing>(rows: T[], nameOf: (r: T) => string, limit: number): (Owed & { name: string })[] {
  const by = new Map<string, Owed & { name: string }>();
  for (const row of live(rows)) {
    const outstanding = row.outstanding ?? 0;
    if (outstanding <= 0) continue;
    const name = nameOf(row) || "—";
    const d = by.get(name) || { name, owed: 0, count: 0, oldestDue: "" };
    d.owed = round(d.owed + outstanding);
    d.count += 1;
    if (row.dueDate && (!d.oldestDue || row.dueDate < d.oldestDue)) d.oldestDue = row.dueDate;
    by.set(name, d);
  }
  return [...by.values()].sort((a, b) => b.owed - a.owed).slice(0, limit);
}

/** TOP DEBTORS — who owes US the most (receivables), largest first. */
export function topDebtors(invoices: InvoiceView[], limit = 5): Debtor[] {
  return owedByName(invoices, (i) => i.clientName, limit)
    .map(({ name, owed, count, oldestDue }) => ({ clientName: name, owed, count, oldestDue }));
}

/** TOP VENDORS — who WE owe the most (payables), largest first. FINANCE 1b. */
export function topVendors(bills: Bill[], limit = 5): Vendor[] {
  return owedByName(bills, (b) => b.vendorName, limit)
    .map(({ name, owed, count, oldestDue }) => ({ vendorName: name, owed, count, oldestDue }));
}

/**
 * COLLECTION RATE over a window — of everything invoiced whose due date fell in
 * the window, how much has been collected. A blunt but honest health number:
 * 1 means everything billed in the window is in; below means money is still out.
 * Returns 0..1, and 1 when nothing was due (nothing to fail to collect).
 */
export function collectionRate(invoices: InvoiceView[], windowDays = 90, asOf = new Date().toISOString().slice(0, 10)): number {
  const from = new Date(`${asOf}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - windowDays);
  const start = from.toISOString().slice(0, 10);
  let invoiced = 0;
  let collected = 0;
  for (const inv of live(invoices)) {
    if (!inv.dueDate || inv.dueDate < start || inv.dueDate > asOf) continue;
    invoiced += inv.total;
    collected += inv.paid;
  }
  if (invoiced <= 0) return 1;
  return round(collected / invoiced);
}

/**
 * DSO — days sales outstanding, the average age of the money owed weighted by
 * amount. "On average a bill sits N days before it is paid." Simpler than the
 * textbook rolling formula and needs no revenue series: Σ(outstanding × age) ÷
 * Σ outstanding, age measured from the due date (0 if not yet due).
 */
export function dso(invoices: InvoiceView[], asOf = new Date().toISOString().slice(0, 10)): number {
  let weighted = 0;
  let base = 0;
  for (const inv of live(invoices)) {
    if (inv.outstanding <= 0) continue;
    const age = inv.dueDate ? Math.max(0, daysBetween(inv.dueDate, asOf)) : 0;
    weighted += inv.outstanding * age;
    base += inv.outstanding;
  }
  return base <= 0 ? 0 : Math.round(weighted / base);
}

export type MonthPoint = { month: string; income: number; expense: number; net: number };

/**
 * INCOME vs EXPENSE by month — collected money in, expenses out, over the last
 * `months`. Income is what was PAID (cash in), not what was billed, so the line
 * matches the bank rather than the ambition. Keyed by "yyyy-mm", oldest first.
 */
export function incomeVsExpense(invoices: InvoiceView[], expenses: Expense[], months = 12, asOf = new Date().toISOString().slice(0, 10)): MonthPoint[] {
  const keys: string[] = [];
  const seed = new Date(`${asOf.slice(0, 7)}-01T00:00:00Z`);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(seed);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  const idx = new Map(keys.map((k, i) => [k, i]));
  const rows: MonthPoint[] = keys.map((month) => ({ month, income: 0, expense: 0, net: 0 }));

  for (const inv of invoices) {
    for (const p of inv.payments || []) {
      const k = String(p.date || "").slice(0, 7);
      const i = idx.get(k);
      if (i != null) rows[i].income = round(rows[i].income + (Number(p.amount) || 0));
    }
  }
  for (const e of expenses) {
    const k = String(e.date || "").slice(0, 7);
    const i = idx.get(k);
    if (i != null) rows[i].expense = round(rows[i].expense + (Number(e.amount) || 0));
  }
  for (const r of rows) r.net = round(r.income - r.expense);
  return rows;
}

export type MixSlice = { category: string; amount: number };

/** EXPENSE MIX — spend by category, largest first, for a donut or a bar list. */
export function expenseMix(expenses: Expense[]): MixSlice[] {
  const by = new Map<string, number>();
  for (const e of expenses) {
    const c = e.category || "Other";
    by.set(c, round((by.get(c) || 0) + (Number(e.amount) || 0)));
  }
  return [...by.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

// ---- fixed assets (FINANCE 1b) --------------------------------------------
//
// The register summary is a pure roll-up of the asset VIEWS the assets route
// hands out (each already carries its derived `bookValue` and `accumulated` from
// depreciationOf). It reads only what it needs, so it neither imports the
// depreciation engine nor recomputes it.

type AssetRow = {
  category?: string;
  method?: string;
  cost?: number;
  accumulated?: number;
  bookValue?: number;
  disposed?: boolean;
};

export type AssetGroup = { label: string; cost: number; bookValue: number; count: number };
export type AssetRegister = {
  count: number;          // assets still on the books (not disposed)
  disposedCount: number;
  totalCost: number;
  totalAccumulated: number;
  netBookValue: number;
  byCategory: AssetGroup[];
  byMethod: AssetGroup[];
};

const METHOD_LABEL: Record<string, string> = {
  "straight-line": "Straight line",
  "reducing-balance": "Reducing balance",
};

/**
 * FIXED-ASSET REGISTER SUMMARY — total cost, total depreciation written off, and
 * net book value across the assets STILL HELD, with a cost/NBV breakdown by
 * category and by method. A disposed asset has left the balance sheet, so it is
 * counted separately and kept out of the totals — a register shows what you own,
 * not what you once owned.
 */
export function assetRegister(assets: AssetRow[]): AssetRegister {
  const held = assets.filter((a) => !a.disposed);
  const cats = new Map<string, AssetGroup>();
  const methods = new Map<string, AssetGroup>();
  let totalCost = 0;
  let totalAccumulated = 0;
  let netBookValue = 0;

  const add = (map: Map<string, AssetGroup>, label: string, cost: number, bookValue: number) => {
    const g = map.get(label) || { label, cost: 0, bookValue: 0, count: 0 };
    g.cost = round(g.cost + cost);
    g.bookValue = round(g.bookValue + bookValue);
    g.count += 1;
    map.set(label, g);
  };

  for (const a of held) {
    const cost = Number(a.cost) || 0;
    const book = Number(a.bookValue) || 0;
    totalCost = round(totalCost + cost);
    totalAccumulated = round(totalAccumulated + (Number(a.accumulated) || 0));
    netBookValue = round(netBookValue + book);
    add(cats, a.category || "Uncategorised", cost, book);
    add(methods, METHOD_LABEL[a.method || ""] || a.method || "—", cost, book);
  }

  const bySize = (a: AssetGroup, b: AssetGroup) => b.cost - a.cost;
  return {
    count: held.length,
    disposedCount: assets.length - held.length,
    totalCost,
    totalAccumulated,
    netBookValue,
    byCategory: [...cats.values()].sort(bySize),
    byMethod: [...methods.values()].sort(bySize),
  };
}
