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

export function formatDate(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (!v) return "—";
  try { return new Date(v as string | number | Date).toLocaleDateString(cfg.dateLocale || "en-GB"); } catch { return String(v); }
}

export function formatDateTime(v: unknown, cfg = COMPANY_DEFAULTS) {
  if (!v) return "—";
  try { return new Date(v as string | number | Date).toLocaleString(cfg.dateLocale || "en-GB"); } catch { return String(v); }
}
