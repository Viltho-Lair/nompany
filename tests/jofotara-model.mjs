// WHAT JORDAN'S TAX AUTHORITY WOULD BE SENT — the document, before any network.
//
// WHY THIS IS WORTH ASSERTING AT ALL. An invoice becoming a UBL document is
// mapping and arithmetic, and it is the half that goes wrong in ways nobody
// notices: a tax authority answers a bad document with a code, not with "your
// zero-rated line was taxed at sixteen per cent". Every figure below is one an
// authority reconciles against.
//
// IT ALREADY EARNED ITS KEEP. `categoryRate(category, rate)` takes two
// `unknown` parameters, so calling it `categoryRate(rate, category)` — which is
// what the first draft did — type-checks perfectly and taxes every zero-rated
// line at the headline rate. `tsc` was silent; the first assertion here was not.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const J = await import("@/modules/finance/jofotaraDocument");

let fails = 0;
const ok = (what, cond, saw) => {
  if (cond) { console.log(`  ok    ${what}`); return; }
  fails += 1;
  console.log(`  FAIL  ${what}${saw === undefined ? "" : `\n        saw: ${saw}`}`);
};
const j = (v) => JSON.stringify(v);

const supplier = { name: "Sandbox Trading", taxNumber: "12345678", countryCode: "JO" };
const doc = (invoice, extra = {}) => J.jofotaraDocument({
  invoice: { reference: "INV-0001", issueDate: "2026-09-22", clientName: "A Customer", currency: "JOD", vatRate: 16, ...invoice },
  supplier,
  invoiceType: "general-sales",
  uuid: "u-1",
  ...extra,
});

console.log("\n== tax is taken per line, at the line's own rate");
const mixed = doc({
  lines: [
    { description: "Standard goods", qty: 2, unitPrice: 50 },
    { description: "Zero-rated goods", qty: 1, unitPrice: 100, taxCategory: "zero" },
    { description: "Exempt service", qty: 1, unitPrice: 30, taxCategory: "exempt" },
  ],
});
// THE ASSERTION THAT CAUGHT THE ARGUMENT-ORDER BUG: with the arguments the
// wrong way round every one of these lines was taxed at 16.
ok("a zero-rated line is taxed at nought", mixed.lines[1].taxPercent === 0 && mixed.lines[1].taxAmount === 0,
  j(mixed.lines[1]));
ok("an exempt line likewise", mixed.lines[2].taxPercent === 0 && mixed.lines[2].taxAmount === 0, j(mixed.lines[2]));
ok("and the standard line carries the document's rate",
  mixed.lines[0].taxPercent === 16 && mixed.lines[0].taxAmount === 16, j(mixed.lines[0]));
ok("their category codes are UBL's own",
  mixed.lines.map((l) => l.taxCategoryCode).join("") === "SZE", j(mixed.lines.map((l) => l.taxCategoryCode)));

console.log("\n== the totals are the ones an authority reconciles");
ok("lines before tax add up", mixed.lineExtensionAmount === 230, String(mixed.lineExtensionAmount));
ok("tax is the sum of the lines' own tax, not the rate on the total",
  mixed.taxTotalAmount === 16, String(mixed.taxTotalAmount));
ok("what is owed is the two together", mixed.taxInclusiveAmount === 246 && mixed.payableAmount === 246, j(mixed));
ok("and what tax is charged ON is the lines less allowances",
  mixed.taxExclusiveAmount === 230, String(mixed.taxExclusiveAmount));

console.log("\n== one subtotal per rate, and they are grouped");
// THREE, NOT TWO: the group is (category, rate), so zero-rated and exempt stay
// apart even though both are taxed at nought. The first draft of this test
// asserted two and then asserted, four lines later, that they must not merge —
// the code was right and the test disagreed with itself.
ok("three lines at three category-rate pairs make three subtotals",
  mixed.taxSubtotals.length === 3, j(mixed.taxSubtotals));
ok("the standard group carries its own taxable amount and tax",
  j(mixed.taxSubtotals[0]) === j({ taxableAmount: 100, taxAmount: 16, percent: 16, categoryCode: "S" }),
  j(mixed.taxSubtotals[0]));
const zeroGroup = mixed.taxSubtotals.find((g) => g.categoryCode === "Z");
const exemptGroup = mixed.taxSubtotals.find((g) => g.categoryCode === "E");
ok("the zero-rated group is its own 100, taxed at nothing",
  zeroGroup.taxableAmount === 100 && zeroGroup.taxAmount === 0, j(zeroGroup));
ok("the exempt group is its own 30, taxed at nothing",
  exemptGroup.taxableAmount === 30 && exemptGroup.taxAmount === 0, j(exemptGroup));
// Zero-rated and exempt are DIFFERENT THINGS to a tax authority even though
// both are taxed at nought; grouping them together would declare one as the
// other. They share a rate here and differ by code, so the group key is both.
const zeroAndExempt = doc({
  lines: [
    { description: "Z", qty: 1, unitPrice: 10, taxCategory: "zero" },
    { description: "E", qty: 1, unitPrice: 10, taxCategory: "exempt" },
  ],
});
ok("zero-rated and exempt are not one group",
  zeroAndExempt.taxSubtotals.length === 2
  && zeroAndExempt.taxSubtotals.map((g) => g.categoryCode).sort().join("") === "EZ",
  j(zeroAndExempt.taxSubtotals));

console.log("\n== a tax-inclusive price is taken apart, never added to");
const inclusive = J.jofotaraDocument({
  invoice: { reference: "INV-2", issueDate: "2026-09-22", clientName: "C", currency: "JOD", vatRate: 16, lines: [{ description: "X", qty: 1, unitPrice: 116 }] },
  supplier, invoiceType: "general-sales", uuid: "u-2", pricesIncludeTax: true,
});
ok("116 at 16% is 100 and 16, not 116 and 18.56",
  inclusive.lineExtensionAmount === 100 && inclusive.taxTotalAmount === 16,
  j({ net: inclusive.lineExtensionAmount, tax: inclusive.taxTotalAmount }));
ok("…and the customer still owes what they were quoted", inclusive.payableAmount === 116, String(inclusive.payableAmount));
ok("the unit price is restated net, so the line reads consistently",
  inclusive.lines[0].unitPrice === 100, String(inclusive.lines[0].unitPrice));

console.log("\n== the document says what kind of sale it is");
// THESE TWO ASSERTED 012 AND 011 AS THE ELEMENT VALUE, from a third-party
// tutorial, and ISTD's own guide says otherwise: the element is ALWAYS 388, and
// Jordan's code — one of ten, in five pairs — rides in the `name` attribute,
// which ./ublXml writes from the SELLER's registration rather than from the
// invoice. A document cannot know it; a taxpayer does.
ok("every invoice carries 388", doc({ lines: [{ description: "x", qty: 1, unitPrice: 1 }] }).invoiceTypeCode === "388");
ok("…whatever the studio's tax treatment",
  J.jofotaraDocument({ invoice: { reference: "a", issueDate: "2026-09-22", lines: [{ description: "x", qty: 1, unitPrice: 1 }] }, supplier, invoiceType: "income", uuid: "u" }).invoiceTypeCode === "388");
ok("the ten codes are the guide's five pairs",
  J.JO_TYPE_CODES.join(",") === "011,021,111,121,311,321,411,421,511,521", J.JO_TYPE_CODES.join(","));
ok("a code the guide does not list is refused", !J.isJoTypeCode("012") && J.isJoTypeCode("011"));

console.log("\n== what is refused before it is ever sent");
// A REJECTION FROM ISTD ARRIVES AS A CODE a studio cannot act on; these four
// are things they can fix in their own settings, so they are caught here.
const good = doc({ lines: [{ description: "x", qty: 1, unitPrice: 10 }] });
ok("a complete document has no problem", J.jofotaraProblem(good) === "", J.jofotaraProblem(good));
ok("a studio with no tax number is refused by name",
  J.jofotaraProblem({ ...good, supplier: { ...supplier, taxNumber: "" } }) === "supplier-tin");
ok("an invoice with no reference is refused", J.jofotaraProblem({ ...good, id: "" }) === "reference");
ok("an invoice with no date is refused", J.jofotaraProblem({ ...good, issueDate: "" }) === "issue-date");
ok("an invoice with no lines is refused", J.jofotaraProblem({ ...good, lines: [] }) === "lines");

console.log("\n== a customer without a tax number is ordinary, not an error");
const walkIn = doc({ lines: [{ description: "x", qty: 1, unitPrice: 10 }] });
ok("no customer TIN is an empty field and a valid document",
  walkIn.customer.taxNumber === "" && J.jofotaraProblem(walkIn) === "", j(walkIn.customer));
ok("…and one that is given travels",
  doc({ clientTaxNumber: "87654321", lines: [{ description: "x", qty: 1, unitPrice: 10 }] }).customer.taxNumber === "87654321");

console.log("\n== the currency is the invoice's, and JOD when it says nothing");
ok("an invoice in dinars says JOD", good.documentCurrencyCode === "JOD");
ok("an invoice naming nothing defaults to JOD, the country's own",
  doc({ currency: "", lines: [{ description: "x", qty: 1, unitPrice: 1 }] }).documentCurrencyCode === "JOD");
ok("and one in another currency says so",
  doc({ currency: "usd", lines: [{ description: "x", qty: 1, unitPrice: 1 }] }).documentCurrencyCode === "USD");

console.log("\n== an invoice with nothing on it does not throw");
const bare = J.jofotaraDocument({ invoice: {}, supplier, invoiceType: "general-sales", uuid: "u" });
ok("no lines is an empty document rather than a crash",
  bare.lines.length === 0 && bare.payableAmount === 0, j(bare.payableAmount));

console.log("\n== the XML, against ISTD's own guide");
// EVERY ASSERTION HERE IS ONE THE FIRST DRAFT GOT WRONG. They were written from
// general UBL knowledge and a third-party tutorial, and all eight looked right
// to somebody who knows UBL and did not know JORDAN'S UBL. The guide
// (الدليل التقني للربط مع نظام الفوترة الوطني, istd.gov.jo) is the source.
const X = await import("@/modules/finance/ublXml");
const seller = { typeCode: "011", incomeSource: "99123456" };
const xml = X.ublInvoiceXml(
  doc({ lines: [{ description: "Widget", qty: 2, unitPrice: 50 }] }),
  seller,
);

ok("ProfileID is first and says reporting:1.0",
  xml.includes("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>"), xml.slice(0, 120));
ok("the invoice type element is 388 with Jordan's code as its name",
  xml.includes('<cbc:InvoiceTypeCode name="011">388</cbc:InvoiceTypeCode>'));
ok("amounts carry currencyID=\"JO\", which is the guide's and not ISO 4217",
  xml.includes('currencyID="JO"') && !xml.includes('currencyID="JOD"'));
ok("the document currency element is still JOD",
  xml.includes("<cbc:DocumentCurrencyCode>JOD</cbc:DocumentCurrencyCode>")
  && xml.includes("<cbc:TaxCurrencyCode>JOD</cbc:TaxCurrencyCode>"));
ok("a line carries TaxTotal with a RoundingAmount, not ClassifiedTaxCategory",
  xml.includes("<cbc:RoundingAmount") && !xml.includes("ClassifiedTaxCategory"));
ok("a tax category id carries its UN/ECE scheme attributes",
  xml.includes('<cbc:ID schemeAgencyID="6" schemeID="UN/ECE 5305">S</cbc:ID>')
  && xml.includes('<cbc:ID schemeAgencyID="6" schemeID="UN/ECE 5153">VAT</cbc:ID>'));
ok("a line's discount is an AllowanceCharge inside Price, reason DISCOUNT",
  /<cac:Price>.*<cac:AllowanceCharge>.*<cbc:AllowanceChargeReason>DISCOUNT<\/cbc:AllowanceChargeReason>/.test(xml));
ok("the income source sequence rides in SellerSupplierParty",
  xml.includes("<cac:SellerSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID>99123456</cbc:ID>"));
// FOUND 25/09/2026, beside Saudi Arabia's serialiser: both of these lacked the
// "-2", which puts every cac: and cbc: element in no schema at all.
ok("the cac and cbc namespaces are UBL 2.1's, ending in -2",
  xml.includes('xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"')
  && xml.includes('xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"'));
ok("payment means is present with its UN/ECE list",
  xml.includes('<cbc:PaymentMeansCode listID="UN/ECE 4461">10</cbc:PaymentMeansCode>'));

console.log("\n== the things that corrupt a document quietly");
const nasty = X.ublInvoiceXml(
  doc({ clientName: 'Smith & Co <"O\'Brien">', lines: [{ description: "A & B", qty: 1, unitPrice: 1 }] }),
  seller,
);
ok("an ampersand in a customer's name is escaped, not passed through",
  nasty.includes("Smith &amp; Co") && !/Smith & Co/.test(nasty));
ok("angle brackets and quotes too",
  nasty.includes("&lt;") && nasty.includes("&quot;") && nasty.includes("&apos;"));
// A FIXED WIDTH MATTERS to anything that hashes or signs: 18.6 and 18.600 are
// the same number and two different documents.
ok("amounts are written to the dinar's three decimals",
  /<cbc:PayableAmount currencyID="JO">\d+\.\d{3}<\/cbc:PayableAmount>/.test(nasty),
  (nasty.match(/<cbc:PayableAmount[^<]*<\/cbc:PayableAmount>/) || [""])[0]);
ok("and quantities likewise", /<cbc:InvoicedQuantity unitCode="PCE">\d+\.\d{3}</.test(nasty));
ok("the document is one line, because whitespace is significant to a signature",
  !xml.includes("\n"), String(xml.split("\n").length));

console.log("\n== the file is prepared from the studio's official values, and nothing is sent");
// NO CREDENTIALS, the owner's rule of 26/09/2026: the adapter prepares the
// file the studio submits through JoFotara itself. What it needs from the
// studio are three OFFICIAL VALUES — the tax number, the income source
// sequence and the invoice code — because all three are printed inside the
// document. (They were fields of a credentials panel until that day, beside a
// Client-Id and a Secret-Key that are gone.)
const A = await import("@/modules/finance/jofotara");
const joStudio = (values) => ({
  name: "Sandbox Trading", country: "Jordan",
  officialValues: { tax_number: "12345678", jofotara_income_source: "99123456", jofotara_invoice_type: "021", ...values },
});
const invoice = { id: "inv-1", reference: "INV-0001", issueDate: "2026-09-22", clientName: "A Customer", currency: "JOD", vatRate: 16,
  lines: [{ description: "Widget", qty: 2, unitPrice: 50 }] };
const prepared = await A.jofotaraAdapter.prepare({ invoice, studio: joStudio({}) });
ok("A COMPLETE STUDIO GETS ITS FILE", Boolean(prepared.xml) && prepared.filename === "INV-0001-jofotara.xml", j(prepared.problem || prepared.filename));
ok("carrying the invoice code and the income source sequence from Official values",
  prepared.xml?.includes('<cbc:InvoiceTypeCode name="021">388</cbc:InvoiceTypeCode>')
  && prepared.xml?.includes("<cac:SellerSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID>99123456</cbc:ID>"));
ok("NO QR — JoFotara issues it, and the studio pastes it back when it records the answer", !prepared.qr);
ok("a studio without its income source sequence is told which value to set",
  (await A.jofotaraAdapter.prepare({ invoice, studio: joStudio({ jofotara_income_source: "" }) })).problem === "income-source");
ok("an invoice code JoFotara does not recognise is refused by name",
  (await A.jofotaraAdapter.prepare({ invoice, studio: joStudio({ jofotara_invoice_type: "999" }) })).problem === "invoice-code");
ok("and one without its tax number, likewise",
  (await A.jofotaraAdapter.prepare({ invoice, studio: joStudio({ tax_number: "" }) })).problem === "supplier-tin");

console.log(fails ? `\njofotara model: ${fails} FAILURES\n` : "\njofotara model: all passed\n");
process.exitCode = fails ? 1 : 0;
