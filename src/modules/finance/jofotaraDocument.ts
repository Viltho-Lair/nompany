// WHAT JORDAN'S TAX AUTHORITY IS SENT — the document, composed and nothing else.
//
// PURE, AND SEPARATE FROM THE SENDING ON PURPOSE. An invoice becoming a UBL
// document is arithmetic and mapping: it has one right answer, it is the part
// that will be wrong in ways nobody notices, and it can be asserted without a
// network, a credential or a studio. `./jofotara` does the sending; everything
// that decides WHAT is sent is here.
//
// UBL 2.1, WHICH IS THE STANDARD BOTH JORDAN AND SAUDI ARABIA BUILD ON. The
// names below (`cbc:`, `cac:`) are OASIS UBL's own, so this mapping is the
// reusable half — a ZATCA adapter maps the same invoice onto the same names and
// differs in the envelope, the signature and the transport.
//
// WHAT IS DELIBERATELY NOT DECIDED HERE: the ENVELOPE JoFotara expects around
// this document. `docs/functionality/einvoicing.md` records that as the one
// thing that waits on the authority's own documentation, and guessing it would
// produce a submission that looks right and is refused.

import { splitGross } from "@/shared/vat";
import { roundMoney, roundSum } from "@/shared/money";
import { categoryRate } from "@/shared/taxProfile";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** JoFotara's own codes for what kind of sale this is. */
export const JO_INVOICE_TYPES = ["income", "general-sales", "special-sales"] as const;
export type JoInvoiceType = (typeof JO_INVOICE_TYPES)[number];

/** A party on the document — the studio, or the customer. */
export type UblParty = {
  name: string;
  /** The taxpayer identification number. Empty for a walk-in customer, which is allowed. */
  taxNumber: string;
  countryCode: string;
};

export type UblLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** quantity × unitPrice, before tax. */
  lineExtensionAmount: number;
  taxCategoryCode: "S" | "Z" | "E";
  taxPercent: number;
  taxAmount: number;
  /** What this line took off, as a UBL allowance. Absent when there is none. */
  allowanceAmount?: number;
};

export type UblInvoice = {
  id: string;
  uuid: string;
  issueDate: string;
  invoiceTypeCode: string;
  documentCurrencyCode: string;
  supplier: UblParty;
  customer: UblParty;
  lines: UblLine[];
  /** The sum of the lines before tax and before any document-level allowance. */
  lineExtensionAmount: number;
  /** A discount on the whole document. Nought when there is none. */
  allowanceTotalAmount: number;
  /** What tax is charged ON — lines less allowances. */
  taxExclusiveAmount: number;
  /** What the customer owes. */
  taxInclusiveAmount: number;
  taxTotalAmount: number;
  /** One entry per rate, which is what a tax authority reconciles against. */
  taxSubtotals: { taxableAmount: number; taxAmount: number; percent: number; categoryCode: "S" | "Z" | "E" }[];
  payableAmount: number;
};

/**
 * JORDAN'S CODE FOR THE KIND OF SALE — the `name` ATTRIBUTE on
 * `cbc:InvoiceTypeCode`, whose element value is always 388 (see ./ublXml).
 *
 * THE FIRST DRAFT HAD THIS WRONG TWICE, from a third-party tutorial: it used
 * 011/012/013 and put them in the element. ISTD's own guide lists five PAIRS —
 * 011/021, 111/121, 311/321, 411/421, 511/521 — where the pair distinguishes
 * how the sale is settled (cash or receivable), and 388 is the element.
 *
 * **THE STUDIO SAYS WHICH.** It is a fact about their registration and their
 * settlement, not something derivable from an invoice, and guessing it is how a
 * submission is refused for a reason nobody on this end can read. The five
 * pairs are offered as they are; naming them here would be this file inventing
 * meanings the guide states in Arabic and I have not confirmed one by one.
 */
export const JO_TYPE_CODES = [
  "011", "021", "111", "121", "311", "321", "411", "421", "511", "521",
] as const;
export type JoTypeCode = (typeof JO_TYPE_CODES)[number];

export const isJoTypeCode = (v: unknown): v is JoTypeCode =>
  (JO_TYPE_CODES as readonly string[]).includes(String(v ?? ""));

/**
 * WHAT A LINE IS, FOR TAX. UBL's category codes, from the same `taxCategory`
 * the rest of this product reads — S standard, Z zero-rated, E exempt.
 */
function categoryCodeOf(taxCategory: unknown): "S" | "Z" | "E" {
  if (taxCategory === "zero") return "Z";
  if (taxCategory === "exempt") return "E";
  return "S";
}

/**
 * THE INVOICE AS UBL.
 *
 * TAX IS TAKEN PER LINE at that line's own rate, and the subtotals are grouped
 * by rate — not one figure at the document's headline rate. A basket of
 * standard and zero-rated goods is the ordinary case, and a single total would
 * declare tax on the zero-rated part.
 *
 * THE INVOICE'S OWN STORED FIGURES ARE NOT TRUSTED BLINDLY. `subtotal`, `vat`
 * and `total` are optional on the record and absent on everything raised before
 * they existed; recomputing from the lines is the only thing that answers for
 * every invoice. Where the record carries them and they disagree, the LINES
 * win — they are what the customer was itemised.
 */
export function jofotaraDocument(input: {
  invoice: {
    reference?: unknown;
    issueDate?: unknown;
    clientName?: unknown;
    clientTaxNumber?: unknown;
    currency?: unknown;
    vatRate?: unknown;
    lines?: unknown;
    id?: unknown;
  };
  supplier: UblParty;
  /** Kept for the tax treatment; the WIRE code is the seller's (see ./ublXml). */
  invoiceType: JoInvoiceType;
  /** True when the studio's prices already include tax (a till's do; an invoice's do not). */
  pricesIncludeTax?: boolean;
  /** A stable identifier for this submission. The caller mints it, so this stays pure. */
  uuid: string;
}): UblInvoice {
  const { invoice, supplier, invoiceType, uuid } = input;
  const currency = str(invoice.currency, 3).toUpperCase() || "JOD";
  const headlineRate = num(invoice.vatRate);
  const rawLines = Array.isArray(invoice.lines) ? invoice.lines : [];

  const lines: UblLine[] = rawLines.map((raw, i) => {
    const l = (raw || {}) as Record<string, unknown>;
    const categoryCode = categoryCodeOf(l.taxCategory);
    // A ZERO-RATED OR EXEMPT LINE IS TAXED AT NOUGHT whatever the document's
    // headline rate — the same rule `posTotals` and `documentTotals` follow.
    // ARGUMENT ORDER IS (category, rate) — both parameters are `unknown`, so
    // swapping them type-checks and silently taxes every zero-rated line at the
    // headline rate. Caught by the test below, never by the compiler.
    const percent = categoryRate(l.taxCategory, headlineRate);
    const quantity = num(l.qty);
    const unitPrice = num(l.unitPrice);
    const gross = roundMoney(quantity * unitPrice, currency);
    // Tax-inclusive prices are taken APART rather than added to: 11.50 at 15%
    // is 10.00 plus 1.50, never 11.50 plus 1.73.
    const { net, vat } = input.pricesIncludeTax
      ? splitGross(gross, percent, currency)
      : { net: gross, vat: roundMoney((gross * percent) / 100, currency) };
    return {
      id: String(i + 1),
      description: str(l.description),
      quantity,
      unitPrice: input.pricesIncludeTax ? roundMoney(net / (quantity || 1), currency) : unitPrice,
      lineExtensionAmount: net,
      taxCategoryCode: categoryCode,
      taxPercent: percent,
      taxAmount: vat,
    };
  });

  const lineExtensionAmount = roundSum(lines.reduce((s, l) => s + l.lineExtensionAmount, 0));
  const taxTotalAmount = roundSum(lines.reduce((s, l) => s + l.taxAmount, 0));

  // ONE SUBTOTAL PER RATE AND CATEGORY, which is what an authority reconciles
  // against. Ordered highest rate first so the document reads the same twice.
  const groups = new Map<string, { taxableAmount: number; taxAmount: number; percent: number; categoryCode: "S" | "Z" | "E" }>();
  for (const l of lines) {
    const key = `${l.taxCategoryCode}:${l.taxPercent}`;
    const g = groups.get(key) || { taxableAmount: 0, taxAmount: 0, percent: l.taxPercent, categoryCode: l.taxCategoryCode };
    g.taxableAmount = roundSum(g.taxableAmount + l.lineExtensionAmount);
    g.taxAmount = roundSum(g.taxAmount + l.taxAmount);
    groups.set(key, g);
  }
  const taxSubtotals = [...groups.values()].sort((a, b) => b.percent - a.percent || a.categoryCode.localeCompare(b.categoryCode));

  // NO DOCUMENT-LEVEL ALLOWANCE YET, and the field is here rather than absent
  // because it is where a discount will land: an invoice records none today
  // (`docs/functionality/einvoicing.md`), and a till receipt's discounts reach
  // UBL through this same field when receipts are submitted.
  const allowanceTotalAmount = 0;
  const taxExclusiveAmount = roundSum(lineExtensionAmount - allowanceTotalAmount);
  const taxInclusiveAmount = roundSum(taxExclusiveAmount + taxTotalAmount);

  return {
    id: str(invoice.reference, 60),
    uuid,
    issueDate: str(invoice.issueDate, 10).slice(0, 10),
    invoiceTypeCode: "388",
    documentCurrencyCode: currency,
    supplier,
    customer: {
      name: str(invoice.clientName, 160),
      // A CUSTOMER WITHOUT A TIN IS ORDINARY, not an error: a company sells to
      // people as well as to businesses, and the field is empty for them.
      taxNumber: str(invoice.clientTaxNumber, 20),
      countryCode: "JO",
    },
    lines,
    lineExtensionAmount,
    allowanceTotalAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    taxTotalAmount,
    taxSubtotals,
    payableAmount: taxInclusiveAmount,
  };
}

/**
 * WHY THIS DOCUMENT CANNOT BE SENT, or "". Asked BEFORE anything reaches the
 * authority, because a rejection from ISTD arrives as a code a studio cannot
 * act on, while these four are things they can fix in their own settings.
 */
export function jofotaraProblem(doc: UblInvoice): string {
  if (!doc.supplier.taxNumber) return "supplier-tin";
  if (!doc.id) return "reference";
  if (!doc.issueDate) return "issue-date";
  if (!doc.lines.length) return "lines";
  return "";
}
