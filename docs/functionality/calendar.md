# Connected calendars

Two surfaces, one mechanism. A **person** connects their own Google or Microsoft account from
their account settings and sees their real events inside nompany. The **`/super` console**
connects one Google calendar the same way and shows it as a month grid. Both go through the
same OAuth flow, the same token lifecycle, and the same provider readers — only the store
differs, because one connection belongs to a person and the other belongs to the deployment.

Nothing here is a section. Nothing new is gated, and no studio gains a calendar of its own.

## How a calendar gets connected

Read-only OAuth, both providers. Google is asked for
`https://www.googleapis.com/auth/calendar.readonly` with `access_type=offline` and
`prompt=consent`; Microsoft is asked for `Calendars.Read offline_access` — the two spellings
of "give me a refresh token", and getting either wrong fails silently an hour later when the
access token expires with nothing left to renew it.

The grant lives on its **own** callback path, never sign-in's. `oauth.ts` authenticates a
person *into* nompany with identity-only scopes; these routes authorise nompany to *read* a
calendar somebody already owns, so a calendar grant can never be mistaken for a session.

`state` is signed and short-lived, reusing `oauth.ts`'s `makeState` / `readState` /
`stateCookie` rather than a second CSRF implementation. **It decides a redirect and nothing
else.** The connection is stored against the identity in the session — the signed-in user, or
the console operator — never against anything inside `state`. The reference design this work
started from keyed the tokens off a value in `state`, which makes a signed cookie the only
thing standing between one tenant's calendar and another's.

| Route | Auth | What it does |
|---|---|---|
| `api/auth/calendar/[provider]/start` | `user` | Redirects the person to the provider's consent screen |
| `api/auth/calendar/callback/[provider]` | `user` | Verifies state, exchanges the code, stores the connection against `user.id`, lands back on `next` |
| `api/super/google-calendar/start` | `super` | The console's own consent redirect |
| `api/super/google-calendar/callback` | `super` | Same exchange, stored against `REG.googleCalendar` |

**The console's two routes are separate on purpose, not duplicated by accident.** What they
write is the deployment's calendar, so the authority to write it has to be the console's. Fold
them into the account-level pair — which is `auth: "user"` — and branch on something inside
`state`, and the console's calendar is one plausible-looking `next` away from any account
holder: `state` is signed, but it is minted by a route any signed-in user may reach, so the
signature proves only that we wrote it, never that an operator asked for it. The cost of the
separation is one extra redirect URI on the Google OAuth client
(`/api/super/google-calendar/callback`), registered alongside the two account-level ones.

## The token lifecycle

`src/platform/auth/calendarOAuth.ts`, and it is **two layers on purpose**:

- **`freshAccessToken(connection, persist, deps?)` is the core.** Given a live connection and a
  way to write changed fields back, it returns a token good for at least five minutes
  (`REFRESH_BUFFER_MS` — a token still valid when we check it can be expired by the time it
  reaches the provider). It knows nothing about where the connection is stored, and `persist`
  runs only when a refresh actually happened.
- **`getCalendarAccessToken(userId, provider)`** is the user-keyed wrapper over it.
- **`consoleCalendarAccessToken()`** (`src/lib/data/googleCalendar.ts`) is the console-keyed
  wrapper over the same core. The console's calendar belongs to no user, so there is no id to
  key it under; the split is what lets it reuse the refresh, the rotation and the expiry
  buffer rather than owning a second copy of all three.

**Microsoft rotates refresh tokens** on most refreshes and Google usually does not, so the
core returns `undefined` rather than the old value when nothing came back — which is what lets
a persist step tell "nothing to update" apart from "re-issued the same one". A rotated token
that is not stored breaks the connection permanently, one access-token lifetime later.

**Only `invalid_grant` clears a stored connection.** That is the provider saying the person
revoked access; a timeout, a 500 or a DNS blip must leave the record alone. It is a distinct
error *type* (`CalendarGrantRevokedError`), not a message a caller has to pattern-match.

Concurrent refreshes of one connection are de-duplicated by key — compare-and-set makes the
*write* safe (invariant 8) and does nothing about the *request*, and a losing CAS write takes
its rotated refresh token with it.

## What is stored, and what is not

**Stored: two encrypted tokens and a label.** Both the refresh token and the access token are
AES-256-GCM encrypted (`fieldCrypto.ts`) before they touch the store and decrypted only in
memory, on the way back out. A record whose refresh token does not decrypt reads as **no
connection** rather than as a connection with a blank token — `decryptField` fails soft, so a
rotated `FIELD_ENCRYPTION_KEY` would otherwise leave something that looks connected right up
until the access token expired.

| Key | Shape |
|---|---|
| `U.calendarConnection(userId, provider)` | `provider`, `accountEmail`, `refreshToken`*, `accessToken`*, `expiresAtMs`, `calendarIds`, `connectedAt` |
| `REG.googleCalendar` | `accountEmail`, `refreshToken`*, `accessToken`*, `expiresAtMs`, `calendarId`, `summary`, `timeZone`, `connectedAt`, `connectedBy` |

\* encrypted at rest.

**Not stored: any calendar content.** No event, title, time, location, guest or busy block is
ever written down. Everything on screen was fetched for that request and is discarded with it.

**No token reaches a response body, a log line or a redirect URL.** `publicConnection()` — one
in `calendarConnections.ts` for a person's, one in `lib/data/googleCalendar.ts` for the
console's — is the only shape a route may return, and each names its fields rather than
deleting two from a spread: a spread that forgets a field added later leaks a token silently,
into a body and into every log that records one. The expiry does not survive either. A failed
exchange lands the person back with `?calendar=error` and nothing about *why* — the provider's
own reason stays in the server's own error, never in a URL.

## The account surface

`/{en,ar}/account → Calendars` (`src/components/public/AccountHome.js`). Connecting lives at
account level because the connection is the *person's* and works across every studio they are
in — never inferred from an email domain, since a Gmail address may live in Outlook and a work
account may sign in one way and keep meetings in another. Both buttons are offered whenever
that provider is configured, and a provider with no client id/secret is not offered at all
rather than offered and broken.

`available` is driven by the **sign-in** credentials — one client id and secret serve both — so
a Connect button appears as soon as Google or Microsoft sign-in works, whether or not anybody
registered *this* feature's callback path. The panel therefore shows that path under the
buttons — not just written out, but the **exact address the server will send**: a real
operator registered `https://nompany.com/api/auth/calendar/callback/google` and was refused
with `redirect_uri_mismatch`, because the site actually serves on `www.nompany.com` and
providers compare byte for byte. `GET /api/account/calendar` now returns a `redirectUris` map
(`calendarRedirectUri(request, provider)`, one entry per provider in `available`) built from
the **request that asked**, so the string on screen is never a guess — it is shown in a
monospace, select-all, click-to-copy control (`CopyableCode`, `src/components/CopyableCode.js`)
so it can go straight into the provider's console with nothing retyped. The `/super` calendar
screen shows the same thing about its own, different, callback path.

Connected rows show the account email and when it was connected, with Disconnect behind a
confirm. **`connectedAt` means first connected, on both surfaces** — reconnecting an expired
grant carries the original stamp forward rather than resetting it. (`connectedBy`, which only
the console has, does the opposite: it answers "who did this", so it records whoever reconnected.) Below them, the person's next events across **every** connection, merged and sorted.
A provider that fails is reported by name alongside the events that did load — failing the
whole request throws away a calendar that still works, and quietly returning half of it tells
somebody their calendar is empty when it is actually broken.

| Route | What it answers |
|---|---|
| `GET /api/account/calendar` | `{ connections, available, redirectUris }` — `available` is the configured providers, `redirectUris` the exact callback address per provider in `available` |
| `DELETE /api/account/calendar?provider=` | Revokes at the provider, then clears |
| `GET /api/account/calendar/events?from=&to=` | Merged, sorted events plus a per-provider `errors` list |

Disconnecting **revokes and then forgets**, not merely forgets, which would leave a live grant
nobody can see. Microsoft has no revocation endpoint for delegated tokens — that was checked,
not forgotten — so there disconnecting drops our copy and the grant expires on Microsoft's own
schedule.

## The console's calendar

`/super → Application → Calendar`. One Google calendar, read-only, for nompany's own staff.

**This used to be a service account.** Reading the calendar meant impersonating
`pg-gateway@…` through Vercel OIDC → Google STS → IAM Credentials, and an operator had to
share the calendar with that address by hand, in Google's own UI, before anything worked.
There was no consent screen and no refresh token, so nothing was stored but a calendar id.
That whole path is deleted: the console presses **Connect** like everybody else.
(`googleFederation.ts` stays — the Cloud Run Postgres gateway still mints its identity through
it. See `docs/functionality/pg-gateway.md`.)

Three states, two screens:

- **Not connected** — one Connect button, or a plain sentence naming the two env vars if Google
  is not configured on this deployment. Either way, the exact redirect URI to register
  (`consoleCalendarRedirectUri(request)` — a *different* path from the account surface's own,
  `/api/super/google-calendar/callback`) is shown underneath in the same `CopyableCode`
  control the account panel uses, computed by `GET /api/super/google-calendar`'s
  `redirectUri` field rather than hardcoded in the screen — it used to name the bare path with
  no host at all, which is not what any provider will actually compare against.
- **Connected, no calendar chosen** — a dropdown of that account's calendars. Under the
  service account this list was unreliable (a calendar shared with a service account routinely
  never appeared in its own `calendarList`, which is why pasting an id by hand used to be the
  primary path and listing was opt-in behind `?discover=1`). An account's grant over its own
  calendars has no such gap, so the dropdown is now the only way a calendar is chosen, the
  paste field is gone, and so is the opt-in.
- **Connected and chosen** — the Month/Week/Day grid, an "Upcoming" card (the next five events
  at or after now, from whatever range is on screen — viewing a past month legitimately shows
  nothing), a card naming the calendar, and Disconnect.

Week and Day slice the *same* `monthGrid()` output Month renders, rather than being two more
renderers with their own idea of which cell is today. The header's action is **"Open in Google
Calendar"**, a link out — `calendar.readonly` cannot write, and a button that claims to create
an event when nothing here can is worse than no button.

| Route | What it answers |
|---|---|
| `GET /api/super/google-calendar` | `{ connection: null, redirectUri }`, or the public connection plus `calendars`, `problem` and `redirectUri` |
| `PUT /api/super/google-calendar` | Chooses a calendar id; validated by reading it, so "saved" means "readable" |
| `DELETE /api/super/google-calendar` | Revokes at Google, then clears |
| `GET /api/super/google-calendar/events?from=&to=` | The events in a range |

**With nothing connected, neither route touches the network** — there is no token to call
Google with. That is what keeps their golden responses deterministic rather than depending on
whose `.env.local` was loaded; whether Google is configured is read by the screen, a server
component with no golden, rather than served in a response body.

A broken connection is shown as the provider's own message, verbatim, in place of the grid.
An empty week and a calendar that stopped working must never look the same.

## Where the code lives

| Where | What it does |
|---|---|
| `src/platform/auth/calendarProviders.ts` | The two providers as data: URLs, scopes, offline params, endpoint builders, and the two redirect-URI builders. Pure — no network, no store |
| `src/platform/auth/calendarOAuth.ts` | Exchange, refresh (with rotation), revoke, the storage-agnostic core and the user-keyed wrapper |
| `src/platform/auth/calendarConnections.ts` | A person's connection: encrypted read/write, `publicConnection()` |
| `src/lib/data/calendarReads.ts` | The provider reads — `listCalendars`, `listEvents` (following both providers' pagination), `callProvider` |
| `src/lib/data/googleCalendar.ts` | The console's connection and its console-keyed token wrapper |
| `src/shared/calendar.ts` | Pure, client-safe: `monthGrid`, `eventsByDay`, `eventDayKeys`, and a normaliser per provider |
| `src/components/public/AccountHome.js` | The account surface's Calendars panel |
| `src/app/super/(shell)/application/calendar/*` | The console's screen: `page.js`, `ConnectCalendar.jsx`, `CalendarBoard.jsx` |

Two provider traps, both paid for and both encoded in `calendarProviders.ts`: Google's
`singleEvents=true` expands a recurring series into instances (without it a weekly standup is
*one* event carrying a recurrence rule), and Microsoft's `/me/events` does not expand
recurrence at all while `/me/calendarView` does — the same trap, a different spelling. Both
providers' all-day events carry an **exclusive** end, which paints an all-day event one cell
too wide if taken as inclusive.

A third, in `shared/calendar.ts`: **Microsoft Graph returns a date-time with no offset
designator** and puts the zone in a sibling field — `{ dateTime: "2026-09-03T09:30:00.0000000",
timeZone: "UTC" }` — while JavaScript parses an offset-less date-time as *local* time. Copied
through verbatim, a 09:30 UTC meeting rendered as 09:30 in Riyadh instead of 12:30, on every
timed Microsoft event, with nothing on screen saying so. A Graph `Prefer: outlook.timezone`
header does not fix it: that changes which zone Graph answers in, not whether the designator is
there. So `normaliseMicrosoftEvent` converts: a value that already carries an offset is kept, a
`timeZone` naming UTC gets `Z` appended exactly, and an IANA name is resolved through `Intl`,
which reads the zone's real offset *at that instant* (twice — the first read is necessarily
taken at the wrong instant, and a DST transition inside that gap makes it an hour out).
All-day events are deliberately **not** converted: a holiday is the 3rd everywhere, and
converting its local midnight moves it onto the 2nd east of Greenwich.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing writes to anybody's calendar.** Both scopes are read-only by design. Creating,
  editing, moving or cancelling an event is a different scope and a fresh consent from every
  person who has connected — not a flag to flip.
- **Colleagues cannot see each other's availability.** This is Phase 2 of the design
  (`docs/superpowers/specs/2026-09-03-connected-calendars-design.md` §8.1): a per-studio
  "let colleagues here see when I'm busy" opt-in, a free/busy read path on both providers, and
  an availability strip on the planner. None of it exists yet. There is no
  `s:<studioId>:calendarShare` key, no opt-in toggle, and no way for one person to see
  anything at all about another person's calendar.
- **No studio has a calendar of its own.** A connection is a person's, or the console's. A
  studio-wide shared calendar is not this feature.
- **The console shows one calendar, not several.** Choosing a second replaces the first —
  there is no overlay, no per-calendar colour, no show/hide list. A person's account surface
  reads every calendar they have connected, but has no picker either: it reads each
  provider's default calendar.
- **No push notifications.** Nothing subscribes to Google's push channels or Microsoft's
  change notifications, and nothing watches for changes. A screen knows only what it last
  fetched.
- **No caching of events.** Every navigation — Prev/Next, Month/Week/Day, a page refresh — is
  a fresh request to the provider. Access tokens are reused until they are near expiry, which
  is the token lifecycle doing its job; event data is never cached, server-side or across
  requests.
- **A Windows zone name is not converted.** Graph returns one (`"Arab Standard Time"` rather
  than `"Asia/Riyadh"`) when an event was written in its organiser's own zone, and mapping it
  needs a Windows→IANA table this codebase does not ship — `Intl` rejects the name outright.
  Such a value is left exactly as Graph sent it, offset-less, so it renders in the viewer's own
  zone: an unconverted time rather than a confidently wrong one. Shipping the table (or asking
  Graph for UTC on every read) is the fix when it is worth the weight.
- **No end-to-end proof against a live provider.** Every pure part is asserted with a fake
  fetch (`tests/connected-calendars.mjs`, `tests/google-calendar.mjs`) and the unconnected
  routes are pinned by goldens. That Google or Microsoft accept a real client, that consent
  completes, and that a token refreshes against the live endpoint need OAuth registrations
  only the operator can create.
