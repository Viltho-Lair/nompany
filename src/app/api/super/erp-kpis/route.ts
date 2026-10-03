import { route } from "@/platform/http/route";
import { listPlatformKpis, writePlatformKpi, dropPlatformKpi } from "@/platform/db/kpis";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT A DEAL IS MEASURED ON, DECLARED ONCE — the owner, 20/09/2026. A deal
// COPIES what it is given when the work starts, so editing a row here never
// re-judges work already under way. A row named the service action it measured
// until service actions were removed (03/10/2026); every row measures every
// deal until KPIs are keyed to work types.
const spec = { auth: "super", name: "super/erp-kpis" };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const idFrom = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const GET = route(spec, async () => ({
  kpis: await listPlatformKpis(),
  // WHAT A ROW MAY POINT AT, sent with the list rather than restated in the
  // screen: the stages a KPI can be counted off — a fixed platform value, so the
  // screen can never offer a target nothing could measure.
  stages: Object.values(STAGE_REGISTRY).map((e) => ({ type: e.type, label: e.label })),
}));

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  const label = str(body?.label, 120);
  if (!label) return { error: "label" };
  // THE ID IS WHAT A DEAL STORES, derived once from the label and never
  // re-derived on an edit: rewording a target must not make every deal already
  // carrying it start again under a new name.
  const id = str(body?.id, 60) || idFrom(label);
  if (!id) return { error: "id" };

  const kind = body?.kind === "quantity" ? "quantity" as const : "milestone" as const;
  try {
    await writePlatformKpi({
      id,
      label,
      kind,
      stage: str(body?.stage, 60),
      // NUMBERS ARE PASSED THROUGH, NOT CORRECTED. Clamping looks kind and is
      // not: a 0 typed into "how many" quietly became a target of 1, and a
      // fractional number of days quietly became a whole one, so the row saved
      // was not the row the person wrote. `kpiProblems` refuses both in words
      // about the edit, which is the whole reason it says them in sentences.
      days: Number(body?.days) || 0,
      // A milestone carries no target — `kpiProblems` refuses one — so the
      // field is simply not sent for that kind rather than being sent back as
      // an error about a box the screen does not show.
      ...(kind === "quantity" ? { target: Number(body?.target) || 0 } : {}),
    });
  } catch (e) {
    // The refusals are written for the person making the edit ("… is not a
    // stage, so nothing could count it"), so they are passed through rather
    // than flattened into one unhelpful word.
    return { error: String((e as Error).message || "kpi-refused") };
  }
  return { ok: true, kpis: await listPlatformKpis() };
});

export const DELETE = route({ ...spec, body: true }, async ({ body }) => {
  const id = str(body?.id, 60);
  if (!id) return { error: "missing" };
  await dropPlatformKpi(id);
  return { ok: true, kpis: await listPlatformKpis() };
});
