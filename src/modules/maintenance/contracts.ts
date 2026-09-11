// SERVICE CONTRACTS, PURELY — the visit schedule, what each visit came to, and
// when the daily run raises one. No store, no routes; the screen and the server
// both read this file, so a button is offered only where the server would
// accept it. tests/maintenance-model.mjs asserts it.
//
// AN SLA IS A PREVENTIVE MAINTENANCE CONTRACT — the owner's word, 11/09/2026 —
// so it lives in Maintenance and its visits are WORK ORDERS. Until then a visit
// was a checkbox somebody ticked on a Projects screen: nobody was assigned to
// it, nothing reminded anybody, and nothing it did was recorded against a
// machine. A contract is now the promise; the orders are the keeping of it.
//
// THE DATES ARE ARITHMETIC, NOT DATA. Visit k falls on start + k × (duration ÷
// visits), rounded to the day, so the last lands on the contract's end — the
// same sum the Projects screen used, so every contract already written keeps
// the dates it was showing. Editing the start, duration or count reschedules
// every visit instead of leaving stale dates behind.

import { MAX_LEAD_DAYS, MAX_CHECKLIST } from "./schedule";

/** What the contract covers. Tokens; the screen chooses the words. */
export const CONTRACT_COVERS = ["parts-labour", "labour", "inspection", "full"] as const;
export type ContractCover = (typeof CONTRACT_COVERS)[number];

/**
 * THE FIELD SERVICE REGISTER'S SPELLINGS, for the fold — it stored the words
 * rather than tokens, so they are read once and never written again.
 */
export const LEGACY_COVER: Readonly<Record<string, ContractCover>> = Object.freeze({
  "Parts and labour": "parts-labour",
  "Labour only": "labour",
  "Inspection only": "inspection",
  "Full cover": "full",
});

export const DEFAULT_DURATION_DAYS = 365;
export const MAX_DURATION_DAYS = 3650;
export const MAX_VISITS = 366;
export const MAX_ALLOWANCE = 1000;

/**
 * HOW FAR BACK THE DAILY RUN REACHES. A visit that fell due within this many
 * days and was never raised is raised now — the cron missed a morning, or the
 * contract was entered a few days late. Further back it is MISSED, and says so,
 * rather than the first run after this shipped raising a year of overdue work
 * orders for every contract a studio already had.
 */
export const RAISE_GRACE_DAYS = 7;

const text = (v: unknown) => String(v ?? "").trim();
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown) => (ISO.test(text(v).slice(0, 10)) ? text(v).slice(0, 10) : "");

/** `iso` moved by whole days, in UTC so a server anywhere agrees. "" for an unreadable date. */
export function addDaysISO(iso: string, days: number): string {
  const t = Date.parse(`${day(iso)}T00:00:00Z`);
  if (!Number.isFinite(t)) return "";
  return new Date(t + Math.round(days) * 86_400_000).toISOString().slice(0, 10);
}

type ContractLike = {
  id?: unknown; status?: unknown; startDate?: unknown; durationDays?: unknown; visits?: unknown;
  emergencyVisits?: unknown; leadDays?: unknown; completedVisits?: unknown; emergencyVisitsList?: unknown;
};
type OrderLike = {
  id?: unknown; reference?: unknown; status?: unknown; slaId?: unknown; slaVisit?: unknown; slaEmergency?: unknown;
};

const durationOf = (c: ContractLike) => Number(c.durationDays) || DEFAULT_DURATION_DAYS;
const visitCount = (c: ContractLike) => Math.max(1, Math.round(Number(c.visits) || 1));
const leadOf = (c: ContractLike) => Math.max(0, Math.min(MAX_LEAD_DAYS, Math.round(Number(c.leadDays) || 0)));
const finished = (o: OrderLike) => ["Completed", "Closed"].includes(text(o.status));

/** The day the contract ends — its last covered day. "" until it has a start. */
export const contractEnd = (c: ContractLike): string =>
  (day(c.startDate) ? addDaysISO(day(c.startDate), durationOf(c)) : "");

/** Every planned visit: its number and the day it falls due. */
export function plannedVisits(c: ContractLike): { index: number; dueOn: string }[] {
  const start = day(c.startDate);
  if (!start) return [];
  const n = visitCount(c);
  const interval = durationOf(c) / n;
  return Array.from({ length: n }, (_, i) => ({ index: i + 1, dueOn: addDaysISO(start, (i + 1) * interval) }));
}

export const CONTRACT_STATES = ["upcoming", "active", "ended", "cancelled"] as const;
export type ContractState = (typeof CONTRACT_STATES)[number];

/**
 * WHERE THE CONTRACT STANDS TODAY. Only a cancellation is stored; the rest is
 * read off the dates, so a contract renewed by moving its dates is active again
 * with nothing else to write.
 */
export function contractState(c: ContractLike, today: string): ContractState {
  if (text(c.status) === "Cancelled") return "cancelled";
  const start = day(c.startDate);
  if (!start || today < start) return "upcoming";
  const end = contractEnd(c);
  if (end && today > end) return "ended";
  return "active";
}

export const VISIT_STATES = ["done", "open", "due", "upcoming", "missed", "cancelled"] as const;
export type VisitState = (typeof VISIT_STATES)[number];

/**
 * WHAT EACH PLANNED VISIT CAME TO, read off the work orders that name it.
 *
 *   done       its order was completed or closed — or it was ticked by hand
 *              (the pre-11/09 record, and a visit kept outside the system)
 *   open       its order is still somebody's job
 *   cancelled  its order was cancelled and nobody ticked it
 *   due        no order yet, and the daily run will raise one: inside the lead
 *              days and no further back than RAISE_GRACE_DAYS
 *   missed     fell due before that window with nothing raised and no tick
 *   upcoming   not due yet
 *
 * A CANCELLED CONTRACT'S unraised visits are cancelled too, not due: nothing
 * will raise them, and "due" on a contract nobody is keeping is a lie.
 */
export function contractVisits(c: ContractLike, orders: readonly OrderLike[], today: string) {
  const ticked = new Set((Array.isArray(c.completedVisits) ? c.completedVisits : []).map((n) => Number(n)));
  const mine = orders.filter((o) => text(o.slaId) === text(c.id) && !o.slaEmergency);
  const cancelledContract = text(c.status) === "Cancelled";
  const graceFrom = addDaysISO(today, -RAISE_GRACE_DAYS);
  return plannedVisits(c).map((v) => {
    const order = mine.find((o) => Number(o.slaVisit) === v.index) || null;
    const tick = ticked.has(v.index);
    let state: VisitState;
    if (order && finished(order)) state = "done";
    else if (order && text(order.status) === "Cancelled") state = tick ? "done" : "cancelled";
    else if (order) state = "open";
    else if (tick) state = "done";
    else if (cancelledContract) state = "cancelled";
    else if (v.dueOn < graceFrom) state = "missed";
    else if (addDaysISO(v.dueOn, -leadOf(c)) <= today) state = "due";
    else state = "upcoming";
    return {
      ...v, state, ticked: tick,
      order: order ? { id: text(order.id), reference: text(order.reference), status: text(order.status) } : null,
    };
  });
}

/**
 * THE VISIT THE DAILY RUN SHOULD RAISE NOW, or null. The earliest one due, and
 * only one a day — a contract entered late is caught up a visit at a time
 * rather than as a wall of orders for the same customer on one morning.
 * Idempotent: a visit with an order is never due again.
 */
export function contractRaiseDecision(
  c: ContractLike, orders: readonly OrderLike[], today: string, keptByPlans = false,
) {
  // A CONTRACT A PREVENTIVE PLAN RUNS UNDER RAISES NO VISITS OF ITS OWN — the
  // plan is its schedule. A monthly service on one unit and a quarterly one on
  // another cannot be one even spread, and raising both would send the same
  // customer two sets of visits. Derived from the plans, never a flag.
  if (keptByPlans) return null;
  const due = contractVisits(c, orders, today).find((v) => v.state === "due");
  return due ? { visit: due.index, dueOn: due.dueOn, of: visitCount(c) } : null;
}

/** Call-outs used: the older dated lines, and every call-out order not cancelled. */
export function callOutsUsed(c: ContractLike, orders: readonly OrderLike[]): number {
  const legacy = Array.isArray(c.emergencyVisitsList) ? c.emergencyVisitsList.length : 0;
  const raised = orders.filter((o) =>
    text(o.slaId) === text(c.id) && o.slaEmergency === true && text(o.status) !== "Cancelled").length;
  return legacy + raised;
}

/**
 * WHY A CALL-OUT CANNOT BE RAISED UNDER THIS CONTRACT — or null.
 *
 * Refused outside the term rather than raised anyway: a call-out after the
 * contract ended is chargeable work, and the honest thing is an ordinary work
 * order nobody mistakes for covered. Refused past the allowance for the same
 * reason — raise the allowance, or raise it outside the contract.
 */
export function callOutProblem(c: ContractLike | null | undefined, orders: readonly OrderLike[], today: string): string | null {
  if (!c) return "notfound";
  const state = contractState(c, today);
  if (state === "cancelled") return "contract-cancelled";
  if (state !== "active") return "outside-term";
  if (callOutsUsed(c, orders) >= Math.max(0, Math.round(Number(c.emergencyVisits) || 0))) return "emergency-cap";
  return null;
}

type DraftLike = ContractLike & {
  title?: unknown; cover?: unknown; value?: unknown; checklist?: unknown;
};

const wholeIn = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi;
};

/** Why this contract cannot be saved — or null. The screen asks the same question. */
export function contractProblem(c: DraftLike): string | null {
  // "contract-title", not "title": the work order's "title" refusal says "say
  // what is wrong", which is the wrong sentence for naming a contract.
  if (!text(c.title)) return "contract-title";
  if (!day(c.startDate)) return "startDate";
  if (!wholeIn(c.durationDays, 1, MAX_DURATION_DAYS)) return "duration";
  if (!wholeIn(c.visits, 1, Math.min(MAX_VISITS, Number(c.durationDays) || MAX_VISITS))) return "visits";
  if (!wholeIn(c.emergencyVisits ?? 0, 0, MAX_ALLOWANCE)) return "emergency";
  if (!wholeIn(c.leadDays ?? 0, 0, MAX_LEAD_DAYS)) return "lead-days";
  if (text(c.cover) && !(CONTRACT_COVERS as readonly string[]).includes(text(c.cover))) return "cover";
  if (c.value !== null && c.value !== undefined && c.value !== "" && !(Number(c.value) >= 0)) return "value";
  if (Array.isArray(c.checklist) && c.checklist.length > MAX_CHECKLIST) return "checklist-long";
  return null;
}

/**
 * ONE LINE PER CONTRACT for the register: where it stands, how far through its
 * visits it is, what is next, and how much of its call-out allowance is gone.
 */
export function contractSummary(c: ContractLike, orders: readonly OrderLike[], today: string, keptByPlans = false) {
  const base = {
    state: contractState(c, today),
    end: contractEnd(c),
    keptByPlans,
    callOutsUsed: callOutsUsed(c, orders),
    allowance: Math.max(0, Math.round(Number(c.emergencyVisits) || 0)),
  };
  // KEPT BY PLANS: its visits are the orders its plans raised, counted as they
  // come — there is no even schedule to be behind on, so nothing is missed and
  // nothing is next.
  if (keptByPlans) {
    const mine = orders.filter((o) => text(o.slaId) === text(c.id) && !o.slaEmergency);
    return { ...base, planned: mine.length, done: mine.filter(finished).length, missed: 0, next: null };
  }
  const visits = contractVisits(c, orders, today);
  const next = visits.find((v) => v.state === "open" || v.state === "due" || v.state === "upcoming") || null;
  return {
    ...base,
    planned: visits.length,
    done: visits.filter((v) => v.state === "done").length,
    missed: visits.filter((v) => v.state === "missed").length,
    next: next ? { index: next.index, dueOn: next.dueOn, state: next.state } : null,
  };
}
