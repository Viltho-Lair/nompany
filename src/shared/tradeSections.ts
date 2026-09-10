// WHICH SECTIONS A TRADE ACTUALLY NEEDS.
//
// The owner's instruction, 09/09/2026: "Sections are displayed fully no matter
// what industry is picked, which is wrong." Every studio was seeded all sixty
// section keys and shown all fourteen departments, so a management consultancy
// met Manufacturing & Production and a contractor met nothing it did not need
// but also nothing tailored. This is the map that ends that.
//
// SOURCE: ERP_System_Blueprint.xlsx, sheet "Section x Action Coverage", read
// against Company_Fields_and_Project_Actions.xlsx, sheet "Field x Action
// Matrix" — the second of which is already in this codebase, verbatim, as
// `FIELD_ACTION_MATRIX` in ./fieldsOfWork. This file is the half that was
// missing.
//
// ------------------------------------------------------------------------
// WHY THIS IS NOT THE BLUEPRINT SHEET TRANSCRIBED
// ------------------------------------------------------------------------
// The sheet answers "which section CAN handle this action", and several actions
// are covered by two or three. Joined naively — a section is on if ANY of its
// actions is in the trade's row — the answer is wrong in both directions:
//
//   - CRM & Sales covers exactly one action there (Consulting & Advisory), so a
//     contractor, a manufacturer and a farm all lost their SALES section. Every
//     company sells, and six of the seven flow templates open on a sales ticket.
//   - "Testing & Inspection" is covered by Manufacturing, Field Operations AND
//     Quality & HSE, and is the commonest action in the matrix — so a bank got
//     Manufacturing & Production.
//
// Measured before the correction: thirteen of the fourteen sections were on for
// almost every trade, which is the same as no gating at all.
//
// So each action resolves to ONE PRIMARY section here. The assignments were put
// to the owner and corrected by them — Training belongs to Human Resources
// rather than Field Operations, and Consulting & Advisory to Projects — which
// is why this is a reviewed decision rather than a derivation.
export const ACTION_SECTION: Readonly<Record<string, string>> = {
  // Advisory work IS the project for the firms that sell it. The owner's call.
  "Consulting & Advisory": "projects",
  "Survey & Assessment": "engineering-docs",
  "Design & Engineering": "engineering-docs",
  "Procurement & Sourcing": "procurement",
  "Fabrication / Manufacturing": "manufacturing",
  "Assembly": "manufacturing",
  "Programming & Configuration": "engineering-docs",
  "Construction & Civil Works": "projects",
  "Demolition & Dismantling": "projects",
  "Installation": "field-service",
  "Integration": "field-service",
  "Delivery & Transportation": "logistics",
  "Warehousing & Storage": "inventory",
  "Testing & Inspection": "quality-hse",
  "Commissioning": "field-service",
  // TRAINING IS HR'S, not Field Operations'. The blueprint sheet puts it under
  // Field Operations because training is often DELIVERED on site; the owner's
  // correction is that the records — who was trained, in what, and when it
  // expires — belong with the people they are about.
  "Training": "hr",
  "Operation": "assets",
  "Maintenance & Repair": "assets",
  "Upgrading & Retrofit": "projects",
  "Decommissioning & Disposal": "assets",
};

// EVERY COMPANY DOES THESE, whatever its trade, so no action has to turn them on.
//
// Four of them are the blueprint's own footnote — "Tendering & Estimating,
// Human Resources, Finance & Accounting, Reports & BI and Administration &
// Settings support EVERY action: pricing/estimating it, staffing it, costing
// and invoicing it, reporting it". Administration is absent because it stopped
// being a section (see `isSystemSection`); it is always on for a different
// reason, below.
//
// CRM & SALES IS THE FIFTH AND IT IS NOT IN THAT FOOTNOTE. It is here because
// the sheet's own coverage row would otherwise switch selling off for most of
// the twenty-five trades, which is the join failing rather than the product.
export const UNIVERSAL_SECTION_KEYS = [
  "crm-sales", "tendering", "hr", "finance", "reports",
] as const;

// NOT SECTIONS, AND NEVER OFF. Main is the home surface — without it a member
// signs in with nowhere to land — and Tasks is a cross-cutting control rather
// than a department. `REQUIRED_SECTIONS` in platform/db/sections says the same
// thing about Main from the storage side.
export const NEVER_GATED_KEYS = ["main", "tasks"] as const;

/**
 * THE ROOT SECTIONS THIS TRADE STARTS WITH.
 *
 * `spine` is the trade's flow template's stages already resolved to the sections
 * that own them — passed IN rather than computed here, because that resolution
 * needs `STAGE_REGISTRY`, and this module stays a pure value with no reach into
 * `platform/`. It is the half that guarantees a contractor gets Inventory: no
 * action maps there for it, but Template A carries `sheet`, `order` and
 * `delivery`, all of which are Inventory's.
 *
 * AN UNKNOWN TRADE TURNS NOTHING OFF, and that is the important default. A
 * studio that declined to say what it does, or typed its own trade under
 * `Other`, gets every section — which is exactly what every studio got before
 * this existed. Guessing would hide a section a company actually uses, and the
 * cost of a wrong guess is asymmetric: a spare section is clutter, a missing one
 * is a customer concluding the product cannot do their job.
 */
export function rootSectionsForTrade(
  actions: readonly string[],
  spine: readonly string[] = [],
): Set<string> {
  const on = new Set<string>([...UNIVERSAL_SECTION_KEYS, ...NEVER_GATED_KEYS, ...spine]);
  for (const action of actions) {
    const section = ACTION_SECTION[action];
    if (section) on.add(section);
  }
  return on;
}

/**
 * IS THIS SECTION ROW ON, for a studio of this trade?
 *
 * Takes a row's own key and the key of its ROOT, because gating has to be
 * decided per row and applied to a whole branch: `visibleSections` filters each
 * row independently, and StudioFrame PROMOTES a visible child whose parent is
 * hidden to the top level. Disabling `manufacturing` while leaving its children
 * enabled would therefore not hide Manufacturing — it would scatter its
 * sub-sections across the top of the nav, which is worse than leaving it alone.
 *
 * System rows are never gated: they are the settings surface, and one of them
 * holds the screen that would switch anything back on.
 */
export function sectionEnabledForTrade(
  key: string,
  rootKey: string,
  on: ReadonlySet<string>,
  isSystem: (k: string) => boolean,
): boolean {
  if (isSystem(key)) return true;
  return on.has(rootKey);
}

/**
 * WHAT A STUDIO'S TRADE SUGGESTS CHANGING, against the sections it has now.
 *
 * THE GATE ABOVE RUNS ONCE, AT CREATION, and that stays true: a section
 * vanishing from a live sidebar overnight is a support ticket, not a courtesy.
 * This is the OFFER instead — the shape Departments already uses after a trade
 * change: say what the trade would switch, apply nothing until somebody presses
 * Apply. A studio created as "Other" and set to a real trade later got nothing
 * at all before this existed, because the matrix had exactly one caller.
 *
 * ROOTS ONLY. A child follows its root (see `sectionEnabledForTrade`), so the
 * offer is made per branch and applied per branch.
 *
 * `on` NULL MEANS THE TRADE SUGGESTS NOTHING — unknown, unsaid or "Other" — and
 * the answer is empty, emphatically not "turn everything on": a studio that never
 * named its trade and switched Manufacturing off did that on purpose, and an
 * unknown trade is no evidence against it.
 *
 * THE RULES ARE INJECTED, like `isSystem` above, so this stays a pure value with
 * no reach into `platform/`. Each one is a change the route would refuse or a
 * row that is not the trade's to judge: a required section, a system row, a
 * section with no screen (never offered ON — it would lead to an empty page), and
 * a section the studio added itself (`isSeeded` false — the matrix knows nothing
 * about it, so it cannot say it is unused).
 */
export type TradeSuggestion = { off: string[]; on: string[] };

export function tradeSuggestion(
  roots: readonly { key: string; enabled: boolean }[],
  on: ReadonlySet<string> | null,
  rules: {
    isSeeded: (k: string) => boolean;
    isSystem: (k: string) => boolean;
    required: (k: string) => boolean;
    noScreen: (k: string) => boolean;
  },
): TradeSuggestion {
  const out: TradeSuggestion = { off: [], on: [] };
  if (!on) return out;
  for (const row of roots) {
    const key = row.key;
    if (!rules.isSeeded(key) || rules.isSystem(key) || rules.required(key)) continue;
    if ((NEVER_GATED_KEYS as readonly string[]).includes(key)) continue;
    const wanted = on.has(key);
    if (wanted && !row.enabled && !rules.noScreen(key)) out.on.push(key);
    else if (!wanted && row.enabled) out.off.push(key);
  }
  return out;
}
