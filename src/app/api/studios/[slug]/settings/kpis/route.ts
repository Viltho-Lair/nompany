import { currentUser } from "@/platform/auth/identity";
import { subscriptionRefusal } from "@/platform/http/route";
import { studioContext } from "@/lib/studios";
import { requirePermission } from "@/platform/access";
import { updateStudio } from "@/modules/main/studios";
import { readMeasures } from "@/platform/db/kpis";
import { listFlowTemplates } from "@/platform/db/flows";
import { listSections } from "@/platform/db/sections";
import { switchboard } from "@/lib/dashboardWidgets";
import { nextVersions, numberOf, targetProblem, type StudioKpiTargets, type TargetVersion } from "@/modules/main/workKpis";
import { workTypesRunning } from "@/modules/main/workTypes";
import type { User } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A STUDIO'S KPI TARGETS — the owner, 03/10/2026. /super keeps the list of
// measures; the studio types its own numbers here, studio-wide with an optional
// override per deal flow.
//
// STUDIO SETTINGS, NOT A DEPARTMENT'S: a target is read by the front door, the
// deal page and every kind of work, so it is the studio's ("a setting several
// sections can use is the studio's", 22/09/2026). Read and written on the
// settings rights.
//
// A CHANGE IS A NEW VERSION, NEVER AN EDIT (`nextVersions`): every piece of work
// is judged by the target in force when it opened, so changing a number never
// re-judges work already under way.

const targetsOf = (studio: Record<string, unknown>): StudioKpiTargets =>
  (studio.kpiTargets && typeof studio.kpiTargets === "object" ? studio.kpiTargets : {}) as StudioKpiTargets;

async function payload(user: User, slug: string) {
  const context = await studioContext(user, slug);
  if (context.error) return { context, body: null };
  if (requirePermission(context.access, "administration.settings.view")) return { context: { error: "forbidden" as const }, body: null };
  const studio = context.studio as Record<string, unknown> & { id: string };
  const [measures, flows, sections] = await Promise.all([
    readMeasures(), listFlowTemplates(studio.id), listSections(studio.id),
  ]);
  const running = new Set(workTypesRunning(switchboard(sections)));
  const targets = targetsOf(studio);
  return {
    context,
    body: {
      // ONLY WHAT THIS STUDIO RUNS: a work-order target in a studio with no
      // Maintenance is a target for work nobody there does.
      measures: measures
        .filter((m) => m.active && running.has(m.workType))
        .map((m) => {
          const versions: TargetVersion[] = targets[m.id] || [];
          const now = versions[versions.length - 1] || null;
          return {
            id: m.id, name: m.name, workType: m.workType, kind: m.kind, per: m.per || "",
            asks: numberOf(m.kind),
            value: now ? now.value : null,
            byFlow: now ? now.byFlow : {},
            since: now ? now.at : "",
          };
        }),
      flows: flows.map((t) => ({ id: t.id, name: t.name })),
      canManage: !requirePermission(context.access, "administration.settings.edit"),
    },
  };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const { context, body } = await payload(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  return Response.json(body);
}

/**
 * `{ measureId, value }` sets the studio-wide number (null switches the measure
 * off for this studio). `{ measureId, flowId, value }` sets that flow's override
 * (null: the flow is not measured on it); `{ measureId, flowId, clear: true }`
 * removes the override so the studio-wide number applies again.
 */
export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  const lapsed = await subscriptionRefusal(context, request);
  if (lapsed) return lapsed;
  if (requirePermission(context.access, "administration.settings.edit")) return Response.json({ error: "forbidden" }, { status: 403 });

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch { raw = {}; }
  const studio = context.studio as Record<string, unknown> & { id: string };
  const measureId = String(raw.measureId || "");
  const measure = (await readMeasures()).find((m) => m.id === measureId && m.active);
  if (!measure) return Response.json({ error: "measure" }, { status: 400 });

  const flowId = String(raw.flowId || "");
  if (flowId && !(await listFlowTemplates(studio.id)).some((t) => t.id === flowId)) {
    return Response.json({ error: "flow" }, { status: 400 });
  }
  const clear = raw.clear === true;
  const value = clear ? undefined : raw.value === null || raw.value === "" ? null : Number(raw.value);
  if (clear && !flowId) return Response.json({ error: "clear-needs-flow" }, { status: 400 });
  if (value !== undefined) {
    const problem = targetProblem(measure, value);
    if (problem) return Response.json({ error: "target", problem }, { status: 400 });
  }

  const by = String((context.collaborator as { id?: unknown })?.id || "");
  const at = new Date().toISOString();
  // A FUNCTION PATCH (invariant 8): the versions are appended to what is stored
  // at the moment of the write, not to what this request read.
  const updated = await updateStudio(studio.id, (row) => {
    const all = targetsOf(row as Record<string, unknown>);
    return { kpiTargets: { ...all, [measureId]: nextVersions(all[measureId], { ...(flowId ? { flowId } : {}), value }, at, by) } };
  });
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  const { body } = await payload(user, slug);
  return Response.json({ ok: true, ...body });
}
