// Daily foreign-exchange snapshot, from ExchangeRate-API.
//
// THE ONE-CALL-A-DAY RULE
// The API quotes every currency against a single base per request, and the free
// plan republishes once a day at 00:00 UTC. So we fetch exactly ONE table —
// USD as base — and derive every other pair by division:
//
//     rate(A → B) = usd[B] / usd[A]
//
// which is why picking SAR as your base costs nothing extra: 1 EUR in SAR is
// just usd.SAR / usd.EUR. Every pair the UI can show comes out of the same
// snapshot, so the number of API calls is independent of how many currencies
// anyone looks at.
//
// WHEN IT REFETCHES
// Not on a clock of our own — the payload carries `time_next_update_unix`, the
// API's own statement of when the next batch lands, and that is the authority.
// A page load before then is served from Redis without touching the network; the
// first load after then refetches. An NX lock makes that first-wins, so a burst
// of loads at midnight still spends one call, and a failed fetch backs off for
// FAIL_BACKOFF_SEC instead of retrying into the monthly quota.
//
// The snapshot is written WITHOUT a TTL on purpose: if the API is down or the
// key is revoked, yesterday's rates with an honest "as of" stamp beat an empty
// box. Callers get `stale: true` and can say so.

import { FX } from "@/platform/db/keys";
import { getJSON, setJSON, claim, release } from "@/platform/db/store";
import { log } from "@/platform/http/observability";

const BASE = "USD";
const ENDPOINT = (key: string) => `https://v6.exchangerate-api.com/v6/${key}/latest/${BASE}`;

// How long a failed attempt blocks the next one. Long enough that a revoked key
// or an exhausted quota cannot burn the month in retries, short enough that a
// transient outage self-heals within the day.
const FAIL_BACKOFF_SEC = 15 * 60;
// Ceiling on a successful attempt's lock, in case the process dies mid-fetch.
const FETCH_LOCK_SEC = 60;

const now = () => Math.floor(Date.now() / 1000);

// WHAT ONE DAY'S TABLE LOOKS LIKE: every pair against USD, plus the API's own
// next-update stamp so freshness is the provider's answer rather than ours.
// EVERY FIELD fetchSnapshot WRITES, not the three isFresh happens to read.
// `updatedAt` is the provider's own "last updated" stamp and is what both the
// console and a studio's settings screen show; leaving it out of this type made
// each of them read `undefined` where the stored snapshot has a number.
type Snapshot = {
  base?: string;
  /** null when there has never been a table to serve — see getExchangeSnapshot. */
  rates?: Record<string, number> | null;
  /** The provider's stamp for the table, not ours for the fetch. */
  updatedAt?: number;
  nextUpdateAt?: number;
  fetchedAt?: number;
};

// A snapshot is fresh until the API says the next batch has landed.
const isFresh = (snap: Snapshot | null | undefined) =>
  Boolean(snap?.rates) && now() < Number(snap?.nextUpdateAt || 0);

async function fetchSnapshot() {
  const key = process.env.EXCHANGERATE_API_KEY;
  if (!key) throw new Error("EXCHANGERATE_API_KEY is not set");

  const res = await fetch(ENDPOINT(key), { cache: "no-store" });
  const body = await res.json().catch(() => null);

  // The API reports its own failures in the body with HTTP 200s in some cases,
  // so trust `result` over the status code.
  if (!res.ok || body?.result !== "success") {
    throw new Error(`exchangerate-api: ${body?.["error-type"] || `http-${res.status}`}`);
  }
  const rates = body.conversion_rates;
  if (!rates || typeof rates !== "object" || !rates[BASE]) {
    throw new Error("exchangerate-api: malformed conversion_rates");
  }

  return {
    base: body.base_code || BASE,
    rates,
    updatedAt: Number(body.time_last_update_unix) || now(),
    nextUpdateAt: Number(body.time_next_update_unix) || now() + 24 * 3600,
    fetchedAt: now(),
  };
}

// The snapshot every caller should use. Never throws: if the refetch fails and
// something is cached, the cache is returned marked stale; only a first-ever
// fetch failure with nothing cached surfaces an error.
/**
 * WHAT A CALLER GETS BACK: the table, however it was come by, plus whether it
 * is stale and — only when there has never been one — why there is none.
 *
 * Declared rather than inferred: the four return paths produce four differently
 * shaped literals, and a caller reading `updatedAt` off the union got "does not
 * exist" from the one arm that has never had a snapshot to carry it.
 */
export type ExchangeSnapshot = Snapshot & {
  stale: boolean;
  error?: string;
};

export async function getExchangeSnapshot(): Promise<ExchangeSnapshot> {
  const cached = await getJSON<Snapshot>(FX.snapshot);
  if (isFresh(cached)) return { ...cached, stale: false };

  // Someone else is already refetching (or a recent attempt failed and is still
  // backing off) — serve what we have rather than queueing behind them.
  const mine = await claim(FX.lock, String(now()), FAIL_BACKOFF_SEC);
  if (!mine) {
    return cached
      ? { ...cached, stale: true }
      : { base: BASE, rates: null, stale: true, error: "unavailable" };
  }

  try {
    const snap = await fetchSnapshot();
    await setJSON(FX.snapshot, snap);
    await release(FX.lock); // success frees the lock; failure leaves it to back off
    return { ...snap, stale: false };
  } catch (err) {
    log.error("Exchange rate refresh failed:", { error: (err as Error).message });
    // Shorten nothing — the lock's remaining FAIL_BACKOFF_SEC is the backoff.
    return cached
      ? { ...cached, stale: true, error: (err as Error).message }
      : { base: BASE, rates: null, stale: true, error: (err as Error).message };
  }
}

// Deriving a pair from the snapshot (`crossRate`), listing what it quotes
// (`quotedCodes`) and formatting a rate are pure arithmetic over the table, so
// they live in src/lib/currencies.js — the browser needs them too, and must not
// import this module to get them.
