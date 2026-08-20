// THE LADDER — author, reviewer, approver, issued.
//
// GET answers "where does this stand and what could I do to it", so a screen
// draws a button only where pressing it would succeed. POST makes the move.
// Both read the same transition table, which is why the two can never disagree
// about what is legal.

import { qualityGuard } from "@/lib/quality";
import { can } from "@/lib/access";
import { workflowFor, moveRevision, startRevision } from "@/lib/qualityDocRevisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS = {
  notfound: 404,
  forbidden: 403,
  denied: 403,
  "wrong-state": 409,
  "already-open": 409,
  "not-issued": 409,
  obsolete: 409,
  "same-signer": 409,
};

const bad = (out) => Response.json(out, { status: STATUS[out.error] || 400 });

export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const out = await workflowFor(g, id, (permission) => can(g.access, permission));
  return out.error ? bad(out) : Response.json(out);
}

export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");

  // STARTING THE NEXT REVISION IS NOT A MOVE ON THE LADDER. Nothing is being
  // signed and nothing changes state — an issued document simply becomes
  // writable again, under a new revision number. It goes through here because
  // it is the same screen and the same guard, not because it is a transition.
  const out = action === "start"
    ? await startRevision(g, id)
    : await moveRevision(g, id, action, body);

  if (out.error) return bad(out);
  return Response.json({
    ...out,
    workflow: await workflowFor(g, id, (permission) => can(g.access, permission)),
  });
}
