// A RECORD WRITTEN BEFORE IT CARRIED ITS CURRENCY GAINS ONE, ONCE, ON READ.
//
// Projects, payroll runs and settlement snapshots began keeping the currency
// their money is in on 27/09/2026. Everything written before then had none and
// read the studio's currency TODAY — so the day a studio changed its currency,
// every older payslip and project would have been relabelled. The owner's rule
// is that an update reaches every studio by itself ("IT IS A SYSTEM, IT MUST
// TAKE UPDATES"), so there is no script: the list a screen reads stamps the rows
// it finds without one, and the next read finds nothing to do.
//
// THE PATCH IS A FUNCTION THAT WRITES ONLY INTO A GAP (invariant 8). It runs on
// the row as it stands at write time, so a currency somebody wrote in between —
// or another reader's stamp — is never overwritten.
//
// What a row is stamped WITH is the caller's evidence, best first: a project
// takes its quotation's or tender's frozen currency. Where no record of the
// currency at the time exists, it is the studio's today, which is exactly what
// that row already showed; the stamp only stops it moving from here on.

import type { Row } from "./store";

type Store<T> = {
  updateMany(scope: never, changes: readonly { id: string; patch: Row | ((row: T) => Row) }[]): Promise<number>;
};

/** Where on a row its currency lives. The row's own `currency` by default; a
 *  settlement keeps its inside the event's snapshot (`payload.settlement`).
 *  `get` answers null where the row has nothing to stamp at all. */
export type CurrencySlot<T> = {
  get(row: T): unknown | null;
  set(row: T, code: string): Row;
};

const TOP_LEVEL = {
  get: (row: { currency?: unknown }) => row.currency,
  set: (_row: unknown, code: string) => ({ currency: code }),
};

/** The rows with every missing currency filled in, and those rows written back.
 *  `currencyFor` answers "" when it has no evidence at all (a studio that has
 *  set no currency), and such a row is left alone rather than stamped blank. */
export async function stampCurrency<T extends { id: string }>(
  store: Store<T>, scope: unknown, rows: readonly T[], currencyFor: (row: T) => string,
  slot: CurrencySlot<T> = TOP_LEVEL as unknown as CurrencySlot<T>,
): Promise<T[]> {
  const missing = (r: T) => { const v = slot.get(r); return v !== null && !String(v || "").trim(); };
  const changes: { id: string; patch: (row: T) => Row }[] = [];
  const out = rows.map((r) => {
    if (!missing(r)) return r;
    const code = String(currencyFor(r) || "").trim().toUpperCase();
    if (!code) return r;
    changes.push({ id: r.id, patch: (now) => (missing(now) ? slot.set(now, code) : {}) });
    return { ...r, ...slot.set(r, code) } as T;
  });
  if (changes.length) await store.updateMany(scope as never, changes);
  return out;
}
