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
};

export const INDUSTRIES: readonly IndustryEntry[] = Object.freeze([
  { key: "agriculture-forestry-and-fishing", name: "Agriculture, Forestry & Fishing", primary: "B", secondary: "G", note: "Produce-to-order; seasonal service contracts" },
  { key: "mining-and-quarrying", name: "Mining & Quarrying", primary: "B", secondary: "A", note: "Supply contracts; mine development projects" },
  { key: "manufacturing", name: "Manufacturing", primary: "B", secondary: "D", note: "Make-to-order; after-sales install/service" },
  { key: "industrial-automation-and-robotics", name: "Industrial Automation & Robotics", primary: "A", secondary: "D", note: "Integration projects; then service & calibration" },
  { key: "automotive-and-aerospace-manufacturing", name: "Automotive & Aerospace Manufacturing", primary: "B", secondary: "", note: "" },
  { key: "energy-and-utilities", name: "Energy & Utilities", primary: "A", secondary: "G", note: "EPC build; then O&M contracts" },
  { key: "oil-gas-and-petrochemicals-epc", name: "Oil, Gas & Petrochemicals (EPC)", primary: "A", secondary: "G", note: "EPC; turnarounds as recurring" },
  { key: "water-supply-sewerage-and-waste-mgmt", name: "Water Supply, Sewerage & Waste Mgmt", primary: "A", secondary: "G", note: "Network projects; collection contracts" },
  { key: "construction-and-contracting", name: "Construction & Contracting", primary: "A", secondary: "", note: "The archetypal Template A user" },
  { key: "wholesale-and-retail-trade", name: "Wholesale & Retail Trade", primary: "C", secondary: "D", note: "Trading; appliance installation as service" },
  { key: "transportation-logistics-and-storage", name: "Transportation, Logistics & Storage", primary: "F", secondary: "G", note: "Job files; warehousing contracts" },
  { key: "hospitality-and-food-services", name: "Hospitality & Food Services", primary: "C", secondary: "G", note: "Catering orders; canteen contracts" },
  { key: "information-technology-and-software", name: "Information Technology & Software", primary: "E", secondary: "D", note: "Development projects; integration & support" },
  { key: "telecommunications", name: "Telecommunications", primary: "A", secondary: "G", note: "Rollout projects; managed services" },
  { key: "media-publishing-and-creative", name: "Media, Publishing & Creative", primary: "E", secondary: "", note: "Campaigns and productions" },
  { key: "financial-services-and-insurance", name: "Financial Services & Insurance", primary: "E", secondary: "G", note: "Advisory; retainers" },
  { key: "real-estate-and-property-development", name: "Real Estate & Property Development", primary: "A", secondary: "G", note: "Development; property management" },
  { key: "professional-scientific-and-technical", name: "Professional, Scientific & Technical", primary: "E", secondary: "", note: "" },
  { key: "management-consulting", name: "Management Consulting", primary: "E", secondary: "G", note: "Engagements; retainers" },
  { key: "administrative-and-support-services", name: "Administrative & Support Services", primary: "G", secondary: "D", note: "FM/security/cleaning; ad-hoc jobs" },
  { key: "public-administration-and-defense", name: "Public Administration & Defense", primary: "A", secondary: "E", note: "Public works; advisory" },
  { key: "education-and-training", name: "Education & Training", primary: "E", secondary: "G", note: "Programs; term contracts" },
  { key: "healthcare-and-social-services", name: "Healthcare & Social Services", primary: "D", secondary: "G", note: "Equipment install/calibration; maintenance" },
  { key: "arts-entertainment-and-events", name: "Arts, Entertainment & Events", primary: "A", secondary: "E", note: "Stand/stage build; creative work" },
  { key: "personal-and-other-services", name: "Personal & Other Services", primary: "D", secondary: "", note: "Diagnose, repair, deliver, invoice" },
]);

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
export function industryProblems(knownTemplateIds: readonly string[]): string[] {
  const known = new Set(knownTemplateIds);
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const i of INDUSTRIES) {
    if (seen.has(i.key)) problems.push(`industry "${i.key}" is listed twice`);
    seen.add(i.key);
    if (!known.has(i.primary)) problems.push(`industry "${i.key}": primary template "${i.primary}" does not exist`);
    if (i.secondary && !known.has(i.secondary)) {
      problems.push(`industry "${i.key}": secondary template "${i.secondary}" does not exist`);
    }
  }
  return problems;
}
