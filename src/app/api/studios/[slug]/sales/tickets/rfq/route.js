import { currentUser } from "@/lib/identity";
import { salesContext, requestTicketRfq } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hand a ticket to Technical. The Technical screen offers the same action at
// /technical/rfqs; this endpoint exists so Sales can raise one from the ticket
// row without needing to see the Technical section at all — the permission that
// matters is Sales:manage either way.
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
  const result = await requestTicketRfq(sales, body);
  if (result.error) {
    const status = result.error === "already" ? 409
      : result.error === "ticket" || result.error === "no-technical" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, rfq: result.rfq }, { status: 201 });
}
