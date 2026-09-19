import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { returnsView, findSale, requestReturn } from "@/modules/sales/posReturns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RETURNS (18/09/2026). GET lists them, or finds the sale a scanned receipt
// number names (`?number=`); POST asks for one, which asks for its approval.
// THE ANSWER IS GIVEN ON THE APPROVALS PAGE (19/09/2026), so there is no PATCH:
// approving and turning down a return are the approvals route's, and what they
// do to the return is modules/approvals/effects'. Units already returned and
// more money back than was paid are the world disagreeing: 409.
const spec = {
  auth: "studio", context: posContext, body: true, name: "pos-returns",
  status: { "too-many": 409, inactive: 409, "over-paid": 409 },
};

export const GET = route({ ...spec, body: false }, async (pos) => {
  const number = new URL(pos.request.url).searchParams.get("number");
  const result = number !== null ? await findSale(pos, number) : await returnsView(pos);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (pos) => {
  const result = await requestReturn(pos, pos.body);
  if (refused(result)) return result;
  // A return under every threshold went straight through; one whose approval
  // could not be asked says why, and is on file waiting.
  return { status: 201, body: { ok: true, ...result } };
});
