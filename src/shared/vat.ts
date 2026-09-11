// VAT, PURELY — the studio's rate, the rate a document gets, and the return.
//
// THE OWNER'S RULE (11/09/2026), which replaced "study tax codes first": a studio
// sets ONE VAT rate in Studio settings. If it fills it in, its documents carry
// that tax and Finance shows a tax return; if it leaves it empty, NO tax is
// registered anywhere — a document cannot carry VAT the company never said it
// charges, and there is no return to file.
//
// SHARED rather than Finance's because quotations (Technical), sales orders
// (Sales), invoices and bills (Finance) and the screens that price them all have
// to give the same three answers. No imports, no store, no clock.

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** The studio's VAT rate, or null when it charges none. Zero is "none". */
export function studioVatRate(studio: unknown): number | null {
  const n = Number((studio as { vatRate?: unknown } | null | undefined)?.vatRate);
  return Number.isFinite(n) && n > 0 && n <= 100 ? round(n) : null;
}

/**
 * WHAT A STUDIO MAY STORE AS ITS RATE: above nought and at most 100, or blank
 * for "not registered" (nought means the same). Anything else is REFUSED rather
 * than coerced — "15%" quietly becoming 0 would switch a studio's tax off.
 */
export function cleanVatSetting(v: unknown): { value: number | "" } | { error: "vatRate" } {
  const s = String(v ?? "").trim();
  if (!s) return { value: "" };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) return { error: "vatRate" };
  return { value: n === 0 ? "" : round(n) };
}

/**
 * THE RATE A DOCUMENT GETS. With no studio rate it is 0, whatever was asked
 * for. With one: what the document asked for — a zero-rated export is a real 0,
 * so an explicit nought is kept — else the fallback (a revision carries its
 * previous rate), else the studio's.
 */
export function documentVatRate(studio: unknown, requested?: unknown, fallback?: unknown): number {
  const rate = studioVatRate(studio);
  if (rate === null) return 0;
  const pick = (v: unknown) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, round(n))) : null;
  };
  return pick(requested) ?? pick(fallback) ?? rate;
}

/**
 * A GROSS AMOUNT SPLIT INTO NET AND TAX at a rate, in whole cents. The net is
 * derived by subtraction so the two always add up to the gross — deriving both
 * independently is how a rounded pair ends up a cent short. One copy: the
 * ledger's credit-note posting and the tax return must give back the same tax.
 */
export function splitGross(gross: unknown, rate: unknown) {
  const g = round(Number(gross));
  const r = Number(rate) || 0;
  const vat = round((g * r) / (100 + r));
  return { net: round(g - vat), vat };
}

export type TaxRow = {
  /** A sale raises output tax, a credit note gives some back, a purchase is input tax. */
  kind: "sale" | "credit" | "purchase";
  id: string;
  reference: string;
  /** yyyy-mm-dd — the document's own date, which is the tax point. */
  date: string;
  currency: string;
  net: number;
  vat: number;
};

type Bucket = { net: number; vat: number; count: number };

/** The calendar month before `today` (yyyy-mm-dd) — the period a return is usually for. */
export function previousMonth(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/**
 * THE RETURN FOR A PERIOD: VAT charged on sales, less what credit notes gave
 * back, less VAT paid on purchases. Positive is owed to the authority; negative
 * is reclaimable.
 *
 * FROM THE DOCUMENTS, NOT THE LEDGER. Input and output tax post to one account
 * (2100), so the journal can say what is owed and cannot say how much of it was
 * charged and how much reclaimed — which is the whole of what a return asks.
 *
 * A DOCUMENT IN ANOTHER CURRENCY IS SET ASIDE, NOT CONVERTED. A return is filed
 * in the studio's currency at the rate the authority prescribes for the date,
 * which this product does not know; converting at the day's market rate would
 * print a figure that looks filed and is not. Those documents are listed beside
 * the return so nobody mistakes them for included.
 */
export function taxReturn(rows: readonly TaxRow[], opts: { from?: string; to?: string; currency?: string }) {
  const from = opts.from || "";
  const to = opts.to || "";
  const base = String(opts.currency || "").toUpperCase();
  const inPeriod = rows.filter((r) => r.date && (!from || r.date >= from) && (!to || r.date <= to));

  const home: TaxRow[] = [];
  const foreign: TaxRow[] = [];
  for (const r of inPeriod) {
    const c = String(r.currency || "").toUpperCase();
    // A document with no currency predates the frozen one and is the studio's own.
    (c && base && c !== base ? foreign : home).push(r);
  }
  const byDate = (a: TaxRow, b: TaxRow) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference);

  const sum = (kind: TaxRow["kind"]): Bucket => home
    .filter((r) => r.kind === kind)
    .reduce((b, r) => ({ net: round(b.net + r.net), vat: round(b.vat + r.vat), count: b.count + 1 }),
      { net: 0, vat: 0, count: 0 });
  const output = sum("sale");
  const credits = sum("credit");
  const input = sum("purchase");

  return {
    from, to, currency: base,
    output, credits, input,
    payable: round(output.vat - credits.vat - input.vat),
    rows: home.sort(byDate),
    // LISTED, NOT SUMMED: each has to be converted at its own date's rate.
    foreign: foreign.sort(byDate),
  };
}
