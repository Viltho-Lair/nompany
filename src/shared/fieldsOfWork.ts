// THE MARKET REFERENCE (UN ISIC Rev. 4, grouped): 25 fields of work and the 20
// core service actions each typically performs. A fixed platform standard, not
// studio-editable — a studio stores only which field it chose and the pool that
// seeds. Pure values, no Redis, so a client Settings component and a server
// route may both import it. Source: Company_Fields_and_Project_Actions.xlsx
// (sheet "Field x Action Matrix"), copied verbatim from spec Appendix A —
// see docs/superpowers/specs/2026-08-26-service-actions-industry-matrix-design.md.
// A test in tests/suite.mjs proves every matrix value is one of these 20 and
// every field below has a row, so the constant cannot drift internally.

export const SERVICE_ACTIONS = [
  "Consulting & Advisory", "Survey & Assessment", "Design & Engineering",
  "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly",
  "Programming & Configuration", "Construction & Civil Works",
  "Demolition & Dismantling", "Installation", "Integration",
  "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection",
  "Commissioning", "Training", "Operation", "Maintenance & Repair",
  "Upgrading & Retrofit", "Decommissioning & Disposal",
] as const;

export const OTHER_FIELD = "Other";

// field → ticked actions, copied verbatim from spec Appendix A. Insertion
// order here is display order, and FIELDS_OF_WORK below is derived from it so
// the two can never disagree about which fields exist.
export const FIELD_ACTION_MATRIX: Record<string, readonly string[]> = {
  "Agriculture, Forestry & Fishing": ["Survey & Assessment", "Procurement & Sourcing", "Assembly", "Installation", "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection", "Operation", "Maintenance & Repair"],
  "Mining & Quarrying": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Construction & Civil Works", "Demolition & Dismantling", "Installation", "Delivery & Transportation", "Testing & Inspection", "Operation", "Maintenance & Repair", "Decommissioning & Disposal"],
  "Manufacturing": ["Design & Engineering", "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly", "Programming & Configuration", "Installation", "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection", "Commissioning", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Industrial Automation & Robotics": ["Consulting & Advisory", "Design & Engineering", "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly", "Programming & Configuration", "Installation", "Integration", "Testing & Inspection", "Commissioning", "Training", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Automotive & Aerospace Manufacturing": ["Design & Engineering", "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly", "Programming & Configuration", "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection", "Maintenance & Repair"],
  "Energy & Utilities (Electricity, Gas)": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Construction & Civil Works", "Installation", "Integration", "Testing & Inspection", "Commissioning", "Training", "Operation", "Maintenance & Repair", "Upgrading & Retrofit", "Decommissioning & Disposal"],
  "Oil, Gas & Petrochemicals (EPC)": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Fabrication / Manufacturing", "Construction & Civil Works", "Installation", "Integration", "Testing & Inspection", "Commissioning", "Training", "Maintenance & Repair", "Decommissioning & Disposal"],
  "Water Supply, Sewerage & Waste Management": ["Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Construction & Civil Works", "Installation", "Delivery & Transportation", "Testing & Inspection", "Commissioning", "Operation", "Maintenance & Repair", "Decommissioning & Disposal"],
  "Construction & Contracting": ["Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Assembly", "Construction & Civil Works", "Demolition & Dismantling", "Installation", "Delivery & Transportation", "Testing & Inspection", "Commissioning", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Wholesale & Retail Trade": ["Procurement & Sourcing", "Assembly", "Installation", "Delivery & Transportation", "Warehousing & Storage", "Maintenance & Repair"],
  "Transportation, Logistics & Storage": ["Survey & Assessment", "Assembly", "Demolition & Dismantling", "Installation", "Delivery & Transportation", "Warehousing & Storage"],
  "Hospitality & Food Services": ["Procurement & Sourcing", "Assembly", "Installation", "Delivery & Transportation", "Operation"],
  "Information Technology & Software": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Programming & Configuration", "Installation", "Integration", "Testing & Inspection", "Commissioning", "Training", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Telecommunications": ["Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Programming & Configuration", "Construction & Civil Works", "Installation", "Integration", "Testing & Inspection", "Commissioning", "Training", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Media, Publishing & Creative Production": ["Consulting & Advisory", "Design & Engineering", "Procurement & Sourcing", "Delivery & Transportation", "Testing & Inspection"],
  "Financial Services & Insurance": ["Consulting & Advisory", "Survey & Assessment", "Testing & Inspection", "Operation"],
  "Real Estate & Property Development": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Operation", "Maintenance & Repair", "Upgrading & Retrofit"],
  "Professional, Scientific & Technical Services": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Testing & Inspection"],
  "Management Consulting": ["Consulting & Advisory", "Survey & Assessment", "Training"],
  "Administrative & Support Services": ["Survey & Assessment", "Installation", "Delivery & Transportation", "Operation", "Maintenance & Repair"],
  "Public Administration & Defense": ["Consulting & Advisory", "Survey & Assessment", "Testing & Inspection", "Operation"],
  "Education & Training": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Training"],
  "Healthcare & Social Services": ["Consulting & Advisory", "Survey & Assessment", "Installation", "Delivery & Transportation", "Testing & Inspection", "Training", "Operation", "Maintenance & Repair"],
  "Arts, Entertainment & Events": ["Design & Engineering", "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly", "Demolition & Dismantling", "Installation", "Delivery & Transportation", "Testing & Inspection", "Operation"],
  "Personal & Other Services": ["Survey & Assessment", "Installation", "Delivery & Transportation", "Maintenance & Repair"],
};

export const FIELDS_OF_WORK = Object.keys(FIELD_ACTION_MATRIX);

// "Other" and any unknown field seed nothing — there is no matrix row to
// apply. A fresh array every call: callers mutate their own copy of the pool
// (e.g. Settings building the seeded selection) without touching the constant.
export function actionsForField(field: string): string[] {
  return [...(FIELD_ACTION_MATRIX[field] ?? [])];
}
