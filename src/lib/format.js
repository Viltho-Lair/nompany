// App-wide display formatters. Money + dates are now PER-COMPANY: the studio
// shell loads the tenant's settings once (client) and calls configureFormat(),
// after which every consumer of these helpers renders in the company's currency,
// decimals and date locale. Defaults are KSA (SAR / en-GB) — see companySettings.
//
// SAFETY: the active config is a CLIENT-only module variable. On the server it
// stays null (the shell effect never runs there), so server renders always use
// the neutral DEFAULTS — no cross-tenant/config bleed between concurrent server
// requests. A single browser = one tenant, so setting it once client-side is safe.

import { COMPANY_DEFAULTS, formatMoney, formatMoneyParts, formatDate, formatDateTime } from "@/lib/companySettings";

let _active = null;

// Called once by StudioShell after settings load (client). Pass a resolved
// company-settings config (from resolveCompanySettings).
export function configureFormat(cfg) { _active = cfg || null; }

const active = () => _active || COMPANY_DEFAULTS;

export function fmtDate(v) { return formatDate(v, active()); }
export function fmtDateTime(v) { return formatDateTime(v, active()); }

// Currency-aware money. `fmtSAR` is kept as a back-compat alias (now honours the
// tenant's currency, not literally SAR) so existing imports keep working.
export function fmtMoney(v) { return formatMoney(v, active()); }
export const fmtSAR = fmtMoney;

// Rendered pieces of a money value (tenant currency) for the <Money> component,
// so amounts can show the Riyal glyph instead of the "SAR" text. See Money.js.
export function moneyParts(v) { return formatMoneyParts(v, active()); }

// The active VAT rate (tenant's, else default) — for consumers that compute tax.
export function currentVatRate() { return active().vatRate ?? COMPANY_DEFAULTS.vatRate; }
