// HOW A VERCEL DEPLOYMENT PROVES WHO IT IS TO GOOGLE, WITHOUT A KEY EXISTING
// ANYWHERE — the half of that chain that is not about any one destination.
//
//   VERCEL_OIDC_TOKEN  (minted per REQUEST by Vercel, short-lived)
//        │
//        └─ POST sts.googleapis.com/v1/token          token exchange, Workload
//              subject_token = the OIDC JWT           Identity Federation
//           -> a FEDERATED ACCESS TOKEN for the pool's principal
//
// What a caller does with that token is its own business: pgGatewayAuth.ts
// mints an ID token audienced to Cloud Run, googleCalendarAuth.ts mints an
// access token scoped to calendar.readonly. Both impersonate the same service
// account, through the same iam.serviceAccountTokenCreator binding.
//
// NO SERVICE-ACCOUNT JSON KEY IS EVER CREATED, STORED IN VERCEL, OR ROTATED —
// design D3. That is the entire reason this is three network calls rather than
// one `process.env.GOOGLE_APPLICATION_CREDENTIALS`. A long-lived private key in
// an environment variable never expires; the chain above grants the same access
// for an hour, to a principal Google can revoke by editing one IAM binding.
//
// THIS FILE WAS SPLIT OUT OF pgGatewayAuth.ts when the /super calendar became
// the second consumer. It is a move, not a rewrite: every comment below was
// written for the gateway and is still true. The one change is that error
// messages take a `who` prefix, because "pg-gateway auth: …" on a calendar
// failure sends the reader to the database.
//
// NOTHING HERE IS HARDCODED, AND THE DEFAULTS ARE STILL REAL. Every value below
// comes from the environment, with the values read from a live token and a live
// project on 01/09/2026 as its documented default — the issuer, the audience,
// the project number, the pool, the provider, the service account. Defaults
// that are real mean a correct deployment needs one variable (the gateway URL)
// rather than eight; reading them from the environment anyway means a second
// project, a renamed pool or a rotated service account is a variable change
// rather than a code change.

// THE REAL VALUES, AS DEFAULTS. Every one of these was READ rather than
// remembered on 01/09/2026: the issuer and audience off a live
// `VERCEL_OIDC_TOKEN`, the project number from
// `gcloud projects describe nompany-application`, and the pool, provider and
// service-account names from the setup runbook that creates them
// (docs/superpowers/plans/2026-09-01-pg-gateway-cloud-setup.md). They are
// defaults and not constants — every one is overridable above — but a default
// that is wrong is worse than no default, so they are stated once, here, with
// where they came from.
export const GOOGLE_FEDERATION_DEFAULTS = {
  oidcIssuer: "https://oidc.vercel.com/vilthos-projects",
  oidcAudience: "https://vercel.com/vilthos-projects",
  projectNumber: "17918747100",
  workloadIdentityPool: "vercel",
  workloadIdentityProvider: "vercel-oidc",
  serviceAccount: "pg-gateway@nompany-application.iam.gserviceaccount.com",
  stsUrl: "https://sts.googleapis.com/v1/token",
  iamCredentialsUrl: "https://iamcredentials.googleapis.com",
} as const;

export type FederationConfig = {
  /** The full STS audience: //iam.googleapis.com/projects/…/providers/… */
  stsAudience: string;
  /** The service account the federated principal impersonates. */
  serviceAccount: string;
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

export function positiveInt(raw: string | undefined, fallback: number, name: string, who: string): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${who}: ${name} must be a positive integer`);
  return n;
}

/**
 * Pure — takes an environment, returns the addresses. Separated from the
 * network calls so the whole configuration surface is assertable with no
 * Google in the room, which is the only kind of test this file can have from
 * here (there is no workload identity pool yet).
 *
 * NO GATEWAY URL IS ASKED FOR. This reader is shared, and the calendar
 * addresses nothing — the destination is each consumer's own business.
 *
 * `who` NAMES THE CALLER IN THE TWO positiveInt ERRORS BELOW. Defaulted to
 * "pg-gateway auth" so the gateway's existing messages, and
 * `readGatewayAuthConfig`'s single-argument call site, stay byte-identical —
 * a calendar deployment with a malformed `PG_GATEWAY_TOKEN_SKEW_MS` passes
 * "google-calendar auth" instead, so the error points at the calendar rather
 * than the database that variable's name suggests.
 */
export function readFederationConfig(env: NodeJS.ProcessEnv, who: string = "pg-gateway auth"): FederationConfig {
  const projectNumber = env.GCP_PROJECT_NUMBER || GOOGLE_FEDERATION_DEFAULTS.projectNumber;
  const pool = env.GCP_WORKLOAD_IDENTITY_POOL || GOOGLE_FEDERATION_DEFAULTS.workloadIdentityPool;
  const provider = env.GCP_WORKLOAD_IDENTITY_PROVIDER || GOOGLE_FEDERATION_DEFAULTS.workloadIdentityProvider;

  return {
    // Google's own spelling of the provider resource, with the leading `//`.
    // Overridable whole in case a future pool is not in this shape, but built
    // from its three parts by default so a wrong pool name is a readable
    // mistake rather than a mistyped URL.
    stsAudience:
      env.GCP_WORKLOAD_IDENTITY_AUDIENCE ||
      `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    serviceAccount: env.PG_GATEWAY_SERVICE_ACCOUNT || GOOGLE_FEDERATION_DEFAULTS.serviceAccount,
    expectedIssuer: env.VERCEL_OIDC_ISSUER || GOOGLE_FEDERATION_DEFAULTS.oidcIssuer,
    expectedAudience: env.VERCEL_OIDC_AUDIENCE || GOOGLE_FEDERATION_DEFAULTS.oidcAudience,
    stsUrl: env.GCP_STS_URL || GOOGLE_FEDERATION_DEFAULTS.stsUrl,
    iamCredentialsUrl: (env.GCP_IAM_CREDENTIALS_URL || GOOGLE_FEDERATION_DEFAULTS.iamCredentialsUrl).replace(/\/+$/, ""),
    // TWO MINUTES, NOT ZERO. A token that is still valid when this process
    // checks it can be expired by the time it reaches Google — clock skew plus
    // the flight time of the request it is attached to. The skew is what turns
    // "expired" from a real failure mode into an arithmetic one.
    //
    // THE TWO VARIABLE NAMES KEEP THE `PG_GATEWAY_` SPELLING after the split.
    // They are production-tunable configuration; renaming them would change
    // what a deployment already sets, which is the one thing a move must not
    // do.
    refreshSkewMs: positiveInt(env.PG_GATEWAY_TOKEN_SKEW_MS, 120_000, "PG_GATEWAY_TOKEN_SKEW_MS", who),
    timeoutMs: positiveInt(env.PG_GATEWAY_AUTH_TIMEOUT_MS, 10_000, "PG_GATEWAY_AUTH_TIMEOUT_MS", who),
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
//
// THESE TWO KEEP THE LITERAL `pg-gateway auth:` PREFIX rather than taking a
// `who`. They are only ever reached from the gateway's ID-token path, and
// tests/pg-gateway-client.mjs drives them directly.

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
export function assertVercelTokenMatchesPool(token: string, cfg: FederationConfig, who: string): void {
  const claims = decodeJwtClaims(token);
  if (claims.iss !== cfg.expectedIssuer) {
    throw new Error(
      `${who}: VERCEL_OIDC_TOKEN was issued by "${String(claims.iss)}" but the workload ` +
        `identity provider is configured for "${cfg.expectedIssuer}". STS would refuse this with an ` +
        "opaque invalid_grant; refused here instead so the mismatch is readable.",
    );
  }
  if (!audienceMatches(claims.aud, cfg.expectedAudience)) {
    throw new Error(
      `${who}: VERCEL_OIDC_TOKEN is addressed to "${JSON.stringify(claims.aud)}" but the ` +
        `provider's allowed audience is "${cfg.expectedAudience}".`,
    );
  }
}

// ---- the two network legs --------------------------------------------------

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function postJson(
  fetchImpl: FetchLike,
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
  leg: string,
  who: string,
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
    throw new Error(`${who}: ${leg} did not answer — ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    // The body is Google's own error JSON and says which claim or binding was
    // wrong. Passed through, because the alternative is an afternoon.
    throw new Error(`${who}: ${leg} refused with ${res.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${who}: ${leg} answered with something that is not JSON`);
  }
}

/** Leg one — the Vercel token becomes a federated access token. */
export async function exchangeForFederatedToken(
  cfg: FederationConfig,
  subjectToken: string,
  fetchImpl: FetchLike,
  who: string,
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
    who,
  );
  const token = out.access_token;
  if (typeof token !== "string" || token === "") {
    throw new Error(`${who}: Google STS returned no access_token`);
  }
  return token;
}

/** The arithmetic, split out so the expiry rule is provable without a network. */
export function isFresh(entry: { expiresAtMs: number } | null, nowMs: number, skewMs: number): boolean {
  return entry !== null && nowMs < entry.expiresAtMs - skewMs;
}

export type MintDeps = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  now?: () => number;
};

/** Why each identity source came up empty, kept so a failure is diagnosable rather than bare. */
let lastTokenFailure = "";
export function lastSubjectTokenFailure(): string { return lastTokenFailure; }

/**
 * THE VERCEL IDENTITY: the environment first, then the REQUEST.
 *
 * The environment variable exists during the BUILD and in a local
 * `vercel env pull`. It does NOT exist in a running function: the token is
 * short-lived and per-invocation, so Vercel delivers it on the request as
 * `x-vercel-oidc-token` and process.env never holds it. This module read only
 * the variable, and its own error asserted Vercel "injects it automatically" —
 * which is why enabling OIDC federation changed nothing while every request
 * carried the identity it was reporting as absent.
 *
 * READ THROUGH next/headers RATHER THAN @vercel/functions. That package wraps
 * this same header, so it bought nothing — and it made the one guarantee that
 * matters untestable: it resolves a token captured at import time even after a
 * test clears the environment, so "there is no unauthenticated fallback" passed
 * while the fallback it forbids was the thing answering. A dependency that
 * defeats the test of the property it exists to provide is worse than none.
 *
 * Imported dynamically because this module also loads outside Next — a test, a
 * script — where next/headers does not resolve at all.
 */
export async function readSubjectToken(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const tried: string[] = [];

  if (env.VERCEL_OIDC_TOKEN) return env.VERCEL_OIDC_TOKEN;
  tried.push("VERCEL_OIDC_TOKEN unset in the environment");

  try {
    const { headers } = await import("next/headers");
    const token = (await headers()).get("x-vercel-oidc-token");
    if (token) return token;
    tried.push("x-vercel-oidc-token absent from the request");
  } catch (e) {
    tried.push(`next/headers unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }

  lastTokenFailure = tried.join("; ");
  return undefined;
}
