// THE INDUSTRY MAP — twenty-five fields, each with the flow template a deal in
// it defaults to. Blueprint Part 5, transcribed rather than paraphrased.
//
// WHAT THIS IS FOR, and what it is emphatically not. It resolves a DEFAULT: a
// studio says what it does, and a new deal starts on the template that shape of
// business usually needs. The creator may override it per deal, and the
// override is the point — a manufacturer's service arm runs Field Service deals
// beside its Make-to-Order ones, in the same studio, on the same container.
// That is what `secondary` records: not a fallback, but the OTHER business the
// same company genuinely runs.
//
// LAW 2 AGAIN: THIS IS A SEED, NOT A CEILING. Adding an industry is a row, not
// a release — the stored per-tenant copy is what the product reads, and this is
// only what it starts from. A studio whose trade is not on this list is a
// studio that adds it, not one that waits for us.
//
// The `key` is derived from the name and is what a stored deal references, so
// renaming a field for readability does not orphan every deal that chose it.

export type IndustryEntry = {
  key: string;
  name: string;
  /** Template id a deal in this industry starts on. */
  primary: string;
  /** The other business the same company commonly runs. "" when there is none. */
  secondary: string;
  /** Why these two — kept because the reasoning is what makes the pairing checkable. */
  note: string;
  /**
   * THE SAME TRADE'S NAME IN `shared/fieldsOfWork`, character for character.
   *
   * THERE ARE TWO LISTS OF THE SAME TWENTY-FIVE TRADES AND THEY WERE JOINED
   * BY NOTHING. This one keys by SLUG and answers which flow template a deal
   * starts on. `FIELD_ACTION_MATRIX` keys by DISPLAY NAME and is what a studio
   * actually stores in `fieldOfWork` — what seeds its service actions, what
   * seeds its departments, and what the Settings screen writes. Four of the
   * twenty-five are spelled differently between the two ("Energy & Utilities"
   * here against "Energy & Utilities (Electricity, Gas)" there), so a studio's
   * own trade could not be resolved to its own flow at all.
   *
   * STATED RATHER THAN COMPUTED. A normaliser that strips brackets and
   * abbreviations pairs these four correctly today and would silently pair the
   * WRONG two rows the first time somebody adds a trade whose name collapses
   * onto another's — and the failure would be a studio quietly running on
   * another industry's flow. `testTheTwoIndustryListsAreOneList` holds this
   * 1:1 in both directions.
   */
  field: string;
};

export const INDUSTRIES: readonly IndustryEntry[] = Object.freeze([
  { key: "agriculture-forestry-and-fishing", name: "Agriculture, Forestry & Fishing", primary: "B", secondary: "G", note: "Produce-to-order; seasonal service contracts" , field: "Agriculture, Forestry & Fishing" },
  { key: "mining-and-quarrying", name: "Mining & Quarrying", primary: "B", secondary: "A", note: "Supply contracts; mine development projects" , field: "Mining & Quarrying" },
  { key: "manufacturing", name: "Manufacturing", primary: "B", secondary: "D", note: "Make-to-order; after-sales install/service" , field: "Manufacturing" },
  { key: "industrial-automation-and-robotics", name: "Industrial Automation & Robotics", primary: "A", secondary: "D", note: "Integration projects; then service & calibration" , field: "Industrial Automation & Robotics" },
  { key: "automotive-and-aerospace-manufacturing", name: "Automotive & Aerospace Manufacturing", primary: "B", secondary: "", note: "" , field: "Automotive & Aerospace Manufacturing" },
  { key: "energy-and-utilities", name: "Energy & Utilities", primary: "A", secondary: "G", note: "EPC build; then O&M contracts" , field: "Energy & Utilities (Electricity, Gas)" },
  { key: "oil-gas-and-petrochemicals-epc", name: "Oil, Gas & Petrochemicals (EPC)", primary: "A", secondary: "G", note: "EPC; turnarounds as recurring" , field: "Oil, Gas & Petrochemicals (EPC)" },
  { key: "water-supply-sewerage-and-waste-mgmt", name: "Water Supply, Sewerage & Waste Mgmt", primary: "A", secondary: "G", note: "Network projects; collection contracts" , field: "Water Supply, Sewerage & Waste Management" },
  { key: "construction-and-contracting", name: "Construction & Contracting", primary: "A", secondary: "", note: "The archetypal Template A user" , field: "Construction & Contracting" },
  { key: "wholesale-and-retail-trade", name: "Wholesale & Retail Trade", primary: "C", secondary: "D", note: "Trading; appliance installation as service" , field: "Wholesale & Retail Trade" },
  { key: "transportation-logistics-and-storage", name: "Transportation, Logistics & Storage", primary: "F", secondary: "G", note: "Job files; warehousing contracts" , field: "Transportation, Logistics & Storage" },
  { key: "hospitality-and-food-services", name: "Hospitality & Food Services", primary: "C", secondary: "G", note: "Catering orders; canteen contracts" , field: "Hospitality & Food Services" },
  { key: "information-technology-and-software", name: "Information Technology & Software", primary: "E", secondary: "D", note: "Development projects; integration & support" , field: "Information Technology & Software" },
  { key: "telecommunications", name: "Telecommunications", primary: "A", secondary: "G", note: "Rollout projects; managed services" , field: "Telecommunications" },
  { key: "media-publishing-and-creative", name: "Media, Publishing & Creative", primary: "E", secondary: "", note: "Campaigns and productions" , field: "Media, Publishing & Creative Production" },
  { key: "financial-services-and-insurance", name: "Financial Services & Insurance", primary: "E", secondary: "G", note: "Advisory; retainers" , field: "Financial Services & Insurance" },
  { key: "real-estate-and-property-development", name: "Real Estate & Property Development", primary: "A", secondary: "G", note: "Development; property management" , field: "Real Estate & Property Development" },
  { key: "professional-scientific-and-technical", name: "Professional, Scientific & Technical", primary: "E", secondary: "", note: "" , field: "Professional, Scientific & Technical Services" },
  { key: "management-consulting", name: "Management Consulting", primary: "E", secondary: "G", note: "Engagements; retainers" , field: "Management Consulting" },
  { key: "administrative-and-support-services", name: "Administrative & Support Services", primary: "G", secondary: "D", note: "FM/security/cleaning; ad-hoc jobs" , field: "Administrative & Support Services" },
  { key: "public-administration-and-defense", name: "Public Administration & Defense", primary: "A", secondary: "E", note: "Public works; advisory" , field: "Public Administration & Defense" },
  { key: "education-and-training", name: "Education & Training", primary: "E", secondary: "G", note: "Programs; term contracts" , field: "Education & Training" },
  { key: "healthcare-and-social-services", name: "Healthcare & Social Services", primary: "D", secondary: "G", note: "Equipment install/calibration; maintenance" , field: "Healthcare & Social Services" },
  { key: "arts-entertainment-and-events", name: "Arts, Entertainment & Events", primary: "A", secondary: "E", note: "Stand/stage build; creative work" , field: "Arts, Entertainment & Events" },
  { key: "personal-and-other-services", name: "Personal & Other Services", primary: "D", secondary: "", note: "Diagnose, repair, deliver, invoice" , field: "Personal & Other Services" },
]);

/**
 * By the trade a STUDIO stores, which is the display name and not the slug.
 *
 * `studio.fieldOfWork` holds a `FIELD_ACTION_MATRIX` key — that is what the
 * Settings screen writes and what every existing studio already carries — so
 * this is the door from a studio's own trade to its flow template, and through
 * the template's stages to the sections that trade actually needs.
 */
export const industryByField = (field: string): IndustryEntry | null =>
  INDUSTRIES.find((i) => i.field === field) || null;

/** By key, for resolving a stored deal's industry back to its default template. */
export const industryByKey = (key: string): IndustryEntry | null =>
  INDUSTRIES.find((i) => i.key === key) || null;

/**
 * The template a new deal in this industry starts on, or "" when the industry
 * is unknown — which is a real case rather than an error: a studio may have
 * added its own trade, and a deal may name an industry no longer in the seed.
 * The caller decides what to do with "", and every caller must, because there
 * is no sensible universal default across seven genuinely different flows.
 */
export const defaultTemplateFor = (key: string): string => industryByKey(key)?.primary || "";

/**
 * WELL-FORMEDNESS, ASSERTED RATHER THAN ASSUMED. Pure, and takes the template
 * ids as an argument so this file stays data-only.
 *
 * An industry pointing at a template that does not exist is the failure worth
 * catching: every deal created in that industry would start on nothing, and the
 * symptom would be a deal with no stages rather than an error naming the row.
 */
export function industryProblems(
  knownTemplateIds: readonly string[],
  industries: readonly IndustryEntry[] = INDUSTRIES,
): string[] {
  const known = new Set(knownTemplateIds);
  const seen = new Set<string>();
  const problems: string[] = [];
  // TAKES THE LIST TO CHECK, defaulting to the seeded twenty-five. The same
  // rules must apply to a tenant's own row as to a seeded one — and the
  // tenant's is the one a person just typed, so it is the one more likely wrong.
  for (const i of industries) {
    if (seen.has(i.key)) problems.push(`industry "${i.key}" is listed twice`);
    seen.add(i.key);
    if (!known.has(i.primary)) problems.push(`industry "${i.key}": primary template "${i.primary}" does not exist`);
    if (i.secondary && !known.has(i.secondary)) {
      problems.push(`industry "${i.key}": secondary template "${i.secondary}" does not exist`);
    }
  }
  return problems;
}
