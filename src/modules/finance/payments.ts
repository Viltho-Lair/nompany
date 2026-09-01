// PAYMENTS — money that actually moved, and the one collection here that is
// APPEND-ONLY.
//
// The record's shape and the reasoning behind each field are in
// ./paymentSchema. What this file deliberately does NOT have is an update
// function, and that absence is the design rather than an unfinished piece:
//
//   AN ISSUED PAYMENT NEVER MUTATES. Editing the amount of a receipt that has
//   already been reported changes a number somebody acted on, with nothing
//   anywhere recording that it moved — and the two states are indistinguishable
//   afterwards, which is exactly what a cash record must never permit. A
//   correction is a REVERSAL: a new, opposing record naming the one it undoes.
//   Both stand, so "what did we receive in March" has one answer whenever it is
//   asked. The general ledger already works this way (`reverseEntry` in
//   ./ledger — "a posted entry is never edited, only reversed by a mirror
//   entry"), and cash movements are not a softer case than the postings that
//   describe them.
//
// The same rule is why `reversePayment` writes a new row rather than flipping a
// flag on the old one, and why the one write the original ever takes is a
// back-pointer to its reversal.
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, resolveDealId } from "@/platform/db/engagement";
import type { PaymentRecord } from "./paymentSchema";
import { PAYMENT_DIRECTIONS } from "./paymentSchema";

import type { FinanceContext } from "./types";

type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number];
// A TYPE GUARD RATHER THAN A CAST. `includes` on a readonly tuple does not
// narrow a `string`, and casting would silence the one check standing between a
// typo and a payment that counts in neither direction of a cash report.
const isDirection = (v: string): v is PaymentDirection =>
  (PAYMENT_DIRECTIONS as readonly string[]).includes(v);

const OPPOSITE: Readonly<Record<PaymentDirection, PaymentDirection>> = Object.freeze({
  in: "out", out: "in",
});

const Payments = repo<PaymentRecord>("payments");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
// MONEY IS ROUNDED TO THE CENT ON THE WAY IN and never negative: the direction
// carries the sign (see the schema), so a negative here is a coercion accident
// that would silently subtract from a total it should have added to.
const cash = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

// `cashSection` is a SUB-section and therefore always present — it falls back to
// the Finance root when a studio has no `finance-cash` row — so there is no
// nullable-section guard here of the kind contracts.ts needs for its FOREIGN
// quotations section. The absence of the guard is the type saying so.
export async function listPayments(ctx: FinanceContext, { dealId }: { dealId?: string } = {}) {
  const denied = requirePermission(ctx.access, "finance.cash.view");
  if (denied) return denied;
  const { studio, cashSection } = ctx;
  const where = dealId ? { dealId } : undefined;
  // Ordered by VALUE DATE, not by when the row was written: a transfer entered
  // on Monday for a Friday value date belongs where the money moved.
  return { payments: await Payments.find({ studio, section: cashSection }, { where, order: "date" }) };
}

/**
 * WHAT MOVED, NET, ON THESE ROWS — derived on every read, never stored.
 *
 * Reversals need no special case: a reversal is an opposing record with a
 * positive amount, so summing by direction cancels it out arithmetically. That
 * is the whole reason the schema refuses negative amounts — a "negative receipt"
 * would have to be excluded here by name, and whichever caller forgot would
 * double-count it.
 */
export function paymentTotals(payments: readonly PaymentRecord[]) {
  let received = 0; let paid = 0;
  for (const p of payments) {
    const amount = Number(p?.amount) || 0;
    if (p?.direction === "in") received += amount; else paid += amount;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return { received: round(received), paid: round(paid), net: round(received - paid) };
}

/**
 * Record money moving against a deal.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 *
 * THE DEAL IS REQUIRED even though a payment SURVIVES its deal. Those are
 * different properties and this record is the one that separates them: a payment
 * settles this deal's invoice, so it cannot be created loose (it is not in the
 * unassigned pen's list of types) — and it is still detached rather than
 * destroyed when the deal goes, because money that moved in the world does not
 * un-move (Law 6).
 */
export async function createPayment(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.cash.create");
  if (denied) return denied;

  const { studio, cashSection, collaborator } = ctx;

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const direction = str(body?.direction, 10);
  if (!isDirection(direction)) return { error: "direction" };

  const amount = cash(body?.amount);
  if (!amount) return { error: "amount" };

  // Through the alias table, so a caller holding a derived id lands on the deal
  // that exists rather than on one nothing else can find (Law 3).
  const resolved = await resolveDealId(studio.id, dealId);

  const payment = await Payments.create({ studio, section: cashSection }, {
    reference: "",           // issued later, exactly as a contract's number is
    dealId: resolved,
    direction,
    amount,
    currency: str(body?.currency, 8) || studio.currency || "",
    // DEFAULTED TO TODAY rather than left blank. Every payment moved on some
    // day, and a blank value date sorts to the top of a cash list forever.
    date: str(body?.date, 40) || new Date().toISOString().slice(0, 10),
    method: str(body?.method, 60),
    invoiceId: str(body?.invoiceId, 60),
    billId: str(body?.billId, 60),
    partyId: str(body?.partyId, 60),
    reversalOfPaymentId: "",
    reversedByPaymentId: "",
    note: str(body?.note, 500),
    recordedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });

  // ATTACH, AND DO NOT SWALLOW THE FAILURE. Attaching is the step that can be
  // refused, and a payment that could not join its deal is money the deal's
  // profit figure will never see — the invisible cost Law 7 exists to prevent,
  // in its most expensive form. This is the opposite discipline from the audit
  // trail, whose failure must not fail a write that already happened.
  await attachRecord(studio.id, resolved, "payment", payment.id, payment.createdAt);

  // NO contributeContext CALL, and here the absence is a GUARD rather than a
  // shrug. A payment knows its counterparty, and on an OUTBOUND payment that
  // counterparty is a supplier — offering it as the deal's `clientRef` would
  // write a vendor into the field that names the customer, and because the deal
  // may not have one yet it would FILL A BLANK and succeed. Money is the lowest
  // rank in the precedence table precisely so it cannot win arguments; it must
  // not start one either.

  return { payment };
}

/**
 * UNDO A PAYMENT BY WRITING ITS OPPOSITE — never by editing or deleting it.
 *
 * A bounced cheque, a receipt entered against the wrong deal, a duplicate: all
 * of them are corrected the same way, with a new record moving the same amount
 * the other way and naming the one it undoes. The original stands, because it is
 * true that the entry was made, and a cash history with holes in it cannot be
 * reconciled against a bank statement that has none.
 *
 * THE REVERSAL JOINS THE SAME DEAL, deliberately. Its whole purpose is to cancel
 * the original arithmetically, and a correction sitting on a different deal
 * would leave both deals wrong — one over-credited and one under.
 *
 * GUARDED BY `finance.cash.create` RATHER THAN A `reverse` VERB OF ITS OWN. The
 * ledger has `finance.ledger.reverse` because its screen exists; `finance.cash`
 * carries view/create/edit/delete, and minting an area for a record with no
 * screen yet would move the 123-key permission matrix and every golden that pins
 * it — the same limit the stage registry entry takes. A reversal IS a new
 * payment, so `create` is the honest one of the four.
 */
export async function reversePayment(ctx: FinanceContext, id: string, reason?: unknown) {
  const denied = requirePermission(ctx.access, "finance.cash.create");
  if (denied) return denied;

  const { studio, cashSection, collaborator } = ctx;
  const original = await Payments.byId({ studio, section: cashSection }, id);
  if (!original) return { error: "notfound" };

  // NEITHER TWICE NOR IN A CHAIN. Reversing a reversal is how a correction turns
  // into an argument nobody can read back: the net is right either way, and the
  // history stops saying which entry was the mistake.
  if (original.reversedByPaymentId) return { error: "already-reversed", by: original.reversedByPaymentId };
  if (original.reversalOfPaymentId) return { error: "is-a-reversal" };

  const note = str(reason, 500);

  const reversal = await Payments.create({ studio, section: cashSection }, {
    reference: "",
    dealId: original.dealId,
    // THE OPPOSITE DIRECTION, THE SAME POSITIVE AMOUNT — which is what actually
    // happens in the world when a receipt is given back. It also means
    // paymentTotals cancels the pair without knowing anything about reversals.
    direction: OPPOSITE[original.direction as PaymentDirection],
    amount: original.amount,
    currency: original.currency,
    // THE REVERSAL'S OWN VALUE DATE IS TODAY, not the original's. The money went
    // back when it went back; backdating it to the original would make a period
    // that was reported as balanced silently stop being so.
    date: new Date().toISOString().slice(0, 10),
    method: original.method,
    invoiceId: original.invoiceId,
    billId: original.billId,
    partyId: original.partyId,
    reversalOfPaymentId: original.id,
    reversedByPaymentId: "",
    note,
    recordedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });

  // The reversal joins the deal too — see the header. Not swallowed, for the
  // same reason the original's attach is not.
  await attachRecord(studio.id, String(original.dealId || ""), "payment", reversal.id, reversal.createdAt);

  // STAMP THE ORIGINAL so it cannot be reversed again. A FUNCTION patch, so
  // "mark this reversed" stays a flip under contention (invariant 8) rather than
  // a write of the row as this request last saw it.
  await Payments.update({ studio, section: cashSection }, original.id, () => ({
    reversedByPaymentId: reversal.id,
  }));

  return { reversal };
}
