// WHAT THE COUNTER SOLD — the pure half of the Point of Sale department's
// Sales list, dashboard and downloads (17/09/2026). `docs/functionality/pos.md`.
//
// PURE AND CLIENT-SAFE: the screen works out a period and the server filters
// and totals with the same functions, so the two cannot disagree about what
// "this week" held or what an item sold. tests/pos-model.mjs asserts them.
//
// A PERIOD IS WORKED OUT WHERE THE READER IS. "Today" is the reader's today —
// a shop in Riyadh closes at midnight Riyadh time, not UTC — so `periodRange`
// takes the reader's clock and the server is handed two instants, never a day.

import { roundSum } from "@/shared/money";
import { PAYMENT_METHODS, type PosPaymentMethod } from "./posModel";

export const PERIODS = ["day", "week", "month", "quarter", "half", "year"] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (v: unknown): v is Period => (PERIODS as readonly unknown[]).includes(v);

/**
 * The period containing `at`, in the local time of whoever calls it:
 * `[from, to)` — `to` is the start of the next period, so a sale at 23:59:59
 * is in and one at midnight is not. `offset` steps whole periods back (-1 is
 * the one before). Weeks start on `firstDayOfWeek` (0 Sunday).
 */
export function periodRange(period: Period, at: Date = new Date(), offset = 0, firstDayOfWeek = 0) {
  const y = at.getFullYear();
  const m = at.getMonth();
  const d = at.getDate();
  let from: Date;
  let to: Date;
  switch (period) {
    case "day":
      from = new Date(y, m, d + offset);
      to = new Date(y, m, d + offset + 1);
      break;
    case "week": {
      const back = (at.getDay() - firstDayOfWeek + 7) % 7;
      from = new Date(y, m, d - back + 7 * offset);
      to = new Date(y, m, d - back + 7 * (offset + 1));
      break;
    }
    case "month":
      from = new Date(y, m + offset, 1);
      to = new Date(y, m + offset + 1, 1);
      break;
    case "quarter": {
      const q = Math.floor(m / 3) * 3;
      from = new Date(y, q + 3 * offset, 1);
      to = new Date(y, q + 3 * (offset + 1), 1);
      break;
    }
    case "half": {
      const h = m < 6 ? 0 : 6;
      from = new Date(y, h + 6 * offset, 1);
      to = new Date(y, h + 6 * (offset + 1), 1);
      break;
    }
    default:
      from = new Date(y + offset, 0, 1);
      to = new Date(y + offset + 1, 0, 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

// ---- the receipts, filtered ------------------------------------------------------

export type SaleLine = {
  itemId: string;
  description: string;
  count: number;
  price: number;
  units?: number;
};
export type SaleReceipt = {
  id: string;
  number: string;
  at: string;
  terminalId: string;
  shiftId: string;
  cashierCollaboratorId: string;
  status?: string;
  total: number;
  subtotal: number;
  vat: number;
  lines: readonly SaleLine[];
  payments?: readonly { method: PosPaymentMethod; amount: number }[];
};

export type SalesFilter = {
  from?: string;
  to?: string;
  terminalIds?: readonly string[];
  cashierIds?: readonly string[];
  shiftIds?: readonly string[];
  receiptIds?: readonly string[];
  methods?: readonly string[];
  /** A receipt number, or part of an item's name on it. */
  q?: string;
};

const list = (v: unknown, max = 200): string[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(","))
    .map((x) => String(x ?? "").trim().slice(0, 80)).filter(Boolean).slice(0, max);

const instant = (v: unknown): string => {
  const s = String(v ?? "").trim();
  const t = Date.parse(s);
  return s && Number.isFinite(t) ? new Date(t).toISOString() : "";
};

/** A filter as the server accepts it, from a query string or a body. */
export function cleanSalesFilter(raw: Record<string, unknown> | URLSearchParams): SalesFilter {
  const get = (k: string) => (raw instanceof URLSearchParams ? raw.get(k) : raw?.[k]);
  const methods = list(get("methods")).filter((m) => (PAYMENT_METHODS as readonly string[]).includes(m));
  return {
    from: instant(get("from")),
    to: instant(get("to")),
    terminalIds: list(get("terminalIds")),
    cashierIds: list(get("cashierIds")),
    shiftIds: list(get("shiftIds")),
    receiptIds: list(get("receiptIds"), 1000),
    methods,
    q: String(get("q") ?? "").trim().slice(0, 80),
  };
}

export function filterReceipts<R extends SaleReceipt>(receipts: readonly R[], f: SalesFilter): R[] {
  const q = (f.q || "").toLowerCase();
  const inList = (xs: readonly string[] | undefined, v: string) => !xs?.length || xs.includes(v);
  return receipts
    .filter((r) => (r.status || "Completed") !== "Voided")
    .filter((r) => (!f.from || r.at >= f.from) && (!f.to || r.at < f.to))
    .filter((r) => inList(f.terminalIds, r.terminalId) && inList(f.cashierIds, r.cashierCollaboratorId)
      && inList(f.shiftIds, r.shiftId) && inList(f.receiptIds, r.id))
    .filter((r) => !f.methods?.length || (r.payments || []).some((p) => f.methods!.includes(p.method)))
    .filter((r) => !q || r.number.toLowerCase().includes(q)
      || r.lines.some((l) => l.description.toLowerCase().includes(q)))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** What a set of receipts took: how many, how much, the tax, and by method. */
export function salesTotals(receipts: readonly SaleReceipt[]) {
  const byMethod: Record<string, number> = {};
  let items = 0;
  for (const r of receipts) {
    for (const p of r.payments || []) byMethod[p.method] = roundSum((byMethod[p.method] || 0) + Number(p.amount || 0));
    for (const l of r.lines) items = roundSum(items + lineUnits(l));
  }
  return {
    sales: receipts.length,
    total: roundSum(receipts.reduce((s, r) => s + Number(r.total || 0), 0)),
    subtotal: roundSum(receipts.reduce((s, r) => s + Number(r.subtotal || 0), 0)),
    vat: roundSum(receipts.reduce((s, r) => s + Number(r.vat || 0), 0)),
    items,
    average: receipts.length ? roundSum(receipts.reduce((s, r) => s + Number(r.total || 0), 0) / receipts.length) : 0,
    byMethod: PAYMENT_METHODS.map((method) => ({ method, amount: byMethod[method] || 0 })).filter((m) => m.amount > 0),
  };
}

// A line's units: stored on every receipt written by the till; `count` for any
// line that has none.
const lineUnits = (l: SaleLine) => Number(l.units ?? l.count) || 0;
// A line's value AS THE SHELF PRICED IT — what the customer paid for it, before
// the receipt's own rounding. The receipt's total stays the figure of record.
const lineValue = (l: SaleLine) => roundSum(Number(l.count || 0) * Number(l.price || 0));

export type ItemSold = {
  itemId: string;
  name: string;
  units: number;
  value: number;
  receipts: number;
};

/**
 * WHAT SOLD, one row per item, most units first — the dashboard's chart and the
 * "items sold" download. `names` is the item register's current names, so an
 * item renamed since is listed once under its name today; an item deleted since
 * keeps the name the receipt printed.
 */
export function itemsSold(receipts: readonly SaleReceipt[], names: Readonly<Record<string, string>> = {}): ItemSold[] {
  const out = new Map<string, ItemSold & { seen: Set<string> }>();
  for (const r of receipts) {
    for (const l of r.lines) {
      const row = out.get(l.itemId)
        || { itemId: l.itemId, name: names[l.itemId] || l.description, units: 0, value: 0, receipts: 0, seen: new Set<string>() };
      row.units = roundSum(row.units + lineUnits(l));
      row.value = roundSum(row.value + lineValue(l));
      if (!row.seen.has(r.id)) { row.seen.add(r.id); row.receipts += 1; }
      out.set(l.itemId, row);
    }
  }
  return [...out.values()]
    .map(({ seen: _seen, ...row }) => row)
    .sort((a, b) => b.units - a.units || b.value - a.value || a.name.localeCompare(b.name));
}

export type SoldLine = {
  at: string;
  receipt: string;
  cashier: string;
  till: string;
  itemId: string;
  item: string;
  units: number;
  price: number;
  value: number;
};

/** Every line sold, newest first — the detailed "items sold" download. */
export function soldLines(
  receipts: readonly SaleReceipt[],
  { names = {}, cashiers = {}, tills = {} }:
  { names?: Readonly<Record<string, string>>; cashiers?: Readonly<Record<string, string>>; tills?: Readonly<Record<string, string>> } = {},
): SoldLine[] {
  const out: SoldLine[] = [];
  for (const r of receipts) {
    for (const l of r.lines) {
      out.push({
        at: r.at,
        receipt: r.number,
        cashier: cashiers[r.cashierCollaboratorId] || "",
        till: tills[r.terminalId] || "",
        itemId: l.itemId,
        item: names[l.itemId] || l.description,
        units: lineUnits(l),
        price: Number(l.price || 0),
        value: lineValue(l),
      });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

// ---- CSV ------------------------------------------------------------------------

/**
 * AN INSTANT AS THE READER'S CLOCK SHOWED IT — "2026-09-17 14:58" — for a file
 * opened in a spreadsheet, where a UTC timestamp reads as the wrong hour.
 * `offsetMinutes` is the browser's own `getTimezoneOffset()` (UTC minus local).
 */
export function localStamp(iso: string, offsetMinutes = 0): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const off = Number.isFinite(offsetMinutes) ? Math.max(-840, Math.min(840, offsetMinutes)) : 0;
  const d = new Date(t - off * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * RFC 4180, with the byte-order mark Excel needs to read Arabic — the one format
 * this product downloads (reports/export writes the same). A cell that starts
 * like a formula is prefixed with an apostrophe, so a typed item name cannot run
 * as a formula in whoever opens the file.
 */
export function toCsvFile(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
