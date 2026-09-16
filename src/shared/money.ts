// MONEY IS ROUNDED TO ITS CURRENCY'S OWN MINOR UNIT, and this is the one place
// that knows what that unit is.
//
// THE DEFECT THIS EXISTS FOR. Every module rounded money with its own private
// `Math.round(n * 100) / 100` — some sixty copies — which is right for a
// currency with cents and WRONG for one with fils or baisa. The Jordanian
// dinar, the Omani rial, the Bahraini dinar and the Kuwaiti dinar have THREE
// decimals, so a Jordanian studio's quotations, invoices and ledger were being
// rounded to a precision its own currency does not use: 1.235 JOD became 1.24,
// and a line priced in fils could not be written down at all.
//
// PURE, no imports, and shared, because the screens that price a document have
// to round exactly as the server that stores it does.

/**
 * ISO 4217 minor units that are NOT two. Everything absent here has two, which
 * is the answer for the great majority of the world's currencies.
 *
 * Deliberately a table rather than `Intl.NumberFormat(...).resolvedOptions()`:
 * ICU's CURRENCY data follows cash practice, not the standard — it answers 0
 * for the Iraqi dinar, which ISO 4217 gives three — and a rounding rule that
 * changes with the runtime's ICU version is not one a ledger can rely on.
 */
const MINOR_UNITS: Readonly<Record<string, number>> = {
  // three
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  // none
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0,
  RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  // four — units of account, not cash, but a studio could still name one
  CLF: 4, UYW: 4,
};

/** The number of decimals `code` is written to. Unknown or blank → 2. */
export function currencyDecimals(code: unknown): number {
  const c = String(code ?? "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(MINOR_UNITS, c) ? MINOR_UNITS[c] : 2;
}

/**
 * The decimals to round with, from whichever the caller holds: a currency CODE
 * (a string) or a decimals count already resolved (a number). Anything else is
 * the two a currency without an entry gets.
 */
export function decimalsOf(currencyOrDecimals: unknown): number {
  if (typeof currencyOrDecimals === "number" && Number.isInteger(currencyOrDecimals)
    && currencyOrDecimals >= 0 && currencyOrDecimals <= 4) return currencyOrDecimals;
  return currencyDecimals(currencyOrDecimals);
}

/**
 * `n` rounded half away from zero to the currency's minor unit. A non-number is
 * nought, never NaN — every caller this replaced coerced the same way.
 *
 * THE EPSILON IS THE POINT, not decoration: 1.005 is stored as 1.00499999…, and
 * rounding it without one gives 1.00 where a person writing it down gets 1.01.
 * Applied symmetrically, so −1.005 rounds to −1.01 exactly as 1.005 rounds up.
 */
export function roundMoney(n: unknown, currencyOrDecimals?: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** decimalsOf(currencyOrDecimals);
  const r = Math.round((Math.abs(v) + Number.EPSILON) * f) / f;
  return v < 0 ? -r : r;
}

/**
 * Money as a WHOLE NUMBER of minor units — cents, fils, baisa — so a balance
 * check compares integers and no float can make a balanced entry look
 * unbalanced. The ledger's `cents` was this with the unit fixed at a hundred.
 */
export function toMinor(n: unknown, currencyOrDecimals?: unknown): number {
  return Math.round(roundMoney(n, currencyOrDecimals) * 10 ** decimalsOf(currencyOrDecimals));
}

/** The inverse of `toMinor`. */
export function fromMinor(minor: unknown, currencyOrDecimals?: unknown): number {
  const m = Number(minor);
  if (!Number.isFinite(m)) return 0;
  return roundMoney(Math.round(m) / 10 ** decimalsOf(currencyOrDecimals), currencyOrDecimals);
}

/**
 * A SUM OF AMOUNTS THAT WERE ALREADY ROUNDED, cleaned of floating-point crumbs
 * and nothing else — 0.1 + 0.2 is 0.3 again.
 *
 * WHY FOUR PLACES AND NO CURRENCY. Adding numbers that each already carry at
 * most their currency's decimals cannot produce a new decimal, so the only
 * thing to remove is float noise, and four places is finer than every currency
 * a studio can hold (see MINOR_UNITS). Rounding such a sum to two places was
 * the bug: it cut the third decimal off a dinar total that was exact.
 *
 * NOT FOR AN AMOUNT BEING CREATED — a tax, a share, a conversion, a price times
 * a quantity. Those make new decimals and must use `roundMoney` with the
 * currency they are in.
 */
export function roundSum(n: unknown): number {
  return roundMoney(n, 4);
}

/**
 * AN AMOUNT AS A SCREEN SHOWS IT.
 *
 * With the currency known, exactly its decimals — 1.200 JOD, 1.20 SAR. Without
 * one, two to three places: every currency a studio realistically holds uses
 * two or three, so a value rounded to either shows as it was stored — never a
 * fils cut off, never a digit invented. The screens formatted everything to
 * two, which hid the third decimal of every dinar amount the server now keeps.
 */
export function moneyText(n: unknown, currency?: unknown, locale = "en"): string {
  const v = Number(n);
  const value = Number.isFinite(v) ? v : 0;
  const known = String(currency ?? "").trim() !== "";
  const d = known ? decimalsOf(currency) : 2;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: d,
    maximumFractionDigits: known ? d : 3,
  }).format(value);
}
