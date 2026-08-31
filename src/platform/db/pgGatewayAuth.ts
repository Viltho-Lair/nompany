// HOW VERCEL PROVES WHO IT IS TO THE GATEWAY, WITHOUT A KEY EXISTING ANYWHERE.
//
//   VERCEL_OIDC_TOKEN  (minted per deployment by Vercel, short-lived)
//        │
//        ├─ POST sts.googleapis.com/v1/token          token exchange, Workload
//        │     subject_token = the OIDC JWT           Identity Federation
//        │  -> a FEDERATED ACCESS TOKEN for the pool's principal
//        │
//        ├─ POST iamcredentials.googleapis.com/…:generateIdToken
//        │     Authorization: Bearer <federated access token>
//        │     audience     = the Cloud Run service URL
//        │  -> a GOOGLE-SIGNED ID TOKEN naming that audience
//        │
//        └─ Authorization: Bearer <id token>  ->  Cloud Run's IAM check
//
// NO SERVICE-ACCOUNT JSON KEY IS EVER CREATED, STORED IN VERCEL, OR ROTATED —
// design D3. That is the entire reason this file is three network calls rather
// than one `process.env.GOOGLE_APPLICATION_CREDENTIALS`. A long-lived private
// key sitting in an environment variable is a credential that grants SQL
// execution against every tenant at once and never expires; the chain above
// grants the same access for an hour, to a principal Google can revoke by
// editing one IAM binding.
//
// NOTHING HERE IS HARDCODED, AND THE DEFAULTS ARE STILL REAL. Every value below
// comes from the environment, with the values read from a live token and a live
// project on 01/09/2026 as its documented default — the issuer, the audience,
// the project number, the pool, the provider, the service account. Defaults
// that are real mean a correct deployment needs one variable (the gateway URL)
// rather than eight; reading them from the environment anyway means a second
// project, a renamed pool or a rotated service account is a variable change
// rather than a code change.
//
// THIS MODULE MUST NEVER FALL BACK TO AN UNAUTHENTICATED CALL. A gateway that
// executes SQL text is, unauthenticated, a remote SQL execution endpoint
// against every tenant's data at once. So every failure here throws: a missing
// OIDC token, a token whose claims do not match the pool this code expects, an
// STS refusal, an IAM refusal. There is deliberately no "if we could not get a
// token, send the request anyway" branch, and adding one would be the single
// worst change available to this design.

// THE REAL VALUES, AS DEFAULTS. Every one of these was READ rather than
// remembered on 01/09/2026: the issuer and audience off a live
// `VERCEL_OIDC_TOKEN`, the project number from
// `gcloud projects describe nompany-application`, and the pool, provider and
// service-account names from the setup runbook that creates them
// (docs/superpowers/plans/2026-09-01-pg-gateway-cloud-setup.md). They are
// defaults and not constants — every one is overridable above — but a default
// that is wrong is worse than no default, so they are stated once, here, with
// where they came from.
export const PG_GATEWAY_DEFAULTS = {
  oidcIssuer: "https://oidc.vercel.com/vilthos-projects",
  oidcAudience: "https://vercel.com/vilthos-projects",
  projectNumber: "17918747100",
  workloadIdentityPool: "vercel",
  workloadIdentityProvider: "vercel-oidc",
  serviceAccount: "pg-gateway@nompany-application.iam.gserviceaccount.com",
  stsUrl: "https://sts.googleapis.com/v1/token",
  iamCredentialsUrl: "https://iamcredentials.googleapis.com",
} as const;

export type GatewayAuthConfig = {
  /** The full STS audience: //iam.googleapis.com/projects/…/providers/… */
  stsAudience: string;
  /** The service account the federated principal impersonates. */
  serviceAccount: string;
  /** What the minted ID token must be addressed to — the Cloud Run URL. */
  idTokenAudience: string;
  /** What the Vercel OIDC token's own `iss` and `aud` must read, checked before STS is asked. */
  expectedIssuer: string;
  expectedAudience: string;
  stsUrl: string;
  iamCredentialsUrl: string;
  /** How long before `exp` a cached token stops being reused. */
  refreshSkewMs: number;
  /** Ceiling on either auth leg, so a hung STS cannot hold a serverless invocation open. */
  timeoutMs: number;
};

function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`pg-gateway auth: ${name} must be a positive integer`);
  return n;
}

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

  const projectNumber = env.GCP_PROJECT_NUMBER || PG_GATEWAY_DEFAULTS.projectNumber;
  const pool = env.GCP_WORKLOAD_IDENTITY_POOL || PG_GATEWAY_DEFAULTS.workloadIdentityPool;
  const provider = env.GCP_WORKLOAD_IDENTITY_PROVIDER || PG_GATEWAY_DEFAULTS.workloadIdentityProvider;

  return {
    // Google's own spelling of the provider resource, with the leading `//`.
    // Overridable whole in case a future pool is not in this shape, but built
    // from its three parts by default so a wrong pool name is a readable
    // mistake rather than a mistyped URL.
    stsAudience:
      env.GCP_WORKLOAD_IDENTITY_AUDIENCE ||
      `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    serviceAccount: env.PG_GATEWAY_SERVICE_ACCOUNT || PG_GATEWAY_DEFAULTS.serviceAccount,
    // TRAILING SLASH STRIPPED. Cloud Run compares the token's `aud` to the
    // service URL as a string, and "https://x.run.app/" is not "https://x.run.app".
    // A copied-from-the-console URL routinely carries one.
    idTokenAudience: (env.PG_GATEWAY_AUDIENCE || url).replace(/\/+$/, ""),
    expectedIssuer: env.VERCEL_OIDC_ISSUER || PG_GATEWAY_DEFAULTS.oidcIssuer,
    expectedAudience: env.VERCEL_OIDC_AUDIENCE || PG_GATEWAY_DEFAULTS.oidcAudience,
    stsUrl: env.GCP_STS_URL || PG_GATEWAY_DEFAULTS.stsUrl,
    iamCredentialsUrl: (env.GCP_IAM_CREDENTIALS_URL || PG_GATEWAY_DEFAULTS.iamCredentialsUrl).replace(/\/+$/, ""),
    // TWO MINUTES, NOT ZERO. A token that is still valid when this process
    // checks it can be expired by the time it reaches Google — clock skew plus
    // the flight time of the request it is attached to. The skew is what turns
    // "expired" from a real failure mode into an arithmetic one.
    refreshSkewMs: positiveInt(env.PG_GATEWAY_TOKEN_SKEW_MS, 120_000, "PG_GATEWAY_TOKEN_SKEW_MS"),
    timeoutMs: positiveInt(env.PG_GATEWAY_AUTH_TIMEOUT_MS, 10_000, "PG_GATEWAY_AUTH_TIMEOUT_MS"),
  };
}

// ---- reading a JWT without verifying it -----------------------------------
//
// UNVERIFIED ON PURPOSE, AND ONLY EVER USED FOR THINGS THAT ARE NOT SECURITY
// DECISIONS. Two callers: reading `exp` off the ID token Google just minted for
// us (to know when to mint another), and reading `iss`/`aud` off our own Vercel
// token to fail with a readable message instead of an opaque STS 400. Neither
// is a trust decision — the trust decisions are Google's STS validating the
// Vercel signature and Cloud Run validating Google's. Verifying a signature
// here would mean fetching and caching two JWKS sets to learn nothing this code
// is entitled to act on.

/** The payload of a JWT, or a thrown error naming which part could not be read. */
export function decodeJwtClaims(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error(`pg-gateway auth: expected a three-part JWT, got ${parts.length} part(s)`);
  }
  let json: string;
  try {
    json = Buffer.from(parts[1], "base64url").toString("utf8");
  } catch {
    throw new Error("pg-gateway auth: a JWT's payload is not valid base64url");
  }
  let claims: unknown;
  try {
    claims = JSON.parse(json);
  } catch {
    throw new Error("pg-gateway auth: a JWT's payload is not valid JSON");
  }
  if (typeof claims !== "object" || claims === null || Array.isArray(claims)) {
    throw new Error("pg-gateway auth: a JWT's payload is not a JSON object");
  }
  return claims as Record<string, unknown>;
}

/**
 * `exp`, in milliseconds. A token with no numeric `exp` is refused rather than
 * treated as never expiring — an ID token that is cached forever is one that
 * starts failing every request the moment it lapses, with nothing in the code
 * that would ever mint another.
 */
export function jwtExpiryMs(jwt: string): number {
  const exp = decodeJwtClaims(jwt).exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    throw new Error("pg-gateway auth: the minted ID token carries no numeric `exp` claim");
  }
  return exp * 1000;
}

/**
 * `aud` may be a string or an array of strings — the JWT spec allows both, and
 * Vercel emits the string form today. Normalised so the check below does not
 * depend on which.
 */
function audienceMatches(aud: unknown, expected: string): boolean {
  if (typeof aud === "string") return aud === expected;
  if (Array.isArray(aud)) return aud.some((a) => a === expected);
  return false;
}

/**
 * Refuses a Vercel token that does not belong to the pool this code is
 * configured for, BEFORE it is sent to STS.
 *
 * STS's own refusal for a wrong issuer is a 400 whose body says
 * `invalid_grant` and nothing about which claim was wrong. This turns the two
 * most likely misconfigurations — a different Vercel team, or an
 * `--allowed-audiences` that does not match the provider — into a message that
 * names the value it saw and the value it wanted. It is a diagnostic, not a
 * security boundary: STS re-checks both against the provider's own
 * configuration, which is where that decision actually lives.
 */
export function assertVercelTokenMatchesPool(token: string, cfg: GatewayAuthConfig): void {
  const claims = decodeJwtClaims(token);
  if (claims.iss !== cfg.expectedIssuer) {
    throw new Error(
      `pg-gateway auth: VERCEL_OIDC_TOKEN was issued by "${String(claims.iss)}" but the workload ` +
        `identity provider is configured for "${cfg.expectedIssuer}". STS would refuse this with an ` +
        "opaque invalid_grant; refused here instead so the mismatch is readable.",
    );
  }
  if (!audienceMatches(claims.aud, cfg.expectedAudience)) {
    throw new Error(
      `pg-gateway auth: VERCEL_OIDC_TOKEN is addressed to "${JSON.stringify(claims.aud)}" but the ` +
        `provider's allowed audience is "${cfg.expectedAudience}".`,
    );
  }
}

// ---- the two network legs --------------------------------------------------

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

async function postJson(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
  leg: string,
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      // A HUNG AUTH CALL IS A HELD SERVERLESS INVOCATION. The database path
      // below it already has a timeout; without one here the cheapest half of
      // the request is the half with no ceiling.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`pg-gateway auth: ${leg} did not answer — ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    // The body is Google's own error JSON and says which claim or binding was
    // wrong. Passed through, because the alternative is an afternoon.
    throw new Error(`pg-gateway auth: ${leg} refused with ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`pg-gateway auth: ${leg} answered with something that is not JSON`);
  }
}

/** Leg one — the Vercel token becomes a federated access token. */
export async function exchangeForFederatedToken(
  cfg: GatewayAuthConfig,
  subjectToken: string,
  fetchImpl: FetchLike,
): Promise<string> {
  const out = await postJson(
    fetchImpl,
    cfg.stsUrl,
    {
      audience: cfg.stsAudience,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken,
    },
    {},
    cfg.timeoutMs,
    "Google STS",
  );
  const token = out.access_token;
  if (typeof token !== "string" || token === "") {
    throw new Error("pg-gateway auth: Google STS returned no access_token");
  }
  return token;
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

type CachedToken = { token: string; expiresAtMs: number };
let cached: CachedToken | null = null;
// A SECOND CONCURRENT REQUEST MUST NOT MINT A SECOND TOKEN. Without this,
// a cold instance handling five parallel queries does five STS exchanges and
// five impersonations, and four of them are thrown away. The promise is shared;
// the first failure clears it so the next caller retries rather than being
// handed a permanently rejected promise.
let inFlight: Promise<string> | null = null;

/** The arithmetic, split out so the expiry rule is provable without a network. */
export function isFresh(entry: CachedToken | null, nowMs: number, skewMs: number): boolean {
  return entry !== null && nowMs < entry.expiresAtMs - skewMs;
}

export type MintDeps = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  now?: () => number;
};

/** One full chain, uncached — exported so a test can drive it with a fake fetch. */
export async function mintGatewayIdToken(deps: MintDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const cfg = readGatewayAuthConfig(env);

  const subjectToken = env.VERCEL_OIDC_TOKEN;
  if (!subjectToken) {
    // ABSENT IS A FAILURE, NOT A FALLBACK. There is no unauthenticated path to
    // fall back to — see this module's header for why that is the one branch
    // that must never exist.
    throw new Error(
      "pg-gateway auth: VERCEL_OIDC_TOKEN is not set, so there is no identity to exchange. On Vercel it " +
        "is injected automatically when OIDC federation is enabled for the project; elsewhere there is no " +
        "identity at all and PG_TRANSPORT must stay `direct`.",
    );
  }

  assertVercelTokenMatchesPool(subjectToken, cfg);
  const federated = await exchangeForFederatedToken(cfg, subjectToken, fetchImpl);
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
