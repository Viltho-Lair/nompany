import { route, refused } from "@/platform/http/route";
import { posContext, createSale, listReceipts, receiptDetail } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A SALE, and a shift's receipts (`?shiftId=`). A receipt is never edited or
// deleted here — what a customer was handed is a fact. Not enough stock, a
// closed shift, or a basket the payments do not cover are the world
// disagreeing with the sale rather than a malformed request: 409.
const spec = {
  auth: "studio", context: posContext, body: true, name: "crm-sales-pos",
  status: { insufficient: 409, closed: 409, underpaid: 409, "overpaid-card": 409, "no-clients": 409, "customers-unavailable": 409 },
};

export const GET = route({ ...spec, body: false }, async (pos) => {
  const url = new URL(pos.request.url);
  // ONE SALE, with its names — the receipt page and a reprint.
  const id = url.searchParams.get("id") || "";
  if (id) {
    const one = await receiptDetail(pos, id);
    if (refused(one)) return one;
    return { ok: true, ...one };
  }
  const shiftId = url.searchParams.get("shiftId") || "";
  if (!shiftId) return { error: "missing" };
  const result = await listReceipts(pos, shiftId);
  if (refused(result)) return result;
  return { ok: true, receipts: result.receipts };
});

export const POST = route(spec, async (pos) => {
  const result = await createSale(pos, pos.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, receipt: result.receipt } };
});
