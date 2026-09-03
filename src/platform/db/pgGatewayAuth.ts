// HOW VERCEL PROVES WHO IT IS TO THE GATEWAY, WITHOUT A KEY EXISTING ANYWHERE.
//
//   a FEDERATED ACCESS TOKEN   (leg one, in platform/auth/googleFederation.ts:
//        │                      VERCEL_OIDC_TOKEN exchanged at Google's STS)
//        │
//        ├─ POST iamcredentials.googleapis.com/…:generateIdToken
//        │     Authorization: Bearer <federated access token>
//        │     audience     = the Cloud Run service URL
//        │  -> a GOOGLE-SIGNED ID TOKEN naming that audience
//        │
//        └─ Authorization: Bearer <id token>  ->  Cloud Run's IAM check
//
// THE FIRST LEG MOVED TO platform/auth/googleFederation.ts when the /super
// calendar became its second consumer — it needs the same Vercel→STS exchange
// with a different second leg. This file is the Cloud Run half: what the
// federated token is spent on, and the cache that holds the result.
//
// THIS MODULE MUST NEVER FALL BACK TO AN UNAUTHENTICATED CALL. A gateway that
// executes SQL text is, unauthenticated, a remote SQL execution endpoint
// against every tenant's data at once. So every failure here throws: a missing
// OIDC token, a token whose claims do not match the pool this code expects, an
// STS refusal, an IAM refusal. There is deliberately no "if we could not get a
// token, send the request anyway" branch, and adding one would be the single
// worst change available to this design.
import {
  GOOGLE_FEDERATION_DEFAULTS, readFederationConfig, jwtExpiryMs,
  isFresh, postJson, readSubjectToken, lastSubjectTokenFailure, assertVercelTokenMatchesPool,
  exchangeForFederatedToken, type FederationConfig, type FetchLike, type MintDeps,
} from "../auth/googleFederation";

/** The gateway's own name in every error it raises. */
const WHO = "pg-gateway auth";

export const PG_GATEWAY_DEFAULTS = { ...GOOGLE_FEDERATION_DEFAULTS } as const;
export type GatewayAuthConfig = FederationConfig & { idTokenAudience: string };
export type { FetchLike, MintDeps };

/**
 * Pure — takes an environment, returns the addresses. Separated from the
 * network calls so the whole configuration surface is assertable with no
 * Google in the room, which is the only kind of test this file can have from
 * here (there is no workload identity pool yet).
 */
export function readGatewayAuthConfig(env: NodeJS.ProcessEnv): GatewayAuthConfig {
  const url = env.PG_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "pg-gateway auth: PG_GATEWAY_URL is not set. It is both where the gateway lives and what the " +
        "minted ID token is addressed to — Cloud Run rejects a token whose audience is not its own URL.",
    );
  }
  return {
    ...readFederationConfig(env),
    // TRAILING SLASH STRIPPED. Cloud Run compares the token's `aud` to the
    // service URL as a string, and "https://x.run.app/" is not "https://x.run.app".
    // A copied-from-the-console URL routinely carries one.
    idTokenAudience: (env.PG_GATEWAY_AUDIENCE || url).replace(/\/+$/, ""),
  };
}

/** Leg two — the federated principal impersonates the service account and gets an ID token. */
export async function generateIdToken(
  cfg: GatewayAuthConfig,
  federatedAccessToken: string,
  fetchImpl: FetchLike,
): Promise<string> {
  const out = await postJson(
    fetchImpl,
    `${cfg.iamCredentialsUrl}/v1/projects/-/serviceAccounts/${encodeURIComponent(cfg.serviceAccount)}:generateIdToken`,
    // `includeEmail` so Cloud Run's logs name the caller rather than a numeric
    // subject. It costs nothing and is the difference between a readable audit
    // trail and a set of opaque ids.
    { audience: cfg.idTokenAudience, includeEmail: true },
    { authorization: `Bearer ${federatedAccessToken}` },
    cfg.timeoutMs,
    "Google IAM Credentials",
    WHO,
  );
  const token = out.token;
  if (typeof token !== "string" || token === "") {
    throw new Error("pg-gateway auth: Google IAM Credentials returned no token");
  }
  return token;
}

// ---- the cache -------------------------------------------------------------
//
// WITHOUT THIS, EVERY SINGLE SQL STATEMENT COSTS TWO EXTRA NETWORK ROUND TRIPS.
// The whole point of the gateway is that a statement is one HTTPS call; minting
// a fresh ID token per statement would make it three, and two of them would be
// to a different continent. So the token is held for its life minus a skew and
// reused across every request this instance serves.
//
// MODULE SCOPE, DELIBERATELY, and it is the same scope `pool` in pg.ts lives in:
// a serverless instance serves many invocations, and the cache is worth having
// exactly because it survives between them. It holds no tenant data — an ID
// token names this deployment, not a user — so there is nothing here that could
// leak across tenants the way a cached row would.
//
// EACH CONSUMER OWNS ITS OWN CACHE. This one holds an ID token audienced to the
// Cloud Run URL; the calendar's holds an access token scoped to a Google API.
// They are not interchangeable, so the cache stayed here rather than moving
// with the federation half.

type CachedToken = { token: string; expiresAtMs: number };
let cached: CachedToken | null = null;
// A SECOND CONCURRENT REQUEST MUST NOT MINT A SECOND TOKEN. Without this,
// a cold instance handling five parallel queries does five STS exchanges and
// five impersonations, and four of them are thrown away. The promise is shared;
// the first failure clears it so the next caller retries rather than being
// handed a permanently rejected promise.
let inFlight: Promise<string> | null = null;

/** One full chain, uncached — exported so a test can drive it with a fake fetch. */
export async function mintGatewayIdToken(deps: MintDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const cfg = readGatewayAuthConfig(env);

  // ALWAYS THROUGH readSubjectToken, and the env is its LAST source rather than
  // a branch around it.
  //
  // This read `deps.env ? deps.env.VERCEL_OIDC_TOKEN : await readSubjectToken()`
  // — "an explicit env wins, so a test is deterministic". It defeated the whole
  // fix: postTx calls getGatewayIdToken({ env }) with env defaulting to
  // process.env, so deps.env is ALWAYS set and the request-scoped reader was
  // never reached in production. The symptom was that two deploys of a fix
  // changed the error message and nothing else.
  //
  // Determinism is kept by passing the env INTO the reader as its final source:
  // a test that sets a token still finds it, one that clears it still gets this
  // module's error, and production reaches the request first.
  const subjectToken = await readSubjectToken(env);
  if (!subjectToken) {
    // ABSENT IS A FAILURE, NOT A FALLBACK. There is no unauthenticated path to
    // fall back to — see this module's header for why that is the one branch
    // that must never exist.
    throw new Error(
      "pg-gateway auth: VERCEL_OIDC_TOKEN is not set, so there is no identity to exchange. On Vercel the " +
        "token is delivered PER REQUEST, on the `x-vercel-oidc-token` header; the environment variable of " +
        "the same name exists only during the build and in a local `vercel env pull`. Check that OIDC " +
        "federation is enabled for the project, and that this call is inside a request — a module-scope " +
        "or background call has no request to read it from. Elsewhere there is no identity at all and " +
        "PG_TRANSPORT must stay `direct`." +
        // EVERY SOURCE, AND WHY EACH ONE FAILED. Without this the message names
        // three possible causes and says nothing about which one actually
        // happened — and each guess costs a full production deploy to test.
        (lastSubjectTokenFailure() ? ` Sources tried — ${lastSubjectTokenFailure()}.` : ""),
    );
  }

  assertVercelTokenMatchesPool(subjectToken, cfg, WHO);
  const federated = await exchangeForFederatedToken(cfg, subjectToken, fetchImpl, WHO);
  return generateIdToken(cfg, federated, fetchImpl);
}

/**
 * The one door the transport uses. Returns a cached token while it is fresh,
 * mints one otherwise, and never returns without one.
 */
export async function getGatewayIdToken(deps: MintDeps = {}): Promise<string> {
  const now = deps.now ?? Date.now;
  const skewMs = readGatewayAuthConfig(deps.env ?? process.env).refreshSkewMs;
  if (isFresh(cached, now(), skewMs)) return (cached as CachedToken).token;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const token = await mintGatewayIdToken(deps);
    // EXPIRY COMES FROM THE TOKEN, NOT FROM A GUESS. generateIdToken's response
    // carries no expires_in at all — the only statement of when this token
    // stops working is its own `exp` claim, so that is what is read.
    cached = { token, expiresAtMs: jwtExpiryMs(token) };
    return token;
  })();

  try {
    return await inFlight;
  } finally {
    // Cleared on both paths: on success the cache now answers, and on failure
    // the next caller must be free to try again rather than await a promise
    // that has already rejected.
    inFlight = null;
  }
}

/** Test-only. The cache is module state, and a test that mints twice needs it empty. */
export function _resetGatewayTokenCacheForTests(): void {
  cached = null;
  inFlight = null;
}
