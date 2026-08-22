import { route } from "@/platform/http/route";
import { salesContext, requestTicketRfq } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hand a ticket to Technical. The Technical screen offers the same action at
// /technical/rfqs; this endpoint exists so Sales can raise one from the ticket
// row without needing to see the Technical section at all — the permission that
// matters is Sales:manage either way.
export const POST = route(
  { auth: "studio", context: salesContext, body: true, name: "sales/tickets/rfq" },
  async (sales) => {
    if (!sales.canManage) return { error: "read-only" };

    const result = await requestTicketRfq(sales, sales.body);
    if (result.error) return result;
    return { status: 201, body: { ok: true, rfq: result.rfq } };
  },
);
