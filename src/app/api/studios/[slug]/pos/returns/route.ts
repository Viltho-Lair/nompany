import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { returnsView, findSale, requestReturn, approveReturn, rejectReturn } from "@/modules/sales/posReturns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RETURNS (18/09/2026). GET lists them, or finds the sale a scanned receipt
// number names (`?number=`); POST asks for one; PATCH signs or turns one down.
// APPROVE AND REJECT ARE NAMED IN THE BODY rather than reached through a
// generic edit — the shape that once let a rejected change order approve
// itself is not repeated. Units already returned, a return already decided and
// a cash refund with no drawer open are the world disagreeing: 409.
const spec = {
  auth: "studio", context: posContext, body: true, name: "pos-returns",
  status: { "too-many": 409, "already-decided": 409, "no-shift": 409, inactive: 409, "same-signer": 403, "over-paid": 409, "over-credit": 409 },
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
  return { status: 201, body: { ok: true, return: result.return } };
});

export const PATCH = route(spec, async (pos) => {
  const id = String(pos.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const action = String(pos.body?.action ?? "");
  const result = action === "approve" ? await approveReturn(pos, id)
    : action === "reject" ? await rejectReturn(pos, id, pos.body?.reason)
      : { error: "action" as const };
  if (refused(result)) return result;
  return { ok: true, return: result.return };
});
