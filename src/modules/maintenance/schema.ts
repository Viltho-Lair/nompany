// WHAT MAINTENANCE STORES, as a schema rather than a description.
//
// Transcribed from the coercion in ./maintenance that writes it. The rules that
// decide which values are allowed live in ./model, pure, so the screen refuses
// exactly what the server refuses.

import { z } from "zod";

/**
 * A FAULT REPORT — anybody's word that something is wrong. It is not work yet:
 * somebody holding `maintenance.orders.create` accepts it (which raises a work
 * order naming it) or declines it with a reason.
 *
 * ONLY `Declined` IS STORED as a status. Accepted is derived from the work
 * order that names the request (see `requestState`), so `status` here is
 * "Open" or "Declined" and nothing else.
 */
export const WorkRequestSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** WR-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  priority: z.string(),
  /** An engine `equipment` record's id, or "". */
  assetId: z.string().max(60),
  /** A Master-data location's id, or "". */
  locationId: z.string().max(60),
  /** `/api/media/<id>` paths — private, served only after a membership check. */
  photos: z.array(z.string().max(120)),
  /**
   * THE REPORTER SAYS THE MACHINE HAS STOPPED. Accepting the request then
   * starts the work order's downtime at the moment of the report, which is the
   * closest anybody will get to when it actually went down.
   */
  machineDown: z.boolean().optional(),
  status: z.string(),
  declineReason: z.string().max(1000).optional(),
  decidedByCollaboratorId: z.string().optional(),
  decidedAt: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkRequest = z.infer<typeof WorkRequestSchema>;

/** One step on the ladder, as it happened. Appended under a function patch. */
export const OrderStepSchema = z.object({
  status: z.string(),
  at: z.string(),
  byCollaboratorId: z.string(),
  /** A hold's reason token, when the step was a hold. */
  note: z.string().optional(),
});

/**
 * WORK SOMEBODY AUTHORISED, planned and assigned.
 *
 * The timestamps are what the reliability figures are made of — `startedAt` is
 * the FIRST start (a resume after a hold does not move it), `completedAt` the
 * technician's word, `closedAt` the reviewer's. Every one is stamped by a move
 * (`moveStamps` in ./model), never typed.
 */
export const WorkOrderSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** WO-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  assetId: z.string().max(60),
  locationId: z.string().max(60),
  /** The request this answers, or "" for work raised directly. */
  requestId: z.string().max(60),
  /** CollaboratorIDs (invariant 6), checked against the studio on write. */
  assignedToCollaboratorIds: z.array(z.string()),
  dueOn: z.string().max(10),
  estimatedHours: z.number().nullable(),
  photos: z.array(z.string().max(120)),
  holdReason: z.string().optional(),
  /** What was done. Required to complete (`orderMoveProblem`). */
  resolution: z.string().max(4000).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  closedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  history: z.array(OrderStepSchema).optional(),
  /** The preventive plan that raised this, or "" for work raised by a person. */
  pmPlanId: z.string().max(60).optional(),
  /**
   * THE OCCURRENCE IT ANSWERS — the plan's due date when it was raised. What
   * PM compliance is measured against, and what makes the daily run
   * idempotent (a second run finds the order for this date and raises none).
   */
  pmDueOn: z.string().max(10).optional(),
  /** The plan's checklist, copied at raising, one tick per step. */
  checklist: z.array(z.object({ id: z.string(), label: z.string().max(200), done: z.boolean() })).optional(),
  /**
   * WHEN THE MACHINE WENT DOWN AND CAME BACK — ISO instants. MTTR and
   * availability are made of these, not of labour: an hour's work after three
   * days waiting for a part kept the machine out three days. `upAt` is stamped
   * at completion if nobody gave one, and cleared if the work is reopened.
   */
  downSince: z.string().max(40).optional(),
  upAt: z.string().max(40).optional(),
  /** What failed, why, and what put it right — the studio's failure-code lists. */
  failure: z.object({ problem: z.string(), cause: z.string(), remedy: z.string() }).optional(),
  /** For a METER plan's order: the reading it answers — idempotency, as `pmDueOn` is for a date. */
  pmDueReading: z.number().optional(),
  /**
   * FOR A CONDITION PLAN'S ORDER: the `conditionReadings` row that breached.
   * The ID rather than the value, because two breaches can read the same number
   * and keying on the number would silence the second for ever (./condition).
   */
  conditionReadingId: z.string().max(60).optional(),
  /** What that reading said, and which way it was out — kept for the record. */
  conditionValue: z.number().optional(),
  conditionBreach: z.string().max(10).optional(),
  /**
   * A CUSTOMER'S UNIT rather than the studio's own machine — an engine
   * `installed` record. The two are different registers because they are
   * different things: what the studio owns, and what it looks after for a
   * customer. An order names either, or neither.
   */
  installedId: z.string().max(60).optional(),
  /** The service contract this work answers, or "" — see ./contracts. */
  slaId: z.string().max(60).optional(),
  /** Which planned visit it is (1-based) — idempotency for the daily run. */
  slaVisit: z.number().optional(),
  /** A call-out under the contract's allowance, rather than a planned visit. */
  slaEmergency: z.boolean().optional(),
  /** The engine record this was folded from, so a re-run of the fold skips it. */
  legacyRecordId: z.string().optional(),
  /**
   * WHAT THE OLD ASSETS REGISTER RECORDED THIS COST — its only cost figure. An
   * order's own cost comes from the stock ledger, which never saw that work, so
   * without this it would read as free. Written by the fold alone; shown on the
   * order.
   */
  legacyCost: z.number().nullable().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;

/**
 * A PREVENTIVE PLAN — work that comes round on a calendar. The daily run
 * raises a work order from it when `nextDue` arrives (less `leadDays`), one
 * open order at a time; see ./schedule for fixed against floating.
 */
export const PmPlanSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** PM-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  title: z.string().max(200),
  description: z.string().max(4000),
  /** preventive · inspection — a plan never raises corrective work. */
  type: z.string(),
  priority: z.string(),
  assetId: z.string().max(60),
  locationId: z.string().max(60),
  assignedToCollaboratorIds: z.array(z.string()),
  /** One of PLAN_FREQUENCIES — Field Service's list. */
  frequency: z.string(),
  /** fixed · floating. */
  scheduleMode: z.string(),
  nextDue: z.string().max(10),
  leadDays: z.number(),
  estimatedHours: z.number().nullable(),
  /** Step labels. Each order gets its own ticked copy. */
  checklist: z.array(z.string().max(200)),
  /**
   * calendar · meter · condition. A METER plan falls due when the machine's
   * latest reading on `meterUnit` reaches `nextDueReading`, then every
   * `meterEvery` after; its frequency and date fields are unused. Absent reads
   * as calendar, so every plan written before meters existed stays exactly as
   * it was.
   */
  trigger: z.string().optional(),
  meterUnit: z.string().optional(),
  meterEvery: z.number().optional(),
  nextDueReading: z.number().nullable().optional(),
  /**
   * A CONDITION PLAN IS A MEASURING POINT: what is measured on this machine, in
   * what unit, and the band it must stay inside. It runs on no schedule at all
   * — every date and interval field above is unused — and raises work the
   * moment a reading falls outside (./condition).
   *
   * THE UNIT IS TYPED, not chosen from a list: °C, mm/s, bar, ppm, dB. Any
   * fixed list would be wrong for somebody, and a point's unit is the studio's
   * own data, like the name of a section.
   *
   * EITHER LIMIT MAY BE NULL, and null is not nought — plenty of points have
   * only a ceiling (a temperature) or only a floor (an oil pressure).
   */
  conditionLabel: z.string().max(60).optional(),
  conditionUnit: z.string().max(12).optional(),
  limitLow: z.number().nullable().optional(),
  limitHigh: z.number().nullable().optional(),
  /** A customer's unit (engine `installed`) the plan services, or "". */
  installedId: z.string().max(60).optional(),
  /** The service contract the plan fulfils, or "". Carried onto every order. */
  slaId: z.string().max(60).optional(),
  /** The Field Service plan this was folded from, so a re-run skips it. */
  legacyRecordId: z.string().optional(),
  /** Active · Paused · Retired. */
  status: z.string(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PmPlan = z.infer<typeof PmPlanSchema>;

/**
 * HOW FAR A MACHINE HAD RUN, AND WHEN. Cumulative, so only ever higher than
 * the last — unless `reset` says the meter was replaced (./meters). Filed under
 * Machines, the machine's own record.
 */
export const MeterReadingSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  assetId: z.string(),
  /** hours · km · cycles. */
  unit: z.string(),
  value: z.number(),
  readAt: z.string(),
  reset: z.boolean(),
  note: z.string().max(300),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
});
export type MeterReading = z.infer<typeof MeterReadingSchema>;

/**
 * WHAT A GAUGE SAID, AND WHEN — a condition reading.
 *
 * ITS OWN COLLECTION, NOT `meterReadings`, and that is the point rather than
 * tidiness: a meter only goes up, and ./meters enforces it. A temperature
 * falls, is often back-dated off a logbook, and can be below nought. Filing
 * both in one place would leave nobody able to rely on the rule that makes a
 * meter worth trusting. Filed under Machines, beside the meters.
 *
 * IT NAMES ITS PLAN, because the plan IS the measuring point — what is
 * measured, in what unit, inside what band. `assetId` is copied from the plan
 * so the machine's own screen can show its points without joining the plans.
 */
export const ConditionReadingSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** The condition plan this is a reading of. */
  planId: z.string().max(60),
  /** The machine, copied from the plan at the time of reading. */
  assetId: z.string().max(60),
  value: z.number(),
  readAt: z.string(),
  note: z.string().max(300),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
});
export type ConditionReading = z.infer<typeof ConditionReadingSchema>;

/**
 * ONE EMERGENCY CALL-OUT RECORDED BEFORE 11/09/2026, when a call-out was a
 * dated line on the contract rather than a work order. Still read — each one
 * counts against the allowance — and no longer written.
 */
export const EmergencyVisitSchema = z.object({
  id: z.string().max(30),
  date: z.string().max(10),
  completed: z.boolean(),
});
export type EmergencyVisit = z.infer<typeof EmergencyVisitSchema>;

/**
 * A SERVICE CONTRACT (SLA) — the maintenance a studio sells: a period, a number
 * of planned visits spread evenly across it, and an allowance of call-outs.
 *
 * FILED IN `slas` UNDER `projects-sla`, where every contract was written while
 * this was Projects' screen; Maintenance reads it as a foreign section
 * (FILED_ONLY_SECTION_KEYS in keys.ts). LOOSE and mostly optional, because the
 * rows already stored predate every field added on 11/09/2026.
 *
 * THE VISIT DATES ARE NOT STORED — ./contracts derives them from the start,
 * duration and count, so editing any of the three reschedules every visit. What
 * a visit CAME TO is read off the work order that names it (`slaId` +
 * `slaVisit`); `completedVisits` is the older hand tick, still honoured.
 */
export const SlaSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  title: z.string().optional(),
  /** "Cancelled" is the one stored state; the rest are read off the dates. */
  status: z.string().optional(),
  /** The delivered project the contract follows, when there is one. */
  projectId: z.string().optional(),
  signingDate: z.string().optional(),
  startDate: z.string().optional(),
  durationDays: z.number().optional(),
  /** How many planned visits the duration is divided into. At least one. */
  visits: z.number().optional(),
  /** The ALLOWANCE, not the list — how many call-outs the contract permits. */
  emergencyVisits: z.number().optional(),
  notes: z.string().optional(),
  /** Who the contract is with — typed, as the installed base types it. */
  customer: z.string().max(200).optional(),
  /** One of CONTRACT_COVERS, or "". */
  cover: z.string().optional(),
  /** What the contract is worth over its term, in the studio's currency. */
  value: z.number().nullable().optional(),
  /** Where the visits happen — a Master-data location. */
  locationId: z.string().max(60).optional(),
  /** The customer's units it covers — engine `installed` records. */
  installedIds: z.array(z.string()).optional(),
  /** Who each visit's work order goes to (invariant 6). */
  assignedToCollaboratorIds: z.array(z.string()).optional(),
  /** Days before a visit its work order is raised. */
  leadDays: z.number().optional(),
  /** Step labels; every visit's order gets its own ticked copy. */
  checklist: z.array(z.string().max(200)).optional(),
  /** Indexes of planned visits ticked done by hand, 1-based. */
  completedVisits: z.array(z.number()).optional(),
  emergencyVisitsList: z.array(EmergencyVisitSchema).optional(),
  /** The Field Service contract this was folded from, so a re-run skips it. */
  legacyRecordId: z.string().optional(),
  cancelledAt: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Sla = z.infer<typeof SlaSchema>;

/**
 * TIME BOOKED AGAINST A WORK ORDER — its own collection rather than an array on
 * the order, because the migration design refuses nested arrays that grow
 * without bound, and a long repair collects an entry per person per day.
 *
 * HOURS ONLY. What an hour costs is Phase 3's, with parts — a rate needs a
 * source, and the one timesheets use is copied per entry off a deal.
 */
export const LabourEntrySchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  workOrderId: z.string(),
  /** Who did the work (invariant 6) — not necessarily who booked it. */
  collaboratorId: z.string(),
  workedOn: z.string().max(10),
  /** In quarters of an hour, 0.25 – 24. */
  hours: z.number(),
  /** work · travel · wait — see LABOUR_KINDS. */
  kind: z.string(),
  note: z.string().max(500),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
});
export type LabourEntry = z.infer<typeof LabourEntrySchema>;
