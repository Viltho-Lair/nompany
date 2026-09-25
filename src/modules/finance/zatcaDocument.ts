// WHAT A SAUDI STUDIO SUBMITS TO ZATCA — the document, composed and nothing else.
// (Nompany prepares it; the studio submits it — the owner's rule, 26/09/2026.)
//
// PURE, AND SEPARATE FROM THE XML AND THE STORE, for the reason
// `./jofotaraDocument` gives: an invoice becoming a tax document is arithmetic
// and mapping, it has one right answer, and it is the half that goes wrong in
// ways nobody notices — ZATCA answers a bad figure with a rule number, not with
// "your zero-rated line was taxed". `./zatcaXml` writes it, `./zatcaQr` builds
// its QR, `./zatca` joins it to the studio's chain.
//
// WHY THIS IS NOT JORDAN'S COMPOSER WITH A DIFFERENT COUNTRY CODE. Both are UBL
// 2.1, and the two differ exactly where a validator looks:
//
//  - TAX IS TAKEN ONCE PER CATEGORY ON THE TOTAL, not summed from rounded lines.
//    ZATCA's XML standard says so outright ("rounded on document level and not
//    as a summation of rounded Invoice line VAT amounts") and SA.json declares
//    `method: "document"`. So the subtotals come from `documentTotals` — the
//    same function every Saudi quotation and invoice in this product is
//    already totalled with — and a document ZATCA receives adds up to the
//    figure the customer was given, by construction rather than by agreement.
//  - A Saudi invoice carries a COUNTER and the PREVIOUS INVOICE'S HASH (ICV and
//    PIH). They are facts about the studio's chain, not the invoice, so the
//    caller hands them in and this file stays pure.
//  - The seller's address is the NATIONAL ADDRESS, in parts — building number,
//    street, district, city, postal code — which the country's official values
//    already ask a Saudi studio for.
//
// SIMPLIFIED ONLY, FOR NOW. A simplified tax invoice (B2C, `0200000`) is
// REPORTED; a standard one (B2B, `0100000`) is CLEARED and must name the buyer's
// VAT number and national address, which an invoice in this product does not
// record. `buyer` is accepted so the day a client carries them nothing here
// changes shape — and `zatcaProblem` refuses a standard invoice without them
// rather than preparing one ZATCA will reject.

import { documentTotals } from "@/shared/documentTotals";
import { roundMoney } from "@/shared/money";
import { cleanTaxCategory, categoryRate } from "@/shared/taxProfile";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/**
 * THE FIRST INVOICE'S "PREVIOUS HASH". ZATCA's security standard seeds the
 * chain with the SHA-256 of the character "0" — as its HEX TEXT, base64'd,
 * which is not how every later link is written (those are base64 of the raw
 * digest). It looks like a mistake and is the standard's own value; a chain
 * seeded any other way is refused on its first link.
 */
export const ZATCA_FIRST_PIH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

/** UBL's document kinds as ZATCA uses them. */
export const ZATCA_DOCUMENT_TYPES = { invoice: "388", debitNote: "383", creditNote: "381" } as const;
export type ZatcaDocumentKind = keyof typeof ZATCA_DOCUMENT_TYPES;

/**
 * THE `name` ATTRIBUTE ON cbc:InvoiceTypeCode — seven positions, NNPNESB: the
 * first two say standard ("01") or simplified ("02"), and the five flags after
 * them (third party, nominal, export, summary, self-billed) are all "0" for an
 * ordinary sale. Nothing in this product issues the flagged kinds.
 */
export const ZATCA_SUBTYPES = { standard: "0100000", simplified: "0200000" } as const;
export type ZatcaSubtype = keyof typeof ZATCA_SUBTYPES;

/** The national address, as the official values hold it. */
export type ZatcaAddress = {
  street: string;
  building: string;
  /** The four-digit additional number — `cbc:PlotIdentification`. Optional. */
  additional: string;
  district: string;
  city: string;
  postal: string;
};

export type ZatcaSeller = {
  /** The registered name, as it must appear — `cbc:RegistrationName`. */
  name: string;
  /** Fifteen digits, first and last 3. */
  vatNumber: string;
  /** The commercial registration number — `cbc:ID schemeID="CRN"`. */
  crn: string;
  address: ZatcaAddress;
};

export type ZatcaBuyer = {
  name: string;
  vatNumber?: string;
  address?: Partial<ZatcaAddress>;
};

export type ZatcaCategory = "S" | "Z" | "E";

export type ZatcaLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineExtensionAmount: number;
  category: ZatcaCategory;
  percent: number;
  /** This line's own tax, shown on the line; the DOCUMENT's tax is per category (see the header). */
  taxAmount: number;
};

export type ZatcaSubtotal = {
  category: ZatcaCategory;
  percent: number;
  taxableAmount: number;
  taxAmount: number;
  /** ZATCA's VATEX code and its words — required on a Z or E subtotal, absent on S. */
  exemptionCode?: string;
  exemptionReason?: string;
};

export type ZatcaDocument = {
  id: string;
  uuid: string;
  issueDate: string;
  /** HH:mm:ss. Required by ZATCA on every document; it also goes into the QR. */
  issueTime: string;
  typeCode: (typeof ZATCA_DOCUMENT_TYPES)[ZatcaDocumentKind];
  subtype: (typeof ZATCA_SUBTYPES)[ZatcaSubtype];
  currency: string;
  /** ICV — how many documents this studio's chain has issued, this one included. */
  counter: number;
  /** PIH — the previous document's hash, or ZATCA_FIRST_PIH. */
  previousHash: string;
  /** A credit or debit note's original, and why it was raised (BR-KSA-17, -56). */
  billingReference?: string;
  reason?: string;
  seller: ZatcaSeller;
  buyer: ZatcaBuyer | null;
  /** UN/ECE 4461. 10 is cash; 30 credit transfer; 42 bank account; 48 card. */
  paymentMeansCode: string;
  lines: ZatcaLine[];
  subtotals: ZatcaSubtotal[];
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  taxAmount: number;
  taxInclusiveAmount: number;
  payableAmount: number;
};

/**
 * WHY A ZERO-RATED OR EXEMPT SUPPLY IS ZERO-RATED OR EXEMPT — a code ZATCA
 * requires on every Z and E subtotal (BR-KSA-69). It is a fact about the SUPPLY
 * (an export, a qualifying medicine, a financial service), and a line in this
 * product records only that it is zero or exempt, never why. So the caller
 * says, and nothing here guesses: a wrong code is a false statement to a tax
 * authority, where a missing one is merely a refusal.
 */
export type ZatcaExemptions = Partial<Record<"Z" | "E", { code: string; reason: string }>>;

const categoryOf = (taxCategory: unknown): ZatcaCategory => {
  const c = cleanTaxCategory(taxCategory);
  return c === "zero" ? "Z" : c === "exempt" ? "E" : "S";
};
const FROM_CATEGORY: Record<string, ZatcaCategory> = { standard: "S", zero: "Z", exempt: "E" };

/**
 * THE INVOICE AS ZATCA'S DOCUMENT.
 *
 * THE FIGURES COME FROM `documentTotals` WITH THE DOCUMENT METHOD, which is
 * what a Saudi invoice was totalled with when it was raised — so the payable
 * amount ZATCA receives is the total the customer was shown. A line's own
 * `taxAmount` is ALSO rounded on its own, because ZATCA wants it on the line;
 * the two can differ by a halala on a long invoice, and that difference is the
 * rule, not an error — only the per-category figure is the tax.
 */
export function zatcaDocument(input: {
  invoice: {
    reference?: unknown;
    issueDate?: unknown;
    clientName?: unknown;
    currency?: unknown;
    vatRate?: unknown;
    lines?: unknown;
  };
  seller: ZatcaSeller;
  buyer?: ZatcaBuyer | null;
  uuid: string;
  issueTime: string;
  counter: number;
  previousHash: string;
  kind?: ZatcaDocumentKind;
  subtype?: ZatcaSubtype;
  billingReference?: string;
  reason?: string;
  exemptions?: ZatcaExemptions;
  paymentMeansCode?: string;
}): ZatcaDocument {
  const { invoice } = input;
  const currency = str(invoice.currency, 3).toUpperCase() || "SAR";
  const rawLines = (Array.isArray(invoice.lines) ? invoice.lines : []) as Record<string, unknown>[];

  const lines: ZatcaLine[] = rawLines.map((raw, i) => {
    const l = raw || {};
    const percent = categoryRate(l.taxCategory, invoice.vatRate);
    const quantity = num(l.qty);
    const unitPrice = num(l.unitPrice);
    const net = roundMoney(quantity * unitPrice, currency);
    return {
      id: String(i + 1),
      name: str(l.description),
      quantity,
      unitPrice,
      lineExtensionAmount: net,
      category: categoryOf(l.taxCategory),
      percent,
      taxAmount: roundMoney((net * percent) / 100, currency),
    };
  });

  // THE DOCUMENT'S TAX, per category, the way the invoice itself was totalled.
  const totals = documentTotals({ lines: rawLines, vatRate: invoice.vatRate, currency, method: "document" });
  const subtotals: ZatcaSubtotal[] = totals.breakdown.map((b) => {
    const category = FROM_CATEGORY[b.category] || "S";
    const why = category === "S" ? undefined : input.exemptions?.[category];
    return {
      category,
      percent: b.rate,
      taxableAmount: b.taxable,
      taxAmount: b.tax,
      ...(why ? { exemptionCode: str(why.code, 40), exemptionReason: str(why.reason, 300) } : {}),
    };
  });

  const buyer = input.buyer === undefined
    ? (str(invoice.clientName, 160) ? { name: str(invoice.clientName, 160) } : null)
    : input.buyer;

  return {
    id: str(invoice.reference, 60),
    uuid: input.uuid,
    issueDate: str(invoice.issueDate, 10).slice(0, 10),
    issueTime: input.issueTime,
    typeCode: ZATCA_DOCUMENT_TYPES[input.kind || "invoice"],
    subtype: ZATCA_SUBTYPES[input.subtype || "simplified"],
    currency,
    counter: input.counter,
    previousHash: input.previousHash,
    ...(input.billingReference ? { billingReference: str(input.billingReference, 60) } : {}),
    ...(input.reason ? { reason: str(input.reason, 300) } : {}),
    seller: input.seller,
    buyer,
    paymentMeansCode: input.paymentMeansCode || "10",
    lines,
    subtotals,
    lineExtensionAmount: totals.subtotal,
    taxExclusiveAmount: totals.subtotal,
    taxAmount: totals.vat,
    taxInclusiveAmount: totals.total,
    payableAmount: totals.total,
  };
}

/** Fifteen digits, beginning and ending with 3 (BR-KSA-39). */
export const isSaudiVatNumber = (v: unknown): boolean => /^3\d{13}3$/.test(String(v ?? ""));

/**
 * WHY THIS DOCUMENT CANNOT BE PREPARED, or "". Asked before the file is made,
 * because every one of these is something the studio fixes in its own settings,
 * and ZATCA would name each as a rule number the studio cannot read.
 */
export function zatcaProblem(doc: ZatcaDocument): string {
  const s = doc.seller;
  if (!s.name) return "seller-name";
  if (!isSaudiVatNumber(s.vatNumber)) return "seller-vat";
  if (!s.crn) return "seller-crn";
  // THE NATIONAL ADDRESS IS REQUIRED IN PARTS (BR-KSA-09): a four-digit
  // building number and a five-digit postal code are checked by shape.
  if (!s.address.street || !s.address.district || !s.address.city) return "seller-address";
  if (!/^\d{4}$/.test(s.address.building)) return "seller-building";
  if (!/^\d{5}$/.test(s.address.postal)) return "seller-postal";
  if (!doc.id) return "reference";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate)) return "issue-date";
  if (!/^\d{2}:\d{2}:\d{2}$/.test(doc.issueTime)) return "issue-time";
  if (!doc.lines.length) return "lines";
  if (doc.currency !== "SAR") return "currency";
  if (!(doc.counter >= 1)) return "counter";
  if (!doc.previousHash) return "previous-hash";
  // A NOTE MUST SAY WHAT IT CORRECTS AND WHY (BR-KSA-17, BR-KSA-56).
  if (doc.typeCode !== "388" && (!doc.billingReference || !doc.reason)) return "note-reference";
  if (doc.subtotals.some((t) => t.category !== "S" && !t.exemptionCode)) return "exemption-reason";
  // A STANDARD INVOICE NAMES ITS BUYER'S REGISTRATION — see the header.
  if (doc.subtype === ZATCA_SUBTYPES.standard) {
    const b = doc.buyer;
    if (!b?.name || !isSaudiVatNumber(b.vatNumber) || !b.address?.street || !b.address?.city) return "buyer-details";
  }
  return "";
}
