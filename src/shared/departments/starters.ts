// THE STARTER ORG CHART, one set per field of work.
//
// WHY THIS EXISTS. A studio's departments used to BE its sections — fifteen nav
// entries offered as an org chart, four of which render nothing at all and one
// of which (Tasks) is not a section. No company has that shape. A construction
// firm has Estimation, Site Execution, QA/QC and Plant; a hospital has Nursing,
// Pharmacy and Biomedical. So the register is the studio's own rows now, and
// this is what it starts from.
//
// A SEED, NOT A CEILING — the same law the industry map states. These rows are
// written into the studio's register once, when it is empty, and are ordinary
// records from that moment: renamed, re-parented, deleted, added to. Nothing
// re-reads this file to decide whether a studio's chart is "correct", because
// there is no such thing.
//
// AND IT NEVER OVERWRITES. Changing the field of work later does not re-seed —
// it offers what is missing, and adds only that. The precedent is the service
// action pool, which retires rather than deletes and warns before it unticks:
// a studio's edited org chart is worth at least the same manners.
//
// KEYED BY THE FIELD-OF-WORK STRING, because that is what `studio.fieldOfWork`
// stores — the display name from FIELDS_OF_WORK, not a slug. An unknown field
// and `Other` seed nothing, exactly as `actionsForField` returns nothing, and
// for the same reason: there is no row to apply and inventing one would be this
// file guessing at a trade it has never been told about.
//
// PURE VALUES, NO STORE, so the Master data screen and the seeding service both
// import it — the same reason `fieldsOfWork.ts` is shaped this way.

/**
 * One seeded department.
 *
 * `parent` NAMES A CODE, not an id, because ids do not exist until the rows are
 * written. The seeder resolves them in one pass, which is also what makes a
 * parent that names nothing a loud failure here rather than a dangling
 * `parentId` in somebody's live register.
 */
export type DepartmentSeed = {
  name: string;
  code: string;
  /** Code of this department's parent, or "" for a top-level department. */
  parent: string;
  /** Sections this department's work lives in. May be empty — Legal has none. */
  sectionKeys: readonly string[];
};

// THE BACK OFFICE EVERY TRADE HAS, written once. Seventeen roles appear in all
// twenty-five fields of the role research and every one of them sits in one of
// these three — so restating them per field would be twenty-five copies free to
// disagree about what Finance is called.
//
// EXPORTED, because it is also what a studio with NO field of work gets.
// `createStudio` has never set one, so "not chosen yet" is the state every
// studio starts in, and an empty register there means an empty DEPARTMENT
// dropdown and nobody placeable anywhere — worse than the sixteen wrong
// departments this replaced. These three are not a guess about a trade: they
// are the part of the chart that was identical in all twenty-five, which is
// exactly why they were factored out. The operating line still waits until the
// studio says what it does.
//
// Procurement is NOT here. A contractor and a manufacturer buy for a living; a
// consultancy and an insurer do not have a procurement department at all, and a
// seeded row nobody needs is the dead capability this product keeps deleting.
// Fields that buy name it themselves below.
export const UNIVERSAL_DEPARTMENTS: readonly DepartmentSeed[] = Object.freeze([
  { name: "Finance & Accounting", code: "FIN", parent: "", sectionKeys: ["finance"] },
  { name: "Human Resources", code: "HR", parent: "", sectionKeys: ["hr"] },
  { name: "Administration", code: "ADM", parent: "", sectionKeys: ["administration"] },
]);

// Buying and holding stock, for the fields that do it as a department rather
// than as an errand. Named separately from BACK_OFFICE for the reason above.
const SUPPLY: readonly DepartmentSeed[] = Object.freeze([
  { name: "Procurement", code: "PRC", parent: "", sectionKeys: ["procurement"] },
  { name: "Stores & Warehouse", code: "STR", parent: "", sectionKeys: ["inventory"] },
]);

const spine = (...extra: readonly DepartmentSeed[]): readonly DepartmentSeed[] =>
  Object.freeze([...extra, ...UNIVERSAL_DEPARTMENTS]);

const trading = (...extra: readonly DepartmentSeed[]): readonly DepartmentSeed[] =>
  Object.freeze([...extra, ...SUPPLY, ...UNIVERSAL_DEPARTMENTS]);

/**
 * Field of work → the departments a company in that trade usually has.
 *
 * Insertion order is display order, and it is deliberate: the operating line
 * first, the back office last, because the first question a studio asks of this
 * list is "where does the work happen".
 */
export const DEPARTMENT_STARTERS: Record<string, readonly DepartmentSeed[]> = {
  "Agriculture, Forestry & Fishing": trading(
    { name: "Farm Operations", code: "FARM", parent: "", sectionKeys: ["projects", "field-service"] },
    { name: "Agronomy & Technical", code: "AGR", parent: "FARM", sectionKeys: ["engineering-docs"] },
    { name: "Irrigation & Machinery", code: "IRR", parent: "FARM", sectionKeys: ["assets", "field-service"] },
    { name: "Packhouse & Post-Harvest", code: "PACK", parent: "", sectionKeys: ["inventory", "quality-hse"] },
    { name: "Sales & Marketing", code: "SLS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Mining & Quarrying": trading(
    { name: "Mine Operations", code: "MIN", parent: "", sectionKeys: ["projects", "field-service"] },
    { name: "Drill & Blast", code: "DNB", parent: "MIN", sectionKeys: ["field-service"] },
    { name: "Processing Plant", code: "PLT", parent: "", sectionKeys: ["manufacturing"] },
    { name: "Geology & Survey", code: "GEO", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Mine Engineering & Maintenance", code: "MNT", parent: "", sectionKeys: ["assets", "maintenance", "field-service"] },
    { name: "HSE & Community", code: "HSE", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Sales & Logistics", code: "SLS", parent: "", sectionKeys: ["crm-sales", "logistics"] },
  ),

  "Manufacturing": trading(
    { name: "Production", code: "PRD", parent: "", sectionKeys: ["manufacturing"] },
    { name: "Assembly", code: "ASM", parent: "PRD", sectionKeys: ["manufacturing"] },
    { name: "Machine Shop", code: "MCH", parent: "PRD", sectionKeys: ["manufacturing"] },
    { name: "Design & Engineering", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Production Planning", code: "PPC", parent: "", sectionKeys: ["projects"] },
    { name: "Maintenance", code: "MNT", parent: "", sectionKeys: ["assets", "maintenance"] },
    { name: "Quality Assurance", code: "QA", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Sales & After-Sales", code: "SLS", parent: "", sectionKeys: ["crm-sales", "field-service"] },
    { name: "Dispatch & Logistics", code: "LOG", parent: "", sectionKeys: ["logistics"] },
  ),

  "Industrial Automation & Robotics": trading(
    { name: "Controls Engineering", code: "CTL", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Software & SCADA", code: "SW", parent: "CTL", sectionKeys: ["engineering-docs"] },
    { name: "Panel Shop", code: "PNL", parent: "", sectionKeys: ["manufacturing"] },
    { name: "Project Delivery", code: "PRJ", parent: "", sectionKeys: ["projects"] },
    { name: "Installation & Commissioning", code: "CMS", parent: "PRJ", sectionKeys: ["field-service"] },
    { name: "Service & Support", code: "SVC", parent: "", sectionKeys: ["field-service"] },
    { name: "Sales & Applications", code: "SLS", parent: "", sectionKeys: ["crm-sales", "tendering"] },
  ),

  "Automotive & Aerospace Manufacturing": trading(
    { name: "Programme Management", code: "PGM", parent: "", sectionKeys: ["projects"] },
    { name: "Engineering & Design", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Manufacturing Engineering", code: "MFE", parent: "ENG", sectionKeys: ["engineering-docs"] },
    { name: "Production", code: "PRD", parent: "", sectionKeys: ["manufacturing"] },
    { name: "Final Assembly", code: "FAL", parent: "PRD", sectionKeys: ["manufacturing"] },
    { name: "Quality & Airworthiness", code: "QA", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Supplier Quality", code: "SQA", parent: "QA", sectionKeys: ["procurement", "quality-hse"] },
    { name: "Maintenance & Tooling", code: "MNT", parent: "", sectionKeys: ["assets", "maintenance"] },
    { name: "Aftermarket & MRO", code: "MRO", parent: "", sectionKeys: ["field-service"] },
  ),

  "Energy & Utilities (Electricity, Gas)": trading(
    { name: "Generation", code: "GEN", parent: "", sectionKeys: ["manufacturing", "field-service"] },
    { name: "Transmission & Distribution", code: "TND", parent: "", sectionKeys: ["field-service", "assets"] },
    { name: "Network Operations", code: "NOC", parent: "TND", sectionKeys: ["field-service"] },
    { name: "Capital Projects", code: "PRJ", parent: "", sectionKeys: ["projects", "tendering"] },
    { name: "Engineering & Design", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Metering & Customer Connections", code: "MTR", parent: "", sectionKeys: ["crm-sales", "field-service"] },
    { name: "Maintenance & Asset Management", code: "MNT", parent: "", sectionKeys: ["assets", "maintenance"] },
    { name: "HSE & Compliance", code: "HSE", parent: "", sectionKeys: ["quality-hse"] },
  ),

  "Oil, Gas & Petrochemicals (EPC)": trading(
    { name: "Projects & EPC Delivery", code: "PRJ", parent: "", sectionKeys: ["projects"] },
    { name: "Construction", code: "CON", parent: "PRJ", sectionKeys: ["field-service"] },
    { name: "Commissioning & Start-Up", code: "CMS", parent: "PRJ", sectionKeys: ["field-service"] },
    { name: "Engineering", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Estimation & Proposals", code: "EST", parent: "", sectionKeys: ["tendering"] },
    { name: "Operations & Turnarounds", code: "OPS", parent: "", sectionKeys: ["field-service"] },
    { name: "Inspection & Integrity", code: "INS", parent: "", sectionKeys: ["quality-hse"] },
    { name: "HSSE", code: "HSE", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Project Controls", code: "PCT", parent: "PRJ", sectionKeys: ["projects", "finance"] },
  ),

  "Water Supply, Sewerage & Waste Management": trading(
    { name: "Treatment Operations", code: "TRT", parent: "", sectionKeys: ["manufacturing", "field-service"] },
    { name: "Networks & Pumping", code: "NET", parent: "", sectionKeys: ["field-service", "assets"] },
    { name: "Collection Services", code: "COL", parent: "", sectionKeys: ["logistics", "field-service"] },
    { name: "Capital Projects", code: "PRJ", parent: "", sectionKeys: ["projects", "tendering"] },
    { name: "Engineering & Design", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Laboratory & Water Quality", code: "LAB", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Fleet & Maintenance", code: "FLT", parent: "", sectionKeys: ["logistics", "assets", "maintenance"] },
  ),

  "Construction & Contracting": trading(
    { name: "Estimation & Tendering", code: "EST", parent: "", sectionKeys: ["tendering"] },
    { name: "Site Execution", code: "OPS", parent: "", sectionKeys: ["projects", "field-service"] },
    { name: "Civil Works", code: "CIV", parent: "OPS", sectionKeys: ["projects"] },
    { name: "MEP", code: "MEP", parent: "OPS", sectionKeys: ["projects"] },
    { name: "Engineering & Design", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Planning & Cost Control", code: "PLN", parent: "", sectionKeys: ["projects", "finance"] },
    { name: "QA/QC & HSE", code: "QHS", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Plant & Equipment", code: "PLT", parent: "", sectionKeys: ["assets", "logistics"] },
    { name: "Business Development", code: "BD", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Wholesale & Retail Trade": trading(
    { name: "Buying & Merchandising", code: "BUY", parent: "", sectionKeys: ["procurement", "inventory"] },
    { name: "Retail Operations", code: "RET", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Wholesale & Key Accounts", code: "WHL", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Distribution & Delivery", code: "DIS", parent: "", sectionKeys: ["logistics"] },
    { name: "Installation & Service", code: "SVC", parent: "", sectionKeys: ["field-service"] },
    { name: "Customer Service", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Transportation, Logistics & Storage": trading(
    { name: "Freight Operations", code: "FRT", parent: "", sectionKeys: ["logistics"] },
    { name: "Air & Ocean", code: "AOF", parent: "FRT", sectionKeys: ["logistics"] },
    { name: "Land Transport & Fleet", code: "FLT", parent: "FRT", sectionKeys: ["logistics", "assets"] },
    { name: "Warehousing", code: "WHS", parent: "", sectionKeys: ["inventory"] },
    { name: "Customs & Compliance", code: "CUS", parent: "", sectionKeys: ["logistics", "quality-hse"] },
    { name: "Commercial & Pricing", code: "COM", parent: "", sectionKeys: ["crm-sales", "tendering"] },
    { name: "Customer Service", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Hospitality & Food Services": trading(
    { name: "Food & Beverage", code: "FNB", parent: "", sectionKeys: ["field-service"] },
    { name: "Kitchen", code: "KIT", parent: "FNB", sectionKeys: ["manufacturing"] },
    { name: "Front Office", code: "FO", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Housekeeping", code: "HK", parent: "", sectionKeys: ["field-service"] },
    { name: "Banqueting & Events", code: "EVT", parent: "", sectionKeys: ["projects", "crm-sales"] },
    { name: "Engineering & Maintenance", code: "MNT", parent: "", sectionKeys: ["assets", "maintenance", "field-service"] },
    { name: "Food Safety & Hygiene", code: "FS", parent: "", sectionKeys: ["quality-hse"] },
  ),

  "Information Technology & Software": spine(
    { name: "Engineering", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Product & Design", code: "PRD", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Professional Services", code: "PS", parent: "", sectionKeys: ["projects"] },
    { name: "Implementation & Delivery", code: "DEL", parent: "PS", sectionKeys: ["projects"] },
    { name: "Support & Managed Services", code: "SUP", parent: "", sectionKeys: ["field-service"] },
    { name: "Infrastructure & Security", code: "INF", parent: "", sectionKeys: ["assets"] },
    { name: "Quality Engineering", code: "QA", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Sales & Presales", code: "SLS", parent: "", sectionKeys: ["crm-sales", "tendering"] },
  ),

  "Telecommunications": trading(
    { name: "Network Deployment", code: "ROL", parent: "", sectionKeys: ["projects"] },
    { name: "Network Planning & Design", code: "PLN", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Network Operations", code: "NOC", parent: "", sectionKeys: ["field-service"] },
    { name: "Field Maintenance", code: "FLD", parent: "NOC", sectionKeys: ["field-service"] },
    { name: "Core & Transmission", code: "CORE", parent: "", sectionKeys: ["assets"] },
    { name: "Enterprise Solutions", code: "ENT", parent: "", sectionKeys: ["crm-sales", "tendering"] },
    { name: "Customer Care", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Media, Publishing & Creative Production": spine(
    { name: "Creative", code: "CRE", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Production", code: "PRD", parent: "", sectionKeys: ["projects"] },
    { name: "Post-Production", code: "POST", parent: "PRD", sectionKeys: ["projects"] },
    { name: "Editorial", code: "EDT", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Client Services", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Studio & Equipment", code: "STU", parent: "", sectionKeys: ["assets", "inventory"] },
  ),

  "Financial Services & Insurance": spine(
    { name: "Retail & Corporate Banking", code: "BNK", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Underwriting", code: "UW", parent: "", sectionKeys: ["projects"] },
    { name: "Claims", code: "CLM", parent: "", sectionKeys: ["field-service"] },
    { name: "Credit & Risk", code: "RSK", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Compliance & Financial Crime", code: "CMP", parent: "RSK", sectionKeys: ["quality-hse"] },
    { name: "Operations & Back Office", code: "OPS", parent: "", sectionKeys: ["projects"] },
    { name: "Customer Service", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Real Estate & Property Development": trading(
    { name: "Development", code: "DEV", parent: "", sectionKeys: ["projects"] },
    { name: "Design & Delivery", code: "DEL", parent: "DEV", sectionKeys: ["engineering-docs", "projects"] },
    { name: "Cost & Commercial", code: "QS", parent: "DEV", sectionKeys: ["tendering", "finance"] },
    { name: "Sales & Leasing", code: "SLS", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Property Management", code: "PM", parent: "", sectionKeys: ["field-service", "assets"] },
    { name: "Facilities & Maintenance", code: "FM", parent: "PM", sectionKeys: ["field-service", "maintenance"] },
  ),

  "Professional, Scientific & Technical Services": spine(
    { name: "Engineering & Design", code: "ENG", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Project Delivery", code: "PRJ", parent: "", sectionKeys: ["projects"] },
    { name: "Surveying & Site Services", code: "SUR", parent: "", sectionKeys: ["field-service"] },
    { name: "Laboratory & Testing", code: "LAB", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Bids & Proposals", code: "BID", parent: "", sectionKeys: ["tendering"] },
    { name: "Client Development", code: "BD", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Management Consulting": spine(
    { name: "Consulting Delivery", code: "DEL", parent: "", sectionKeys: ["projects"] },
    { name: "Strategy Practice", code: "STR", parent: "DEL", sectionKeys: ["projects"] },
    { name: "Technology Practice", code: "TECH", parent: "DEL", sectionKeys: ["projects"] },
    { name: "Research & Knowledge", code: "RES", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Business Development", code: "BD", parent: "", sectionKeys: ["crm-sales", "tendering"] },
  ),

  "Administrative & Support Services": trading(
    { name: "Contract Operations", code: "OPS", parent: "", sectionKeys: ["projects", "field-service"] },
    { name: "Hard Services", code: "HRD", parent: "OPS", sectionKeys: ["field-service", "assets", "maintenance"] },
    { name: "Soft Services", code: "SFT", parent: "OPS", sectionKeys: ["field-service"] },
    { name: "Security Services", code: "SEC", parent: "", sectionKeys: ["field-service"] },
    { name: "Helpdesk & Scheduling", code: "HD", parent: "", sectionKeys: ["field-service"] },
    { name: "Mobilisation & Manpower", code: "MOB", parent: "", sectionKeys: ["hr", "projects"] },
    { name: "Bids & Contracts", code: "BID", parent: "", sectionKeys: ["tendering", "crm-sales"] },
  ),

  "Public Administration & Defense": trading(
    { name: "Public Works", code: "PW", parent: "", sectionKeys: ["projects"] },
    { name: "Licensing & Permits", code: "LIC", parent: "", sectionKeys: ["field-service"] },
    { name: "Inspection & Enforcement", code: "INS", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Planning & Policy", code: "PLN", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Tenders & Contracts", code: "TND", parent: "", sectionKeys: ["tendering"] },
    { name: "Citizen Services", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),

  "Education & Training": spine(
    { name: "Academic", code: "ACD", parent: "", sectionKeys: ["projects"] },
    { name: "Curriculum & Assessment", code: "CUR", parent: "ACD", sectionKeys: ["engineering-docs"] },
    { name: "Corporate Training", code: "TRN", parent: "", sectionKeys: ["projects", "crm-sales"] },
    { name: "Student Services", code: "STU", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Admissions", code: "ADS", parent: "STU", sectionKeys: ["crm-sales"] },
    { name: "Campus & Facilities", code: "FAC", parent: "", sectionKeys: ["assets", "maintenance", "field-service"] },
    { name: "Quality & Accreditation", code: "QA", parent: "", sectionKeys: ["quality-hse"] },
  ),

  "Healthcare & Social Services": trading(
    { name: "Clinical Services", code: "CLN", parent: "", sectionKeys: ["field-service"] },
    { name: "Nursing", code: "NUR", parent: "CLN", sectionKeys: ["field-service"] },
    { name: "Pharmacy", code: "PHM", parent: "", sectionKeys: ["inventory"] },
    { name: "Laboratory & Imaging", code: "LAB", parent: "", sectionKeys: ["quality-hse"] },
    { name: "Biomedical Engineering", code: "BME", parent: "", sectionKeys: ["assets", "maintenance", "field-service"] },
    { name: "Patient Services & Billing", code: "PS", parent: "", sectionKeys: ["crm-sales", "finance"] },
    { name: "Quality & Infection Control", code: "QA", parent: "", sectionKeys: ["quality-hse"] },
  ),

  "Arts, Entertainment & Events": trading(
    { name: "Event Production", code: "PRD", parent: "", sectionKeys: ["projects"] },
    { name: "Technical & Staging", code: "TEC", parent: "PRD", sectionKeys: ["field-service"] },
    { name: "Fabrication & Workshop", code: "FAB", parent: "", sectionKeys: ["manufacturing"] },
    { name: "Design & Creative", code: "CRE", parent: "", sectionKeys: ["engineering-docs"] },
    { name: "Venue Operations", code: "VEN", parent: "", sectionKeys: ["field-service", "assets"] },
    { name: "Sales & Sponsorship", code: "SLS", parent: "", sectionKeys: ["crm-sales"] },
    { name: "Safety & Crowd Management", code: "HSE", parent: "", sectionKeys: ["quality-hse"] },
  ),

  "Personal & Other Services": trading(
    { name: "Service Operations", code: "OPS", parent: "", sectionKeys: ["field-service"] },
    { name: "Workshop & Repairs", code: "WKS", parent: "OPS", sectionKeys: ["manufacturing", "field-service"] },
    { name: "Collection & Delivery", code: "DEL", parent: "", sectionKeys: ["logistics"] },
    { name: "Customer Service", code: "CS", parent: "", sectionKeys: ["crm-sales"] },
  ),
};

/**
 * The starter departments for a field of work, or none.
 *
 * A FRESH ARRAY EVERY CALL, like `actionsForField`: the seeder mutates its own
 * copy while resolving parent codes into ids, and a frozen constant handed out
 * by reference is one careless `.map` away from being the studio's register.
 */
export function departmentsForField(field: string): DepartmentSeed[] {
  return [...(DEPARTMENT_STARTERS[field] ?? [])].map((d) => ({ ...d }));
}

/**
 * WELL-FORMEDNESS, ASSERTED RATHER THAN ASSUMED — the same shape, and the same
 * argument, as `industryProblems`. Pure, and takes the known section keys as an
 * argument so this file stays data-only.
 *
 * Three failures are worth catching before a studio meets them, and each is
 * silent in its own way:
 *
 *   a duplicate code    — the register refuses duplicates, so the seed would
 *                         write some rows and refuse the rest, leaving a studio
 *                         with half an org chart and no error anywhere
 *   an unknown parent   — a dangling parentId, which the scope tree then reads
 *                         as a top-level department: MORE visibility, not less
 *   an unknown section  — a department pointing at a screen that does not
 *                         exist, which reads on screen as "handles nothing"
 */
export function departmentSeedProblems(
  knownSectionKeys: readonly string[],
  starters: Record<string, readonly DepartmentSeed[]> = DEPARTMENT_STARTERS,
): string[] {
  const known = new Set(knownSectionKeys);
  const problems: string[] = [];

  for (const [field, seeds] of Object.entries(starters)) {
    const codes = new Set<string>();
    for (const d of seeds) {
      if (!d.name) problems.push(`${field}: a department has no name`);
      if (!d.code) problems.push(`${field}: "${d.name}" has no code`);
      if (codes.has(d.code)) problems.push(`${field}: code "${d.code}" is used twice`);
      codes.add(d.code);
      for (const k of d.sectionKeys) {
        if (!known.has(k)) problems.push(`${field}: "${d.name}" names section "${k}", which does not exist`);
      }
    }
    // Parents are checked in a second pass so a child may be declared before
    // its parent — the seeds read best operating-line first, and forcing
    // parents to come first would order the list by the tree rather than by
    // how a studio reads it.
    for (const d of seeds) {
      if (d.parent && !codes.has(d.parent)) {
        problems.push(`${field}: "${d.name}" names parent "${d.parent}", which is not in this field`);
      }
      if (d.parent && d.parent === d.code) problems.push(`${field}: "${d.name}" is its own parent`);
    }
  }
  return problems;
}
