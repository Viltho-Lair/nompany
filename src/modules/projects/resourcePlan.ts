// THE SERVER HALF OF RESOURCE PLANNING — it reads plans, and decides nothing.
//
// The arithmetic is in ./resources, which is pure and shared with the screen.
// This file exists only because the pure model needs plan DOCUMENTS and the
// planner index carries summaries: a summary knows a plan's name and progress,
// not its tasks or who is on them.
//
// WHY THIS COSTS MORE ROUND TRIPS THAN ANYTHING ELSE IN THE PRODUCT, stated here
// rather than discovered in a hop count. Every other list route reads one
// collection; this one answers a question ABOUT EVERY PLAN AT ONCE, and a plan
// is a document of its own. There is no join to reach for — the tasks are inside
// each document — so N plans is N reads and no amount of care changes that. What
// is done about it: the index is read once, plans are capped, and the reads run
// together rather than in series.
import { requirePermission } from "@/platform/access";
import { listStudioPlans, readPlan } from "@/modules/operations/planner";
import { resourceLoad } from "./resources";
import type { PlanForLoad, ResourceDecl } from "./resources";
import type { PermissionSet } from "@/platform/access";
import type { StudioRef } from "@/modules/context";

/**
 * HOW MANY PLANS ONE ANSWER WILL OPEN.
 *
 * A studio with more schedules than this has outgrown a single view of them, and
 * the honest response is to say so rather than to spend a hundred round trips
 * quietly. `truncated` travels in the answer so the screen can tell the reader
 * the report is partial — a load report that silently omitted half the studio's
 * work would be worse than no report, because somebody would plan against it.
 */
export const MAX_PLANS = 60;

type Ctx = { studio: StudioRef; access: PermissionSet };

export async function readResourceLoad(
  ctx: Ctx,
  window: { from?: unknown; to?: unknown } = {},
) {
  // THE PLANNER'S OWN RIGHT, and no new key. This shows the schedule a different
  // way round — by person rather than by task — and exposes nothing somebody
  // holding the planner cannot already read by opening each plan in turn. A
  // right that gates no new information is not a boundary, it is a second lock
  // on the same door that can drift out of step with the first.
  const denied = requirePermission(ctx.access, "projects.planner.view");
  if (denied) return denied;

  const summaries = await listStudioPlans(ctx.studio.id);
  const wanted = summaries.slice(0, MAX_PLANS);

  // TOGETHER, NOT IN SERIES. These are independent document reads and the
  // request is already paying N of them; making them sequential would multiply
  // the latency by N for no benefit.
  const docs = await Promise.all(
    wanted.map(async (s) => ({ summary: s, doc: await readPlan(ctx.studio.id, s.id) })),
  );

  const plans: PlanForLoad[] = [];
  // THE RESOURCE LIST IS COLLECTED ACROSS PLANS, deliberately. Each plan carries
  // its own copy, seeded from the studio's planner presets, so the same person
  // holds the same id in every plan that started from those presets — which is
  // the whole reason a cross-project answer is possible at all. Later copies do
  // not overwrite earlier ones: a plan somebody edited the name or capacity in
  // should not silently re-size that person everywhere else.
  const resources = new Map<string, ResourceDecl>();

  for (const { summary, doc } of docs) {
    if (!doc) continue;
    plans.push({
      id: summary.id,
      name: summary.name,
      projectId: summary.projectId,
      projectTitle: summary.projectTitle,
      tasks: (doc as { tasks?: unknown }).tasks,
    });
    for (const r of ((doc as { resources?: unknown }).resources as ResourceDecl[]) || []) {
      const id = String(r?.id ?? "");
      if (id && !resources.has(id)) resources.set(id, r);
    }
  }

  return {
    load: resourceLoad(plans, [...resources.values()], window),
    plansRead: plans.length,
    truncated: summaries.length > wanted.length,
  };
}
