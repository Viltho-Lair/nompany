import { route, refused } from "@/platform/http/route";
import { salesContext } from "@/modules/sales/sales";
import { listPipeline } from "@/modules/sales/pipelineBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: salesContext, body: false, name: "crm-sales-pipeline" };

// GET AND NOTHING ELSE, deliberately.
//
// A board that moves a deal is editing the ticket that deal IS, so the move
// goes to PUT /sales/tickets — the route that already validates a ticket, the
// service that already owns the transition, and `crmSales.tickets.edit`, the
// right that already says who may change one. A write endpoint here would be a
// second door onto the same record, and the two would be free to disagree about
// what a stage move is allowed to do; the first thing to go would be the
// refusal that a closed deal cannot be reopened.
export const GET = route(spec, async (sales) => {
  const result = await listPipeline(sales);
  if (refused(result)) return result;
  // NO `canMove` ANY MORE: the board moves nothing (10/09/2026). A deal changes
  // stage where its ticket is edited, and that route asks for the right itself.
  return { ok: true, ...result };
});
