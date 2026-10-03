// THE KPI MEASURES — the list /super keeps of what a studio can be measured on.
//
// A MEASURE IS A KPI WITH NO NUMBER (modules/main/workKpis): "work orders done
// by their due date", "first delivery within … days of the project". The owner,
// 03/10/2026: /super keeps the list, each studio types its own numbers (stored
// on the studio record as `kpiTargets`, dated, with a per-flow override), and
// nompany never invents a target for a company.
//
// BUILT-INS IN THE CODE, THE CONSOLE'S ROWS OVER THEM — the industries'
// pattern. A stored row replaces its built-in by id (rewording it, or switching
// it off), and a row with a new id is added. A built-in is never deleted, only
// switched off, because studios hold targets keyed by its id.
//
// IT REPLACED THE DEAL KPI DECLARATIONS (`REG.erpKpis`, 20/09/2026), which named
// a service action and were COPIED onto each deal. Service actions were removed
// on 03/10/2026; the copy is replaced by dated targets, which keep the same
// promise — a changed target never re-judges work already under way — without
// writing to every deal. Live held no declarations when it was replaced.
//
// VALIDATED ON WRITE, NOT ON READ — `flows.ts` argues this at length for
// templates and the argument is identical: a measure naming a step a kind of
// work does not have measures nothing, silently, for ever.
import { REG } from "./keys";
import { readArr, editArr } from "./store";
import { STAGE_REGISTRY } from "../engagement/registry";
import { measureProblems, mergeMeasures, type WorkMeasure } from "@/modules/main/workKpis";

/** Every measure, the console's rows over the built-ins. */
export async function readMeasures(): Promise<WorkMeasure[]> {
  return mergeMeasures(await readArr<WorkMeasure>(REG.kpiMeasures));
}

/**
 * Add or replace one measure, refusing anything that could not be measured —
 * checked against the WHOLE list, because a share is only wrong in the company
 * it keeps (its `of` must be there).
 */
export async function writeMeasure(m: WorkMeasure): Promise<void> {
  if (!m?.id) throw new Error("measure: an id is required");
  const others = (await readMeasures()).filter((x) => x.id !== m.id);
  const problems = measureProblems([...others, m], Object.keys(STAGE_REGISTRY));
  if (problems.length) throw new Error(`measure-refused: ${problems.join("; ")}`);
  await editArr<WorkMeasure, void>(REG.kpiMeasures, (rows) => ({
    next: rows.some((r) => r.id === m.id) ? rows.map((r) => (r.id === m.id ? m : r)) : [...rows, m],
    result: undefined,
  }));
}

/**
 * Remove a measure the console added. A BUILT-IN cannot be removed, only
 * switched off; removing a console row that rewords a built-in reverts it.
 * Targets studios set for it stay stored and simply stop being read.
 */
export async function dropMeasure(id: string): Promise<{ error?: string }> {
  const others = (await readMeasures()).filter((x) => x.id !== id);
  if (others.some((x) => x.of === id && x.active)) return { error: "in-use" };
  await editArr<WorkMeasure, void>(REG.kpiMeasures, (rows) => ({
    next: rows.filter((r) => r.id !== id),
    result: undefined,
  }));
  return {};
}
