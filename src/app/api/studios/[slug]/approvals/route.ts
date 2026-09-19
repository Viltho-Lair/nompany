import { route, refused } from "@/platform/http/route";
import { signingPinProblem } from "@/platform/auth/lock";
import { approvalsContext, listApprovals, decideApproval, retryFinish, seesEverything } from "@/modules/approvals/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE RECORD'S OWN REFUSALS come back through here too: the yes that would
// finish a till return is asked of the return first (modules/approvals/effects),
// and a closed drawer or units already back are the world disagreeing — 409.
const spec = {
  auth: "studio", context: approvalsContext, body: true, name: "approvals",
  status: { "no-shift": 409, "over-credit": 409, "too-many": 409, unquoted: 409, "no-studio-currency": 409 },
};

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
//
// A YES ASKS THE SIGNER'S PIN (platform/auth/lock.ts) — every type, the owner's
// decision of 19/09/2026, where before only bills, bids, requisitions, stock
// adjustments and till returns did. A no commits nobody to anything and asks
// nothing. The page never sees the question: SessionLock answers the 428.
//
// { id, action: "finish" } tries again to move a record its decided approval
// could not (retryFinish).
export const PUT = route(spec, async (a) => {
  if (!a.body.id) return { error: "missing" };
  if (a.body.action === "finish") {
    const retried = await retryFinish(a, String(a.body.id));
    if (refused(retried)) return retried;
    return { ok: true, approval: retried.approval };
  }
  if (a.body.verdict === "Approved") {
    const pinGate = await signingPinProblem(a.studio, a.user.id, a.body.pin);
    if (pinGate) return pinGate;
  }
  const result = await decideApproval(a, String(a.body.id), a.body);
  if (refused(result)) return result;
  return { ok: true, approval: result.approval };
});
