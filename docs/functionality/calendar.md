# The console's calendar

`/super → Application → Calendar`. One Google calendar, read-only, shown to nompany's own
staff — not a per-studio feature and not a tenant-facing screen.

## What it is

A month/week/day grid plus an "Upcoming" list, reading **one** Google calendar the console
has been pointed at. There is no OAuth consent screen and nothing to sign into: the calendar
is read by **impersonating a Google service account**,
`pg-gateway@nompany-application.iam.gserviceaccount.com` — the same service account and the
same Vercel-OIDC → Google-STS → IAM-Credentials chain the Postgres gateway uses to mint its
own Cloud Run identity token (`docs/functionality/pg-gateway.md`, `googleFederation.ts`); this
leg mints an **access token** scoped to `calendar.readonly` instead. "Connecting" a calendar
is therefore not an auth flow at all — it is choosing which calendar id to read, after sharing
that calendar with the service account in Google's own UI.

| Where | What it does |
|---|---|
| `src/lib/data/googleCalendar.ts` | The connection (get/save/clear), and the Google Calendar API calls (`listCalendars`, `getCalendar`, `listEvents`), including `explain()` — Google's refusal turned into an operator-readable sentence |
| `src/platform/auth/googleCalendarAuth.ts` | The credential: `calendarServiceAccount()`, `getCalendarAccessToken()`, the cached access-token mint |
| `src/platform/auth/googleFederation.ts` | The shared first two legs of the chain (OIDC → STS), also used by `pgGatewayAuth.ts` |
| `src/shared/calendar.ts` | Pure, client-safe date arithmetic: `monthGrid`, `eventsByDay`, `normaliseEvent`, `eventDayKeys` — no store, no network |
| `src/app/api/super/google-calendar/route.ts` | `GET` (connection + service account; `?discover=1` also lists calendars), `PUT` (connect/validate), `DELETE` (disconnect) |
| `src/app/api/super/google-calendar/events/route.ts` | `GET ?from=&to=` — the events in a range |
| `src/app/super/(shell)/application/calendar/page.js` | Server component: reads the connection, branches to one of the two screens below |
| `src/app/super/(shell)/application/calendar/ConnectCalendar.jsx` | The not-connected screen: the three setup steps |
| `src/app/super/(shell)/application/calendar/CalendarBoard.jsx` | The connected screen: the grid, Upcoming, and Disconnect |

## What it shows

**Not connected:** three numbered steps — share the calendar with the service account (shown
verbatim, copyable, and read from the route's own `serviceAccount` field rather than
hardcoded in the screen, so the screen cannot name an account the server does not actually
use), confirm the Calendar API is enabled on the project, and paste the calendar's id into a
field that `PUT`s the connection. A **"Look up my calendars"** button is a separate, explicit
action — not fired on page load — because it is a real round trip to Google (STS, then IAM
Credentials, then `calendarList`) and can take a few seconds; its dropdown renders only when
it returns at least one calendar. Returning **zero** is normal, not an error: a calendar
shared with a service account routinely never shows up in that account's own `calendarList`
(list entries need an acceptance step a service account never performs), which is exactly why
pasting an id is the primary path and the dropdown is only ever a convenience on top of it.

**Connected:** a Month/Week/Day grid with working Prev/Next, an "Upcoming" card (the next five
events at or after now, from whatever range is currently on screen — viewing a past month
legitimately shows nothing upcoming), a "Calendar" card naming the one connected calendar
(its `summary`, its `timeZone`, and Disconnect), and a count badge for the range in view. Week
and Day narrow the same fetch and reuse the same grid cells Month does — there are not three
separate renderers, just three different slices of one `monthGrid()` call, because that
function already pads to whole Monday-start weeks and so already contains whichever week or
day is being viewed. The header's "New event" button is gone; in its place, when connected,
is **"Open in Google Calendar"**, a link to
`https://calendar.google.com/calendar/u/0/r?cid=<the calendar's id>` — `calendar.readonly`
cannot write, and a button that claims to create an event when nothing here can is worse than
no button at all.

## Nothing writes back

The scope is `calendar.readonly`. Nothing in this feature creates, edits, or deletes a Google
event, and nothing ever will through this screen without a scope change and a re-share. The
only writes are to **this app's own** stored connection (which calendar id is chosen) — never
to the calendar itself.

## Where the connection is stored

One small JSON object, `REG.googleCalendar` (`{ calendarId, summary, timeZone, connectedAt,
connectedBy }`) — the same shape and lifecycle as the console's Nova switchboard config. No
credential is stored anywhere: not a client secret, not a refresh token, not an API key.
Reconnecting after a redeploy needs nothing, because there was never a token to lose — the
service-account chain mints a fresh one on the next read.

## The three setup steps, in Google's own UI

1. Share the calendar with the service account address shown on screen, with **"See all
   event details"** access (not a lower tier — see the 403 message below).
2. Make sure the **Google Calendar API** is enabled on the project the service account
   belongs to.
3. Find the calendar's id (Google Calendar → Settings and sharing → Integrate calendar →
   *Calendar ID*) and paste it in, or pick it from "Look up my calendars" if it happens to
   appear there.

## The failure messages, and what each one means

All five come from `explain()` in `googleCalendar.ts`, are shown **verbatim** (never replaced
with "something went wrong"), and each names its own fix because the three Google failures
below look identical from this screen otherwise:

| Where it shows | Message | What it means |
|---|---|---|
| Connect (`PUT`, 400) | *"The Google Calendar API is not enabled on this project…"* | The project has never had the Calendar API turned on. Fix: APIs & Services → Library → Google Calendar API → Enable. |
| Connect (`PUT`, 400) | *"That calendar is not visible to `<service account>`…"* | Google answered 404 — the calendar was never shared with the service account at all (this is the common case; a private calendar with no sharing entry for the service account looks exactly like "does not exist" to it). |
| Connect (`PUT`, 400) | *"Google refused the read. Usually the calendar is shared with less than…"* | Google answered 403 — the calendar **is** shared with the service account, but at a lower access level than "See all event details" (e.g. "See only free/busy"). |
| Connect (`PUT`, 400) or grid (`GET events`, 502) | *"Google refused with `<status>` (`<reason>`): `<Google's message>`"* | Anything else Google sent back — rate limiting, a malformed calendar id, a transient fault. The status and Google's own text are both included. |
| Grid (`GET events`, 502) | Any of the above, shown in place of the grid | The connection was valid when it was made but has since broken (unshared, API disabled after the fact, etc). The board never renders an empty week for this — an empty week and a broken connection must not look the same. |

`GET /api/super/google-calendar/events` also answers plain `400 { error: "invalid" }` for a
malformed or unbounded date range (checked before the connection is even read), and the
Connect PUT answers plain `400 { error: "invalid" }` for an empty `calendarId` — neither of
those is a Google failure, so neither carries a `detail`.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No event creation or editing.** The scope is read-only by design (see *Nothing writes
  back* above); adding a write path is a different OAuth scope and a re-share, not a flag to
  flip.
- **No per-studio calendars.** This is one calendar for the whole console, not one per tenant.
  A studio has no calendar of its own here.
- **No more than one connected calendar.** Connecting a second id replaces the first; there is
  no multi-calendar overlay, no per-calendar colour, no show/hide list.
- **No push notifications.** Nothing subscribes to Google's push channels or watches for
  changes; the grid only knows what it last fetched.
- **No caching between requests.** Every navigation (Prev/Next, Month/Week/Day, a page
  refresh) is a fresh `events.list` call through the service-account chain; nothing is cached
  server-side or across requests. The access token itself is cached (see
  `googleCalendarAuth.ts`), but the event data is not.
