// THE ELEVEN ACCESS SHAPES a job can have, and the permissions each implies.
//
// WHY ELEVEN AND NOT 2,900. The role library names roughly 2,900 job titles
// across 25 fields of work. Writing a permission list per title would be a body
// of data nobody could review — and the catalogue has changed at least twelve
// times in this repo's life: 102, 123, 124, 126, 130, 134, 135, 139, 143, 145,
// 149, 153, 159 keys. Every one of those renames or adds, and every one would
// have staled 2,900 lists silently, surfacing only as somebody quietly holding
// the wrong access. It moved 153 → 159 while the spec for this file was being
// written, which is the argument making itself. Eleven sets are eleven places
// to fix, and tests/roles-model.mjs checks all of them against the real
// catalogue on every run.
//
// The eleven come from docs/research/industry-roles.md §5.1, which walked every
// seniority tier of all 25 fields and found this many shapes cover the
// operating line everywhere. The TITLES number in the thousands; the shapes do
// not, and that difference is the whole design.
//
// THE ARCHETYPE IS NEVER SHOWN. A role is called "Managing Director"; that it
// resolves to `principal` is metadata, like a template id. Nobody sees the word.
//
// KEYS COME FROM keysForLevel, NOT FROM HAND-WRITTEN STRINGS — the same helper
// STARTER_ROLES uses. A literal list here would be a second copy of the
// catalogue's verb ladder, free to disagree with it about what "edit" means.

import { AREAS, keysForLevel, type Level } from "@/platform/access";

export type ArchetypeId =
  | "principal" | "department-head" | "winner-of-work" | "bidder" | "deliverer"
  | "front-line" | "doer" | "custodian" | "buyer" | "money" | "checker";

export type Archetype = {
  id: ArchetypeId;
  /** What this shape is, for whoever maintains the list. Never shown to a user. */
  note: string;
  /** Areas at a level, expanded through keysForLevel. */
  grants: ReadonlyArray<readonly [string, Level]>;
  /** A verb outside the view/edit/full ladder, named in full. */
  extras?: readonly string[];
};

// AN AREA A GRANT NAMES MUST EXIST, so a typo throws at import rather than
// producing a role that silently grants nothing — the same rule STARTER_ROLES
// follows, and for the same reason: this list is what every new studio gets.
const level = (areaKey: string, lvl: Level): string[] => {
  const area = AREAS.find((a) => a.key === areaKey);
  if (!area) throw new Error(`archetypes: names an area that does not exist: ${areaKey}`);
  return keysForLevel(area, lvl);
};

export const ARCHETYPES: readonly Archetype[] = Object.freeze([
  {
    id: "principal",
    note: "Chairman, CEO, Managing Director, Owner, Director General. Runs the company.",
    // NOT A WILDCARD, and this is the one place it matters. The role model
    // allows exactly one wildcard and it is Admin, which "has to keep meaning
    // everything as the product grows". A second one would make that sentence
    // false — and worse, would make it false quietly, since a wildcard picks up
    // every future key without anybody deciding.
    //
    // So principal is every area at full, computed from AREAS, and deliberately
    // WITHOUT administration.access: running the company and deciding who may
    // do what are different acts, and the second is the one that can hand
    // somebody else everything.
    grants: AREAS
      .filter((a) => a.key !== "administration.access")
      .map((a) => [a.key, "full"] as const),
    // AND EVERY EXTRA, which was ABSENT rather than declined. `keysForLevel`
    // walks an area's `verbs`, and VERBS is exactly view/create/edit/delete;
    // extras live in `area.extra` and no level can reach them. So a shape built
    // from [key, "full"] held none of the twenty-one, and the comment above
    // justified excluding administration.access while saying nothing about
    // them — which is what marks it as an oversight rather than a decision.
    //
    // IT LEFT THE APPROVAL CHAINS UNWALKABLE, and that is the part that makes
    // this a defect rather than a preference. A bill over the studio's limit
    // needs finance.payables.approveHigh; no archetype held it, so no library
    // role could be the second signature and only the account holder — who
    // short-circuits effectivePermissions on role === "owner" — could sign at
    // all. Same for a bid over 500000 and a requisition over 10000.
    //
    // Invariant 7 is not an argument against this: reviewer — approver is
    // enforced AT THE TRANSITION, and CLAUDE.md is explicit that holding both
    // rights is legitimate while using both on one record is not. Withholding
    // the key buys none of that separation; it only breaks the role.
    extras: AREAS
      .filter((a) => a.key !== "administration.access")
      .flatMap((a) => (a.extra || []).map((x) => `${a.key}.${x.key}`)),
  },
  {
    id: "department-head",
    note: "Operations Director, Head of Production, Executive Chef, Chief Nursing Officer.",
    grants: [
      ["crmSales.dashboard", "view"], ["projects.dashboard", "view"], ["hr.dashboard", "view"],
      ["engineeringDocs.dashboard", "view"], ["inventory.dashboard", "view"],
      ["projects.list", "full"], ["projects.planner", "edit"], ["projects.sla", "edit"],
      ["tasks.board", "full"], ["hr.employees", "view"], ["hr.vacations", "edit"],
      ["administration.members", "view"], ["crmSales.tickets", "view"],
      // Seen so the approvals below are exercisable. A right to answer a
      // document you cannot open is a right in name only.
      ["tendering.tenders", "view"], ["procurement.requisitions", "view"],
      ["engineeringDocs.register", "view"], ["engagements", "view"],
    ],
    // Running a department includes answering its leave, which is an extra
    // rather than a rung on the ladder — the same reason STARTER_ROLES spells
    // it out by hand.
    // THE ARCHETYPE THAT ANSWERS, which is what a department head does that
    // nobody below them can. Each of these is deliberately away from the person
    // who raises the thing being answered:
    //   — tenders.approve, because "may price a bid" and "may commit the
    //     company to it" are different powers (bidder holds neither).
    //   — requisitions.approve, because approving authorises somebody else's
    //     spend; buyer is the one spending and holds the area, not this.
    //   — register.approve, because checker holds `review` and invariant 7 is
    //     the reason it stops there.
    extras: [
      "hr.vacations.approve", "tendering.tenders.approve",
      "procurement.requisitions.approve", "engineeringDocs.register.approve",
      "engagements.lock",
    ],
  },
  {
    id: "winner-of-work",
    note: "Sales Manager, BD Manager, Key Account Manager, Relationship Manager.",
    grants: [
      ["crmSales.tickets", "full"], ["crmSales.clients", "full"], ["crmSales.quotations", "edit"],
      ["crmSales.pipeline", "view"], ["crmSales.dashboard", "view"], ["crmSales.live", "view"],
      ["engineeringDocs.rfq", "edit"],
    ],
    // Turning an enquiry into a quotation is the selling motion, and locking a
    // quotation is finishing it. UNLOCK is deliberately not here: it reopens
    // something already committed, and Gate A pins that holding one does not
    // imply the other.
    extras: ["crmSales.quotations.lock", "engineeringDocs.rfq.convert"],
  },
  {
    id: "bidder",
    note: "Estimator, Tendering Engineer, Bid Manager, Quantity Surveyor. Prices the work.",
    // "May price a bid" and "may commit the company to it" are different
    // powers — the split tendering.tenders.approve already makes — so a bidder
    // gets the register and the rate library and no approval extra.
    grants: [
      ["tendering.tenders", "full"], ["tendering.rates", "full"],
      ["crmSales.quotations", "edit"], ["inventory.items", "view"], ["engineeringDocs.rfq", "view"],
    ],
  },
  {
    id: "deliverer",
    note: "Project Manager, Production Manager, Engagement Manager, Rig Manager.",
    grants: [
      ["projects.list", "full"], ["projects.planner", "edit"], ["projects.sla", "edit"],
      ["projects.overtimes", "edit"], ["tasks.board", "full"], ["inventory.sheets", "edit"],
      ["crmSales.contracts", "edit"], ["projects.dashboard", "view"],
      ["engagements", "view"], ["engineeringDocs.live", "view"],
    ],
    // A variation IS the contract's content, and the project manager whose job
    // it changes is who answers it — which is the act crmSales.contracts.approve
    // was minted for when the register shipped.
    extras: ["crmSales.contracts.approve"],
  },
  {
    id: "front-line",
    note: "Foreman, Supervisor, Charge Nurse, Crew Chief, Shift Leader. Assigns work by name.",
    grants: [
      ["tasks.board", "full"], ["fieldService.schedule", "edit"], ["fieldService.tracking", "edit"],
      ["projects.list", "view"], ["hr.vacations", "view"],
      // A lead assigns work, so a lead needs the list of people to assign it to.
      // Deliberately not hr.employees, which is the employment record.
      ["administration.members", "view"], ["fieldService.dashboard", "view"],
    ],
  },
  {
    id: "doer",
    note: "Engineer, Technician, Nurse, Consultant, Operator, Chef. Does the work.",
    // DELETES NOTHING — the line the Member starter role drew, kept intact
    // through the model changing underneath it. `edit` stops short of delete on
    // every area, so this is a property of the ladder rather than of this list.
    grants: [
      ["crmSales.tickets", "edit"], ["projects.list", "view"], ["tasks.board", "edit"],
      ["inventory.items", "view"], ["hr.vacations", "edit"], ["engineeringDocs.rfq", "view"],
    ],
  },
  {
    id: "custodian",
    note: "Store Keeper, Warehouse Manager, Materials Controller, Pharmacy Technician.",
    grants: [
      ["inventory.stock", "full"], ["inventory.items", "full"], ["inventory.sheets", "edit"],
      ["logistics.shipments", "edit"], ["inventory.dashboard", "view"],
    ],
  },
  {
    id: "buyer",
    note: "Procurement Manager, Buyer, Subcontracts Administrator, Expeditor.",
    grants: [
      ["procurement.suppliers", "full"], ["procurement.requisitions", "edit"],
      ["procurement.rfq", "edit"],
      ["finance.payables", "edit"], ["inventory.items", "view"],
    ],
    // AWARDING IS THE ONE THING A BUYER DOES, so it is here even though this
    // archetype deliberately holds no `procurement.requisitions.approve`. The
    // two extras are not the same kind of power: approving a requisition
    // authorises somebody else's spend, which is why it sits away from the
    // person who does the buying; awarding chooses between quotes for a spend
    // that has ALREADY been authorised, which is the buying itself. A buyer who
    // may ask three suppliers for a price and may not pick one has been given
    // half a job.
    extras: ["procurement.rfq.award"],
  },
  {
    id: "money",
    note: "Financial Controller, Chief Accountant, Bursar, Hotel Controller.",
    grants: [
      ["finance.cash", "full"], ["finance.payables", "full"], ["finance.assets", "full"],
      ["finance.ledger", "view"], ["finance.dashboard", "view"], ["projects.costs", "view"],
      // What the client owes and what is being held back. Deliberately the
      // BILLING half rather than more of costs: the two areas were split so a
      // commercial reader needs none of the supplier costs, and this is the
      // side that raises the invoices.
      ["projects.billing", "edit"],
    ],
    // Posting, approving and paying are extras rather than rungs, and they are
    // the three that distinguish somebody who runs the ledger from somebody who
    // reads it. approveHigh is deliberately absent: signing above the studio's
    // own limit is a decision a studio makes about a person, not a default.
    extras: [
      "finance.ledger.post", "finance.payables.approve", "finance.payables.pay",
      // Reversing a posting is the same job as making one, and disposing of an
      // asset is the ledger act that ends it.
      "finance.ledger.reverse", "finance.assets.dispose",
    ],
  },
  {
    id: "checker",
    note: "QA/QC Inspector, Safety Officer, Auditor, Airworthiness Signatory.",
    // THE ARCHETYPE NO STARTER ROLE EVER COVERED, and the reason it was worth
    // finding: a studio wanting a pure inspector had to assemble one out of
    // view rights plus engineeringDocs.register.review, which is why nobody
    // did. Every regulated field in the research has at least one statutory
    // checker and four of them have several.
    //
    // Reviewer is never approver (invariant 7), so this holds `review` and not
    // `approve` — a checker who could also sign off their own review is the
    // thing that invariant exists to stop.
    grants: [
      ["engineeringDocs.register", "view"], ["projects.list", "view"],
      ["fieldService.tracking", "view"], ["inventory.sheets", "view"], ["crmSales.contracts", "view"],
    ],
    // Publishing and obsoleting are the controller's housekeeping — moving a
    // document that has ALREADY been approved by somebody else. They are not
    // the approval decision, which is why they sit here and `approve` does not.
    extras: [
      "engineeringDocs.register.review", "engineeringDocs.register.publish",
      "engineeringDocs.register.obsolete",
    ],
  },
]);

const byId = new Map(ARCHETYPES.map((a) => [a.id, a]));

/**
 * The permission keys this archetype implies.
 *
 * A FRESH ARRAY EVERY CALL. The result is copied onto a stored role, and a
 * caller mutating it would otherwise reach back into the constant and change
 * what every future role gets — the same reason `departmentsForField` hands out
 * a copy.
 *
 * An id the list does not hold returns nothing rather than throwing. It arrives
 * from stored library data, and a bad row should cost one role its defaults
 * rather than taking down the seed that was reading it.
 */
export function permissionsFor(id: string): string[] {
  const archetype = byId.get(id as ArchetypeId);
  if (!archetype) return [];
  const out = new Set<string>();
  for (const [areaKey, lvl] of archetype.grants) for (const k of level(areaKey, lvl)) out.add(k);
  for (const k of archetype.extras || []) out.add(k);
  return [...out];
}

export const isArchetypeId = (v: unknown): v is ArchetypeId => byId.has(v as ArchetypeId);

/**
 * WELL-FORMEDNESS, asserted rather than assumed — the same shape as
 * `industryProblems` and `departmentSeedProblems`, and pure for the same reason.
 *
 * `knownKeys` is passed in rather than imported so this file stays data-only
 * and a test can ask it about a catalogue other than today's.
 */
export function archetypeProblems(knownKeys?: readonly string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const a of ARCHETYPES) {
    if (seen.has(a.id)) problems.push(`archetype "${a.id}" is listed twice`);
    seen.add(a.id);
    if (!permissionsFor(a.id).length) problems.push(`archetype "${a.id}" grants nothing`);
  }
  if (knownKeys) {
    const known = new Set(knownKeys);
    for (const a of ARCHETYPES) {
      for (const k of permissionsFor(a.id)) {
        if (!known.has(k)) problems.push(`archetype "${a.id}": "${k}" is not a permission key`);
      }
    }
  }
  return problems;
}
