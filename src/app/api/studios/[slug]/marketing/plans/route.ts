// THE PLAN FOR A PERIOD (modules/marketing/planning) — what the quarter is
// for, what it may spend, and which campaigns are doing it.
//
// ITS OWN ROUTE, beside the calendar's, because the calendar reads campaigns
// and writes nothing while a plan is this section's own record. Every right is
// asked inside the service, so there is one set of rules.
//
// FILING A CAMPAIGN UNDER A PLAN IS NOT HERE: it sets `planId` on the campaign
// and goes through the campaigns route, which is the only door onto a campaign.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { listPlans, createPlan, editPlan, deletePlan } from "@/modules/marketing/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-plans" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listPlans(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createPlan(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, plan: result.plan } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await editPlan(m, String(m.body.id), m.body);
  if (refused(result)) return result;
  return { ok: true, plan: result.plan };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await deletePlan(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
