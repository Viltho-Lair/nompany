import { route } from "@/platform/http/route";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Today's FX snapshot for the /super dashboard.
//
// The WHOLE USD table goes over the wire (~160 numbers, a few KB) rather than a
// single pair, because the dashboard lets you re-pick the base and four targets
// freely: shipping the table once means every one of those changes is arithmetic
// in the browser instead of another round trip — and never another API call.
export const GET = route({ auth: "super", name: "super/exchange-rates" }, async () => {
  const snap = await getExchangeSnapshot();

  // 503, NOT the table's default. An absent snapshot is not the caller having
  // asked wrongly — it is us not having the data, which is why this one status
  // is stated here rather than derived from an error name.
  if (!snap.rates) return { status: 503, body: { error: snap.error || "unavailable" } };

  return {
    base: snap.base,
    rates: snap.rates,
    updatedAt: snap.updatedAt,
    nextUpdateAt: snap.nextUpdateAt,
    stale: Boolean(snap.stale),
  };
});
