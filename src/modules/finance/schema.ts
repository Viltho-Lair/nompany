// WHAT FINANCE STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts for why that is the next step.

import { z } from "zod";

/** One billable line. `total` is derived on the way out, never stored. */
export const InvoiceLineSchema = z.object({
  description: z.string().max(300),
  qty: z.number(),
  unitPrice: z.number(),
});

/**
 * MONEY ACTUALLY RECEIVED, appended and never edited. The history of what
 * arrived and when is what makes the balance defensible — and it is why `Paid`
 * is a derived status rather than one anybody may declare.
 */
export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  date: z.string(),
  method: z.string().optional(),
  note: z.string().max(500).optional(),
  recordedByCollaboratorId: z.string().optional(),
  recordedAt: z.string().optional(),
});

/**
 * AN INVOICE, and `reference` is the field with a rule behind it: it comes from
 * the counter rather than from a count, because deleting a draft must not hand
 * its number to the next invoice and two raised at once must not collide.
 *
 * `clientName` is SNAPSHOT, not a pointer, so the invoice still reads correctly
 * if the project it came from is edited afterwards.
 */
export const InvoiceSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  projectId: z.string().max(60),
  clientName: z.string().max(160),
  lines: z.array(InvoiceLineSchema),
  vatRate: z.number().min(0).max(100),
  status: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  notes: z.string().max(2000),
  payments: z.array(PaymentSchema).optional(),
  createdAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),

  // ---- derived by invoiceTotals, never stored ------------------------------
  subtotal: z.number().optional(),
  vat: z.number().optional(),
  total: z.number().optional(),
  paid: z.number().optional(),
  balance: z.number().optional(),
});

/** Money going the other way. Simpler: no lines, no VAT, no payment history. */
export const ExpenseSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  amount: z.number(),
  category: z.string(),
  projectId: z.string().max(60).optional(),
  date: z.string().optional(),
  note: z.string().max(500).optional(),
  createdAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),
  /** Who actually paid it — separate from who recorded it, and often not the same. */
  paidByCollaboratorId: z.string().optional(),

  // ---- derived on the way out ---------------------------------------------
  projectNumber: z.string().optional(),
  paidByAlias: z.string().optional(),
});

export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;

// ============================================================================
// THE GENERAL LEDGER (Wave 4, Finance 1b). Double-entry: every posting names
// two or more accounts and the debits equal the credits. Two rules the schema
// cannot express and the service enforces at the transition (the same class as
// invariant 7): AN ENTRY BALANCES, and A POSTED ENTRY IS NEVER EDITED — only
// reversed by a mirror entry. So there is no "draft entry" and no update path.
// ============================================================================

/**
 * ONE ACCOUNT in the chart. `type` decides the sign convention — an asset and
 * an expense rise on the debit side, a liability, equity and income on the
 * credit side — which is the whole of what makes a trial balance mean anything.
 * `code` is the human handle (1000, 4000); `id` is what a posting line points at.
 */
export const AccountSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  code: z.string().max(20),
  name: z.string().max(120),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  // A sub-account rolls up into its parent on the reports; flat is fine too.
  parentId: z.string().max(60).optional(),
  // A retired account keeps its history but takes no new postings.
  active: z.boolean().optional(),
  createdAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),
});

/**
 * ONE LINE of a journal entry: a debit OR a credit against one account. Exactly
 * one of the two is non-zero; the service refuses a line that is both or
 * neither. `projectId` tags the line so a P&L can be read per project without a
 * second set of books.
 */
export const JournalLineSchema = z.object({
  accountId: z.string().max(60),
  debit: z.number().min(0),
  credit: z.number().min(0),
  projectId: z.string().max(60).optional(),
  memo: z.string().max(300).optional(),
});

/**
 * ONE JOURNAL ENTRY — a balanced set of lines, posted as a unit. `source` ties
 * it back to what caused it (an invoice, a bill, a manual adjustment), so the
 * ledger and the document it came from can always be reconciled. `reference`
 * comes from the counter, never a count — invariant 10.
 *
 * A REVERSAL IS JUST ANOTHER ENTRY whose `source.kind` is "reversal" and whose
 * lines mirror the original; the original records the reversal's id in
 * `reversedByEntryId` so neither can be posted against twice.
 */
export const JournalEntrySchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  date: z.string(),
  memo: z.string().max(500).optional(),
  lines: z.array(JournalLineSchema).min(2),
  source: z.object({
    kind: z.enum(["invoice", "bill", "expense", "payment", "manual", "reversal"]),
    id: z.string().max(60).optional(),
  }),
  postedByCollaboratorId: z.string().optional(),
  postedAt: z.string().optional(),
  // Set on the ORIGINAL when it is reversed; set to the original's id ON the
  // reversal. Either way it means "this entry is spoken for".
  reversedByEntryId: z.string().max(60).optional(),
  reversalOfEntryId: z.string().max(60).optional(),
});

export type Account = z.infer<typeof AccountSchema>;
export type JournalLine = z.infer<typeof JournalLineSchema>;
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// ============================================================================
// FINANCE 1b — AP (Bill) and FA (FixedAsset). See docs/w4-dashboards-and-motion §2.2.
// ============================================================================

/**
 * A BILL — what we owe a vendor, the AP counterpart of an invoice, and
 * DELIBERATELY THE SAME SHAPE so the two aging reports share their arithmetic.
 * `reference` comes from the counter (invariant 10). `vendorName` is a SNAPSHOT
 * like an invoice's clientName. `approvedBy` ≠ the raiser (invariant 7),
 * enforced at the transition, not here.
 */
export const BillSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  vendorId: z.string().max(60),
  vendorName: z.string().max(160),
  orderId: z.string().max(60).optional(),   // → a material order, when the bill answers a PO
  projectId: z.string().max(60).optional(),
  lines: z.array(InvoiceLineSchema),        // same line shape as an invoice
  vatRate: z.number().min(0).max(100),
  // THE CURRENCY THIS WAS BILLED IN. Until it existed every bill was
  // implicitly in the studio's own money, which made a foreign supplier
  // invoice unrecordable and left the approval engine with nothing to convert.
  // Same shape and same default as contractSchema's, so AP stops being the one
  // record of its family without one — contracts, payments and change orders
  // all carry it already.
  //
  // OPTIONAL, because every bill already in the database predates it. It does
  // NOT revalue the aging report, which still sums raw totals; that is P3's
  // job. What reads it today is which approvals the bill needs.
  currency: z.string().max(8).optional(),
  status: z.string(),                        // Draft|Received|Approved|Paid|Cancelled|Disputed
  billDate: z.string(),
  dueDate: z.string(),
  terms: z.string().optional(),              // net-0|net-15|net-30|net-60|on-receipt
  payments: z.array(PaymentSchema).optional(),
  notes: z.string().max(2000).optional(),
  approvedByCollaboratorId: z.string().optional(),
  approvedAt: z.string().optional(),
  createdAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),

  // ---- derived by billTotals, never stored --------------------------------
  subtotal: z.number().optional(),
  vat: z.number().optional(),
  total: z.number().optional(),
  paid: z.number().optional(),
  outstanding: z.number().optional(),
});

/**
 * A FIXED ASSET (PPE). Depreciation is DERIVED from these five fields, never
 * stored — a schedule saved at acquisition goes stale the moment a useful life
 * is corrected, and the whole schedule is a pure function of cost, salvage,
 * life, method and the date. `disposedOn` closes it.
 */
export const FixedAssetSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  name: z.string().max(160),
  category: z.string().max(120),
  acquiredOn: z.string(),
  cost: z.number(),
  salvageValue: z.number().optional(),
  usefulLifeMonths: z.number(),
  method: z.string(),                        // straight-line | reducing-balance
  disposedOn: z.string().optional(),
  disposalProceeds: z.number().optional(),
  projectId: z.string().max(60).optional(),
  custodianCollaboratorId: z.string().max(60).optional(),
  createdAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),

  // ---- derived by depreciationOf, never stored ----------------------------
  bookValue: z.number().optional(),
  accumulated: z.number().optional(),
  monthlyDepreciation: z.number().optional(),
});

export type Bill = z.infer<typeof BillSchema>;
export type FixedAsset = z.infer<typeof FixedAssetSchema>;
