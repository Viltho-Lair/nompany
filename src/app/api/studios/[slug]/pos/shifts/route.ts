import { route, refused } from "@/platform/http/route";
import { posContext, openShift, closeShift, shiftDetail, shiftsList } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A SHIFT: opened on a till with its float, read with its sales and its report
// (`?id=`), and closed with the counted cash. Closing is its own right
// (`crmSales.pos.closeShift`), asked by the service — selling does not imply it.
// A till that already has an open shift, and a shift already closed, are the
// record having moved on: 409.
const spec = {
  auth: "studio", context: posContext, body: true, name: "crm-sales-pos",
  status: { "shift-open": 409, closed: 409, inactive: 409 },
};

export const GET = route({ ...spec, body: false }, async (pos) => {
  const url = new URL(pos.request.url);
  const id = url.searchParams.get("id") || "";
  // NO ID IS THE SHIFT HISTORY: every drawer, filtered by period and till.
  if (!id) {
    const list = await shiftsList(pos, url.searchParams);
    if (refused(list)) return list;
    return { ok: true, ...list };
  }
  const result = await shiftDetail(pos, id);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (pos) => {
  const result = await openShift(pos, pos.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, shift: result.shift } };
});

export const PUT = route(spec, async (pos) => {
  if (!pos.body.id) return { error: "missing" };
  const result = await closeShift(pos, String(pos.body.id), pos.body);
  if (refused(result)) return result;
  // WHETHER THE DAY REACHED THE BOOKS, said out loud. The close succeeded
  // either way — a chart missing an account must not stop a drawer being
  // counted — so the only way anybody learns the entry did not post is if this
  // travels with the answer. A silent log is how "the books are complete"
  // becomes untrue quietly.
  return { ok: true, shift: result.shift, report: result.report, ledger: result.ledger };
});
