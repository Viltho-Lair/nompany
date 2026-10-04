// DEBIT NOTES — what may be added to an invoice, what it does to the balance,
// the VAT return and the books, and how it reaches a tax authority that wants
// it (04/10/2026). Pure, so it needs no database.
//
// FOR EVERY COUNTRY: a debit note is ordinary accounting — owed, posted, in the
// return wherever the studio is. Only its e-invoice (ZATCA's 383) is Saudi.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { debitedSoFar, debitNoteProblem, DEBIT_NOTE_STATUSES } = await import("../src/modules/finance/debitNotes.ts");
const V = await import("../src/shared/vat.ts");
const E = await import("../src/modules/finance/einvoiceService.ts");
const RC = await import("../src/modules/finance/zatcaReceipt.ts");
const D = await import("../src/modules/finance/zatcaDocument.ts");

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

console.log("\n== when one may be raised");
const INV = { id: "inv1", status: "Sent", currency: "JOD" };
ok("an issued invoice, an amount and a reason: no problem", debitNoteProblem(INV, 10, "Price agreed higher") === "");
ok("A DRAFT INVOICE IS EDITED, NOT ADDED TO", debitNoteProblem({ ...INV, status: "Draft" }, 10, "x") === "not-issued");
ok("a cancelled invoice charged nobody anything to add to", debitNoteProblem({ ...INV, status: "Cancelled" }, 10, "x") === "cancelled");
ok("nought or less is not a debit note", debitNoteProblem(INV, 0, "x") === "amount" && debitNoteProblem(INV, -5, "x") === "amount");
ok("A REASON IS REQUIRED IN EVERY COUNTRY — a charge added without one is the one a client disputes",
  debitNoteProblem(INV, 10, "  ") === "reason-required");
ok("NO CEILING: an invoice can be corrected up by more than it charged", debitNoteProblem(INV, 1_000_000, "x") === "");
ok("three statuses, like a credit note", DEBIT_NOTE_STATUSES.join() === "Draft,Issued,Cancelled");

console.log("\n== what is owed");
const notes = [
  { invoiceId: "inv1", status: "Issued", amount: 50 },
  { invoiceId: "inv1", status: "Draft", amount: 999 },
  { invoiceId: "inv1", status: "Cancelled", amount: 999 },
  { invoiceId: "inv2", status: "Issued", amount: 7 },
];
ok("ONLY ISSUED NOTES ADD — a draft is somebody typing, a cancelled one added nothing", debitedSoFar(notes, "inv1", "JOD") === 50);
ok("each invoice counts its own", debitedSoFar(notes, "inv2", "JOD") === 7);

console.log("\n== the VAT return");
const rows = [
  { kind: "sale", id: "i", reference: "INV-1", date: "2026-08-05", currency: "JOD", net: 100, vat: 16 },
  { kind: "debit", id: "d", reference: "DN-1", date: "2026-08-10", currency: "JOD", net: 50, vat: 8 },
  { kind: "credit", id: "c", reference: "CN-1", date: "2026-08-12", currency: "JOD", net: 25, vat: 4 },
  { kind: "purchase", id: "b", reference: "B-1", date: "2026-08-15", currency: "JOD", net: 10, vat: 1.6 },
];
const r = V.taxReturn(rows, { from: "2026-08-01", to: "2026-08-31", currency: "JOD" });
ok("A DEBIT NOTE ADDS OUTPUT TAX: 16 + 8 − 4 − 1.6", r.payable === 18.4 && r.debits.vat === 8 && r.debits.count === 1, String(r.payable));
ok("it is its own line, apart from the sales it corrects", r.output.vat === 16);
const split = V.splitGross(57.5, 15, "SAR");
ok("its tax is the invoice's rate split out of the gross — the one splitGross the ledger and the e-invoice use", split.net === 50 && split.vat === 7.5);

console.log("\n== the books");
// READ FROM THE SOURCE: importing the ledger here walks into the ledger ↔
// posting import cycle, which only an application's import order resolves.
const ledger = readFileSync("src/modules/finance/ledger.ts", "utf8");
const kinds = ledger.slice(ledger.indexOf("export const ENTRY_SOURCE_KINDS"), ledger.indexOf("] as const", ledger.indexOf("export const ENTRY_SOURCE_KINDS")));
ok("`debit-note` is a source the ledger knows, so it posts once and is never re-posted", kinds.includes('"debit-note"'));
const post = ledger.slice(ledger.indexOf("export async function postDebitNote"), ledger.indexOf("export async function postBillPayment"));
ok("THE MIRROR OF A CREDIT NOTE: receivable debited with the gross, revenue and VAT credited with its parts",
  post.includes("{ accountId: byCode.get(AR), debit: gross }") && post.includes("{ accountId: byCode.get(REVENUE), credit: net }")
  && post.includes("{ accountId: byCode.get(VAT_PAYABLE), credit: vat }"));
const fin = readFileSync("src/modules/finance/finance.ts", "utf8");
ok("THE INVOICE LIST COUNTS IT OWED, and a payment may cover it",
  fin.includes("settled.expected - credited + debited") && fin.includes("const owed = roundMoney(totals.outstanding + debited"));

console.log("\n== where nompany submits (Saudi Arabia)");
const seller = { name: "شركة", vatNumber: "399999999900003", crn: "1010010000",
  address: { street: "S", building: "2322", additional: "", district: "D", city: "Riyadh", postal: "23333" } };
const view = E.creditNoteView({ id: "d1", reference: "DN-0001", invoiceId: "i1", invoiceReference: "INV-0008", amount: 57.5, reason: "Price agreed higher", status: "Issued", issueDate: "2026-10-04" },
  { id: "i1", reference: "INV-0008", clientName: "Walk-in", currency: "SAR", vatRate: 15, status: "Sent" }, "SAR", "debitNote");
const doc = RC.zatcaReceiptDocument({ receipt: view.figures, seller, uuid: "u", issueDate: "2026-10-04", issueTime: "10:00:00", counter: 1, previousHash: "h", ...view.note });
ok("A DEBIT NOTE IS ZATCA'S 383, naming the invoice and why, at the ledger's tax",
  doc.typeCode === "383" && doc.billingReference === "INV-0008" && doc.reason === "Price agreed higher" && doc.payableAmount === 57.5 && doc.taxAmount === 7.5 && D.zatcaProblem(doc) === "");
const svc = readFileSync("src/modules/finance/debitNoteService.ts", "utf8");
const issue = svc.slice(svc.indexOf("export async function issueDebitNote"));
ok("ON A BUSINESS INVOICE IT IS CLEARED BEFORE IT IS WRITTEN AS ISSUED — and only where a country submits",
  issue.indexOf("clearBeforeIssue(") > 0 && issue.indexOf("clearBeforeIssue(") < issue.indexOf("Notes.update(scope(ctx), id")
  && issue.includes("studioEInvoiceRules(ctx.studio) ? await import"));

console.log(fails ? `\ndebit notes: ${fails} FAILED` : "\ndebit notes: all passed");
process.exitCode = fails ? 1 : 0;
