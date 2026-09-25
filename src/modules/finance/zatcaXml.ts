// A ZATCA DOCUMENT, AS XML — WRITTEN ALREADY CANONICAL, which is the whole trick.
//
// ZATCA hashes an invoice after removing three parts of it (the signature
// extension, the signature envelope and the QR reference — a document prepared
// here has only the last, see ./zatca) and CANONICALISING
// what is left (C14N 1.1). Canonicalising someone else's XML needs a parser and
// a canonicaliser, and every public implementation of this adapter carries one
// plus a hand-written patch for the whitespace the two disagree about. This
// file carries neither: it EMITS the canonical form directly —
//
//  - no whitespace between elements, so removing an element leaves nothing behind;
//  - every element written as a start and an end tag, never `<a/>`;
//  - attributes in canonical order (by name, as none of them is namespaced);
//  - namespace declarations only on the root, default first, then by prefix;
//  - text escaped the canonical way: `&`, `<`, `>` and CR — and NOT quotes,
//    which is where this differs from `./ublXml`'s `xmlEscape`;
//
// so the string with those three parts cut out and the XML declaration dropped
// IS the canonical form, and its SHA-256 is the invoice hash. `zatcaHashInput`
// does exactly that cut, and the test pins that the parts cut are the only
// parts that differ.
//
// ONE LINE, NO PRETTY PRINTING — and that is not a style choice here. A pretty-
// printed document is a different canonical form, and therefore a different
// hash, from the same data.

import { createHash } from "node:crypto";
import type { ZatcaDocument, ZatcaSubtotal, ZatcaAddress } from "./zatcaDocument";

/** Canonical text escaping (C14N §2.3): &, <, > and carriage return. Quotes stay as they are. */
export function c14nText(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r/g, "&#xD;");
}

/** Canonical attribute escaping: &, <, " and the three whitespace controls. */
export function c14nAttr(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/\t/g, "&#x9;")
    .replace(/\n/g, "&#xA;")
    .replace(/\r/g, "&#xD;");
}

/** Attributes in canonical order. None of ours is namespaced, so the order is by name. */
const attrs = (a: Record<string, string> = {}) =>
  Object.keys(a).sort().map((k) => ` ${k}="${c14nAttr(a[k])}"`).join("");

/** An element with text. */
export const el = (name: string, value: unknown, a?: Record<string, string>) =>
  `<${name}${attrs(a)}>${c14nText(value)}</${name}>`;
/** An element with children, already serialised. */
export const box = (name: string, children: string | string[], a?: Record<string, string>) =>
  `<${name}${attrs(a)}>${Array.isArray(children) ? children.join("") : children}</${name}>`;

/**
 * TWO DECIMALS, ALWAYS. ZATCA's amounts carry at most two (BR-DEC rules), and a
 * fixed width is what makes the same figure hash the same way twice.
 */
const amount = (name: string, value: number, currency: string) =>
  el(name, (Number(value) || 0).toFixed(2), { currencyID: currency });

const percent = (v: number) => (Number(v) || 0).toFixed(2);

/** The UN/ECE code lists, on every tax category and tax scheme id. */
const CATEGORY_ID = { schemeAgencyID: "6", schemeID: "UN/ECE 5305" };
const SCHEME_ID = { schemeAgencyID: "6", schemeID: "UN/ECE 5153" };
const vatScheme = box("cac:TaxScheme", el("cbc:ID", "VAT", SCHEME_ID));

export const NS = {
  invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
} as const;

/**
 * THE ROOT'S OPENING TAG. Namespace declarations in canonical order — the
 * default namespace first, then the prefixed ones alphabetically — so the tag
 * is identical before and after canonicalisation.
 */
const ROOT_OPEN =
  `<Invoice xmlns="${NS.invoice}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}" xmlns:ext="${NS.ext}">`;

const address = (a: Partial<ZatcaAddress>, country = "SA") => box("cac:PostalAddress", [
  // UBL's own order: street, building, plot, district, city, postal, country.
  a.street ? el("cbc:StreetName", a.street) : "",
  a.building ? el("cbc:BuildingNumber", a.building) : "",
  a.additional ? el("cbc:PlotIdentification", a.additional) : "",
  a.district ? el("cbc:CitySubdivisionName", a.district) : "",
  a.city ? el("cbc:CityName", a.city) : "",
  a.postal ? el("cbc:PostalZone", a.postal) : "",
  box("cac:Country", el("cbc:IdentificationCode", country)),
]);

const subtotal = (t: ZatcaSubtotal, currency: string) => box("cac:TaxSubtotal", [
  amount("cbc:TaxableAmount", t.taxableAmount, currency),
  amount("cbc:TaxAmount", t.taxAmount, currency),
  box("cac:TaxCategory", [
    el("cbc:ID", t.category, CATEGORY_ID),
    el("cbc:Percent", percent(t.percent)),
    t.exemptionCode ? el("cbc:TaxExemptionReasonCode", t.exemptionCode) : "",
    t.exemptionReason ? el("cbc:TaxExemptionReason", t.exemptionReason) : "",
    vatScheme,
  ]),
]);

/**
 * THE QR REFERENCE, one of the three parts ZATCA cuts before hashing. The
 * other two — the signature extension and the signature envelope — belong to
 * the cryptographic stamp, which the company's own certified solution adds
 * (./zatca says why), so a document prepared here carries neither. The QR is
 * kept apart so `zatcaHashInput` can leave it out without searching for it.
 */
const QR_REF = (qr: string) => box("cac:AdditionalDocumentReference", [
  el("cbc:ID", "QR"),
  box("cac:Attachment", el("cbc:EmbeddedDocumentBinaryObject", qr, { mimeCode: "text/plain" })),
]);
/**
 * THE DOCUMENT, in two pieces either side of where the QR reference goes.
 */
function pieces(doc: ZatcaDocument) {
  const c = doc.currency;
  const head = [
    el("cbc:ProfileID", "reporting:1.0"),
    el("cbc:ID", doc.id),
    el("cbc:UUID", doc.uuid),
    el("cbc:IssueDate", doc.issueDate),
    el("cbc:IssueTime", doc.issueTime),
    el("cbc:InvoiceTypeCode", doc.typeCode, { name: doc.subtype }),
    el("cbc:DocumentCurrencyCode", c),
    // THE TAX IS ALWAYS DECLARED IN RIYALS; `zatcaProblem` refuses any other
    // document currency until the second tax total in SAR is written.
    el("cbc:TaxCurrencyCode", "SAR"),
    doc.billingReference
      ? box("cac:BillingReference", box("cac:InvoiceDocumentReference", el("cbc:ID", doc.billingReference)))
      : "",
    box("cac:AdditionalDocumentReference", [el("cbc:ID", "ICV"), el("cbc:UUID", String(doc.counter))]),
    box("cac:AdditionalDocumentReference", [
      el("cbc:ID", "PIH"),
      box("cac:Attachment", el("cbc:EmbeddedDocumentBinaryObject", doc.previousHash, { mimeCode: "text/plain" })),
    ]),
  ].join("");

  const s = doc.seller;
  const b = doc.buyer;
  const tail = [
    box("cac:AccountingSupplierParty", box("cac:Party", [
      box("cac:PartyIdentification", el("cbc:ID", s.crn, { schemeID: "CRN" })),
      address(s.address),
      box("cac:PartyTaxScheme", [el("cbc:CompanyID", s.vatNumber), vatScheme]),
      box("cac:PartyLegalEntity", el("cbc:RegistrationName", s.name)),
    ])),
    // A SIMPLIFIED INVOICE MAY NAME NOBODY — a walk-in customer is ordinary —
    // and UBL allows the customer party to be empty.
    box("cac:AccountingCustomerParty", b ? box("cac:Party", [
      b.address ? address(b.address) : "",
      b.vatNumber ? box("cac:PartyTaxScheme", [el("cbc:CompanyID", b.vatNumber), vatScheme]) : "",
      box("cac:PartyLegalEntity", el("cbc:RegistrationName", b.name)),
    ]) : ""),
    // THE SUPPLY DATE is required on a standard invoice (KSA-5); a simplified
    // one takes the issue date, which is what it is for a sale over a counter.
    doc.subtype === "0100000" ? box("cac:Delivery", el("cbc:ActualDeliveryDate", doc.issueDate)) : "",
    box("cac:PaymentMeans", [
      el("cbc:PaymentMeansCode", doc.paymentMeansCode),
      // A NOTE'S REASON rides here (KSA-10), the only place UBL gives it.
      doc.reason ? el("cbc:InstructionNote", doc.reason) : "",
    ]),
    // TWO TAX TOTALS, the way ZATCA's own samples carry them: the first is the
    // tax in the TAX currency and stands alone, the second carries the
    // subtotals in the document currency. With both in SAR they are the same
    // figure twice, and the QR reads the first.
    box("cac:TaxTotal", amount("cbc:TaxAmount", doc.taxAmount, "SAR")),
    box("cac:TaxTotal", [
      amount("cbc:TaxAmount", doc.taxAmount, c),
      ...doc.subtotals.map((t) => subtotal(t, c)),
    ]),
    box("cac:LegalMonetaryTotal", [
      amount("cbc:LineExtensionAmount", doc.lineExtensionAmount, c),
      amount("cbc:TaxExclusiveAmount", doc.taxExclusiveAmount, c),
      amount("cbc:TaxInclusiveAmount", doc.taxInclusiveAmount, c),
      amount("cbc:AllowanceTotalAmount", 0, c),
      amount("cbc:PrepaidAmount", 0, c),
      amount("cbc:PayableAmount", doc.payableAmount, c),
    ]),
    ...doc.lines.map((l) => box("cac:InvoiceLine", [
      el("cbc:ID", l.id),
      el("cbc:InvoicedQuantity", String(l.quantity), { unitCode: "PCE" }),
      amount("cbc:LineExtensionAmount", l.lineExtensionAmount, c),
      box("cac:TaxTotal", [
        amount("cbc:TaxAmount", l.taxAmount, c),
        // THE LINE INCLUDING ITS TAX, despite the name (KSA-12).
        amount("cbc:RoundingAmount", l.lineExtensionAmount + l.taxAmount, c),
      ]),
      box("cac:Item", [
        el("cbc:Name", l.name),
        box("cac:ClassifiedTaxCategory", [
          el("cbc:ID", l.category, CATEGORY_ID),
          el("cbc:Percent", percent(l.percent)),
          vatScheme,
        ]),
      ]),
      box("cac:Price", amount("cbc:PriceAmount", l.unitPrice, c)),
    ])),
  ].join("");

  return { head, tail };
}

/**
 * THE DOCUMENT AS THE STUDIO DOWNLOADS IT: every field the seller writes, with
 * the seller's QR where there is one, and no stamp.
 */
export function zatcaInvoiceXml(doc: ZatcaDocument, qr?: string): string {
  const { head, tail } = pieces(doc);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ROOT_OPEN,
    head,
    qr ? QR_REF(qr) : "",
    tail,
    "</Invoice>",
  ].join("");
}

/**
 * WHAT IS HASHED: the document without the XML declaration and the QR
 * reference (a stamped document also loses its signature extension and
 * envelope, which this one never has) — already canonical, see the header. Built from the same pieces as the document itself rather than cut out
 * of its text, so the two cannot drift apart.
 */
export function zatcaHashInput(doc: ZatcaDocument): string {
  const { head, tail } = pieces(doc);
  return `${ROOT_OPEN}${head}${tail}</Invoice>`;
}

/** THE INVOICE HASH (KSA-13 when it becomes the next document's PIH): base64 of the raw SHA-256. */
export function zatcaInvoiceHash(doc: ZatcaDocument): string {
  return createHash("sha256").update(zatcaHashInput(doc), "utf8").digest("base64");
}
