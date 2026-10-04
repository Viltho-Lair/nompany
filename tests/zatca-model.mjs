// WHAT SAUDI ARABIA'S TAX AUTHORITY IS HANDED — composed, written, hashed,
// QR'd and STAMPED by nompany, which reports it (the owner's decision A,
// 03/10/2026; ./modules/finance/einvoice has the rule it reversed).
//
// WHAT THIS PROVES. The arithmetic, that the document is written in the
// canonical form its hash is taken over, the counter and hash chain, the QR's
// tags, and the stamp. The encodings were confirmed against ZATCA's developer
// portal — on 25/09/2026, and again on 04/10/2026, when a stamped simplified
// invoice, credit note and debit note were each REPORTED by its production
// reporting endpoint with no warning. Two assertions exist because that portal
// objected: the QR's time carried a "Z" the issue time does not (a warning),
// and the signed properties were hashed with an empty element written open
// and shut where ZATCA writes it self-closed (a refusal — and its compliance
// check had passed the same file, so only reporting finds it).

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const D = await import("@/modules/finance/zatcaDocument");
const X = await import("@/modules/finance/zatcaXml");
const Q = await import("@/modules/finance/zatcaQr");
const Z = await import("@/modules/finance/zatca");
const C = await import("@/modules/finance/zatcaCrypto");
const G = await import("@/modules/finance/zatcaSign");
const { createVerify } = await import("node:crypto");

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
ok("AN UNSTAMPED FILE — a studio not yet connected to ZATCA — has no signature extension and no envelope",
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
ok("FIVE TAGS on an unstamped file — 6 to 9 are the stamp's", tags.length === 5, tags.length);
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
  j(Z.nextLink(null)) === j({ counter: 1, previousHash: D.ZATCA_FIRST_PIH, unitId: "" }));
ok("the next link follows the last — a chain written before units counts for no unit",
  j(Z.nextLink({ counter: 7, previousHash: "h7" })) === j({ counter: 8, previousHash: "h7", unitId: "" }));
ok("A NEW UNIT STARTS ITS OWN CHAIN: ZATCA counts per unit, and never saw the old count",
  j(Z.nextLink({ counter: 7, previousHash: "h7" }, "u1")) === j({ counter: 1, previousHash: D.ZATCA_FIRST_PIH, unitId: "u1" }));
ok("...and continues it once started",
  j(Z.nextLink({ counter: 3, previousHash: "h3", unitId: "u1" }, "u1")) === j({ counter: 4, previousHash: "h3", unitId: "u1" }));

console.log("\n== the stamp (./zatcaSign)");
// A CERTIFICATE ZATCA'S DEVELOPER PORTAL ISSUED, 04/10/2026, for an invented
// company (VAT 399999999900003). A certificate is public by design; the key it
// was issued for is not here, and is not needed — the signature is checked
// against a key made below, and the certificate is read for what the stamp
// copies out of it.
const DEV_CERT = "TUlJQjlqQ0NBWnlnQXdJQkFnSUdBYUVHQ1daYU1Bb0dDQ3FHU000OUJBTUNNQlV4RXpBUkJnTlZCQU1NQ21WSmJuWnZhV05wYm1jd0hoY05Nall4TURBME1EZ3pNRE0yV2hjTk16RXhNREF6TWpFd01EQXdXakJUTVFzd0NRWURWUVFHRXdKVFFURVdNQlFHQTFVRUN3d05VbWw1WVdSb0lFSnlZVzVqYURFVk1CTUdBMVVFQ2d3TVZHVnpkQ0JEYjIxd1lXNTVNUlV3RXdZRFZRUUREQXh1YjIxd1lXNTVMWFJsYzNRd1ZqQVFCZ2NxaGtqT1BRSUJCZ1VyZ1FRQUNnTkNBQVQ3RnNDVXo3QTlIN05sZVJBbUpCRkZsN3VCR0NsSFE0eGordllXRFhRRERtOTl0NG54SEYyRlB3ckRhVlJpWWpRdzl0QUxaY2owT1NtSzJueDRXR2VhbzRHY01JR1pNQXdHQTFVZEV3RUIvd1FDTUFBd2dZZ0dBMVVkRVFTQmdEQitwSHd3ZWpFa01DSUdBMVVFQkF3Yk1TMXViMjF3WVc1NWZESXRNUzR3ZkRNdGRHVnpkQzB3TURBeE1SOHdIUVlLQ1pJbWlaUHlMR1FCQVF3UE16azVPVGs1T1RrNU9UQXdNREF6TVEwd0N3WURWUVFNREFReE1UQXdNUTh3RFFZRFZRUWFEQVpTYVhsaFpHZ3hFVEFQQmdOVkJBOE1DRk5sY25acFkyVnpNQW9HQ0NxR1NNNDlCQU1DQTBnQU1FVUNJUURtb0g3R2lHaTJLcHBIQVJXYXZENW5QS3c0ZGE2YThRTmVUUWl1Y3pnVEdnSWdTeUZsQjVVYUxTZk5kd1lVUjJrSzl2SzI3ZEJtUDJKejR2SWxnc0NjREJzPQ==";
const cert = C.readZatcaCertificate(DEV_CERT);
ok("the certificate is read: issuer, decimal serial, public key, ZATCA's signature",
  cert.issuer === "CN=eInvoicing" && /^\d+$/.test(cert.serial) && cert.publicKeyDer.length === 88 && cert.signature[0] === 0x30, j({ issuer: cert.issuer, serial: cert.serial }));
const key = C.newZatcaKey();
const stamp = G.stampZatca(mixed, { privateKeyPem: key.privateKeyPem, certificate: cert, signingTime: "2026-10-04T08:00:00" });
ok("THE STAMP SIGNS THE HASH IT WAS HANDED — stamping moves nothing the hash covers", stamp.hash === X.zatcaInvoiceHash(mixed));
const verifier = createVerify("sha256");
verifier.update(Buffer.from(stamp.hash, "base64"));
ok("the signature is ECDSA over the 32 raw bytes of the hash, and verifies with the key's public half",
  verifier.verify({ key: key.publicKeyDer, format: "der", type: "spki" }, Buffer.from(stamp.signature, "base64")));
// THE PROPERTY ZATCA'S VALIDATOR RESTS ON: cut its three parts out of the
// stamped file and what is left is exactly what was hashed.
const stampedCut = stamp.xml
  .replace('<?xml version="1.0" encoding="UTF-8"?>', "")
  .replace(/<ext:UBLExtensions>.*<\/ext:UBLExtensions>/, "")
  .replace(/<cac:AdditionalDocumentReference><cbc:ID>QR<\/cbc:ID>.*?<\/cac:AdditionalDocumentReference>/, "")
  .replace(/<cac:Signature>.*?<\/cac:Signature>/, "");
ok("THE STAMPED FILE, WITH ITS EXTENSION, QR AND ENVELOPE CUT OUT, IS EXACTLY THE HASHED STRING", stampedCut === hashInput);
ok("the extension comes first inside the root, and the envelope straight after the QR",
  /^<\?xml[^>]*\?><Invoice [^>]*><ext:UBLExtensions>/.test(stamp.xml)
  && /<cbc:ID>QR<\/cbc:ID>.*?<\/cac:AdditionalDocumentReference><cac:Signature>/.test(stamp.xml));
// THE REFUSAL THIS PINS: ZATCA hashes the signed properties with the digest
// method SELF-CLOSED; written open and shut, its reporting endpoint answered
// "Invalid signed properties hashing" (04/10/2026).
const props = stamp.xml.match(/<xades:SignedProperties .*?<\/xades:SignedProperties>/)?.[0] || "";
ok("the digest method inside the signed properties is self-closed", props.includes('<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>'), props.slice(0, 200));
const hashedForm = props
  .replace("<xades:SignedProperties ", '<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" ')
  .replace(/<ds:(\w+)/g, '<ds:$1 xmlns:ds="http://www.w3.org/2000/09/xmldsig#"')
  .replace(/ xmlns:ds="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#">/g, ' xmlns:ds="http://www.w3.org/2000/09/xmldsig#">');
const propsDigest = Buffer.from(createHash("sha256").update(hashedForm).digest("hex")).toString("base64");
ok("THE SIGNED PROPERTIES' DIGEST is base64 of the HEX of SHA-256 over them, each element carrying its namespace",
  stamp.xml.includes(`URI="#xadesSignedProperties"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${propsDigest}</ds:DigestValue>`), propsDigest);
const certDigest = Buffer.from(createHash("sha256").update(cert.base64).digest("hex")).toString("base64");
ok("the certificate's digest the same way, over its base64 text", props.includes(`<ds:DigestValue>${certDigest}</ds:DigestValue>`));
const stampTags = Q.tlvDecode(stamp.qr);
ok("NINE TAGS once stamped: the seller's five, the hash, the signature, the public key, ZATCA's certificate signature",
  stampTags.length === 9 && stampTags[0].toString("utf8") === seller.name
  && stampTags[5].toString() === stamp.hash && stampTags[6].toString() === stamp.signature
  && stampTags[7].equals(cert.publicKeyDer) && stampTags[8].equals(cert.signature), stampTags.length);
ok("the stamped file carries the nine-tag QR", stamp.xml.includes(`mimeCode="text/plain">${stamp.qr}</cbc:EmbeddedDocumentBinaryObject>`));

console.log("\n== the certificate request");
const csr = Buffer.from(C.zatcaCsr({ environment: "developer", commonName: "nompany-test", serialNumber: "1-nompany|2-erp|3-x",
  vatNumber: "399999999900003", orgUnit: "Riyadh", orgName: "Test", invoiceTypes: "0100", location: "Riyadh", industry: "Services" }, key.privateKeyPem), "base64").toString("utf8");
const csrDer = Buffer.from(csr.replace(/-----[^-]+-----|\s/g, ""), "base64");
ok("THE REQUEST IS A PEM, base64'd once more — the form ZATCA's compliance API takes", csr.startsWith("-----BEGIN CERTIFICATE REQUEST-----"));
ok("it names the developer portal's certificate template — each environment has its own",
  csrDer.includes(Buffer.from("TSTZATCA-Code-Signing")) && !csrDer.includes(Buffer.from("PREZATCA")));
ok("and carries the identity ZATCA reads: the VAT number, the unit's serial, the invoice types",
  csrDer.includes(Buffer.from("399999999900003")) && csrDer.includes(Buffer.from("1-nompany|2-erp|3-x")) && csrDer.includes(Buffer.from("0100")));

console.log("\n== the certificate's end (./zatcaUnit)");
const U = await import("@/modules/finance/zatcaUnit");
const expires = U.certificateExpiry(DEV_CERT);
ok("the expiry is read from the certificate itself", /^\d{4}-\d{2}-\d{2}T/.test(expires), expires);
ok("an unreadable token has no expiry, rather than throwing", U.certificateExpiry("not a certificate") === "");
const day = 86_400_000;
const end = new Date("2027-01-31T00:00:00Z");
ok("RENEWAL IS DUE INSIDE THE LAST THIRTY DAYS — an OTP has to be fetched, and an expired certificate signs invoices ZATCA refuses",
  U.renewDue(end.toISOString(), new Date(end.getTime() - 30 * day)) && !U.renewDue(end.toISOString(), new Date(end.getTime() - 31 * day)));
ok("...and stays due once it has ended", U.renewDue(end.toISOString(), new Date(end.getTime() + day)));
ok("no certificate, nothing to renew", U.renewDue("", new Date()) === false);

console.log("\n== what ZATCA's reporting answer means");
ok("REPORTED is accepted, its warnings kept as the message",
  j(Z.reportingOutcome(202, { reportingStatus: "REPORTED", validationResults: { warningMessages: [{ code: "W1", message: "careful" }] } }))
  === j({ outcome: "accepted", message: "W1: careful" }));
ok("NOT_REPORTED is rejected, with the rules it broke",
  j(Z.reportingOutcome(400, { reportingStatus: "NOT_REPORTED", validationResults: { errorMessages: [{ code: "BR-KSA-01", message: "bad" }] } }))
  === j({ outcome: "rejected", message: "BR-KSA-01: bad" }));
ok("NO ANSWER IS NOT A REFUSAL — an outage, a 401 or a 5xx leaves the invoice to be tried again",
  Z.reportingOutcome(0, null).outcome === "unreached" && Z.reportingOutcome(401, null).outcome === "unreached"
  && Z.reportingOutcome(503, { reportingStatus: "NOT_REPORTED" }).outcome === "unreached");

console.log(fails ? `\nzatca model: ${fails} FAILURES\n` : "\nzatca model: all passed\n");
process.exitCode = fails ? 1 : 0;
