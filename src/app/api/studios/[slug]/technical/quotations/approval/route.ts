import { route, refused } from "@/platform/http/route";
import { technicalContext, sendQuotationForApproval } from "@/modules/technical/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send an INTERNAL quotation's finished document up for approval — the
// ticket-less twin of sales/tickets/approval/route.ts. Both raise into the
// SAME task type, so Sales and Management see one approval queue rather than
// two for what is, to them, the identical decision.
//
// A TECHNICAL act on a Technical record: the permission that matters is
// Technical:manage, not Sales:manage — sendQuotationForApproval guards the
// WRITE itself (technical.quotations.edit); this is the door onto it, same
// split as quotations/route.ts.
const spec = { auth: "studio", context: technicalContext, body: true, name: "technical/quotations/approval" };

const manageable = (tech: { canManage: boolean }) => (tech.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (ctx) => {
  const refusal = manageable(ctx);
  if (refusal) return refusal;

  const result = await sendQuotationForApproval(ctx, ctx.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, task: result.task, unrouted: result.unrouted } };
});
