// KINDS OF WORK — the owner's decision C, 03/10/2026: "One kind of work item
// with types." A contractor's work is a DEAL; a workshop's is a JOB or a WORK
// ORDER; a shop's is a COUNTER SALE. Each is read the same way — which step it
// is at, how far along, whether it is overdue — so the home screen and, later,
// the KPIs ask one question of all of them.
//
// ------------------------------------------------------------------------
// A WORK ITEM IS A READING, NEVER A RECORD.
// ------------------------------------------------------------------------
// Every type here already exists as its own record, with its own screen, its
// own rights and its own rules: a deal is an engagement, a job is Field
// Service's, a work order is Maintenance's, a counter sale is a till receipt.
// A "work items" collection beside them would be a second copy of each, free to
// disagree with the first the moment one of them moved. So this file stores
// nothing. It declares, per type, how that record's OWN status reads as a step,
// and the server reads the records where they are filed.
//
// THE STATUS TOKENS ARE THE MODULES' OWN, COPIED, and `tests/work-types-model.mjs`
// holds every copy against the list it came from (`JOB_STATUSES`, Maintenance's
// `ORDER_STATUSES`). Importing them would drag Zod and the job schema into every
// client that draws a progress bar; copying them unpinned is how a status added
// to a module stops being COUNTED without anything failing — the dashboard's
// old pipeline arrays did exactly that.
//
// PURE, AND NO IMPORTS — a screen computes the same reading the server did.

export type Words = { en: string; ar: string };

export const WORK_TYPE_KEYS = ["deal", "job", "workOrder", "counterSale"] as const;
export type WorkTypeKey = (typeof WORK_TYPE_KEYS)[number];

export type WorkStep = Words & {
  /** The record's own status that puts it at this step. */
  token: string;
};

export type WorkTypeDef = {
  key: WorkTypeKey;
  name: Words;
  plural: Words;
  /**
   * THE DEPARTMENTS THAT RUN THIS KIND OF WORK — any one switched on is enough.
   * Screens, never storage rows (a filed-only row is a switch for nothing).
   */
  runsIn: readonly string[];
  /**
   * The steps, in order. `null` for a deal: its steps are its FLOW's stages,
   * which a studio edits per industry, so they are passed in rather than
   * declared here (`readDeal`).
   */
  steps: readonly WorkStep[] | null;
  /** Statuses that END the work without finishing it. Never a step. */
  cancelled: readonly string[];
  /**
   * PAUSED, and shown AT a step rather than as one: a work order on hold is
   * still in progress as far as the machine is concerned (`orderOverdue` counts
   * it), and "held" is a flag on that step, not a place in the sequence.
   */
  held: Readonly<Record<string, string>>;
  /** The first step that counts as DONE. Everything from it on is finished work. */
  doneFrom: string;
};

export const WORK_TYPES: Readonly<Record<WorkTypeKey, WorkTypeDef>> = {
  deal: {
    key: "deal",
    name: { en: "Deal", ar: "صفقة" },
    plural: { en: "Deals", ar: "الصفقات" },
    runsIn: ["crm-sales", "quotations", "tendering", "projects"],
    steps: null,
    cancelled: [],
    held: {},
    doneFrom: "",
  },
  job: {
    key: "job",
    name: { en: "Job", ar: "مهمة ميدانية" },
    plural: { en: "Field jobs", ar: "المهام الميدانية" },
    runsIn: ["field-service"],
    steps: [
      { token: "scheduled", en: "Scheduled", ar: "مجدولة" },
      { token: "in-progress", en: "In progress", ar: "قيد التنفيذ" },
      { token: "completed", en: "Completed", ar: "مكتملة" },
    ],
    cancelled: ["cancelled"],
    held: {},
    doneFrom: "completed",
  },
  workOrder: {
    key: "workOrder",
    name: { en: "Work order", ar: "أمر عمل" },
    plural: { en: "Work orders", ar: "أوامر العمل" },
    runsIn: ["maintenance"],
    steps: [
      { token: "Open", en: "Open", ar: "مفتوح" },
      { token: "In progress", en: "In progress", ar: "قيد التنفيذ" },
      { token: "Completed", en: "Completed", ar: "مكتمل" },
      { token: "Closed", en: "Closed", ar: "مغلق" },
    ],
    cancelled: ["Cancelled"],
    held: { "On hold": "In progress" },
    // COMPLETED IS DONE; Closed is the sign-off after it. A work order waiting
    // to be closed is finished work, and counting it open would report a
    // backlog the crew has already cleared.
    doneFrom: "Completed",
  },
  counterSale: {
    key: "counterSale",
    name: { en: "Counter sale", ar: "بيع مباشر" },
    plural: { en: "Counter sales", ar: "المبيعات المباشرة" },
    runsIn: ["pos"],
    // A till receipt is written PAID — the sale and its completion are one act.
    // It is a kind of work for the period figures (how many, how much), not
    // something anybody has to move along.
    steps: [{ token: "Completed", en: "Paid", ar: "مدفوع" }],
    cancelled: [],
    held: {},
    doneFrom: "Completed",
  },
};

export type WorkState = "open" | "done" | "cancelled";

export type WorkReading = {
  state: WorkState;
  /** The step it is at, 0-based. -1 when it is at none (cancelled, unknown). */
  step: number;
  steps: number;
  /**
   * HOW FAR ALONG, 0–1. NULL WHEN IT CANNOT BE SAID, never 0: a status this
   * file does not know, or a deal on no flow. "0% done" and "we do not know"
   * look identical on a bar and mean opposite things.
   */
  progress: number | null;
  /** Paused at its step (a work order on hold). */
  held: boolean;
  /** The step's words, so a screen draws the step without knowing the type. */
  label: Words | null;
  /**
   * The step's TOKEN: the record's status, or for a deal the stage type. A deal's
   * stage words are translated where every other stage is (`stageLabel`,
   * shared/studio/stages), so `label` carries the registry's English for it.
   */
  token: string;
};

const UNKNOWN: WorkReading = { state: "open", step: -1, steps: 0, progress: null, held: false, label: null, token: "" };

/**
 * A record's own status, read as a step. For every type but the deal.
 *
 * PROGRESS COUNTS STEPS REACHED, NOT STEPS PASSED: a job that has started is at
 * step 2 of 3 and reads 2/3, because a scheduled job (1/3) is itself further on
 * than no job. Done reads 1 whichever done step it is at.
 */
export function readStatus(type: Exclude<WorkTypeKey, "deal">, status: unknown): WorkReading {
  const def = WORK_TYPES[type];
  const steps = def.steps || [];
  const raw = String(status ?? "");
  if (def.cancelled.includes(raw)) {
    return { state: "cancelled", step: -1, steps: steps.length, progress: null, held: false, label: null, token: raw };
  }
  const held = raw in def.held;
  const token = held ? def.held[raw] : raw;
  const step = steps.findIndex((s) => s.token === token);
  if (step < 0) return { ...UNKNOWN, steps: steps.length };
  const doneAt = steps.findIndex((s) => s.token === def.doneFrom);
  const done = doneAt >= 0 && step >= doneAt;
  return {
    state: done ? "done" : "open",
    step,
    steps: steps.length,
    progress: done ? 1 : (step + 1) / steps.length,
    held,
    label: { en: steps[step].en, ar: steps[step].ar },
    token: steps[step].token,
  };
}

/** A stage's completion as a deal's snapshot keeps it (platform/engagement/completion). */
export type StageState = { state: string; progress: number | null };

/**
 * A deal, read against its FLOW: `running` is the flow's stages this studio
 * runs (`stagesRunning`), `present` the stages the deal holds. Its step is the
 * furthest stage it has reached; its progress the share of the flow it holds.
 *
 * SKIPPING IS NOT PENALISED TWICE. A quotation with no RFQ behind it is a good
 * quotation (the flow guides, it never blocks), so a deal is AT the furthest
 * stage it holds — but its progress counts only what it holds, so the skipped
 * stage still shows as not done.
 *
 * WITH `completion` (the deal's stored snapshot, 04/10/2026) a stage counts by
 * how FINISHED it is rather than by being there: done counts in full, under
 * way counts its share — or half where no share can be said, because it has
 * been reached and is not finished — and called off counts as absent. The deal
 * is done only when every stage of its flow is done. Without a snapshot (a deal
 * not yet refreshed) it reads as before, by presence.
 *
 * `labels` names each stage, so a screen can say "at Quotation" without the
 * stage registry. A deal on no flow has no sequence to be at a point in: null.
 */
export function readDeal(
  running: readonly string[],
  present: ReadonlySet<string>,
  labels: Readonly<Record<string, string>> = {},
  completion: Readonly<Record<string, StageState>> | null = null,
): WorkReading {
  if (!running.length) return UNKNOWN;
  const held = (t: string) => present.has(t) && completion?.[t]?.state !== "void";
  let step = -1;
  running.forEach((t, i) => { if (held(t)) step = i; });
  const weight = (t: string) => {
    if (!held(t)) return 0;
    const c = completion?.[t];
    if (!c) return completion ? 0.5 : 1;
    if (c.state === "done") return 1;
    return c.progress ?? 0.5;
  };
  const sum = running.reduce((n, t) => n + weight(t), 0);
  const done = completion
    ? running.every((t) => completion[t]?.state === "done")
    : running.every((t) => present.has(t));
  const at = step >= 0 ? running[step] : "";
  const word = labels[at] || at;
  return {
    state: done ? "done" : "open",
    step,
    steps: running.length,
    progress: Math.round((sum / running.length) * 1000) / 1000,
    held: false,
    label: at ? { en: word, ar: word } : null,
    token: at,
  };
}

/**
 * THE KINDS OF WORK THIS STUDIO RUNS, in the registry's order. Derived from the
 * departments it has switched on, never stored: a studio that switches Point of
 * Sale on starts having counter sales that minute, and a separate list of
 * "work types this studio uses" would be a second switch free to disagree with
 * the first.
 */
export function workTypesRunning(on: (sectionKey: string) => boolean): WorkTypeKey[] {
  return WORK_TYPE_KEYS.filter((k) => WORK_TYPES[k].runsIn.some((s) => on(s)));
}
