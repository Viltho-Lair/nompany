// WHAT SAUDI ARABIA'S TAX AUTHORITY IS HANDED — composed, written, hashed and
// QR'd by nompany, and SUBMITTED BY THE STUDIO (the owner's rule, 26/09/2026:
// nompany never reaches a tax authority; ./modules/finance/einvoice).
//
// WHAT THIS PROVES. The arithmetic, that the document is written in the
// canonical form its hash is taken over, the counter and hash chain, and the
// QR's five seller tags. Several of those encodings were confirmed against
// ZATCA's developer portal on 25/09/2026, before the owner's rule, while an
// adapter still submitted; this file holds them where ZATCA accepted them. One
// assertion below exists because that portal warned: the QR's time carried a
// "Z" the issue time does not.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const D = await import("@/modules/finance/zatcaDocument");
const X = await import("@/modules/finance/zatcaXml");
const Q = await import("@/modules/finance/zatcaQr");
const Z = await import("@/modules/finance/zatca");

let fails = 0;
const ok = (what, cond, saw) => {
  if (cond) { console.log(`  ok    ${what}`); return; }
  fails += 1;
  console.log(`  FAIL  ${what}${saw === undefined ? "" : `\n        saw: ${saw}`}`);
};
const j = (v) => JSON.stringify(v);

const seller = {
  name: "شركة الاختبار",
  vatNumber: "300000000000003",
  crn: "1010010000",
  address: { street: "King Fahd Road", building: "1234", additional: "5678", district: "Al Olaya", city: "Riyadh", postal: "12211" },
};
const compose = (invoice, extra = {}) => D.zatcaDocument({
  invoice: { reference: "INV-0001", issueDate: "2026-09-25", clientName: "Walk-in", currency: "SAR", vatRate: 15, ...invoice },
  seller, uuid: "3cf5ee18-ee25-44ea-a444-2c37ba7f28be", issueTime: "10:15:00", counter: 1, previousHash: D.ZATCA_FIRST_PIH,
  ...extra,
});

console.log("\n== the chain starts where ZATCA's standard starts it");
ok("THE FIRST PIH IS base64 OF THE HEX OF sha256(\"0\") — not of the raw digest, unlike every later link",
  D.ZATCA_FIRST_PIH === Buffer.from(createHash("sha256").update("0").digest("hex")).toString("base64"));

console.log("\n== tax is taken ONCE PER CATEGORY on the total, not summed from rounded lines");
const drift = compose({ lines: [1, 2, 3].map(() => ({ description: "Small item", qty: 1, unitPrice: 1.03 })) });
// 1.03 × 15% is 0.1545 a line, 0.15 rounded — 0.45 summed. The document's
// 3.09 × 15% is 0.4635, which is 0.46. ZATCA's standard asks for the second.
ok("the document's tax is 0.46, the per-category figure", drift.taxAmount === 0.46, drift.taxAmount);
ok("...while each line still shows its own rounded 0.15", drift.lines.every((l) => l.taxAmount === 0.15), j(drift.lines.map((l) => l.taxAmount)));
ok("and the payable is the figure the customer was shown (3.09 + 0.46)", drift.payableAmount === 3.55, drift.payableAmount);

const mixed = compose({
  lines: [
    { description: "Standard", qty: 2, unitPrice: 50 },
    { description: "Medicine", qty: 1, unitPrice: 30, taxCategory: "zero" },
  ],
}, { exemptions: { Z: { code: "VATEX-SA-35", reason: "Medicines and medical equipment" } } });
ok("a zero-rated line sits in its own subtotal at nought, with the studio's own reason",
  mixed.subtotals.length === 2 && mixed.subtotals[1].category === "Z" && mixed.subtotals[1].taxAmount === 0
  && mixed.subtotals[1].exemptionCode === "VATEX-SA-35", j(mixed.subtotals));
ok("THE STANDARD SUBTOTAL CARRIES NO EXEMPTION — only Z and E say why", !mixed.subtotals[0].exemptionCode);

console.log("\n== what is refused before anything is sent");
ok("a complete simplified invoice has no problem", D.zatcaProblem(mixed) === "", D.zatcaProblem(mixed));
ok("A ZERO-RATED LINE WITH NO REASON IS REFUSED — a wrong VATEX code would be a false statement, so none is guessed",
  D.zatcaProblem(compose({ lines: [{ description: "x", qty: 1, unitPrice: 1, taxCategory: "zero" }] })) === "exemption-reason");
ok("a VAT number that is not fifteen digits between 3s is refused",
  D.zatcaProblem({ ...mixed, seller: { ...seller, vatNumber: "310000000000001" } }) === "seller-vat");
ok("a building number that is not four digits is refused",
  D.zatcaProblem({ ...mixed, seller: { ...seller, address: { ...seller.address, building: "12" } } }) === "seller-building");
ok("A STANDARD (B2B) INVOICE WITHOUT THE BUYER'S REGISTRATION IS REFUSED — an invoice here does not carry it",
  D.zatcaProblem(compose({ lines: [{ description: "x", qty: 1, unitPrice: 1 }] }, { subtype: "standard" })) === "buyer-details");
ok("a credit note must name what it corrects and why",
  D.zatcaProblem(compose({ lines: [{ description: "x", qty: 1, unitPrice: 1 }] }, { kind: "creditNote" })) === "note-reference");
ok("a document in another currency is refused until the riyal tax total is written",
  D.zatcaProblem(compose({ currency: "USD", lines: [{ description: "x", qty: 1, unitPrice: 1 }] })) === "currency");

console.log("\n== the XML is written already canonical");
const hashInput = X.zatcaHashInput(mixed);
ok("no self-closing element anywhere — C14N writes start and end tags", !hashInput.includes("/>"));
ok("NO WHITESPACE BETWEEN ELEMENTS, so cutting one out leaves nothing behind", !/>\s+</.test(hashInput));
ok("attributes in canonical order (schemeAgencyID before schemeID)",
  hashInput.includes('<cbc:ID schemeAgencyID="6" schemeID="UN/ECE 5305">S</cbc:ID>'));
ok("namespace declarations default-first then by prefix, and with UBL's -2 suffix",
  hashInput.startsWith('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc='));
ok("text is escaped the canonical way: quotes stay, > is escaped",
  X.c14nText(`"A" & 'B' > C`) === `"A" &amp; 'B' &gt; C`);
ok("the Arabic seller name is written as itself", hashInput.includes("<cbc:RegistrationName>شركة الاختبار</cbc:RegistrationName>"));
ok("the counter and the previous hash are in the hashed part",
  hashInput.includes("<cbc:ID>ICV</cbc:ID><cbc:UUID>1</cbc:UUID>") && hashInput.includes(D.ZATCA_FIRST_PIH));

const hash = X.zatcaInvoiceHash(mixed);
ok("the invoice hash is base64 of a raw 32-byte digest", Buffer.from(hash, "base64").length === 32, hash);
ok("the same document hashes the same way twice", X.zatcaInvoiceHash(mixed) === hash);
ok("a changed line changes the hash",
  X.zatcaInvoiceHash({ ...mixed, lines: [{ ...mixed.lines[0], name: "Other" }, mixed.lines[1]] }) !== hash);

console.log("\n== the file the studio downloads");
const qr = Z.sellerQr(mixed);
const xml = X.zatcaInvoiceXml(mixed, qr);
ok("NO STAMP: no signature extension and no signature envelope — the company's certified solution adds both",
  !xml.includes("ext:UBLExtensions>") && !xml.includes("<cac:Signature>"));
ok("the seller's QR rides in its AdditionalDocumentReference",
  xml.includes(`<cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qr}</cbc:EmbeddedDocumentBinaryObject>`));
// CUTTING THE QR REFERENCE AND THE DECLARATION OUT OF THE FILE gives the hashed
// string — the property the canonical-by-construction approach rests on.
const cut = xml
  .replace('<?xml version="1.0" encoding="UTF-8"?>', "")
  .replace(/<cac:AdditionalDocumentReference><cbc:ID>QR<\/cbc:ID>.*?<\/cac:AdditionalDocumentReference>/, "");
ok("THE FILE, WITH ITS QR REFERENCE CUT OUT, IS EXACTLY THE HASHED STRING", cut === hashInput);

console.log("\n== the QR the seller builds");
const tags = Q.tlvDecode(qr);
ok("FIVE TAGS — 6 to 9 are the stamp's, which nompany does not make", tags.length === 5, tags.length);
ok("tag 1 is the seller's name in UTF-8, Arabic intact", tags[0].toString("utf8") === seller.name);
// THE TIME HAS NO "Z": with one, ZATCA warned invoiceTimeStamp_QRCODE_INVALID
// (KSA-25) on every document, because the issue time is local.
ok("tags 2–5: VAT number, time (as the document writes it, no zone), total, VAT",
  tags[1].toString() === seller.vatNumber && tags[2].toString() === "2026-09-25T10:15:00"
  && tags[3].toString() === mixed.taxInclusiveAmount.toFixed(2) && tags[4].toString() === mixed.taxAmount.toFixed(2),
  j(tags.map(String)));
let threw = false;
try { Q.tlvEncode(["x".repeat(256)]); } catch { threw = true; }
ok("A VALUE TOO LONG FOR ONE LENGTH BYTE THROWS rather than writing a different QR", threw);

console.log("\n== when the invoice was issued");
ok("CREATED ON ITS ISSUE DATE: that moment, in the studio's zone",
  Z.issueTimeOf({ issueDate: "2026-09-25", createdAt: "2026-09-25T07:15:09.000Z" }, "Asia/Riyadh") === "10:15:09");
ok("dated some other day: midnight, rather than an invented time",
  Z.issueTimeOf({ issueDate: "2026-09-20", createdAt: "2026-09-25T07:15:09.000Z" }, "Asia/Riyadh") === "00:00:00");
ok("a zone that moves the day is honoured — 23:30 UTC is the next day in Riyadh",
  Z.issueTimeOf({ issueDate: "2026-09-26", createdAt: "2026-09-25T23:30:00.000Z" }, "Asia/Riyadh") === "02:30:00");
console.log("\n== the seller, from the official values");
const studio = {
  name: "Test Co", country: "Saudi Arabia", vatRate: 15,
  officialValues: {
    legal_name_ar: "شركة الاختبار", vat_registration_number: "300000000000003", commercial_registration_number: "1010010000",
    national_address_building_number: "1234", national_address_street: "King Fahd Road", national_address_district: "Al Olaya",
    national_address_city: "Riyadh", national_address_postal_code: "12211",
  },
};
const fromStudio = Z.zatcaSeller(studio);
ok("THE ARABIC LEGAL NAME IS THE SELLER'S NAME where there is one", fromStudio.name === "شركة الاختبار", j(fromStudio));
ok("the national address comes across in its parts",
  fromStudio.address.building === "1234" && fromStudio.address.postal === "12211", j(fromStudio.address));

console.log("\n== the chain");
ok("AN EMPTY CHAIN STARTS AT 1 FROM THE STANDARD'S SEED",
  j(Z.nextLink(null)) === j({ counter: 1, previousHash: D.ZATCA_FIRST_PIH }));
ok("the next link follows the last",
  j(Z.nextLink({ counter: 7, previousHash: "h7" })) === j({ counter: 8, previousHash: "h7" }));

console.log(fails ? `\nzatca model: ${fails} FAILURES\n` : "\nzatca model: all passed\n");
process.exitCode = fails ? 1 : 0;
