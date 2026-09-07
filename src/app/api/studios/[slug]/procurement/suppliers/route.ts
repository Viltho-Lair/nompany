import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import {
  listSuppliers, assessSupplier, saveSupplierDocuments,
  addScorecard, editScorecard, removeScorecard,
} from "@/modules/procurement/suppliers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE SUPPLIER RECORD'S OWN CRUD IS NOT HERE. Name, contact and item types are
// written through Inventory's `vendors` route, where they always have been —
// this route writes the assessment and owns the scorecards. Two create paths
// for one row is how two shapes of a supplier start disagreeing about who a
// supplier is.
const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-suppliers",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  const result = await listSuppliers(procurement);
  if (refused(result)) return result;
  return {
    ok: true,
    suppliers: result.suppliers,
    // THE CLOCK TRAVELS WITH THE ANSWER. Whether a licence has lapsed is
    // decided once here rather than by whenever the screen happened to render.
    asOf: result.asOf,
    statuses: result.statuses,
    axes: result.axes,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
    canQualify: result.canQualify,
  };
});

export const POST = route(spec, async (procurement) => {
  const result = await addScorecard(procurement, procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, scorecard: result.scorecard } };
});

export const PUT = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };

  // ASSESSING IS ITS OWN BRANCH AND ITS OWN RIGHT, never a status somebody sets
  // through a generic write. The change order that approved itself when a
  // rejection was posted was exactly an answer routed through one.
  if (procurement.body.action === "assess") {
    const assessed = await assessSupplier(procurement, procurement.body);
    if (refused(assessed)) return assessed;
    return { ok: true, supplier: assessed.supplier };
  }

  if (procurement.body.action === "documents") {
    const saved = await saveSupplierDocuments(procurement, procurement.body);
    if (refused(saved)) return saved;
    return { ok: true, supplier: saved.supplier };
  }

  const result = await editScorecard(procurement, procurement.body);
  if (refused(result)) return result;
  return { ok: true, scorecard: result.scorecard };
});

export const DELETE = route(spec, async (procurement) => {
  if (!procurement.body.id) return { error: "missing" };
  const result = await removeScorecard(procurement, procurement.body);
  if (refused(result)) return result;
  return { ok: true };
});
