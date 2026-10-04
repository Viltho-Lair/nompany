// SAUDI ARABIA'S ADAPTER — the invoice as ZATCA's XML standard describes it,
// stamped with the studio's unit and reported, where the studio has onboarded
// one.
//
// NOMPANY SUBMITS — the owner's decision A, 03/10/2026, reversing "prepare,
// never submit" of 26/09/2026 (./einvoice has both). Phase 2 requires a
// cryptographic stamp signed with a certificate ZATCA issued to the seller's
// own e-invoicing unit, and the QR's tags 6–9 come from it, so an unsigned file
// was one every Saudi studio had to finish somewhere else.
//
// TWO PATHS, by whether the studio has onboarded a unit (./zatcaUnit):
//   onboarded — the document is stamped as it is prepared, and `submit`
//               reports it (simplified invoices; clearance of standard ones
//               is the next slice)
//   not yet   — the document is prepared unsigned, exactly as before, to
//               download; there is nothing to submit it with
//
// THE CHAIN BELONGS TO THE UNIT. ZATCA counts and hashes per unit, so a new
// unit starts at 1 from the standard's seed; the chain document remembers
// which unit it is counting for, and a document prepared for another restarts
// it rather than continuing a count ZATCA never saw.
//
// THE DIVISION OF LABOUR: `./zatcaDocument` decides WHAT the document says and
// is pure, `./zatcaXml` writes it, `./zatcaQr` builds the QR, `./zatcaSign`
// stamps it, `./zatcaApi` is the only door to ZATCA, and this file joins them
// to the studio's official values and to its chain in the store.

import { randomUUID } from "node:crypto";
import { editJSON } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { official } from "@/shared/compliance/resolve";
import { studioTimezone, dayIn } from "@/shared/timezone";
import type { EInvoiceAdapter, EInvoiceSubmission } from "./einvoice";
import { zatcaDocument, zatcaProblem, ZATCA_FIRST_PIH, type ZatcaDocument, type ZatcaSeller } from "./zatcaDocument";
import { zatcaInvoiceHash, zatcaInvoiceXml } from "./zatcaXml";
import { zatcaQr } from "./zatcaQr";
import { qrFieldsOf, stampZatca } from "./zatcaSign";
import { readZatcaCertificate } from "./zatcaCrypto";
import { readZatcaUnit, zatcaUnitSummary } from "./zatcaUnit";
import { reportInvoice, zatcaMessages } from "./zatcaApi";

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

/** THE QR AN UNSTAMPED DOCUMENT CARRIES — ZATCA's first five tags (./zatcaSign `qrFieldsOf`). */
export function sellerQr(doc: ZatcaDocument): string {
  return zatcaQr(qrFieldsOf(doc));
}

// ---- the chain ------------------------------------------------------------------------------

/** `unitId` is the unit the chain counts for; "" for unsigned documents (and every chain written before units). */
type Chain = { counter: number; previousHash: string; unitId?: string };

/**
 * The next link: 1 from the standard's seed, or one on from the last — and 1
 * again when the chain was counting for a different unit. Pure.
 */
export function nextLink(current: Chain | null, unitId = ""): Chain {
  if (!current || (current.unitId || "") !== unitId) return { counter: 1, previousHash: ZATCA_FIRST_PIH, unitId };
  return { counter: (Number(current.counter) || 0) + 1, previousHash: current.previousHash || ZATCA_FIRST_PIH, unitId };
}

/**
 * TAKE THE NEXT LINK AND BUILD WITH IT, in ONE compare-and-set on the studio's
 * chain. The counter and the hash must move together: two documents built
 * against the same previous hash would both claim the same place in the chain.
 * `compose` may run more than once under contention (editJSON's contract), so
 * it is handed the link and builds from nothing else. A document with a problem
 * takes no link — the chain does not advance for something still to be fixed.
 */
async function buildNextInChain(studioId: string, unitId: string, compose: (link: Chain) => ZatcaDocument) {
  return editJSON<Chain, ZatcaDocument | { problem: string }>(S.einvoiceChain(studioId), (current) => {
    const doc = compose(nextLink(current, unitId));
    const problem = zatcaProblem(doc);
    if (problem) return { result: { problem } };
    return { next: { counter: doc.counter, previousHash: zatcaInvoiceHash(doc), unitId }, result: doc };
  });
}

// ---- reporting ------------------------------------------------------------------------------

/**
 * WHAT ZATCA'S REPORTING ANSWER MEANS. 200 is reported, 202 reported with
 * warnings, 400 refused with the rules it broke; anything else — no answer, a
 * 401 on the unit's own certificate, a 5xx, throttling — reached nobody who
 * judged the document, so the invoice stays prepared and is tried again.
 */
export function reportingOutcome(status: number, body: Record<string, unknown> | null): EInvoiceSubmission {
  const { errors, warnings } = zatcaMessages(body);
  if ((status === 200 || status === 202) && body?.reportingStatus === "REPORTED") {
    return { outcome: "accepted", message: warnings.join(" · ").slice(0, 300) };
  }
  if (status === 400 && body?.reportingStatus === "NOT_REPORTED") {
    return { outcome: "rejected", message: errors.join(" · ").slice(0, 300) || "NOT_REPORTED" };
  }
  return { outcome: "unreached", message: status ? `zatca-${status}` : "zatca-unreachable" };
}

// ---- the adapter --------------------------------------------------------------------------------

/**
 * THE ADAPTER. Takes the studio's next link, builds the document with it, and
 * writes the XML — stamped when the studio has a unit, with the seller's QR
 * alone when it has none. The framework keeps the result on the invoice, so the
 * file is prepared ONCE and every later download is the same bytes — preparing
 * it again would take a second link for one invoice.
 */
export const zatcaAdapter: EInvoiceAdapter = {
  key: "zatca",
  async prepare({ invoice, studio }) {
    const studioId = String((studio as { id?: unknown }).id || "");
    if (!studioId) return { problem: "no-studio" };
    const seller = zatcaSeller(studio as Parameters<typeof zatcaSeller>[0]);
    const issueTime = issueTimeOf(invoice as { issueDate?: unknown; createdAt?: unknown }, studioTimezone(studio as { timezone?: unknown }));
    const uuid = randomUUID();
    const unit = await readZatcaUnit(studioId);
    const out = await buildNextInChain(studioId, unit?.id || "", (link) => zatcaDocument({
      invoice: invoice as Parameters<typeof zatcaDocument>[0]["invoice"],
      seller, uuid, issueTime, counter: link.counter, previousHash: link.previousHash,
    }));
    if ("problem" in out) return out;
    const filename = `${out.id || "invoice"}-zatca.xml`;
    if (unit) {
      // THE STAMP DOES NOT MOVE THE HASH (./zatcaSign), so the link the chain
      // just recorded is the hash ZATCA computes from the stamped file.
      const stamp = stampZatca(out, {
        privateKeyPem: unit.privateKey,
        certificate: readZatcaCertificate(unit.production.token),
        signingTime: new Date().toISOString().slice(0, 19),
      });
      return { xml: stamp.xml, filename, qr: stamp.qr, hash: stamp.hash, counter: out.counter, uuid: out.uuid, unitId: unit.id };
    }
    const qr = sellerQr(out);
    return {
      xml: zatcaInvoiceXml(out, qr),
      filename,
      qr,
      hash: zatcaInvoiceHash(out),
      counter: out.counter,
      uuid: out.uuid,
    };
  },
  async submit({ studio, document }) {
    const studioId = String((studio as { id?: unknown }).id || "");
    const unit = studioId ? await readZatcaUnit(studioId) : null;
    if (!unit) return { outcome: "unreached", message: "not-onboarded" };
    // A FILE ANOTHER UNIT SIGNED (or none did) cannot be reported with this
    // one's certificate; the service prepares it again before it gets here.
    if (document.unitId !== unit.id || !document.hash || !document.uuid) return { outcome: "unreached", message: "unsigned" };
    const answer = await reportInvoice(unit.environment, unit.production, { hash: document.hash, uuid: document.uuid, xml: document.xml });
    return reportingOutcome(answer.status, answer.body);
  },
  async submission(studio) {
    const studioId = String((studio as { id?: unknown }).id || "");
    const unit = studioId ? await zatcaUnitSummary(studioId) : null;
    return unit?.onboarded ? { timing: unit.timing, since: unit.onboardedAt.slice(0, 10) } : null;
  },
};
