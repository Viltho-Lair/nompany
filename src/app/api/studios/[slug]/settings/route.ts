import { requirePermission } from "@/platform/access";
import { NO_SCREEN_YET } from "@/platform/access";
import { REQUIRED_SECTIONS } from "@/platform/db/sections";
import { renameStudio } from "@/modules/main/studios";
import { isKnownCurrency, crossRate } from "@/shared/currencies";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { updateStudio, tradeSuggestionFor } from "@/modules/main/studios";
import { studioLocale, isLocale, defaultLocale } from "@/shared/i18n";
import { ALL_PERMISSIONS } from "@/platform/access/catalogue";
import { getSectionByKey } from "@/platform/db/sections";

import { numberingProblems, cleanNumbering, numberingView } from "@/modules/administration/numbering";
import { unitProblems, cleanUnits, unitsView, cleanUnitsOff, unitsOffProblems } from "@/modules/administration/units";
import { taxonomyProblems, cleanTaxonomies, taxonomyView, valuesFor } from "@/modules/administration/taxonomy";
import { cleanEmploymentRules, employmentRulesOf } from "@/modules/hr/leaveBalance";
import { cleanStatutory, statutoryRulesOf } from "@/modules/hr/statutory";
import { payPresetFor, employmentAppliesFor } from "@/shared/compliance/rules";
import { templateProblems as noticeProblems, cleanTemplates as cleanNotices, templateView as noticeView } from "@/modules/administration/notices";
import { isValuationMethod } from "@/modules/inventory/valuation";
import { cleanVatSetting, studioVatRate } from "@/shared/vat";
import { change, recordOfficialChanges } from "@/modules/administration/officialValues";
import { isTimezone } from "@/shared/timezone";
import {
  cleanEInvoiceSettings, einvoiceSettingsProblem, einvoiceSettingsView,
} from "@/modules/finance/einvoiceSettings";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import { official } from "@/shared/compliance/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Studio-level settings — the studio's own identity, not a section's data and
// not the person's account. Reading is open to any member so the shell can show
// the logo; writing is admin-only, and the API is the enforcement, never the
// hidden button.
//
// These live on the studio row in the g:studios registry, so they are covered by
// the studio's existing deletion path: removing a studio removes the row and the
// settings with it. No new key, no new collection, nothing extra to cascade.

// Explicit allowlist. updateStudio() takes any patch except id/ownerUserId/slug,
// so the boundary that decides what a request may write has to be here.
const FIELDS = [
  "logo", "country", "city", "location", "currency",
  // WHERE THE STUDIO'S CLOCK IS (22/09/2026, the owner: "something general
  // which can be used by multiple sections must not be in a section
  // settings"). A shop's opening hours, a per-day cap, a shift's own date and
  // a nightly job all ask which day it is; one answer, on the studio, beside
  // the currency it is the exact counterpart of. `shared/timezone` is the file.
  "timezone",
  // THE STUDIO'S OWN E-INVOICING CREDENTIALS (22/09/2026). Facts about the
  // COMPANY'S REGISTRATION with its tax authority, in the same family as the
  // country and the official values this very adapter reads its TIN from — so
  // they sit beside them rather than in Finance's settings.
  //
  // THE SECRET NEVER COMES BACK OUT. `clean` below reports whether one is set;
  // the value is sealed on the way in and read only by the adapter.
  "einvoiceSettings",
  // THE STUDIO'S DEFAULT LANGUAGE — see studioLocale in shared/i18n. It sets
  // the direction and the dictionary for everyone who has not chosen one of
  // their own, which for most people is everyone; that is why it stays behind
  // studio.settings.edit rather than becoming a per-person field here.
  //
  // The per-person override is NOT stored on this route or on any record: it is
  // a cookie, written by the language menu in the studio header (preferredLocale
  // in shared/locale explains why). So this response is still the whole of what
  // the tenant has decided, and the goldens over it are unchanged.
  "language",
  "workingHours", "legalInfo", "favoriteCurrencies",
  // WHETHER EVERY SIGNER MUST TYPE THEIR PIN (18/09/2026) — a rule about
  // answering an approval. Off, only a person who has set a
  // PIN is asked for it (platform/auth/lock.ts, signingPinProblem).
  "signingPin",
  // WHAT THIS STUDIO'S DOCUMENTS ARE CALLED. Beside the chains for the same
  // reason: a numbering policy is the company's, not a department's, and one
  // right over it beats fourteen modules each owning their own prefix.
  "numbering",
  // WHAT THIS STUDIO COUNTS IN. Beside numbering because it is the same kind
  // of thing — reference data every section reads and no section owns. It
  // holds the studio's ADDITIONS only; the shipped units are never stored,
  // so nothing an existing item is measured in can be written away.
  "units",
  // WHICH SHIPPED UNITS ARE SWITCHED OFF (the owner, 18/09/2026). Hidden from
  // the pickers, never taken off an item that already uses one.
  "unitsOff",
  // WHAT THIS STUDIO CLASSIFIES THINGS BY. The same kind of thing as units
  // one axis along: six lists were hard-coded in five modules and no studio
  // could change any of them. Additions only, for units' reason — a studio
  // that could delete "Annual" would leave every approved leave request
  // naming a type the product no longer admits.
  "taxonomies",
  // WHAT THIS STUDIO'S NOTIFICATIONS SAY. Overrides only, for the reason
  // units and taxonomies keep theirs: a studio that stored the shipped
  // wording would never receive a later correction to it.
  "noticeTemplates",
  // HOW STOCK IS VALUED — FIFO or weighted average. An accounting policy, so it
  // sits with the other company-wide ones rather than in Inventory's settings:
  // the number it produces lands on a balance sheet, and whoever signs that is
  // not the person who runs the warehouse.
  "valuationMethod",
  // THE STUDIO'S VAT RATE — blank means it is not registered and no document
  // carries tax (shared/vat says why that is the rule). A company-wide policy,
  // so here rather than in Finance's settings: quotations and orders read it too.
  "vatRate",
  // THE STUDIO'S EMPLOYMENT RULES — leave allowances, carry-over and how leave
  // days are counted (modules/hr/leaveBalance). A company policy, like the VAT
  // rate beside it; HR reads it and the country presets fill it.
  "employmentRules",
  // fieldOfWork, fieldOfWorkOther, serviceActions and retiredServiceActions are
  // deliberately NOT here. Writing a service action is not "set this text" — it
  // is "recompute the pool": choosing a field re-seeds it from the matrix, and
  // removing an in-use action retires rather than deletes it (see
  // studioServiceActions.ts). A blind write through this allowlist would bypass
  // that guarantee, so settings/service-actions/route.ts is the SOLE writer of
  // all four; this route only displays them (see clean()).
];

// Mon-first, which is how a working week is read here.
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// A studio is not deleted the moment it is asked for. Thirty days of grace,
// during which the owner can change their mind and everything keeps working.
export const GRACE_DAYS = 30;
export const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

// Working hours are a fixed SHAPE, not free JSON: seven known days, each open or
// closed with a from/to. Anything else in the payload is dropped, so a bad
// request cannot put an eighth day or a malformed time into the record.
type DayHours = { open?: unknown; from?: string; to?: string };

function cleanHours(v: unknown) {
  const src = (v && typeof v === "object" ? v : {}) as Record<string, DayHours | undefined>;
  const out: Record<string, { open: boolean; from: string; to: string }> = {};
  for (const d of DAYS) {
    const row: DayHours = src[d] && typeof src[d] === "object" ? src[d]! : {};
    const from = TIME.test(String(row.from)) ? String(row.from) : "09:00";
    const to = TIME.test(String(row.to)) ? String(row.to) : "17:00";
    out[d] = { open: Boolean(row.open), from, to };
  }
  return out;
}

// Legal information is a LIST OF PAIRS the studio names itself — CR number, VAT
// number, whatever its jurisdiction expects — rather than a fixed set of fields.
// Fixing the fields here would mean guessing which country a studio is in and
// being wrong for every other one.
//
// A row with no key is dropped: a value nobody labelled cannot be read later.
// The handful of currencies this studio actually deals in, picked out of the
// full ExchangeRate-API list. Codes only — the names come from the vocabulary in
// lib/currencies, so a studio's saved list never goes stale when a name changes.
// Unknown codes are dropped, duplicates collapse, order is the caller's.
function cleanFavourites(v: unknown) {
  const seen = new Set();
  for (const raw of Array.isArray(v) ? v : []) {
    const code = String(raw ?? "").trim().toUpperCase();
    if (isKnownCurrency(code)) seen.add(code);
    if (seen.size >= 25) break;
  }
  return [...seen];
}

function cleanLegal(v: unknown) {
  return (Array.isArray(v) ? v : []).slice(0, 40).map((row) => ({
    key: String(row?.key ?? "").trim().slice(0, 80),
    value: String(row?.value ?? "").trim().slice(0, 300),
  })).filter((row) => row.key);
}

const clean = (studio: Record<string, unknown>) => ({
  id: studio.id, name: studio.name, slug: studio.slug, logo: studio.logo || "",
  country: studio.country || "", city: studio.city || "", location: studio.location || "",
  currency: studio.currency || "",
  timezone: studio.timezone || "",
  // WHETHER A SECRET IS SET, never the secret — see modules/finance/einvoiceSettings.
  einvoiceSettings: einvoiceSettingsView(studio.einvoiceSettings),
  // WHAT THIS COUNTRY REQUIRES, so the screen draws the panel only where there
  // is an authority to reach. Null for a country that requires nothing, which
  // is an absent panel rather than a disabled one.
  einvoiceRules: studioEInvoiceRules(studio),
  // WHETHER THE COMPANY'S TAX NUMBER IS SET, not what it is. Every submission
  // carries it, so the panel says where to set one rather than letting the
  // studio find out from a rejection — and a boolean tells it that without
  // putting an identifier on a screen that does not need one.
  hasTaxNumber: Boolean(official(studio as Parameters<typeof official>[0], "tax_number")),
  vatRate: studioVatRate(studio) ?? "",
  employmentRules: { ...employmentRulesOf(studio), ...statutoryRulesOf(studio) },
  // THE COUNTRY'S STARTING FIGURES for those rules, from its definition file
  // (`rules.payPreset`), or null. Sent rather than imported by the screen, so
  // the settings bundle does not carry every country's definition.
  employmentPreset: payPresetFor(studio.country),
  // WHICH OF THE THREE STATUTORY BLOCKS THIS COUNTRY ACTUALLY HAS (20/09/2026,
  // the owner: a studio sees its own country's rules and nothing else). The
  // screen draws only what is here; the PUT below refuses anything else, so a
  // stale form cannot store a scheme the country does not run.
  employmentApplies: employmentAppliesFor(studio.country),
  // The leave types a rule may name — the studio's own list, additions included.
  leaveTypes: valuesFor("leaveTypes", studio.taxonomies),
  language: studioLocale(studio),
  deletionRequestedAt: studio.deletionRequestedAt || "",
  deletionFinalisesAt: studio.deletionRequestedAt
    ? new Date(Date.parse(String(studio.deletionRequestedAt)) + GRACE_MS).toISOString()
    : "",
  workingHours: studio.workingHours || null,
  // WHETHER THIS STUDIO HAS AGREED TO BE NAMED PUBLICLY, and when. The screen
  // needs the timestamp, not a boolean: a switch that says only "on" cannot
  // tell somebody when they agreed, which is the first thing they will ask.
  //
  // `featured` is DELIBERATELY NOT HERE. Consent is the studio's half; whether
  // we have chosen to show them is ours, decided in /super, and putting it in
  // this payload would invite a screen to render "you are live on the site"
  // from a flag the studio does not control.
  showcaseConsent: studio.showcaseConsent || null,
  legalInfo: Array.isArray(studio.legalInfo) ? studio.legalInfo : [],
  favoriteCurrencies: Array.isArray(studio.favoriteCurrencies) ? studio.favoriteCurrencies : [],
  serviceActions: Array.isArray(studio.serviceActions) ? studio.serviceActions : [],
  // Display only — see the WHY note on FIELDS. Written solely by
  // settings/service-actions/route.ts.
  fieldOfWork: String(studio.fieldOfWork || ""),
  fieldOfWorkOther: String(studio.fieldOfWorkOther || ""),
  retiredServiceActions: Array.isArray(studio.retiredServiceActions) ? studio.retiredServiceActions : [],
  signingPin: Boolean((studio as { signingPin?: unknown }).signingPin),
  // EVERY SERIES WITH THE SETTING IN FORCE, defaults included, so the editor
  // can show its rows without knowing the catalogue — and can say which are the
  // studio's own choice rather than presenting shipped defaults as though
  // somebody had set them.
  numbering: numberingView((studio as { numbering?: unknown }).numbering),
  // EVERY UNIT IN FORCE, saying which are shipped defaults — a screen that
  // cannot tell those from the studio's own choices offers to remove both.
  units: unitsView((studio as { units?: unknown }).units, (studio as { unitsOff?: unknown }).unitsOff),
  // EVERY LIST IN FORCE, shipped values kept apart from the studio's own —
  // a screen that could not tell them apart would offer to remove both.
  taxonomies: taxonomyView((studio as { taxonomies?: unknown }).taxonomies),
  // EVERY NOTIFICATION WITH BOTH WORDINGS, the studio's kept apart from the
  // shipped one so the screen can offer a reset rather than only an edit.
  noticeTemplates: noticeView((studio as { noticeTemplates?: unknown }).noticeTemplates),
});

// Rates from the studio's own currency out to each favourite. Anything the
// snapshot does not quote comes back null rather than absent, so the row can say
// so instead of rendering a blank.
async function favouriteRates(studio: Record<string, unknown>) {
  const base = String(studio.currency || "").trim().toUpperCase();
  const codes = Array.isArray(studio.favoriteCurrencies) ? studio.favoriteCurrencies : [];
  if (!base || codes.length === 0) return { base, rates: {}, updatedAt: 0, stale: false };

  const snap = await getExchangeSnapshot();
  const rates: Record<string, number | null> = {};
  for (const code of codes) rates[String(code)] = snap.rates ? crossRate(snap.rates, base, String(code)) : null;
  return { base, rates, updatedAt: snap.updatedAt || 0, stale: Boolean(snap.stale) };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  // ENFORCED AT LAST. This route checked membership and stopped there, so
  // administration.settings.view was grantable and granted nobody anything --
  // for as long as the Studio settings screen was reached by a route that
  // bypassed the section mechanism, nothing existed to read it.
  //
  // It has to land in the same change as the nav gating rather than after it:
  // a gated screen over an open endpoint is worse than either alone, because
  // the screen disappears while the whole studio record stays readable by any
  // member. The refused body carries no studio at all, which is asserted --
  // a 403 returning the payload would be the same leak wearing a status code.
  const deniedView = requirePermission(context.access, "administration.settings.view");
  if (deniedView) return Response.json(deniedView, { status: 403 });

  const { studio, collaborator } = context;
  return Response.json({
    studio: clean(studio),
    // Today's rate for each favourite, against the STUDIO's currency. Only the
    // handful of numbers the page shows go over the wire — /super ships the
    // whole USD table because it lets you re-pick the base, and this page does
    // not. The snapshot is a shared daily read, so this costs no API call.
    fx: await favouriteRates(studio),
    canManage: !requirePermission(context.access, "administration.settings.edit"),
    // THE STUDIO'S OWN SECTION LIST, so Settings can offer the choice of which
    // ones this studio uses. Every section is here, not just the visible ones —
    // a screen for turning a section back ON cannot be built from a list that
    // omits the ones that are off. `noScreen` says which can never be enabled,
    // because they render nothing; the screen greys those rather than hiding
    // them, so a studio can see that Manufacturing exists and is not ready
    // rather than wondering why the product has a gap where one should be.
    sections: (context.sections || []).map((x) => ({
      id: x.id,
      key: x.key,
      name: x.name,
      parentId: x.parentId || null,
      enabled: x.enabled !== false,
      noScreen: (NO_SCREEN_YET as readonly string[]).includes(x.key),
      required: (REQUIRED_SECTIONS as readonly string[]).includes(x.key),
    })),
    // WHAT THE STUDIO'S TRADE WOULD SWITCH, as keys — the screen already holds
    // the rows and their names. OFFERED, never applied: the gate runs once, at
    // creation, and changing the trade later switches nothing by itself.
    //
    // NULL ONCE ANSWERED FOR THIS TRADE. `sectionsTrade` is the field of work
    // the sections were last applied for (the apply route writes it, and
    // `createStudio` does, because the gate there is that answer). Keeping one
    // extra section would otherwise bring the offer back on every visit.
    tradeSuggestion: studio.fieldOfWork && studio.sectionsTrade === studio.fieldOfWork
      ? null
      : tradeSuggestionFor(studio.fieldOfWork, context.sections || []),
    // Asking for deletion is the OWNER's call, not an admin's: it ends the
    // studio for everybody in it.
    isOwner: collaborator.role === "owner",
  });
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;
  // The studio's own settings are a grantable right rather than an admin-only
  // one. Requesting DELETION stays owner-only below — that ends the studio for
  // everybody, which is not something a permission should be able to hand out.
  if (requirePermission(context.access, "administration.settings.edit")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  // Requesting or cancelling deletion is handled apart from the ordinary
  // settings and is the OWNER's alone — an admin can change the logo, not end
  // the studio. Cancelling is deliberately as easy as asking: the grace period
  // is only worth having if changing your mind is one click.
  if ("requestDeletion" in body) {
    if (collaborator.role !== "owner") return Response.json({ error: "owner-only" }, { status: 403 });
    const updated = await updateStudio(studio.id, {
      deletionRequestedAt: body.requestDeletion ? new Date().toISOString() : "",
    });
    return updated
      ? Response.json({ ok: true, studio: clean(updated) })
      : Response.json({ error: "notfound" }, { status: 404 });
  }

  // RENAMING is the owner's call and takes effect immediately — the address
  // included, so the studio answers to its new one from the next request and
  // stops answering to the old one. See renameStudio.
  if (body?.rename) {
    if (collaborator.role !== "owner") return Response.json({ error: "owner-only" }, { status: 403 });
    const out = await renameStudio(studio.id, body.rename);
    if (out.error) {
      const status = out.error === "notfound" ? 404 : out.error === "slug-taken" ? 409 : 400;
      return Response.json({ error: out.error }, { status });
    }
    // The new address goes back with it: the screen that asked for the rename is
    // sitting on the old URL and has to move itself.
    return Response.json({ ok: true, changed: out.changed, studio: clean(out.studio || {}) });
  }

  // CONSENT TO BE NAMED PUBLICLY. Handled apart from the ordinary fields
  // because it is not a setting the studio types — it is a decision, and what
  // is stored is WHO made it and WHEN, not a boolean.
  //
  // IT CANNOT PUBLISH ANYTHING BY ITSELF. A studio consenting becomes eligible;
  // appearing on the site also needs `featured`, which only /super may set and
  // which this route deliberately does not accept. The two flags have two
  // writers on purpose — see shared/marketing/showcase.
  //
  // WITHDRAWAL CLEARS THE RECORD RATHER THAN MARKING IT WITHDRAWN. The public
  // feed derives from this field on every read, so clearing it removes the
  // studio on the next request; keeping a tombstone would be storing a decision
  // somebody has revoked, for no reader.
  if ("showcaseConsent" in body) {
    const patch = body.showcaseConsent
      ? { showcaseConsent: { at: new Date().toISOString(), by: collaborator.id } }
      : { showcaseConsent: null };
    const updated = await updateStudio(studio.id, patch);
    return updated
      ? Response.json({ ok: true, studio: clean(updated) })
      : Response.json({ error: "notfound" }, { status: 404 });
  }

  // THE COUNTRY IS THE OWNER'S TO CHOOSE (18/09/2026), not any settings
  // editor's. It decides which official values exist, which rules every
  // department applies and what prints on every legal document — a bigger act
  // than editing a value, and the Owner is who answers for the Studio as a
  // legal entity. Asked only when the country actually CHANGES, so an editor
  // saving the city with the country unchanged in the same form is not refused.
  const countryBefore = String(studio.country ?? "");
  const countryChanging = "country" in body && String(body.country ?? "").trim() !== countryBefore;
  if (countryChanging && collaborator.role !== "owner") {
    return Response.json({ error: "owner-only" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of FIELDS) {
    if (!(key in body)) continue;
    // Working hours is the one structured field; everything else is text, and
    // "" is a real value — it is how the logo is removed.
    // APPROVAL CHAINS ARE REFUSED ON WRITE, never on read, and BEFORE anything
    // is stored. A step naming a permission that does not exist blocks every
    // record reaching it — silently, forever, on a screen nobody thinks to
    // doubt — so the studio hears about its own edit while it is still their
    // edit and in words about the edit. This is the same door
    // saveFinanceSettings held for bills; it moved here with the store.
    if (key === "signingPin") {
      patch[key] = body[key] === true;
      continue;
    }
    // REFUSED RATHER THAN COERCED, for the language's reason. A zone `Intl`
    // does not recognise silently falls back on every read, so a studio would
    // set its clock, see it accepted, and keep getting somebody else's day —
    // on a per-day cap and a shift report, not just on a label. "" is a real
    // value: it is how a studio goes back to having no clock of its own.
    // SEALED ON THE WAY IN, and a blank secret does not erase the stored one —
    // the form was never shown it, so it cannot send it back.
    if (key === "einvoiceSettings") {
      const problem = einvoiceSettingsProblem((body[key] || {}) as Record<string, unknown>);
      if (problem) return Response.json({ error: "einvoice", detail: problem }, { status: 400 });
      patch[key] = cleanEInvoiceSettings(studio.einvoiceSettings, (body[key] || {}) as Record<string, unknown>);
      continue;
    }
    if (key === "timezone") {
      const zone = String(body[key] ?? "").trim();
      if (zone && !isTimezone(zone)) return Response.json({ error: "timezone" }, { status: 400 });
      patch[key] = zone;
      continue;
    }
    // NUMBERING IS REFUSED ON WRITE, never on read, exactly as the chains are.
    // A prefix is what `bumpCounter` is keyed on, so a bad one is not a
    // cosmetic problem: a hyphen inside it makes `highestIssued` parse every
    // existing reference as nought and the next create reissue a number a
    // client is already holding. Invariant 10, broken by punctuation — so the
    // studio hears about its own edit while it is still their edit.
    // REFUSED RATHER THAN COERCED, like the language is. An unrecognised method
    // would silently fall back on every read, so a studio would set a policy,
    // see it accepted, and keep getting the other one's numbers.
    // REFUSED RATHER THAN COERCED, for the same reason: "15%" read as 0 would
    // switch the studio's tax off while the screen said it had been saved.
    // REFUSED WITH THE TYPE AND FIELD NAMED, for the reason numbering gives: a
    // rule for a leave type the studio does not admit, or "after 5 years" with
    // no new figure, silently does nothing on every balance that reads it.
    // ONE OBJECT, TWO HALVES: leave (leaveBalance) and statutory pay (statutory),
    // each checked by its own module and stored together.
    if (key === "employmentRules") {
      const leave = cleanEmploymentRules(body[key], valuesFor("leaveTypes", studio.taxonomies));
      // JUDGED AGAINST THE STUDIO'S OWN COUNTRY: a Jordanian studio storing a
      // UAE routing code is refused here, not merely un-offered on the screen.
      const statutory = cleanStatutory(body[key], employmentAppliesFor(studio.country));
      const problems = [
        ...("problems" in leave ? leave.problems.map((p) => `${p.type}: ${p.field}`) : []),
        ...("problems" in statutory ? statutory.problems : []),
      ];
      if ("problems" in leave || "problems" in statutory) {
        return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      }
      patch[key] = { ...leave.rules, ...statutory.rules };
      continue;
    }
    if (key === "vatRate") {
      const vat = cleanVatSetting(body[key]);
      if ("error" in vat) return Response.json({ error: vat.error }, { status: 400 });
      patch[key] = vat.value;
      continue;
    }
    if (key === "valuationMethod") {
      if (!isValuationMethod(body[key])) return Response.json({ error: "method" }, { status: 400 });
      patch[key] = body[key];
      continue;
    }
    if (key === "numbering") {
      const problems = numberingProblems(body[key]);
      if (problems.length) return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      patch[key] = cleanNumbering(body[key]);
      continue;
    }
    // REFUSED ON WRITE with the reasons named, the way numbering is: a comma in
    // a unit breaks a CSV export of the item list, and two spellings of one unit
    // divide every grouping in half. The studio hears about its own edit while
    // it is still their edit.
    // CHECKED AGAINST THE UNITS BEING SAVED BESIDE IT when both travel, so a
    // studio adding "bag" while switching every default off is not refused for
    // a state it is leaving.
    if (key === "unitsOff") {
      const own = body.units !== undefined ? body.units : (studio as { units?: unknown }).units;
      const problems = unitsOffProblems(body[key], own);
      if (problems.length) return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      patch[key] = cleanUnitsOff(body[key]);
      continue;
    }
    if (key === "units") {
      const off = body.unitsOff !== undefined ? body.unitsOff : (studio as { unitsOff?: unknown }).unitsOff;
      const problems = [...unitProblems(body[key]), ...unitsOffProblems(off, body[key])];
      if (problems.length) return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      patch[key] = cleanUnits(body[key]);
      continue;
    }
    // REFUSED ON WRITE with the reasons named, for units' reason and one more:
    // a save carries every axis at once, so each message says WHICH list is
    // wrong — "that is listed twice" is unactionable without it.
    if (key === "taxonomies") {
      const problems = taxonomyProblems(body[key]);
      if (problems.length) return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      patch[key] = cleanTaxonomies(body[key]);
      continue;
    }
    // REFUSED ON WRITE, and the reason worth having is the placeholder check:
    // "{salary}" in a leave notification renders as nothing, every time, on
    // every reader's bell, silently. The studio hears about it while it is
    // still their edit.
    if (key === "noticeTemplates") {
      const problems = noticeProblems(body[key]);
      if (problems.length) return Response.json({ error: "refused", detail: problems.join("; ") }, { status: 400 });
      patch[key] = cleanNotices(body[key]);
      continue;
    }
    patch[key] = key === "workingHours" ? cleanHours(body[key])
      // Refused rather than coerced: an unrecognised language would set the
      // whole tenant to a dictionary that does not exist. `isLocale` is the
      // same guard the public site uses on its own URL segment.
      : key === "language" ? (isLocale(body[key]) ? body[key] : defaultLocale)
      : key === "legalInfo" ? cleanLegal(body[key])
      : key === "favoriteCurrencies" ? cleanFavourites(body[key])
      : String(body[key] ?? "").slice(0, 500);
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  // A COUNTRY CHANGE IS RECORDED WITH THE VALUES IT GOVERNS — it changes which
  // of them print, so "why did our VAT number disappear from invoices" has to
  // be answerable from the same history as the number itself.
  if (countryChanging) {
    await recordOfficialChanges(studio.id, [
      change(collaborator as { id: string; alias?: unknown }, String(updated.country ?? ""), "country", countryBefore, String(updated.country ?? "")),
    ]);
  }
  return Response.json({ ok: true, studio: clean(updated) });
}
