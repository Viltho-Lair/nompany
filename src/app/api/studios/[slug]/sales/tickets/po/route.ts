import { route, refused } from "@/platform/http/route";
import { salesContext, submitTicketPo } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send the client's purchase order for approval. Sales decides the PO has
// arrived and is worth booking, so the permission that matters is Sales:manage —
// the same one behind Request RFQ and Send for Approval. What it files is a
// Client PO approval; approving it issues the project number. submitTicketPo
// guards itself before it writes.
export const POST = route(
  { auth: "studio", context: salesContext, body: true, name: "crm-sales-tickets/po" },
  async (sales) => {
    if (!sales.canManage) return { error: "read-only" };

    const result = await submitTicketPo(sales, sales.body);
    if (refused(result)) return result;
    return { status: 201, body: { ok: true, approval: result.approval } };
  },
);
