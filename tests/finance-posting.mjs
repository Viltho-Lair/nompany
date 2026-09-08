// THE BOOKS KEEP THEMSELVES — every document that moves money makes an entry.
//
// WHAT THIS EXISTS FOR. `postInvoice`, `postExpense`, `postBill`,
// `postBillPayment` and `postPayment` were written complete when the ledger was
// built and were imported by NOTHING for as long as they existed: a whole
// double-entry book the product could not open, and every entry keyed by hand.
// They have callers now — `autoPost`, from the five acts that make each entry
// true — and this is what proves it, because five functions that are reached by
// nothing look exactly like five functions that work.
//
// IT IS ALSO WHAT GATE A USED TO DO FOR THE INVOICE HALF. That file recorded a
// golden of a posted journal; it was deleted with the rest, and the behaviour it
// covered is more important than the shape of the response that carried it. So
// this asserts the ARITHMETIC — the entry exists, it names its document, and the
// book balances — rather than a recorded body.
//
// A SEPARATE FILE RATHER THAN A BLOCK IN `crud.mjs`, because this is not CRUD:
// nothing here is created and deleted. It is one studio's books being built up
// document by document, and the trial balance at the end is the assertion the
// whole file is for.

import { boot, ok, failureCount, sweep } from "./apiFixture.mjs";

const F = await boot("finpost");

const { financeContext } = await import("@/modules/finance/finance");
const {
  createInvoice, editInvoice, recordPayment, createExpense,
} = await import("@/modules/finance/finance");
const { createBill, recordBillPayment } = await import("@/modules/finance/payables");
const { listJournal, trialBalance } = await import("@/modules/finance/ledger");
const { updateStudio } = await import("@/modules/main/studios");

await F.signIn(F.owner.id);

// A STUDIO NEEDS ITS OWN CURRENCY BEFORE ANY OF THIS WORKS, and `createStudio`
// has never set one — the same rollout consequence bills and bids carry. Set
// here explicitly rather than left to a default, so a refusal in this file is
// always about posting and never about the fixture.
await updateStudio(F.studio.id, { currency: "USD" });

const ctx = async () => financeContext(F.owner, F.slug);

const entriesFor = async (kind, id) => {
  const journal = await listJournal(await ctx());
  return (journal.entries || []).filter((e) => e.source?.kind === kind && e.source?.id === id);
};

// ---- an invoice, issued ----------------------------------------------------
// DRAFT POSTS NOTHING. Revenue is recognised when the invoice is ISSUED, not
// when somebody starts typing one, and a book that posted drafts would carry
// revenue for work nobody had been told about.
const c = await ctx();
const draft = await createInvoice(c, {
  clientName: "Ledger Test Client",
  lines: [{ description: "Consulting", qty: 1, unitPrice: 1000 }],
});
ok("fixture: an invoice is raised", Boolean(draft.invoice?.id), JSON.stringify(draft).slice(0, 200));

const invoiceId = draft.invoice?.id;
if (invoiceId) {
  ok("a DRAFT invoice posts nothing", (await entriesFor("invoice", invoiceId)).length === 0);

  const issued = await editInvoice(await ctx(), invoiceId, { status: "Sent" });
  ok("issuing it reports what the posting did", Boolean(issued.posting),
    JSON.stringify(issued.posting));
  ok("...and the posting succeeded", issued.posting?.posted === true,
    JSON.stringify(issued.posting));
  ok("...and the journal now carries exactly one entry for it",
    (await entriesFor("invoice", invoiceId)).length === 1);

  // ---- money in ------------------------------------------------------------
  // A SECOND ENTRY, not a correction of the first: issuing recognised the
  // revenue and the receivable; this clears the receivable against the bank.
  const paid = await recordPayment(await ctx(), invoiceId, { amount: 400, method: "Bank transfer" });
  ok("recording a payment reports its posting", paid.posting?.posted === true,
    JSON.stringify(paid.posting));
  ok("...and it is its own entry, not a second invoice entry",
    (await entriesFor("invoice", invoiceId)).length === 1);
  ok("...filed against the payment", (await entriesFor("payment", `${invoiceId}:pay1`)).length === 1);

  // ---- A SECOND INVOICE'S FIRST PAYMENT ------------------------------------
  // THE COLLISION THIS FILE FOUND, and it could not fire until now: a payment
  // id is `pay1`, `pay2`… numbered WITHIN its invoice, so every invoice has a
  // `pay1`. `alreadyPosted` matches on kind and id alone, so the second
  // invoice's first payment looks like one already in the book — refused
  // `already-posted`, money never reaching the ledger, and nothing anywhere
  // saying so. Unreachable while the posting functions had no callers.
  const second = await createInvoice(await ctx(), {
    clientName: "Second Client",
    lines: [{ description: "More consulting", qty: 1, unitPrice: 500 }],
  });
  const secondId = second.invoice?.id;
  ok("fixture: a second invoice is raised and issued", Boolean(secondId));
  if (secondId) {
    await editInvoice(await ctx(), secondId, { status: "Sent" });
    const secondPaid = await recordPayment(await ctx(), secondId, { amount: 100 });
    ok("A SECOND INVOICE'S FIRST PAYMENT REACHES THE BOOKS",
      secondPaid.posting?.posted === true, JSON.stringify(secondPaid.posting));
  }
}

// ---- a bill, received ------------------------------------------------------
// THE LIABILITY EXISTS ON RECEIPT, not on approval. Approval authorises
// PAYMENT; the debt is owed from the day the supplier's invoice arrives.
const billed = await createBill(await ctx(), {
  vendorName: "Ledger Test Vendor",
  lines: [{ description: "Materials", qty: 1, unitPrice: 250 }],
});
ok("fixture: a bill is received", Boolean(billed.bill?.id), JSON.stringify(billed).slice(0, 200));

const billId = billed.bill?.id;
if (billId) {
  ok("a bill received posts on creation", billed.posting?.posted === true,
    JSON.stringify(billed.posting));
  ok("...and the journal carries one entry for it",
    (await entriesFor("bill", billId)).length === 1);

  const settled = await recordBillPayment(await ctx(), billId, { amount: 250 });
  ok("paying it reports its own posting", settled.posting?.posted === true,
    JSON.stringify(settled.posting));
  ok("...as a separate entry from the accrual",
    (await entriesFor("bill", billId)).length === 1
    && (await entriesFor("bill-payment", `${billId}:pay1`)).length === 1);
}

// ---- a bill DRAFTED posts nothing ------------------------------------------
const drafted = await createBill(await ctx(), {
  vendorName: "Drafted Vendor", status: "Draft",
  lines: [{ description: "Not yet", qty: 1, unitPrice: 99 }],
});
if (drafted.bill?.id) {
  ok("a DRAFT bill posts nothing", !drafted.posting
    && (await entriesFor("bill", drafted.bill.id)).length === 0,
    JSON.stringify(drafted.posting));
}

// ---- an expense ------------------------------------------------------------
// NO STATES, so there is no later moment to post it at: it is money that has
// already left, being recorded.
const spent = await createExpense(await ctx(), { description: "Taxi", amount: 40 });
ok("fixture: an expense is recorded", Boolean(spent.expense?.id), JSON.stringify(spent).slice(0, 200));
if (spent.expense?.id) {
  ok("an expense posts on creation", spent.posting?.posted === true, JSON.stringify(spent.posting));
  ok("...and is in the journal", (await entriesFor("expense", spent.expense.id)).length === 1);
}

// ---- the assertion the whole file is for -----------------------------------
// EVERY ENTRY ABOVE WAS MADE BY THE PRODUCT, not by this test, and the book
// still balances. Whole cents, not a float compare — `trialBalanceFrom` says so
// itself, and a book that balanced only to within a rounding error would be a
// book nobody could sign.
const tb = await trialBalance(await ctx());
ok("the trial balance balances after every automatic posting", tb.balanced === true,
  `debit ${tb.totalDebit} vs credit ${tb.totalCredit}`);
ok("...and it is not balancing because it is empty",
  Number(tb.totalDebit) > 0, String(tb.totalDebit));

F.signOut();
const pgFailed = await sweep();
console.log(failureCount() ? `\nfinance posting: ${failureCount()} FAILURES\n` : "\nfinance posting: all passed\n");
process.exit((failureCount() || pgFailed) ? 1 : 0);
