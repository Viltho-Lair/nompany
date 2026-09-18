// E-INVOICING — THE FRAMEWORK, AND NO COUNTRY'S ADAPTER YET (the owner,
// 18/09/2026: "framework only; keep e-invoicing adapters as an option for the
// future"). A country's definition says whether its invoices must reach its tax
// authority (`rules.einvoice` in shared/compliance); an ADAPTER is the code that
// would submit them — build the document, sign it, send it, keep the answer.
// This file holds the contract an adapter meets, the registry it goes into, and
// the one question every screen asks: where is this invoice with the authority?
//
// THE REGISTRY IS EMPTY, and the product says so rather than implying invoices
// are being sent. A studio in a country that requires e-invoicing sees, on its
// Tax screen and in its setup notice, that nompany does not submit them yet —
// so it keeps using the authority's own portal until an adapter lands.
//
// ADDING A COUNTRY IS ADDING ONE ADAPTER HERE, keyed by the `adapter` name its
// definition already declares ("zatca", "jofotara"). Nothing else changes: the
// queue, the retry and the states below are the country-neutral half.
//
// PURE. No store, no clock, no network — an adapter's `submit` is the only
// thing that would reach outside, and it is handed everything it needs.

import type { EInvoiceRules } from "@/shared/compliance/definition";

/** Where an invoice stands with its authority. Stored on the invoice once an attempt is made. */
export const EINVOICE_STATUSES = ["pending", "submitted", "accepted", "rejected", "failed"] as const;
export type EInvoiceStatus = (typeof EINVOICE_STATUSES)[number];

export type EInvoiceState = {
  status: EInvoiceStatus;
  adapter: string;
  attempts: number;
  /** The authority's identifier and QR payload, once accepted. */
  uuid?: string;
  qr?: string;
  /** The authority's words when it refused, or the transport's when it failed. */
  message?: string;
  at: string;
};

/** What an adapter is handed and must answer. */
export type EInvoiceAdapter = {
  key: string;
  submit: (input: {
    invoice: Record<string, unknown>;
    studio: Record<string, unknown>;
    rules: EInvoiceRules;
  }) => Promise<{ status: Exclude<EInvoiceStatus, "pending">; uuid?: string; qr?: string; message?: string }>;
};

/**
 * THE ADAPTERS BUILT, by the key a country's definition names. Empty on
 * purpose — see the header. Recorded in docs/progress.md as the future option.
 */
export const EINVOICE_ADAPTERS: Readonly<Record<string, EInvoiceAdapter>> = Object.freeze({});

export function adapterFor(rules: EInvoiceRules | null): EInvoiceAdapter | null {
  return rules ? EINVOICE_ADAPTERS[rules.adapter] || null : null;
}

/**
 * WHERE ONE INVOICE STANDS, for a studio under these rules:
 *   not-required — the country requires nothing, or the invoice is a draft or
 *                  cancelled, or it was issued before the mandate came in force
 *   unsubmitted  — it should reach the authority and nothing has tried
 *   otherwise    — the stored state of the last attempt
 */
export function einvoiceStatusOf(
  invoice: { status?: unknown; issueDate?: unknown; einvoice?: EInvoiceState | null },
  rules: EInvoiceRules | null,
): EInvoiceStatus | "not-required" | "unsubmitted" {
  if (!rules) return "not-required";
  if (invoice.status === "Draft" || invoice.status === "Cancelled") return "not-required";
  const issued = String(invoice.issueDate || "");
  if (issued && issued < rules.inForce) return "not-required";
  return invoice.einvoice?.status || "unsubmitted";
}

/** Whether an invoice in this state still needs somebody to act. */
export const needsAction = (s: ReturnType<typeof einvoiceStatusOf>) =>
  s === "unsubmitted" || s === "pending" || s === "rejected" || s === "failed";
