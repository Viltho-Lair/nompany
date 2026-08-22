import { route } from "@/platform/http/route";
import { salesContext, sendTicketForApproval } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send a ticket's finished quotation up for approval. The permission that
// matters is Sales:manage — deciding a quotation is ready to go up is a Sales
// act on a Sales record — and what it writes is an ordinary approval task, so
// whoever holds Sales and Management in Task settings receives it on the board
// they already use. sendTicketForApproval guards itself before it writes.
export const POST = route(
  { auth: "studio", context: salesContext, body: true, name: "sales/tickets/approval" },
  async (sales) => {
    if (!sales.canManage) return { error: "read-only" };

    const result = await sendTicketForApproval(sales, sales.body);
    if (result.error) return result;
    return { status: 201, body: { ok: true, task: result.task, unrouted: result.unrouted } };
  },
);
