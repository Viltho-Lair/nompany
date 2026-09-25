// SAUDI ARABIA'S ADAPTER — the invoice as ZATCA's XML standard describes it,
// prepared and nothing else.
//
// THE STUDIO SUBMITS IT, NOT NOMPANY — the owner's rule, 26/09/2026 (see
// ./einvoice). This file onboarded with ZATCA for a certificate, signed with it
// and reported invoices, for one day (25/09/2026); all of that was removed
// before it was committed. What is left is what the standard says a SELLER
// writes: the document, its counter and the previous document's hash, and the
// QR's first five tags.
//
// WHAT THIS CANNOT PRODUCE, said plainly because it decides how a Saudi studio
// uses the file. Phase 2 of ZATCA's e-invoicing requires a cryptographic stamp
// signed with a certificate ZATCA issues to the company's own e-invoicing
// system, and the QR's tags 6–9 come from that stamp. Nompany holds no such
// certificate and asks for none, so the file it prepares is complete in every
// field the seller writes and unsigned: the company's certified solution (or
// ZATCA's own channel) stamps and reports it.
//
// THE DIVISION OF LABOUR: `./zatcaDocument` decides WHAT the document says and
// is pure, `./zatcaXml` writes it, `./zatcaQr` builds the QR, and this file
// joins them to the studio's official values and to its chain in the store.

import { randomUUID } from "node:crypto";
import { editJSON } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { official } from "@/shared/compliance/resolve";
import { studioTimezone, dayIn } from "@/shared/timezone";
import type { EInvoiceAdapter } from "./einvoice";
import { zatcaDocument, zatcaProblem, ZATCA_FIRST_PIH, type ZatcaDocument, type ZatcaSeller } from "./zatcaDocument";
import { zatcaInvoiceHash, zatcaInvoiceXml } from "./zatcaXml";
import { zatcaQr } from "./zatcaQr";

// ---- the seller, from the official values ------------------------------------------------

/**
 * THE STUDIO AS ZATCA'S SELLER, read from the official values SA.json already
 * asks a Saudi studio for — the VAT number, the commercial registration and the
 * national address in its parts. Nothing new is asked of anybody; a missing
 * value surfaces through `zatcaProblem` naming it.
 */
export function zatcaSeller(studio: Parameters<typeof official>[0] & { name?: unknown }): ZatcaSeller {
  const v = (key: string) => official(studio, key);
  return {
    // THE ARABIC LEGAL NAME WHERE THERE IS ONE — Arabic is mandatory on a Saudi
    // invoice, and SA.json asks for it for exactly that reason.
    name: v("legal_name_ar") || String(studio.name || "").trim(),
    vatNumber: v("vat_registration_number"),
    crn: v("commercial_registration_number"),
    address: {
      street: v("national_address_street"),
      building: v("national_address_building_number"),
      additional: v("national_address_additional_number"),
      district: v("national_address_district"),
      city: v("national_address_city"),
      postal: v("national_address_postal_code"),
    },
  };
}

/**
 * WHAT TIME THE INVOICE WAS ISSUED, in the studio's own zone. An invoice here
 * records a DATE; ZATCA wants a time too. When the invoice was created on its
 * issue date that moment is the honest answer; an invoice dated some other day
 * has no recorded time at all, and midnight says so rather than inventing one.
 */
export function issueTimeOf(invoice: { issueDate?: unknown; createdAt?: unknown }, timezone: string): string {
  const created = String(invoice.createdAt || "");
  const issued = String(invoice.issueDate || "").slice(0, 10);
  if (!created || Number.isNaN(Date.parse(created)) || dayIn(created, timezone) !== issued) return "00:00:00";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).format(new Date(created));
  } catch {
    return new Date(created).toISOString().slice(11, 19);
  }
}

/**
 * THE QR THE SELLER BUILDS — ZATCA's first five tags: seller, VAT number,
 * time, total, VAT. The time is the document's own issue date and time with no
 * zone: with a "Z", ZATCA's validator warned KSA-25 on every document
 * (measured against its developer portal, 25/09/2026).
 */
export function sellerQr(doc: ZatcaDocument): string {
  return zatcaQr({
    sellerName: doc.seller.name,
    vatNumber: doc.seller.vatNumber,
    timestamp: `${doc.issueDate}T${doc.issueTime}`,
    total: doc.taxInclusiveAmount.toFixed(2),
    vat: doc.taxAmount.toFixed(2),
  });
}

// ---- the chain ------------------------------------------------------------------------------

type Chain = { counter: number; previousHash: string };

/** The next link: 1 from the standard's seed, or one on from the last. Pure. */
export function nextLink(current: Chain | null): Chain {
  if (!current) return { counter: 1, previousHash: ZATCA_FIRST_PIH };
  return { counter: (Number(current.counter) || 0) + 1, previousHash: current.previousHash || ZATCA_FIRST_PIH };
}

/**
 * TAKE THE NEXT LINK AND BUILD WITH IT, in ONE compare-and-set on the studio's
 * chain. The counter and the hash must move together: two documents built
 * against the same previous hash would both claim the same place in the chain.
 * `compose` may run more than once under contention (editJSON's contract), so
 * it is handed the link and builds from nothing else. A document with a problem
 * takes no link — the chain does not advance for something still to be fixed.
 */
async function buildNextInChain(studioId: string, compose: (link: Chain) => ZatcaDocument) {
  return editJSON<Chain, ZatcaDocument | { problem: string }>(S.einvoiceChain(studioId), (current) => {
    const doc = compose(nextLink(current));
    const problem = zatcaProblem(doc);
    if (problem) return { result: { problem } };
    return { next: { counter: doc.counter, previousHash: zatcaInvoiceHash(doc) }, result: doc };
  });
}

// ---- the adapter --------------------------------------------------------------------------------

/**
 * THE ADAPTER. Takes the studio's next link, builds the document with it, and
 * writes the XML with the seller's QR in it. The framework keeps the result on
 * the invoice, so the file is prepared ONCE and every later download is the
 * same bytes — preparing it again would take a second link for one invoice.
 */
export const zatcaAdapter: EInvoiceAdapter = {
  key: "zatca",
  async prepare({ invoice, studio }) {
    const studioId = String((studio as { id?: unknown }).id || "");
    if (!studioId) return { problem: "no-studio" };
    const seller = zatcaSeller(studio as Parameters<typeof zatcaSeller>[0]);
    const issueTime = issueTimeOf(invoice as { issueDate?: unknown; createdAt?: unknown }, studioTimezone(studio as { timezone?: unknown }));
    const uuid = randomUUID();
    const out = await buildNextInChain(studioId, (link) => zatcaDocument({
      invoice: invoice as Parameters<typeof zatcaDocument>[0]["invoice"],
      seller, uuid, issueTime, counter: link.counter, previousHash: link.previousHash,
    }));
    if ("problem" in out) return out;
    const qr = sellerQr(out);
    return {
      xml: zatcaInvoiceXml(out, qr),
      filename: `${out.id || "invoice"}-zatca.xml`,
      qr,
      hash: zatcaInvoiceHash(out),
      counter: out.counter,
      uuid: out.uuid,
    };
  },
};
