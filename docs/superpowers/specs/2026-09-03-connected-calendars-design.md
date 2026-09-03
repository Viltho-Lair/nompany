# Connected calendars — design

**Status:** approach approved 03/09/2026 (approach A — the connection belongs to the person, visibility
is opted into per studio; both providers from the start). Ready for an implementation plan.

**Partially supersedes** `docs/superpowers/specs/2026-09-03-super-google-calendar-design.md`. That design
chose a service account over OAuth for three good reasons, and all three still hold **for a
single-operator console**. They stop holding the moment tenants are involved: asking a studio member to
share their calendar with `pg-gateway@nompany-application.iam.gserviceaccount.com` and paste a calendar
id is not a feature anyone will use. The earlier decision was right for what it was for and wrong for
what the product now needs; §3 records the reversal rather than quietly overwriting it.

---

## 1. Problem

A studio member's real meetings live in Google Calendar or Microsoft 365, and nompany cannot see them.
So work gets scheduled on top of a site visit nobody knew about, and anyone who wants both views keeps
two tabs open.

The `/super` console can already show one calendar, but only through a service account the calendar has
been shared with by hand. That mechanism cannot be handed to tenants: it needs a Cloud Console address,
a sharing dialog, and a pasted calendar id per person.

## 2. Goal

A person connects their own Google or Microsoft account once, from their account settings, and sees
their real events inside nompany. Separately, in each studio, they choose whether colleagues **there**
may see when they are busy — never what the meeting is.

**Non-goals.** Writing to anyone's calendar. Auto-scheduling from availability. Push notifications or
watch channels. A studio-wide shared calendar inside a tenant — that shape is `/super`'s, not this.
Caching calendar content.

## 3. Why this reverses the earlier decision

The earlier spec rejected OAuth because the credential on hand was an API key, because
`calendar.readonly` is a sensitive scope whose refresh token expires weekly on an unverified External
consent screen, and because a service account removed the entire token lifecycle.

The first is now moot — an OAuth client is a two-minute, one-time registration in the same project, done
once by the operator and never by a user. The second is unchanged and is now a **product** gate rather
than an inconvenience; §10 states it plainly. The third was the real prize and it is genuinely lost:
this design reintroduces stored refresh tokens, which is the largest single increase in this product's
sensitive-data surface. §4 and §7 exist to contain that.

What does **not** change: the service account is the wrong tool here, because it acts as itself and can
only read a calendar somebody explicitly handed it. OAuth acts as the person, with their consent, which
is exactly what the feature is.

## 4. Identity and storage

### 4.1 The connection belongs to the person

`U.calendarConnection(userId, provider)` — built in `keys.ts` per invariant 1 — holding:

```json
{
  "provider": "google",
  "accountEmail": "someone@example.com",
  "refreshToken": "enc:v1:…",
  "accessToken":  "enc:v1:…",
  "expiresAtMs": 1772668800000,
  "calendarIds": ["primary"],
  "connectedAt": 1772668800000
}
```

Both tokens pass through `encryptField` (AES-256-GCM, `FIELD_ENCRYPTION_KEY`, which already throws
rather than storing plaintext when the key is absent). **No route ever returns either field**; §7.3
names the one function that is allowed to shape a connection for a client.

Keyed **per provider**, so one person may hold a Google and a Microsoft connection at once. That costs
nothing today and is the one thing that would need a migration later — once events are normalised,
merging two providers is a concatenation, and merging free/busy is a union of intervals.

A Google account belongs to the person, not to a tenant. Making them re-consent in every studio would be
friction with no privacy benefit: same account, same scope, same data. The control that matters is
§4.2, not where the token sits.

### 4.2 Sharing is per studio, and separate

`s:<studioId>:calendarShare` — the CollaboratorIDs who have opted in **in that studio**.

Two keys rather than a field on the connection, for two reasons. Cascade-by-prefix already destroys the
share list with its studio (invariant 11) while leaving the person's connection alone, which is the
correct outcome for someone who leaves one studio and stays in another. And a person in two studios can
share availability with one and not the other, which a flag on the connection cannot express.

Addressed by **CollaboratorID**, per invariant 6. The user id appears only where a token must be
resolved, never in anything a studio surface renders.

### 4.3 The write that would have been slow

A token refresh writes **only** `U.calendarConnection`. It never touches `s:<studioId>:collaborators`.

That is the reason tokens are not a field on the collaborator row: the collaborators array is one key
holding the whole list, every write is a compare-and-set on it, and it is among the hottest keys a studio
has. An hourly per-person token refresh landing there would put every member's calendar refresh into
contention with every membership edit, for a value no other reader of that row wants.

## 5. Two providers, one shape

A `PROVIDERS` record, the same pattern `src/platform/auth/oauth.ts` already uses for sign-in — not a
second mechanism beside it.

| | Google | Microsoft |
|---|---|---|
| authorize | `https://accounts.google.com/o/oauth2/v2/auth` | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| token | `https://oauth2.googleapis.com/token` | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| scope | `https://www.googleapis.com/auth/calendar.readonly` | `Calendars.Read offline_access` |
| offline | `access_type=offline&prompt=consent` | `offline_access` in the scope |
| calendars | `GET /calendar/v3/users/me/calendarList` | `GET /v1.0/me/calendars` |
| events | `GET /calendar/v3/calendars/{id}/events` | `GET /v1.0/me/calendarView` |
| free/busy | `POST /calendar/v3/freeBusy` | `POST /v1.0/me/calendar/getSchedule` |
| credentials | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` |

The credential names are the ones `oauth.ts` already reads, so one registration per provider serves both
the calendar and social sign-in.

### 5.1 Four differences that fail silently

Each of these produces no error at the point of the mistake, and a broken integration days later.

1. **Microsoft needs `offline_access` in the scope or it never issues a refresh token at all.** It is
   Microsoft's `access_type=offline`. Without it the connection works for exactly one hour and then dies
   with nothing to renew it.
2. **Microsoft rotates refresh tokens.** Every refresh returns a *new* refresh token which must replace
   the stored one. Google's normally does not. Writing the old one back leaves a connection that works
   until the next refresh and then fails permanently, far from the cause.
3. **`/me/events` does not expand recurrence; `/me/calendarView` does.** This is the exact analogue of
   Google's `singleEvents=true`: get it wrong and a weekly standup appears once instead of every week.
4. **Microsoft's free/busy can leak.** `getSchedule` returns `scheduleItems` that may carry `subject` and
   `location`. So the Microsoft path reads **`availabilityView` only** — the busy-code string — and never
   maps `scheduleItems`. On Google the guarantee is structural (`freeBusy` cannot return a title); on
   Microsoft it is a rule this code must keep, and the comment saying so is load-bearing.

### 5.2 One normaliser, two adapters

`src/shared/calendar.ts` already defines `CalendarEvent` and is pure and client-safe. Each provider gets
a normaliser into that shape. Microsoft's all-day events, like Google's, carry an **exclusive** end — the
same off-by-one that paints an all-day event one cell too wide, already guarded by `eventDayKeys`.

## 6. The flow

One callback: `/api/auth/calendar/callback/[provider]`.

`state` is signed and short-lived, reusing `oauth.ts`'s `makeState` / `readState` / `stateCookie` rather
than a second CSRF implementation. It carries **where to send the person back** — the console, or a
studio slug.

**The connection is stored against the signed-in user from their session, never against anything in
`state`.** The reference document this work started from used `state` to decide *whose* tokens these
are. That makes a signed cookie the only thing between one tenant's calendar and another's. Here state
decides a redirect and nothing else; if it is missing or fails verification the callback refuses, and
the worst outcome is a person landing on the wrong page already connected as themselves.

Disconnecting revokes at the provider and then clears the record — not merely forgetting it, which would
leave a live grant nobody can see.

## 7. Who may read what

### 7.1 The owner
Full events for their own calendars — titles, times, locations.

### 7.2 A colleague
`freeBusy` / `availabilityView` only: intervals, no titles, no guests, no locations. **Enforced by
calling a different endpoint, not by filtering our own response**, so a rendering bug cannot leak detail
that was never fetched.

Two conditions, both required: the two share a studio, **and** the owner opted in for that studio.

**No new permission key.** The opt-in is the control; every member sees the availability of colleagues
who opted in. A right that merely duplicated the opt-in would be a right nobody grants — invariant 16's
spirit — and a second gate that can disagree with the first.

### 7.3 Nothing is stored
nompany stores credentials and never calendar content. Every event and every busy block is fetched on
demand and discarded. One function, `publicConnection()`, shapes a connection for a client — provider,
account email, connected-at — and it is the only thing any route may return.

## 8. Surfaces

**Connecting lives at account level** (`/{en,ar}/…`), alongside the person's other account settings,
because the connection is the person's and works across every studio. Two buttons — Connect Google,
Connect Microsoft — never inferred from the email domain: a Gmail address may live in Outlook, and a work
account may sign in one way and keep meetings in another.

**Inside a studio:** a per-studio *"let colleagues here see when I'm busy"* toggle, and the member's own
events drawn on the planner's timeline alongside their assignments — the same surface, so a real meeting
and a scheduled task are visible against each other rather than in two places.

**The colleague-facing consumer is the planner too**, as a availability strip per person. This is
deliberate rather than incidental: with nowhere that colleagues actually see free/busy, the opt-in would
be a switch that controls nothing, which is invariant 16's failure in a different costume.

## 8.1 Phasing

Two phases, because the first one is the whole point and the second is what makes it a team feature.
Each is independently shippable and independently useful.

**Phase 1 — a person sees their own calendar.** Both providers, the connection, the account-level connect
and disconnect, the token lifecycle, their own events rendered, and `/super` moved onto the same path.
No sharing, no opt-in, no planner strip. This is the phase that answers "I connect and I see my
calendar", and it needs neither the share key nor a colleague read path.

**Phase 2 — colleagues see availability.** `s:<studioId>:calendarShare`, the per-studio toggle, the
free/busy read path on both providers, and the planner's availability strip.

Phase 2's storage is designed now (§4.2) so phase 1 does not have to be unpicked, but nothing in phase 1
depends on it existing.

**None of this is a section.** The fifteen sections are unchanged, nothing new is gated, and Main does
not gain a child — the same reasoning that kept the engagements view out of the section tree.

## 9. Failure modes

| Cause | What the person is told |
|---|---|
| Refresh returns `invalid_grant` | access was revoked at the provider; the connection is marked disconnected and they are asked to reconnect **once**, not on every request |
| No `MICROSOFT_CLIENT_ID` / `GOOGLE_CLIENT_ID` | that provider's button is not offered at all, rather than failing after the click |
| Provider refuses a read | the provider's own reason, passed through, on screen and in the server log at error level |
| Colleague has not opted in | they are simply absent from availability — never "denied", which would itself disclose that they have a connection |

## 10. The operational gates

Neither of these is a code problem, and neither can be engineered away.

**Google.** `calendar.readonly` is a sensitive scope. An unverified External app is capped at 100
hand-added test users, and refresh tokens expire every **7 days** while the app is in Testing. Real
tenants therefore require **app verification**: a privacy policy URL, domain verification and a demo
video, reviewed over days to weeks.

**Microsoft.** An Entra app registration, and for a multi-tenant app, **publisher verification**.
Separately, an organisation's admin-consent policy may mean a user **cannot** self-consent to
`Calendars.Read` — their IT administrator must approve nompany for that whole tenant. Expect this from
enterprise customers and surface it as a message rather than a failure.

## 11. Verification

`npm test`, `npm run test:gateway`, both `tsc` passes, `npx next build`, `scripts/bundle-budget.mjs`,
`npm run lint`.

Pure tests, no provider in the room: the provider record's scope strings and offline parameters; the
refresh-due arithmetic with its buffer; **that a rotated Microsoft refresh token replaces the stored
one**; both event normalisers including the exclusive all-day end; and `publicConnection()` proving no
token can reach a response.

Goldens for the new routes in their unconfigured state, plus the existing four `/super` calendar goldens
re-recorded deliberately, in their own commit, when the console moves onto this path.

The screens opened in the browser pane against `npm run dev:sandbox` — a server-component mistake throws
at request time, not at build time.

`docs/functionality/calendar.md` rewritten in the same commit, ending with its "Not built yet" section.

## 12. Not built

- Writing, editing or deleting events on anyone's calendar.
- Auto-scheduling or conflict resolution from availability — v1 shows busy blocks; it does not act on them.
- Push notifications or watch channels; every read is on demand.
- A studio-wide shared calendar inside a tenant.
- Caching calendar content between requests.
- Providers beyond Google and Microsoft.
