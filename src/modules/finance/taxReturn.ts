// THE TAX RETURN — the documents behind one period's VAT. The arithmetic is
// `taxReturn` in shared/vat; this reads the rows and says which of them count.
//
// SHOWN ONLY TO A STUDIO WITH A VAT RATE, the owner's rule (11/09/2026): a
// company that registered no tax has nothing to file, so the answer is
// `enabled: false` rather than a return of noughts that looks like one.
//
// WHICH DOCUMENTS COUNT, and why each exclusion is there:
//   - an invoice once it has gone to the client (Sent, Paid). A draft is somebody
//     typing, and a cancelled invoice charged nobody anything;
//   - a credit note once Issued, dated by its own issue date, splitting its gross
//     at the INVOICE's rate — the same `splitGross` the ledger posts with;
//   - a bill once Received, Approved or Paid. A DISPUTED bill is left out: tax
//     on an invoice the studio says it does not owe is not tax it can reclaim
//     until the dispute is settled.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { invoiceTotals } from "./finance";
import { splitGross, studioVatRate, taxReturn, previousMonth, type TaxRow } from "@/shared/vat";
import type { FinanceContext } from "./types";

// The fields `invoiceTotals` reads are named, so both an invoice and a bill
// total through it; everything else on the row is read by name as text.
type Doc = Record<string, unknown> & { id: string; lines?: unknown; vatRate?: unknown; payments?: unknown };
const Invoices = repo<Doc>("invoices");
const Bills = repo<Doc>("bills");
const Notes = repo<Doc>("creditNotes");

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TAXED_INVOICE = new Set(["Sent", "Paid"]);
const TAXED_BILL = new Set(["Received", "Approved", "Paid"]);
const text = (v: unknown) => String(v ?? "");

export async function taxReturnView(ctx: FinanceContext, query: { from?: unknown; to?: unknown }) {
  const denied = requirePermission(ctx.access, "finance.ledger.view");
  if (denied) return denied;
  const rate = studioVatRate(ctx.studio);
  if (rate === null) return { enabled: false as const };

  // The month before today unless the reader asked for a period — that is the
  // return most studios file next.
  const fallback = previousMonth(new Date().toISOString().slice(0, 10));
  const from = ISO.test(text(query.from)) ? text(query.from) : fallback.from;
  const to = ISO.test(text(query.to)) ? text(query.to) : fallback.to;
  if (from > to) return { error: "period" };

  const cash = { studio: ctx.studio, section: ctx.cashSection };
  const [invoices, notes, bills] = await Promise.all([
    Invoices.find(cash),
    Notes.find(cash),
    Bills.find({ studio: ctx.studio, section: ctx.payablesSection }),
  ]);

  const rows: TaxRow[] = [];
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  for (const inv of invoices) {
    if (!TAXED_INVOICE.has(text(inv.status))) continue;
    const t = invoiceTotals(inv);
    rows.push({
      kind: "sale", id: inv.id, reference: text(inv.reference), date: text(inv.issueDate),
      currency: text(inv.currency), net: t.subtotal, vat: t.vat,
    });
  }
  for (const note of notes) {
    if (note.status !== "Issued") continue;
    const inv = invoiceById.get(text(note.invoiceId));
    const { net, vat } = splitGross(note.amount, inv?.vatRate);
    rows.push({
      kind: "credit", id: note.id, reference: text(note.reference), date: text(note.issueDate),
      currency: text(inv?.currency), net, vat,
    });
  }
  for (const bill of bills) {
    if (!TAXED_BILL.has(text(bill.status))) continue;
    const t = invoiceTotals(bill);
    rows.push({
      kind: "purchase", id: bill.id, reference: text(bill.reference), date: text(bill.billDate),
      currency: text(bill.currency), net: t.subtotal, vat: t.vat,
    });
  }

  return {
    enabled: true as const,
    rate,
    ...taxReturn(rows, { from, to, currency: text((ctx.studio as { currency?: unknown }).currency) }),
  };
}
