// THE TYPES EVERY STUDIO GETS, seeded at creation.
//
// PHASE 1 SHIPPED ONE, deliberately — the engine's value proven by a type that
// is real rather than by a demonstration. PHASE 2 IS THESE TWO, and they are
// here to answer a question one type could not: whether the DECLARATION is
// general, or whether it was quietly shaped around transmittals.
//
// It was not, and the two below are the evidence rather than the claim. A
// transmittal is a three-status line with four plain fields. An RFI needs a
// SELECT — ball-in-court is which party owes the next move, which is a closed
// list and not free text — and a submittal needs a SIX-status ladder that
// BRANCHES, where a review can approve, approve with comments, or send the
// thing back. Neither needed a new field kind, a new verb or a line of engine
// code: they are rows.
//
// `origin: "builtin"` is what stops a studio editing them. Tenant-declared types
// come in phase 3 and are not this.
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { engineSectionKey } from "@/platform/access";
import { plantTypeSection } from "./sections";
import type { RecordType } from "./schema";

export const BUILTIN_TYPES = [
  {
    key: "transmittal",
    label: "Transmittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "recipient", label: "Recipient", kind: "text" },
      { key: "issuedOn", label: "Issued", kind: "date" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "recipient", "issuedOn"],
    statuses: ["Draft", "Issued", "Acknowledged"],
    transitions: [
      { from: "Draft", to: "Issued" },
      { from: "Issued", to: "Acknowledged" },
    ],
    version: 1,
  },
  {
    // BALL-IN-COURT IS A PARTY, NOT A PERSON, which is why it is a select and
    // not the `collaborator` kind. The question an RFI register answers is
    // "whose move is it" — ours, the client's, the consultant's — and that
    // survives the individual who happens to be handling it this week. It also
    // renders as a real dropdown, where `collaborator` is an honest text box in
    // phase 1 with no picker behind it.
    key: "rfi",
    label: "RFIs",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "subject", label: "Subject", kind: "text", required: true },
      { key: "question", label: "Question", kind: "longtext", required: true },
      {
        key: "ballInCourt", label: "Ball in court", kind: "select",
        options: ["Us", "Client", "Consultant", "Contractor", "Subcontractor"],
      },
      {
        key: "discipline", label: "Discipline", kind: "select",
        options: ["Architectural", "Structural", "Mechanical", "Electrical", "Civil", "Other"],
      },
      { key: "raisedOn", label: "Raised", kind: "date" },
      { key: "neededBy", label: "Needed by", kind: "date" },
      { key: "answer", label: "Answer", kind: "longtext" },
    ],
    columns: ["subject", "ballInCourt", "neededBy"],
    // ANSWERED IS NOT CLOSED. An answer arrives and somebody still has to accept
    // it — closing on the answer would lose the step where the asker agrees the
    // question was actually addressed.
    statuses: ["Open", "Answered", "Closed"],
    transitions: [
      { from: "Open", to: "Answered" },
      { from: "Answered", to: "Closed" },
      // WITHDRAWN WITHOUT AN ANSWER IS REAL: the question stopped mattering, or
      // it was asked twice. Refusing it would leave the register full of open
      // RFIs nobody is waiting on.
      { from: "Open", to: "Closed" },
      // AND AN ANSWER CAN BE REJECTED, which is the move a register without it
      // forces people to make by raising a second RFI that loses the thread.
      { from: "Answered", to: "Open" },
    ],
    version: 1,
  },
  {
    key: "submittal",
    label: "Submittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "specSection", label: "Specification section", kind: "text" },
      {
        key: "kind", label: "Kind", kind: "select",
        options: ["Product data", "Shop drawing", "Sample", "Method statement", "Calculation"],
      },
      { key: "submittedBy", label: "Submitted by", kind: "text" },
      { key: "submittedOn", label: "Submitted", kind: "date" },
      { key: "dueOn", label: "Response due", kind: "date" },
      { key: "comments", label: "Review comments", kind: "longtext" },
    ],
    columns: ["title", "kind", "dueOn"],
    // THE REAL LADDER, AND IT BRANCHES — which is the half of the engine one
    // type never exercised. A review has three outcomes, not one: approved,
    // approved with comments to carry into the work, or sent back. Collapsing
    // "Approved as noted" into "Approved" would lose the comments' standing, and
    // collapsing "Revise and resubmit" into a rejection would lose that the
    // thing is coming back.
    statuses: [
      "Draft", "Submitted", "Under review",
      "Approved", "Approved as noted", "Revise and resubmit",
    ],
    transitions: [
      { from: "Draft", to: "Submitted" },
      { from: "Submitted", to: "Under review" },
      { from: "Under review", to: "Approved" },
      { from: "Under review", to: "Approved as noted" },
      { from: "Under review", to: "Revise and resubmit" },
      // AND BACK ROUND. A resubmission is the same submittal again, not a new
      // one: starting a fresh record each time is how a spec section ends up
      // with four submittals and no way to see it took four goes.
      { from: "Revise and resubmit", to: "Submitted" },
    ],
    version: 1,
  },
  {
    // VERIFIED IS NOT CLOSED. Agreeing a corrective action and proving it
    // worked are two events, and a register that collapses them cannot answer
    // the only question an auditor asks: did the fix hold. The short path
    // Investigating -> Closed is the finding that turns out not to be one.
    key: "ncr",
    label: "NCRs and CAPAs",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "description", label: "What was found", kind: "longtext", required: true },
      { key: "severity", label: "Severity", kind: "select", options: ["Minor", "Major", "Critical"] },
      { key: "raisedOn", label: "Raised", kind: "date" },
      { key: "rootCause", label: "Root cause", kind: "longtext" },
      { key: "correctiveAction", label: "Corrective action", kind: "longtext" },
      { key: "dueBy", label: "Action due", kind: "date" },
    ],
    columns: ["title", "severity", "dueBy"],
    statuses: ["Open", "Investigating", "Action agreed", "Verified", "Closed"],
    transitions: [
      { from: "Open", to: "Investigating" },
      { from: "Investigating", to: "Action agreed" },
      { from: "Action agreed", to: "Verified" },
      { from: "Verified", to: "Closed" },
      { from: "Investigating", to: "Closed" },
    ],
    version: 1,
  },
  {
    key: "audit",
    label: "Audits",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "scope", label: "Scope", kind: "longtext" },
      { key: "auditor", label: "Auditor", kind: "text" },
      { key: "standard", label: "Standard", kind: "select", options: ["ISO 9001", "ISO 14001", "ISO 45001", "Internal", "Client", "Other"] },
      { key: "plannedOn", label: "Planned", kind: "date" },
      { key: "findings", label: "Findings", kind: "longtext" },
    ],
    columns: ["title", "standard", "plannedOn"],
    statuses: ["Planned", "In progress", "Reported", "Closed"],
    transitions: [
      { from: "Planned", to: "In progress" },
      { from: "In progress", to: "Reported" },
      { from: "Reported", to: "Closed" },
      { from: "Planned", to: "Closed" },
    ],
    version: 1,
  },
  {
    // `daysLost` IS A NUMBER AND THEREFORE NULLABLE, which is what makes an
    // LTIFR possible later: nought days lost and nobody having said yet are
    // different facts, and a rate computed over the second as though it were
    // the first understates exactly what the rate exists to expose.
    key: "incident",
    label: "HSE incidents",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "happenedOn", label: "Date", kind: "date", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Near miss", "First aid", "Medical treatment", "Lost time", "Environmental", "Property damage"] },
      { key: "daysLost", label: "Days lost", kind: "number" },
      { key: "description", label: "What happened", kind: "longtext", required: true },
      { key: "immediateAction", label: "Immediate action", kind: "longtext" },
    ],
    columns: ["title", "kind", "happenedOn"],
    statuses: ["Reported", "Investigating", "Closed"],
    transitions: [
      { from: "Reported", to: "Investigating" },
      { from: "Investigating", to: "Closed" },
    ],
    version: 1,
  },
  {
    // A PERMIT IS CANCELLED, NEVER DELETED. It is the record that work was
    // authorised on a particular day, and the day something goes wrong is the
    // day somebody asks to see it.
    key: "permit",
    label: "Permits to work",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Hot work", "Confined space", "Working at height", "Excavation", "Electrical", "Lifting"] },
      { key: "location", label: "Location", kind: "text" },
      { key: "validFrom", label: "Valid from", kind: "date" },
      { key: "validTo", label: "Valid to", kind: "date" },
      { key: "precautions", label: "Precautions", kind: "longtext" },
    ],
    columns: ["title", "kind", "validTo"],
    statuses: ["Requested", "Issued", "Closed", "Cancelled"],
    transitions: [
      { from: "Requested", to: "Issued" },
      { from: "Issued", to: "Closed" },
      { from: "Requested", to: "Cancelled" },
      { from: "Issued", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    key: "toolbox",
    label: "Toolbox talks",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "topic", label: "Topic", kind: "text", required: true },
      { key: "heldOn", label: "Held", kind: "date" },
      { key: "presenter", label: "Presenter", kind: "text" },
      { key: "attendees", label: "Attendees", kind: "number" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["topic", "heldOn", "attendees"],
    statuses: ["Planned", "Held"],
    transitions: [
      { from: "Planned", to: "Held" },
    ],
    version: 1,
  },
  {
    // THE HIRE RATE LIVES ON THE ASSET because it is what the studio charges
    // ITSELF to put this machine on a job. Nothing consumes it yet — charging
    // a deal for utilisation is its own slice — and it is stored now so the
    // register does not have to be rebuilt when that lands.
    key: "equipment",
    label: "Equipment register",
    parentSectionKey: "assets",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "category", label: "Category", kind: "select", options: ["Plant", "Vehicle", "Tool", "IT", "Instrument", "Other"] },
      { key: "serial", label: "Serial", kind: "text" },
      { key: "acquiredOn", label: "Acquired", kind: "date" },
      { key: "hireRate", label: "Internal hire rate", kind: "money" },
      { key: "location", label: "Location", kind: "text" },
    ],
    columns: ["name", "assetTag", "category"],
    statuses: ["In service", "Under repair", "Idle", "Disposed"],
    transitions: [
      { from: "In service", to: "Under repair" },
      { from: "Under repair", to: "In service" },
      { from: "In service", to: "Idle" },
      { from: "Idle", to: "In service" },
      { from: "Idle", to: "Disposed" },
      { from: "Under repair", to: "Disposed" },
    ],
    version: 1,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    parentSectionKey: "assets",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "kind", label: "Kind", kind: "select", options: ["Preventive", "Corrective", "Inspection"] },
      { key: "dueOn", label: "Due", kind: "date" },
      { key: "completedOn", label: "Completed", kind: "date" },
      { key: "cost", label: "Cost", kind: "money" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "kind", "dueOn"],
    statuses: ["Due", "In progress", "Done", "Skipped"],
    transitions: [
      { from: "Due", to: "In progress" },
      { from: "In progress", to: "Done" },
      { from: "Due", to: "Skipped" },
    ],
    version: 1,
  },
  {
    // EXPIRED RETURNS TO VALID because an instrument is RECALIBRATED rather
    // than replaced: the certificate number changes and the instrument does
    // not, so a fresh row each time would lose the history that proves it has
    // been in calibration all along.
    key: "calibration",
    label: "Calibration",
    parentSectionKey: "assets",
    fields: [
      { key: "instrument", label: "Instrument", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "certificate", label: "Certificate", kind: "text" },
      { key: "calibratedOn", label: "Calibrated", kind: "date" },
      { key: "dueOn", label: "Next due", kind: "date" },
      { key: "issuedBy", label: "Calibrated by", kind: "text" },
    ],
    columns: ["instrument", "certificate", "dueOn"],
    statuses: ["Valid", "Due", "Expired", "Withdrawn"],
    transitions: [
      { from: "Valid", to: "Due" },
      { from: "Due", to: "Valid" },
      { from: "Due", to: "Expired" },
      { from: "Expired", to: "Valid" },
      { from: "Valid", to: "Withdrawn" },
    ],
    version: 1,
  },
] as const;

const Types = repo<RecordType>("recordTypes");

/**
 * SEEDED, AND NEVER OVERWRITING. A studio that already has a type keeps it —
 * the same courtesy `nextPool` extends to service actions and the departments
 * register extends to a trade's chart.
 *
 * THE SECTION IS PLANTED FIRST and the type row written second. A type whose
 * section does not exist would serve records into a sub-section that falls back
 * to its root, where nothing reads them.
 *
 * A TYPE WHOSE PARENT SECTION IS ABSENT IS SKIPPED WHOLE, not planted at the
 * root: `plantTypeSection` answers null for exactly that case, and writing the
 * type row anyway would leave a type serving records into a section that does
 * not exist — the tender register's mistake, one layer up.
 *
 * The declaration is spread into fresh arrays because `BUILTIN_TYPES` is `as
 * const`: what is stored is a mutable copy of the seed, so a studio's row is
 * its own from the moment it is written rather than a view onto a frozen
 * literal shared by every tenant in the process.
 */
export async function seedBuiltinTypes(studioId: string): Promise<void> {
  const settings = await getSectionByKey(studioId, "administration-settings");
  if (!settings) return;
  const scope = { studio: { id: studioId }, section: settings };
  const existing = await Types.find(scope);

  for (const decl of BUILTIN_TYPES) {
    if (existing.some((t) => t.key === decl.key)) continue;
    const section = await plantTypeSection(studioId, decl);
    if (!section) continue;
    const at = new Date().toISOString();
    await Types.create(scope, {
      ...decl,
      fields: decl.fields.map((f) => ({ ...f })),
      columns: [...decl.columns],
      statuses: [...decl.statuses],
      transitions: decl.transitions.map((t) => ({ ...t })),
      sectionKey: engineSectionKey(decl.key),
      origin: "builtin",
      createdAt: at,
      updatedAt: at,
    });
  }
}
