// A FLOW'S STEPS AND THEIR TARGETS, purely — the owner, 05/10/2026: "I should run
// nompany, not the flow."
//
// A deal KPI was a measure nompany declared in /super ("quoted within … days")
// and a studio numbered on another screen, over a flow chosen by an industry
// table that was also nompany's. Three places, two people, one flow. Now the
// studio owns the flow and each step carries its own target: "reach Quotation
// within 3 days". This file is the arithmetic of that and stores nothing.
//
// THE TARGET IS DATED. A deal is judged by the version in force when it opened,
// which is what keeps a changed number from re-judging work already measured —
// the same rule the old catalogue's versions kept (./workKpis `targetIn`).
//
// JUDGED BY THE ENGINE THAT ALREADY JUDGES "REACH WITHIN N DAYS" — `judgeItem`,
// the one the field jobs and work orders use. A step target is a reach KPI with
// a step, a start and a number; a second judge would be a second answer to
// "is this late".
import type { FlowTemplate, StepTarget } from "@/platform/engagement/templates";
import { judgeItem, type KpiOutcome, type WorkFacts } from "./workKpis";

const DAY = 86_400_000;

/** The target in force for a step at `at` (a deal's opening), or null: not measured. */
export function stepTargetIn(
  versions: readonly StepTarget[] | undefined,
  at: string,
): { days: number; from: string } | null {
  const t = Date.parse(at);
  if (!versions?.length || !Number.isFinite(t)) return null;
  let found: StepTarget | null = null;
  for (const v of versions) if (Date.parse(v.at) <= t) found = v;
  if (!found || found.days === null) return null;
  return { days: found.days, from: found.from || "" };
}

/** The target as it stands now — what the editor shows. */
export function currentStepTarget(versions: readonly StepTarget[] | undefined): { days: number | null; from: string } {
  const last = versions?.length ? versions[versions.length - 1] : null;
  return { days: last ? last.days : null, from: last?.from || "" };
}

/**
 * A CHANGE, APPENDED AS A NEW VERSION, never an edit of the last one. Unchanged
 * when it equals what is in force, so saving a flow untouched writes nothing new.
 */
export function nextStepTargets(
  targets: FlowTemplate["targets"],
  step: string,
  change: { days: number | null; from: string },
  at: string,
  by: string,
): Record<string, StepTarget[]> {
  const out: Record<string, StepTarget[]> = {};
  for (const [k, v] of Object.entries(targets || {})) out[k] = [...v];
  const list = out[step] || [];
  const now = currentStepTarget(list);
  const from = change.days === null ? "" : change.from || "";
  if (now.days === change.days && (change.days === null || now.from === from)) return out;
  out[step] = [...list, { at, by, days: change.days, from }];
  return out;
}

/**
 * WHAT IS WRONG WITH A STEP'S TARGET, or "". The clock may start at the deal's
 * opening or at an EARLIER step of the same flow — a start after the step, or
 * outside the flow, is a clock that can never run.
 */
export function stepTargetProblem(stages: readonly string[], step: string, days: number | null, from: string): string {
  if (!stages.includes(step)) return "step";
  if (days === null) return "";
  if (!Number.isInteger(days) || days < 1 || days > 3650) return "days";
  if (from && (!stages.includes(from) || stages.indexOf(from) >= stages.indexOf(step))) return "from";
  return "";
}

/** A deal's facts, as a step target reads them: when it opened and when each step was first reached. */
export function judgeStep(
  step: string,
  target: { days: number; from: string },
  facts: WorkFacts,
  asOf: string,
): { outcome: KpiOutcome; dueAt: string } | null {
  return judgeItem(
    { id: `step:${step}`, label: step, workType: "deal", kind: "reach", step, days: target.days, ...(target.from ? { from: target.from } : {}) },
    facts, asOf,
  );
}

/** Whole days between two instants, or null when either is missing. */
export function daysBetween(fromAt: string, toAt: string): number | null {
  const a = Date.parse(fromAt);
  const b = Date.parse(toAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return (b - a) / DAY;
}

/** The fewest finished deals a suggestion is made from — fewer is an anecdote. */
export const SUGGEST_FROM = 3;

/**
 * THE NUMBER THE STUDIO'S OWN HISTORY SUGGESTS: how long its deals actually
 * took to reach a step, on average, rounded UP to whole days — a target the
 * studio already meets half the time, which is where improving starts. Null
 * with fewer than three deals to learn from.
 */
export function suggestDays(durations: readonly number[]): { average: number; suggested: number; from: number } | null {
  if (durations.length < SUGGEST_FROM) return null;
  const average = durations.reduce((n, d) => n + d, 0) / durations.length;
  return { average: Math.round(average * 10) / 10, suggested: Math.max(1, Math.ceil(average)), from: durations.length };
}
