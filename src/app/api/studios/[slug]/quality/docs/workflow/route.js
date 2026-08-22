// THE LADDER — author, reviewer, approver, issued.
//
// GET answers "where does this stand and what could I do to it", so a screen
// draws a button only where pressing it would succeed. POST makes the move.
// Both read the same transition table, which is why the two can never disagree
// about what is legal.
//
// THIS FILE USED TO KEEP ITS OWN STATUS LADDER — the fifth copy in the codebase,
// and the one that proved the point. It was missing `no-revision`, so three
// refusals here answered 400 where the rest of the product answers 404 for the
// same meaning: the revision you named is not there. Nobody wrote that
// deliberately; a private copy simply fell behind, silently, which is what
// private copies do. It also listed `denied: 403` for an error name no service
// has ever returned.

import { route } from "@/platform/http/route";
import { qualityContext } from "@/lib/quality";
import { can } from "@/platform/access";
import { workflowFor, moveRevision, startRevision } from "@/lib/qualityDocRevisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: qualityContext, name: "quality/docs/workflow" };
const idOf = (request) => new URL(request.url).searchParams.get("id") || "";

export const GET = route(spec, async ({ request, ...q }) => {
  const id = idOf(request);
  if (!id) return { error: "missing" };
  return workflowFor(q, id, (permission) => can(q.access, permission));
});

export const POST = route({ ...spec, body: true }, async ({ request, body, ...q }) => {
  if (!q.canManage) return { error: "read-only" };

  const id = idOf(request);
  if (!id) return { error: "missing" };
  const action = String(body?.action || "");

  // STARTING THE NEXT REVISION IS NOT A MOVE ON THE LADDER. Nothing is being
  // signed and nothing changes state — an issued document simply becomes
  // writable again, under a new revision number. It goes through here because
  // it is the same screen and the same guard, not because it is a transition.
  const out = action === "start"
    ? await startRevision(q, id)
    : await moveRevision(q, id, action, body);

  if (out.error) return out;
  return { ...out, workflow: await workflowFor(q, id, (permission) => can(q.access, permission)) };
});
