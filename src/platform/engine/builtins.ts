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
