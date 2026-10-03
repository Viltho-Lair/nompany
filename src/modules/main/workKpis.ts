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
import { zonedMidnight } from "@/shared/timezone";

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
  /**
   * `reach`: the step the clock STARTS at — "first delivery within 30 days of
   * the PROJECT". Absent: from when the work opened. The owner, 03/10/2026, on a
   * delivery KPI tied to a project's deliveries.
   */
  from?: string;
  /** `reach`: days from `from` (or from opening). */
  days?: number;
  /** Period kinds: the target for the period asked about. `avgDays` is a ceiling. */
  target?: number;
  /** `share`: the item KPI whose share is counted. */
  of?: string;
};

export const isItemKind = (k: unknown): boolean => (ITEM_KINDS as readonly unknown[]).includes(k);

// The states a judgement can be in. `unknown` is a real answer (a KPI the record
// cannot be measured by — no due date, a step it has no stamp for). `waiting` is
// a `reach` whose clock has not started, because its `from` step has not
// happened: "delivery within 30 days of the project" on a deal with no project
// yet is neither late nor under way.
export type KpiOutcome = "waiting" | "in-progress" | "met" | "missed" | "unknown";

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
    const from = text(kpi.from);
    if (!step) return { outcome: "unknown", dueAt: "" };
    const start = Date.parse(from ? facts.reached[from] || "" : facts.openedAt);
    if (!Number.isFinite(start)) {
      // THE CLOCK HAS NOT STARTED. Waiting while the work is open; once it is
      // done without ever reaching `from`, it simply cannot be judged.
      return { outcome: from && facts.state === "open" ? "waiting" : "unknown", dueAt: "" };
    }
    const due = start + Number(kpi.days || 0) * DAY;
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
      if (def.from !== undefined && text(def.from)) {
        if (!steps.includes(text(def.from))) problems.push(`${at}: "${text(def.from)}" is not a step of a ${type.name.en.toLowerCase()}, so the clock could never start`);
        else if (text(def.from) === text(def.step)) problems.push(`${at}: a step cannot be timed from itself`);
        else if (type.steps && type.steps.findIndex((x) => x.token === def.from) > type.steps.findIndex((x) => x.token === def.step)) {
          problems.push(`${at}: "${text(def.from)}" comes after "${text(def.step)}", so the clock would start after the work it times`);
        }
      }
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

// ---- the list of measures, and a studio's targets ---------------------------
//
// THE OWNER'S THREE ANSWERS, 03/10/2026:
//   1. /super keeps the LIST of what can be measured (a MEASURE: a KPI with no
//      number); each studio types its own numbers (a TARGET) in Studio settings.
//   2. Measures ship without numbers, so a studio only types a target and
//      nompany never invents one for a company.
//   3. Changing a target does NOT re-judge past work: every target keeps a dated
//      history, and a piece of work is judged by the version in force when it
//      opened.
// And, asked afterwards: a studio-wide target with an optional OVERRIDE PER
// DEAL FLOW — a fit-out and a supply-only order may need different delivery
// times in one company.

export const PERIODS = ["day", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];

export type MeasureWords = { en: string; ar: string };

/** A KPI with no number — what /super lists and a studio turns on by giving it one. */
export type WorkMeasure = {
  id: string;
  name: MeasureWords;
  workType: WorkTypeKey;
  kind: WorkKpiKind;
  step?: string;
  from?: string;
  of?: string;
  /** Period kinds: the period a target is for. */
  per?: Period;
  /** Offered to studios. A target a studio set stays stored either way. */
  active: boolean;
};

/**
 * WHAT A MEASURE'S NUMBER MEANS — so the editor asks the right question and
 * `targetProblems` checks the right range. `onTime` has none: it is on or off.
 */
export function numberOf(kind: WorkKpiKind): "days" | "count" | "money" | "share" | "avgDays" | null {
  if (kind === "reach") return "days";
  if (kind === "count") return "count";
  if (kind === "value") return "money";
  if (kind === "share") return "share";
  if (kind === "avgDays") return "avgDays";
  return null;
}

/** A measure with a number, as the arithmetic above reads it. */
export function withTarget(m: WorkMeasure, n: number): WorkKpi & { name: MeasureWords; per?: Period } {
  const base = { id: m.id, label: m.name.en, name: m.name, workType: m.workType, kind: m.kind,
    ...(m.step ? { step: m.step } : {}), ...(m.from ? { from: m.from } : {}), ...(m.of ? { of: m.of } : {}),
    ...(m.per ? { per: m.per } : {}) };
  if (m.kind === "reach") return { ...base, days: n };
  if (m.kind === "onTime") return base;
  return { ...base, target: n };
}

/**
 * THE MEASURES EVERY STUDIO IS OFFERED, with no numbers. The console can switch
 * one off, reword it, or add its own; it cannot give one a number — that is the
 * studio's.
 */
export const BUILTIN_MEASURES: readonly WorkMeasure[] = [
  { id: "deal-quoted", name: { en: "Quoted within … days of the enquiry", ar: "تقديم عرض السعر خلال … يومًا من الاستفسار" }, workType: "deal", kind: "reach", step: "quotation", active: true },
  { id: "deal-contract", name: { en: "Contract signed within … days of the quotation", ar: "توقيع العقد خلال … يومًا من عرض السعر" }, workType: "deal", kind: "reach", step: "contract", from: "quotation", active: true },
  { id: "deal-delivery", name: { en: "First delivery within … days of the project", ar: "أول توريد خلال … يومًا من بدء المشروع" }, workType: "deal", kind: "reach", step: "delivery", from: "project", active: true },
  { id: "deal-invoice", name: { en: "First invoice within … days of the project", ar: "أول فاتورة خلال … يومًا من بدء المشروع" }, workType: "deal", kind: "reach", step: "invoice", from: "project", active: true },
  { id: "deal-quoted-share", name: { en: "Share of deals quoted in time", ar: "نسبة الصفقات التي قُدّم عرضها في الوقت" }, workType: "deal", kind: "share", of: "deal-quoted", per: "month", active: true },
  { id: "job-on-time", name: { en: "Field jobs finished by their scheduled end", ar: "إنجاز المهام الميدانية قبل نهاية موعدها" }, workType: "job", kind: "onTime", active: true },
  { id: "job-on-time-share", name: { en: "Share of field jobs on time", ar: "نسبة المهام الميدانية المنجزة في الوقت" }, workType: "job", kind: "share", of: "job-on-time", per: "month", active: true },
  { id: "job-avg-days", name: { en: "Average days to finish a field job (at most)", ar: "متوسط أيام إنجاز المهمة الميدانية (حدًا أقصى)" }, workType: "job", kind: "avgDays", per: "month", active: true },
  { id: "wo-started", name: { en: "Work orders started within … days", ar: "بدء أوامر العمل خلال … يومًا" }, workType: "workOrder", kind: "reach", step: "In progress", active: true },
  { id: "wo-on-time", name: { en: "Work orders done by their due date", ar: "إنجاز أوامر العمل قبل موعد استحقاقها" }, workType: "workOrder", kind: "onTime", active: true },
  { id: "wo-on-time-share", name: { en: "Share of work orders on time", ar: "نسبة أوامر العمل المنجزة في الوقت" }, workType: "workOrder", kind: "share", of: "wo-on-time", per: "month", active: true },
  { id: "wo-avg-days", name: { en: "Average days to complete a work order (at most)", ar: "متوسط أيام إنجاز أمر العمل (حدًا أقصى)" }, workType: "workOrder", kind: "avgDays", per: "month", active: true },
  { id: "sales-count", name: { en: "Counter sales a day", ar: "عدد المبيعات المباشرة يوميًا" }, workType: "counterSale", kind: "count", per: "day", active: true },
  { id: "sales-value", name: { en: "Counter sales value a day", ar: "قيمة المبيعات المباشرة يوميًا" }, workType: "counterSale", kind: "value", per: "day", active: true },
];

export const BUILTIN_MEASURE_IDS: ReadonlySet<string> = new Set(BUILTIN_MEASURES.map((m) => m.id));

/** The console's rows over the built-ins: a stored row replaces its built-in by id, others are added. */
export function mergeMeasures(stored: readonly WorkMeasure[]): WorkMeasure[] {
  const byId = new Map(stored.filter((m) => m?.id).map((m) => [m.id, m]));
  const merged = BUILTIN_MEASURES.map((b) => byId.get(b.id) || b);
  return [...merged, ...stored.filter((m) => m?.id && !BUILTIN_MEASURE_IDS.has(m.id))];
}

/**
 * WHAT IS WRONG WITH A LIST OF MEASURES — the declaration checks, asked with a
 * stand-in number, because a measure has none and its shape is what matters.
 */
export function measureProblems(measures: readonly WorkMeasure[], dealStages: readonly string[]): string[] {
  const stand = (m: WorkMeasure) => withTarget(m, m.kind === "share" ? 0.5 : 1);
  const out = workKpiProblems(measures.map(stand), dealStages);
  for (const m of measures) {
    if (!text(m?.name?.en).trim() || !text(m?.name?.ar).trim()) out.push(`measure ${m?.id || "?"}: needs a name in English and Arabic`);
    if (!isItemKind(m?.kind) && !PERIODS.includes(m?.per as Period)) out.push(`measure ${m?.id || "?"}: a period KPI needs a period — day, week or month`);
  }
  return out;
}

/** WHAT IS WRONG WITH A NUMBER for this measure, or "" when it is sound. Null (off) is always sound. */
export function targetProblem(m: WorkMeasure, n: number | null): string {
  if (n === null) return "";
  const what = numberOf(m.kind);
  if (!Number.isFinite(n)) return "not-a-number";
  if (what === null) return n === 1 ? "" : "on-or-off";
  if (what === "days") return Number.isInteger(n) && n >= 1 && n <= 3650 ? "" : "days";
  if (what === "share") return n > 0 && n <= 1 ? "" : "share";
  return n > 0 ? "" : "positive";
}

/**
 * ONE VERSION OF A STUDIO'S TARGET FOR A MEASURE. `value` is studio-wide (null:
 * not measured); `byFlow` overrides it for a deal flow (null: that flow is not
 * measured on it; absent: the studio-wide number applies).
 */
export type TargetVersion = { at: string; by: string; value: number | null; byFlow: Record<string, number | null> };
/** measure id → its versions, oldest first. */
export type StudioKpiTargets = Record<string, TargetVersion[]>;

/**
 * THE NUMBER IN FORCE for a piece of work: the latest version set at or before
 * the moment it opened, the flow's override over the studio-wide figure. Null:
 * not measured — including work that opened before any target was set, which
 * was never asked to meet one.
 */
export function targetIn(versions: readonly TargetVersion[] | undefined, flowId: string, at: string): number | null {
  const t = Date.parse(at);
  if (!versions?.length || !Number.isFinite(t)) return null;
  let found: TargetVersion | null = null;
  for (const v of versions) if (Date.parse(v.at) <= t) found = v;
  if (!found) return null;
  if (flowId && Object.prototype.hasOwnProperty.call(found.byFlow || {}, flowId)) return found.byFlow[flowId];
  return found.value;
}

/**
 * A CHANGE, APPENDED AS A NEW VERSION — never an edit of the last one, which
 * would re-judge work already measured against it. `flowId` absent sets the
 * studio-wide number; present sets that flow's override, and `undefined` as the
 * value removes the override so the studio-wide number applies again.
 * Unchanged when the result equals the version in force.
 */
export function nextVersions(
  versions: readonly TargetVersion[] | undefined,
  change: { flowId?: string; value: number | null | undefined },
  at: string,
  by: string,
): TargetVersion[] {
  const list = [...(versions || [])];
  const last = list[list.length - 1] || { at: "", by: "", value: null, byFlow: {} };
  const next: TargetVersion = { at, by, value: last.value, byFlow: { ...(last.byFlow || {}) } };
  if (change.flowId) {
    if (change.value === undefined) delete next.byFlow[change.flowId];
    else next.byFlow[change.flowId] = change.value;
  } else {
    next.value = change.value === undefined ? null : change.value;
  }
  const same = next.value === last.value && JSON.stringify(next.byFlow) === JSON.stringify(last.byFlow || {});
  return same && list.length ? list : [...list, next];
}

/** Every KPI in force for a piece of work of this type, on this flow, opened at `at`. */
export function kpisInForce(
  measures: readonly WorkMeasure[],
  targets: StudioKpiTargets,
  workType: WorkTypeKey,
  flowId: string,
  at: string,
) {
  const out: ReturnType<typeof withTarget>[] = [];
  for (const m of measures) {
    if (!m.active || m.workType !== workType) continue;
    const n = targetIn(targets[m.id], flowId, at);
    if (n === null) continue;
    out.push(withTarget(m, n));
  }
  return out;
}

/**
 * THE PERIOD A PERIOD KPI IS SCORED OVER, as instants, for the studio's own
 * calendar: today, this week (from Monday), or this month — midnight to
 * midnight on the studio's clock (`zonedMidnight`), so a shop's day is its own.
 */
export function periodBounds(per: Period, todayYmd: string, timezone?: string): { from: string; to: string } {
  const [y, mo, d] = todayYmd.split("-").map(Number);
  const m = mo - 1;
  if (per === "day") return { from: zonedMidnight(y, m, d, timezone).toISOString(), to: zonedMidnight(y, m, d + 1, timezone).toISOString() };
  if (per === "week") {
    const weekday = (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Monday = 0
    return { from: zonedMidnight(y, m, d - weekday, timezone).toISOString(), to: zonedMidnight(y, m, d - weekday + 7, timezone).toISOString() };
  }
  return { from: zonedMidnight(y, m, 1, timezone).toISOString(), to: zonedMidnight(y, m + 1, 1, timezone).toISOString() };
}
