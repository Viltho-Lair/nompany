// KPIs ON KINDS OF WORK — pure. The owner's agreed order, step 5 (03/10/2026):
// "KPIs on kinds of work and steps, plus period KPIs". A KPI used to hang off a
// service action and measure a deal alone; service actions are gone, and the
// work types (./workTypes) are what a KPI names now.
//
// ------------------------------------------------------------------------
// TWO QUESTIONS, AND THEY ARE DIFFERENT QUESTIONS.
// ------------------------------------------------------------------------
// ONE PIECE OF WORK — "did THIS job finish on time?" A per-item KPI judges one
//   deal, job or work order: it reached a step within so many days of opening
//   (`reach`), or it was done by its own due date (`onTime`).
// THE COMPANY OVER A PERIOD — "how did we do this month?" A period KPI adds up
//   items: how many (`count`), how much money (`value`), the share that met a
//   per-item KPI (`share`), or how long they took on average (`avgDays`).
// A period KPI's `share` IS the bridge: "90% of work orders on time this month"
// is the `onTime` item KPI, counted over the month.
//
// ------------------------------------------------------------------------
// EVIDENCE, NEVER A SECOND SET OF NUMBERS.
// ------------------------------------------------------------------------
// Every date here is one the record already keeps — a work order's startedAt,
// completedAt and history, a job's completedAt against its scheduled end, the
// first record of each stage on a deal, a receipt's time and total. Nothing is
// keyed in for a KPI, so there is nothing to forget to key in.
//
// IT MEASURES. IT NEVER BLOCKS — the flow's rule and the deal KPIs' rule,
// inherited whole. A missed target is information; nothing here refuses a move.
//
// NULL IS NEVER DRAWN AS 0: an item with no due date is not late, a period with
// nothing finished has no average, and a share of nothing is not 0%.

import { WORK_TYPES, type WorkState, type WorkTypeKey } from "./workTypes";

// ---- what a piece of work is, for measuring ---------------------------------

/** One piece of work, as the KPIs read it — built from its record by `factsFrom*`. */
export type WorkFacts = {
  type: WorkTypeKey;
  id: string;
  /** When the work started: the record's creation, or a receipt's time. */
  openedAt: string;
  /** Each step's token, mapped to when it was FIRST reached (ISO). */
  reached: Readonly<Record<string, string>>;
  /** `YYYY-MM-DD` the record says it is due by, or "" when it says nothing. */
  dueOn: string;
  state: WorkState;
  /** When it reached its done step, "" while open. */
  doneAt: string;
  /** Money it carries (a counter sale's total), or null. */
  value: number | null;
};

const text = (v: unknown) => String(v ?? "");
const iso = (v: unknown) => { const t = Date.parse(text(v)); return Number.isFinite(t) ? new Date(t).toISOString() : ""; };
/** The earlier of two ISO strings, ignoring blanks. */
const earliest = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b);

/** A job: scheduled → in progress → completed. It records no start time, so "in progress" is unknown. */
export function factsFromJob(row: Record<string, unknown>): WorkFacts {
  const status = text(row.status);
  const opened = iso(row.createdAt);
  const done = iso(row.completedAt);
  const reached: Record<string, string> = {};
  if (opened) reached.scheduled = opened;
  if (done) reached.completed = done;
  return {
    type: "job", id: text(row.id), openedAt: opened, reached,
    dueOn: text(row.scheduledEnd || row.scheduledStart).slice(0, 10),
    state: status === "cancelled" ? "cancelled" : status === "completed" ? "done" : "open",
    doneAt: status === "completed" ? done : "",
    value: null,
  };
}

/**
 * A work order: Open → In progress → Completed → Closed. Its own stamps, and
 * the step history where it kept one — the FIRST time a step was reached is the
 * one that counts, so a reopened order is not judged on its second completion.
 */
export function factsFromWorkOrder(row: Record<string, unknown>): WorkFacts {
  const status = text(row.status);
  const reached: Record<string, string> = {};
  const note = (token: string, at: unknown) => { const t = iso(at); if (t) reached[token] = earliest(reached[token] || "", t); };
  note("Open", row.createdAt);
  note("In progress", row.startedAt);
  note("Completed", row.completedAt);
  note("Closed", row.closedAt);
  for (const step of Array.isArray(row.history) ? row.history as Record<string, unknown>[] : []) {
    const token = text(step.status) === "On hold" ? "In progress" : text(step.status);
    if (["Open", "In progress", "Completed", "Closed"].includes(token)) note(token, step.at);
  }
  const done = status === "Completed" || status === "Closed";
  return {
    type: "workOrder", id: text(row.id), openedAt: reached.Open || "", reached,
    dueOn: text(row.dueOn).slice(0, 10),
    state: status === "Cancelled" ? "cancelled" : done ? "done" : "open",
    doneAt: done ? (reached.Completed || reached.Closed || "") : "",
    value: null,
  };
}

/** A counter sale: written paid, so it opens and finishes in the same moment. */
export function factsFromReceipt(row: Record<string, unknown>): WorkFacts {
  const at = iso(row.at);
  const total = Number(row.total);
  return {
    type: "counterSale", id: text(row.id), openedAt: at, reached: at ? { Completed: at } : {},
    dueOn: "", state: "done", doneAt: at,
    value: Number.isFinite(total) ? total : null,
  };
}

/**
 * A deal: `firstAt` is each stage's FIRST record (the engagement's members are
 * scored by createdAt, so this is read, not tracked). It opened with its first
 * record of any stage, and it is done when it holds every stage of `running` —
 * the same rule `readDeal` reads progress by.
 */
export function factsFromDeal(id: string, firstAt: Readonly<Record<string, string>>, running: readonly string[]): WorkFacts {
  const reached: Record<string, string> = {};
  for (const [stage, at] of Object.entries(firstAt)) { const t = iso(at); if (t) reached[stage] = t; }
  const times = Object.values(reached).sort();
  const done = running.length > 0 && running.every((s) => reached[s]);
  return {
    type: "deal", id, openedAt: times[0] || "", reached, dueOn: "",
    state: done ? "done" : "open",
    doneAt: done ? running.map((s) => reached[s]).sort().slice(-1)[0] : "",
    value: null,
  };
}

// ---- the declaration -------------------------------------------------------

export const ITEM_KINDS = ["reach", "onTime"] as const;
export const PERIOD_KINDS = ["count", "value", "share", "avgDays"] as const;
export type WorkKpiKind = (typeof ITEM_KINDS)[number] | (typeof PERIOD_KINDS)[number];

export type WorkKpi = {
  id: string;
  label: string;
  workType: WorkTypeKey;
  kind: WorkKpiKind;
  /** `reach`: the step to reach — a step token, or for a deal a stage type. */
  step?: string;
  /** `reach`: days from opening. */
  days?: number;
  /** Period kinds: the target for the period asked about. `avgDays` is a ceiling. */
  target?: number;
  /** `share`: the item KPI whose share is counted. */
  of?: string;
};

export const isItemKind = (k: unknown): boolean => (ITEM_KINDS as readonly unknown[]).includes(k);

// The four states a judgement can be in. `unknown` is a real answer (a KPI the
// record cannot be measured by — no due date, a step it has no stamp for); it is
// never reported as "not started", which would read as a company behind.
export type KpiOutcome = "in-progress" | "met" | "missed" | "unknown";

const DAY = 86_400_000;
const endOfDay = (ymd: string) => Date.parse(`${ymd}T23:59:59.999Z`);

/**
 * ONE PIECE OF WORK, JUDGED. Null for a cancelled item — work that was called
 * off is not late, and counting it either way would punish or reward stopping.
 *
 * A LATE STEP IS MISSED, EVEN ONCE IT HAPPENS. The deal KPIs' milestones count a
 * late arrival as met (`measureKpi`), because they ask "was it done"; these ask
 * "was it done in time", and a job finished a week late answers no.
 */
export function judgeItem(kpi: WorkKpi, facts: WorkFacts, asOf: string): { outcome: KpiOutcome; dueAt: string } | null {
  if (facts.state === "cancelled") return null;
  const now = Date.parse(asOf);
  if (kpi.kind === "reach") {
    const step = text(kpi.step);
    const opened = Date.parse(facts.openedAt);
    if (!step || !Number.isFinite(opened)) return { outcome: "unknown", dueAt: "" };
    const due = opened + Number(kpi.days || 0) * DAY;
    const dueAt = new Date(due).toISOString();
    const at = Date.parse(facts.reached[step] || "");
    if (Number.isFinite(at)) return { outcome: at <= due ? "met" : "missed", dueAt };
    // Done without ever stamping this step (a job's "in progress"): it cannot
    // be judged, which is not the same as late.
    if (facts.state === "done") return { outcome: "unknown", dueAt };
    return { outcome: now > due ? "missed" : "in-progress", dueAt };
  }
  if (kpi.kind === "onTime") {
    if (!facts.dueOn) return { outcome: "unknown", dueAt: "" };
    const due = endOfDay(facts.dueOn);
    const dueAt = new Date(due).toISOString();
    if (facts.state === "done") {
      const at = Date.parse(facts.doneAt);
      return { outcome: Number.isFinite(at) ? (at <= due ? "met" : "missed") : "unknown", dueAt };
    }
    return { outcome: now > due ? "missed" : "in-progress", dueAt };
  }
  return null;
}

export type PeriodScore = {
  /** The figure for the period: a count, a sum, a share 0–1, or days. Null when there is nothing to measure. */
  value: number | null;
  target: number | null;
  outcome: KpiOutcome;
  /** How many items the figure is made of. */
  n: number;
};

const within = (at: string, from: number, to: number) => { const t = Date.parse(at); return Number.isFinite(t) && t >= from && t < to; };
const round = (n: number, places = 4) => Math.round(n * 10 ** places) / 10 ** places;

/**
 * THE COMPANY OVER A PERIOD, `[from, to)`. `items` are this KPI's work type's
 * facts; `itemKpis` resolves a `share`'s `of`.
 *
 * WHICH ITEMS A PERIOD OWNS: `count` and `value` take what OPENED in it (work
 * taken on, sales made); `share` and `avgDays` take what FINISHED in it (work
 * that can be judged). A month's on-time share counts the jobs finished that
 * month, not the ones that started then and are still running.
 *
 * WHILE THE PERIOD IS RUNNING, a total short of target is in progress rather
 * than missed — half a month cannot have missed a month's target. A share or
 * an average is judged as it stands, because it is a rate, not a total.
 */
export function scorePeriod(
  kpi: WorkKpi,
  items: readonly WorkFacts[],
  from: string,
  to: string,
  asOf: string,
  itemKpis: Readonly<Record<string, WorkKpi>> = {},
): PeriodScore {
  const a = Date.parse(from);
  const b = Date.parse(to);
  const target = Number.isFinite(Number(kpi.target)) && kpi.target !== undefined ? Number(kpi.target) : null;
  const running = Date.parse(asOf) < b;
  const mine = items.filter((i) => i.type === kpi.workType && i.state !== "cancelled");
  const totalOutcome = (value: number): KpiOutcome =>
    target === null ? "unknown" : value >= target ? "met" : running ? "in-progress" : "missed";

  if (kpi.kind === "count") {
    const n = mine.filter((i) => within(i.openedAt, a, b)).length;
    return { value: n, target, outcome: totalOutcome(n), n };
  }
  if (kpi.kind === "value") {
    const opened = mine.filter((i) => within(i.openedAt, a, b) && i.value !== null);
    const sum = round(opened.reduce((s, i) => s + (i.value || 0), 0), 2);
    return { value: sum, target, outcome: totalOutcome(sum), n: opened.length };
  }
  const finished = mine.filter((i) => i.state === "done" && within(i.doneAt, a, b));
  if (kpi.kind === "share") {
    const of = itemKpis[text(kpi.of)];
    if (!of) return { value: null, target, outcome: "unknown", n: 0 };
    const judged = finished.map((i) => judgeItem(of, i, asOf)).filter((j) => j && (j.outcome === "met" || j.outcome === "missed"));
    if (!judged.length) return { value: null, target, outcome: "unknown", n: 0 };
    const share = round(judged.filter((j) => j!.outcome === "met").length / judged.length);
    return { value: share, target, outcome: target === null ? "unknown" : share >= target ? "met" : "missed", n: judged.length };
  }
  if (kpi.kind === "avgDays") {
    const spans = finished.map((i) => (Date.parse(i.doneAt) - Date.parse(i.openedAt)) / DAY).filter((d) => Number.isFinite(d) && d >= 0);
    if (!spans.length) return { value: null, target, outcome: "unknown", n: 0 };
    const avg = round(spans.reduce((s, d) => s + d, 0) / spans.length, 1);
    // A CEILING: fewer days is better.
    return { value: avg, target, outcome: target === null ? "unknown" : avg <= target ? "met" : "missed", n: spans.length };
  }
  return { value: null, target, outcome: "unknown", n: 0 };
}

// ---- refusing a KPI that could not be measured ------------------------------

/**
 * WHAT IS WRONG WITH A DECLARATION, in words about the declaration — the door
 * `kpiProblems` already is for deal KPIs. `dealStages` is the stage registry's
 * types, the steps a deal can be asked to reach.
 */
export function workKpiProblems(defs: readonly WorkKpi[], dealStages: readonly string[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const byId = new Map(defs.map((d) => [d.id, d]));
  for (const def of defs) {
    const at = def?.id ? `KPI ${def.id}` : "a KPI";
    if (!def?.id) { problems.push("a KPI has no id"); continue; }
    if (ids.has(def.id)) problems.push(`${at}: declared twice`);
    ids.add(def.id);
    if (!text(def.label).trim()) problems.push(`${at}: needs a label — it is what the screen says`);
    const type = WORK_TYPES[def.workType as WorkTypeKey];
    if (!type) { problems.push(`${at}: "${text(def.workType)}" is not a kind of work`); continue; }
    if (![...ITEM_KINDS, ...PERIOD_KINDS].includes(def.kind)) { problems.push(`${at}: unknown kind "${text(def.kind)}"`); continue; }
    if (def.kind === "reach") {
      const steps = type.steps ? type.steps.map((s) => s.token) : dealStages;
      if (!steps.includes(text(def.step))) problems.push(`${at}: "${text(def.step)}" is not a step of a ${type.name.en.toLowerCase()}`);
      const days = Number(def.days);
      if (!Number.isInteger(days) || days < 1 || days > 3650) problems.push(`${at}: days must be a whole number from 1 to 3650`);
    }
    if (def.kind === "onTime" && (def.workType === "deal" || def.workType === "counterSale")) {
      problems.push(`${at}: a ${type.name.en.toLowerCase()} has no due date to be on time for`);
    }
    if (!isItemKind(def.kind)) {
      if (!(Number(def.target) > 0)) problems.push(`${at}: a period KPI needs a target above nought`);
      if (def.kind === "share" && Number(def.target) > 1) problems.push(`${at}: a share's target is a fraction, 0 to 1 — 0.9 for 90%`);
      if (def.kind === "value" && def.workType !== "counterSale") problems.push(`${at}: only a counter sale carries a value to add up`);
    }
    if (def.kind === "share") {
      const of = byId.get(text(def.of));
      if (!of) problems.push(`${at}: "${text(def.of)}" is not a KPI here, so there is nothing to take a share of`);
      else if (!isItemKind(of.kind)) problems.push(`${at}: a share is taken of a per-item KPI, and "${of.id}" is a period one`);
      else if (of.workType !== def.workType) problems.push(`${at}: "${of.id}" measures a different kind of work`);
    }
  }
  return problems;
}
