// WHAT AN INSPECTION STORES — proof that somebody checked, and what they found.
//
// Blueprint §2.4: "Quality gate: ITP checkpoint or snag (A), production QC (B),
// commissioning sign-off with customer signature (D), SLA check (G)."
//
// IT IS EVIDENCE, NOT A DECISION. Its object class is `evidence`, which is what
// puts it below intent and execution in the contribution ranking (Law 4): it
// reports what was observed, and observation fills blanks rather than winning
// arguments about what the deal is.
//
// IT BELONGS TO QUALITY & HSE AND IS FILED UNDER PROJECTS. `quality-hse` is in
// NO_SCREEN_YET and holds no permission areas by design — a right nothing can
// exercise is a bug (invariant 16) — so this answers to `projects.list` until
// that section has a screen. The stage registry entry says the same, and the
// blueprint puts this work in project execution either way.
import { z } from "zod";

/**
 * WHICH KIND OF CHECK — one word per template, and they are genuinely different
 * events rather than one event with different names:
 *
 *   itp-hold-point  a planned gate in an inspection & test plan. Work stops
 *                   until it passes (Template A).
 *   snag            a defect found after the fact, raised to be fixed (A).
 *   production-qc   a check on what was made (B).
 *   commissioning   handover sign-off with the customer present (D).
 *   sla-check       a periodic service-level verification (G).
 */
export const INSPECTION_KINDS = [
  "itp-hold-point", "snag", "production-qc", "commissioning", "sla-check",
] as const;

/**
 * WHAT WAS FOUND. `pending` is the state an inspection is RAISED in — a hold
 * point is scheduled before it is walked, and a snag exists from the moment it
 * is noticed — so it is a real answer rather than a missing one.
 *
 * `pass-with-comments` is separate from `pass` because the two mean different
 * things to whoever reads the register afterwards: one closes the gate, the
 * other closes it while leaving something on record that was not right.
 */
export const INSPECTION_RESULTS = ["pending", "pass", "pass-with-comments", "fail"] as const;

export const InspectionSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),

  /** Blank until issued, exactly as a contract's number is. */
  reference: z.string(),
  title: z.string().max(200),

  /** THE DEAL THIS CHECKS. Not optional — an inspection of nothing proves nothing. */
  dealId: z.string(),

  /**
   * WHAT WAS INSPECTED, when the deal names it. Both may be empty: a deal is
   * executed as a project in Templates A and E and as jobs in B, D and G, and a
   * commissioning check on a whole handover belongs to neither.
   */
  projectId: z.string(),
  jobId: z.string(),

  kind: z.enum(INSPECTION_KINDS),
  result: z.enum(INSPECTION_RESULTS),

  /**
   * WHERE THE CHECK HAPPENED — the inspection's own fact, not a copy of the
   * deal's `site`. A deal can be inspected in several places (a fabrication
   * shop, then the site it is installed on), so the place belongs to the event.
   * It is OFFERED to the deal as `site` when the deal has none, which is exactly
   * the contribution rule: evidence fills a blank and never overwrites.
   */
  location: z.string().max(300),

  scheduledDate: z.string(),
  /** When it was actually walked. Empty while `result` is still `pending`. */
  inspectedAt: z.string(),

  /**
   * WHO CHECKED — a CollaboratorID, never a UserID (invariant 6) and never a
   * name; the alias is resolved live from the collaborator record.
   *
   * THE CUSTOMER'S SIGNATURE (Template D's commissioning sign-off) IS NOT HERE.
   * A customer is not a collaborator, and there is no signature capture for a
   * non-collaborator anywhere in this product yet — a field holding a typed name
   * would look like a signature and be worth nothing as one.
   */
  inspectedByCollaboratorId: z.string(),

  /** What was found, in the inspector's words. The substance of the record. */
  findings: z.string().max(4000),
  notes: z.string().max(4000),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Inspection = z.infer<typeof InspectionSchema>;
