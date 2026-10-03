// THE FIELDS OF WORK (UN ISIC Rev. 4, grouped): the 25 trades a studio can say
// it works in. A fixed platform standard, not studio-editable — a studio stores
// only which one it chose. Pure values, so a client component and a server
// route may both import it. Each built-in industry specialism names one of
// these as its `field` (shared/industryCatalogue), which is how a specialism
// reaches the departments, roles and deal flow a trade starts with.
//
// THE TWENTY SERVICE ACTIONS ARE GONE (03/10/2026, the owner). This file held a
// field × action matrix (`FIELD_ACTION_MATRIX`, `SERVICE_ACTIONS`,
// `actionsForField`) that seeded each studio's service-action pool and, through
// shared/tradeSections, its starting departments. The pool, the ticket's
// services and the action-to-section map were removed together; the industry's
// profile decides departments now. The fields themselves stay.

export const OTHER_FIELD = "Other";

// Insertion order is display order.
export const FIELDS_OF_WORK: readonly string[] = [
  "Agriculture, Forestry & Fishing",
  "Mining & Quarrying",
  "Manufacturing",
  "Industrial Automation & Robotics",
  "Automotive & Aerospace Manufacturing",
  "Energy & Utilities (Electricity, Gas)",
  "Oil, Gas & Petrochemicals (EPC)",
  "Water Supply, Sewerage & Waste Management",
  "Construction & Contracting",
  "Wholesale & Retail Trade",
  "Transportation, Logistics & Storage",
  "Hospitality & Food Services",
  "Information Technology & Software",
  "Telecommunications",
  "Media, Publishing & Creative Production",
  "Financial Services & Insurance",
  "Real Estate & Property Development",
  "Professional, Scientific & Technical Services",
  "Management Consulting",
  "Administrative & Support Services",
  "Public Administration & Defense",
  "Education & Training",
  "Healthcare & Social Services",
  "Arts, Entertainment & Events",
  "Personal & Other Services",
];
