// THE CLIENT HALF OF THE GATEWAY, PROVED WITH NO DATABASE AND NO GOOGLE.
//
// There is no workload identity pool yet, no service account, no deployed Cloud
// Run service and no IAM database user. So the only honest way to have this
// tested at all is the same shape services/pg-gateway/test/gateway.test.mjs
// uses on the other side of the wire: everything that DECIDES something is a
// pure function or takes its network as a parameter, and `fetch` is stubbed.
//
// WHAT THIS FILE CANNOT PROVE, stated rather than implied: that Google STS
// accepts a real Vercel token, that the impersonation binding exists, that
// Cloud Run accepts the minted ID token's audience, or that any of this reaches
// Postgres. Those need cloud resources nobody has created (plan Task 6).
//
// WHAT IT CAN PROVE, and does: that `direct` is still the default, that the
// gateway arm posts the shape the SERVER'S OWN PARSER accepts (the request is
// fed through services/pg-gateway/src/request.ts, so the two declarations of
// the wire shape cannot drift silently), that one statement is one call, that
// pgTx and pgSchemaQuery refuse, that re-entrancy behaves the same on both
// transports, and that the token cache mints once and re-mints on expiry.
//
// PG_TRANSPORT IS SET BEFORE pg.ts IS IMPORTED, because pg.ts reads it once at
// module scope exactly as sections.ts reads DB_BACKEND. That is also why the
// `direct` default is asserted through the pure `parseTransport` rather than by
// re-importing the module with a different environment.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

// ---- the environment this file runs the gateway arm under -------------------

const GATEWAY_URL = "https://pg-gateway-test.example.run.app";
const ISSUER = "https://oidc.vercel.com/vilthos-projects";
const AUDIENCE = "https://vercel.com/vilthos-projects";

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}
/** A JWT that is structurally real and cryptographically meaningless — nothing here verifies one. */
function fakeJwt(claims) {
  return `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url(claims)}.c2lnbmF0dXJl`;
}
const VERCEL_TOKEN = fakeJwt({ iss: ISSUER, aud: AUDIENCE, sub: "owner:x:project:y:environment:production" });

process.env.PG_TRANSPORT = "gateway";
process.env.PG_GATEWAY_URL = GATEWAY_URL;
process.env.VERCEL_OIDC_TOKEN = VERCEL_TOKEN;

const { pgQuery, pgTx, pgSchemaQuery, withTenant, parseTransport, pgTransport } =
  await import("../src/platform/db/pg.ts");
const {
  readGatewayAuthConfig, decodeJwtClaims, jwtExpiryMs, isFresh, assertVercelTokenMatchesPool,
  _resetGatewayTokenCacheForTests, PG_GATEWAY_DEFAULTS,
} = await import("../src/platform/db/pgGatewayAuth.ts");
const { readGatewayUrl } = await import("../src/platform/db/pgGateway.ts");
// THE SERVER'S OWN PARSER, imported across the service boundary on purpose.
// pgGateway.ts restates the wire shape rather than importing the service's
// types (services/ is excluded from the app's typecheck for good reasons), and
// this import is what stops that restatement from drifting: every request the
// client builds below is fed to the parser that will actually receive it.
const { parseTxRequest } = await import("../services/pg-gateway/src/request.ts");

// ---- a fetch that records instead of connecting -----------------------------

/**
 * Answers the three URLs this chain touches. `tx` is the per-call behaviour for
 * POST /tx; everything else is the auth chain, answered plausibly so a test
 * about the transport is not also a test about tokens.
 */
function recordingFetch({ tx, idTokenExpSeconds } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    if (url.startsWith("https://sts.googleapis.com")) {
      return jsonResponse(200, { access_token: "federated-access-token", expires_in: 3600 });
    }
    if (url.startsWith("https://iamcredentials.googleapis.com")) {
      const exp = idTokenExpSeconds ?? Math.floor(Date.now() / 1000) + 3600;
      return jsonResponse(200, { token: fakeJwt({ aud: GATEWAY_URL, exp }) });
    }
    if (url.endsWith("/tx")) {
      const req = JSON.parse(init.body);
      return tx ? tx(req, init) : jsonResponse(200, { results: req.statements.map(() => ({ rows: [], rowCount: 0 })) });
    }
    throw new Error(`unexpected URL in test: ${url}`);
  };
  impl.calls = calls;
  impl.txCalls = () => calls.filter((c) => c.url.endsWith("/tx"));
  return impl;
}

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}
function textResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

/** Installs a stub `fetch` for the duration of `fn`, and always puts the real one back. */
async function withFetch(impl, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  _resetGatewayTokenCacheForTests();
  try {
    return await fn(impl);
  } finally {
    globalThis.fetch = real;
    _resetGatewayTokenCacheForTests();
  }
}

async function threw(fn) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
}

// ---- the switch --------------------------------------------------------------

export async function testDirectIsTheDefaultTransport(t) {
  // DESIGN D5, AND THE REASON LOCAL AND CI ARE UNTOUCHED: an unset variable
  // must mean today's behaviour. A test that reached Postgres through a gateway
  // would be testing the gateway, not the RLS policy.
  t.equal(parseTransport(undefined), "direct", "unset means direct");
  t.equal(parseTransport(""), "direct", "empty means direct");
  t.equal(parseTransport("direct"), "direct", "direct means direct");
}

export async function testAnUnknownTransportRefusesRatherThanFallingBack(t) {
  // THE FAILURE THIS GUARDS: on Vercel there is no direct path at all, so a
  // typo silently taking the direct path surfaces as a connection TIMEOUT
  // rather than as the configuration mistake it is.
  const e = await threw(() => parseTransport("gatway"));
  t.equal(e instanceof Error, true, "an unknown value throws");
  t.equal(/neither "direct" nor "gateway"/.test(e?.message || ""), true, "and names both valid values");
}

export async function testTheTransportIsReadOnceFromTheEnvironment(t) {
  t.equal(pgTransport(), "gateway", "this file set PG_TRANSPORT=gateway before importing pg.ts");
}

// ---- the doors that refuse ----------------------------------------------------

export async function testPgTxRefusesUnderTheGateway(t) {
  // Its whole purpose is atomicity across statements whose contents depend on
  // earlier results, and a stateless gateway cannot provide that. Making it
  // silently work — one HTTPS call per statement, each its own transaction —
  // would leave a door still called pgTx that is no longer atomic.
  let ran = false;
  const e = await threw(() => pgTx(async () => { ran = true; }));
  t.equal(e instanceof Error, true, "pgTx throws under the gateway");
  t.equal(ran, false, "and the callback never runs, so nothing partial is executed");
  t.equal(/PG_TRANSPORT=gateway/.test(e?.message || ""), true, "the message names the transport");
  t.equal(/PG_TRANSPORT=direct/.test(e?.message || ""), true, "and names the transport that does work");
}

export async function testPgSchemaQueryRefusesUnderTheGateway(t) {
  // The gateway refuses any text that is not exactly one statement; pgSchemaQuery
  // sends the schema file as one text holding many, on purpose, so a failure
  // partway through applies nothing.
  const e = await threw(() => pgSchemaQuery("CREATE INDEX IF NOT EXISTS gw_probe_idx ON collection_rows (tenant_id)"));
  t.equal(/PG_TRANSPORT=gateway/.test(e?.message || ""), true, "pgSchemaQuery refuses under the gateway");
}

export async function testTheDdlGuardStillRunsBeforeTheTransportRefusal(t) {
  // ORDER MATTERS. assertDdlOnly must not become unreachable behind the
  // transport check — a DROP TABLE should still be refused as a DROP TABLE,
  // naming invariant 17, rather than as "wrong transport".
  const e = await threw(() => pgSchemaQuery("DROP TABLE collection_rows"));
  t.equal(/invariant 17/.test(e?.message || ""), true, "invariant 17 is what refuses a DROP TABLE, on either transport");
}

// ---- what goes on the wire -----------------------------------------------------

export async function testWithTenantPostsOneStatementPerQuery(t) {
  const f = recordingFetch({
    tx: () => jsonResponse(200, { results: [{ rows: [{ n: 1 }], rowCount: 1 }] }),
  });
  await withFetch(f, async () => {
    await withTenant("st_1", async (q) => {
      await q("SELECT payload FROM collection_rows WHERE tenant_id = $1", ["st_1"]);
      await q("UPDATE collection_rows SET row_version = row_version + 1 WHERE tenant_id = $1", ["st_1"]);
    });
  });
  const tx = f.txCalls();
  t.equal(tx.length, 2, "two statements are two HTTPS calls — one call is one transaction (design D1)");
  t.equal(tx[0].body.statements.length, 1, "and each call carries exactly one statement");
  t.equal(tx[0].body.tenantId, "st_1", "the tenant travels with every call, not just the first");
  t.equal(tx[1].body.tenantId, "st_1", "including the second");
}

export async function testTheRequestShapeIsWhatTheServerActuallyAccepts(t) {
  // THE DRIFT GUARD. pgGateway.ts restates the wire shape instead of importing
  // the service's types; this feeds what the client built to the parser that
  // will actually receive it, which refuses unknown keys. A field renamed on
  // either side fails here rather than as a 400 in production.
  const f = recordingFetch();
  await withFetch(f, async () => {
    await withTenant("st_1", (q) => q("SELECT 1 FROM collection_rows WHERE tenant_id = $1", ["st_1"]));
  });
  const sent = f.txCalls()[0].body;
  const parsed = parseTxRequest(sent);
  t.equal(parsed.tenantId, "st_1", "the server's own parser accepts the client's request");
  t.equal(parsed.statements[0].text.startsWith("SELECT 1"), true, "and reads the statement back unchanged");
}

export async function testValuesAreSentAsBindParametersAlways(t) {
  // BIND PARAMETERS ARE THE REASON THIS SERVICE EXISTS rather than the Cloud
  // SQL Data API (rejected 31/08/2026: no bind-parameter field). A value must
  // never appear inside `text`.
  const f = recordingFetch();
  await withFetch(f, async () => {
    await withTenant("st_1", (q) =>
      q("INSERT INTO collection_rows (payload) VALUES ($1::json)", ['{"name":"O\'Brien; DROP TABLE"}']));
  });
  const stmt = f.txCalls()[0].body.statements[0];
  t.equal(/O'Brien/.test(stmt.text), false, "the value is nowhere in the SQL text");
  t.equal(stmt.values[0], '{"name":"O\'Brien; DROP TABLE"}', "it travels as a bound value");
}

export async function testAnEmptyParameterListIsStillSentAsAnArray(t) {
  // `pg` uses the extended (bind-parameter) protocol only when a query carries
  // values; with none it uses the SIMPLE protocol, which runs a
  // semicolon-separated text as a batch. Always sending an array keeps the far
  // side's `pg` doing exactly what the direct transport's does.
  const f = recordingFetch();
  await withFetch(f, () => pgQuery("SELECT 1"));
  const stmt = f.txCalls()[0].body.statements[0];
  t.equal(Array.isArray(stmt.values), true, "values is an array even when the caller passed none");
  t.equal(stmt.values.length, 0, "an empty one");
}

export async function testPgQuerySendsNoTenantId(t) {
  const f = recordingFetch();
  await withFetch(f, () => pgQuery("SELECT now()"));
  const body = f.txCalls()[0].body;
  t.equal("tenantId" in body, false, "the tenant-agnostic path sends no tenantId key at all");
}

export async function testPgQueryStillRefusesTheTenantTableBeforeAnyCall(t) {
  // The caller-side guard is not made redundant by the gateway re-running it:
  // refusing here costs no network call, and both transports refuse the same
  // text with the same message.
  const f = recordingFetch();
  await withFetch(f, async () => {
    const e = await threw(() => pgQuery("SELECT * FROM collection_rows"));
    t.equal(/FORCE ROW/.test(e?.message || ""), true, "a bare query against the tenant table is refused");
    t.equal(f.txCalls().length, 0, "and nothing was sent");
  });
}

export async function testTheResultIsRowsAndRowCount(t) {
  const f = recordingFetch({ tx: () => jsonResponse(200, { results: [{ rows: [{ a: 1 }, { a: 2 }], rowCount: 2 }] }) });
  const out = await withFetch(f, () => pgQuery("SELECT 1"));
  t.equal(out.rowCount, 2, "rowCount comes back as a number");
  t.equal(JSON.stringify(out.rows), '[{"a":1},{"a":2}]', "and rows come back in order, unchanged");
}

// ---- re-entrancy, unchanged by the transport ------------------------------------

export async function testAReentrantSameTenantScopeOpensNoSecondTransaction(t) {
  const f = recordingFetch();
  await withFetch(f, async () => {
    await withTenant("st_1", async () => {
      await withTenant("st_1", (q) => q("SELECT 1 FROM collection_rows WHERE tenant_id = $1", ["st_1"]));
    });
  });
  t.equal(f.txCalls().length, 1, "the nested scope is absorbed — one statement, one call");
}

export async function testAReentrantDifferentTenantScopeIsRefused(t) {
  const f = recordingFetch();
  await withFetch(f, async () => {
    const e = await threw(() =>
      withTenant("st_1", () => withTenant("st_2", (q) => q("SELECT 1", []))));
    t.equal(/two tenant scopes/.test(e?.message || ""), true, "one request may not hold two tenant scopes");
    t.equal(f.txCalls().length, 0, "and no call is made for either");
  });
}

export async function testAnEmptyTenantIdIsRefusedOnThisTransportToo(t) {
  const f = recordingFetch();
  await withFetch(f, async () => {
    const e = await threw(() => withTenant("", (q) => q("SELECT 1", [])));
    t.equal(/non-empty tenantId/.test(e?.message || ""), true, "an empty tenant id is refused before anything is sent");
  });
}

// ---- failures ---------------------------------------------------------------------

export async function testARefusalFromTheGatewayCarriesItsStatusAndMessage(t) {
  // A 4xx is a REFUSAL — the gateway decided before Postgres was asked — so
  // retrying will never help, and the body names which door said no. Losing the
  // status into a generic "gateway error" loses the only thing it carried.
  const f = recordingFetch({ tx: () => jsonResponse(400, { error: "pg-gateway: each statement's text must be exactly one SQL statement, got 2." }) });
  const e = await withFetch(f, () => threw(() => pgQuery("SELECT 1")));
  t.equal(/400/.test(e?.message || ""), true, "the status survives");
  t.equal(/exactly one SQL statement/.test(e?.message || ""), true, "and so does the gateway's own reason");
}

export async function testAnHtmlErrorPageIsReportedAsWhatItIs(t) {
  // Cloud Run's own 403 for a missing IAM binding is HTML, not the service's
  // JSON. Showing the raw body is the honest thing — a 403 here means the IAM
  // binding, not the SQL.
  const f = recordingFetch({ tx: () => textResponse(403, "<html><body>Forbidden</body></html>") });
  const e = await withFetch(f, () => threw(() => pgQuery("SELECT 1")));
  t.equal(/403/.test(e?.message || ""), true, "the status is reported");
  t.equal(/Forbidden/.test(e?.message || ""), true, "with whatever actually came back");
}

export async function testAShortResultArrayIsRefusedRatherThanIndexed(t) {
  // Nothing should be able to produce this. The check is here because the
  // failure it catches — reading one statement's result as another's — is
  // unreadable downstream and silent for a write.
  const f = recordingFetch({ tx: () => jsonResponse(200, { results: [] }) });
  const e = await withFetch(f, () => threw(() => pgQuery("SELECT 1")));
  t.equal(/sent 1 statement\(s\) and got 0/.test(e?.message || ""), true, "a result per statement is checked");
}

export async function testAMissingGatewayUrlIsNamedRatherThanGuessed(t) {
  const e = await threw(() => readGatewayUrl({}));
  t.equal(/PG_GATEWAY_URL is not set/.test(e?.message || ""), true, "the missing variable is named");
}

// ---- authentication ------------------------------------------------------------------

export async function testTheAuthChainIsStsThenImpersonation(t) {
  const f = recordingFetch();
  await withFetch(f, () => pgQuery("SELECT 1"));
  const urls = f.calls.map((c) => c.url);
  t.equal(urls[0].startsWith("https://sts.googleapis.com"), true, "leg one is the STS token exchange");
  t.equal(/iamcredentials\.googleapis\.com.*:generateIdToken$/.test(urls[1]), true, "leg two impersonates and mints an ID token");
  t.equal(urls[2].endsWith("/tx"), true, "and only then is the statement sent");
  const sts = f.calls[0].body;
  t.equal(sts.subjectToken, VERCEL_TOKEN, "the Vercel OIDC token is the subject token");
  t.equal(sts.grantType, "urn:ietf:params:oauth:grant-type:token-exchange", "as a token exchange");
  t.equal(sts.audience.includes("workloadIdentityPools/vercel/providers/vercel-oidc"), true,
    "against the pool and provider from the runbook");
  t.equal(f.calls[1].init.headers.authorization, "Bearer federated-access-token",
    "the federated token authorises the impersonation");
  t.equal(f.calls[1].body.audience, GATEWAY_URL, "and the ID token is addressed to the Cloud Run URL");
  t.equal(f.calls[2].init.headers.authorization.startsWith("Bearer "), true, "the statement carries the ID token");
}

export async function testTheTokenIsCachedAcrossStatements(t) {
  // WITHOUT THIS EVERY STATEMENT COSTS TWO EXTRA ROUND TRIPS, to a different
  // continent. The whole point of the gateway is that a statement is one call.
  const f = recordingFetch();
  await withFetch(f, async () => {
    await pgQuery("SELECT 1");
    await pgQuery("SELECT 2");
    await pgQuery("SELECT 3");
  });
  t.equal(f.calls.filter((c) => c.url.startsWith("https://sts")).length, 1, "one STS exchange for three statements");
  t.equal(f.txCalls().length, 3, "and three statements still sent");
}

export async function testConcurrentCallersShareOneMint(t) {
  // A cold instance handling five parallel queries must not do five exchanges
  // and throw four away.
  const f = recordingFetch();
  await withFetch(f, () => Promise.all([pgQuery("SELECT 1"), pgQuery("SELECT 2"), pgQuery("SELECT 3")]));
  t.equal(f.calls.filter((c) => c.url.startsWith("https://sts")).length, 1, "one in-flight mint is shared");
}

export async function testAnExpiredCachedTokenIsReminted(t) {
  // The skew is what turns "expired" from a real failure mode into an
  // arithmetic one: a token still valid when this process checks it can be
  // expired by the time it reaches Google.
  const f = recordingFetch({ idTokenExpSeconds: Math.floor(Date.now() / 1000) + 30 });
  await withFetch(f, async () => {
    await pgQuery("SELECT 1");
    await pgQuery("SELECT 2");
  });
  t.equal(f.calls.filter((c) => c.url.startsWith("https://sts")).length, 2,
    "a token inside the 120s refresh skew is not reused");
}

export async function testAFailedMintIsNotCachedAsAPermanentRejection(t) {
  let stsCalls = 0;
  const impl = async (url) => {
    if (url.startsWith("https://sts")) {
      stsCalls += 1;
      if (stsCalls === 1) return jsonResponse(400, { error: "invalid_grant" });
      return jsonResponse(200, { access_token: "federated-access-token" });
    }
    if (url.startsWith("https://iamcredentials")) {
      return jsonResponse(200, { token: fakeJwt({ aud: GATEWAY_URL, exp: Math.floor(Date.now() / 1000) + 3600 }) });
    }
    return jsonResponse(200, { results: [{ rows: [], rowCount: 0 }] });
  };
  await withFetch(impl, async () => {
    const first = await threw(() => pgQuery("SELECT 1"));
    t.equal(/invalid_grant/.test(first?.message || ""), true, "the first attempt surfaces Google's own reason");
    const second = await threw(() => pgQuery("SELECT 2"));
    t.equal(second, null, "and the next caller retries rather than awaiting a rejected promise");
  });
}

export async function testThereIsNoUnauthenticatedFallback(t) {
  // THE ONE BRANCH THAT MUST NEVER EXIST. An unauthenticated gateway is a
  // remote SQL execution endpoint against every tenant at once.
  const f = recordingFetch();
  const saved = process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
  try {
    await withFetch(f, async () => {
      const e = await threw(() => pgQuery("SELECT 1"));
      t.equal(/VERCEL_OIDC_TOKEN is not set/.test(e?.message || ""), true, "a missing identity throws");
      t.equal(f.txCalls().length, 0, "and nothing is sent without a token");
    });
  } finally {
    process.env.VERCEL_OIDC_TOKEN = saved;
  }
}

export async function testATokenFromAnotherIssuerIsRefusedBeforeSts(t) {
  // A diagnostic, not a security boundary — STS re-checks both against the
  // provider's own configuration. But STS's refusal is an opaque
  // `invalid_grant`, and this names the claim.
  const cfg = readGatewayAuthConfig({ PG_GATEWAY_URL: GATEWAY_URL });
  const wrong = fakeJwt({ iss: "https://oidc.vercel.com/someone-else", aud: AUDIENCE });
  const e = await threw(() => assertVercelTokenMatchesPool(wrong, cfg));
  t.equal(/someone-else/.test(e?.message || ""), true, "the issuer it saw is named");
  t.equal(new RegExp(ISSUER).test(e?.message || ""), true, "alongside the one it wanted");
}

export async function testAnArrayAudienceIsAccepted(t) {
  // The JWT spec allows `aud` to be a string or an array. Vercel emits the
  // string form today; depending on that is a bug waiting for the day it does not.
  const cfg = readGatewayAuthConfig({ PG_GATEWAY_URL: GATEWAY_URL });
  const e = await threw(() => assertVercelTokenMatchesPool(fakeJwt({ iss: ISSUER, aud: ["other", AUDIENCE] }), cfg));
  t.equal(e, null, "an array audience containing the expected value passes");
}

export async function testTheDefaultsAreTheRealValues(t) {
  // Read rather than remembered on 01/09/2026 — the issuer and audience off a
  // live VERCEL_OIDC_TOKEN, the project number from `gcloud projects describe`.
  // A default that is wrong is worse than no default.
  const cfg = readGatewayAuthConfig({ PG_GATEWAY_URL: GATEWAY_URL });
  t.equal(cfg.expectedIssuer, "https://oidc.vercel.com/vilthos-projects", "the issuer");
  t.equal(cfg.expectedAudience, "https://vercel.com/vilthos-projects", "the audience");
  t.equal(cfg.serviceAccount, "pg-gateway@nompany-application.iam.gserviceaccount.com", "the service account");
  t.equal(
    cfg.stsAudience,
    "//iam.googleapis.com/projects/17918747100/locations/global/workloadIdentityPools/vercel/providers/vercel-oidc",
    "and the STS audience, built from the project number, pool and provider",
  );
  t.equal(PG_GATEWAY_DEFAULTS.projectNumber, "17918747100", "the project number is stated once");
}

export async function testEveryDefaultIsOverridable(t) {
  // Nothing is hardcoded — a second project, a renamed pool or a rotated
  // service account is a variable change, not a deploy of different source.
  const cfg = readGatewayAuthConfig({
    PG_GATEWAY_URL: GATEWAY_URL,
    GCP_PROJECT_NUMBER: "999",
    GCP_WORKLOAD_IDENTITY_POOL: "other-pool",
    GCP_WORKLOAD_IDENTITY_PROVIDER: "other-provider",
    PG_GATEWAY_SERVICE_ACCOUNT: "other@example.iam.gserviceaccount.com",
    VERCEL_OIDC_ISSUER: "https://oidc.vercel.com/other",
    VERCEL_OIDC_AUDIENCE: "https://vercel.com/other",
  });
  t.equal(cfg.stsAudience, "//iam.googleapis.com/projects/999/locations/global/workloadIdentityPools/other-pool/providers/other-provider", "the pool path");
  t.equal(cfg.serviceAccount, "other@example.iam.gserviceaccount.com", "the service account");
  t.equal(cfg.expectedIssuer, "https://oidc.vercel.com/other", "the issuer");
}

export async function testATrailingSlashIsStrippedFromTheAudience(t) {
  // Cloud Run compares the token's `aud` to its own URL as a string, and a
  // URL copied from the console routinely carries one.
  const cfg = readGatewayAuthConfig({ PG_GATEWAY_URL: `${GATEWAY_URL}/` });
  t.equal(cfg.idTokenAudience, GATEWAY_URL, "the audience has no trailing slash");
}

export async function testAMissingGatewayUrlRefusesTheAuthConfigToo(t) {
  const e = await threw(() => readGatewayAuthConfig({}));
  t.equal(/PG_GATEWAY_URL is not set/.test(e?.message || ""), true, "there is nowhere to address a token to");
}

export async function testTheExpiryComesFromTheTokenNotAGuess(t) {
  // generateIdToken's response carries no expires_in at all — the only
  // statement of when this token stops working is its own `exp` claim.
  const exp = Math.floor(Date.now() / 1000) + 1234;
  t.equal(jwtExpiryMs(fakeJwt({ exp })), exp * 1000, "exp is read in milliseconds");
  const e = await threw(() => jwtExpiryMs(fakeJwt({ aud: "x" })));
  t.equal(/no numeric `exp`/.test(e?.message || ""), true, "a token with no exp is refused, not cached forever");
  t.equal(decodeJwtClaims(fakeJwt({ iss: ISSUER })).iss, ISSUER, "claims read back unchanged");
}

export async function testTheFreshnessArithmetic(t) {
  const entry = { token: "t", expiresAtMs: 1_000_000 };
  t.equal(isFresh(entry, 0, 120_000), true, "a token far from expiry is fresh");
  t.equal(isFresh(entry, 880_000 - 1, 120_000), true, "and still fresh one millisecond before the skew window");
  t.equal(isFresh(entry, 880_000, 120_000), false, "but not once inside it");
  t.equal(isFresh(null, 0, 120_000), false, "and nothing cached is never fresh");
}

// ---- the counter --------------------------------------------------------------------

export async function testEveryGatewayCallReportsIntoTheCommandCounter(t) {
  const { withCommandCount } = await import("../src/platform/db/commandCount.ts");
  const f = recordingFetch();
  const report = await withFetch(f, () =>
    withCommandCount(() => withTenant("st_1", async (q) => {
      await q("SELECT 1 FROM collection_rows WHERE tenant_id = $1", ["st_1"]);
      await q("UPDATE collection_rows SET row_version = 1 WHERE tenant_id = $1", ["st_1"]);
    })));
  // `queries` counts the CALLER's own statements, identically on both
  // transports, so every ceiling Gate A pins measures the same thing whichever
  // wire carried it.
  t.equal(report.queries, 2, "each statement counts toward queries");
  // `envelope` is the transaction bookkeeping wrapped around them — under this
  // transport, one BEGIN/set_config/COMMIT the gateway runs per HTTPS call. So
  // envelope reads as the number of network round trips (design D4).
  t.equal(report.envelope, 2, "and each HTTPS call counts one transaction envelope");
  t.equal(report.names.filter((n) => n === "gateway_tx").length, 2, "the trace names the transport");
  t.equal(report.commands, 0, "nothing is charged to the Redis counter");
}

// ---- the runner ---------------------------------------------------------------------

// REGRESSION: DATABASE_URL held a Cloud SQL INSTANCE CONNECTION NAME
// ("project:region:instance") instead of a connection string. `pg` does not
// reject a connectionString it cannot parse — it ignores it and connects to
// localhost:5432 — so the whole Postgres half of the suite died as
// ECONNREFUSED, which reads as "the database is down" and points nowhere near
// the variable. A debugging session went into finding that. The guard is pure
// so it can be asserted here, on the gateway transport, where getPool is never
// called at all.
async function testAnInstanceConnectionNameIsNamedRatherThanIgnored(t) {
  const { assertConnectionStringShape } = await import("@/platform/db/pg");

  let threw = null;
  try { assertConnectionStringShape("nompany-application:me-central1:nompany"); }
  catch (e) { threw = e; }
  t.equal(threw !== null, true, "the exact broken value is refused");
  t.equal(
    threw !== null && /INSTANCE CONNECTION NAME/.test(threw.message), true,
    "...and the message names what it actually is, not just 'invalid'",
  );
  t.equal(
    threw !== null && /PG_GATEWAY_INSTANCE/.test(threw.message), true,
    "...and says where an instance connection name does belong",
  );

  let plain = null;
  try { assertConnectionStringShape("not-a-url"); }
  catch (e) { plain = e; }
  t.equal(plain !== null, true, "any non-URL is refused");
  t.equal(
    plain !== null && /INSTANCE CONNECTION NAME/.test(plain.message), false,
    "...without guessing WHICH mistake it was — a wrong guess is worse than none",
  );

  let ok = null;
  try { assertConnectionStringShape("postgresql://u:p@127.0.0.1:5433/nompany"); }
  catch (e) { ok = e; }
  t.equal(ok, null, "a real proxy connection string passes");

  let scheme = null;
  try { assertConnectionStringShape("postgres://u:p@127.0.0.1:5433/nompany"); }
  catch (e) { scheme = e; }
  t.equal(scheme, null, "...and so does the postgres:// spelling");
}

const TESTS = [
  testDirectIsTheDefaultTransport,
  testAnUnknownTransportRefusesRatherThanFallingBack,
  testTheTransportIsReadOnceFromTheEnvironment,
  testPgTxRefusesUnderTheGateway,
  testPgSchemaQueryRefusesUnderTheGateway,
  testTheDdlGuardStillRunsBeforeTheTransportRefusal,
  testWithTenantPostsOneStatementPerQuery,
  testTheRequestShapeIsWhatTheServerActuallyAccepts,
  testValuesAreSentAsBindParametersAlways,
  testAnEmptyParameterListIsStillSentAsAnArray,
  testPgQuerySendsNoTenantId,
  testPgQueryStillRefusesTheTenantTableBeforeAnyCall,
  testTheResultIsRowsAndRowCount,
  testAReentrantSameTenantScopeOpensNoSecondTransaction,
  testAReentrantDifferentTenantScopeIsRefused,
  testAnEmptyTenantIdIsRefusedOnThisTransportToo,
  testARefusalFromTheGatewayCarriesItsStatusAndMessage,
  testAnHtmlErrorPageIsReportedAsWhatItIs,
  testAShortResultArrayIsRefusedRatherThanIndexed,
  testAMissingGatewayUrlIsNamedRatherThanGuessed,
  testTheAuthChainIsStsThenImpersonation,
  testTheTokenIsCachedAcrossStatements,
  testConcurrentCallersShareOneMint,
  testAnExpiredCachedTokenIsReminted,
  testAFailedMintIsNotCachedAsAPermanentRejection,
  testThereIsNoUnauthenticatedFallback,
  testATokenFromAnotherIssuerIsRefusedBeforeSts,
  testAnArrayAudienceIsAccepted,
  testTheDefaultsAreTheRealValues,
  testEveryDefaultIsOverridable,
  testATrailingSlashIsStrippedFromTheAudience,
  testAMissingGatewayUrlRefusesTheAuthConfigToo,
  testTheExpiryComesFromTheTokenNotAGuess,
  testTheFreshnessArithmetic,
  testEveryGatewayCallReportsIntoTheCommandCounter,
  testAnInstanceConnectionNameIsNamedRatherThanIgnored,
];

// SAME HARNESS SHAPE AS tests/pg-query.mjs: every assertion is reported, one
// line each, and the process exit code is the number of failures.
//
// THIS FILE IS NOT FOLDED INTO tests/suite.mjs, and that is deliberate rather
// than an oversight. It sets PG_TRANSPORT=gateway in the process it runs in,
// before pg.ts is imported — a module-scope read, exactly as sections.ts reads
// DB_BACKEND — so importing it into the integration suite would put every OTHER
// Postgres test in that process on the gateway transport too, which is the one
// thing design D5 says must not happen. It runs as its own command instead.
function makeHarness() {
  let fails = 0;
  return {
    get fails() { return fails; },
    equal(actual, expected, message) {
      const ok = actual === expected;
      if (!ok) fails += 1;
      console.log(`   ${ok ? "ok" : "FAIL"}  ${message}${ok ? "" : `  (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`}`);
    },
  };
}

let totalFails = 0;
for (const test of TESTS) {
  console.log(`\n== ${test.name}`);
  const t = makeHarness();
  await test(t);
  totalFails += t.fails;
}
console.log(totalFails ? `\n${totalFails} FAILURES\n` : `\nall passed (${TESTS.length} blocks)\n`);
process.exitCode = totalFails ? 1 : 0;
