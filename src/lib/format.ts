// App-wide display formatters. Money + dates are now PER-COMPANY: the studio
// shell loads the tenant's settings once (client) and calls configureFormat(),
// after which every consumer of these helpers renders in the company's currency,
// decimals and date locale. Defaults are KSA (SAR / en-GB) — see companySettings.
//
// SAFETY: the active config is a CLIENT-only module variable. On the server it
// stays null (the shell effect never runs there), so server renders always use
// the neutral DEFAULTS — no cross-tenant/config bleed between concurrent server
// requests. A single browser = one tenant, so setting it once client-side is safe.

import { COMPANY_DEFAULTS, formatMoney, formatMoneyParts, formatDate, formatDateTime, formatWeekday, formatTime } from "@/modules/main/companySettings";

type CompanyConfig = typeof COMPANY_DEFAULTS;

let _active: CompanyConfig | null = null;

// Called once by StudioShell after settings load (client). Pass a resolved
// company-settings config (from resolveCompanySettings).
export function configureFormat(cfg: CompanyConfig | null | undefined) { _active = cfg || null; }

const active = () => _active || COMPANY_DEFAULTS;

export function fmtDate(v: unknown) { return formatDate(v, active()); }
export function fmtDateTime(v: unknown) { return formatDateTime(v, active()); }
// A weekday LABEL ("Mon", or "الإثنين" for an Arabic tenant). The one date
// output that localises fully — see formatWeekday. `long` gives "Monday".
export function fmtWeekday(v: unknown, long = false) { return formatWeekday(v, active(), long); }
// A clock time ("14:30"), tenant hour convention. For live-view "last polled".
export function fmtTime(v: unknown) { return formatTime(v, active()); }

// Currency-aware money. `fmtSAR` is kept as a back-compat alias (now honours the
// tenant's currency, not literally SAR) so existing imports keep working.
export function fmtMoney(v: unknown) { return formatMoney(v, active()); }
export const fmtSAR = fmtMoney;

// Rendered pieces of a money value (tenant currency) for the <Money> component,
// so amounts can show the Riyal glyph instead of the "SAR" text. See Money.js.
export function moneyParts(v: unknown) { return formatMoneyParts(v, active()); }

// The active VAT rate (tenant's, else default) — for consumers that compute tax.
export function currentVatRate() { return active().vatRate ?? COMPANY_DEFAULTS.vatRate; }

// "2m ago". For notification feeds, where WHEN SOMETHING LANDED matters more
// than the calendar date it landed on — a timestamp answers a question nobody
// reading a bell is asking. Deliberately not tenant-configured: it is a
// relative interval, so there is no currency or calendar to honour.
//
// Falls back to an absolute date once something is a week old, at which point
// "9d ago" has stopped being more useful than the date itself.
const RELATIVE_STEPS: [number, number, string][] = [
  [60, 1, "s"],
  [3600, 60, "m"],
  [86400, 3600, "h"],
  [604800, 86400, "d"],
];

export function ago(value: unknown) {
  const then = Date.parse(String(value ?? ""));
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  // The tuple type is named where it is declared, not inferred here: a mixed
  // array of numbers and a string widens to `string | number` and the two
  // arithmetic uses below stop being arithmetic.
  for (const [limit, div, unit] of RELATIVE_STEPS) {
    if (secs < limit) return `${Math.floor(secs / div)}${unit} ago`;
  }
  return fmtDate(value);
}
