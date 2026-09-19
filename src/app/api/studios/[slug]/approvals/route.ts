import { route, refused } from "@/platform/http/route";
import { approvalsContext, listApprovals, decideApproval, seesEverything } from "@/modules/approvals/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: approvalsContext, body: true, name: "approvals" };

// THE PAGE, in one read. Everybody gets their own two lists; `all` is null for
// anybody not given every approval (`approvals.overview.view`), so the screen
// knows not to offer a tab it would render empty.
export const GET = route({ ...spec, body: false }, async (a) => {
  const lists = await listApprovals(a);
  return {
    me: { collaboratorId: a.collaborator.id },
    canSeeAll: seesEverything(a),
    canViewSettings: a.canViewSettings,
    ...lists,
  };
});

// ONE ANSWER: { id, verdict: "Approved" | "Rejected", note }. No right is asked
// here or in the service — being named on the open step is the authority, and
// decisionProblem refuses everybody else by name.
export const PUT = route(spec, async (a) => {
  if (!a.body.id) return { error: "missing" };
  const result = await decideApproval(a, String(a.body.id), a.body);
  if (refused(result)) return result;
  return { ok: true, approval: result.approval };
});
