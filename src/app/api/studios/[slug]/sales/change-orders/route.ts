import { route, refused } from "@/platform/http/route";
import { salesContext } from "@/modules/sales/sales";
import {
  listChangeOrders, createChangeOrder, updateChangeOrder,
  submitChangeOrder, answerChangeOrder,
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

// SUBMIT AND ANSWER ARE THEIR OWN VERBS, not a status field on PUT.
//
// A variation moving from draft to submitted to approved is a TRANSITION, and
// invariant 7 lives on the transition rather than in the permission model:
// holding both rights is legitimate, using both on one change order is not. A
// generic PUT accepting an approved status would route an approval through the
// edit path, where the submitter check is not — and the person who raised a
// variation could approve their own.
export const PATCH = route(spec, async (sales) => {
  const id = String(sales.body.id || "");
  if (!id) return { error: "missing" };

  const action = String(sales.body.action || "");
  const result = action === "submit"
    ? await submitChangeOrder(sales, id)
    : action === "approve" || action === "reject"
      ? await answerChangeOrder(sales, id, sales.body)
      : { error: "action" };

  if (refused(result)) return result;
  return { ok: true, changeOrder: result.changeOrder };
});
