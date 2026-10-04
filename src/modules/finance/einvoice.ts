// E-INVOICING — THE FRAMEWORK, AND THE ADAPTERS. A country's definition says
// whether its invoices must reach its tax authority (`rules.einvoice` in
// shared/compliance); an ADAPTER turns one of this studio's invoices into the
// document that authority's official instructions describe. This file holds
// the contract an adapter meets, the registry it goes into, and the one
// question every screen asks: where is this invoice with the authority?
//
// WHO SUBMITS, BY COUNTRY — and the rule has had two answers.
//
// 26/09/2026, the owner: nompany prepares and never submits — "our job is to
// prepare companies to submit their invoicing on the official channels, not
// through us". Jordan's submission path (22/09) and Saudi Arabia's (25/09) were
// removed that day.
//
// 03/10/2026, the owner's decision A, for SAUDI ARABIA: nompany SUBMITS, and
// the studio chooses when, inside ZATCA's limits — a B2C (simplified) invoice
// reported as it is issued or in a daily batch, a B2B (standard) one cleared at
// issue. Phase 2 makes a seller's own e-invoicing system sign every invoice, so
// a file nompany prepared unsigned was one every Saudi studio had to take
// somewhere else to finish. An adapter MAY therefore have a `submit`; only
// ZATCA's does, its one door to the authority is ./zatcaApi, and a studio holds
// a unit there only after onboarding with an OTP from ZATCA's own portal
// (./zatcaUnit). JORDAN IS STILL PREPARE-ONLY — the decision named Saudi
// Arabia, and nothing here widens it.
//
// ADDING A COUNTRY IS ADDING ONE ADAPTER HERE, keyed by the `adapter` name its
// definition already declares ("zatca", "jofotara").

import type { EInvoiceRules } from "@/shared/compliance/definition";
import { jofotaraAdapter } from "./jofotara";
import { zatcaAdapter } from "./zatca";

/**
 * WHERE AN INVOICE STANDS WITH ITS AUTHORITY, as far as this product knows.
 *
 *   prepared — the official file exists and the authority has not accepted it
 *              yet: not submitted, or submitted and not reached (retried)
 *   accepted — the authority accepted it (ZATCA answered, or the studio recorded it)
 *   rejected — the authority refused it (likewise)
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
  /**
   * THE ZATCA UNIT THAT SIGNED IT, when one did. Absent on an unsigned file.
   * A file signed by a unit the studio has since replaced is prepared again
   * before it is submitted — the old unit's certificate no longer answers.
   */
  unitId?: string;
  /**
   * SAUDI ARABIA: which kind of tax invoice this is — a `simplified` one is
   * REPORTED, a `standard` (B2B) one is CLEARED, and the two go to different
   * places (./zatca). Absent on a file prepared before 04/10/2026: simplified.
   */
  subtype?: "standard" | "simplified";
  /** True once the authority returned its own cleared copy and `xml` IS that copy. */
  cleared?: boolean;
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
  /** The authority's words — as the studio recorded them, or as it answered nompany. */
  message?: string;
  /** Whether nompany submitted it (ZATCA) rather than the studio recording an answer. */
  submitted?: boolean;
  document?: EInvoiceDocument;
  /** Legacy, from the submitting adapters. */
  attempts?: number;
};

/**
 * WHAT SUBMITTING ANSWERED. `unreached` is not a refusal: the authority was not
 * reached, or the studio cannot submit yet (no unit), and the invoice stays
 * prepared to be tried again — a refusal is the document's problem, an outage
 * is not.
 */
export type EInvoiceSubmission = {
  outcome: "accepted" | "rejected" | "unreached";
  message: string;
  /**
   * WHAT REPLACES THE KEPT FILE once accepted, where the authority hands back
   * its own copy — a cleared ZATCA invoice carries ZATCA's stamp and QR, and
   * that copy, not ours, is the invoice the buyer is given.
   */
  document?: Pick<EInvoiceDocument, "xml" | "qr" | "cleared">;
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
  /**
   * SUBMIT A PREPARED FILE — only where the owner has decided nompany submits
   * (Saudi Arabia, 03/10/2026). An adapter without it is prepare-only.
   */
  submit?: (input: { studio: Record<string, unknown>; document: EInvoiceDocument }) => Promise<EInvoiceSubmission>;
  /**
   * WHETHER THIS STUDIO CAN SUBMIT, AND WHEN IT CHOSE TO: as each invoice is
   * issued, or in the nightly batch. Null when it cannot submit yet. `since`
   * is the day submitting began — nothing issued before it is submitted
   * without somebody asking, because it may have reached the authority some
   * other way.
   */
  submission?: (studio: Record<string, unknown>) => Promise<{ timing: "immediate" | "daily"; since: string } | null>;
  /**
   * WHETHER THIS INVOICE MUST BE CLEARED BEFORE IT IS ISSUED — a Saudi
   * business invoice is not valid until ZATCA clears it, so it is cleared at
   * issue whatever the studio chose for its reported ones.
   */
  clearsAtIssue?: (invoice: Record<string, unknown>) => boolean;
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
