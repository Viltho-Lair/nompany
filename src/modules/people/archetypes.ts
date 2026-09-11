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

import { AREAS, SECTION_AREAS, keysForLevel, type Level } from "@/platform/access";
import { SECTION_DEFS, isSystemSection, isFiledOnlySection } from "@/platform/db/keys";
import { NEVER_GATED_KEYS } from "@/shared/tradeSections";

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
  /**
   * SECTIONS WHOSE ENGINE REGISTERS THIS SHAPE OWNS, at a level.
   *
   * SECTIONS RATHER THAN REGISTER NAMES, and that is the whole design. There
   * are twenty-nine built-in registers and eleven archetypes; naming each pair
   * would be three hundred decisions that go stale the moment a register is
   * added, which is exactly how ~2,900 hand-written permission lists were
   * rejected in favour of eleven shapes in the first place. A section is one
   * decision — "a safety officer owns Quality & HSE" — and a register added
   * under it flows to that shape with nobody remembering to.
   *
   * AND IT COVERS A STUDIO'S OWN TYPES TOO, because the expansion happens
   * against the types that studio actually HAS rather than against the
   * built-in list. A studio that declares its own register under Quality & HSE
   * finds its safety officers already able to open it.
   */
  engineSections?: ReadonlyArray<readonly [string, Level]>;
  /**
   * HOW FAR A SCOPED RIGHT REACHES — `department` rather than the `own` every
   * unscoped area falls back to (`scopeFor` in platform/access/resolve.ts).
   *
   * EVERY LIBRARY ROLE WAS WRITTEN WITH `scopes: {}`, so a department head
   * holding `hr.vacations.approve` saw only their OWN leave: the approval bell
   * rang and the list it pointed at was empty. The same for attendance and the
   * employee cards. A right to answer or mark your team that only reaches
   * yourself is invariant 16 by another road. Only the HR areas that ARE scoped
   * are named; an unscoped area ignores this.
   */
  scopes?: Readonly<Partial<Record<string, "own" | "department" | "all">>>;
  /**
   * THE LEVEL THIS SHAPE HOLDS ACROSS ITS OWN DEPARTMENT'S SECTIONS, on top of
   * whatever `grants` already names there. Without it the shape and the
   * department simply fail to meet: `doer` names no Tendering right, so an
   * Estimator filed under Estimation arrived able to open nothing in
   * Estimation. See `permissionsInDepartment`.
   */
  home?: Level;
  /**
   * RUNS THE WHOLE COMPANY, so it is never confined to one department's
   * sections — the owner's decision, 11/09/2026. Only `principal`.
   */
  companyWide?: boolean;
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
    companyWide: true,
    // EVERY SECTION'S REGISTERS, which is the same sentence as "every area at
    // full" one line down and has to be said separately because an engine right
    // is not in AREAS. Without it the person who runs the company could open
    // none of the twenty-nine registers their own studio holds.
    engineSections: [
      ["engineering-docs", "full"], ["quality-hse", "full"], ["assets", "full"],
      ["field-service", "full"], ["logistics", "full"], ["manufacturing", "full"],
      ["hr", "full"], ["inventory", "full"],
    ],
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
    home: "full",
    // THEIR DEPARTMENT AND EVERYTHING UNDER IT (`subtreeIds`), which is what
    // "head of department" means — see `scopes` on the type.
    scopes: { "hr.employees": "department", "hr.vacations": "department", "hr.attendance": "department" },
    // A HEAD OF DEPARTMENT READS ACROSS AND WRITES IN THE OPERATIONAL ONES.
    // Full on what an operations director actually runs; view on Quality & HSE
    // and HR, because seeing the incident and the appraisal is part of running
    // a department and EDITING either is somebody else's job.
    engineSections: [
      ["manufacturing", "full"], ["field-service", "full"], ["logistics", "full"],
      ["assets", "full"], ["inventory", "edit"],
      ["quality-hse", "view"], ["hr", "view"], ["engineering-docs", "view"],
    ],
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
      // WHO WAS IN, AND THE DATA OUT. Attendance is the daily sweep a head of
      // department signs off; the export is how they take their own
      // department's figures away. Both arrived with sections that shipped
      // after this library was written, and until now no job title reached
      // either — only Admin did, which is the "a section whose own Manager
      // cannot open it" defect from the other end.
      ["hr.attendance", "edit"], ["reports.exports", "view"],
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
      // TWO MORE ANSWERS, both away from whoever raises the thing answered,
      // which is the rule every extra above already follows:
      //   — stock.approve, because a write-off "needs somebody other than the
      //     person typing it" and custodian is the one typing it;
      //   — payroll.approve, because `money` runs the payroll and a second
      //     signature that the same person can give is not a second signature.
      "inventory.stock.approve", "hr.payroll.approve",
      // ...and releasing a held payment, which `money` makes and must not also
      // release: the same separation, one act later.
      "finance.payables.release",
    ],
  },
  {
    id: "winner-of-work",
    home: "edit",
    note: "Sales Manager, BD Manager, Key Account Manager, Relationship Manager.",
    grants: [
      ["crmSales.tickets", "full"], ["crmSales.clients", "full"], ["crmSales.quotations", "edit"],
      ["crmSales.pipeline", "view"], ["crmSales.dashboard", "view"], ["crmSales.live", "view"],
      // THE ORDER IS THE SELLER'S. Full rather than edit, because deleting
      // a draft nobody has been told about is part of placing one — and the
      // service refuses the delete the moment it stops being a draft, so the
      // verb opens a door the record itself keeps shut.
      ["crmSales.orders", "full"],
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
    home: "edit",
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
    home: "edit",
    // THE PERSON DELIVERING THE WORK owns the registers the work runs through
    // and reads the ones that constrain it. Quality is `edit` rather than
    // `full`: a project manager raises an NCR and files a test record, and
    // DELETING either is exactly what an inspection trail must not permit.
    engineSections: [
      ["field-service", "full"], ["manufacturing", "full"],
      ["engineering-docs", "edit"], ["quality-hse", "edit"], ["assets", "view"],
      ["logistics", "view"], ["inventory", "view"],
    ],
    note: "Project Manager, Production Manager, Engagement Manager, Rig Manager.",
    grants: [
      ["projects.list", "full"], ["projects.planner", "edit"], ["projects.sla", "edit"],
      ["projects.overtimes", "edit"], ["tasks.board", "full"], ["inventory.sheets", "edit"],
      ["crmSales.contracts", "edit"], ["projects.dashboard", "view"],
      // WHAT HAS TO BE MADE AND WHETHER THERE IS CAPACITY. This archetype's own
      // note names a Production Manager; the planning board is the screen that
      // job is done on, and until now nobody but Admin could open it.
      ["manufacturing.planning", "view"],
      // WHAT WAS ORDERED, READ-ONLY. The person delivering the work needs to
      // see what was asked for; changing it is the seller's act, and a
      // delivery team quietly editing the order they are measured against is
      // the one thing this must not allow.
      ["crmSales.orders", "view"],
      ["engagements", "view"], ["engineeringDocs.live", "view"],
      // Sight of the packages on their own job, so a certificate is signed
      // against something the signer can read rather than a number in a
      // dialogue. Not `edit`: administering the subcontract is the buyer's.
      ["procurement.subcontracts", "view"],
      // The diary on their own jobs, read rather than written: the report is
      // the supervisor's statement of the day and a manager rewriting it would
      // be a manager rewriting somebody else's evidence.
      ["projects.reports", "view"],
    ],
    // A variation IS the contract's content, and the project manager whose job
    // it changes is who answers it — which is the act crmSales.contracts.approve
    // was minted for when the register shipped.
    //
    // CERTIFYING A SUBCONTRACTOR'S PAYMENT IS THE SAME ACT: attesting that work
    // was done. It sits here rather than on `buyer` for the reason
    // `procurement.requisitions.approve` does — writing the valuation is
    // administration, agreeing it creates a debt, and the person who can say
    // the work happened is the one running the job rather than the one who
    // placed the order. `buyer` holds `procurement.subcontracts` at edit and
    // deliberately not this.
    extras: ["crmSales.contracts.approve", "procurement.subcontracts.certify"],
  },
  {
    id: "front-line",
    home: "edit",
    // A SUPERVISOR SEES THEIR CREW'S LEAVE AND MARKS THEIR CREW IN — the daily
    // sweep the attendance area's own comment describes ("a supervisor marks
    // their own team every morning"). Scoped to the department, never wider.
    scopes: { "hr.vacations": "department", "hr.attendance": "department" },
    // A SUPERVISOR RAISES AND UPDATES, and deletes nothing. `edit` everywhere,
    // which is the rung that grants view/create/edit and stops there — the
    // whole point of the ladder having three rungs rather than two.
    engineSections: [
      ["field-service", "edit"], ["manufacturing", "edit"], ["quality-hse", "edit"],
      ["logistics", "edit"], ["assets", "view"], ["inventory", "view"],
    ],
    note: "Foreman, Supervisor, Charge Nurse, Crew Chief, Shift Leader. Assigns work by name.",
    grants: [
      ["tasks.board", "full"], ["fieldService.schedule", "edit"], ["fieldService.tracking", "edit"],
      // Permits moved to Quality & HSE with a right of their own (tier 5); the
      // lead who held them through Tracking keeps them here.
      ["qualityHse.permits", "edit"],
      ["projects.list", "view"], ["hr.vacations", "view"], ["hr.attendance", "edit"],
      // A lead assigns work, so a lead needs the list of people to assign it to.
      // Deliberately not hr.employees, which is the employment record.
      ["administration.members", "view"], ["fieldService.dashboard", "view"],
      // THE DAILY DIARY IS THIS ARCHETYPE'S DOCUMENT. A foreman writes down
      // what happened on site and closes the day — `edit` covers both because
      // submitting a site report is closing your OWN statement of the day, not
      // approving somebody else's. Nothing here is a signable, so invariant 7
      // has nothing to say about it.
      //
      // AND IT SITS BESIDE `projects.list` AT VIEW ONLY, which is the whole
      // reason `projects.reports` is a separate area: a foreman writing a diary
      // entry should not need the project register to do it.
      ["projects.reports", "edit"],
    ],
  },
  {
    id: "doer",
    home: "edit",
    // WHOEVER DOES THE WORK FILES THE RECORD OF IT. `edit` on the two
    // registers a technician actually writes in — the job they attended and the
    // test they ran — and view elsewhere. This is the shape most people in a
    // studio hold, so it is the one where over-granting costs most.
    engineSections: [
      ["field-service", "edit"], ["quality-hse", "edit"],
      ["manufacturing", "view"], ["assets", "view"], ["engineering-docs", "view"],
    ],
    note: "Engineer, Technician, Nurse, Consultant, Operator, Chef. Does the work.",
    // DELETES NOTHING — the line the Member starter role drew, kept intact
    // through the model changing underneath it. `edit` stops short of delete on
    // every area, so this is a property of the ladder rather than of this list.
    grants: [
      ["crmSales.tickets", "edit"], ["projects.list", "view"], ["tasks.board", "edit"],
      ["inventory.items", "view"], ["hr.vacations", "edit"], ["engineeringDocs.rfq", "view"],
      // A TECHNICIAN reports what they find and moves the work they are given.
      ["maintenance.requests", "edit"], ["maintenance.orders", "edit"],
    ],
  },
  {
    id: "custodian",
    home: "edit",
    // THE STORE KEEPER'S REGISTERS. Stocktakes are the control this shape
    // exists to run, and the equipment, maintenance and calibration registers
    // are the stores' other half — what is owned, what is due, what is still in
    // calibration.
    engineSections: [
      ["inventory", "full"], ["assets", "full"], ["logistics", "edit"],
    ],
    note: "Store Keeper, Warehouse Manager, Materials Controller, Pharmacy Technician.",
    grants: [
      ["inventory.stock", "full"], ["inventory.items", "full"], ["inventory.sheets", "edit"],
      ["logistics.shipments", "edit"], ["inventory.dashboard", "view"],
      // PLANT IS STOCK THAT DRIVES AWAY. Whoever controls materials is who
      // books a machine out to a job and back again, and the register that
      // records it had no job title reaching it at all.
      ["assets.utilisation", "edit"],
      // THE RECEIVING REGISTER IS THIS ARCHETYPE'S OWN SCREEN: `inventory.stock`
      // at full is what books goods in, and this is where that work is done and
      // read back. VIEW is the whole area — receiving is not a verb here.
      //
      // AND IT HOLDS NO `finance.payables`, which is the point: the invoice leg
      // of the match is withheld from a store keeper by the gate inside
      // `listReceiving`. That gate is exercised by a SEEDED role rather than
      // only by a test fixture, which is the difference between a rule and a
      // rule somebody remembers.
      ["procurement.receiving", "view"],
      // THE PLANT KEEPER RUNS THE WORK ON IT: takes the fault reports and
      // dispatches the repairs on the machines this shape already books out.
      ["maintenance.requests", "full"], ["maintenance.orders", "full"],
      // ...and keeps the calendar that sends people to them.
      ["maintenance.plans", "full"],
    ],
  },
  {
    id: "buyer",
    home: "edit",
    // PROCUREMENT WATCHES WHAT ARRIVES rather than filing it. View on the
    // delivery and fleet registers and on the stores'; nothing here is a buyer's
    // to write, and a register they cannot open is one they cannot chase.
    engineSections: [
      ["logistics", "edit"], ["inventory", "view"], ["assets", "view"],
    ],
    note: "Procurement Manager, Buyer, Subcontracts Administrator, Expeditor.",
    grants: [
      ["procurement.suppliers", "full"], ["procurement.requisitions", "edit"],
      ["procurement.rfq", "edit"], ["procurement.expediting", "edit"],
      ["procurement.subcontracts", "edit"],
      // FREIGHT, DUTY AND CLEARANCE ARE THE BUYER'S NUMBERS. They are what the
      // goods actually cost, they are negotiated with the same suppliers, and
      // the valuation `money` reads is assembled from them.
      ["logistics.landedCost", "edit"],
      ["finance.payables", "edit"], ["inventory.items", "view"],
      // THE SECTION OVERVIEW GOES TO WHOEVER RUNS THE SECTION, the way
      // `inventory.dashboard` sits with the store keeper. NOT given to
      // custodian as well: a store keeper's job is the receiving screen
      // itself, and five of the six blocks would be null for them anyway.
      ["procurement.dashboard", "view"],
      // THE OTHER HALF OF THE SAME SCREEN. A buyer holds `finance.payables`, so
      // they see the invoice leg the store keeper cannot — and they are who acts
      // on an over-billed order, because arguing with the supplier is the
      // buying job rather than the warehouse one.
      ["procurement.receiving", "view"],
    ],
    // AWARDING IS THE ONE THING A BUYER DOES, so it is here even though this
    // archetype deliberately holds no `procurement.requisitions.approve`. The
    // two extras are not the same kind of power: approving a requisition
    // authorises somebody else's spend, which is why it sits away from the
    // person who does the buying; awarding chooses between quotes for a spend
    // that has ALREADY been authorised, which is the buying itself. A buyer who
    // may ask three suppliers for a price and may not pick one has been given
    // half a job.
    // QUALIFYING IS THE BUYER'S TOO, and it is NOT the separation problem
    // `certify` was. Certifying a subcontract valuation creates a debt, which
    // is why it went to whoever runs the job rather than whoever placed the
    // order. Approving a supplier creates nothing: it says who the company is
    // ALLOWED to buy from, which is the procurement function's own remit, and
    // it authorises no spend on its own — a qualified supplier still needs a
    // requisition somebody else approved, which is precisely the right this
    // archetype deliberately does not hold.
    extras: ["procurement.rfq.award", "procurement.suppliers.qualify"],
  },
  {
    id: "money",
    home: "edit",
    note: "Financial Controller, Chief Accountant, Bursar, Hotel Controller.",
    grants: [
      ["finance.cash", "full"], ["finance.payables", "full"], ["finance.assets", "full"],
      ["finance.ledger", "view"], ["finance.dashboard", "view"], ["projects.costs", "view"],
      // THE WAGE BILL IS THE CONTROLLER'S, not a separate profession's — there
      // is no HR archetype in this library and a Chief Accountant is who runs
      // payroll in the companies it describes. Approving a RUN is deliberately
      // not here; it sits with department-head, because the person who prepares
      // it must not be the person who signs it.
      ["hr.payroll", "edit"],
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
      // CLOSING THE PERIOD IS THE CONTROLLER'S OWN ACT rather than an approval
      // held away from them: it is the moment they say the month is finished,
      // and nobody else in this library is in a position to say it.
      "finance.ledger.close",
      // Reversing a posting is the same job as making one, and disposing of an
      // asset is the ledger act that ends it.
      "finance.ledger.reverse", "finance.assets.dispose",
    ],
  },
  {
    id: "checker",
    // An inspector READS the work in their own sections; what they write is
    // named above, on the registers they keep.
    home: "view",
    // THE SHAPE QUALITY & HSE WAS BUILT FOR. Full on its eight registers —
    // an auditor who cannot close an audit is not an auditor — and view on the
    // operational ones they inspect, because an inspector reads the work order
    // and the service job and writes in neither.
    engineSections: [
      ["quality-hse", "full"],
      ["manufacturing", "view"], ["field-service", "view"], ["assets", "view"],
      ["engineering-docs", "view"], ["inventory", "view"],
    ],
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
      ["qualityHse.permits", "view"], ["maintenance.orders", "view"], ["maintenance.plans", "view"],
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
/**
 * @param types - the studio's record types, so `engineSections` can expand.
 *   Defaults to none, which is what every pure caller wants: an archetype's
 *   DECLARED shape, with no studio in hand. Passing the studio's own types is
 *   what makes a library role arrive able to open its registers.
 */
/**
 * The scopes a role of this shape arrives with — a COPY, like its permissions,
 * so editing an archetype later re-scopes nothing already created.
 */
export function scopesFor(id: string): Record<string, "own" | "department" | "all"> {
  const out: Record<string, "own" | "department" | "all"> = {};
  for (const [area, scope] of Object.entries(byId.get(id as ArchetypeId)?.scopes || {})) {
    if (scope) out[area] = scope;
  }
  return out;
}

export function permissionsFor(
  id: string,
  types: ReadonlyArray<{ key: string; parentSectionKey: string }> = [],
): string[] {
  const archetype = byId.get(id as ArchetypeId);
  if (!archetype) return [];
  const out = new Set<string>();
  for (const [areaKey, lvl] of archetype.grants) for (const k of level(areaKey, lvl)) out.add(k);
  for (const k of archetype.extras || []) out.add(k);

  // AN ENGINE KEY IS BUILT HERE RATHER THAN THROUGH `keysForLevel`, because
  // that helper takes an `Area` and an engine right has none — the key is
  // minted from a row, which is the whole reason `isEnginePermission` exists as
  // the one hole in a closed catalogue. The verb ladder is the SAME ladder
  // though, read off LEVEL_VERBS, so "edit" means here what it means anywhere.
  for (const [sectionKey, lvl] of archetype.engineSections || []) {
    for (const t of types) {
      if (t.parentSectionKey !== sectionKey) continue;
      for (const verb of ENGINE_LEVEL_VERBS[lvl] || []) out.add(`engine.${t.key}.${verb}`);
    }
  }
  return [...out];
}

// The same three rungs the catalogue uses, spelled out because an engine right
// has no `Area` to filter against: every register has all four verbs.
const ENGINE_LEVEL_VERBS: Record<Level, readonly string[]> = {
  // `none` is a real rung of the ladder and means exactly what it says: an
  // archetype may name a section in order to grant nothing on it, which reads
  // more honestly in the list than omitting the row.
  none: [],
  view: ["view"],
  edit: ["view", "create", "edit"],
  full: ["view", "create", "edit", "delete"],
};

export const isArchetypeId = (v: unknown): v is ArchetypeId => byId.has(v as ArchetypeId);

// ---- confining a shape to a department's sections --------------------------
//
// AN ARCHETYPE IS A SHAPE ACROSS THE WHOLE PRODUCT, and a role is a job in ONE
// department. Copied whole, a "doer" filed under Estimation arrived holding
// CRM tickets, the project list and the inventory items, and a department head
// under Finance arrived running Manufacturing's registers — sections that
// department never said it works in. The owner's rule, 11/09/2026: a role
// starts with its department's own sections, and anything wider is granted
// afterwards on the Access screen, deliberately.
//
// THIS IS A DEFAULT, NOT A CEILING. It decides what a library role is COPIED
// with and nothing else: the Access grid still offers every key in every group,
// and a department's `sectionKeys` still decides nothing about what a role may
// be GIVEN. That is the line roles.md draws, and this keeps it.

// A child's root, read from SECTION_DEFS rather than from the key's punctuation:
// `engineering-docs-rfq` and `engineering-docs-live` sit under CRM & Sales.
const ROOT_OF = new Map<string, string>();
for (const d of SECTION_DEFS) {
  ROOT_OF.set(d.key, d.key);
  for (const c of d.children || []) ROOT_OF.set(c.key, d.key);
}
const rootOf = (key: string) => ROOT_OF.get(key) || key;

// Area → the roots whose screens it opens. An area can answer for sections in
// two departments — `inventory.stock` places purchase orders under Procurement
// as well as moving stock under Inventory — and either one keeps it.
const AREA_ROOTS = new Map<string, Set<string>>();
for (const [sectionKey, areas] of Object.entries(SECTION_AREAS)) {
  // A FILED-ONLY SECTION OPENS NOTHING (keys.ts), so it says nothing about
  // which department an area belongs to: `projects.sla` is Maintenance's, and
  // counting `projects-sla` would hand service contracts to every Projects role.
  if (isFiledOnlySection(sectionKey)) continue;
  for (const area of areas) {
    const roots = AREA_ROOTS.get(area) || new Set<string>();
    roots.add(rootOf(sectionKey));
    AREA_ROOTS.set(area, roots);
  }
}

// Main and Tasks are not sections, so no department lists them and nothing
// filed under them is another department's work.
const NOT_A_SECTION = new Set<string>(NEVER_GATED_KEYS);

// A SCOPED AREA IS KEPT WHATEVER THE DEPARTMENT, because it never reaches
// another department's records: unscoped it falls back to `own`, and the
// widest scope an archetype gives is `department`. It is also how everybody
// asks for their own leave (`requestVacation` guards on hr.vacations.create) —
// stripping it would leave a site engineer unable to book a day off.
const SCOPED = new Set(AREAS.filter((a) => a.scoped).map((a) => a.key));

/**
 * The keys that fall inside these sections — or inside none at all.
 *
 * `sectionKeys` is a department's own list, roots or children alike. An engine
 * key follows its register's section, read off `types`; a register this studio
 * does not hold is dropped rather than guessed at.
 */
function confineToSections(
  keys: readonly string[],
  sectionKeys: readonly string[],
  types: ReadonlyArray<{ key: string; parentSectionKey: string }> = [],
): string[] {
  const allowed = new Set(sectionKeys.map(rootOf));
  const typeRoot = new Map(types.map((t) => [t.key, rootOf(t.parentSectionKey)]));
  return keys.filter((k) => {
    const area = k.slice(0, k.lastIndexOf("."));
    if (k.startsWith("engine.")) {
      const root = typeRoot.get(area.slice("engine.".length));
      return !!root && allowed.has(root);
    }
    if (SCOPED.has(area)) return true;
    const roots = AREA_ROOTS.get(area);
    if (!roots) return true;
    for (const r of roots) if (allowed.has(r) || NOT_A_SECTION.has(r)) return true;
    return false;
  });
}

// THE HOME LEVEL NEVER OPENS A DOOR. Three kinds of area are left to whatever
// the shape names explicitly (for every shape but principal, that is nothing):
//   *.settings            a section's configuration, not a job in it — the
//                         same nine areas tests/roles-model.mjs counts as
//                         principal-only;
//   Administration        not a section (the owner, 09/09/2026), and its Master
//                         data holds the department tree whose `parentId`
//                         widens a manager's reach — a receptionist given it by
//                         default is invariant 5 through a side door;
//   and so Access and People with it, which decide who may do what.
const homeGrantable = (areaKey: string, roots: ReadonlySet<string>) =>
  !areaKey.endsWith(".settings") && ![...roots].some(isSystemSection);

/**
 * WHAT A LIBRARY ROLE ARRIVES WITH in a department working in `sectionKeys`.
 *
 * Two halves, and both are confined to the department:
 *   — the shape's own named rights that fall inside its sections (plus what
 *     belongs to no section, and the scoped HR areas — `confineToSections`);
 *   — the shape's `home` level on EVERY area and register of those sections,
 *     so the shape and the department always meet.
 * `principal` is exempt and keeps its whole shape (`companyWide`).
 *
 * A DEFAULT, NOT A CEILING: the Access screen widens it afterwards.
 */
export function permissionsInDepartment(
  id: string,
  sectionKeys: readonly string[],
  types: ReadonlyArray<{ key: string; parentSectionKey: string }> = [],
): string[] {
  const archetype = byId.get(id as ArchetypeId);
  if (!archetype) return [];
  const shape = permissionsFor(id, types);
  if (archetype.companyWide) return shape;

  const out = new Set(confineToSections(shape, sectionKeys, types));
  const home = archetype.home;
  if (home) {
    const allowed = new Set(sectionKeys.map(rootOf).filter((r) => !isSystemSection(r)));
    for (const area of AREAS) {
      const roots = AREA_ROOTS.get(area.key);
      if (!roots || !homeGrantable(area.key, roots)) continue;
      if ([...roots].some((r) => allowed.has(r))) for (const k of keysForLevel(area, home)) out.add(k);
    }
    for (const t of types) {
      if (!allowed.has(rootOf(t.parentSectionKey))) continue;
      for (const verb of ENGINE_LEVEL_VERBS[home]) out.add(`engine.${t.key}.${verb}`);
    }
  }
  return [...out];
}

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
