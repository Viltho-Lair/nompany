// WHAT A DEAL IS BEING MEASURED ON — KPIs, pure.
//
// A service action was a label and nothing else: a ticket named "Installation"
// and the product knew the word. The flow template says what STEPS a deal takes
// and the record engine says what a record HOLDS; nothing said what the work is
// expected to achieve, so "are we doing this well" could only be answered by a
// person opening four screens and remembering last time.
//
// ------------------------------------------------------------------------
// IT MEASURES. IT NEVER BLOCKS.
// ------------------------------------------------------------------------
// The same constraint the flow carries (Law 3, and `progress.ts` says it in its
// own words): a KPI that is missed is INFORMATION. Nothing here refuses a
// transition, holds a record, or stops a deal — a company that works around one
// of its own targets is a company with a reason, and the product's job is to
// say what happened rather than to argue about it.
//
// ------------------------------------------------------------------------
// EVIDENCE, NEVER A SECOND SET OF NUMBERS.
// ------------------------------------------------------------------------
// Every KPI is counted off RECORDS THE DEAL ALREADY CARRIES — the stages the
// engagement view has in hand. There is no KPI field on any record, nothing to
// key in, and no second definition of a figure the ERP already holds. That is
// the one rule that keeps this from becoming a parallel bookkeeping system: if
// a target cannot be counted from the deal's own records, it is not a KPI here
// and the honest answer is that it is not measured.
//
// PURE, AND NO IMPORTS — the registry, the counts and the clock are all passed
// in, so a screen can compute the same reading the server did (the way
// `flowProgress` already can) and a test can assert the arithmetic with no
// database at all.

/**
 * TWO KINDS, BECAUSE TWO ARE WHAT THE RECORDS CAN ANSWER.
 *
 *  - `milestone` — the deal reaches a stage. Done or not done; there is no such
 *    thing as a half-raised quotation, so a milestone carries NO percentage.
 *    Its `days` is a clock from the deal's opening, which is how the time
 *    dimension is measured today.
 *  - `quantity` — how many of a stage the deal carries, against a target. This
 *    is the only kind with a percentage, and it is `count / target`.
 *
 * A stage-to-stage DURATION ("commissioned within 14 days of delivery") is
 * deliberately absent: the engagement view hands over which stages a deal has,
 * not when each arrived, so measuring one would mean reading every record of
 * every stage on every deal read. Declaring the kind and measuring nothing is
 * the shape invariant 16 calls a bug, so it is not declared.
 */
export type KpiKind = "milestone" | "quantity";

export type KpiDefinition = {
  id: string;
  /** The service action this measures. `""` measures EVERY deal. */
  action: string;
  label: string;
  kind: KpiKind;
  /** The stage type the evidence lives in — a STAGE_REGISTRY key. */
  stage: string;
  /** Allowed days from the deal opening. 0 or absent: no clock, so never late. */
  days?: number;
  /** `quantity` only: how many. */
  target?: number;
};

/**
 * A KPI AS THE DEAL CARRIES IT — a COPY of the definition, the BOQ rate's rule
 * for the BOQ rate's reason. Editing a definition reprices nothing already
 * being measured, and deleting one breaks no deal: what a deal was judged on is
 * what it was given on the day the work started, which is the only version
 * anybody agreed to.
 */
export type StoredKpi = KpiDefinition & {
  /**
   * WHEN THIS KPI STARTED MEASURING, which is not always when the deal opened:
   * an action added to a ticket in week three is measured from week three. A
   * clock backdated to the deal's opening would report a target as missed
   * before anybody had been asked to meet it.
   */
  startedAt: string;
  /** The action it came from, `""` for one that measures every deal. */
  source: string;
};

/**
 * FIVE STATES, AND `unknown` IS A REAL ANSWER RATHER THAN A FAILURE.
 *
 * A KPI naming a stage this product no longer has — a definition edited after
 * the deal copied it — cannot be counted, and reporting that as "not started"
 * would be a lie that reads exactly like a company behind on its work.
 */
export type KpiState = "not-started" | "in-progress" | "met" | "missed" | "unknown";

export type KpiReading = {
  id: string;
  label: string;
  kind: KpiKind;
  stage: string;
  state: KpiState;
  /** `quantity` only — a milestone has none. Null is never drawn as 0%. */
  progress: number | null;
  count: number | null;
  target: number | null;
  /** ISO date the clock runs out, `""` when the KPI has no clock. */
  dueOn: string;
  /** Negative when the date has passed. Null when there is no clock. */
  daysLeft: number | null;
};

const DAY = 86_400_000;

const timeOf = (iso: string): number => {
  const t = Date.parse(String(iso || ""));
  return Number.isFinite(t) ? t : NaN;
};

/** The date a KPI's clock runs out, or `""` when it has none. */
export function dueDate(kpi: Pick<StoredKpi, "startedAt" | "days">): string {
  const days = Number(kpi.days || 0);
  const from = timeOf(kpi.startedAt);
  if (!days || days < 0 || !Number.isFinite(from)) return "";
  return new Date(from + days * DAY).toISOString();
}

/**
 * ONE KPI, READ OFF THE DEAL'S OWN RECORDS.
 *
 * @param kpi    what the deal was given when the work started
 * @param count  how many records of that stage the deal carries. `null` means
 *               THE COUNT IS NOT AVAILABLE — the stage is not one this product
 *               knows any more — and is the only thing that yields `unknown`.
 * @param asOf   the reading's clock, passed in: nothing here reads its own.
 *
 * A KPI the reader may not see is never measured at all — it is filtered out
 * before it reaches here, so that a withheld record cannot be inferred from a
 * target that moved. See `engagementBlock`.
 */
export function measureKpi(kpi: StoredKpi, count: number | null, asOf: string): KpiReading {
  const due = dueDate(kpi);
  const now = timeOf(asOf);
  const daysLeft = due && Number.isFinite(now)
    ? Math.ceil((timeOf(due) - now) / DAY)
    : null;
  const late = daysLeft !== null && daysLeft < 0;

  const base = {
    id: kpi.id, label: kpi.label, kind: kpi.kind, stage: kpi.stage,
    dueOn: due, daysLeft,
  };

  if (count === null) {
    // Nothing to count against. Not nought — see KpiState.
    return { ...base, state: "unknown", progress: null, count: null, target: null };
  }

  if (kpi.kind === "quantity") {
    const target = Math.max(1, Number(kpi.target || 0));
    const progress = Math.min(1, count / target);
    const state: KpiState = count >= target ? "met"
      : late ? "missed"
        : count > 0 ? "in-progress"
          : due ? "in-progress"   // the clock is running, which is progress of a kind
            : "not-started";
    return { ...base, state, progress, count, target };
  }

  // A milestone is done or it is not: NO percentage, ever. A half-drawn
  // progress bar on "the contract is signed" is a number nobody can act on.
  const state: KpiState = count > 0 ? "met"
    : late ? "missed"
      : due ? "in-progress"
        : "not-started";
  return { ...base, state, progress: null, count, target: null };
}

/**
 * WHAT A DEAL IS GIVEN WHEN IT OPENS: every definition whose action the deal
 * names, plus every definition that measures all work.
 *
 * ONE KPI PER DEFINITION, however many actions reach it. A deal naming both
 * Installation and Commissioning, where the same target is declared for each,
 * is measured against that target ONCE — two copies would be two states, two
 * percentages and two things to argue about for one piece of work.
 *
 * A deal that names no action is not a deal with no KPIs: the definitions that
 * measure every deal still apply. A deal that matches none at all gets an empty
 * list, and the screen says nothing is being measured here rather than drawing
 * an empty frame.
 */
export function kpisForActions(
  defs: readonly KpiDefinition[],
  actions: readonly string[],
  at: string,
): StoredKpi[] {
  const named = new Set(actions.map((a) => String(a || "")).filter(Boolean));
  const out: StoredKpi[] = [];
  const seen = new Set<string>();
  for (const def of defs) {
    if (!def?.id || seen.has(def.id)) continue;
    const universal = !def.action;
    if (!universal && !named.has(def.action)) continue;
    seen.add(def.id);
    out.push({ ...def, startedAt: at, source: universal ? "" : def.action });
  }
  return out;
}

/**
 * AN ACTION ADDED MID-DEAL BRINGS ITS KPIs WITH IT, and they start measuring
 * NOW. What the deal already carries is untouched — including its `startedAt`,
 * because a target somebody has been working to for a month does not get a
 * fresh clock every time the ticket is edited.
 */
export function mergeKpis(existing: readonly StoredKpi[], incoming: readonly StoredKpi[]): StoredKpi[] {
  const held = new Set(existing.map((k) => k.id));
  return [...existing, ...incoming.filter((k) => !held.has(k.id))];
}

/**
 * WHAT IS WRONG WITH A DECLARATION, in words about the declaration.
 *
 * Every one of these is invisible at runtime: a KPI naming a stage that does
 * not exist reads as `unknown` on every deal for ever, and a quantity with no
 * target divides by nothing. Refusing at the door means the owner hears about
 * it while it is still their edit — the same argument `templateProblems` makes
 * for flow templates, and the same door.
 */
export function kpiProblems(
  stageTypes: readonly string[],
  actions: readonly string[],
  defs: readonly KpiDefinition[],
): string[] {
  const problems: string[] = [];
  const stages = new Set(stageTypes);
  const known = new Set(actions);
  const ids = new Set<string>();
  for (const def of defs) {
    const at = def?.id ? `KPI ${def.id}` : "a KPI";
    if (!def?.id) { problems.push("a KPI has no id"); continue; }
    if (ids.has(def.id)) problems.push(`${at}: declared twice`);
    ids.add(def.id);
    if (!String(def.label || "").trim()) problems.push(`${at}: needs a label — it is what the screen says`);
    if (def.action && !known.has(def.action)) problems.push(`${at}: "${def.action}" is not a service action`);
    if (def.kind !== "milestone" && def.kind !== "quantity") problems.push(`${at}: unknown kind "${String(def.kind)}"`);
    if (!stages.has(def.stage)) problems.push(`${at}: "${def.stage}" is not a stage, so nothing could count it`);
    if (def.kind === "quantity" && !(Number(def.target) >= 1)) {
      problems.push(`${at}: a quantity needs a target of at least 1`);
    }
    if (def.kind === "milestone" && def.target) {
      problems.push(`${at}: a milestone is done or not done — it carries no target`);
    }
    const days = Number(def.days || 0);
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      problems.push(`${at}: days must be a whole number of days, 0 (no clock) to 3650`);
    }
  }
  return problems;
}
