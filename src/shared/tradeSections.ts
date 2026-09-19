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
  // MAINTENANCE & REPAIR IS MAINTENANCE'S (11/09/2026), now there is one. It
  // was Assets' only because Assets held the maintenance register; Assets still
  // comes with it — see SECTION_NEEDS.
  "Maintenance & Repair": "maintenance",
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
//
// QUOTATIONS IS THE SIXTH (13/09/2026): every company prices what it sells, and
// the RFQs Sales raises have to land somewhere whatever the trade.
//
// POINT OF SALE IS THE SEVENTH (17/09/2026), and not because every company runs
// a counter: the till sat under CRM & Sales until it became a department, so it
// was on wherever CRM & Sales was — everywhere. Keeping it universal keeps every
// trade's default exactly as it was; the owner switches it off at creation.
//
// MARKETING IS THE EIGHTH (19/09/2026). No service action is marketing — every
// trade finds its customers somehow — so no action could turn it on, and
// leaving it off would hide it from the very studios that asked for it. The
// owner switches it off at creation like any other.
export const UNIVERSAL_SECTION_KEYS = [
  "crm-sales", "quotations", "pos", "marketing", "tendering", "hr", "finance", "reports",
] as const;

// NOT SECTIONS, AND NEVER OFF. Main is the home surface — without it a member
// signs in with nowhere to land — and Approvals is a cross-cutting control
// rather than a department: every member asks and is asked. `REQUIRED_SECTIONS` in platform/db/sections says the same
// thing about Main from the storage side.
export const NEVER_GATED_KEYS = ["main", "approvals"] as const;

// A SECTION THAT CANNOT WORK WITHOUT ANOTHER BRINGS IT ALONG.
//
// This is structure, not a second guess at the matrix: a work order names a
// machine in the EQUIPMENT REGISTER, which is filed under Assets & Equipment.
// A studio with Maintenance on and Assets off could raise work orders against
// nothing. It is also what keeps "Maintenance & Repair" moving to Maintenance
// from quietly switching Assets OFF for every trade that reached Assets only
// through it — contractors and IT firms among them.
export const SECTION_NEEDS: Readonly<Record<string, readonly string[]>> = {
  maintenance: ["assets"],
  // A QUOTATION IS WRITTEN FOR A CLIENT, and clients are kept in CRM & Sales.
  // CRM & Sales was universal, so this changed no trade's default when it was
  // added (17/09/2026); it matters since the owner chooses departments at
  // creation, where somebody can say yes to quotations and no to sales and
  // would otherwise have nowhere to record who the quotation is for.
  quotations: ["crm-sales"],
};

/** Every root a set brings with it, followed to the end: A needs B, B needs C. */
export function withNeeds(roots: Iterable<string>): Set<string> {
  const on = new Set(roots);
  for (let grew = true; grew;) {
    grew = false;
    for (const key of [...on]) {
      for (const need of SECTION_NEEDS[key] || []) {
        if (!on.has(need)) { on.add(need); grew = true; }
      }
    }
  }
  return on;
}

/**
 * WHAT A STUDIO CAN BE ASKED ABOUT AT CREATION.
 *
 * Built by the server from the section tree (modules/main/studios) and handed
 * to both the create screen and the create route, so the question list and the
 * list the route accepts are one list. `children` holds only the sub-sections
 * worth offering: filed-only and system rows are storage and settings, not
 * things a company does.
 */
export type SetupCatalogue = {
  roots: readonly string[];
  children: Readonly<Record<string, readonly string[]>>;
};

/** What the owner picked on the create screen, as the route receives it. */
export type SectionChoiceInput = { roots?: unknown; offChildren?: unknown };

export type ResolvedSectionChoice =
  | { error: "sections-invalid" | "sections-empty"; detail?: string }
  | { error?: undefined; roots: Set<string>; offChildren: Set<string> };

/**
 * THE OWNER'S OWN ANSWER to "which departments does this company run?".
 *
 * The trade used to decide this alone, and a field of work is a blunt
 * instrument: two companies in the same trade can share almost nothing, and one
 * company's sidebar full of departments it never runs is the first thing it
 * sees. So the create screen asks, per department, with the trade's answer
 * pre-filled — and this is what turns the answer into the rows `createStudio`
 * switches on.
 *
 * REFUSED RATHER THAN CORRECTED, for anything the screen could not have sent:
 * a root that is not on the question list, or a sub-section that is not one of
 * the offered parts. Those are a client out of step with the server, and
 * quietly dropping them would build a studio that is not the one on screen.
 * The one thing that IS corrected is a dependency (`withNeeds`), because the
 * screen shows it being added and the owner already saw that happen.
 *
 * A sub-section switched off under a department that is itself off is dropped
 * rather than refused: the screen keeps what somebody unticked inside a
 * department they later answered "no" to, and that is not a disagreement.
 *
 * AT LEAST ONE DEPARTMENT. A studio with nothing on but Main opens onto an
 * empty sidebar, which is the shock this screen exists to prevent from the
 * other side.
 */
export function resolveSectionChoice(
  input: SectionChoiceInput | null | undefined,
  catalogue: SetupCatalogue,
): ResolvedSectionChoice {
  if (!input || typeof input !== "object") return { error: "sections-invalid", detail: "not an object" };
  if (!Array.isArray(input.roots)) return { error: "sections-invalid", detail: "roots is not a list" };
  const askable = new Set(catalogue.roots);
  const picked = new Set<string>();
  for (const raw of input.roots) {
    const key = String(raw);
    if (!askable.has(key)) return { error: "sections-invalid", detail: `unknown department ${key}` };
    picked.add(key);
  }
  if (!picked.size) return { error: "sections-empty" };

  const roots = withNeeds(picked);
  for (const key of NEVER_GATED_KEYS) roots.add(key);

  const offChildren = new Set<string>();
  const offList = input.offChildren === undefined ? [] : input.offChildren;
  if (!Array.isArray(offList)) return { error: "sections-invalid", detail: "offChildren is not a list" };
  for (const raw of offList) {
    const key = String(raw);
    const owner = Object.keys(catalogue.children).find((root) => catalogue.children[root].includes(key));
    if (!owner) return { error: "sections-invalid", detail: `unknown part ${key}` };
    if (roots.has(owner)) offChildren.add(key);
  }
  return { roots, offChildren };
}

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
  return withNeeds(on);
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
//
// `choices` IS THE WHOLE LIST THE PANEL DRAWS, not only the differences. The
// offer used to be two lines — "Turn off: Manufacturing, Logistics" — and the
// owner read that as the product showing something other than the trade they
// picked: it named only what would move and never the set the trade actually
// uses, and gave no way to keep an extra. So every section the trade may judge
// is a choice, ticked when the trade uses it; the person adjusts the ticks and
// applies exactly that. `off` and `on` stay, because they are what decides
// whether there is anything to offer at all.
export type TradeChoice = { key: string; suggested: boolean };
export type TradeSuggestion = { off: string[]; on: string[]; choices: TradeChoice[] };

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
  const out: TradeSuggestion = { off: [], on: [], choices: [] };
  if (!on) return out;
  for (const row of roots) {
    const key = row.key;
    if (!rules.isSeeded(key) || rules.isSystem(key) || rules.required(key)) continue;
    if ((NEVER_GATED_KEYS as readonly string[]).includes(key)) continue;
    const wanted = on.has(key);
    const noScreen = rules.noScreen(key);
    // A section with no screen can never be switched ON, so it is only a choice
    // while it is on — the one thing left to decide about it is switching it off.
    if (!noScreen || row.enabled) out.choices.push({ key, suggested: wanted });
    if (wanted && !row.enabled && !noScreen) out.on.push(key);
    else if (!wanted && row.enabled) out.off.push(key);
  }
  return out;
}
