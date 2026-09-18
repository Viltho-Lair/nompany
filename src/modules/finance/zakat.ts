// THE ZAKAT WORKSHEET — what a studio in a country that levies zakat owes for a
// fiscal year, computed from its own ledger and the adjustments its accountant
// makes. Built 18/09/2026 on the owner's instruction (the Finance plan, step 4).
//
// A WORKSHEET, NOT A DECLARATION. The regulation's base is built from
// classifications a small chart of accounts does not carry — which liabilities
// are non-current, which investments qualify, which inventory is not for sale.
// So the ledger supplies what it can say for certain (equity, the year's
// result, net fixed assets) and every other line is the accountant's, named and
// signed, and the figure the screen shows is exactly the arithmetic below.
//
// THE METHOD — the country's rule (shared/compliance, `rules.zakat`) supplies
// the rate; the shape follows the 2024 Implementing Regulations (MR 1007):
//
//   base    = additions − deductions
//   floor   : a base below the year's adjusted net profit is lifted to it; with
//             no adjusted profit and no positive base, there is no base at all
//   ceiling : the base is capped at year-end equity (plus the profit
//             adjustments, which is what the regulation adjusts it by)
//   zakat   = base × the zakatable share × rate × days ÷ the Hijri year's days
//
// PURE. No store, no clock.

import { roundMoney } from "@/shared/money";

export type ZakatAdjustment = {
  label: string;
  amount: number;
  /** add: raises the base (a qualifying non-current liability); deduct: lowers it; profit: adjusts the year's profit. */
  kind: "add" | "deduct" | "profit";
};

export type ZakatInputs = {
  /** Every equity account at year end, plus the result no account holds yet. */
  equity: number;
  /** Cost less accumulated depreciation, at year end. */
  netFixedAssets: number;
  /** Income less expense for the fiscal year. */
  profit: number;
  adjustments: readonly ZakatAdjustment[];
  /** The share of the studio owned by zakat payers, 0–100. */
  zakatableShare: number;
  /** Days in the fiscal year. */
  days: number;
};

export type ZakatRule = { rateHijri: number; hijriDays: number };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const ADJUSTMENT_KINDS = ["add", "deduct", "profit"] as const;

/** An adjustment as the accountant typed it, or null when it is not one. */
export function cleanAdjustment(input: Record<string, unknown>): ZakatAdjustment | null {
  const label = String(input?.label ?? "").trim().slice(0, 120);
  const kind = ADJUSTMENT_KINDS.find((k) => k === input?.kind);
  const amount = num(input?.amount);
  if (!label || !kind || !amount) return null;
  return { label, kind, amount };
}

/** Days from `from` to `to`, both counted. */
export function daysIn(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export function zakatWorksheet(inputs: ZakatInputs, rule: ZakatRule, currency?: unknown) {
  const r = (n: number) => roundMoney(n, currency);
  const sum = (kind: ZakatAdjustment["kind"]) => inputs.adjustments.filter((a) => a.kind === kind).reduce((t, a) => t + num(a.amount), 0);

  const additions = r(num(inputs.equity) + sum("add"));
  const deductions = r(num(inputs.netFixedAssets) + sum("deduct"));
  const computed = r(additions - deductions);
  const adjustedProfit = r(num(inputs.profit) + sum("profit"));

  // THE FLOOR: never below the year's adjusted net profit. A loss-making year
  // with no positive base carries no base at all.
  let base = Math.max(computed, adjustedProfit);
  const floored = adjustedProfit > computed;
  if (base < 0) base = 0;
  // THE CEILING: year-end equity, adjusted by the same profit adjustments.
  const ceiling = r(num(inputs.equity) + sum("profit"));
  const capped = ceiling > 0 && base > ceiling;
  if (capped) base = ceiling;
  base = r(base);

  const share = Math.min(100, Math.max(0, num(inputs.zakatableShare)));
  const rate = rule.hijriDays > 0 ? rule.rateHijri * (inputs.days / rule.hijriDays) : 0;
  const zakat = r(base * (share / 100) * (rate / 100));

  return { additions, deductions, computed, adjustedProfit, floored, ceiling, capped, base, share, rate, zakat };
}
