import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { tenderingContext } from "@/modules/tendering/tenders";
import { listRates, createRate, editRate, removeRate } from "@/modules/tendering/rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: tenderingContext, body: true, name: "tendering-rates" };

// PERMISSION IS ENFORCED IN THE SERVICE. This layer decides HTTP shape only.
export const GET = route({ ...spec, body: false }, async (tendering) => {
  const result = await listRates(tendering);
  if (refused(result)) return result;
  return {
    ok: true,
    rates: result.rates,
    canCreate: !requirePermission(tendering.access, "tendering.rates.create"),
    canEdit: !requirePermission(tendering.access, "tendering.rates.edit"),
    canDelete: !requirePermission(tendering.access, "tendering.rates.delete"),
  };
});

export const POST = route(spec, async (tendering) => {
  const result = await createRate(tendering, tendering.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, rate: result.rate } };
});

export const PUT = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await editRate(tendering, String(tendering.body.id), tendering.body);
  if (refused(result)) return result;
  return { ok: true, rate: result.rate };
});

// DELETING A LIBRARY ROW BREAKS NO BILL. Every bill that used it copied the
// number rather than pointing at it, so old lines keep reading and totalling
// correctly — see the note on removeRate.
export const DELETE = route(spec, async (tendering) => {
  if (!tendering.body.id) return { error: "missing" };
  const result = await removeRate(tendering, String(tendering.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
