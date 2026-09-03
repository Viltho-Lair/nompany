// EVERY PURE ASSERTION FOR THE /super GOOGLE CALENDAR, with no Google, no store
// and no network in the room. The integration halves — the four routes and their
// goldens — live in tests/gate-a.mjs, because they need a console session.
//
// WHAT THIS FILE CANNOT PROVE, stated rather than implied: that Google STS
// accepts a real Vercel token, that pg-gateway@ may be impersonated for the
// calendar scope, that the Calendar API is enabled, or that any calendar has
// been shared. Those need cloud state nobody here can create; the operator steps
// are in the spec's §11.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}

let fails = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  ok   ${label}`);
  else { fails++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const {
  GOOGLE_FEDERATION_DEFAULTS, readFederationConfig, isFresh, assertVercelTokenMatchesPool,
} = await import("../src/platform/auth/googleFederation.ts");
const { readGatewayAuthConfig, PG_GATEWAY_DEFAULTS } =
  await import("../src/platform/db/pgGatewayAuth.ts");

console.log("\ngoogle federation");
{
  // THE WHOLE REASON THE EXTRACTION EXISTS. The gateway's config reader throws
  // without PG_GATEWAY_URL — correctly, it is where a token is addressed. The
  // calendar addresses nothing, so a shared reader that demanded a gateway URL
  // would make the calendar unusable on any deployment without one.
  const cfg = readFederationConfig({});
  ok("readFederationConfig needs no PG_GATEWAY_URL", Boolean(cfg.stsAudience));
  ok("...and builds the STS audience from project, pool and provider",
    cfg.stsAudience ===
      `//iam.googleapis.com/projects/${GOOGLE_FEDERATION_DEFAULTS.projectNumber}` +
      `/locations/global/workloadIdentityPools/${GOOGLE_FEDERATION_DEFAULTS.workloadIdentityPool}` +
      `/providers/${GOOGLE_FEDERATION_DEFAULTS.workloadIdentityProvider}`,
    cfg.stsAudience);

  let threw = "";
  try { readGatewayAuthConfig({}); } catch (e) { threw = e.message; }
  ok("the gateway's reader still refuses a missing PG_GATEWAY_URL",
    /PG_GATEWAY_URL is not set/.test(threw), threw);

  ok("PG_GATEWAY_DEFAULTS still carries every federation value",
    PG_GATEWAY_DEFAULTS.serviceAccount === GOOGLE_FEDERATION_DEFAULTS.serviceAccount &&
    PG_GATEWAY_DEFAULTS.oidcIssuer === GOOGLE_FEDERATION_DEFAULTS.oidcIssuer &&
    PG_GATEWAY_DEFAULTS.projectNumber === GOOGLE_FEDERATION_DEFAULTS.projectNumber);

  ok("the service account is the one the calendar must be shared with",
    GOOGLE_FEDERATION_DEFAULTS.serviceAccount === "pg-gateway@nompany-application.iam.gserviceaccount.com",
    GOOGLE_FEDERATION_DEFAULTS.serviceAccount);

  // THE SKEW IS THE POINT OF isFresh: a token still valid when this process
  // checks it can be expired by the time it reaches Google.
  ok("a token inside the skew is not fresh", isFresh({ expiresAtMs: 1_000_000 }, 900_000, 120_000) === false);
  ok("...and one outside it is", isFresh({ expiresAtMs: 1_000_000 }, 800_000, 120_000) === true);
  ok("no token is never fresh", isFresh(null, 0, 120_000) === false);

  // The `who` prefix is what stops a calendar misconfiguration reporting itself
  // as a database problem.
  const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const jwt = (c) => `${b64({ alg: "RS256" })}.${b64(c)}.c2ln`;
  let msg = "";
  try {
    assertVercelTokenMatchesPool(jwt({ iss: "someone-else", aud: cfg.expectedAudience }), cfg, "google-calendar auth");
  } catch (e) { msg = e.message; }
  ok("a pool mismatch names the caller that asked", /^google-calendar auth:/.test(msg), msg);
  ok("...and names the issuer it saw", /someone-else/.test(msg), msg);

  // readFederationConfig's OWN `who` PARAMETER — the finding carried forward
  // from Task 1's review. Left unset, it must still say "pg-gateway auth" so
  // the gateway's existing messages and `readGatewayAuthConfig`'s single-
  // argument call site stay byte-identical.
  let skewMsg = "";
  try { readFederationConfig({ PG_GATEWAY_TOKEN_SKEW_MS: "not-a-number" }); } catch (e) { skewMsg = e.message; }
  ok("readFederationConfig defaults its own `who` to pg-gateway auth",
    /^pg-gateway auth: PG_GATEWAY_TOKEN_SKEW_MS/.test(skewMsg), skewMsg);

  let calendarSkewMsg = "";
  try {
    readFederationConfig({ PG_GATEWAY_TOKEN_SKEW_MS: "not-a-number" }, "google-calendar auth");
  } catch (e) { calendarSkewMsg = e.message; }
  ok("...and a passed `who` overrides it, so a calendar misconfiguration does not name the database",
    /^google-calendar auth: PG_GATEWAY_TOKEN_SKEW_MS/.test(calendarSkewMsg), calendarSkewMsg);
}

const {
  CALENDAR_SCOPE, calendarServiceAccount, expiryFromExpireTime, mintCalendarAccessToken,
  getCalendarAccessToken, _resetCalendarTokenCacheForTests,
} = await import("../src/platform/auth/googleCalendarAuth.ts");

console.log("\ncalendar access token");
{
  ok("the scope is read-only", CALENDAR_SCOPE === "https://www.googleapis.com/auth/calendar.readonly");
  ok("the default impersonation target is pg-gateway@",
    calendarServiceAccount({}) === "pg-gateway@nompany-application.iam.gserviceaccount.com");
  ok("...and is overridable",
    calendarServiceAccount({ GOOGLE_CALENDAR_SERVICE_ACCOUNT: "other@x.iam.gserviceaccount.com" }) ===
      "other@x.iam.gserviceaccount.com");

  // THE EXPIRY IS READ, NOT GUESSED. generateAccessToken returns an OPAQUE
  // token — there is no JWT to decode, unlike the gateway's ID token — plus an
  // RFC-3339 expireTime. A response without one must be refused: a token cached
  // forever is one that starts failing every request the moment it lapses, with
  // nothing in the code that would ever mint another.
  ok("expireTime is parsed to epoch ms",
    expiryFromExpireTime("2026-09-03T12:00:00Z") === Date.parse("2026-09-03T12:00:00Z"));
  for (const bad of [undefined, null, "", "not a date", 12345]) {
    let threw = false;
    try { expiryFromExpireTime(bad); } catch { threw = true; }
    ok(`a missing or unreadable expireTime is refused (${JSON.stringify(bad)})`, threw);
  }

  // ---- the chain, with a fetch that records instead of connecting ----------
  const ISSUER = "https://oidc.vercel.com/vilthos-projects";
  const AUDIENCE = "https://vercel.com/vilthos-projects";
  const b64c = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const VERCEL_TOKEN = `${b64c({ alg: "RS256" })}.${b64c({ iss: ISSUER, aud: AUDIENCE })}.c2ln`;
  const env = { VERCEL_OIDC_TOKEN: VERCEL_TOKEN };

  const calls = [];
  const at = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.includes("sts.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "federated" }), { status: 200 });
    }
    return new Response(JSON.stringify({ accessToken: "ya29.calendar", expireTime: at(3600_000) }), { status: 200 });
  };

  _resetCalendarTokenCacheForTests();
  const minted = await mintCalendarAccessToken({ env, fetchImpl });
  ok("the chain returns an access token", minted.token === "ya29.calendar", minted.token);
  ok("two legs, in order",
    calls.length === 2 && calls[0].url.includes("sts.googleapis.com") &&
    calls[1].url.includes("iamcredentials.googleapis.com"),
    calls.map((c) => c.url).join(" , "));
  ok("the second leg impersonates pg-gateway@",
    calls[1].url.includes(encodeURIComponent("pg-gateway@nompany-application.iam.gserviceaccount.com")),
    calls[1].url);
  ok("...and asks for generateAccessToken, not generateIdToken",
    calls[1].url.endsWith(":generateAccessToken"), calls[1].url);
  ok("...with the read-only calendar scope and nothing else",
    JSON.stringify(calls[1].body.scope) === JSON.stringify([CALENDAR_SCOPE]),
    JSON.stringify(calls[1].body));

  // ONE INSTANCE MUST NOT MINT PER REQUEST. Two calls, one chain.
  calls.length = 0;
  _resetCalendarTokenCacheForTests();
  await getCalendarAccessToken({ env, fetchImpl });
  await getCalendarAccessToken({ env, fetchImpl });
  ok("a fresh token is reused rather than re-minted", calls.length === 2, `${calls.length} calls`);

  // AND A MISSING IDENTITY IS A FAILURE, NEVER A FALLBACK.
  _resetCalendarTokenCacheForTests();
  let msg = "";
  try { await getCalendarAccessToken({ env: {}, fetchImpl }); } catch (e) { msg = e.message; }
  ok("no Vercel identity throws", /VERCEL_OIDC_TOKEN/.test(msg), msg);
  ok("...naming the calendar, not the gateway", /^google-calendar auth:/.test(msg), msg);
  ok("...and listing the sources it tried", /Sources tried/.test(msg), msg);
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
