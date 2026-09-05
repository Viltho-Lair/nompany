import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { tenderingContext } from "@/modules/tendering/tenders";
import { listBoq, addBoqLine, editBoqLine, removeBoqLine } from "@/modules/tendering/boqItems";
import { listRates } from "@/modules/tendering/rates";
import { bidReview } from "@/modules/tendering/bid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `name` IS THE SECTION KEY THE AUDIT TRAIL READS BY, and a bill lives in the
// register's section because it lives with the tender it prices — there is no
// crm-sales-contracts-style destination here to name instead.
const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-register" };

export const GET = route({ ...spec, body: false }, async (tendering) => {
  const tenderId = new URL(tendering.request.url).searchParams.get("tenderId") || "";
  const result = await listBoq(tendering, tenderId);
  if (refused(result)) return result;

  // THE LIBRARY TRAVELS WITH THE BILL, and only for somebody who may read it.
  // An estimator prices a line by picking a rate, so shipping the two together
  // saves a round trip on the one screen that needs both — but a person who may
  // price a bid and may not see the rate library gets the bill and no picker,
  // rather than the library arriving because it was convenient.
  const rates = await listRates(tendering);
  // THE BID REVIEW RIDES ALONG WITH THE BILL, and costs no second collection
  // read: `bidReview` is handed the lines this route already fetched. It is
  // here rather than on the register because the thing being signed IS the
  // bill — a reviewer needs the price in front of them, not a row in a list.
  const review = await bidReview(tendering, result.tender, result.lines);
  return {
    ok: true,
    tender: result.tender,
    lines: result.lines,
    totals: result.totals,
    rates: refused(rates) ? [] : rates.rates,
    review,
    canEdit: !requirePermission(tendering.access, "tendering.tenders.edit"),
  };
});

export const POST = route(spec, async (tendering) => {
  const result = await addBoqLine(tendering, tendering.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, item: result.item } };
});

export const PUT = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await editBoqLine(tendering, String(tendering.body.id), tendering.body);
  if (refused(result)) return result;
  return { ok: true, item: result.item };
});

export const DELETE = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await removeBoqLine(tendering, String(tendering.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
