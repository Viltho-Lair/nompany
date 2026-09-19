import { route, refused } from "@/platform/http/route";
import {
  procurementContext, listRequisitions, createRequisition,
  editRequisition, moveRequisition, removeRequisition,
} from "@/modules/procurement/requisitions";
import { referencePickers } from "@/modules/procurement/pickers";
import { raiseFromBulk } from "@/modules/procurement/fromBulk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-requisitions",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  const result = await listRequisitions(procurement);
  if (refused(result)) return result;

  // WHAT THE FORM PICKS FROM: the supplier, the project and its cost codes,
  // and each line's Registered Item — all typed as raw ids until now. Each
  // request already carries how far its approval has got (listRequisitions).
  const pickers = await referencePickers(procurement.studio, {
    suppliers: procurement.suppliersSection,
    projects: procurement.projectsListSection,
    items: procurement.itemsSection,
  }, { suppliers: true, projects: true, costCodes: true, items: true });

  return {
    ok: true,
    requisitions: result.requisitions,
    asOf: result.asOf,
    // THE RIGHTS TRAVEL WITH THE ANSWER, so the screen draws a control only
    // where the service would accept what is behind it.
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
    canOrder: result.canOrder,
    canPlace: result.canPlace,
    pickers,
  };
});

export const POST = route(spec, async (procurement) => {
  // "ORDER WHAT'S NEEDED" FROM A PROJECT'S BULK SHEET — one draft per supplier,
  // each through createRequisition. See modules/procurement/fromBulk.ts.
  if (procurement.body.fromBulk) {
    const raised = await raiseFromBulk(procurement, procurement.body);
    if (refused(raised)) return raised;
    return { status: 201, body: raised };
  }
  const result = await createRequisition(procurement, procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, requisition: result.requisition } };
});

export const PUT = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const id = String(procurement.body.id);
  const action = String(procurement.body.action || "");

  // TWO ACTS BESIDE THE EDIT: submit (which asks for the request's approval)
  // and cancel. APPROVING IS NOT HERE: it is answered on the Approvals page
  // (19/09/2026), and a generic PUT accepting a status would route an approval
  // around its approvers — the defect the change-order route shipped with.
  if (action === "submit" || action === "cancel") {
    const moved = await moveRequisition(
      procurement, id, action === "submit" ? "Submitted" : "Cancelled");
    if (refused(moved)) return moved;
    return { ok: true, requisition: moved.requisition, ...(moved.approvalProblem ? { approvalProblem: moved.approvalProblem } : {}) };
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
