// E-INVOICING — THE FRAMEWORK, AND JORDAN'S ADAPTER. A country's definition
// says whether its invoices must reach its tax authority (`rules.einvoice` in
// shared/compliance); an ADAPTER is the code that submits them — build the
// document, sign it, send it, keep the answer. This file holds the contract an
// adapter meets, the registry it goes into, and the one question every screen
// asks: where is this invoice with the authority?
//
// (It read "AND NO COUNTRY'S ADAPTER YET" from 18/09/2026, when the owner chose
// framework only, until Jordan's landed on 22/09/2026 at their instruction.)
//
// JORDAN HAS AN ADAPTER (22/09/2026); every other country's is still absent,
// and the product says so rather than implying invoices are being sent. A
// studio in a country with no adapter sees, on its Tax screen and in its setup
// notice, that nompany does not submit for it yet — so it keeps using the
// authority's own portal until one lands.
//
// AND JORDAN'S IS NOT CERTIFIED. It is written against a third-party tutorial
// and has never run against ISTD's sandbox; a studio must enter its OWN
// credentials before anything is submitted at all, which is the gate that keeps
// an unproven adapter from quietly failing in somebody's books.
//
// ADDING A COUNTRY IS ADDING ONE ADAPTER HERE, keyed by the `adapter` name its
// definition already declares ("zatca", "jofotara"). Nothing else changes: the
// queue, the retry and the states below are the country-neutral half.
//
// EVERYTHING DECLARED HERE IS PURE — no store, no clock, no network. An
// adapter's `submit` is the only thing that reaches outside, and it is handed
// everything it needs; the registry below imports one, so this MODULE is no
// longer network-free even though nothing written in it does I/O.

import type { EInvoiceRules } from "@/shared/compliance/definition";
import { jofotaraAdapter } from "./jofotara";

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
export const EINVOICE_ADAPTERS: Readonly<Record<string, EInvoiceAdapter>> = Object.freeze({
  // JORDAN (22/09/2026). Built against a third-party tutorial rather than
  // ISTD's own guide, and NOT yet run against any endpoint, sandbox or
  // otherwise — the setup notice says so, and `einvoicing.md` records what
  // confirming it needs.
  jofotara: jofotaraAdapter,
});

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

/**
 * HOW MANY TIMES THE WIRE IS GIVEN THE BENEFIT OF THE DOUBT before a repeated
 * transport failure stops looking like bad luck and starts looking like a wrong
 * endpoint or a dead credential.
 */
export const MAX_RETRY_ATTEMPTS = 6;

/**
 * WHETHER A SCHEDULED RUN SHOULD SEND THIS ONE AGAIN — the whole policy of the
 * retry cron, pure, so it can be argued with without a studio.
 *
 * ONLY A TRANSPORT FAILURE. `failed` is the wire: a timeout, a 500, a name that
 * would not resolve, and the same document sent again may well be accepted.
 * `rejected` is the AUTHORITY having looked at the document and said no — the
 * same document sent again is the same rejection, and sending it daily for ever
 * is a studio hammering its own tax authority with something a person has to
 * fix. It waits in the queue with the authority's own words on it instead.
 *
 * AND `unsubmitted` IS LEFT ALONE, which is the subtler half: an invoice nobody
 * has tried to send is waiting on a person's decision rather than on the
 * network, and a cron that started submitting them would be quietly deciding to
 * file a studio's taxes for them.
 */
export function shouldRetry(
  row: { state?: string; attempts?: number },
  max: number = MAX_RETRY_ATTEMPTS,
): boolean {
  if (row?.state !== "failed") return false;
  return (Number(row?.attempts) || 0) < max;
}

/** Whether an invoice in this state still needs somebody to act. */
export const needsAction = (s: ReturnType<typeof einvoiceStatusOf>) =>
  s === "unsubmitted" || s === "pending" || s === "rejected" || s === "failed";
