// WHAT AN APPROVAL IS, as a schema rather than a description.
//
// THE SCHEMA DEFINES THE TYPE. `model.ts` writes exactly these fields and the
// types below are inferred from here, so a field added here reaches every reader.
//
// AN APPROVAL IS ONLY EVER RAISED BY A RECORD — the owner, 19/09/2026. Somebody
// presses Request approval on a bill, a leave request, a quotation; the approval
// is filed naming that record (`source`) and who asked. Nothing is typed in by
// hand. The single exception is `carried`: items the old board held when
// Approvals replaced it, converted once and never created again.
//
// THE STATUS LIVES HERE AND THE RECORD READS IT. A bill does not store "approved"
// — it asks for its latest approval (`latestFor`) and shows that approval's
// status. A copy would be a second answer free to disagree with the first.

import { z } from "zod";

export const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export const VERDICTS = ["Approved", "Rejected"] as const;

/**
 * ONE STEP OF AN APPROVAL: the people asked, and whether ALL of them must say
 * yes or ANY ONE of them is enough (the owner's checkbox). Steps are answered
 * one after the other; a step is not open until the one before it is done.
 *
 * NAMED PEOPLE, NEVER A ROLE OR A DEPARTMENT HEAD — the owner, 19/09/2026.
 * `approverIds` are CollaboratorIDs (invariant 6).
 */
export const ApprovalStepSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(80),
  approverIds: z.array(z.string().max(60)),
  requireAll: z.boolean(),
  /**
   * THE AMOUNT AT OR ABOVE WHICH THIS STEP APPLIES, in the studio's currency —
   * the owner, 19/09/2026: "a bill has step 1 for everyone and step 2 from
   * 50,000". Absent or 0 means always. Only a type that carries an amount
   * (`amounted` in ./registry) reads it; on any other it is ignored.
   *
   * AT OR ABOVE, not above — the old chains' reading of "bills over 50000 need
   * the FD", the safer of the sentence's two readings.
   */
  from: z.number().min(0).optional(),
});

/** How one approval type is answered in this studio: its steps, in order. */
export const ApprovalSettingSchema = z.object({
  steps: z.array(ApprovalStepSchema),
});

/** One person's answer at one step. Final: a decision is not taken back. */
export const DecisionSchema = z.object({
  stepId: z.string().max(40),
  collaboratorId: z.string().max(60),
  verdict: z.enum(VERDICTS),
  at: z.string(),
  note: z.string().max(1000),
});

/**
 * WHERE THE APPROVAL CAME FROM. `sectionKey` is the section the record is filed
 * under and `recordId` is the record, so the Approvals page can link back and the
 * record can find its approval. `ref` and `title` are what a person recognises it
 * by — "BILL-0042", "Annual leave, 3 days" — copied at request time because the
 * approver may not hold the right to open the record itself.
 */
export const ApprovalSourceSchema = z.object({
  sectionKey: z.string().max(80),
  recordId: z.string().max(60),
  ref: z.string().max(80),
  title: z.string().max(200),
  /**
   * WHERE "Open the record" LANDS, under the studio — `crm-sales-tickets/<id>`
   * for a quotation raised from a ticket. Optional: without it the link opens
   * the section. The record is still named by `sectionKey` and `recordId`;
   * this is only the door a person walks through.
   */
  path: z.string().max(200).optional(),
});

/**
 * THE AMOUNT A REQUEST WAS JUDGED BY, frozen onto it with the rate that
 * converted it — the old chains' rule: a rate moving overnight cannot re-route a
 * request already asked, because which steps it walks is a recorded fact about it.
 */
export const ApprovalAmountSchema = z.object({
  value: z.number(),
  currency: z.string().max(8),
  /** In the studio's currency — what the thresholds are compared with. */
  inBase: z.number(),
  /** Null when no conversion happened. */
  rate: z.number().nullable(),
});

export const ApprovalSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  type: z.string().max(40),
  status: z.enum(APPROVAL_STATUSES),
  source: ApprovalSourceSchema,
  requestedByCollaboratorId: z.string().max(60),
  requestedAt: z.string(),
  /**
   * THE STEPS AS THEY STOOD WHEN IT WAS REQUESTED, frozen onto the approval —
   * the same reason a bill freezes its approval plan. Changing the settings
   * tomorrow must not change who was asked to approve something today, or an
   * approval could complete under rules nobody applied to it.
   */
  steps: z.array(ApprovalStepSchema),
  decisions: z.array(DecisionSchema),
  /** When the overall status stopped being Pending. Empty while pending. */
  decidedAt: z.string(),
  /** What the requester added when asking. */
  note: z.string().max(4000),
  /**
   * WHAT DECIDING IT DID TO THE RECORD (./effects): when the record was moved,
   * and why not if it could not be. Absent on a type whose record reads its
   * approval and moves nothing of its own.
   */
  finish: z.object({ at: z.string(), error: z.string().max(80) }).optional(),
  /** What it is worth, for a type that carries an amount. */
  amount: ApprovalAmountSchema.optional(),
  /** A document the request carries — a client's purchase order, say. */
  attachment: z.object({
    url: z.string(),
    name: z.string().max(200),
  }).optional(),
});

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type Verdict = (typeof VERDICTS)[number];
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>;
export type ApprovalSetting = z.infer<typeof ApprovalSettingSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type ApprovalSource = z.infer<typeof ApprovalSourceSchema>;
export type ApprovalAmount = z.infer<typeof ApprovalAmountSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
