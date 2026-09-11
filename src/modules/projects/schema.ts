// WHAT PROJECTS STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/**
 * A PROJECT, opened from an approved quotation and carrying the whole chain's
 * keys — quotation, RFQ, ticket, client. Every row downstream reads them from
 * here rather than from a copy of its own.
 *
 * `number` STARTS EMPTY and is issued later, by Finance signing the PO. A
 * project opened before that has a blank number, which is the state the screens
 * are designed around rather than a missing value.
 */
export const ProjectSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  number: z.string(),
  title: z.string().max(200),
  quotationId: z.string(),
  quotationNumber: z.string(),
  rfqId: z.string(),
  ticketId: z.string(),
  /**
   * THE WON TENDER THIS PROJECT WAS HANDED OVER FROM, and its reference.
   *
   * OPTIONAL, because every project already in the database predates the
   * handover — the same reason a bill's `approvals` is optional. A project
   * from a quotation or raised directly writes "" for both.
   *
   * `tenderRef` is COPIED and the rest of the tender is not, which is the one
   * exception this lineage makes to reading live: the ref is the number a
   * client and a bid bond quote, it never changes once issued (invariant 10),
   * and it has to read correctly on the project even in a studio where nobody
   * can open the Tendering section.
   */
  tenderId: z.string().optional(),
  tenderRef: z.string().optional(),
  clientId: z.string(),
  clientName: z.string(),
  value: z.number(),
  stage: z.string(),
  managerCollaboratorId: z.string().max(60),
  location: z.string().max(200),
  /**
   * The description of the work. Required rather than optional: `openProject`
   * has always written the field, as `""` on the quotation head — which sends
   * no description — and as the typed text on the direct head. Capped at 4000
   * characters by the coercion that stores it.
   */
  notes: z.string().max(4000),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string().optional(),
  /**
   * How long the studio supports it after handover. Set on the project, not
   * the SLA.
   *
   * IT IS THE WARRANTY CLOCK NOW. It was stored, editable and read by nothing
   * — a number in a form that computed no answer — until `closurePosition`
   * started running it from `handoverAt` below. No `warrantyMonths` was minted
   * beside it: `retentionReleaseDate` already calls itself the
   * defects-liability end, and a third name for one idea is two too many.
   */
  supportPeriodDays: z.number().optional(),

  // ---- closure, added by the punch list and warranty tracker --------------
  // ALL OPTIONAL, because every project already in the database predates them
  // — the same reason `tenderId` is. Absent reads as a job that has not got
  // there yet, which is true of most of them.
  //
  // AND CLOSURE IS NOT A STAGE. `PROJECT_STAGES` is a DEFAULT a studio may
  // replace, so a rule hung on the word "Completed" would stop applying to any
  // studio that renamed its columns. These dates mean the same thing whatever a
  // studio calls its stages.
  /** The day the works became usable. Gates closing; nothing recorded it before. */
  practicalCompletionAt: z.string().optional(),
  /** The day it was handed over. THE SUPPORT CLOCK RUNS FROM HERE. */
  handoverAt: z.string().optional(),
  /** When the final account was agreed. Recorded, and gates nothing. */
  finalAccountAt: z.string().optional(),
  /** Set once, by `closeProject`, and never unset — see `closureProblem`. */
  closedAt: z.string().optional(),
  closedByCollaboratorId: z.string().max(60).optional(),
  /**
   * RETENTION — the percentage a client withholds from each claim, and the date
   * the last of it becomes payable (the defects-liability end).
   *
   * BOTH OPTIONAL, because every project already in the database predates them,
   * the same reason `tenderId` above is. Absent reads as a contract with no
   * retention, which is a real and common arrangement rather than a gap.
   *
   * They live on the PROJECT rather than on each milestone because retention is
   * a term of the contract, not of a claim: one percentage governs the job, and
   * a copy per line would be free to disagree with itself.
   */
  retentionPercent: z.number().optional(),
  retentionReleaseDate: z.string().optional(),
});

/**
 * ONE EMERGENCY CALL-OUT. Stored, unlike the planned schedule — a call-out
 * happened on a date somebody recorded, where a planned visit is arithmetic
 * over the contract's duration and visit count.
 */
export const EmergencyVisitSchema = z.object({
  id: z.string().max(30),
  date: z.string().max(10),
  completed: z.boolean(),
});

/** A service-level commitment on a project. */
export const SlaSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),

  // ---- the contract, as slaFields writes it -------------------------------
  signingDate: z.string().optional(),
  startDate: z.string().optional(),
  durationDays: z.number().optional(),
  /** How many planned visits the duration is divided into. At least one. */
  visits: z.number().optional(),
  /** The ALLOWANCE, not the list — how many call-outs the contract permits. */
  emergencyVisits: z.number().optional(),
  notes: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),

  // ---- what the ticks and the call-outs write ------------------------------
  /** Indexes of planned visits marked done, 1-based and bounded by `visits`. */
  completedVisits: z.array(z.number()).optional(),
  emergencyVisitsList: z.array(EmergencyVisitSchema).optional(),
});

/** Hours worked beyond the plan, per person. */
export const OvertimeSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().optional(),
  collaboratorId: z.string().optional(),
  date: z.string().optional(),
  hours: z.number().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

/**
 * ONE LINE OF A PROJECT'S COST BREAKDOWN — what a part of the job is allowed to
 * cost.
 *
 * A project has always had exactly ONE number, `value`: what the studio will be
 * paid. Nothing said what any of it was allowed to COST, so "are we over on
 * this trade" could not be asked. The handover made that sharper rather than
 * better — it carries a tender's bill total in as the value, and the bill's own
 * groups are precisely the breakdown there was nowhere to record.
 *
 * ITS OWN COLLECTION, not an array on the project, for the reason a BOQ line is
 * its own: a breakdown grows with the job, and the migration design names
 * nested line arrays as the shape it is moving away from.
 *
 * `budget` IS A COST, NOT A PRICE. What a group of the bill was SOLD for is
 * where a proposed breakdown starts (`codesFromBill`), and a studio that
 * expects to spend less than it charged edits it down — which is the entire
 * point of keeping the two apart.
 */
/**
 * A LINE OF THE PAYMENT SCHEDULE — what may be billed, and when it is earned.
 *
 * THE AMOUNT IS ABSOLUTE, never a percentage of the project's value. A stored
 * percentage would silently re-price every milestone the moment `value` moved
 * and give one number two sources; `projectBilling` surfaces `unscheduled`
 * instead, exactly as the cost breakdown surfaces `unallocated`. The screen
 * offers "% of value" as an entry convenience that resolves to an amount before
 * it is stored.
 *
 * THERE IS NO `Invoiced` STATUS. Whether a milestone has been billed is derived
 * from the invoices naming it, because a stored flag and a real invoice are two
 * answers that part company the first time one is cancelled. `status` is
 * Pending or Ready and nothing else — see MILESTONE_STATUSES.
 */
export const ProjectMilestoneSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().max(60),
  /** The studio's own reference for this claim. Unique per project. */
  code: z.string().max(40),
  name: z.string().max(200),
  amount: z.number(),
  /** When the work behind it is due. Optional: not every schedule is dated. */
  dueDate: z.string(),
  status: z.string(),
  notes: z.string().max(1000),
  sortOrder: z.number(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectCostSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().max(60),
  /** The studio's own reference for this part of the job. Unique per project. */
  code: z.string().max(40),
  name: z.string().max(200),
  budget: z.number(),
  notes: z.string().max(1000),
  sortOrder: z.number(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * ONE PROGRESS CLAIM — an interim payment application (tier 6). Lines are
 * COPIED from the tender's bill or the quotation when the claim is opened, the
 * payroll run's rule: what was applied for must not move when the source does.
 * Quantities are cumulative; `certifiedQty` is null until the client certifies.
 * Whether it has been invoiced is DERIVED from the invoices naming `claimId`,
 * never stored — the milestone's rule. See progressClaims.ts.
 */
export const ProgressClaimLineSchema = z.object({
  key: z.string().max(60),
  code: z.string().max(40),
  description: z.string().max(1000),
  unit: z.string().max(24),
  qty: z.number(),
  rate: z.number(),
  claimedQty: z.number(),
  certifiedQty: z.number().nullable(),
});

export const ProgressClaimSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().max(60),
  /** IPC-01, IPC-02 … per project, never reused. */
  number: z.string().max(20),
  periodEnd: z.string(),
  status: z.string(),
  /** What the lines were copied from: the tender's bill or the quotation. */
  basis: z.string(),
  lines: z.array(ProgressClaimLineSchema),
  submittedAt: z.string().optional(),
  certifiedAt: z.string().optional(),
  certifiedByCollaboratorId: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCost = z.infer<typeof ProjectCostSchema>;
export type ProgressClaim = z.infer<typeof ProgressClaimSchema>;
export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;
export type Sla = z.infer<typeof SlaSchema>;
export type EmergencyVisit = z.infer<typeof EmergencyVisitSchema>;
export type Overtime = z.infer<typeof OvertimeSchema>;
