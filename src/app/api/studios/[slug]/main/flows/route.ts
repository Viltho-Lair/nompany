import { refused, subscriptionRefusal } from "@/platform/http/route";
import { statusFor } from "@/platform/http/httpStatus";
import { currentUser } from "@/platform/auth/identity";
import { mainContext } from "@/modules/main/main";
import { readDealFlows, saveDealFlow, addDealFlow, removeDealFlow, moveDealFlow } from "@/modules/main/dealFlows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE STUDIO'S DEAL FLOWS, AS ONE BOARD (05/10/2026) — its flows, the deals at
// each step, and each step's own target. Every right is checked in the service
// (modules/main/dealFlows); this layer decides HTTP shape and nothing else.
//
// ONE POST, FOUR ACTS, chosen by `action`: save a flow, add one, remove one,
// move a deal onto one. They are one screen's acts and answer to one right.
// A refusal is 400 and carries its reason, so the screen can say which step.

type Params = { params: Promise<Record<string, string>> };

async function open(request: Request, params: Params, write: boolean) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await params.params;
  const main = await mainContext(user, slug);
  if (refused(main)) return { fail: Response.json({ error: main.error }, { status: main.error === "notfound" ? 404 : 403 }) };
  if (write) {
    const lapsed = await subscriptionRefusal(main, request);
    if (lapsed) return { fail: lapsed };
  }
  return { ctx: { studio: main.studio, access: main.access, sections: main.sections, actor: main.collaborator.id } };
}

const answer = (result: object) => {
  if (refused(result as { error?: string })) {
    const error = (result as { error: string }).error;
    return Response.json(result, { status: error === "refused" ? 400 : statusFor(error) });
  }
  return Response.json(result);
};

export async function GET(request: Request, params: Params) {
  const { fail, ctx } = await open(request, params, false);
  if (fail) return fail;
  return answer(await readDealFlows(ctx));
}

export async function POST(request: Request, params: Params) {
  const { fail, ctx } = await open(request, params, true);
  if (fail) return fail;
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) || {}; } catch { body = {}; }
  const action = String(body.action || "");
  if (action === "save") return answer(await saveDealFlow(ctx, (body.flow || {}) as Record<string, unknown>));
  if (action === "add") return answer(await addDealFlow(ctx, body));
  if (action === "remove") return answer(await removeDealFlow(ctx, body.id));
  if (action === "move") return answer(await moveDealFlow(ctx, body.dealId, body.flowId));
  return Response.json({ error: "action" }, { status: 400 });
}
