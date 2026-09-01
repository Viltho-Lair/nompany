// WHAT A TIMESHEET STORES — THE labor record.
//
// Blueprint §2.4: "THE labor record. Entries carry normal and overtime hours;
// overtime priced at the employee's own ratio. All capture paths write here;
// per-employee summaries are read-time views, never stores."
//
// WHY IT IS A HEADER WITH ENTRIES rather than one row per person per day. A
// timesheet is submitted and approved as a unit — a foreman signs off a crew's
// week, not fourteen separate claims — so the approval state belongs to the
// header. Splitting it into rows would put a status on each line and leave
// nothing able to say what was actually signed.
//
// IT IS NOT `overtimes`, AND IT DOES NOT REPLACE IT YET. `overtimes` is a live
// collection with a live screen recording overtime ALONE; the blueprint's §7
// correction is that labor must widen from that to full timesheets, which is
// what this is. Nothing migrates the old rows and nothing double-counts them —
// see docs/functionality/engagements.md.
import { z } from "zod";

/**
 * ONE PERSON, ONE DAY, ON ONE DEAL.
 *
 * NORMAL AND OVERTIME ARE SEPARATE NUMBERS and must stay separate. They are not
 * two parts of one total: they are priced differently, they are argued about
 * differently, and a single `hours` figure cannot be un-collapsed afterwards —
 * the information is gone the moment it is added up.
 */
export const TimesheetEntrySchema = z.object({
  /**
   * WHO WORKED — a CollaboratorID, never a UserID (invariant 6) and never a
   * name. The alias is resolved live from the collaborator record; a copy here
   * is what goes stale the day somebody's alias is corrected.
   */
  collaboratorId: z.string(),
  date: z.string(),

  normalHours: z.number(),
  overtimeHours: z.number(),

  /**
   * THE PRICE AT CAPTURE, and it is a SNAPSHOT on purpose — the one place this
   * record deliberately does not read live.
   *
   * A labor cost that re-priced itself from the employee's current rate would
   * silently rewrite last month's project cost the day HR gives somebody a
   * raise, and no report would show that anything had moved. The rate that
   * applied when the hours were worked is a fact about those hours.
   *
   * NUMERIC in the store's terms and never a float at rest: money is
   * `NUMERIC(19,4)` when it reaches a column of its own.
   */
  normalRate: z.number(),
  /**
   * THE EMPLOYEE'S OWN RATIO — the blueprint's words, and the reason overtime is
   * not simply "more hours at the same rate". 1.5 and 2.0 are the usual ones and
   * they differ per person and per contract, so a studio-wide constant would be
   * wrong for whichever employees it was not written for. A multiplier rather
   * than a second rate, so a raise moves both together.
   */
  overtimeRatio: z.number(),

  /** Which job's labour this is, when the deal is executed as jobs rather than a project. */
  jobId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const TIMESHEET_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

export const TimesheetSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /** Blank until issued, exactly as a contract's number is. */
  reference: z.string(),

  /** THE DEAL THIS LABOUR WAS SPENT ON. Not optional — a cost with no deal is what Law 7 refuses to allow. */
  dealId: z.string(),

  /**
   * WHICH PROJECT, WHEN THERE IS ONE — and it may be empty. A deal is executed
   * as a project in Templates A and E and as jobs in B, D and G, so requiring
   * one here would make the record unwritable in the other flow. The DEAL is
   * what every timesheet has in common; how that deal is being executed is the
   * deal's business, not this record's. Job-level labour is named per entry
   * instead (`entries[].jobId`), because a crew's day can cross two jobs on the
   * same deal and a header field could not say which hours went where.
   */
  projectId: z.string(),

  /** The week (or fortnight, or month) this sheet covers. */
  periodStart: z.string(),
  periodEnd: z.string(),

  entries: z.array(TimesheetEntrySchema),

  status: z.enum(TIMESHEET_STATUSES),

  /**
   * Invariant 7's two signatories, recorded so the transition can enforce that
   * they are different people. CollaboratorIDs, never UserIDs (invariant 6).
   */
  submittedByCollaboratorId: z.string(),
  submittedAt: z.string(),
  approvedByCollaboratorId: z.string(),
  approvedAt: z.string(),

  notes: z.string().max(4000),

  createdAt: z.string(),
  updatedAt: z.string(),

  // NO `totalHours` AND NO `cost`. Both are one pass over `entries`, and a
  // stored copy would be whatever the last verb to touch the sheet happened to
  // compute — see timesheetTotals in ./timesheets, which is where they live.
});

export type TimesheetEntry = z.infer<typeof TimesheetEntrySchema>;
export type Timesheet = z.infer<typeof TimesheetSchema>;
