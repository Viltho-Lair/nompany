// E-INVOICING — THE FRAMEWORK, AND THE ADAPTERS. A country's definition says
// whether its invoices must reach its tax authority (`rules.einvoice` in
// shared/compliance); an ADAPTER turns one of this studio's invoices into the
// document that authority's official instructions describe. This file holds
// the contract an adapter meets, the registry it goes into, and the one
// question every screen asks: where is this invoice with the authority?
//
// NOMPANY NEVER TALKS TO A TAX AUTHORITY — the owner's rule, 26/09/2026: "our
// job is to prepare companies to submit their invoicing on the official
// channels, not through us … we must not interact with official channels at
// all." So an adapter PREPARES and nothing else: no endpoint, no credential, no
// API key, no certificate request. The studio downloads the prepared file and
// submits it through the authority's own channel, and records what the
// authority answered.
//
// DO NOT PUT A SUBMISSION PATH BACK. There was one, twice: Jordan's adapter
// posted to JoFotara with the studio's API credentials (22/09/2026), and
// Saudi Arabia's onboarded with ZATCA for a certificate and reported invoices
// (25/09/2026). Both were removed on 26/09/2026 at the owner's instruction —
// see docs/progress.md, the e-invoicing ledger row. A submission path means
// holding a company's credentials with its tax authority and answering for
// what reaches it, which is not this product's job.
//
// ADDING A COUNTRY IS ADDING ONE ADAPTER HERE, keyed by the `adapter` name its
// definition already declares ("zatca", "jofotara").

import type { EInvoiceRules } from "@/shared/compliance/definition";
import { jofotaraAdapter } from "./jofotara";
import { zatcaAdapter } from "./zatca";

/**
 * WHERE AN INVOICE STANDS WITH ITS AUTHORITY, as far as this product knows.
 *
 *   prepared — the official file exists; the studio has not said it submitted
 *   accepted — the studio recorded that the authority accepted it
 *   rejected — the studio recorded that the authority refused it
 *
 * `pending`, `submitted` and `failed` are READ-ONLY LEGACY: they were written
 * while an adapter submitted (22–26/09/2026) and are kept in the list so an
 * invoice carrying one still reads, and still counts as needing action.
 */
export const EINVOICE_STATUSES = ["prepared", "accepted", "rejected", "pending", "submitted", "failed"] as const;
export type EInvoiceStatus = (typeof EINVOICE_STATUSES)[number];

/** The prepared file, kept on the invoice so every download is the same bytes. */
export type EInvoiceDocument = {
  xml: string;
  filename: string;
  /** Where the SELLER builds the QR (Saudi Arabia's first five tags). Absent where the authority issues it. */
  qr?: string;
  /** Saudi Arabia's chain: this document's hash, counter and UUID. */
  hash?: string;
  counter?: number;
  uuid?: string;
};

export type EInvoiceState = {
  status: EInvoiceStatus;
  adapter: string;
  at: string;
  /** The authority's reference for the invoice, as the studio recorded it. */
  uuid?: string;
  /**
   * THE QR THAT PRINTS: built by us where the seller builds it, or pasted back
   * by the studio where the authority issues it (Jordan).
   */
  qr?: string;
  /** The authority's words, as the studio recorded them. */
  message?: string;
  document?: EInvoiceDocument;
  /** Legacy, from the submitting adapters. */
  attempts?: number;
};

/** What an adapter is handed, and what it answers: the document, or why it cannot be made. */
export type EInvoiceAdapter = {
  key: string;
  /**
   * PREPARE THE OFFICIAL FILE. Reaches no network. It may write to the store
   * (Saudi Arabia's counter and hash chain), which is why it is async; a
   * `problem` names the setting the studio must fix first.
   */
  prepare: (input: {
    invoice: Record<string, unknown>;
    studio: Record<string, unknown>;
    rules: EInvoiceRules;
  }) => Promise<EInvoiceDocument | { problem: string }>;
};

/** THE ADAPTERS, by the key a country's definition names. `docs/progress.md` holds the work list. */
export const EINVOICE_ADAPTERS: Readonly<Record<string, EInvoiceAdapter>> = Object.freeze({
  // JORDAN — the UBL document ISTD's technical guide describes (./ublXml). The
  // QR is JoFotara's to issue, so the studio pastes it back when it records
  // the answer.
  jofotara: jofotaraAdapter,
  // SAUDI ARABIA — the UBL document ZATCA's XML standard describes, with its
  // counter and hash chain and the seller-built QR (./zatca).
  zatca: zatcaAdapter,
});

export function adapterFor(rules: EInvoiceRules | null): EInvoiceAdapter | null {
  return rules ? EINVOICE_ADAPTERS[rules.adapter] || null : null;
}

/**
 * WHERE ONE INVOICE STANDS, for a studio under these rules:
 *   not-required — the country requires nothing, or the invoice is a draft or
 *                  cancelled, or it was issued before the mandate came in force
 *   unsubmitted  — nothing has been prepared or recorded yet
 *   otherwise    — the stored state
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

/** Whether an invoice in this state still needs somebody to act: everything but an accepted one. */
export const needsAction = (s: ReturnType<typeof einvoiceStatusOf>) =>
  s !== "not-required" && s !== "accepted";

/** The answers a studio may record, once it has submitted through the official channel. */
export const RECORDABLE_OUTCOMES = ["accepted", "rejected"] as const;
