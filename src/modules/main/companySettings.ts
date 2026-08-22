// Per-company (per-tenant) configuration + pure formatters. The ERP was built
// for a Saudi company, so DEFAULTS are KSA (SAR, 15% VAT, Riyadh, en-GB dates) —
// a fresh tenant inherits these until it changes them in Company Settings. Stored
// on the tenant `settings` object under a `company` block (with a couple of
// legacy top-level fallbacks like settings.logo). See [[nompany-billing-spec]].

export const COMPANY_DEFAULTS = {
  // Localization
  currency: "SAR",          // shown after the amount, e.g. "1,500.00 SAR"
  currencyLocale: "en-US",  // number grouping / decimal style
  currencyDecimals: 2,
  dateLocale: "en-GB",      // dd/mm/yyyy
  timezone: "Asia/Riyadh",  // stored for consumers that need it (email, work hours)
  firstDayOfWeek: 0,        // Sunday
  // Finance
  vatRate: 0.15,
  taxNumber: "",            // VAT / CR registration number (shown on documents)
  // Branding
  logo: "",                 // subscriber's own logo (media URL); "" → nompany mark
};

// Merge a tenant's saved company config over the defaults. Accepts the whole
// `settings` object and reads settings.company.*, falling back to legacy
// top-level fields where they exist (settings.logo).
export function resolveCompanySettings(settings: Record<string, unknown> | null | undefined) {
  const c = (settings?.company && typeof settings.company === "object"
    ? settings.company as Record<string, unknown>
    : {});
  const flat: Record<string, unknown> = settings || {};
  const merged = { ...COMPANY_DEFAULTS, ...c };
  merged.logo = String(c.logo || flat.logo || COMPANY_DEFAULTS.logo);
  // Coerce the couple of numeric fields (forms submit strings).
  const dec = Number(merged.currencyDecimals);
  merged.currencyDecimals = Number.isFinite(dec) ? Math.max(0, Math.min(4, dec)) : 2;
  const vat = Number(merged.vatRate);
  merged.vatRate = Number.isFinite(vat) && vat >= 0 ? vat : COMPANY_DEFAULTS.vatRate;
  return merged;
}

// ---- Pure formatters (take a resolved config; default to KSA) --------------

// Split a money value into its rendered pieces so callers can show the currency
// as a glyph (the Saudi Riyal symbol) rather than the "SAR" text. Returns:
//   { body, currency }  — normal case ("1,500.00", "SAR")
//   { text }            — a pre-rendered string for the empty/invalid case
// so a React <Money> can render `{body} <Riyal/>` while string callers keep a
// plain formatted string via formatMoney below.
export function formatMoneyParts(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (v == null || v === "") return { text: "—" };
  const n = Number(v);
  if (!Number.isFinite(n)) return { text: String(v) };
  const decimals = cfg.currencyDecimals ?? 2;
  const body = n.toLocaleString(cfg.currencyLocale || "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return { body, currency: cfg.currency || "SAR" };
}

export function formatMoney(v: unknown, cfg = COMPANY_DEFAULTS) {
  const p = formatMoneyParts(v, cfg);
  return p.text != null ? p.text : `${p.body} ${p.currency}`;
}

// A DATE-ONLY STRING IS LOCAL MIDNIGHT, NOT UTC. `new Date("2026-08-22")` parses
// as UTC midnight, which in Riyadh (+3) is still the 22nd but in any Western
// timezone is the 21st at 21:00 — so a due date keyed "2026-08-22" renders as
// the 21st for half the world. Appending the time forces LOCAL midnight, which
// is what a calendar date means. Callers used to write `${iso}T00:00:00`
// themselves at each site; centralised here so they can pass the raw value.
function toDate(v: unknown): Date {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`);
  return new Date(v as string | number | Date);
}

// WESTERN DIGITS, EVEN IN ARABIC. `toLocaleDateString("ar-SA")` returns
// Arabic-Indic digits (٢٢/٠٨/٢٠٢٦) AND the Umm al-Qura (Hijri) calendar — both
// wrong for an ERP invoice that has to reconcile against a bank statement in
// Gregorian Western figures. Pinning `-ca-gregory-nu-latn` onto any Arabic
// locale keeps the words Arabic (month names, if used) while the numbers and
// the calendar stay the ones the finance team actually files in.
//
// THE ONE PLACE this decision is made — a per-user "show me Arabic-Indic digits"
// account setting, when it lands, overrides here and nowhere else.
function digitSafe(locale: string): string {
  return /^ar\b/i.test(locale) && !/-nu-/.test(locale) ? `${locale}-ca-gregory-nu-latn` : locale;
}

export function formatDate(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (!v) return "—";
  try { return toDate(v).toLocaleDateString(digitSafe(cfg.dateLocale || "en-GB")); } catch { return String(v); }
}

export function formatDateTime(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (!v) return "—";
  try { return toDate(v).toLocaleString(digitSafe(cfg.dateLocale || "en-GB")); } catch { return String(v); }
}

// A CLOCK TIME — "14:30", the tenant's hour convention (24h under en-GB, 12h
// under a US locale). Western digits by the same rule as dates, since a live
// view's "last polled at" reconciles against server logs. Seconds omitted: a
// poll timestamp to the minute is as much precision as anyone reads.
export function formatTime(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (!v) return "";
  try {
    return toDate(v).toLocaleTimeString(digitSafe(cfg.dateLocale || "en-GB"), { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

// A WEEKDAY LABEL is a word, not a number, so it is the one date output that
// SHOULD localise fully — an Arabic tenant wants "الإثنين", not "Mon". Separate
// from formatDate because the digit-forcing above is exactly wrong for it.
export function formatWeekday(v: unknown, cfg = COMPANY_DEFAULTS, long = false) {
  if (!v) return "";
  try {
    return toDate(v).toLocaleDateString(cfg.dateLocale || "en-GB", { weekday: long ? "long" : "short" });
  } catch { return ""; }
}
