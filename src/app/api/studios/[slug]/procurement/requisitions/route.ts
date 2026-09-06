import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import {
  procurementContext, listRequisitions, createRequisition,
  editRequisition, moveRequisition, removeRequisition,
} from "@/modules/procurement/requisitions";
import { requisitionReview, answerRequisition } from "@/modules/procurement/approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-requisitions",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  const result = await listRequisitions(procurement);
  if (refused(result)) return result;

  // THE REVIEW TRAVELS WITH THE LIST, so the screen can draw how far each
  // request has got and whether this reader could sign it — without a second
  // call per row. It costs no round trip: `requisitionPlan` reads no store and
  // makes no FX call, because a requisition is already in the studio's
  // currency (see modules/procurement/approval.ts).
  const reviews = await Promise.all(
    result.requisitions.map((r) => requisitionReview(procurement, r)),
  );

  return {
    ok: true,
    requisitions: result.requisitions.map((r, i) => ({ ...r, review: reviews[i] })),
    asOf: result.asOf,
    // THE RIGHTS TRAVEL WITH THE ANSWER, so the screen draws a control only
    // where the service would accept what is behind it.
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
    canOrder: result.canOrder,
    // Holding an approval right does not mean this person may sign THIS
    // request — `review.next` answers that per row, and this only says whether
    // to draw the column at all.
    canApprove: !requirePermission(procurement.access, "procurement.requisitions.approve")
      || !requirePermission(procurement.access, "procurement.requisitions.approveHigh"),
  };
});

export const POST = route(spec, async (procurement) => {
  const result = await createRequisition(procurement, procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, requisition: result.requisition } };
});

export const PUT = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const id = String(procurement.body.id);
  const action = String(procurement.body.action || "");

  // THREE ACTS, THREE BRANCHES, matching the service. Only the last carries
  // invariant 7, and it is deliberately not reachable through the edit path —
  // a generic PUT accepting a status would route an approval around the
  // submitter check, which is the defect the change-order route shipped with.
  if (action === "submit" || action === "cancel") {
    const moved = await moveRequisition(
      procurement, id, action === "submit" ? "Submitted" : "Cancelled");
    if (refused(moved)) return moved;
    return { ok: true, requisition: moved.requisition };
  }

  if (action === "approve" || action === "reject") {
    // THE BOOLEAN IS COMPUTED HERE, never the body forwarded. Passing
    // `procurement.body` where a boolean is expected is exactly how rejecting a
    // variation came to approve it: an object is truthy, the compiler cannot
    // see it, and no test could reach the transition.
    const answered = await answerRequisition(
      procurement, id, action === "approve", String(procurement.body.reason || ""));
    if (refused(answered)) return answered;
    return { ok: true, requisition: answered.requisition, approved: answered.approved };
  }

  const result = await editRequisition(procurement, id, procurement.body);
  if (refused(result)) return result;
  return { ok: true, requisition: result.requisition };
});

export const DELETE = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const result = await removeRequisition(procurement, String(procurement.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
