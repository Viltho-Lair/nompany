import { route } from "@/lib/route";
import { salesContext, createTicket, editTicket } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: salesContext, body: true, name: "sales/tickets" };
const manageable = (sales) => (sales.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;

  const result = await createTicket(sales, sales.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, ticket: result.ticket } };
});

export const PUT = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;
  if (!sales.body.id) return { error: "missing" };

  const result = await editTicket(sales, sales.body.id, sales.body);
  if (result.error) return result;
  return { ok: true, ticket: result.ticket };
});

// NO DELETE. A ticket is a record of something that happened — it is closed,
// not erased — and the quotations, RFQs and comments hanging off it would be
// orphaned by removing it. Withdrawing the endpoint is the enforcement; hiding
// the button alone would not be.
