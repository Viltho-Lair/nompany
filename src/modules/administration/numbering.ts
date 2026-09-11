// WHAT A STUDIO'S DOCUMENTS ARE CALLED — INV-0007, or SI-0007, or FAT-2026-7.
//
// NINETEEN CALL SITES MINT A REFERENCE AND EVERY PREFIX WAS HARD-CODED. A
// studio whose invoices have always been "SI" got "INV", and there was no
// screen, no setting and no way round it — the numbering series every ERP buyer
// asks about first was a string literal in nineteen files.
//
// ALL NINETEEN GO THROUGH `nextReference`, which is what makes this one change
// rather than nineteen. This file holds the catalogue of series and the rules
// for a valid one; `nextReference` resolves a studio's override; the studio
// record stores it beside `currency` and the approval chains, for the reason
// `platform/approval/store` gives at length: a numbering policy is the
// company's, not a department's, and one right over it beats one per module.
//
// PURE. No imports, no store, no clock — so the screen refuses exactly what the
// server refuses, and the rules can be asserted without a database.

/** A series a studio may rename, and what it is called out of the box. */
export type Series = {
  key: string;
  /** The built-in prefix. What a studio gets until it says otherwise. */
  prefix: string;
  /** Which section's screen the documents live on, for grouping the editor. */
  group: string;
  label: string;
  /**
   * WHETHER THIS SERIES CARRIES A PAYMENT TERM IN DAYS — "a date of expiry is
   * issued for each type in days", the owner's words. Only a document the
   * studio SENDS and expects to be paid on has one: an invoice. A bill's due
   * date is the supplier's to set, so it has none.
   */
  hasDueDays?: boolean;
};

// THE CATALOGUE, and it is deliberately NOT every reference the product mints.
//
// A series is here when a studio would recognise the document and might have
// its own name for it. `nextUniqueRef`'s two callers are excluded on purpose —
// a sales ticket cannot be deleted and a quotation's number is reused by
// `convertRfq` — and renaming a series whose numbers are reused elsewhere is a
// change with consequences this screen cannot explain.
//
// A key is STABLE and a prefix is not: the key is what a studio's override is
// stored under, so renaming INV to SI must not orphan the setting.
//
// EVERY DEFAULT HERE IS COPIED FROM THE CALL SITE THAT MINTS IT, not chosen.
// The first draft of this list guessed "RFQ" and "SR" where the product
// actually mints SRQ and DSR — which would have RENAMED those documents for
// every studio on deploy, silently, because a studio that has set nothing falls
// back to whatever is written here. `tests/numbering-model.mjs` cannot catch
// that (it has no call sites to compare against); reading the nineteen call
// sites is what caught it, and is what to do again when a series is added.
export const SERIES: readonly Series[] = Object.freeze([
  { key: "invoice", prefix: "INV", group: "Finance & Accounting", label: "Invoices", hasDueDays: true },
  { key: "creditNote", prefix: "CN", group: "Finance & Accounting", label: "Credit notes" },
  { key: "bill", prefix: "BILL", group: "Finance & Accounting", label: "Bills" },
  { key: "expense", prefix: "EXP", group: "Finance & Accounting", label: "Expenses" },
  { key: "journal", prefix: "JE", group: "Finance & Accounting", label: "Journal entries" },
  { key: "asset", prefix: "FA", group: "Finance & Accounting", label: "Fixed assets" },
  { key: "project", prefix: "PRJ", group: "Projects", label: "Projects" },
  { key: "siteReport", prefix: "DSR", group: "Projects", label: "Daily site reports" },
  { key: "tender", prefix: "TND", group: "Tendering & Estimating", label: "Tenders" },
  { key: "order", prefix: "SO", group: "CRM & Sales", label: "Sales orders" },
  { key: "requisition", prefix: "PR", group: "Procurement & Subcontracting", label: "Purchase requisitions" },
  { key: "rfq", prefix: "SRQ", group: "Procurement & Subcontracting", label: "Requests for quotation" },
  { key: "subcontract", prefix: "SC", group: "Procurement & Subcontracting", label: "Subcontracts" },
  { key: "purchaseOrder", prefix: "PO", group: "Inventory & Warehouse", label: "Purchase orders" },
  { key: "goodsReceipt", prefix: "GRN", group: "Inventory & Warehouse", label: "Goods received notes" },
  { key: "deliveryNote", prefix: "DN", group: "Inventory & Warehouse", label: "Delivery notes" },
  { key: "permit", prefix: "PMT", group: "Field Operations & Service", label: "Permits" },
  { key: "workRequest", prefix: "WR", group: "Maintenance", label: "Work requests" },
  { key: "workOrder", prefix: "WO", group: "Maintenance", label: "Work orders" },
  { key: "pmPlan", prefix: "PM", group: "Maintenance", label: "Preventive plans" },
]);

/** `dueDays` is 0 — no default due date — unless the series declares `hasDueDays`. */
export type SeriesSetting = { prefix: string; pad: number; startAt: number; dueDays: number };

export const DEFAULT_PAD = 4;
export const DEFAULT_START = 1;
/** A year. A payment term longer than that is not a term. */
export const MAX_DUE_DAYS = 365;

const byKey = new Map(SERIES.map((s) => [s.key, s]));
export const isSeriesKey = (v: unknown): boolean => byKey.has(String(v ?? ""));

// A PREFIX IS UPPER-CASE LETTERS AND DIGITS, 2 to 8 of them, starting with a
// letter. No hyphen: `nextReference` joins prefix and number with one, so a
// prefix containing another would make `INV-2-0007` parse as prefix "INV" and
// number NaN — and `highestIssued` would then read every existing reference as
// nought and reissue from the start. That is invariant 10 broken by a
// punctuation mark.
const PREFIX_RE = /^[A-Z][A-Z0-9]{1,7}$/;

export const cleanPrefix = (v: unknown): string =>
  String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

/**
 * WHAT IS WRONG WITH THIS SETTING, or an empty list.
 *
 * Returns REASONS rather than throwing, so the screen can show them all at once
 * — the shape `chainProblems`, `industryProblems` and `archetypeProblems` use.
 */
export function numberingProblems(settings: unknown): string[] {
  const problems: string[] = [];
  const bag = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;

  // TWO SERIES MAY NOT SHARE A PREFIX. They would share a counter — which is
  // safe, since `bumpCounter` is keyed on the prefix, so no number is ever
  // reissued — and it would interleave two documents' numbering so that a
  // studio's invoices read INV-1, INV-3, INV-7. Refused for the same reason
  // Technical refuses a duplicate sequence prefix: the numbers would be
  // correct and nobody could use them.
  const seen = new Map<string, string>();

  for (const [key, raw] of Object.entries(bag)) {
    if (!isSeriesKey(key)) { problems.push(`unknown series: ${key}`); continue; }
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

    const prefix = cleanPrefix(s.prefix);
    if (!prefix) { problems.push(`${key}: a prefix is required`); continue; }
    if (!PREFIX_RE.test(prefix)) {
      problems.push(`${key}: "${prefix}" must be 2-8 letters or digits and start with a letter`);
      continue;
    }
    const clash = seen.get(prefix);
    if (clash) problems.push(`${key}: "${prefix}" is already used by ${clash}`);
    else seen.set(prefix, key);

    // PAD IS 2 TO 8. Below two a reference is not padded at all; above eight it
    // is longer than anything a person reads aloud. It is NOT allowed to shrink
    // silently below what is already issued — but that is not checkable here,
    // because this is pure and the issued rows are not in hand. `nextReference`
    // pads to AT LEAST the stored width and never truncates, which is where
    // that is actually enforced.
    if (s.pad !== undefined) {
      const pad = Number(s.pad);
      if (!Number.isInteger(pad) || pad < 2 || pad > 8) problems.push(`${key}: padding must be between 2 and 8`);
    }
    if (s.startAt !== undefined) {
      const startAt = Number(s.startAt);
      if (!Number.isInteger(startAt) || startAt < 1 || startAt > 1_000_000) {
        problems.push(`${key}: the first number must be between 1 and 1000000`);
      }
    }
    if (s.dueDays !== undefined && Number(s.dueDays) !== 0) {
      const dueDays = Number(s.dueDays);
      // REFUSED ON A SERIES THAT HAS NO TERM rather than silently dropped: a
      // studio that typed "30" against its bills meant something, and the
      // supplier sets a bill's due date, not the studio.
      if (!byKey.get(key)?.hasDueDays) problems.push(`${key}: this document has no payment term`);
      else if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > MAX_DUE_DAYS) {
        problems.push(`${key}: days to pay must be between 0 and ${MAX_DUE_DAYS}`);
      }
    }
  }
  return problems;
}

/** Everything a studio stored, cleaned. Unknown keys and bad values are dropped. */
export function cleanNumbering(settings: unknown): Record<string, SeriesSetting> {
  const bag = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  const out: Record<string, SeriesSetting> = {};
  for (const [key, raw] of Object.entries(bag)) {
    if (!isSeriesKey(key)) continue;
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const prefix = cleanPrefix(s.prefix);
    if (!PREFIX_RE.test(prefix)) continue;
    const pad = Number(s.pad);
    const startAt = Number(s.startAt);
    const dueDays = Number(s.dueDays);
    out[key] = {
      prefix,
      pad: Number.isInteger(pad) && pad >= 2 && pad <= 8 ? pad : DEFAULT_PAD,
      startAt: Number.isInteger(startAt) && startAt >= 1 ? startAt : DEFAULT_START,
      dueDays: byKey.get(key)?.hasDueDays && Number.isInteger(dueDays) && dueDays > 0
        ? Math.min(dueDays, MAX_DUE_DAYS) : 0,
    };
  }
  return out;
}

/**
 * THE SETTING IN FORCE for one series — the studio's, or the built-in default.
 *
 * @param stored - whatever the studio record carries, unvalidated
 */
export function seriesSetting(key: string, stored: unknown): SeriesSetting {
  const declared = byKey.get(key);
  const fallback: SeriesSetting = {
    prefix: declared?.prefix || "REF",
    pad: DEFAULT_PAD,
    startAt: DEFAULT_START,
    dueDays: 0,
  };
  if (!declared) return fallback;
  const clean = cleanNumbering(stored);
  return clean[key] || fallback;
}

/** Every series with the setting in force, for the editor. */
export function numberingView(stored: unknown): (Series & SeriesSetting & { custom: boolean })[] {
  const clean = cleanNumbering(stored);
  return SERIES.map((s) => ({
    ...s,
    ...seriesSetting(s.key, stored),
    // WHETHER THIS IS THE STUDIO'S OWN CHOICE or the shipped default, so the
    // screen can say "default" rather than presenting fourteen identical rows
    // as though somebody had set them all.
    custom: Boolean(clean[s.key]),
  }));
}
