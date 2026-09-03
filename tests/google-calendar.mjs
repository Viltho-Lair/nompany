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
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
