// THE CALENDAR'S CREDENTIAL — the second leg, where pgGatewayAuth.ts mints an
// ID token for Cloud Run this mints an ACCESS token for the Calendar API.
//
// Structurally the twin of getGatewayIdToken: the same shared first leg, its
// own module-scope cache, its own in-flight guard, the same two-minute skew.
// One difference matters and is why this is not a parameter on that function:
// generateIdToken returns a JWT whose `exp` states its life, while
// generateAccessToken returns an OPAQUE token plus an `expireTime` string.
// There is nothing to decode, so the expiry is parsed from that field — and a
// response without one is refused rather than assumed to be an hour.
//
// NO CREDENTIAL IS STORED BY THIS APPLICATION. The calendar is read as
// pg-gateway@, which the operator shares the calendar with; there is no OAuth
// consent screen, no refresh token and no secret. See the spec's §3 for why
// OAuth was rejected.
import {
  readFederationConfig, readSubjectToken, lastSubjectTokenFailure, assertVercelTokenMatchesPool,
  exchangeForFederatedToken, postJson, isFresh, GOOGLE_FEDERATION_DEFAULTS,
  type FederationConfig, type FetchLike, type MintDeps,
} from "./googleFederation";

const WHO = "google-calendar auth";

/** READ-ONLY, DELIBERATELY. Writing events is a different scope and a re-share. */
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/**
 * WHICH IDENTITY READS THE CALENDAR. Defaults to the gateway's service account
 * because roles/iam.serviceAccountTokenCreator is already bound on it — that
 * binding is what makes the gateway work today, and it covers generateAccessToken
 * unchanged. Reusing it costs no new IAM and no new service account.
 */
export function calendarServiceAccount(env: NodeJS.ProcessEnv = process.env): string {
  return env.GOOGLE_CALENDAR_SERVICE_ACCOUNT || GOOGLE_FEDERATION_DEFAULTS.serviceAccount;
}

/** RFC-3339 → epoch ms. Throws rather than defaulting; see this module's header. */
export function expiryFromExpireTime(expireTime: unknown): number {
  if (typeof expireTime !== "string" || expireTime === "") {
    throw new Error(`${WHO}: Google IAM Credentials returned no expireTime, so there is no honest expiry to cache`);
  }
  const ms = Date.parse(expireTime);
  if (!Number.isFinite(ms)) {
    throw new Error(`${WHO}: Google IAM Credentials returned an unparseable expireTime "${expireTime}"`);
  }
  return ms;
}

export async function generateAccessToken(
  cfg: FederationConfig, federatedAccessToken: string, serviceAccount: string, fetchImpl: FetchLike,
): Promise<{ token: string; expiresAtMs: number }> {
  const out = await postJson(
    fetchImpl,
    `${cfg.iamCredentialsUrl}/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateAccessToken`,
    { scope: [CALENDAR_SCOPE] },
    { authorization: `Bearer ${federatedAccessToken}` },
    cfg.timeoutMs,
    "Google IAM Credentials",
    WHO,
  );
  const token = out.accessToken;
  if (typeof token !== "string" || token === "") {
    throw new Error(`${WHO}: Google IAM Credentials returned no accessToken`);
  }
  return { token, expiresAtMs: expiryFromExpireTime(out.expireTime) };
}

/** One full chain, uncached — exported so a test can drive it with a fake fetch. */
export async function mintCalendarAccessToken(deps: MintDeps = {}): Promise<{ token: string; expiresAtMs: number }> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const cfg = readFederationConfig(env, WHO);

  const subjectToken = await readSubjectToken(env);
  if (!subjectToken) {
    // ABSENT IS A FAILURE, NOT A FALLBACK — the same rule the gateway states.
    // There is no unauthenticated way to read a private calendar, so there is
    // nothing to fall back to.
    throw new Error(
      `${WHO}: VERCEL_OIDC_TOKEN is not set, so there is no identity to exchange. On Vercel the token is ` +
        "delivered PER REQUEST, on the `x-vercel-oidc-token` header; the environment variable of the same " +
        "name exists only during the build and in a local `vercel env pull`." +
        (lastSubjectTokenFailure() ? ` Sources tried — ${lastSubjectTokenFailure()}.` : ""),
    );
  }

  assertVercelTokenMatchesPool(subjectToken, cfg, WHO);
  const federated = await exchangeForFederatedToken(cfg, subjectToken, fetchImpl, WHO);
  return generateAccessToken(cfg, federated, calendarServiceAccount(env), fetchImpl);
}

// ---- the cache -------------------------------------------------------------
// WITHOUT THIS, EVERY CALENDAR READ COSTS TWO EXTRA ROUND TRIPS to a different
// continent. Module scope on purpose: a serverless instance serves many
// invocations and the cache is worth having precisely because it survives
// between them. It holds no tenant data — the token names this deployment.
type Cached = { token: string; expiresAtMs: number };
let cached: Cached | null = null;
let inFlight: Promise<string> | null = null;

export async function getCalendarAccessToken(deps: MintDeps = {}): Promise<string> {
  const now = deps.now ?? Date.now;
  const skewMs = readFederationConfig(deps.env ?? process.env, WHO).refreshSkewMs;
  if (isFresh(cached, now(), skewMs)) return (cached as Cached).token;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const minted = await mintCalendarAccessToken(deps);
    cached = minted;
    return minted.token;
  })();
  try {
    return await inFlight;
  } finally {
    // Cleared on both paths: on success the cache answers, and on failure the
    // next caller must retry rather than await an already-rejected promise.
    inFlight = null;
  }
}

/** Test-only. The cache is module state, and a test that mints twice needs it empty. */
export function _resetCalendarTokenCacheForTests(): void {
  cached = null;
  inFlight = null;
}
