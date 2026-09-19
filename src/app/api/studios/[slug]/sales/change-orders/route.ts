import { route, refused } from "@/platform/http/route";
import { salesContext } from "@/modules/sales/sales";
import {
  listChangeOrders, createChangeOrder, updateChangeOrder,
  submitChangeOrder,
} from "@/modules/sales/changeOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Change orders live in the quotations section with the contracts they amend,
// and are named for the record rather than the section for the reason the
// contracts route gives: an audit action reading "POST crm-sales-quotations"
// cannot be told apart from a quotation being raised.
const spec = { auth: "studio", context: salesContext, body: true, name: "crm-sales-change-orders" };

export const GET = route({ ...spec, body: false }, async (sales) => {
  const result = await listChangeOrders(sales);
  if (refused(result)) return result;
  return { ok: true, changeOrders: result.changeOrders };
});

export const POST = route(spec, async (sales) => {
  const result = await createChangeOrder(sales, sales.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, changeOrder: result.changeOrder } };
});

export const PUT = route(spec, async (sales) => {
  if (!sales.body.id) return { error: "missing" };
  const result = await updateChangeOrder(sales, String(sales.body.id), sales.body);
  if (refused(result)) return result;
  return { ok: true, changeOrder: result.changeOrder };
});

// SUBMITTING IS ITS OWN VERB, not a status field on PUT, and it asks for the
// variation's approval. ANSWERING is not here at all since 19/09/2026: it is
// given on the Approvals page, where the submitter is never asked about their
// own. A generic PUT accepting an approved status would route an approval
// around its approvers.
export const PATCH = route(spec, async (sales) => {
  const id = String(sales.body.id || "");
  if (!id) return { error: "missing" };

  const action = String(sales.body.action || "");
  const result = action === "submit"
    ? await submitChangeOrder(sales, id)
    : action === "approve" || action === "reject"
      ? { error: "not-answerable" as const }
      : { error: "action" as const };

  if (refused(result)) return result;
  return { ok: true, changeOrder: result.changeOrder, ...(result.approvalProblem ? { approvalProblem: result.approvalProblem } : {}) };
});
