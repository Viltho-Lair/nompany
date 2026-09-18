// DEPRECIATION, AND WHAT A FIXED ASSET DOES TO THE BOOKS.
//
// PURE. No store, and every date can come in as an argument. Its one
// import is shared/money, the rounding rule, which is itself pure.
//
// THE SCHEDULE IS DERIVED, NEVER STORED (see ./assets): a book value is a
// function of cost, salvage, life, method and the date asked about. The LEDGER,
// though, is a record of what was posted, and the two meet here. A depreciation
// run does not post "this month's charge"; it posts the DIFFERENCE between what
// the schedule says has been written off by the month's end and what the book
// already holds. So a corrected useful life, a late run or a first run on an
// asset bought three years ago all come out right without a special case — the
// next run trues the book up to the schedule.

import { roundMoney, toMinor, fromMinor } from "@/shared/money";
import type { FixedAsset } from "./types";

// Whole months from `from` to `to`, both ISO dates, never negative. A part
// month does not count — depreciation is charged per completed month, the same
// way a lease is. 2026-01-31 → 2026-02-28 is one month; → 2026-02-27 is zero.
function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) return 0;
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  // Not a full final month yet if the day-of-month has not come round.
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export type Depreciation = {
  monthsElapsed: number;
  monthlyDepreciation: number;   // the charge for the CURRENT period
  accumulated: number;           // total written off to date
  bookValue: number;             // cost − accumulated, floored at salvage
  fullyDepreciated: boolean;
  disposed: boolean;
};

/**
 * WHAT AN ASSET IS WORTH, and how much has been written off, as of `asOf`. Two
 * methods:
 *
 *   straight-line — the depreciable base (cost − salvage) spread evenly over the
 *   useful life. The simplest and the default.
 *
 *   reducing-balance — a double-declining charge: a fixed rate (2 ÷ life) of the
 *   REMAINING book value each month, so more is written off early. Never taken
 *   below salvage, and computed month by month so an arbitrary `asOf` lands
 *   exactly where the running book would.
 *
 * Depreciation STOPS at disposal: once `disposedOn` is set, the clock runs only
 * to that date, never past it.
 */
export function depreciationOf(asset: Pick<FixedAsset, "cost" | "salvageValue" | "usefulLifeMonths" | "method" | "acquiredOn" | "disposedOn">, asOf = new Date().toISOString().slice(0, 10), currency?: unknown): Depreciation {
  // In the studio's currency — the book is kept in it — so a dinar asset is
  // written down in fils rather than cents.
  const round = (n: number) => roundMoney(n, currency);
  const cost = Math.max(0, Number(asset.cost) || 0);
  const salvage = Math.min(cost, Math.max(0, Number(asset.salvageValue) || 0));
  const life = Math.max(0, Math.floor(Number(asset.usefulLifeMonths) || 0));
  const disposed = !!asset.disposedOn;
  // The clock stops at disposal — nothing is written off after the asset is gone.
  const until = disposed && asset.disposedOn! < asOf ? asset.disposedOn! : asOf;
  const elapsedRaw = asset.acquiredOn ? monthsBetween(asset.acquiredOn, until) : 0;
  const months = life > 0 ? Math.min(life, elapsedRaw) : 0;
  const base = round(cost - salvage);

  if (base <= 0 || life <= 0) {
    return { monthsElapsed: months, monthlyDepreciation: 0, accumulated: 0, bookValue: round(cost), fullyDepreciated: base <= 0, disposed };
  }

  if (asset.method === "reducing-balance") {
    const rate = Math.min(1, 2 / life);   // double-declining, per month
    let book = cost;
    let accumulated = 0;
    let lastCharge = 0;
    for (let m = 0; m < months; m++) {
      // Pure declining balance asymptotes and never reaches salvage on its own,
      // so the FINAL month of the useful life writes off whatever remains down
      // to salvage — the standard convention that makes the asset land exactly
      // on its residual value at end of life.
      let charge = m === life - 1 ? round(book - salvage) : round(book * rate);
      // Never below salvage — earlier months taper as the book approaches it.
      if (book - charge < salvage) charge = round(book - salvage);
      if (charge < 0) charge = 0;
      book = round(book - charge);
      accumulated = round(accumulated + charge);
      lastCharge = charge;
    }
    return {
      monthsElapsed: months,
      monthlyDepreciation: months >= life ? 0 : lastCharge,
      accumulated,
      bookValue: round(cost - accumulated),
      fullyDepreciated: round(cost - accumulated) <= salvage,
      disposed,
    };
  }

  // straight-line
  const monthly = round(base / life);
  const accumulated = Math.min(base, round(monthly * months));
  return {
    monthsElapsed: months,
    monthlyDepreciation: months >= life ? 0 : monthly,
    accumulated: round(accumulated),
    bookValue: round(cost - accumulated),
    fullyDepreciated: months >= life,
    disposed,
  };
}


// ============================================================================
// WHAT AN ASSET POSTS. Lines by chart CODE, never by id — the ledger resolves
// codes to its own ids, and keeping the arithmetic here keeps it testable.
// ============================================================================

/**
 * HOW AN ASSET WAS PAID FOR, and therefore what its cost is credited to.
 *
 * THIS IS THE QUESTION THE BOOKS CANNOT GUESS, and guessing it double-counts
 * money. An asset bought on a supplier's bill is already in the book as that
 * bill's EXPENSE; crediting the bank as well would take the money out twice.
 * So the acquisition is posted only when somebody has said which:
 *
 *   bank    — paid outright; the cost leaves the bank.
 *   payable — owed to a supplier with no bill in this product; Accounts Payable.
 *   bill    — bought on a bill that is already booked; the cost is MOVED out of
 *             that bill's expense account into Fixed Assets, not paid again.
 *   opening — owned before these books began; Owner's Equity, the same side
 *             every opening balance is taken to.
 */
export const FUNDING_SOURCES = ["bank", "payable", "bill", "opening"] as const;
export type Funding = (typeof FUNDING_SOURCES)[number];
export const isFunding = (v: unknown): v is Funding => (FUNDING_SOURCES as readonly string[]).includes(String(v ?? ""));

export const ASSET_CODES = {
  cost: "1500",         // Fixed Assets
  accumulated: "1510",  // Accumulated Depreciation
  charge: "5400",       // Depreciation (expense)
  disposal: "4900",     // Gain or Loss on Disposal (income)
  bank: "1010",
} as const;

const FUNDING_CODE: Record<Exclude<Funding, "bill">, string> = { bank: "1010", payable: "2000", opening: "3000" };

/** The account an acquisition credits; for a bill, the expense account that bill was booked to. */
export function fundingCode(funding: Funding, billExpenseCode?: string): string | null {
  if (funding === "bill") return billExpenseCode || null;
  return FUNDING_CODE[funding];
}

export type CodeLine = { code: string; debit?: number; credit?: number };

/** Dr Fixed Assets, Cr wherever the money came from — at cost. */
export function acquisitionLines(cost: unknown, creditCode: string, currency?: unknown): CodeLine[] {
  const amount = roundMoney(Number(cost) || 0, currency);
  if (!(amount > 0)) return [];
  return [{ code: ASSET_CODES.cost, debit: amount }, { code: creditCode, credit: amount }];
}

/**
 * WHAT A RUN TO `asOf` STILL HAS TO POST: the schedule's accumulated
 * depreciation at that date, less what the book already holds. Negative when
 * the book holds MORE — a useful life lengthened after a run — and that is
 * posted too, the other way round, because a book ahead of its schedule is as
 * wrong as one behind it.
 */
export function depreciationDue(
  asset: Parameters<typeof depreciationOf>[0],
  alreadyPosted: number,
  asOf: string,
  currency?: unknown,
): number {
  const target = depreciationOf(asset, asOf, currency).accumulated;
  return fromMinor(toMinor(target, currency) - toMinor(alreadyPosted, currency), currency);
}

/** Dr Depreciation, Cr Accumulated Depreciation — or the reverse for a negative true-up. */
export function depreciationLines(due: number): CodeLine[] {
  if (due > 0) return [{ code: ASSET_CODES.charge, debit: due }, { code: ASSET_CODES.accumulated, credit: due }];
  if (due < 0) return [{ code: ASSET_CODES.accumulated, debit: -due }, { code: ASSET_CODES.charge, credit: -due }];
  return [];
}

/**
 * TAKING A DISPOSED ASSET OFF THE BOOKS, in one entry:
 *
 *   - the depreciation the book is still short to the disposal date (a run may
 *     not have reached it), charged to Depreciation;
 *   - Accumulated Depreciation cleared of what the book held;
 *   - the proceeds into the bank;
 *   - the cost out of Fixed Assets;
 *   - and whatever balances that — proceeds less book value — to Gain or Loss
 *     on Disposal. Credited when it is a gain, debited when it is a loss.
 *
 * The same figure the register shows as `gainOnDisposal`, from the same
 * schedule, so the screen and the book cannot disagree about it.
 */
export function disposalLines(
  asset: Parameters<typeof depreciationOf>[0] & { disposalProceeds?: unknown },
  alreadyPosted: number,
  currency?: unknown,
): CodeLine[] {
  const m = (n: unknown) => toMinor(n, currency);
  const back = (n: number) => fromMinor(n, currency);
  const on = String(asset.disposedOn || "");
  const accumulated = m(depreciationOf(asset, on, currency).accumulated);
  const posted = m(alreadyPosted);
  const catchUp = accumulated - posted;
  const cost = m(asset.cost);
  const proceeds = m(asset.disposalProceeds);
  const gain = proceeds + accumulated - cost;

  const lines: CodeLine[] = [];
  if (catchUp > 0) lines.push({ code: ASSET_CODES.charge, debit: back(catchUp) });
  if (catchUp < 0) lines.push({ code: ASSET_CODES.charge, credit: back(-catchUp) });
  if (posted > 0) lines.push({ code: ASSET_CODES.accumulated, debit: back(posted) });
  if (posted < 0) lines.push({ code: ASSET_CODES.accumulated, credit: back(-posted) });
  if (proceeds > 0) lines.push({ code: ASSET_CODES.bank, debit: back(proceeds) });
  if (cost > 0) lines.push({ code: ASSET_CODES.cost, credit: back(cost) });
  if (gain > 0) lines.push({ code: ASSET_CODES.disposal, credit: back(gain) });
  if (gain < 0) lines.push({ code: ASSET_CODES.disposal, debit: back(-gain) });
  return lines;
}
