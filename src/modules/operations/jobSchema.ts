// WHAT A JOB STORES — the short-form execution unit.
//
// Blueprint §2.4: "Short-form execution unit. `kind`: work order (B), site work
// package (A), service job (D), scheduled visit (G)."
//
// IT IS NOT A SMALL PROJECT, and the difference is why both exist. A project has
// phases, a schedule and a budget, and there is at most one per deal. A job is a
// unit of work that is dispatched, done and closed — many per deal — and in
// Template D it HEADS the deal outright: a warranty call is a job with no sale,
// no quotation and no project behind it.
//
// IT IS NOT A TASK EITHER. A task is a work item on a board (`control` class); a
// job is `execution` — it is the doing, which is what puts it above commitment
// in the contribution ranking. The site a crew actually went to is better
// evidence than the site a contract was drafted against.
import { z } from "zod";

/**
 * WHICH KIND OF EXECUTION UNIT — one per template that needs one, and they are
 * scheduled and staffed differently rather than being one thing renamed:
 *
 *   work-order      a production order on the shop floor (B)
 *   work-package    a slice of a project's site works (A)
 *   service-job     a call-out: repair, warranty, installation (D)
 *   scheduled-visit a visit generated from a recurring contract's cadence (G)
 */
export const JOB_KINDS = ["work-order", "work-package", "service-job", "scheduled-visit"] as const;

/**
 * WHERE THE WORK HAS GOT TO. `cancelled` is a terminal state beside `completed`
 * rather than a deletion: a job that was dispatched and then called off is part
 * of what happened on the deal, and the crew's time is still booked against it.
 */
export const JOB_STATUSES = ["scheduled", "in-progress", "completed", "cancelled"] as const;

export const JobSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /** Blank until issued, exactly as a contract's number is. */
  number: z.string(),
  title: z.string().max(200),

  /**
   * THE DEAL THIS EXECUTES. Not optional and not derived: a job is not in the
   * unassigned pen's list of types, because a crew dispatched against no deal is
   * work whose cost nothing can attract (Law 7).
   */
  dealId: z.string(),

  /**
   * THE PROJECT THIS SERVES, when there is one — and it is empty in Template D,
   * where the job IS the execution. Requiring it would make the record
   * unwritable in the one flow that needs it most.
   */
  projectId: z.string(),

  kind: z.enum(JOB_KINDS),
  status: z.enum(JOB_STATUSES),

  /**
   * WHERE THE CREW GOES — the job's own fact, not a copy of the deal's `site`.
   * A deal can have jobs at several addresses, so the place belongs to the unit
   * of work. It is OFFERED to the deal as `site`; because `execution` outranks
   * `commitment`, a job's location beats a contract's drafted one, which is the
   * blueprint's intended outcome rather than an accident of ordering.
   */
  location: z.string().max(300),

  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  /** Stamped by the transition, never typed. Empty until the job closes. */
  completedAt: z.string(),

  /**
   * WHO IS ON IT — CollaboratorIDs, never UserIDs (invariant 6) and never
   * aliases. An array because a job is a crew as often as a person, and a
   * single-holder field would force one dispatch into two jobs.
   */
  assignedToCollaboratorIds: z.array(z.string()),

  notes: z.string().max(4000),

  /**
   * THE CUSTOMER'S SIGNATURES — an ARRAY, appended and never replaced.
   *
   * Declared here because it is stored: a field written by the product and
   * absent from the schema is the `unitCost` defect from the other end, where
   * every reader invents its own inline shape to reach it. Optional because
   * every job written before sign-off existed has none, and a required array
   * would make those rows fail to parse.
   */
  signoffs: z.array(z.object({
    signedByName: z.string().max(160),
    signedByTitle: z.string().max(120),
    /** The private media record holding the drawn mark. */
    mediaId: z.string().max(80),
    notes: z.string().max(1000),
    /** Who CAPTURED it — a CollaboratorID, never the customer (invariant 6). */
    capturedByCollaboratorId: z.string(),
    at: z.string(),
  })).optional(),

  // ---- ONE JOB SYSTEM (tier 5) -----------------------------------------------
  // Service orders were a second job system in the record engine, and contracts,
  // PM plans and the installed base linked to nothing and generated nothing.
  // A job now NAMES what it is about — optional, because a call-out may be none
  // of these — and every one is an engine record's id, resolved by the reader.

  /** The maintenance contract (engine `contract`) this visit is under. */
  contractId: z.string().max(60).optional(),
  /** The installed unit (engine `installed`) the crew is attending. */
  installedUnitId: z.string().max(60).optional(),
  /**
   * THE PM PLAN THAT RAISED THIS, and which OCCURRENCE — the plan's `nextDue`
   * on the day the daily run raised it. The pair is what makes the run
   * idempotent: an occurrence that already has a job is never raised twice.
   */
  planId: z.string().max(60).optional(),
  planOccurrence: z.string().max(10).optional(),
  /**
   * THE SERVICE ORDER THIS WAS MIGRATED FROM — `scripts/migrate/service-orders-
   * to-jobs.mjs` skips any service order a job already names, so the script is
   * safe to re-run and a second run reports zero.
   */
  migratedFromRecordId: z.string().max(60).optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Job = z.infer<typeof JobSchema>;
