import { currentUser } from "@/lib/identity";
import { salesContext, createTicket, editTicket } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(paramsPromise) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: sales.error }, { status }) };
  }
  if (!sales.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return sales;
}
const body = async (request) => { try { return await request.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const result = await createTicket(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, ticket: result.ticket }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await editTicket(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, ticket: result.ticket });
}

// NO DELETE. A ticket is a record of something that happened — it is closed,
// not erased — and the quotations, RFQs and comments hanging off it would be
// orphaned by removing it. Withdrawing the endpoint is the enforcement; hiding
// the button alone would not be.
