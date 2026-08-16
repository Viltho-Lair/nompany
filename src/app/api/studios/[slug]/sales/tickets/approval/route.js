import { currentUser } from "@/lib/identity";
import { salesContext, sendTicketForApproval } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send a ticket's finished quotation up for approval. The permission that
// matters is Sales:manage — deciding a quotation is ready to go up is a Sales
// act on a Sales record — and what it writes is an ordinary approval task, so
// whoever holds Sales and Management in Task settings receives it on the board
// they already use. sendTicketForApproval guards itself before it writes.
export async function POST(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return Response.json({ error: sales.error }, { status });
  }
  if (!sales.canManage) return Response.json({ error: "read-only" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const result = await sendTicketForApproval(sales, body);
  if (result.error) {
    const status = result.error === "already" ? 409
      : result.error === "forbidden" ? 403
      : result.error === "unknown-permission" ? 500
      : result.error === "ticket" || result.error === "no-tasks" || result.error === "no-technical" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, task: result.task, unrouted: result.unrouted }, { status: 201 });
}
