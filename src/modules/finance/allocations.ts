// ALLOCATIONS — a shared cost spread across the projects, deals, cost codes
// or departments that used it.
//
// PURE. The store half is ./allocationService; asserted in tests/allocations-model.mjs.
//
// THE COST IS ALREADY IN THE BOOKS; what it lacks is an owner. Rent, the
// office manager, the software licences are posted to their accounts naming no
// project, so a project's P&L never carries its share of them and every project
// looks more profitable than the studio is. A rule says how one account's
// UNOWNED part is shared out along one dimension — by fixed percentages, or in
// proportion to what each value earned that month — and the run moves it:
//
//   Cr the account, naming nothing          (the unowned pool, taken out)
//   Dr the account, naming each value       (its share, put back owned)
//
// SAME ACCOUNT BOTH SIDES, so the P&L's total never moves — only who carries
// it. And the pool is only what names NOTHING for that dimension: a cost
// already posted to a project is that project's and is never shared again. Once
// the month is allocated its pool is nought, which is what makes a second run a
// no-op even before the ledger refuses the duplicate.

import { toMinor, fromMinor } from "@/shared/money";
import { DIMENSIONS } from "./statements";
import type { Dimension } from "./statements";

export type AllocationBasis = "fixed" | "revenue";
export type AllocationRule = {
  id?: string;
  name: string;
  accountId: string;
  dimension: Dimension;
  basis: AllocationBasis;
  /** For a fixed basis: each value's share in %, adding up to 100. */
  shares: { value: string; percent: number }[];
};

type Line = { accountId?: unknown; debit?: unknown; credit?: unknown } & Partial<Record<Dimension, unknown>>;
type Entry = { date?: unknown; lines?: unknown };

const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

export function cleanRule(
  body: Record<string, unknown>,
  accounts: { id?: unknown; type?: unknown; active?: unknown }[],
): { rule: AllocationRule } | { problems: string[] } {
  const problems: string[] = [];
  const name = text(body?.name);
  if (!name) problems.push("an allocation needs a name");
  const accountId = text(body?.accountId, 60);
  const a = accounts.find((x) => String(x.id) === accountId);
  // A P&L ACCOUNT: sharing a bank balance across projects means nothing.
  if (!a || a.active === false || (a.type !== "expense" && a.type !== "income")) problems.push("an allocation shares an income or expense account");
  const dim = text(body?.dimension, 20);
  const dimension = (DIMENSIONS as readonly string[]).includes(dim) ? (dim as Dimension) : null;
  if (!dimension) problems.push("an allocation shares along a project, deal, cost code or department");
  const basis: AllocationBasis = body?.basis === "revenue" ? "revenue" : "fixed";
  const shares: { value: string; percent: number }[] = [];
  if (basis === "fixed") {
    const seen = new Set<string>();
    for (const raw of list<Record<string, unknown>>(body?.shares).slice(0, 100)) {
      const value = text(raw?.value, 60);
      const percent = Math.round((Number(raw?.percent) || 0) * 1000) / 1000;
      if (!value || !(percent > 0)) continue;
      if (seen.has(value)) { problems.push("a value appears once in an allocation"); continue; }
      seen.add(value);
      shares.push({ value, percent });
    }
    const total = Math.round(shares.reduce((s, x) => s + x.percent, 0) * 1000) / 1000;
    if (shares.length < 2) problems.push("a fixed allocation shares between at least two");
    else if (total !== 100) problems.push(`the shares add up to ${total}%, not 100%`);
  }
  if (problems.length) return { problems };
  return { rule: { name, accountId, dimension: dimension as Dimension, basis, shares } };
}

/** The account's UNOWNED movement in `period`, in minor units, on its natural side (positive = there is cost or income to share). */
export function unownedPool(entries: Entry[], rule: Pick<AllocationRule, "accountId" | "dimension">, period: string, natural: "debit" | "credit", currency?: unknown): number {
  let net = 0;
  for (const e of list<Entry>(entries)) {
    if (text(e?.date, 7) !== period) continue;
    for (const l of list<Line>(e?.lines)) {
      if (text(l?.accountId) !== rule.accountId || text(l?.[rule.dimension])) continue;
      net += toMinor(l?.debit, currency) - toMinor(l?.credit, currency);
    }
  }
  return natural === "debit" ? net : -net;
}

/** What each value EARNED in `period` — income lines naming it — the revenue basis's weights. */
export function revenueWeights(entries: Entry[], incomeIds: Set<string>, dimension: Dimension, period: string, currency?: unknown): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of list<Entry>(entries)) {
    if (text(e?.date, 7) !== period) continue;
    for (const l of list<Line>(e?.lines)) {
      const v = text(l?.[dimension]);
      if (!v || !incomeIds.has(text(l?.accountId))) continue;
      out.set(v, (out.get(v) || 0) + toMinor(l?.credit, currency) - toMinor(l?.debit, currency));
    }
  }
  for (const [k, n] of out) if (n <= 0) out.delete(k);
  return out;
}

/**
 * SHARE A POOL BY WEIGHTS, in minor units, the remainder to the last so the
 * shares add up to the pool exactly. Empty when there is nothing to share or
 * nothing to share it by.
 */
export function splitPool(pool: number, weights: { value: string; weight: number }[]): { value: string; amount: number }[] {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  if (pool <= 0 || total <= 0) return [];
  const out = weights.map((w) => ({ value: w.value, amount: Math.floor((pool * w.weight) / total) }));
  const given = out.reduce((s, x) => s + x.amount, 0);
  out[out.length - 1].amount += pool - given;
  return out.filter((x) => x.amount > 0);
}

/** The entry that moves the pool: out of the unowned account line, into each value's. */
export function allocationLines(
  rule: Pick<AllocationRule, "accountId" | "dimension">,
  split: { value: string; amount: number }[],
  natural: "debit" | "credit",
  currency?: unknown,
) {
  const pool = split.reduce((s, x) => s + x.amount, 0);
  const side = natural === "debit" ? "debit" : "credit";
  const other = natural === "debit" ? "credit" : "debit";
  const out: Record<string, unknown>[] = [{ accountId: rule.accountId, [other]: fromMinor(pool, currency) }];
  for (const s of split) out.push({ accountId: rule.accountId, [side]: fromMinor(s.amount, currency), [rule.dimension]: s.value });
  return out;
}
