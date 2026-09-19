// CAMPAIGNS — the Marketing department's register, the parent of every
// marketing activity.
//
// PUT CARRIES THREE NAMED ACTIONS — `move` (a status along the ladder), `clone`
// and `lead` (send a lead to Sales) — and otherwise edits. Each answers to its right inside the service;
// the route adds no gate of its own, so there is one set of rules.
import { route, refused } from "@/platform/http/route";
import {
  marketingContext, listCampaigns, createCampaign, editCampaign, moveCampaign, cloneCampaign, removeCampaign, sendLead,
} from "@/modules/marketing/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-campaigns" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const result = await listCampaigns(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createCampaign(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, campaign: result.campaign } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const action = String(m.body.action || "");
  if (action === "lead") {
    const sent = await sendLead(m, id, m.body);
    if (refused(sent)) return sent;
    return { status: 201, body: { ok: true } };
  }
  const result = action === "move" ? await moveCampaign(m, id, String(m.body.status || ""))
    : action === "clone" ? await cloneCampaign(m, id)
    : await editCampaign(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, campaign: result.campaign };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeCampaign(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
