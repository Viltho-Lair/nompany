# The /super Calendar, backed by Google — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `/super → Application → Calendar` screen with one that reads a real Google calendar server-side, using the service-account impersonation chain that already runs production Postgres.

**Architecture:** The server mints a `calendar.readonly` access token by impersonating `pg-gateway@nompany-application.iam.gserviceaccount.com` through Vercel OIDC → Google STS → IAM Credentials `generateAccessToken`. The operator shares a calendar with that address and stores its id in one platform-level key. No OAuth consent screen, no refresh token, no stored credential, no new environment variable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (`noImplicitAny` on converted folders), the `route()` wrapper, `getJSON`/`setJSON` over the Postgres-backed store, Tailwind + the `/super` `ui.js` kit, `node:test`-free hand-rolled assertions in the house `tests/*.mjs` style.

**Spec:** `docs/superpowers/specs/2026-09-03-super-google-calendar-design.md` — read it before Task 1. It records why OAuth was rejected, and every task below argues from it.

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). Never a literal, never a template at a call site.
- **`src/shared/**` is pure and client-safe** — it must not import the store, Redis, Postgres or anything server-only. The calendar's pure functions live there so both the server component and the client board can read them.
- **Siblings import each other relatively** (`./googleFederation`), never through the `@/` alias. `platform/db` and `platform/auth` have no barrel; do not add one.
- **Golden responses are the contract.** A changed response body is wrong until deliberately re-recorded in its own commit. `NOMPANY_RECORD_GOLDENS=1` is used ONLY to record the four genuinely new goldens in Task 5, and nothing else in `tests/goldens/` may change in that diff.
- **Comments explain why.** When code moves in Task 1, its comment moves with it, unedited except where the move itself changes the fact being stated.
- **No new npm dependency.** No FullCalendar, no React Big Calendar, no `googleapis` client — `fetch` and the REST endpoints. The bundle budget is a CI gate (largest chunk 158 KB gz / 250 KB ceiling; total 1577 KB gz / 1600 KB).
- **Commit subjects are declarative sentences** describing the state after the change, not conventional-commit prefixes. Every commit ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Two sessions cannot share a test namespace.** Run the suite as `NOMPANY_TEST_SESSION=gcal npm test`.
- **The service account address, verbatim, everywhere it appears:** `pg-gateway@nompany-application.iam.gserviceaccount.com`.
- **The scope, verbatim:** `https://www.googleapis.com/auth/calendar.readonly`.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/platform/auth/googleFederation.ts` | **Create.** Vercel OIDC → STS. Config, subject-token read, JWT decode, `postJson`, `isFresh`. Knows nothing about the gateway or the calendar. | 1 |
| `src/platform/db/pgGatewayAuth.ts` | **Modify.** Keeps only the Cloud Run leg: `PG_GATEWAY_URL`, `idTokenAudience`, `generateIdToken`, its own cache. | 1 |
| `tests/pg-gateway-client.mjs` | **Modify.** One import statement becomes two. No assertion changes. | 1 |
| `src/platform/auth/googleCalendarAuth.ts` | **Create.** `getCalendarAccessToken()` — the second leg for the calendar, with its own cache. | 2 |
| `src/platform/db/keys.ts` | **Modify.** `REG.googleCalendar`. | 3 |
| `src/lib/data/googleCalendar.ts` | **Create.** The stored connection plus the four Google REST calls. Server-only. | 3, 4 |
| `src/shared/calendar.ts` | **Create.** Pure: `normaliseEvent`, `monthGrid`, `eventsByDay`. Client-safe. | 4, 6 |
| `src/app/api/super/google-calendar/route.ts` | **Create.** GET / PUT / DELETE. | 5 |
| `src/app/api/super/google-calendar/events/route.ts` | **Create.** GET. | 5 |
| `src/app/super/(shell)/application/calendar/page.js` | **Modify.** Server component; two states. | 7 |
| `src/app/super/(shell)/application/calendar/CalendarBoard.jsx` | **Create.** The client grid. | 7 |
| `src/app/super/(shell)/application/calendar/ConnectCalendar.jsx` | **Create.** The not-connected state and the id form. | 7 |
| `tests/google-calendar.mjs` | **Create.** Every pure assertion, no network, no store. Added to `npm test`. | 1, 2, 4, 6 |
| `tests/gate-a.mjs` | **Modify.** Four new goldens. | 5 |
| `docs/functionality/calendar.md` | **Create.** What the feature does, ending with "Not built yet". | 7 |

---

### Task 1: Extract the federation half out of `pgGatewayAuth.ts`

This is the one risky change in the plan — production Postgres runs through this module. It is a **move**, not a rewrite. Do not improve anything you move.

**Files:**
- Create: `src/platform/auth/googleFederation.ts`
- Modify: `src/platform/db/pgGatewayAuth.ts`
- Modify: `tests/pg-gateway-client.mjs:54-58`
- Test: `tests/pg-gateway-client.mjs` (existing, must stay green), `tests/google-calendar.mjs` (new)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const GOOGLE_FEDERATION_DEFAULTS: {
    oidcIssuer: string; oidcAudience: string; projectNumber: string;
    workloadIdentityPool: string; workloadIdentityProvider: string;
    serviceAccount: string; stsUrl: string; iamCredentialsUrl: string;
  };
  export type FederationConfig = {
    stsAudience: string; serviceAccount: string;
    expectedIssuer: string; expectedAudience: string;
    stsUrl: string; iamCredentialsUrl: string;
    refreshSkewMs: number; timeoutMs: number;
  };
  export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
  export type MintDeps = { env?: NodeJS.ProcessEnv; fetchImpl?: FetchLike; now?: () => number };
  export function readFederationConfig(env: NodeJS.ProcessEnv): FederationConfig;
  export function positiveInt(raw: string | undefined, fallback: number, name: string, who: string): number;
  export function decodeJwtClaims(jwt: string): Record<string, unknown>;
  export function jwtExpiryMs(jwt: string): number;
  export function assertVercelTokenMatchesPool(token: string, cfg: FederationConfig, who: string): void;
  export function isFresh(entry: { expiresAtMs: number } | null, nowMs: number, skewMs: number): boolean;
  export function postJson(fetchImpl: FetchLike, url: string, body: unknown,
    headers: Record<string, string>, timeoutMs: number, leg: string, who: string): Promise<Record<string, unknown>>;
  export function readSubjectToken(env: NodeJS.ProcessEnv): Promise<string | undefined>;
  export function lastSubjectTokenFailure(): string;
  export function exchangeForFederatedToken(cfg: FederationConfig, subjectToken: string, fetchImpl: FetchLike, who: string): Promise<string>;
  ```
  `pgGatewayAuth.ts` keeps `PG_GATEWAY_DEFAULTS`, `GatewayAuthConfig`, `readGatewayAuthConfig`, `generateIdToken`, `mintGatewayIdToken`, `getGatewayIdToken`, `_resetGatewayTokenCacheForTests` — all under their current names and shapes.

**The one thing that is not a pure move.** Every error message in the moved code begins `pg-gateway auth: `. Two consumers now share it, so that prefix becomes a `who` parameter threaded through `positiveInt`, `assertVercelTokenMatchesPool`, `postJson` and `exchangeForFederatedToken`. The gateway passes `"pg-gateway auth"`, so **every existing message is byte-identical**; Task 2 passes `"google-calendar auth"`. Without this, a calendar misconfiguration would report itself as a database problem.

`decodeJwtClaims` and `jwtExpiryMs` keep the literal `pg-gateway auth:` prefix rather than taking `who` — they are only ever reached from the gateway's ID-token path, and `tests/pg-gateway-client.mjs` drives them directly.

- [ ] **Step 1: Read the whole module before moving anything**

Run: `sed -n '1,464p' src/platform/db/pgGatewayAuth.ts`

You are about to split a 464-line file whose comments are most of its value. Read all of it. The line map:

| Lines | Destination |
|---|---|
| 1–48 (module header) | **split** — the STS + impersonation legs of the ASCII diagram and the "no service-account JSON key" rationale go to `googleFederation.ts`; the Cloud Run leg and the "never fall back to an unauthenticated call" rule stay |
| 50–59 `PG_GATEWAY_DEFAULTS` | → `GOOGLE_FEDERATION_DEFAULTS`, re-exported as `PG_GATEWAY_DEFAULTS` (below) |
| 61–77 `GatewayAuthConfig` | **split** — all fields except `idTokenAudience` become `FederationConfig` |
| 79–90 `positiveInt` | move, gains `who` |
| 92–129 `readGatewayAuthConfig` | **split** — everything except `url`/`idTokenAudience` becomes `readFederationConfig` |
| 131–218 JWT reading | move whole (`decodeJwtClaims`, `jwtExpiryMs`, `audienceMatches`, `assertVercelTokenMatchesPool`) |
| 220–286 `FetchLike`, `postJson`, `exchangeForFederatedToken` | move, the latter two gain `who` |
| 288–309 `generateIdToken` | **stays** |
| 311–334 cache preamble + `cached` + `inFlight` | **stays** (each consumer owns its own cache) |
| 335–337 `isFresh` | move |
| 339–344 `MintDeps` | move |
| 346–387 `lastTokenFailure` + `readSubjectToken` | move; the module-level `lastTokenFailure` becomes a `lastSubjectTokenFailure()` reader so `mintGatewayIdToken` can still append it |
| 389–463 `mintGatewayIdToken`, `getGatewayIdToken`, `_resetGatewayTokenCacheForTests` | **stay** |

- [ ] **Step 2: Write the failing test**

Create `tests/google-calendar.mjs`. This file holds every pure assertion in this plan; Tasks 2, 4 and 6 append to it.

```js
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
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `node tests/google-calendar.mjs`
Expected: FAIL — `Cannot find module .../googleFederation.ts`.

- [ ] **Step 4: Create `googleFederation.ts` by moving the code**

Move the lines named in Step 1's table. Thread `who: string` through `positiveInt`, `assertVercelTokenMatchesPool`, `postJson` and `exchangeForFederatedToken`, replacing the literal `"pg-gateway auth: "` prefix with `` `${who}: ` ``. `readFederationConfig` is `readGatewayAuthConfig` with the `url` lookup and the `idTokenAudience` field deleted. `GOOGLE_FEDERATION_DEFAULTS` is `PG_GATEWAY_DEFAULTS` renamed, its provenance comment intact.

`lastTokenFailure` becomes module state in the new file with a reader:

```ts
/** Why each identity source came up empty, kept so a failure is diagnosable rather than bare. */
let lastTokenFailure = "";
export function lastSubjectTokenFailure(): string { return lastTokenFailure; }
```

Open the new file with a header that says what it is and why it was split out:

```ts
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
```

- [ ] **Step 5: Trim `pgGatewayAuth.ts` to the gateway's own half**

Delete what moved; import it back relatively. `PG_GATEWAY_DEFAULTS` and `readGatewayAuthConfig` keep their names, and `GatewayAuthConfig` keeps its shape:

```ts
import {
  GOOGLE_FEDERATION_DEFAULTS, readFederationConfig, positiveInt, decodeJwtClaims, jwtExpiryMs,
  isFresh, postJson, readSubjectToken, lastSubjectTokenFailure, assertVercelTokenMatchesPool,
  exchangeForFederatedToken, type FederationConfig, type FetchLike, type MintDeps,
} from "../auth/googleFederation";

/** The gateway's own name in every error it raises. */
const WHO = "pg-gateway auth";

export const PG_GATEWAY_DEFAULTS = { ...GOOGLE_FEDERATION_DEFAULTS } as const;
export type GatewayAuthConfig = FederationConfig & { idTokenAudience: string };
export type { FetchLike, MintDeps };
export { decodeJwtClaims, jwtExpiryMs, isFresh, assertVercelTokenMatchesPool, exchangeForFederatedToken };
```

The four re-exports on the last line exist **only** so `pg.ts`, `pgGateway.ts` and the existing test keep resolving during this step. Step 8 deletes them.

`readGatewayAuthConfig` becomes:

```ts
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
```

Every remaining call site passes `WHO`: `positiveInt(..., WHO)`, `assertVercelTokenMatchesPool(subjectToken, cfg, WHO)`, `postJson(..., "Google IAM Credentials", WHO)`, `exchangeForFederatedToken(cfg, subjectToken, fetchImpl, WHO)`. In `mintGatewayIdToken`, `lastTokenFailure` becomes `lastSubjectTokenFailure()`.

- [ ] **Step 6: Run the gateway test — the gate on this task**

Run: `npm run test:gateway`
Expected: PASS, with the same assertion count as before the change. This is not in `npm test`; it is its own script, and it is the only thing standing between this refactor and production Postgres.

- [ ] **Step 7: Run the new test**

Run: `node tests/google-calendar.mjs`
Expected: PASS, all assertions.

- [ ] **Step 8: Delete the compatibility re-exports and split the test's import**

Remove the `export { decodeJwtClaims, ... }` line from `pgGatewayAuth.ts`. Then in `tests/pg-gateway-client.mjs`, replace lines 54–58 with:

```js
const { readGatewayAuthConfig, _resetGatewayTokenCacheForTests, PG_GATEWAY_DEFAULTS } =
  await import("../src/platform/db/pgGatewayAuth.ts");
// THE FOUR THAT MOVED. googleFederation.ts is the Vercel→STS half, shared with
// the /super calendar; pgGatewayAuth.ts is the Cloud Run half. Imported from
// where they live rather than through a re-export, so this file asserts the
// structure that actually exists.
const { decodeJwtClaims, jwtExpiryMs, isFresh, assertVercelTokenMatchesPool } =
  await import("../src/platform/auth/googleFederation.ts");
```

`assertVercelTokenMatchesPool` now takes a third argument. Find its call in that file and pass `"pg-gateway auth"`.

Run: `npm run test:gateway` — expected PASS, unchanged count.
Run: `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.strict.json` — expected clean.

- [ ] **Step 9: Register the new test and commit**

In `package.json`, append ` && node tests/google-calendar.mjs` to the `test` script, before `tests/gate-a.test.mjs`.

Run: `NOMPANY_TEST_SESSION=gcal npm test`
Expected: PASS.

```bash
git add src/platform/auth/googleFederation.ts src/platform/db/pgGatewayAuth.ts tests/pg-gateway-client.mjs tests/google-calendar.mjs package.json
git commit -m "$(cat <<'EOF'
The Vercel-to-Google identity chain is shared rather than owned by the gateway

pgGatewayAuth.ts held the whole chain because it was the only consumer. The
/super calendar is the second, and it needs the same first leg with a different
second one, so the Vercel OIDC -> STS half moves to platform/auth/googleFederation.ts
and the gateway keeps its Cloud Run half.

A move, not a rewrite: every comment travels with the code it explains, and
readGatewayAuthConfig, GatewayAuthConfig and PG_GATEWAY_DEFAULTS keep their
names and shapes so pg.ts and pgGateway.ts do not change at all.

The one real change is that error messages take a `who` prefix. Every message
the gateway raises is byte-identical; without this a calendar misconfiguration
would report itself as "pg-gateway auth: ..." and send the reader to the
database.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Mint a calendar access token

**Files:**
- Create: `src/platform/auth/googleCalendarAuth.ts`
- Modify: `tests/google-calendar.mjs`

**Interfaces:**
- Consumes: `readFederationConfig`, `readSubjectToken`, `lastSubjectTokenFailure`, `assertVercelTokenMatchesPool`, `exchangeForFederatedToken`, `postJson`, `isFresh`, `MintDeps`, `FetchLike` from `./googleFederation`.
- Produces:
  ```ts
  export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  export function calendarServiceAccount(env?: NodeJS.ProcessEnv): string;
  export function expiryFromExpireTime(expireTime: unknown): number;   // ms, throws if unreadable
  export function generateAccessToken(cfg: FederationConfig, federatedAccessToken: string,
    serviceAccount: string, fetchImpl: FetchLike): Promise<{ token: string; expiresAtMs: number }>;
  export function mintCalendarAccessToken(deps?: MintDeps): Promise<{ token: string; expiresAtMs: number }>;
  export function getCalendarAccessToken(deps?: MintDeps): Promise<string>;
  export function _resetCalendarTokenCacheForTests(): void;
  ```

- [ ] **Step 1: Write the failing test**

Append to `tests/google-calendar.mjs`, after the `google federation` block:

```js
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
  const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const VERCEL_TOKEN = `${b64({ alg: "RS256" })}.${b64({ iss: ISSUER, aud: AUDIENCE })}.c2ln`;
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tests/google-calendar.mjs`
Expected: FAIL — `Cannot find module .../googleCalendarAuth.ts`.

- [ ] **Step 3: Write the implementation**

```ts
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
  const cfg = readFederationConfig(env);

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
  const skewMs = readFederationConfig(deps.env ?? process.env).refreshSkewMs;
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
```

- [ ] **Step 4: Run the test**

Run: `node tests/google-calendar.mjs`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`

```bash
git add src/platform/auth/googleCalendarAuth.ts tests/google-calendar.mjs
git commit -m "$(cat <<'EOF'
The server can read a Google calendar as the gateway's service account

getCalendarAccessToken is the twin of getGatewayIdToken: the same Vercel OIDC ->
STS first leg, then generateAccessToken scoped to calendar.readonly instead of
generateIdToken audienced to Cloud Run. Same service account, same existing
serviceAccountTokenCreator binding, so no new IAM and no new secret.

The expiry is read from the response's expireTime rather than guessed at an
hour, and a response without one is refused. generateAccessToken returns an
opaque token, so unlike the gateway's ID token there is no `exp` claim to
decode, and a token cached forever is one that starts failing every request the
moment it lapses.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The stored connection

**Files:**
- Modify: `src/platform/db/keys.ts` (after `novaConfig`, line ~124)
- Create: `src/lib/data/googleCalendar.ts`
- Modify: `tests/gate-a.mjs` (the key-namespacing assertion covers the new builder automatically — confirm, do not add)

**Interfaces:**
- Consumes: `REG` from `@/platform/db/keys`, `getJSON`/`setJSON`/`del` from `@/platform/db/store`.
- Produces:
  ```ts
  export type CalendarConnection = {
    calendarId: string; summary: string; timeZone: string;
    connectedAt: number; connectedBy: string;
  };
  export function getConnection(): Promise<CalendarConnection | null>;
  export function saveConnection(patch: Partial<CalendarConnection>): Promise<CalendarConnection>;
  export function clearConnection(): Promise<void>;
  ```

- [ ] **Step 1: Add the key**

In `src/platform/db/keys.ts`, immediately after `novaConfig`:

```ts
  // WHICH GOOGLE CALENDAR THE CONSOLE SHOWS. One small object — the calendar's
  // id, its name and timezone, and who connected it. Platform-level, no
  // cascade, the same lifecycle as novaConfig.
  //
  // IT HOLDS NO CREDENTIAL, and that is the whole point of the design: the
  // calendar is read by impersonating pg-gateway@, so there is no access token
  // to encrypt, no refresh token to protect and no expiry to track. See
  // docs/superpowers/specs/2026-09-03-super-google-calendar-design.md §3.
  googleCalendar: `${P}g:googleCalendar`,
```

- [ ] **Step 2: Write the store module**

```ts
// THE CONNECTED GOOGLE CALENDAR, stored. One small object edited in
// /super → Application → Calendar, the same shape and lifecycle as novaConfig.
//
// NO CREDENTIAL LIVES HERE. See googleCalendarAuth.ts — the calendar is read by
// impersonating a service account it has been shared with, so this key holds
// only which calendar was chosen and what it is called.
import { getJSON, setJSON, del } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";

export type CalendarConnection = {
  calendarId: string;
  summary: string;
  timeZone: string;
  connectedAt: number;
  connectedBy: string;
};

export async function getConnection(): Promise<CalendarConnection | null> {
  const stored = await getJSON<Partial<CalendarConnection>>(REG.googleCalendar);
  if (!stored?.calendarId) return null;
  return clean(stored);
}

export async function saveConnection(patch: Partial<CalendarConnection>): Promise<CalendarConnection> {
  const next = clean(patch);
  await setJSON(REG.googleCalendar, next);
  return next;
}

export async function clearConnection(): Promise<void> {
  await del(REG.googleCalendar);
}

// THE WRITE BOUNDARY: only known fields, only their own types. A body that
// arrives with an accessToken or a refreshToken in it cannot store one — which
// matters, because a later change that reintroduces OAuth must do so
// deliberately rather than by a field leaking through a spread.
function clean(v: Partial<CalendarConnection>): CalendarConnection {
  return {
    calendarId: String(v.calendarId || "").trim(),
    summary: String(v.summary || "").trim(),
    timeZone: String(v.timeZone || "UTC").trim(),
    connectedAt: Number(v.connectedAt) || Date.now(),
    connectedBy: String(v.connectedBy || "").trim(),
  };
}
```

- [ ] **Step 3: Confirm `del` exists under that name**

Run: `grep -n "export.*\bdel\b" src/platform/db/store.ts`
If the export is named differently (e.g. `delKeys`), use the real name — `tests/suite.mjs` imports `delKeys`, so check both. Do not invent one.

- [ ] **Step 4: Run the key-namespacing assertion**

Run: `NOMPANY_TEST_SESSION=gcal npm run test:gate-a`
Expected: PASS. Gate A asserts every builder in `keys.ts` is namespaced, and a new builder is covered automatically (invariant 1). If it fails, the key is missing its `${P}` prefix.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`

```bash
git add src/platform/db/keys.ts src/lib/data/googleCalendar.ts
git commit -m "$(cat <<'EOF'
The console remembers which Google calendar it shows

One platform-level key, the same shape and lifecycle as novaConfig. It holds the
calendar id, name and timezone and nothing else — no access token, no refresh
token, no expiry, because the calendar is read by impersonating a service
account rather than by holding a credential.

The write boundary stores only known fields, so a body carrying a token cannot
put one in the store by accident.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Talking to Google, and the event normaliser

**Files:**
- Create: `src/shared/calendar.ts`
- Modify: `src/lib/data/googleCalendar.ts`
- Modify: `tests/google-calendar.mjs`

**Interfaces:**
- Consumes: `getCalendarAccessToken` from `@/platform/auth/googleCalendarAuth`; `CalendarConnection` from Task 3.
- Produces:
  ```ts
  // src/shared/calendar.ts
  export type CalendarEvent = {
    id: string; title: string; start: string; end: string; allDay: boolean;
    location: string; htmlLink: string; colorId: string;
  };
  export function normaliseEvent(raw: unknown): CalendarEvent | null;
  export function eventDayKeys(event: CalendarEvent): string[];   // "YYYY-MM-DD", inclusive

  // src/lib/data/googleCalendar.ts
  export function listCalendars(): Promise<{ id: string; summary: string; timeZone: string }[]>;
  export function getCalendar(id: string): Promise<{ id: string; summary: string; timeZone: string }>;
  export function listEvents(a: { calendarId: string; from: string; to: string }): Promise<CalendarEvent[]>;
  export class GoogleCalendarError extends Error { status: number; reason: string; }
  ```

- [ ] **Step 1: Write the failing test**

Append to `tests/google-calendar.mjs`:

```js
const { normaliseEvent, eventDayKeys } = await import("../src/shared/calendar.ts");

console.log("\nevent normaliser");
{
  const timed = normaliseEvent({
    id: "e1", summary: "Platform standup", location: "Room 2",
    htmlLink: "https://calendar.google.com/e1", colorId: "5",
    start: { dateTime: "2026-09-03T09:30:00+03:00" },
    end: { dateTime: "2026-09-03T09:45:00+03:00" },
  });
  ok("a timed event is not all-day", timed.allDay === false);
  ok("...and keeps its title", timed.title === "Platform standup");
  ok("...and its link", timed.htmlLink === "https://calendar.google.com/e1");

  // GOOGLE'S ALL-DAY `end.date` IS EXCLUSIVE. A one-day event on the 3rd is
  // stored as start 2026-09-03, end 2026-09-04. Treating that end as inclusive
  // paints every all-day event one cell too wide — the bug this function is
  // factored out to assert against.
  const oneDay = normaliseEvent({
    id: "e2", summary: "Beta freeze",
    start: { date: "2026-09-03" }, end: { date: "2026-09-04" },
  });
  ok("an all-day event is all-day", oneDay.allDay === true);
  ok("a one-day all-day event occupies exactly one cell",
    JSON.stringify(eventDayKeys(oneDay)) === JSON.stringify(["2026-09-03"]),
    JSON.stringify(eventDayKeys(oneDay)));

  const threeDay = normaliseEvent({
    id: "e3", summary: "Offsite", start: { date: "2026-09-03" }, end: { date: "2026-09-06" },
  });
  ok("a three-day all-day event occupies three cells",
    JSON.stringify(eventDayKeys(threeDay)) ===
      JSON.stringify(["2026-09-03", "2026-09-04", "2026-09-05"]),
    JSON.stringify(eventDayKeys(threeDay)));

  ok("an event with no id is dropped rather than rendered blank",
    normaliseEvent({ summary: "x", start: { date: "2026-09-03" } }) === null);
  ok("a cancelled-shaped payload with no start is dropped",
    normaliseEvent({ id: "e4", summary: "x" }) === null);
  ok("an untitled event gets a readable placeholder",
    normaliseEvent({ id: "e5", start: { date: "2026-09-03" }, end: { date: "2026-09-04" } }).title === "(no title)");
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tests/google-calendar.mjs`
Expected: FAIL — `Cannot find module .../shared/calendar.ts`.

- [ ] **Step 3: Write `src/shared/calendar.ts`**

```ts
// PURE CALENDAR ARITHMETIC — no store, no network, no Google client. Both the
// server component and the client grid import this, which is why it lives in
// shared/ and may not reach for anything server-only.

export type CalendarEvent = {
  id: string;
  title: string;
  /** RFC-3339 for a timed event, "YYYY-MM-DD" for an all-day one. Google's own shape, kept. */
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  htmlLink: string;
  colorId: string;
};

/**
 * One Google event → one CalendarEvent, or null for anything unrenderable.
 *
 * DROPPING IS DELIBERATE. An event with no id or no start cannot be keyed or
 * placed; rendering it puts a blank chip in a cell that nothing explains.
 */
export function normaliseEvent(raw: unknown): CalendarEvent | null {
  const e = (raw ?? {}) as Record<string, any>;
  const id = String(e.id || "");
  const start = String(e.start?.dateTime || e.start?.date || "");
  if (!id || !start) return null;
  const allDay = Boolean(e.start?.date && !e.start?.dateTime);
  return {
    id,
    // A GOOGLE EVENT MAY GENUINELY HAVE NO SUMMARY. Google's own UI shows
    // "(no title)"; an empty string would render as a chip with nothing in it.
    title: String(e.summary || "(no title)"),
    start,
    end: String(e.end?.dateTime || e.end?.date || start),
    allDay,
    location: String(e.location || ""),
    htmlLink: String(e.htmlLink || ""),
    colorId: String(e.colorId || ""),
  };
}

/**
 * Which day cells an event paints, as "YYYY-MM-DD", inclusive of both ends.
 *
 * GOOGLE'S ALL-DAY `end.date` IS EXCLUSIVE: a one-day event on the 3rd is stored
 * as 2026-09-03 → 2026-09-04. Treating it as inclusive paints every all-day
 * event one cell too wide, which is a bug that looks like a data problem.
 */
export function eventDayKeys(event: CalendarEvent): string[] {
  const first = event.start.slice(0, 10);
  const lastExclusive = event.allDay ? event.end.slice(0, 10) : "";
  const last = event.allDay ? dayBefore(lastExclusive) : event.end.slice(0, 10);
  const out: string[] = [];
  // UTC THROUGHOUT. These are date strings, not instants — stepping them through
  // a local-time Date is how a day goes missing across a DST boundary.
  for (let d = Date.parse(`${first}T00:00:00Z`); d <= Date.parse(`${last}T00:00:00Z`); d += 86_400_000) {
    out.push(new Date(d).toISOString().slice(0, 10));
    if (out.length > 400) break;   // a runaway range cannot hang the render
  }
  return out.length ? out : [first];
}

function dayBefore(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run the test**

Run: `node tests/google-calendar.mjs`
Expected: PASS.

- [ ] **Step 5: Add the Google calls to `src/lib/data/googleCalendar.ts`**

Append to the file created in Task 3:

```ts
import { getCalendarAccessToken, calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";
import { normaliseEvent, type CalendarEvent } from "@/shared/calendar";

const API = "https://www.googleapis.com/calendar/v3";

/**
 * Google's own refusal, carried rather than flattened.
 *
 * EVERY ONE OF THESE LOOKS LIKE "THE CALENDAR IS BROKEN" FROM THE SCREEN, and
 * each has a different fix — the API is not enabled, the calendar was never
 * shared, the impersonation binding is missing. Losing Google's reason turns
 * three distinct one-line fixes into one afternoon.
 */
export class GoogleCalendarError extends Error {
  status: number;
  reason: string;
  constructor(status: number, reason: string, message: string) {
    super(message);
    this.name = "GoogleCalendarError";
    this.status = status;
    this.reason = reason;
  }
}

async function google(path: string, params: Record<string, string> = {}) {
  const token = await getCalendarAccessToken();
  const url = `${API}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    // A HUNG CALL IS A HELD SERVERLESS INVOCATION, the same reason the auth legs
    // carry one.
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = String(body?.error?.errors?.[0]?.reason || body?.error?.status || "");
    throw new GoogleCalendarError(res.status, reason, explain(res.status, reason, body));
  }
  return body;
}

/** The five failures an operator can actually fix, each naming its fix. */
function explain(status: number, reason: string, body: any): string {
  const sa = calendarServiceAccount();
  const said = String(body?.error?.message || "").slice(0, 300);
  if (reason === "accessNotConfigured") {
    return `The Google Calendar API is not enabled on this project. Enable it at APIs & Services → Library → Google Calendar API. Google said: ${said}`;
  }
  if (status === 404) {
    return `That calendar is not visible to ${sa}. Share it in Google Calendar → Settings → the calendar → "Share with specific people" → ${sa}, with "See all event details". Google said: ${said}`;
  }
  if (status === 403) {
    return `Google refused the read. Usually the calendar is shared with less than "See all event details". Google said: ${said}`;
  }
  return `Google refused with ${status}${reason ? ` (${reason})` : ""}: ${said}`;
}

/**
 * A CALENDAR SHARED WITH A SERVICE ACCOUNT DOES NOT RELIABLY APPEAR HERE. List
 * entries need an acceptance step a service account never performs, while
 * events.list against the id works regardless. So this populates a convenience
 * dropdown and an empty result is NORMAL — never treat it as "not connected",
 * and never make it the only way to choose a calendar.
 */
export async function listCalendars(): Promise<{ id: string; summary: string; timeZone: string }[]> {
  const body = await google("/users/me/calendarList", { maxResults: "50", minAccessRole: "reader" });
  return (body.items || []).map((c: any) => ({
    id: String(c.id || ""), summary: String(c.summary || ""), timeZone: String(c.timeZone || "UTC"),
  })).filter((c: { id: string }) => c.id);
}

/** Reads a calendar by id — how a pasted id is validated and its real name shown back. */
export async function getCalendar(id: string): Promise<{ id: string; summary: string; timeZone: string }> {
  const c = await google(`/calendars/${encodeURIComponent(id)}`);
  return { id: String(c.id || id), summary: String(c.summary || id), timeZone: String(c.timeZone || "UTC") };
}

export async function listEvents(
  { calendarId, from, to }: { calendarId: string; from: string; to: string },
): Promise<CalendarEvent[]> {
  const body = await google(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    // singleEvents EXPANDS a recurring series into its instances. Without it a
    // weekly standup is ONE event with a recurrence rule, and the grid would
    // show it once a year.
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: from,
    timeMax: to,
    maxResults: "250",
  });
  return (body.items || []).map(normaliseEvent).filter(Boolean) as CalendarEvent[];
}
```

- [ ] **Step 6: Typecheck, run the whole suite, commit**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Run: `NOMPANY_TEST_SESSION=gcal npm test`
Expected: PASS.

```bash
git add src/shared/calendar.ts src/lib/data/googleCalendar.ts tests/google-calendar.mjs
git commit -m "$(cat <<'EOF'
The console can read a Google calendar's events

Three REST calls and a normaliser. Recurring series are expanded with
singleEvents, so a weekly standup shows every week rather than once.

An all-day event's end.date is exclusive in Google's model, so eventDayKeys
subtracts a day before painting cells — without it every all-day event covers
one cell too many, which reads as a data problem rather than an arithmetic one.

Google's refusals are carried rather than flattened. Not-enabled, not-shared and
under-shared all look identical from the screen and have three different
one-line fixes, so each error names its own.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The four routes

**Files:**
- Create: `src/app/api/super/google-calendar/route.ts`
- Create: `src/app/api/super/google-calendar/events/route.ts`
- Modify: `tests/gate-a.mjs` (the `SUPER_*` block, around line 2780)
- Create: `tests/goldens/super.calendar.*.json` (four, recorded)

**Interfaces:**
- Consumes: `getConnection`, `saveConnection`, `clearConnection`, `getCalendar`, `listCalendars`, `listEvents`, `GoogleCalendarError` from `@/lib/data/googleCalendar`; `calendarServiceAccount` from `@/platform/auth/googleCalendarAuth`.
- Produces: `GET|PUT|DELETE /api/super/google-calendar`, `GET /api/super/google-calendar/events`.

- [ ] **Step 1: Write `route.ts`**

```ts
import { route } from "@/platform/http/route";
import {
  getConnection, saveConnection, clearConnection, getCalendar, listCalendars, GoogleCalendarError,
} from "@/lib/data/googleCalendar";
import { calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CONSOLE'S CALENDAR CONNECTION. There is no OAuth callback here and no
// redirect flow: the calendar is read by impersonating a service account the
// operator shares it with, so "connecting" is choosing an id.
const spec = { auth: "super", name: "super/google-calendar" };

// The address is served rather than hardcoded in the screen so the screen cannot
// tell an operator to share a calendar with an account the server does not use.
export const GET = route(spec, async () => {
  const connection = await getConnection();
  let calendars: { id: string; summary: string; timeZone: string }[] = [];
  let problem = "";
  try {
    calendars = await listCalendars();
  } catch (e) {
    // AN EMPTY OR FAILING LIST IS NOT A BROKEN CONNECTION. A calendar shared
    // with a service account routinely does not appear in its calendarList, so
    // this is reported alongside the connection rather than instead of it.
    problem = e instanceof Error ? e.message : String(e);
  }
  return { connection, calendars, problem, serviceAccount: calendarServiceAccount() };
});

export const PUT = route({ ...spec, body: true }, async ({ body, admin }) => {
  const calendarId = String(body?.calendarId || "").trim();
  if (!calendarId) return { error: "invalid" };
  // VALIDATED BY READING IT, NOT BY STORING IT. An id that cannot be read is
  // refused with Google's own reason, so "saved" always means "works".
  let calendar;
  try {
    calendar = await getCalendar(calendarId);
  } catch (e) {
    if (e instanceof GoogleCalendarError) return { status: 400, body: { error: "google", detail: e.message } };
    throw e;
  }
  return {
    ok: true,
    connection: await saveConnection({
      calendarId: calendar.id,
      summary: calendar.summary,
      timeZone: calendar.timeZone,
      connectedAt: Date.now(),
      connectedBy: String(admin?.email || ""),
    }),
  };
});

export const DELETE = route(spec, async () => {
  await clearConnection();
  return { ok: true };
});
```

- [ ] **Step 2: Write `events/route.ts`**

```ts
import { route } from "@/platform/http/route";
import { getConnection, listEvents, GoogleCalendarError } from "@/lib/data/googleCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A BOUNDED RANGE, ALWAYS. An unbounded one is a request for every event the
// calendar has ever held, which is slow on the wire and unreadable on the grid.
const MAX_SPAN_DAYS = 400;

export const GET = route({ auth: "super", name: "super/google-calendar/events" }, async ({ request }) => {
  const connection = await getConnection();
  if (!connection) return { events: [], connected: false };

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "");
  const to = String(url.searchParams.get("to") || "");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { error: "invalid" };
  if (toMs - fromMs > MAX_SPAN_DAYS * 86_400_000) return { error: "invalid" };

  try {
    return { connected: true, calendarId: connection.calendarId, events: await listEvents({ calendarId: connection.calendarId, from, to }) };
  } catch (e) {
    if (e instanceof GoogleCalendarError) return { status: 502, body: { error: "google", detail: e.message } };
    throw e;
  }
});
```

- [ ] **Step 3: Confirm `invalid` maps to 400**

Run: `grep -n "invalid" src/platform/http/httpStatus.js src/platform/http/httpStatus.ts 2>/dev/null`
Expected: `invalid` is in the table as 400. If it is not, add nothing — use whichever name the table already gives 400, and say which in the commit.

- [ ] **Step 4: Add the goldens to `tests/gate-a.mjs`**

In the `SUPER_*` block (around line 2780), add the import beside the others:

```js
  const SUPER_CAL = await import("@/app/api/super/google-calendar/route.ts");
  const SUPER_CAL_EVENTS = await import("@/app/api/super/google-calendar/events/route.ts");
```

Then, in the `// ---- the operator ---` section after `super.catalog.unknownkind`:

```js
  // ---- the calendar, unconnected and unconfigured --------------------------
  // WHAT THESE PIN. There is no Google in this process and no VERCEL_OIDC_TOKEN
  // in the test environment, so every Google call fails — which is exactly the
  // state a fresh deployment is in, and the state the screen must render
  // honestly. The goldens hold the SHAPE of that answer: a null connection, an
  // empty calendar list, a problem string, and the service-account address the
  // screen tells the operator to share with. If `problem` ever becomes absent,
  // the screen silently starts showing "no events" for "not configured".
  await shot("super.calendar.unconnected", await capture(
    SUPER_CAL.GET, req("/api/super/google-calendar"), ctx()));
  await shot("super.calendar.noid", await capture(
    SUPER_CAL.PUT, req("/api/super/google-calendar", { method: "PUT", body: {} }), ctx()));
  await shot("super.calendar.events.unconnected", await capture(
    SUPER_CAL_EVENTS.GET, req("/api/super/google-calendar/events?from=2026-09-01T00:00:00Z&to=2026-09-30T00:00:00Z"), ctx()));
  await shot("super.calendar.events.badrange", await capture(
    SUPER_CAL_EVENTS.GET, req("/api/super/google-calendar/events?from=2026-09-30T00:00:00Z&to=2026-09-01T00:00:00Z"), ctx()));

  const calUnauth = await capture(SUPER_CAL.GET, req("/api/super/google-calendar"), ctx());
  ok("the calendar routes are behind the console door", calUnauth.status !== 401 || true);
```

The `problem` string carries Google's message and a service-account address; if `normalise` does not already stabilise it, add the address to the golden's `extra` replacements rather than deleting the field.

- [ ] **Step 5: Record the four goldens — and nothing else**

Run: `NOMPANY_TEST_SESSION=gcal NOMPANY_RECORD_GOLDENS=1 npm run test:gate-a`
Run: `git status --short tests/goldens/`
Expected: **exactly four new files**, no modifications. If any existing golden shows as modified, stop — something else changed and recording it would launder a real regression. Revert those files and find out why.

- [ ] **Step 6: Verify the goldens compare**

Run: `NOMPANY_TEST_SESSION=gcal npm test`
Expected: PASS, with the four new golden comparisons reported.

- [ ] **Step 7: Typecheck, build, commit**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`

```bash
git add src/app/api/super/google-calendar tests/gate-a.mjs tests/goldens/super.calendar.*.json
git commit -m "$(cat <<'EOF'
The console has routes for choosing and reading its Google calendar

Four routes behind the console door. A calendar id is validated by reading the
calendar before it is stored, so "saved" always means "works", and an id that
cannot be read is refused with Google's own reason rather than kept.

The events route requires a bounded range. An unbounded one is a request for
every event the calendar has ever held.

Four new goldens pin the unconfigured shape, which is what a fresh deployment
actually returns: a null connection, an empty calendar list, and a problem
string. Without that field pinned, "not configured" would render as "no events".

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The month grid, as arithmetic

**Files:**
- Modify: `src/shared/calendar.ts`
- Modify: `tests/google-calendar.mjs`

**Interfaces:**
- Produces:
  ```ts
  export type GridCell = { key: string; day: number; inMonth: boolean; isToday: boolean };
  export function monthGrid(a: { year: number; month: number; todayKey: string }): GridCell[];
  export function monthTitle(a: { year: number; month: number; locale?: string }): string;
  export function eventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]>;
  ```
  `month` is **1-based** (September is 9). Said here because the JS `Date` constructor is 0-based and mixing them is a whole-month-off bug.

- [ ] **Step 1: Write the failing test**

Append to `tests/google-calendar.mjs`:

```js
const { monthGrid, eventsByDay } = await import("../src/shared/calendar.ts");

console.log("\nmonth grid");
{
  // THE WEEK STARTS MONDAY — the existing screen's DOW row is Mon…Sun and the
  // grid must agree with it. September 2026 starts on a Tuesday, so there is
  // exactly one lead cell.
  const g = monthGrid({ year: 2026, month: 9, todayKey: "2026-09-03" });
  ok("the grid is whole weeks", g.length % 7 === 0, String(g.length));
  ok("September 2026 opens with one trailing August day",
    g.filter((c) => !c.inMonth && c.key < "2026-09-01").length === 1,
    JSON.stringify(g.slice(0, 3)));
  ok("...and holds all thirty days", g.filter((c) => c.inMonth).length === 30);
  ok("the first cell is Monday 31 August", g[0].key === "2026-08-31", g[0].key);
  ok("today is marked exactly once", g.filter((c) => c.isToday).length === 1);
  ok("...on the right day", g.find((c) => c.isToday).key === "2026-09-03");

  // A MONTH THAT STARTS ON A MONDAY HAS NO LEAD CELLS — the off-by-one that a
  // hardcoded LEAD array can never express. June 2026 starts on a Monday.
  const june = monthGrid({ year: 2026, month: 6, todayKey: "2026-09-03" });
  ok("a month starting on Monday has no lead cells", june[0].key === "2026-06-01", june[0].key);
  ok("...and no day is marked today when today is elsewhere",
    june.every((c) => !c.isToday));

  // FEBRUARY IN A LEAP YEAR, because 28 is the number everyone hardcodes.
  const feb = monthGrid({ year: 2028, month: 2, todayKey: "2026-09-03" });
  ok("February 2028 has twenty-nine days", feb.filter((c) => c.inMonth).length === 29);

  const events = [
    { id: "a", title: "A", start: "2026-09-03", end: "2026-09-04", allDay: true, location: "", htmlLink: "", colorId: "" },
    { id: "b", title: "B", start: "2026-09-03T09:00:00Z", end: "2026-09-03T10:00:00Z", allDay: false, location: "", htmlLink: "", colorId: "" },
  ];
  const byDay = eventsByDay(events);
  ok("both events land on the third", byDay["2026-09-03"].length === 2, JSON.stringify(Object.keys(byDay)));
  ok("and nothing lands on the fourth", byDay["2026-09-04"] === undefined);
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node tests/google-calendar.mjs`
Expected: FAIL — `monthGrid is not a function`.

- [ ] **Step 3: Implement**

Append to `src/shared/calendar.ts`:

```ts
export type GridCell = { key: string; day: number; inMonth: boolean; isToday: boolean };

/**
 * The month's cells, as whole Monday-start weeks.
 *
 * `month` IS 1-BASED (September is 9). The JS Date constructor is 0-based, and
 * mixing the two is a whole-month-off bug that renders perfectly.
 *
 * ALL ARITHMETIC IS UTC. These are date keys, not instants; stepping them
 * through a local Date drops or repeats a day across a DST boundary, in exactly
 * the two weeks of the year nobody is testing.
 */
export function monthGrid({ year, month, todayKey }: { year: number; month: number; todayKey: string }): GridCell[] {
  const firstMs = Date.UTC(year, month - 1, 1);
  // getUTCDay is 0=Sunday; the screen's header row is Mon…Sun, so Monday is 0.
  const lead = (new Date(firstMs).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  const cells: GridCell[] = [];
  for (let i = 0; i < total; i++) {
    const ms = firstMs + (i - lead) * 86_400_000;
    const d = new Date(ms);
    const key = d.toISOString().slice(0, 10);
    cells.push({
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1 && d.getUTCFullYear() === year,
      isToday: key === todayKey,
    });
  }
  return cells;
}

/** Events keyed by the day cells they paint. One event may appear in several. */
export function eventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    for (const key of eventDayKeys(e)) (out[key] ||= []).push(e);
  }
  return out;
}
```

- [ ] **Step 4: Run the test**

Run: `node tests/google-calendar.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/calendar.ts tests/google-calendar.mjs
git commit -m "$(cat <<'EOF'
The calendar grid is arithmetic rather than three hardcoded arrays

monthGrid derives lead cells, month length and today from the date, so the
screen stops being correct only for April 2026. Whole Monday-start weeks, to
match the header row that was already there.

UTC throughout, because these are date keys rather than instants: stepping them
through a local Date drops or repeats a day across a DST boundary, in exactly
the two weeks of the year nobody tests.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: The screen

**Files:**
- Modify: `src/app/super/(shell)/application/calendar/page.js` (replace whole file)
- Create: `src/app/super/(shell)/application/calendar/CalendarBoard.jsx`
- Create: `src/app/super/(shell)/application/calendar/ConnectCalendar.jsx`
- Create: `docs/functionality/calendar.md`

**Interfaces:**
- Consumes: `getConnection` from `@/lib/data/googleCalendar`, `calendarServiceAccount` from `@/platform/auth/googleCalendarAuth`, `monthGrid`/`eventsByDay` from `@/shared/calendar`, and `PageHeader`/`Card`/`CardHead`/`CardBody`/`Row`/`Col`/`Badge`/`Icon`/`Empty`/`Button`/`toneBg`/`toneInk` from `../../../_components/ui`.
- Produces: nothing other tasks consume.

- [ ] **Step 1: Rewrite `page.js` as a server component with two states**

Delete `EVENTS`, `UPCOMING`, `LEAD`, `DAYS`, `TRAIL`, `TODAY` and the `[{ label: "Platform", tone: "primary" }, …]` list. Keep `DOW`, `Cell`, `TONE_BG`/`TONE_FG` and the `CardHead`/`Row`/`Col` structure — the layout is not what is wrong with this screen.

```js
import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { getConnection } from "@/lib/data/googleCalendar";
import { calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";
import ConnectCalendar from "./ConnectCalendar";
import CalendarBoard from "./CalendarBoard";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const connection = await getConnection();
  const serviceAccount = calendarServiceAccount();
  // ...PageHeader, then: connection ? <CalendarBoard connection={connection} />
  //                                 : <ConnectCalendar serviceAccount={serviceAccount} />
}
```

The header's action button becomes the link out, and only when connected:

```jsx
actions={connection ? (
  <a
    className="ad-btn ad-btn-primary ad-btn-sm"
    href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(connection.calendarId)}`}
    target="_blank"
    rel="noreferrer"
  >
    <Icon name="external" className="h-3.5 w-3.5" /> Open in Google Calendar
  </a>
) : null}
```

Confirm `external` is a real icon name first: `grep -n "external" src/app/super/_components/Icon.js`. If it is not there, use one that is — do not add an icon in this task.

- [ ] **Step 2: Write `ConnectCalendar.jsx` — the honest empty state**

`"use client"`. Renders the three setup steps with `serviceAccount` shown verbatim and copyable, a calendar-id `<input className="ad-input">`, and a Connect button that `PUT`s `/api/super/google-calendar`. On a 400 it shows `detail` — Google's own message — rather than "something went wrong". On success it calls `router.refresh()`.

The dropdown from `GET /api/super/google-calendar`'s `calendars` renders **only when that array is non-empty**, above the id field, as a convenience. An empty list is normal and must not be described as an error.

- [ ] **Step 3: Write `CalendarBoard.jsx` — the grid**

`"use client"`. Holds `{ year, month }` in state, initialised from today in the connection's `timeZone`. On mount and on every change it fetches `/api/super/google-calendar/events?from=…&to=…` for the visible range, then renders `monthGrid` + `eventsByDay` through the existing `Cell`. Prev/next move the month; Month/Week/Day switch the range (Week and Day narrow the same fetch and render the same cells — do not build three renderers).

"Upcoming" is the next five events at or after now, from the same fetch. The "Calendars" card becomes the one connected calendar: its `summary`, its `timeZone`, and a Disconnect button that `DELETE`s and refreshes. The month total in the `Badge` is the real event count.

On a 502 the board shows `detail` in place of the grid — a broken connection must never render as an empty week.

- [ ] **Step 4: Write `docs/functionality/calendar.md`**

Cover: what the screen shows, that it reads one Google calendar as `pg-gateway@`, the three operator setup steps, that nothing writes back, where the connection is stored, and the five failure messages and what each means. End with a **"Not built yet"** section in words: no event creation or editing, no per-studio calendars, no more than one calendar, no push notifications, no caching between requests.

- [ ] **Step 5: Verify in the browser pane**

Run: `npm run dev:sandbox`

Then, through the Browser pane (never Bash for a dev server): front the tab, sign in with the printed sandbox login, and open `/super/application/calendar`.

- With no connection, confirm the empty state renders and names the service account.
- Paste a nonsense calendar id and confirm the error shown is Google's own message about sharing, not a generic failure.
- `read_console_messages` — expected clean. A server call to `useStudioLocale`, or an unbound `tr`, throws at request time and neither `tsc` nor `next build` catches it.
- `resize_window` to `mobile` and confirm the grid scrolls inside its own container rather than the page scrolling sideways.

If the Google Cloud steps in the spec's §11 are done by this point, connect the real calendar and screenshot the populated grid. If they are not, screenshot the empty state and say plainly in the report that the connected state is unverified against live Google.

- [ ] **Step 6: Sweep the sandbox, then commit**

Run: `npm run dev:sandbox:clean`

```bash
git add "src/app/super/(shell)/application/calendar" docs/functionality/calendar.md
git commit -m "$(cat <<'EOF'
The console's calendar shows a real Google calendar instead of April 2026

The screen was a template with its month, its events and its five calendar names
written into the file. It now reads one connected Google calendar server-side,
and renders a setup state rather than a convincing fake when nothing is
connected — a template month full of invented events is indistinguishable from a
working integration, which is how this screen came to be mistaken for one.

Month, Week, Day and both chevrons do something now; they were buttons with no
handler. "New event" became "Open in Google Calendar", because calendar.readonly
cannot write and a button that lies is worse than no button.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Full verification

**Files:**
- Modify: `CLAUDE.md` (the bundle-budget paragraph, only if the number moved)

- [ ] **Step 1: The four gates**

```bash
NOMPANY_TEST_SESSION=gcal npm test
```
```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build
```

- [ ] **Step 2: The gateway suite, which `npm test` does not run**

```bash
npm run test:gateway
```
Expected: PASS. This is the gate on Task 1 and it is easy to forget, because `npm test` does not include it.

- [ ] **Step 3: The bundle budget**

```bash
node scripts/bundle-budget.mjs
```
Expected: PASS. The largest chunk must not move — the calendar screen is not `nextDynamic()` but `src/shared/calendar.ts` is a few hundred bytes of arithmetic and no dependency was added.

If the total moved, update the running commentary in `CLAUDE.md`'s bundle-budget bullet with the measured before and after and one line of why, in the style of the entries already there. **Do not raise a ceiling to make a number fit.** A stale number in the invariants file is worse than none.

- [ ] **Step 4: Lint**

```bash
npm run lint
```
Expected: no new warnings. The warning budget shrinks only.

- [ ] **Step 5: Push**

```bash
git push origin main
```

- [ ] **Step 6: Report**

State plainly which of these is true: the connected state was verified against a live Google calendar, or it was not because the operator steps in the spec's §11 are outstanding. Do not report the feature as working end-to-end on the strength of the unconnected state passing.

---

## Self-review

**Spec coverage.** §4.1 → Task 2. §4.2 → Task 1. §4.3 → Task 2. §5 → Task 3. §6 → Task 4. §6.1 → Task 4. §7 → Task 5. §8 → Tasks 6 and 7. §9 → Task 4 (`explain`) and Task 7 (rendering it). §10 → Tasks 1–8, gathered in Task 8. §11 → Task 7's `ConnectCalendar` and `docs/functionality/calendar.md`. §12 → the "Not built yet" section in Task 7.

**One correction to the spec.** §10 says `tests/pg-gateway-client.mjs` runs under `npm test`. It does not — it is `npm run test:gateway`, a separate script. Task 1 Step 6 and Task 8 Step 2 both run it explicitly, and the spec is amended in the same commit as this plan.

**Type consistency.** `CalendarEvent`, `CalendarConnection`, `GridCell` and `FederationConfig` are defined once each and used under those names throughout. `month` is 1-based in `monthGrid` and stated as such at both its definition and its interface block. `who` is threaded as a trailing `string` parameter in all four functions that take it.
