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
