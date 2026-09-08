import { route, refused } from "@/platform/http/route";
import {
  logisticsContext, listLandedCosts, landedCostFor, saveLandedCost, removeLandedCost,
} from "@/modules/logistics/landedCostService";
import type { LogisticsContext } from "@/modules/logistics/landedCostService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT A SHIPMENT COST TO LAND — freight, duty, insurance, handling.
//
// The charges arrive on somebody else's invoices and belong to the same goods.
// A studio that values stock at the order price alone understates what it
// holds; for an importing contractor that is routinely a fifth of the order.
const spec = { auth: "studio", context: logisticsContext, body: true, name: "logistics/landed-cost" };

// ONE ORDER WHEN ASKED FOR ONE, otherwise the list. The single-order answer
// carries the full distribution — lines, per-unit landed cost and anything that
// could not be allocated — because that is what a reconciliation screen needs
// and computing it twice from two endpoints would be two chances to disagree.
export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as LogisticsContext & { request: Request };
  const orderId = String(new URL(ctx.request.url).searchParams.get("order") || "").trim();

  const result = orderId ? await landedCostFor(ctx, orderId) : await listLandedCosts(ctx);
  if (refused(result)) return result;
  return result;
});

// PUT RATHER THAN POST, because there is one record per order and saving is
// REPLACING it. A landed cost is a reconciliation — "these are the invoices
// that belong to this shipment" — so a studio correcting the duty figure is
// restating the set rather than adding to it.
export const PUT = route(spec, async (c) => {
  const result = await saveLandedCost(c as LogisticsContext, c.body);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const orderId = String(c.body?.orderId ?? "").trim();
  if (!orderId) return { error: "missing" };
  const result = await removeLandedCost(c as LogisticsContext, orderId);
  if (refused(result)) return result;
  return result;
});
