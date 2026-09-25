// WHAT A CUSTOMER TELLS NOMPANY ABOUT MONEY — "I have sent the transfer" and
// "I want this refunded" — and what nompany answers. Pure: no store, no clock.
//
// A CLAIM IS NOT A PAYMENT (the owner, 26/09/2026). Online payment is not built
// yet, so a customer pays by bank transfer and says so; nompany checks its bank
// and answers. Until it does, the claim moves no date: `paidUntil` moves only
// when nompany RECORDS the payment (shared/subscription's `paid` event), and
// confirming a claim is exactly that.
//
// WHAT A CLAIM DOES DO is hold the ladder for a short while. A bank transfer
// takes one to twenty-four hours to land, sometimes longer (the owner), so a
// customer who paid on day 19 must not be closed on day 20 while the money is
// in flight. A PENDING transfer claim keeps the studio fully working for
// `holdHours` from the moment it was made — set in /super → Payments, 48 by
// default. It is never longer than that: a claim nobody answers is not a way to
// keep working unpaid, and it cannot be renewed by claiming again, because only
// one transfer claim may be open at a time.
//
// THE CUSTOMER'S OWN WORDS ARE SEALED. The payer's name, the bank's reference
// and any note are stored encrypted (platform/auth/fieldCrypto) as `sealed`;
// only the amounts, dates and statuses are plain, because those are what the
// ladder and the console's lists read.

export type ClaimStatus = "pending" | "confirmed" | "rejected" | "refunded" | "declined" | "withdrawn";

/** What the upgrade request asked for when the transfer was claimed — locked, like the quote. */
export type ClaimedPlan = {
  packageId: string; categoryId: string; tierId: string; cycle: "monthly" | "yearly";
  seats: number; amount: number; taxPercent: number; tax: number; total: number; currency: string;
};

export type Answer = {
  at: string;
  /** The console user who answered. */
  by: string;
  reason?: string;
  /** The billing event it recorded, when it recorded one. */
  eventId?: string;
  /** The invoice or credit note it issued, when it issued one. */
  documentNo?: string;
  amount?: number;
  currency?: string;
};

type ClaimBase = {
  id: string;
  at: string;
  /** The user who made it — the studio's owner. */
  by: string;
  status: ClaimStatus;
  /** Encrypted JSON: see `TransferPrivate` / `RefundPrivate`. */
  sealed: string;
  answer?: Answer;
};

/** "I have sent the transfer." */
export type TransferClaim = ClaimBase & {
  kind: "transfer";
  amount: number;
  currency: string;
  /** The day the customer says they sent it (YYYY-MM-DD). */
  sentOn: string;
  /** What it pays for — the open upgrade request at the time, or null for a plain renewal. */
  plan: ClaimedPlan | null;
};

/** "Please refund this invoice." */
export type RefundRequest = ClaimBase & {
  kind: "refund";
  /** The invoice it asks about. */
  invoiceNo: string;
};

export type Claim = TransferClaim | RefundRequest;

export type TransferPrivate = { payerName: string; bankReference: string; note: string };
export type RefundPrivate = { reason: string };

export const DEFAULT_CLAIM_HOLD_HOURS = 48;
export const MAX_CLAIM_HOLD_HOURS = 168;
/** A transfer older than this is not "just sent"; it is a conversation with nompany. */
export const CLAIM_LOOKBACK_DAYS = 60;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const cleanHoldHours = (v: unknown) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_CLAIM_HOLD_HOURS) : DEFAULT_CLAIM_HOLD_HOURS;
};

/**
 * UNTIL WHEN A PENDING TRANSFER CLAIM HOLDS THE LADDER, as an ISO instant, or ""
 * when nothing holds it. Only the newest pending transfer counts — there is
 * only ever one — and a hold that has run out is "".
 */
export function claimHoldUntil(claims: readonly Claim[] | undefined, nowIso: string, holdHours: number): string {
  const hours = cleanHoldHours(holdHours);
  if (!hours) return "";
  const now = Date.parse(nowIso);
  let until = 0;
  for (const c of claims || []) {
    if (c.kind !== "transfer" || c.status !== "pending") continue;
    const t = Date.parse(c.at) + hours * 3_600_000;
    if (Number.isFinite(t) && t > now && t > until) until = t;
  }
  return until ? new Date(until).toISOString() : "";
}

/**
 * WHAT THE STUDIO MAY DO WITH A HOLD IN PLACE. A held studio works fully,
 * whatever the ladder says — the point of the hold is that nobody is closed or
 * locked out while their money is in flight.
 */
export function heldAccess<A extends string>(access: A, holdUntil: string): A | "full" {
  return holdUntil ? "full" : access;
}

/** The open transfer claim, if there is one. */
export const openTransfer = (claims: readonly Claim[] | undefined) =>
  (claims || []).find((c): c is TransferClaim => c.kind === "transfer" && c.status === "pending") || null;

/** Why a transfer claim cannot be accepted as typed, or "". */
export function transferProblem(
  input: { amount: unknown; currency: unknown; sentOn: unknown; bankReference: unknown },
  today: string,
): "" | "bad-amount" | "bad-currency" | "bad-date" | "missing-reference" {
  const amount = Number(input.amount);
  if (!(Number.isFinite(amount) && amount > 0 && amount < 1e9)) return "bad-amount";
  if (!/^[A-Z]{3}$/.test(String(input.currency || ""))) return "bad-currency";
  const sentOn = String(input.sentOn || "");
  // A DAY OF SLACK FORWARD: "today" is Amman's, and a customer east of it is
  // already on tomorrow's date when they send.
  const latest = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  if (!DAY.test(sentOn) || sentOn > latest) return "bad-date";
  const earliest = new Date(Date.parse(`${today}T00:00:00Z`) - CLAIM_LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (sentOn < earliest) return "bad-date";
  if (String(input.bankReference || "").trim().length < 3) return "missing-reference";
  return "";
}

/**
 * THE REFERENCE A CUSTOMER WRITES ON THE TRANSFER, so nompany can find it in
 * the bank statement: the studio's address and a short day stamp. Stable for a
 * given request, so the dialog and the billing page show the same one.
 */
export function transferReference(slug: string, requestedAt: string): string {
  const d = String(requestedAt || "").slice(0, 10).replace(/-/g, "");
  return `NOMPANY-${String(slug || "").toUpperCase()}${d ? `-${d}` : ""}`.slice(0, 35);
}
