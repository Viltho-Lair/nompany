// THE KPI DECLARATIONS — stored rows, read by the deal that copies them.
//
// PLATFORM-LEVEL, LIKE THE TRADES BESIDE THEM. A target for "Installation" is
// what nompany means by the word, so it is declared once in /super rather than
// twenty-five times; a studio inherits it by naming the action on a ticket. The
// trades took the same road on 20/09/2026 and for the same reason: adding one
// had to be a row rather than a release.
//
// THERE ARE NO SEEDS, DELIBERATELY. The list starts empty and the owner fills
// it. Shipping a plausible-looking "commissioned within 30 days" for twenty
// actions would be inventing twenty numbers nobody agreed to, on screens that
// present them as the company's own targets — the product would be judging
// every studio's work against figures this repo made up.
//
// VALIDATED ON WRITE, NOT ON READ — `flows.ts` argues this at length for
// templates and the argument is identical: a KPI naming a stage the registry
// does not have measures nothing, silently, for ever.
import { REG } from "./keys";
import { readArr, editArr } from "./store";
import { STAGE_REGISTRY } from "../engagement/registry";
import { SERVICE_ACTIONS } from "@/shared/fieldsOfWork";
import { kpiProblems } from "../kpi/model";
import type { KpiDefinition } from "../kpi/model";

/** Every KPI the product knows. Empty until somebody declares one. */
export async function listPlatformKpis(): Promise<KpiDefinition[]> {
  return readArr<KpiDefinition>(REG.erpKpis);
}

/**
 * Declare or replace one KPI, refusing anything that could not be measured.
 *
 * Checked against the WHOLE list, the way a flow template is: `declared twice`
 * is a property of the list rather than of the row, and a row is only ever
 * wrong in the company it keeps.
 */
export async function writePlatformKpi(def: KpiDefinition): Promise<void> {
  if (!def?.id) throw new Error("kpi: an id is required");
  const others = (await listPlatformKpis()).filter((k) => k.id !== def.id);
  const problems = kpiProblems(Object.keys(STAGE_REGISTRY), SERVICE_ACTIONS, [...others, def]);
  if (problems.length) throw new Error(`kpi-refused: ${problems.join("; ")}`);

  await editArr<KpiDefinition, void>(REG.erpKpis, (rows) => {
    const next = rows.some((r) => r.id === def.id)
      ? rows.map((r) => (r.id === def.id ? def : r))
      : [...rows, def];
    return { next, result: undefined };
  });
}

/**
 * Withdraw a KPI. DEALS ALREADY CARRYING IT KEEP MEASURING IT — they hold a
 * copy, and re-judging work that is under way because somebody tidied a list is
 * exactly what the copy exists to prevent. What stops is new deals taking it on.
 */
export async function dropPlatformKpi(id: string): Promise<void> {
  await editArr<KpiDefinition, void>(REG.erpKpis, (rows) => ({
    next: rows.filter((r) => r.id !== id),
    result: undefined,
  }));
}
