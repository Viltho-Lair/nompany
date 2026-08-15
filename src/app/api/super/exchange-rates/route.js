import { currentSuperAdmin } from "@/lib/superAuth";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Today's FX snapshot for the /super dashboard.
//
// The WHOLE USD table goes over the wire (~160 numbers, a few KB) rather than a
// single pair, because the dashboard lets you re-pick the base and four targets
// freely: shipping the table once means every one of those changes is arithmetic
// in the browser instead of another round trip — and never another API call.
export async function GET() {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  const snap = await getExchangeSnapshot();
  if (!snap.rates) {
    return Response.json({ error: snap.error || "unavailable" }, { status: 503 });
  }
  return Response.json({
    base: snap.base,
    rates: snap.rates,
    updatedAt: snap.updatedAt,
    nextUpdateAt: snap.nextUpdateAt,
    stale: Boolean(snap.stale),
  });
}
