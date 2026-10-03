import { route } from "@/platform/http/route";
import { readMeasures, writeMeasure, dropMeasure } from "@/platform/db/kpis";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { BUILTIN_MEASURE_IDS, ITEM_KINDS, PERIOD_KINDS, PERIODS, type WorkMeasure } from "@/modules/main/workKpis";
import { WORK_TYPES, WORK_TYPE_KEYS, type WorkTypeKey } from "@/modules/main/workTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE LIST OF WHAT A STUDIO CAN BE MEASURED ON — the owner, 03/10/2026: /super
// keeps the list, each studio sets its own numbers. A measure has no number
// here, by design: nompany never invents a target for a company.
//
// It replaced `super/erp-kpis` (deal KPI declarations keyed to a service
// action) when service actions were removed the same day.
const spec = { auth: "super", name: "super/kpi-measures" };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const idFrom = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const GET = route(spec, async () => ({
  measures: (await readMeasures()).map((m) => ({ ...m, builtIn: BUILTIN_MEASURE_IDS.has(m.id) })),
  // WHAT A MEASURE MAY POINT AT, sent with the list rather than restated in the
  // screen, so it can never offer a step nothing could measure.
  workTypes: WORK_TYPE_KEYS.map((k) => ({
    key: k, name: WORK_TYPES[k].name,
    steps: WORK_TYPES[k].steps
      ? WORK_TYPES[k].steps!.map((s) => ({ token: s.token, label: s.en }))
      : Object.values(STAGE_REGISTRY).map((e) => ({ token: e.type, label: e.label })),
  })),
  itemKinds: ITEM_KINDS,
  periodKinds: PERIOD_KINDS,
  periods: PERIODS,
}));

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  const en = str(body?.name?.en, 160);
  if (!en) return { error: "name" };
  // THE ID IS WHAT A STUDIO'S TARGET IS KEYED BY, derived once from the name
  // and never re-derived: rewording a measure must not orphan every target.
  const id = str(body?.id, 60) || idFrom(en);
  if (!id) return { error: "id" };
  const measure: WorkMeasure = {
    id,
    name: { en, ar: str(body?.name?.ar, 160) },
    workType: str(body?.workType, 30) as WorkTypeKey,
    kind: str(body?.kind, 20) as WorkMeasure["kind"],
    ...(str(body?.step, 60) ? { step: str(body.step, 60) } : {}),
    ...(str(body?.from, 60) ? { from: str(body.from, 60) } : {}),
    ...(str(body?.of, 60) ? { of: str(body.of, 60) } : {}),
    ...(str(body?.per, 10) ? { per: str(body.per, 10) as WorkMeasure["per"] } : {}),
    active: body?.active !== false,
  };
  try {
    await writeMeasure(measure);
  } catch (e) {
    // The refusals are written for the person making the edit, so they are
    // passed through rather than flattened into one word.
    return { error: String((e as Error).message || "measure-refused") };
  }
  return { ok: true, measures: (await readMeasures()).map((m) => ({ ...m, builtIn: BUILTIN_MEASURE_IDS.has(m.id) })) };
});

export const DELETE = route({ ...spec, body: true }, async ({ body }) => {
  const id = str(body?.id, 60);
  if (!id) return { error: "missing" };
  const out = await dropMeasure(id);
  if (out.error) return out;
  return { ok: true, measures: (await readMeasures()).map((m) => ({ ...m, builtIn: BUILTIN_MEASURE_IDS.has(m.id) })) };
});
