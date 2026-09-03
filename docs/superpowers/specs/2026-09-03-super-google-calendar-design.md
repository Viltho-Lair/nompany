# The /super Calendar, backed by Google — design

**Status:** approved 03/09/2026. Approach C (service-account impersonation) chosen over OAuth; the
`pgGatewayAuth.ts` extraction and the reuse of `pg-gateway@` are both explicitly approved. Ready for an
implementation plan.

**Supersedes nothing.** Extends `src/platform/db/pgGatewayAuth.ts` (by extraction), `src/platform/db/keys.ts`,
and the console's `/super/application/calendar` screen. The reference document the work started from is
`SaaS_Google_Calendar_Integration.pdf`; §3 below records where this design deliberately departs from it.

---

## 1. Problem

`/super → Application → Calendar` is a template screen with its data hardcoded in the file. `EVENTS`,
`UPCOMING` and the five calendar names are literals; April 2026 is baked into `LEAD`/`DAYS`/`TRAIL`; "today"
is the constant `8`. Month/Week/Day and the two chevrons are buttons with no handler, and "New event" does
nothing. It renders convincingly and reports nothing true.

## 2. Goal

The console shows one real Google calendar. An operator connects it once, and from then on every page load
reads live events server-side. No credential is stored by this application, and no new secret is added to any
environment.

**Non-goals.** Writing events (the scope is read-only). Per-studio calendars — `/super` is nompany's own
console, not a tenant, and there is exactly one connection. Multiple simultaneous calendars. Sync, webhooks,
or push notifications; every read is on demand.

## 3. Why not OAuth — the decision, recorded

The reference document specifies OAuth 2.0 with per-tenant `access_token` / `refresh_token` columns and an
hourly refresh cycle. Three findings moved the design off that path, and they are written here so it is not
revisited:

1. **The credential on hand was an API key, not an OAuth client.** A Google API key cannot read a private
   calendar at all — only one whose sharing is set to "Make available to public". `NEXT_GOOGLE_CALENDAR_API_KEY`
   is therefore unused by this design and should be removed from Vercel by its owner.
2. **`calendar.readonly` is a Google *sensitive* scope.** On an External consent screen in Testing, Google
   expires the refresh token after **7 days** — the calendar would silently disconnect roughly weekly, with
   nothing in the logs to say why. Escaping that requires app verification, for a console with one user.
3. **The identity chain already exists and is proven in production.** `pgGatewayAuth.ts` mints a Google
   credential from Vercel's per-request OIDC token with no stored key. A service account can read a calendar
   that has been shared with its address, which makes the entire §4 of the reference document — pre-flight
   expiry checks, the refresh POST, the write-back of a new expiry — unnecessary rather than merely deferred.

The reference document's `state`-parameter tenant routing (§3.2) is also dropped: it exists to map a callback
to the right tenant, and there is no callback and no tenant here.

**What approach C costs.** Each calendar must be shared with the service account explicitly; OAuth would have
handed over all of the operator's calendars at once. For a single company calendar on the console, that is one
setup step, not an ongoing cost.

## 4. Identity

### 4.1 The two legs

The gateway's chain is Vercel OIDC → STS → `generateIdToken` (audienced to Cloud Run). The calendar needs the
same first leg and a different second: `generateAccessToken` with
`scope: ["https://www.googleapis.com/auth/calendar.readonly"]`, impersonating the same service account.

`roles/iam.serviceAccountTokenCreator` on `pg-gateway@nompany-application.iam.gserviceaccount.com` is what makes
`generateIdToken` work today, and it covers `generateAccessToken` unchanged. **No new IAM binding, no new
service account, and no new environment variable are required.**

### 4.2 The extraction

The shared first leg is three careful network calls with a documented cache, a concurrent-mint guard, and an
absolute no-unauthenticated-fallback rule. A second copy of it would be the copy that rots, so it moves rather
than being duplicated.

New: `src/platform/auth/googleFederation.ts`, holding

- `readFederationConfig(env)` — project number, pool, provider, STS audience, expected issuer/audience, STS and
  IAM Credentials URLs, timeout, refresh skew. **It does not read `PG_GATEWAY_URL`** and therefore does not
  throw when no gateway is configured, which is precisely why the gateway's own config reader cannot be reused
  as-is.
- `readSubjectToken(env)` — the environment, then `x-vercel-oidc-token` off the request, with its "sources
  tried" diagnostic intact.
- `assertVercelTokenMatchesPool`, `decodeJwtClaims`, `jwtExpiryMs`, `isFresh`, `postJson`, `FetchLike`.
- `exchangeForFederatedToken(cfg, subjectToken, fetchImpl)`.
- `GOOGLE_FEDERATION_DEFAULTS` — the issuer, audience, project number, pool, provider, STS and IAM Credentials
  URLs, and the service account. Every one was read from the live project rather than remembered, and each
  keeps the note saying so.

`pgGatewayAuth.ts` keeps everything gateway-specific and imports the rest: `PG_GATEWAY_URL`, the
`idTokenAudience` trailing-slash strip, `generateIdToken`, its own token cache, `getGatewayIdToken`, and
`_resetGatewayTokenCacheForTests`. `readGatewayAuthConfig` becomes `readFederationConfig` plus the gateway's
three extra fields, and `PG_GATEWAY_DEFAULTS` becomes a spread of `GOOGLE_FEDERATION_DEFAULTS` — both keep
their current names and shapes, so `pg.ts` and `pgGateway.ts` do not change at all.

**Nothing is re-exported to spare the test.** `tests/pg-gateway-client.mjs` pulls seven names from
`pgGatewayAuth.ts` today; the four that move get imported from `googleFederation.ts` instead, turning one
import statement into two. A re-export would keep that diff at zero and put two doors on one function, which
is the thing this codebase avoids — and it would let the test pass while asserting a structure that no longer
exists.

**Every comment travels with the code it explains.** The module headers of both files state that the chain
exists so no service-account JSON key is ever created, and that there is deliberately no unauthenticated
fallback branch.

**This is a move, not a rewrite, and it is the one risky change in this work** — production Postgres runs
through that module. `tests/pg-gateway-client.mjs` already drives both legs with a fake fetch and must stay
green without being edited, other than an import path.

### 4.3 The calendar's token

`src/platform/auth/googleCalendarAuth.ts`: `getCalendarAccessToken()`, structurally the twin of
`getGatewayIdToken` — its own module-scope cache, its own in-flight promise guard, the same two-minute skew.

The expiry source differs, and the difference matters. `generateIdToken` returns no `expires_in`, so the gateway
reads `exp` off the minted JWT. `generateAccessToken` returns an **opaque** access token plus an `expireTime`
RFC-3339 string; there is no JWT to decode. The expiry is read from `expireTime`, and a response without one is
refused rather than assumed to be an hour — a token cached forever is one that starts failing every request the
moment it lapses, with nothing in the code that would ever mint another.

The service account is `GOOGLE_CALENDAR_SERVICE_ACCOUNT`, defaulting to
`pg-gateway@nompany-application.iam.gserviceaccount.com` — a real default read from the live project, following
the rule `PG_GATEWAY_DEFAULTS` already states: a default that is wrong is worse than no default.

## 5. Storage

One key, built in `keys.ts` per invariant 1:

```
REG.googleCalendar = `${P}g:googleCalendar`
```

holding

```json
{
  "calendarId": "c_abc123@group.calendar.google.com",
  "summary": "nompany — Company",
  "timeZone": "Asia/Riyadh",
  "connectedAt": 1772668800000,
  "connectedBy": "admin@nompany.com"
}
```

**It holds no credentials.** There is no access token to encrypt, no refresh token to protect, and no expiry to
track — the access token lives for an hour in module memory and is re-minted from the Vercel identity. This is
the payoff of approach C, and it is why `encryptField` is not involved.

Platform-level, no cascade, the same lifecycle as `REG.novaConfig` — read with `getJSON`, written with `setJSON`
through a write boundary that stores only known fields.

## 6. Talking to Google

`src/lib/data/googleCalendar.ts`, following the `exchangeRates.ts` precedent for an external API plus stored
settings.

- `listCalendars()` — `GET /calendar/v3/users/me/calendarList`
- `getCalendar(id)` — `GET /calendar/v3/calendars/{id}`, used to validate a pasted id and read its real name back
- `listEvents({ calendarId, from, to })` — `GET /calendar/v3/calendars/{id}/events` with
  `singleEvents=true&orderBy=startTime&timeMin&timeMax&maxResults=250`
- `getConnection()` / `saveConnection(patch)` / `clearConnection()`

**A calendar shared with a service account does not reliably appear in that account's `calendarList`.** List
entries require an acceptance step a service account never performs, while `events.list` against the calendar id
works regardless. So the settings UI is a **calendar-id field with a Test button** — which calls `getCalendar`
and shows the calendar's real name back, proving the share worked — *plus* a dropdown populated from
`listCalendars()` when it happens to return anything. A dropdown-only picker would look broken on a correctly
shared calendar, which is the failure this note exists to prevent.

### 6.1 The event normaliser

Pure, exported, and tested without a network:

```ts
{ id, title, start, end, allDay, location, htmlLink, colorId, calendarId }
```

Google emits `start.date` for an all-day event and `start.dateTime` for a timed one; `allDay` is that
distinction, and an all-day `end.date` is **exclusive** — a one-day event ends on the following date. Getting
that wrong paints every all-day event one cell too wide, which is the bug this function is factored out to
assert against.

## 7. Routes

Four, all `auth: "super"` through the existing `route()` wrapper. There is no OAuth callback, because there is
no redirect flow.

| Route | Does |
|---|---|
| `GET /api/super/google-calendar` | connection state, the chosen calendar, discoverable calendars, and whether the identity is configured at all |
| `PUT /api/super/google-calendar` | save a calendar id — **validated by fetching it first**; an id that cannot be read is refused with Google's own reason rather than stored |
| `DELETE /api/super/google-calendar` | disconnect; clears the key |
| `GET /api/super/google-calendar/events?from=&to=` | server-side fetch, normalised |

`from` and `to` are required, parsed, and bounded — an unbounded range is a request for every event a calendar
has ever held.

## 8. The screen

`src/app/super/(shell)/application/calendar/page.js` becomes a server component that reads the connection and
renders one of two states.

**Not connected** — an empty state carrying the three setup steps and the exact service-account address to share
the calendar with, plus the calendar-id form. No fake grid: a template month full of invented events is
indistinguishable from a working integration, which is how this screen came to be mistaken for one.

**Connected** — the existing hand-built grid, unchanged in look, driven by real events. Month/Week/Day and the
two chevrons become live (they are dead buttons today). "Upcoming" is derived from the same fetch. The
"Calendars" card becomes the connected calendar and its Google colour rather than five invented names.

**"New event" becomes "Open in Google Calendar"**, a real link to the calendar's own URL. `calendar.readonly`
cannot write, and a button that lies is worse than no button.

**No FullCalendar or React Big Calendar**, against the reference document's §3.3 suggestion. Either is ~100 KB
gzipped against a bundle budget CI enforces, and the existing grid already renders correctly in both themes and
both text directions.

The grid arithmetic — which weekday a month starts on, how many lead and trail cells, and which cell is today in
the calendar's own timezone — moves into a pure, tested function. It is three hardcoded arrays today.

## 9. Failure modes

Each of these gets a distinct message naming the fix, because every one of them looks like "the calendar is
broken" from the screen:

| Cause | What the operator is told |
|---|---|
| No Vercel OIDC identity | the identity chain is unavailable; names both sources it tried, as `pgGatewayAuth` already does |
| Calendar API not enabled | Google's 403 `accessNotConfigured`, passed through with the enable step |
| Calendar not shared with the service account | Google's 404 on `calendars.get`, reported as "not shared with `<address>`" and naming the address |
| Token-creator role missing | Google's IAM refusal, passed through |
| No calendar chosen yet | the not-connected state, which is not an error |

Nothing here falls back to a partial or cached render that would make a broken connection look like an empty
week.

## 10. Verification

`npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, `npx next build`.

- **`npm run test:gateway`**, separately — `tests/pg-gateway-client.mjs` is **not** in the `npm test` chain, and
  it is the gate on the extraction. It stays green with no change beyond splitting one import statement into
  two, and every assertion in it keeps asserting exactly what it asserts today.
- New goldens for the four routes in their unconfigured state.
- Pure-function tests, with no Google in the room: the federation config reader, the `expireTime` expiry parse
  and its refusal of a missing one, the freshness/skew arithmetic, the event normaliser (including the exclusive
  all-day `end.date`), and the month-grid arithmetic.
- The screen opened in the browser pane against `npm run dev:sandbox` — a server-component mistake throws at
  request time rather than build time.
- `docs/functionality/calendar.md` written in the same commit, ending with its "Not built yet" section.

## 11. Operator setup

Three steps, in `nompany-application`. Each is named by the error message that fires until it is done.

1. **Enable the Google Calendar API** — APIs & Services → Library → Google Calendar API → Enable.
2. **Share the calendar** with `pg-gateway@nompany-application.iam.gserviceaccount.com` — Google Calendar →
   Settings → the calendar → *Share with specific people* → *See all event details*.
3. **Paste the calendar id** — the same settings page, *Integrate calendar* → Calendar ID → into the /super
   screen.

No consent screen, no OAuth client, no verification review.

## 12. Not built

- Writing, editing or deleting events. The scope is read-only; writing needs a different scope and a re-share.
- Per-studio calendars. Tenant surfaces are untouched by this work.
- More than one connected calendar at a time.
- Push notifications and watch channels. Every read is on demand; there is no sync state.
- Caching events between requests. Each range is fetched when it is asked for.
