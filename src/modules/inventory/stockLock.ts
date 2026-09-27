// ONE WRITER AT A TIME PER ITEM, for the movements that could take it below
// nought.
//
// THE RACE THIS CLOSES. Every such write read the ledger, checked the balance,
// and then appended a movement — three steps, none of them atomic with the
// others. The ledger is ONE ROW PER MOVEMENT (`collection_rows`), so an append
// is an INSERT that no compare-and-set can guard: there is no row whose version
// two writers could both have read. Two issues of the last pump, two write-offs
// approved in the same second, or a put-away racing an issue each passed their
// check against the same balance, and the ledger went below nought with every
// individual check having said yes.
//
// THE MECHANISM IS A LEASE, not a transaction: `claim` is an atomic
// `INSERT … ON CONFLICT` on a per-item key (keys.ts, `S.stockLock`), so exactly
// one writer holds an item at a time; the rest wait a short, FLAT interval
// (invariant 9 — every round has one winner, so N writers drain in N rounds)
// and are refused `in-progress` (409, "try again") if they cannot get in within
// about two seconds. The lease EXPIRES on its own, so a process that dies
// holding one blocks that item for at most `LEASE_SEC`, never for ever.
//
// WHAT IT DOES NOT PROMISE, said plainly because a lock that is believed to be
// stronger than it is is worse than none:
//  • A holder that takes LONGER than the lease loses it silently, and a second
//    writer can then get in. The critical section is one read and one or two
//    writes, so thirty seconds is two orders of magnitude of headroom; a holder
//    that overran does NOT release on the way out (see below), so it cannot
//    delete a lease somebody else now holds.
//  • It serialises only the writers that TAKE it. Receipts need not — adding
//    stock cannot take anything below nought — but anything that removes stock
//    and skips this can still race the ones that use it. Point of Sale's
//    `createSale` (modules/sales/pos.ts) is such a writer today.
//
// THE READ INSIDE MUST BE FRESH. The request cache (platform/db/requestCache)
// remembers a collection for the whole request, so a ledger read before the
// lease was taken would be served again inside it and the check would be
// against the stale balance the lease exists to avoid. `freshLedger` narrows by
// item, which Postgres answers with an UNCACHED query (pgReadColWhere) — and
// reads only the movements that matter, which is also cheaper.

import { randomUUID } from "node:crypto";
import { claim, release } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { repo, type Scope } from "@/platform/db/repo";
import type { Movement } from "./schema";

const LEASE_SEC = 30;
const WAIT_MS = 50;
const ATTEMPTS = 40;

const Stock = repo<Movement>("inventoryStock");

export type StockBusy = { error: "in-progress" };

const pause = () => new Promise((resolve) => setTimeout(resolve, WAIT_MS + Math.floor(Math.random() * 20)));

/**
 * Run `fn` holding the lease on every item named. Items are taken in SORTED
 * order, so two writers wanting the same pair can never each hold one and
 * wait for the other.
 */
export async function withStockLock<R>(
  studioId: string,
  itemIds: readonly string[],
  fn: () => Promise<R>,
): Promise<R | StockBusy> {
  const ids = [...new Set(itemIds.map(String).filter(Boolean))].sort();
  const token = randomUUID();
  const held: string[] = [];
  let firstAt = 0;
  try {
    for (const id of ids) {
      const key = S.stockLock(studioId, id);
      let got = false;
      for (let i = 0; i < ATTEMPTS && !got; i++) {
        got = await claim(key, token, LEASE_SEC);
        if (!got) await pause();
      }
      if (!got) return { error: "in-progress" };
      if (!firstAt) firstAt = Date.now();
      held.push(key);
    }
    return await fn();
  } finally {
    // ONLY WHILE THE LEASE IS STILL OURS. Past its expiry somebody else may
    // hold the key, and `release` deletes whatever is there; leaving it to
    // lapse costs a waiting writer seconds, deleting theirs costs the guarantee.
    if (held.length && Date.now() - firstAt < (LEASE_SEC - 1) * 1000) {
      for (const key of held) await release(key);
    }
  }
}

/** The movements of these items as they stand NOW — never the request cache's copy. */
export async function freshLedger(scope: Scope, itemIds: readonly string[]): Promise<Movement[]> {
  const ids = [...new Set(itemIds.map(String).filter(Boolean))];
  if (!ids.length) return [];
  return Stock.find(scope, { where: { itemId: ids } });
}

export const isStockBusy = (v: unknown): v is StockBusy =>
  Boolean(v && typeof v === "object" && (v as { error?: unknown }).error === "in-progress");
