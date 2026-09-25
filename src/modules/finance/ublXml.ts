// A JOFOTARA INVOICE, AS XML — written against ISTD's own technical guide.
//
// THE SOURCE IS THE AUTHORITY'S, NOT A TUTORIAL'S: *الدليل التقني للربط مع نظام
// الفوترة الوطني* (istd.gov.jo, 107 pages, read 22/09/2026). The first draft of
// this file was written from general UBL knowledge and a third-party tutorial
// and was wrong in eight ways that would each have been rejected — they are
// listed below, because every one of them looks right to somebody who knows
// UBL and does not know JORDAN'S UBL.
//
//  1. `cbc:ProfileID` (`reporting:1.0`) is required and comes FIRST.
//  2. `cbc:InvoiceTypeCode` is ALWAYS `388`. Jordan's own code — 011, 021, 111,
//     121, 311, 321, 411, 421, 511, 521 — rides in its `name` ATTRIBUTE. The
//     draft put Jordan's code in the element and omitted 388 entirely.
//  3. `currencyID` is **"JO"**, not the ISO 4217 "JOD". Unusual enough to look
//     like a typo; it appears 283 times in the guide without exception.
//  4. A line carries `cac:TaxTotal` with BOTH `cbc:TaxAmount` and
//     `cbc:RoundingAmount`, then `cac:TaxSubtotal` — not `cac:ClassifiedTaxCategory`,
//     which the guide never uses and the draft used on every line.
//  5. A tax category's `cbc:ID` carries `schemeAgencyID="6" schemeID="UN/ECE 5305"`,
//     and the tax scheme's carries `schemeID="UN/ECE 5153"`. Bare ids are refused.
//  6. A DISCOUNT IS `cac:AllowanceCharge` INSIDE `cac:Price`, reason `DISCOUNT`.
//     This is where the owner's parked discount mapping actually goes.
//  7. `cbc:TaxCurrencyCode` sits beside `cbc:DocumentCurrencyCode`.
//  8. `cac:SellerSupplierParty` carries the INCOME SOURCE SEQUENCE in
//     `cac:PartyIdentification/cbc:ID` — a per-taxpayer number from the portal.
//
// STILL UNVERIFIED BY ISTD: no file written here has been through JoFotara, and
// the guide is 107 pages of which this reads the structure rather than every
// rule. The first file a studio submits and records as accepted is the check;
// one it records as rejected, with ISTD's words, is the next fix.
//
// ONE LINE, NO PRETTY PRINTING. Whitespace between elements is significant to
// anything that hashes or signs a document.

import type { UblInvoice } from "./jofotaraDocument";

/** The five characters XML reserves. A customer called "Smith & Co" is enough to need this. */
export function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const el = (name: string, value: unknown, attrs = "") =>
  `<${name}${attrs}>${xmlEscape(value)}</${name}>`;

/**
 * JORDAN WRITES `currencyID="JO"`, and this constant exists so that surprising
 * fact is stated once rather than repeated as a literal down the file.
 */
export const JO_CURRENCY_ID = "JO";

/** The dinar carries three decimals; a fixed width matters to anything that hashes. */
const money = (name: string, value: number, decimals = 3) =>
  `<${name} currencyID="${JO_CURRENCY_ID}">${(Number(value) || 0).toFixed(decimals)}</${name}>`;

/** UN/ECE 5305 is the tax-category list; 5153 is the tax-scheme list. */
const CATEGORY_ATTRS = ' schemeAgencyID="6" schemeID="UN/ECE 5305"';
const SCHEME_ATTRS = ' schemeAgencyID="6" schemeID="UN/ECE 5153"';

const taxCategory = (code: string, percent: number) => [
  "<cac:TaxCategory>",
  el("cbc:ID", code, CATEGORY_ATTRS),
  el("cbc:Percent", percent.toFixed(2)),
  "<cac:TaxScheme>", el("cbc:ID", "VAT", SCHEME_ATTRS), "</cac:TaxScheme>",
  "</cac:TaxCategory>",
].join("");

/** What a studio must carry beyond the invoice itself, from its JoFotara registration. */
export type JofotaraSeller = {
  /** Jordan's own invoice code — the `name` attribute on cbc:InvoiceTypeCode. */
  typeCode: string;
  /** The income source sequence from the portal (cac:SellerSupplierParty). */
  incomeSource: string;
};

export function ublInvoiceXml(doc: UblInvoice, seller: JofotaraSeller): string {
  const lines = doc.lines.map((l) => [
    "<cac:InvoiceLine>",
    el("cbc:ID", l.id),
    el("cbc:InvoicedQuantity", (Number(l.quantity) || 0).toFixed(3), ' unitCode="PCE"'),
    money("cbc:LineExtensionAmount", l.lineExtensionAmount),
    "<cac:TaxTotal>",
    money("cbc:TaxAmount", l.taxAmount),
    // ROUNDING AMOUNT IS THE LINE INCLUDING TAX, which is what the guide's
    // worked examples show — not a rounding correction, despite the name.
    money("cbc:RoundingAmount", (Number(l.lineExtensionAmount) || 0) + (Number(l.taxAmount) || 0)),
    "<cac:TaxSubtotal>",
    money("cbc:TaxAmount", l.taxAmount),
    taxCategory(l.taxCategoryCode, l.taxPercent),
    "</cac:TaxSubtotal>",
    "</cac:TaxTotal>",
    "<cac:Item>", el("cbc:Name", l.description), "</cac:Item>",
    "<cac:Price>",
    money("cbc:PriceAmount", l.unitPrice),
    // THE LINE'S DISCOUNT, where Jordan puts it. Always present, at nought when
    // there is none, because the guide's examples carry it unconditionally.
    "<cac:AllowanceCharge>",
    el("cbc:ChargeIndicator", "false"),
    el("cbc:AllowanceChargeReason", "DISCOUNT"),
    money("cbc:Amount", l.allowanceAmount || 0),
    "</cac:AllowanceCharge>",
    "</cac:Price>",
    "</cac:InvoiceLine>",
  ].join(""));

  const subtotals = doc.taxSubtotals.map((s) => [
    "<cac:TaxSubtotal>",
    money("cbc:TaxableAmount", s.taxableAmount),
    money("cbc:TaxAmount", s.taxAmount),
    taxCategory(s.categoryCode, s.percent),
    "</cac:TaxSubtotal>",
  ].join(""));

  const party = (tag: string, p: UblInvoice["supplier"]) => [
    `<cac:${tag}>`,
    "<cac:Party>",
    p.countryCode
      ? `<cac:PostalAddress><cac:Country>${el("cbc:IdentificationCode", p.countryCode)}</cac:Country></cac:PostalAddress>`
      : "",
    p.taxNumber
      ? `<cac:PartyTaxScheme>${el("cbc:CompanyID", p.taxNumber)}<cac:TaxScheme>${el("cbc:ID", "VAT", SCHEME_ATTRS)}</cac:TaxScheme></cac:PartyTaxScheme>`
      : "",
    `<cac:PartyLegalEntity>${el("cbc:RegistrationName", p.name)}</cac:PartyLegalEntity>`,
    "</cac:Party>",
    `</cac:${tag}>`,
  ].join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    // UBL 2.1'S NAMESPACES END IN "-2". These two were written without it until
    // 25/09/2026, when writing Saudi Arabia's serialiser beside this one showed
    // the difference: every element under an unsuffixed namespace belongs to no
    // schema at all, so the document would be refused before any rule was read.
    ' xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    ' xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
    ' xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">',
    el("cbc:ProfileID", "reporting:1.0"),
    el("cbc:ID", doc.id),
    el("cbc:UUID", doc.uuid),
    el("cbc:IssueDate", doc.issueDate),
    // ALWAYS 388; Jordan's own code is the attribute.
    el("cbc:InvoiceTypeCode", "388", ` name="${xmlEscape(seller.typeCode)}"`),
    el("cbc:Note", ""),
    el("cbc:DocumentCurrencyCode", "JOD"),
    el("cbc:TaxCurrencyCode", "JOD"),
    party("AccountingSupplierParty", doc.supplier),
    party("AccountingCustomerParty", doc.customer),
    // THE INCOME SOURCE SEQUENCE — the taxpayer's own, from the portal.
    `<cac:SellerSupplierParty><cac:Party><cac:PartyIdentification>${el("cbc:ID", seller.incomeSource)}</cac:PartyIdentification></cac:Party></cac:SellerSupplierParty>`,
    "<cac:PaymentMeans>",
    el("cbc:PaymentMeansCode", "10", ' listID="UN/ECE 4461"'),
    el("cbc:InstructionNote", ""),
    "</cac:PaymentMeans>",
    doc.allowanceTotalAmount > 0
      ? `<cac:AllowanceCharge>${el("cbc:ChargeIndicator", "false")}${el("cbc:AllowanceChargeReason", "discount")}${money("cbc:Amount", doc.allowanceTotalAmount)}</cac:AllowanceCharge>`
      : "",
    "<cac:TaxTotal>",
    money("cbc:TaxAmount", doc.taxTotalAmount),
    subtotals.join(""),
    "</cac:TaxTotal>",
    "<cac:LegalMonetaryTotal>",
    money("cbc:TaxExclusiveAmount", doc.taxExclusiveAmount),
    money("cbc:TaxInclusiveAmount", doc.taxInclusiveAmount),
    money("cbc:AllowanceTotalAmount", doc.allowanceTotalAmount),
    money("cbc:PayableAmount", doc.payableAmount),
    "</cac:LegalMonetaryTotal>",
    lines.join(""),
    "</Invoice>",
  ].join("");
}
