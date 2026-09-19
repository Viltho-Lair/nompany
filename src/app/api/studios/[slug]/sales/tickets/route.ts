import { route, refused } from "@/platform/http/route";
import { salesContext, createTicket, editTicket, assignTicket } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: salesContext, body: true, name: "crm-sales-tickets" };
const manageable = (sales: { canManage: boolean }) => (sales.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;

  const result = await createTicket(sales, sales.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ticket: result.ticket } };
});

export const PUT = route(spec, async (sales) => {
  if (!sales.body.id) return { error: "missing" };
  // ASSIGNING IS ITS OWN ACT, on its own right (modules/sales/leads) — never a
  // field an edit carries, and not gated on editing tickets: a manager who
  // hands leads out need not be the one who works them.
  if (sales.body.action === "assign") {
    const assigned = await assignTicket(sales, String(sales.body.id), String(sales.body.to || ""));
    if (refused(assigned)) return assigned;
    return { ok: true, ticket: assigned.ticket };
  }
  const refusal = manageable(sales);
  if (refusal) return refusal;

  const result = await editTicket(sales, sales.body.id, sales.body);
  if (refused(result)) return result;
  return { ok: true, ticket: result.ticket };
});

// NO DELETE. A ticket is a record of something that happened — it is closed,
// not erased — and the quotations, RFQs and comments hanging off it would be
// orphaned by removing it. Withdrawing the endpoint is the enforcement; hiding
// the button alone would not be.
