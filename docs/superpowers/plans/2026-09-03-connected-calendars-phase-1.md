# Connected calendars, Phase 1 — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A person connects their own Google or Microsoft account once, from their account settings, and sees their real calendar events inside nompany.

**Architecture:** One provider record (the pattern `src/platform/auth/oauth.ts` already uses for sign-in) describes Google and Microsoft. Tokens are stored per user per provider, encrypted at rest, and refreshed behind a single door — `getCalendarAccessToken(userId, provider)` — so every reader is provider- and lifecycle-agnostic. `/super` becomes the first consumer of that door instead of the service account.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (`noImplicitAny`), the `route()` wrapper, `getJSON`/`setJSON` over Postgres, `encryptField` (AES-256-GCM), plain `fetch` against Google Calendar v3 and Microsoft Graph v1.0.

**Spec:** `docs/superpowers/specs/2026-09-03-connected-calendars-design.md` — read it first. Phase 1 is §8.1's first phase: **no sharing, no opt-in, no planner strip, no `s:<studioId>:calendarShare`.**

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). Never a literal, never a template at a call site.
- **`src/shared/**` is pure and client-safe** — no store, no Postgres, no server-only import. Both a server component and a client component import it.
- **Siblings import each other relatively** (`./calendarProviders`), never through `@/`. `platform/auth` has no barrel; do not add one.
- **No token may ever reach a response body or a log line.** `publicConnection()` is the only function permitted to shape a connection for a client.
- **Refresh tokens are encrypted with `encryptField`** before they touch the store. It throws when `FIELD_ENCRYPTION_KEY` is absent — that is deliberate and must not be softened.
- **Microsoft rotates refresh tokens.** Every refresh response may carry a new `refresh_token`; it must replace the stored one.
- **Microsoft free/busy is not used in Phase 1 at all.** Do not add `getSchedule`.
- **No new npm dependency** — plain `fetch`, no `googleapis`, no `@microsoft/microsoft-graph-client`. The bundle budget is a CI gate (largest chunk 158 KB gz / 250 KB; total 1582 KB gz / 1600 KB).
- **Golden responses are the contract.** `NOMPANY_RECORD_GOLDENS=1` only where this plan says, and the diff must contain only the goldens that task names.
- **Commit subjects are declarative sentences** describing the state after the change. End every commit with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Run the suite as `NOMPANY_TEST_SESSION=<something-short> npm test`.** Two sessions cannot share a namespace.
- **The Bash tool caps at 600 seconds** regardless of the timeout passed. Never background a command and idle on a notification. Chain with `&&` so the exit code is real, and never pipe a final command through `| tail`, which masks it.
- **Exact scope strings.** Google: `https://www.googleapis.com/auth/calendar.readonly`. Microsoft: `Calendars.Read offline_access`.
- **Exact redirect URIs**, already registered by the operator: `/api/auth/calendar/callback/google` and `/api/auth/calendar/callback/microsoft`.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/platform/auth/calendarProviders.ts` | **Create.** The two providers as data: URLs, scopes, offline parameters, endpoint builders. Pure — no network, no store. | 1 |
| `src/platform/db/keys.ts` | **Modify.** `U.calendarConnection(userId, provider)`. | 2 |
| `src/lib/data/calendarConnections.ts` | **Create.** Read/write the stored connection; encrypt on write, decrypt on read; `publicConnection()`. | 2 |
| `src/platform/auth/calendarOAuth.ts` | **Create.** Exchange, refresh (with rotation), revoke, and the one door `getCalendarAccessToken`. | 3 |
| `src/shared/calendar.ts` | **Modify.** Add `normaliseMicrosoftEvent`; keep `normaliseEvent` as the Google one, renamed `normaliseGoogleEvent` with a back-compat alias. | 4 |
| `src/lib/data/calendarReads.ts` | **Create.** `listCalendars(userId, provider)`, `listEvents(...)` — provider-aware, returns `CalendarEvent[]`. | 4 |
| `src/app/api/auth/calendar/[provider]/start/route.ts` | **Create.** Redirect to the provider with signed state. | 5 |
| `src/app/api/auth/calendar/callback/[provider]/route.ts` | **Create.** Verify state, exchange, store, redirect back. | 5 |
| `src/app/api/account/calendar/route.ts` | **Create.** GET connections, DELETE one. | 6 |
| `src/app/api/account/calendar/events/route.ts` | **Create.** GET the signed-in person's own events. | 6 |
| `src/components/public/AccountHome.js` | **Modify.** A "Calendars" panel: connect buttons, connected state, upcoming events. | 7 |
| `src/app/super/(shell)/application/calendar/*` | **Modify.** Move `/super` onto the same door; delete the service-account path. | 8 |
| `src/platform/auth/googleCalendarAuth.ts` | **Delete** in Task 8. | 8 |
| `tests/connected-calendars.mjs` | **Create.** Every pure assertion; added to `npm test`. | 1,3,4 |
| `docs/functionality/calendar.md` | **Rewrite** in Task 8. | 8 |

---

### Task 1: The two providers, as data

**Files:** Create `src/platform/auth/calendarProviders.ts`; create `tests/connected-calendars.mjs`; modify `package.json`.

**Interfaces — Produces:**
```ts
export type CalendarProvider = "google" | "microsoft";
export type ProviderConfig = {
  idEnv: string; secretEnv: string;
  authorize: string; token: string; revoke: string;
  scope: string;
  /** Extra authorize params this provider needs to issue a refresh token. */
  offlineParams: Record<string, string>;
  calendarsUrl: string;
  eventsUrl: (calendarId: string, fromISO: string, toISO: string) => string;
};
export const CALENDAR_PROVIDERS: Record<CalendarProvider, ProviderConfig>;
export function isCalendarProvider(v: unknown): v is CalendarProvider;
export function providerConfigured(p: CalendarProvider, env?: NodeJS.ProcessEnv): boolean;
export function enabledCalendarProviders(env?: NodeJS.ProcessEnv): CalendarProvider[];
export function calendarRedirectUri(request: Request, p: CalendarProvider): string;
export function calendarAuthorizeUrl(a: { provider: CalendarProvider; request: Request; state: string }): string;
```

- [ ] **Step 1: Write the failing test**

Create `tests/connected-calendars.mjs`:

```js
// EVERY PURE ASSERTION FOR CONNECTED CALENDARS — no provider, no network, no
// store. What this cannot prove, stated rather than implied: that Google or
// Microsoft accept a real client, that consent works, or that a token refreshes
// against the live endpoint. Those need registrations only the operator can
// create; see the spec's section 10.
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
  CALENDAR_PROVIDERS, isCalendarProvider, providerConfigured, enabledCalendarProviders,
  calendarAuthorizeUrl, calendarRedirectUri,
} = await import("../src/platform/auth/calendarProviders.ts");

const req = (origin = "https://nompany.com") =>
  new Request(`${origin}/x`, { headers: { host: origin.replace(/^https?:\/\//, ""), "x-forwarded-proto": origin.startsWith("https") ? "https" : "http" } });

console.log("\ncalendar providers");
{
  ok("google and microsoft, and nothing else",
    JSON.stringify(Object.keys(CALENDAR_PROVIDERS)) === JSON.stringify(["google", "microsoft"]));
  ok("an unknown provider name is refused", isCalendarProvider("apple") === false);
  ok("...and a real one is accepted", isCalendarProvider("microsoft") === true);

  ok("google asks for read-only calendar",
    CALENDAR_PROVIDERS.google.scope === "https://www.googleapis.com/auth/calendar.readonly");

  // WITHOUT offline_access MICROSOFT NEVER ISSUES A REFRESH TOKEN. It is that
  // provider's access_type=offline, and its absence fails an hour later with
  // nothing that says why — which is why it is asserted rather than trusted.
  ok("microsoft asks for Calendars.Read AND offline_access",
    CALENDAR_PROVIDERS.microsoft.scope === "Calendars.Read offline_access");
  ok("google asks for offline access and forces consent",
    CALENDAR_PROVIDERS.google.offlineParams.access_type === "offline" &&
    CALENDAR_PROVIDERS.google.offlineParams.prompt === "consent");

  // /me/events DOES NOT EXPAND RECURRENCE; /me/calendarView DOES. The exact
  // analogue of Google's singleEvents=true — get it wrong and a weekly standup
  // shows once a year.
  const msUrl = CALENDAR_PROVIDERS.microsoft.eventsUrl("primary", "2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z");
  ok("microsoft reads calendarView, not events", /\/me\/calendarView\?/.test(msUrl), msUrl);
  ok("...bounded by the range it was given",
    msUrl.includes("startDateTime=2026-09-01T00%3A00%3A00Z") && msUrl.includes("endDateTime=2026-09-30T00%3A00%3A00Z"), msUrl);
  const gUrl = CALENDAR_PROVIDERS.google.eventsUrl("primary", "2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z");
  ok("google expands recurring series", gUrl.includes("singleEvents=true"), gUrl);
  ok("...and orders by start", gUrl.includes("orderBy=startTime"), gUrl);

  ok("a provider with no client id is not offered",
    providerConfigured("google", {}) === false);
  ok("...and one with both halves is",
    providerConfigured("google", { GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" }) === true);
  ok("only configured providers are enabled",
    JSON.stringify(enabledCalendarProviders({ MICROSOFT_CLIENT_ID: "a", MICROSOFT_CLIENT_SECRET: "b" })) ===
      JSON.stringify(["microsoft"]));

  ok("the redirect uri is the one registered with the provider",
    calendarRedirectUri(req(), "google") === "https://nompany.com/api/auth/calendar/callback/google",
    calendarRedirectUri(req(), "google"));

  const url = calendarAuthorizeUrl({ provider: "microsoft", request: req(), state: "st8" });
  ok("the authorize url points at the provider", url.startsWith(CALENDAR_PROVIDERS.microsoft.authorize), url);
  ok("...carries the state", url.includes("state=st8"));
  ok("...asks for a code", url.includes("response_type=code"));
  ok("...and carries the scope including offline_access",
    url.includes(encodeURIComponent("Calendars.Read offline_access")), url);
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/connected-calendars.mjs`
Expected: FAIL — `Cannot find module .../calendarProviders.ts`.

- [ ] **Step 3: Write the implementation**

Read `src/platform/auth/oauth.ts` first and follow its shape — a `Record` of provider configs, an `isProvider` guard that makes indexing by a URL segment safe, and an `origin(request)` helper honouring `x-forwarded-proto` / `x-forwarded-host`. Reuse that origin logic rather than writing a second one; if it is not exported, export it.

The file's header must state the two things a reader needs: that these are the *calendar* scopes, distinct from `oauth.ts`'s identity-only `openid email profile`; and that `offlineParams` exists because each provider spells "give me a refresh token" differently.

Endpoint builders, exact:

```ts
// GOOGLE: singleEvents EXPANDS a recurring series into instances. Without it a
// weekly standup is ONE event carrying a recurrence rule.
eventsUrl: (calendarId, fromISO, toISO) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
  new URLSearchParams({ singleEvents: "true", orderBy: "startTime", timeMin: fromISO, timeMax: toISO, maxResults: "250" }),

// MICROSOFT: /me/events does NOT expand recurrence; /me/calendarView DOES.
// Same trap as Google's singleEvents, different spelling.
eventsUrl: (calendarId, fromISO, toISO) =>
  `https://graph.microsoft.com/v1.0/me/calendarView?` +
  new URLSearchParams({ startDateTime: fromISO, endDateTime: toISO, $top: "250", $orderby: "start/dateTime" }),
```

Revoke endpoints: Google `https://oauth2.googleapis.com/revoke`; Microsoft has no token-revocation endpoint for delegated tokens — set `revoke: ""` and say so in a comment, so Task 3 knows to skip the call rather than a reader assuming it was forgotten.

- [ ] **Step 4: Run the test**

Run: `node tests/connected-calendars.mjs` — expected PASS.

- [ ] **Step 5: Register the test, typecheck, commit**

Append ` && node tests/connected-calendars.mjs` to `package.json`'s `test` script, before `tests/gate-a.test.mjs`.

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && node tests/connected-calendars.mjs`

```bash
git add src/platform/auth/calendarProviders.ts tests/connected-calendars.mjs package.json
git commit -m "$(cat <<'EOF'
Google and Microsoft calendars are described as data rather than branches

One provider record, the same shape oauth.ts already uses for sign-in, so a
second provider is a row rather than a fork in every function.

Two of its fields exist because the providers disagree in ways that fail
silently. Microsoft issues no refresh token at all without offline_access in the
scope, and /me/events does not expand a recurring series where /me/calendarView
does - the exact analogue of Google's singleEvents. Both are asserted rather
than trusted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The stored connection

**Files:** Modify `src/platform/db/keys.ts` (after `U.studioVisits`); create `src/lib/data/calendarConnections.ts`.

**Interfaces — Produces:**
```ts
export type CalendarConnection = {
  provider: CalendarProvider; accountEmail: string;
  refreshToken: string; accessToken: string;   // DECRYPTED in memory, encrypted at rest
  expiresAtMs: number; calendarIds: string[]; connectedAt: number;
};
export type PublicCalendarConnection = { provider: CalendarProvider; accountEmail: string; connectedAt: number; calendarIds: string[] };
export function publicConnection(c: CalendarConnection): PublicCalendarConnection;
export function getConnection(userId: string, p: CalendarProvider): Promise<CalendarConnection | null>;
export function saveConnection(userId: string, p: CalendarProvider, patch: Partial<CalendarConnection>): Promise<CalendarConnection>;
export function clearConnection(userId: string, p: CalendarProvider): Promise<void>;
export function listConnections(userId: string): Promise<PublicCalendarConnection[]>;
```

- [ ] **Step 1: Add the key**

In `keys.ts`, inside `U`, after `studioVisits`:

```ts
  // A CONNECTED CALENDAR ACCOUNT, one per provider. Keyed under the USER and not
  // under a studio because the Google or Microsoft account is the person's, not
  // the tenant's — they connect once and it works in every studio they belong
  // to, and it dies with them via the u:<id>:* prefix.
  //
  // ITS OWN KEY, NOT A FIELD ON THE COLLABORATOR ROW. s:<sid>:collaborators is
  // one key holding the whole list and every write to it is a compare-and-set;
  // an hourly per-person token refresh landing there would contend with every
  // membership edit in the studio, for a value no other reader of that row wants.
  calendarConnection: (userId: string, provider: string) =>
    `${P}u:${userId}:cal:${provider}`,
```

- [ ] **Step 2: Write the store module**

Header must say: this file holds the only credential the product stores, tokens are encrypted at rest, and `publicConnection` is the only shape a route may return.

```ts
import { getJSON, setJSON, delKeys } from "@/platform/db/store";
import { U } from "@/platform/db/keys";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import type { CalendarProvider } from "@/platform/auth/calendarProviders";
```

`saveConnection` encrypts `refreshToken` and `accessToken` with `encryptField` before `setJSON`; `getConnection` decrypts both after `getJSON`. A record with no `refreshToken` after decryption reads as **no connection** — return `null` — because a connection that cannot be refreshed is not one.

`publicConnection` is a whitelist, never a spread:

```ts
/**
 * THE ONLY SHAPE A ROUTE MAY RETURN. Built by naming four fields rather than by
 * deleting two from a spread: a spread that forgets a field added later leaks a
 * token, and it leaks it silently, into a response body and every log that
 * records one.
 */
export function publicConnection(c: CalendarConnection): PublicCalendarConnection {
  return {
    provider: c.provider,
    accountEmail: c.accountEmail,
    connectedAt: c.connectedAt,
    calendarIds: c.calendarIds,
  };
}
```

Confirm `decryptField`'s exact export name first: `grep -n "^export function" src/platform/auth/fieldCrypto.ts`.

- [ ] **Step 3: Write the failing test, then make it pass**

Append to `tests/connected-calendars.mjs` — this asserts the property that matters most, with no store:

```js
const { publicConnection } = await import("../src/lib/data/calendarConnections.ts");

console.log("\nconnection shape");
{
  const full = {
    provider: "google", accountEmail: "a@b.test",
    refreshToken: "REFRESH-SECRET", accessToken: "ACCESS-SECRET",
    expiresAtMs: 123, calendarIds: ["primary"], connectedAt: 456,
  };
  const pub = publicConnection(full);
  const serialised = JSON.stringify(pub);
  // THE ONE ASSERTION THIS FILE EXISTS FOR. A token reaching a response body is
  // the worst failure available to this feature, and a spread that forgets a
  // field added later is exactly how it would happen.
  ok("no token survives publicConnection",
    !serialised.includes("REFRESH-SECRET") && !serialised.includes("ACCESS-SECRET"), serialised);
  ok("...nor does the expiry, which is nobody's business either",
    !("expiresAtMs" in pub));
  ok("what the client needs does survive",
    pub.provider === "google" && pub.accountEmail === "a@b.test" && pub.connectedAt === 456);
}
```

Run: `node tests/connected-calendars.mjs` — expected PASS.

- [ ] **Step 4: Prove the key is namespaced, typecheck, commit**

Run: `NOMPANY_TEST_SESSION=cal1 npm run test:gate-a && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: PASS. Gate A asserts every builder in `keys.ts` carries the prefix, and covers a new one automatically.

```bash
git add src/platform/db/keys.ts src/lib/data/calendarConnections.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
A person's connected calendar account is stored under the person, encrypted

The Google or Microsoft account belongs to the person, not to any studio, so the
connection lives under u:<id>:cal:<provider> and dies with them. Its own key, not
a field on the collaborator row: that row is one contended array, and an hourly
token refresh has no business serialising behind every membership edit.

Both tokens are encrypted at rest, and publicConnection names the four fields a
client may see rather than deleting two from a spread - a spread that forgets a
field added later leaks a token silently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The token lifecycle

**Files:** Create `src/platform/auth/calendarOAuth.ts`; modify `tests/connected-calendars.mjs`.

**Interfaces — Produces:**
```ts
export function exchangeCode(a: { provider: CalendarProvider; code: string; request: Request; fetchImpl?: FetchLike }):
  Promise<{ refreshToken: string; accessToken: string; expiresAtMs: number }>;
export function refreshAccessToken(a: { provider: CalendarProvider; refreshToken: string; now?: () => number; fetchImpl?: FetchLike }):
  Promise<{ accessToken: string; expiresAtMs: number; refreshToken?: string }>;
export function isDue(expiresAtMs: number, nowMs: number, bufferMs?: number): boolean;
export function expiryFrom(expiresIn: unknown, nowMs: number): number;
export function getCalendarAccessToken(userId: string, p: CalendarProvider): Promise<string>;
export function revokeConnection(userId: string, p: CalendarProvider): Promise<void>;
export const REFRESH_BUFFER_MS: number;   // 5 * 60_000
```

- [ ] **Step 1: Write the failing test**

Append to `tests/connected-calendars.mjs`:

```js
const { isDue, expiryFrom, refreshAccessToken, REFRESH_BUFFER_MS } =
  await import("../src/platform/auth/calendarOAuth.ts");

console.log("\ntoken lifecycle");
{
  ok("the buffer is five minutes", REFRESH_BUFFER_MS === 5 * 60_000);
  // A TOKEN STILL VALID WHEN WE CHECK CAN BE EXPIRED WHEN IT ARRIVES. The
  // buffer is what turns "expired mid-flight" from a failure mode into
  // arithmetic.
  ok("a token inside the buffer is due", isDue(1_000_000, 700_000) === true);
  ok("...and one outside it is not", isDue(1_000_000, 600_000) === false);
  ok("an absent expiry is always due", isDue(0, 1) === true);

  ok("expires_in becomes an absolute stamp", expiryFrom(3600, 1_000) === 1_000 + 3600_000);
  for (const bad of [undefined, null, "", "soon", -1]) {
    let threw = false;
    try { expiryFrom(bad, 1_000); } catch { threw = true; }
    ok(`an unusable expires_in is refused (${JSON.stringify(bad)})`, threw);
  }

  // MICROSOFT ROTATES REFRESH TOKENS. Every refresh may return a NEW one which
  // must replace the stored one. Writing the old one back leaves a connection
  // that works until the next refresh and then fails permanently, days later
  // and far from the cause.
  const rotating = async () => new Response(JSON.stringify({
    access_token: "AT2", expires_in: 3600, refresh_token: "RT2",
  }), { status: 200 });
  const rotated = await refreshAccessToken({ provider: "microsoft", refreshToken: "RT1", fetchImpl: rotating, now: () => 1000 });
  ok("a rotated refresh token is returned so the caller can store it", rotated.refreshToken === "RT2", JSON.stringify(rotated));

  const steady = async () => new Response(JSON.stringify({ access_token: "AT2", expires_in: 3600 }), { status: 200 });
  const kept = await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: steady, now: () => 1000 });
  ok("a provider that does not rotate returns none, and the old one stands",
    kept.refreshToken === undefined, JSON.stringify(kept));

  const refused = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  let msg = "";
  try { await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: refused }); }
  catch (e) { msg = e.message; }
  ok("a refused refresh names the provider's own reason", /invalid_grant/.test(msg), msg);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/connected-calendars.mjs` — expected FAIL, `Cannot find module .../calendarOAuth.ts`.

- [ ] **Step 3: Implement**

`getCalendarAccessToken(userId, provider)` is the single door:

1. `getConnection`; no connection → throw naming the provider and that the person must connect.
2. `isDue(connection.expiresAtMs, Date.now())` false → return the stored access token.
3. Otherwise `refreshAccessToken`; on success `saveConnection` with the new access token, the new expiry, **and the rotated refresh token when one came back**; return it.
4. On `invalid_grant`, `clearConnection` and throw an error saying access was revoked at the provider and the person must reconnect. This is the only failure that clears the record — a network blip must not disconnect anybody.

`revokeConnection` posts to the provider's `revoke` URL when it has one, then clears. Microsoft's is `""`; skip the call, keep the comment saying delegated tokens have no revocation endpoint so a reader does not think it was forgotten.

- [ ] **Step 4: Run the test, typecheck**

Run: `node tests/connected-calendars.mjs && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json` — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add src/platform/auth/calendarOAuth.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
A connected calendar's token renews itself behind one door

getCalendarAccessToken is the only way anything reads a calendar: it checks the
expiry against a five-minute buffer, refreshes when due, writes the result back
and hands out a token. Every caller is provider- and lifecycle-agnostic.

A rotated refresh token replaces the stored one. Microsoft returns a new refresh
token on every refresh where Google usually does not, and writing the old one
back leaves a connection that works until the next refresh and then fails
permanently, days later and far from the cause.

invalid_grant is the ONLY failure that clears the record - it means the person
revoked access at the provider. A network blip must not disconnect anybody.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Reading calendars, both providers

**Files:** Modify `src/shared/calendar.ts`; create `src/lib/data/calendarReads.ts`; modify `tests/connected-calendars.mjs`.

**Interfaces — Produces:**
```ts
// src/shared/calendar.ts (additive; existing exports unchanged)
export function normaliseMicrosoftEvent(raw: unknown): CalendarEvent | null;
// src/lib/data/calendarReads.ts
export function listCalendars(userId: string, p: CalendarProvider): Promise<{ id: string; summary: string }[]>;
export function listEvents(a: { userId: string; provider: CalendarProvider; calendarId: string; from: string; to: string }): Promise<CalendarEvent[]>;
export class CalendarApiError extends Error { status: number; provider: CalendarProvider; }
```

- [ ] **Step 1: Write the failing test**

Append to `tests/connected-calendars.mjs`:

```js
const { normaliseMicrosoftEvent, eventDayKeys } = await import("../src/shared/calendar.ts");

console.log("\nmicrosoft normaliser");
{
  const timed = normaliseMicrosoftEvent({
    id: "m1", subject: "Design review", isAllDay: false,
    webLink: "https://outlook.office.com/m1",
    location: { displayName: "Room 4" },
    start: { dateTime: "2026-09-03T09:30:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2026-09-03T10:00:00.0000000", timeZone: "UTC" },
  });
  ok("a timed Microsoft event keeps its subject", timed.title === "Design review");
  ok("...is not all-day", timed.allDay === false);
  ok("...and keeps its link", timed.htmlLink === "https://outlook.office.com/m1");
  ok("...and its location", timed.location === "Room 4");

  // MICROSOFT'S ALL-DAY END IS EXCLUSIVE TOO, exactly like Google's end.date.
  // A one-day event on the 3rd runs 2026-09-03T00:00 to 2026-09-04T00:00 and
  // must occupy ONE cell, not two.
  const oneDay = normaliseMicrosoftEvent({
    id: "m2", subject: "Public holiday", isAllDay: true,
    start: { dateTime: "2026-09-03T00:00:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2026-09-04T00:00:00.0000000", timeZone: "UTC" },
  });
  ok("an all-day Microsoft event is all-day", oneDay.allDay === true);
  ok("...and occupies exactly one cell",
    JSON.stringify(eventDayKeys(oneDay)) === JSON.stringify(["2026-09-03"]),
    JSON.stringify(eventDayKeys(oneDay)));

  ok("an event with no id is dropped", normaliseMicrosoftEvent({ subject: "x" }) === null);
  ok("an untitled event gets a readable placeholder",
    normaliseMicrosoftEvent({ id: "m3", isAllDay: false, start: { dateTime: "2026-09-03T09:00:00" }, end: { dateTime: "2026-09-03T10:00:00" } }).title === "(no title)");
}
```

- [ ] **Step 2: Run it to verify it fails; then implement**

Run: `node tests/connected-calendars.mjs` — expected FAIL, `normaliseMicrosoftEvent is not a function`.

In `src/shared/calendar.ts`, add the Microsoft normaliser next to the Google one, into the **same** `CalendarEvent` shape. For an all-day event set `start`/`end` to the date part only, so `eventDayKeys`'s existing exclusive-end handling applies unchanged — do not write a second copy of that logic.

`src/lib/data/calendarReads.ts` calls `getCalendarAccessToken(userId, provider)`, fetches the provider's URL from `CALENDAR_PROVIDERS`, and maps through the right normaliser. Carry the provider's own error message on failure, in a `CalendarApiError` naming the provider — three different failures look identical from a screen and have three different fixes.

- [ ] **Step 3: Run the test, typecheck, commit**

Run: `node tests/connected-calendars.mjs && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`

```bash
git add src/shared/calendar.ts src/lib/data/calendarReads.ts tests/connected-calendars.mjs
git commit -m "$(cat <<'EOF'
Events from either provider arrive in one shape

Two normalisers, one CalendarEvent, so nothing downstream knows which provider a
meeting came from. Microsoft's all-day events carry an exclusive end exactly as
Google's do, so both feed the existing eventDayKeys rather than growing a second
copy of the off-by-one that paints an all-day event one cell too wide.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The connect flow

**Files:** Create `src/app/api/auth/calendar/[provider]/start/route.ts` and `src/app/api/auth/calendar/callback/[provider]/route.ts`.

Read `src/app/api/auth/oauth/[provider]/start/route.ts` and `src/app/api/auth/callback/[provider]/route.ts` first and mirror them; reuse `oauth.ts`'s `makeState`, `readState`, `stateCookie`, `clearedStateCookie` rather than writing a second CSRF implementation.

**start** (`auth: "user"`): refuse an unknown provider and one that is not configured, mint state carrying the return path, set the state cookie, 302 to `calendarAuthorizeUrl`.

**callback** (`auth: "user"`): verify the state cookie matches the query, exchange the code, `saveConnection` **against the signed-in user from the session**, redirect to the return path with a success flag.

The callback's comment must carry the reason, because this is the security-relevant line of the whole feature:

```ts
// THE CONNECTION IS STORED AGAINST THE SIGNED-IN USER FROM THE SESSION, NEVER
// AGAINST ANYTHING IN `state`. The reference document this work started from put
// a tenant id in `state` and keyed the tokens off it — which makes a signed
// cookie the only thing standing between one tenant's calendar and another's.
// Here `state` decides a redirect and nothing else: forged, the worst outcome is
// landing on the wrong page, already connected as yourself.
```

- [ ] **Step 1: Write both routes** as above.
- [ ] **Step 2: Verify** — `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`.
- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/calendar
git commit -m "$(cat <<'EOF'
A person can hand nompany read access to their own calendar

Two routes and one signed state. The state carries where to send the person back
and nothing else - the connection is stored against the signed-in user from the
session, never against anything in the state, because keying tokens off a signed
cookie makes that cookie the only thing between one tenant's calendar and
another's.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The account API

**Files:** Create `src/app/api/account/calendar/route.ts` and `src/app/api/account/calendar/events/route.ts`; modify `tests/gate-a.mjs`; create two goldens.

`GET /api/account/calendar` (`auth: "user"`) → `{ connections: PublicCalendarConnection[], available: CalendarProvider[] }` — `available` is `enabledCalendarProviders()`, so the UI offers only buttons that can work.
`DELETE /api/account/calendar?provider=` → `revokeConnection`, `{ ok: true }`.
`GET /api/account/calendar/events?from=&to=` → the signed-in person's events across their connections, merged and sorted. `from`/`to` required, parsed, bounded at 400 days.

- [ ] **Step 1: Write both routes.**
- [ ] **Step 2: Add two goldens** in `tests/gate-a.mjs` for the unconnected state — `account.calendar.none` and `account.calendar.events.none`. Both must be network-free: with no connection stored, neither route calls a provider.
- [ ] **Step 3: Record and verify**

Run: `NOMPANY_TEST_SESSION=cal2 NOMPANY_RECORD_GOLDENS=1 npm run test:gate-a`
Then: `git status --short tests/goldens/` — **exactly two new files, zero modified.** If any existing golden shows as modified, STOP and report BLOCKED; recording it would launder an unrelated regression.
Then: `NOMPANY_TEST_SESSION=cal2 npm run test:gate-a` — expected PASS, comparing.

- [ ] **Step 4: Commit** (`git add src/app/api/account/calendar tests/gate-a.mjs tests/goldens/account.calendar.*.json`), subject: `The account surface can list and drop a connected calendar`.

---

### Task 7: The account screen

**Files:** Modify `src/components/public/AccountHome.js`.

Add a **Calendars** entry to `navFor(tr)` and a panel: for each `available` provider not yet connected, a Connect button linking to `/api/auth/calendar/<provider>/start`; for each connection, the account email, when it was connected, and a Disconnect button; below, the person's next events from the events route.

Bilingual: strings go in the existing dictionary this file already reads — the studio is EN/AR and this screen is on the account surface. Use logical properties (`ps-`/`pe-`/`ms-`/`me-`), never `pl-`/`pr-`.

- [ ] **Step 1: Build the panel.**
- [ ] **Step 2: Verify** — `npx tsc --noEmit && npm run lint && npx next build`. Lint must not gain warnings; the budget shrinks only.
- [ ] **Step 3: Commit**, subject: `A person connects and sees their own calendar from their account`.

---

### Task 8: `/super` onto the same door, and the service account deleted

**Files:** Modify `src/app/api/super/google-calendar/route.ts`, `events/route.ts`, the three calendar screen files; delete `src/platform/auth/googleCalendarAuth.ts`; modify `src/lib/data/googleCalendar.ts`; rewrite `docs/functionality/calendar.md`; re-record four goldens.

The console keeps one calendar at `REG.googleCalendar`, now holding the same token shape and connected by the same OAuth flow. Delete `calendarServiceAccount()`, the share-with-service-account steps, and the `?discover=1` opt-in — with OAuth, listing calendars always works, so the dropdown loads normally.

**`src/platform/auth/googleFederation.ts` STAYS.** It was extracted for the calendar and the calendar no longer uses it, but the Cloud Run gateway depends on it and its 36-block suite pins it. Reverting a split of production auth code to tidy up a motivation is risk for nothing.

- [ ] **Step 1:** Trace every caller of `googleCalendarAuth.ts` before deleting it — `grep -rn "googleCalendarAuth" src/ tests/` — and land the removal and its dependants in one commit.
- [ ] **Step 2:** Rewrite `docs/functionality/calendar.md` for what actually shipped, ending with a **"Not built yet"** section in words: no writes, no free/busy sharing yet (Phase 2), no push notifications, no caching.
- [ ] **Step 3:** Re-record the four `super.calendar.*` goldens — their shape changes because `serviceAccount` goes away. Verify with `git status --short tests/goldens/` that **only those four** are modified.
- [ ] **Step 4:** `npm run test:gateway` must still read `all passed (36 blocks)` — the gateway is untouched and this proves it.
- [ ] **Step 5: Commit** the re-recording in its own commit with its reason stated, separate from the code change.

---

### Task 9: Full verification

- [ ] `NOMPANY_TEST_SESSION=cal3 npm test`
- [ ] `npm run test:gateway` — **not part of `npm test`**; must read `all passed (36 blocks)`
- [ ] `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`
- [ ] `node scripts/bundle-budget.mjs` — if the total moved, record the measured before and after in `CLAUDE.md`'s bundle bullet, in the style of the entries there. **Never raise a ceiling to make a number fit.**
- [ ] `npm run lint` — no new warnings
- [ ] Browser pane against `npm run dev:sandbox`: the account screen with no connection offers only configured providers; a Connect click reaches the provider's consent screen (or says the provider is not configured); the console screen renders. Report plainly whether a real connection was completed or not.

---

## Self-review

**Spec coverage.** §4.1 → Task 2. §4.2 → **Phase 2, deliberately absent.** §4.3 → Task 2's key comment. §5 → Task 1. §5.1 → Tasks 1 (offline_access, calendarView) and 3 (rotation); §5.1's item 4 (Microsoft free/busy leak) is **Phase 2** and correctly not here. §5.2 → Task 4. §6 → Task 5. §7.1 → Task 6. §7.2 → Phase 2. §7.3 → Task 2's `publicConnection`. §8 → Task 7. §9 → Tasks 3 and 4. §10 → operator-only, named in Task 9's report. §11 → Task 9. §12 → Task 8's doc.

**Placeholder scan.** No TBDs. Every code step carries real code or an exact instruction with the values to use.

**Type consistency.** `CalendarProvider`, `CalendarConnection`, `PublicCalendarConnection`, `CalendarEvent` and `CalendarApiError` are each defined once and used under those names throughout. `getCalendarAccessToken(userId, provider)` has the same signature in Tasks 3, 4 and 8.

**One gap I am recording rather than hiding:** Tasks 5, 7 and 9 cannot be verified end-to-end until the operator registers both OAuth clients (spec §10). Every task before them is fully testable without a provider; those three are testable only as far as "the button is offered and the redirect is built correctly".
