// WHAT FINANCE NEEDS THE STUDIO TO HAVE SET UP, AND WHICH OF IT IS MISSING.
//
// THE OWNER'S RULE, 18/09/2026: "there is no home market — the studio sets the
// home market when the country is selected — and it is important to annotate
// important setup for users." Finance's rules come from the studio's COUNTRY
// (shared/compliance: tax arithmetic, the official values its documents carry)
// and from a few settings nothing can guess. Until now a missing one surfaced
// only as a refusal at the moment it bit — "no-studio-currency" on the first
// bill somebody tried to approve — which reads as a broken screen, not as a
// step nobody was told about.
//
// SO THE SCREEN SAYS IT FIRST: each missing piece, why Finance needs it, and
// where it is set. Nothing here blocks anything; the refusals stay where they
// are, and this is what makes them unsurprising.
//
// PURE. It reads the studio row it is handed and the country definitions, and
// nothing else — no store, no clock.

import { definitionFor } from "@/shared/compliance/countries";
import { isApplicable, type ResolveOptions } from "@/shared/compliance/resolve";
import { valueProblem, type Localised } from "@/shared/compliance/definition";
import { studioVatRate } from "@/shared/vat";
import { adapterFor } from "./einvoice";
import { requirePermission } from "@/platform/access";

export type SetupItem = {
  /** A stable token the screen words: country, currency, vat, or `official:<key>`. */
  key: string;
  /**
   * missing — Finance cannot do something until it is set.
   * invalid — set, and not in the form the country requires, so it prints nowhere.
   * check   — nothing is wrong, but a choice decides what Finance does and
   *           nobody has visibly made it (a country with a sales tax, and no rate).
   */
  state: "missing" | "invalid" | "check";
  /** The country's own label, for an official value; absent for the fixed three. */
  label?: Localised;
};

const text = (v: unknown) => String(v ?? "").trim();

/** The studio's official value departments Finance prints on its documents. */
const FINANCE_DEPARTMENTS = new Set(["company", "finance", "invoicing"]);

export function financeSetup(studio: unknown, opts: ResolveOptions = {}): SetupItem[] {
  const row = (studio || {}) as { country?: unknown; currency?: unknown; officialValues?: unknown };
  const items: SetupItem[] = [];

  // THE COUNTRY DECIDES THE REST: how tax is added up, what an invoice must
  // carry, which employment law applies. Without it every one of those is the
  // product's default, which is nobody's law.
  const country = text(row.country);
  if (!country) items.push({ key: "country", state: "missing" });

  // THE BOOKS ARE KEPT IN IT, and approving a bill or a bid refuses without it:
  // an amount cannot be judged against a limit in no currency.
  if (!text(row.currency)) items.push({ key: "currency", state: "missing" });

  const def = country ? definitionFor(country) : null;
  // A COUNTRY WITH A SALES TAX AND A STUDIO WITH NO RATE is a choice nobody can
  // see being made: an unregistered business is right to have none, and a
  // registered one that forgot issues every invoice without tax. So it is
  // flagged to CHECK, never as wrong.
  if (def?.rules?.tax && studioVatRate(studio) === null) items.push({ key: "vat", state: "check" });
  // THE COUNTRY REQUIRES E-INVOICING AND NOMPANY CANNOT PREPARE ITS FILE — said,
  // because an invoice issued here and never submitted is the one gap a studio
  // would otherwise find out about from the authority. Where it CAN, what the
  // file needs is official values (department `invoicing`), which the loop
  // below already names when they are missing — so there is no second notice.
  if (def?.rules?.einvoice && !adapterFor(def.rules.einvoice)) items.push({ key: "einvoice", state: "check" });

  // WHAT THIS COUNTRY REQUIRES ON FINANCE'S DOCUMENTS, applicable to this
  // studio, and blank or malformed. A malformed one is as absent as a blank one
  // on the page — the resolver prints neither — so it is said too.
  const stored = row.officialValues && typeof row.officialValues === "object"
    ? (row.officialValues as Record<string, unknown>) : {};
  for (const f of def?.fields || []) {
    // MANDATORY, OR CONDITIONAL AND ITS CONDITION HOLDS — a VAT number is
    // conditional on being VAT-registered, and required once the studio is.
    if (f.required === "optional" || !FINANCE_DEPARTMENTS.has(f.department)) continue;
    if (f.required === "conditional" && !f.appliesWhen) continue;
    if (!isApplicable(studio, f, opts)) continue;
    const raw = stored[f.key];
    if (!text(raw)) items.push({ key: `official:${f.key}`, state: "missing", label: f.label });
    else if (valueProblem(f, raw)) items.push({ key: `official:${f.key}`, state: "invalid", label: f.label });
  }
  return items;
}

/**
 * WHAT A FINANCE ROUTE HANDS ITS SCREEN: the missing setup, and whether this
 * reader may fix it — the notice links to Studio settings only for them. One
 * copy for every Finance route rather than one per route.
 */
export function setupFor(f: { studio: unknown; on: (k: string) => boolean; access: unknown }) {
  return {
    setup: financeSetup(f.studio, { sectionOn: f.on }),
    canFixSetup: !requirePermission(f.access as Parameters<typeof requirePermission>[0], "administration.settings.edit"),
  };
}
