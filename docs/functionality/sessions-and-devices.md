# Sessions and devices — sign-in, the devices a person uses, and seats kept to one person

The owner's plan of 18/09/2026 (the decision ledger in `docs/progress.md`): a seat is
for one person, and a login handed to a team should stop working as a team login.

Code: `src/platform/auth/identity.ts` (sign-in), `src/platform/auth/users.ts` (sessions),
`src/platform/auth/otp.ts` (devices), `src/shared/deviceClass.ts` (device types).

## Device types

Every sign-in records the device it came from, as one of three types:

| Type | What it is |
|---|---|
| Computer | A desktop or laptop, touch screen or not |
| Phone | A phone, including one asking for the desktop site |
| Portable Device | A tablet — an iPad, an Android tablet |

**The type is decided from the user agent AND from two facts the sign-in page measures**:
how many touch points the screen has and its short side. The sign-in and sign-up pages
write them into a ten-minute cookie (`nc_dh`, `components/public/deviceHints.js`), so the
password route, the emailed-code route and a Google or Microsoft callback all read the same
thing. The user agent alone filed every Android tablet as a Phone and every iPad as a
Computer (Safari on an iPad has described itself as a Mac since iPadOS 13); an iPad is now a
"Mac" with a touch screen, and a touch screen under 600px on its short side is a phone
whatever the user agent says.

**All of it is reported by the browser and can be faked.** That is why the session limit
(below) holds on the total; the type only decides which slot a sign-in takes.

Rows written before 18/09/2026 say "Tablet"; they read as Portable Device.

**The device list marks "This device"** on the Security page, and lists it first — every
office machine is "Chrome on Windows", so without it nobody tidying the list could tell
their own browser from the one they meant to remove.

## The session limit

**A person may be signed in on 2 Computers and 1 Phone or Portable Device at a time.**
Phones and portable devices share the one slot. `platform/auth/sessionPolicy.ts` holds the
numbers and the rule; `openSession` in `identity.ts` is the one door every sign-in goes
through — the password on a trusted device, the emailed code, and a Google or Microsoft
callback — so the limit cannot be missing from one of them.

**Over the limit, the person is asked which session to sign out**, the oldest chosen for
them. The sign-in is paused on a ten-minute ticket (`nc_pend`, HttpOnly, `OTP.pending`),
and `POST /api/identity/signin` finishes it by ending the session named. The ticket can end
only a session the limit is asking about, and it is spent before the new session opens. A
Google or Microsoft callback cannot ask a question, so it redirects to
`/login?continue=1`, where the page reads the question back. **The desktop client has no
screen for it and ends the oldest session instead.**

**The session that was ended is told why.** Ending one writes an ended state
(`IX.sessionState`, kept seven days) naming the device that signed in; the sign-in page asks
`GET /api/identity/session/ended` and says "You were signed out because this account signed
in on another device (Chrome on Windows)." Twenty people on one login meet that message all
day, which is the point, and every one of those sign-outs is counted
(`u:<id>:activity.evictions`) for the console's sharing flag.

- **A till's session is not counted** — a paired till is the company's device.
- **Sessions from before 18/09/2026 carry no device and take Computer slots.** When a slot is
  over its limit by more than one, the oldest of the excess end without asking; nobody is
  asked to pick eight sessions one at a time.
- **Two sign-ins at the same instant can both pass the check** and leave one session over the
  limit until the next sign-in. The limit is enforced at sign-in, not on every request.
- **The session list no longer drops rows silently.** It was capped at 10 by slicing, and a
  sliced-off session's token still worked while "sign out everywhere" could no longer see it.
  Rows past the list's bound (25) are now ended — their index released.

**The Security page lists where the person is signed in** (`GET/DELETE
/api/identity/sessions`): each session's device, type, place and last activity, "This
session" marked, and a Sign out button on the others. A person at the limit can make room
here before they are asked to.

## The sharing flag, in the console

`/super` → Users shows, for every person, **how many places they are signed in right now**
(a till's session not counted) and a **Flagged** badge when their sign-ins look like more
than one person. `sharingSignals` in `sessionPolicy.ts` decides it from two signals kept on
`u:<id>:activity`:

| Signal | Flagged at |
|---|---|
| Sessions ended because the account signed in elsewhere, last 7 days | 5 or more |
| Devices this account had never used, last 30 days | 5 or more |

A new device is counted where its row is first written (`recordDevice`). The badge's tooltip
gives both counts. **A flag is a reason to look, never a verdict**: nothing suspends anybody
because of one.

- **Filters**: flagged, warned, and the number of active sessions (0, 1, 2, 3+). The card
  heading says how many accounts are flagged.
- **Send sharing warning** (row menu) emails the person a fixed warning — each seat is for
  one person, the terms forbid shared logins, and what to do if it was not them
  (`sharingWarningEmail`). The route wrapper writes the audit line (which console admin, to
  whom, when); the date is kept on the person and shown as "Warned 2 days ago". A warning
  the mail provider refused is not recorded (502).
- **Suspend / Reactivate** (row menu) — a manual click with a confirmation, which **also ends
  every session at once**: a suspended person is refused at sign-in already, but a session
  opened yesterday with "keep me signed in" would otherwise last a month. There was no
  suspend button in the console before this; the status existed and nothing set it. Super
  admins cannot be suspended from the menu.

## Trusted devices

A trusted device skips the emailed code for 30 days. **At most 3 devices are trusted at
once** — the session limit's own total (`TRUSTED_DEVICE_LIMIT`). Ticking "trust this device"
on a fourth still signs the person in, records the device **untrusted**, and says so ("You
already trust 3 devices… remove one on your account's Security page"); the next sign-in there
asks for a code. The Security page says the cap beside the list.

**Nothing trusted is dropped to make room**, silently or otherwise. The list used to be
capped at 10 by dropping the oldest row, trusted or not. It is still bounded at 10, but what
falls off is the oldest *untrusted* history; an account that trusted more than three devices
before the cap keeps them until they expire or are removed. A Google or Microsoft sign-in
records its device as trusted only when there is room.

## The screen lock, the idle timeout and the PIN

**A lock button sits beside the profile** in the studio header and on the account page. It
locks **the whole sign-in** — every studio and every tab on that device — without signing
out; what was on the screen is still there when the PIN is typed. `platform/auth/lock.ts`
holds it; `components/security/SessionLock.js` draws it.

**The lock is enforced on the server.** A session's state (`IX.sessionState`, read in the
same wave as the session index) carries `lockedAt`, the person's idle timeout and when they
were last active. `currentUser` answers null for a locked session, so every route, page and
the live stream refuse it at once; the route wrapper answers **423 `session-locked`** rather
than 401 so a screen shows the lock instead of the sign-in page. The only door a locked
session still reaches is `/api/identity/session/lock`: its status, lock, unlock, and the
heartbeat. A locked tab that reloads a studio page is sent to the sign-in page with
`?locked=1&next=<the page>`, which asks for the PIN and sends it back.

**The cover is opaque** — a blurred page would still show what was on it. Every tab agrees:
lock and unlock travel over a BroadcastChannel, and any request that comes back 423 locks
the tab that made it (a response observer installed once on the page).

**The idle timeout is the person's own choice** (the owner, 18/09/2026), on the account's
Security page: off (the default), 5, 10, 15 or 30 minutes, or 1, 2, 4 or 8 hours — no
"never" beyond off, nothing past a session's length. It needs a PIN, because nothing else
could unlock it. The browser notes activity (pointer, key, wheel, touch) in shared storage
and tells the server at most once a minute; the server locks the session when the timeout
has run out plus 90 seconds' grace for one missed beat (`isLocked`). Changing the timeout
rewrites every session the person has open. **A till's session and the desktop app's have
no idle timeout** — cashiers change by PIN, and the desktop app has no heartbeat and sits
behind its own operating system's lock.

**The PIN** is 4 to 8 digits, not one digit repeated and not a straight run (1234, 9876)
(`shared/pin.ts`, the same rule on both sides). It is stored as a bcrypt hash in
`u:<id>:security` and can never be the account password. Setting, changing or removing it
asks for the account password where the account has one; removing it switches the idle
timeout off with it. **Five wrong PINs end the session and forget its device**, so signing
in again there needs the password and the emailed code.

A session minted before 18/09/2026 has no state document; it gets one the first time it is
locked or given a timeout.

## Not built yet
- Tills paired to a device, and cashiers switching by PIN.
- The PIN asked again before signing an approval.
- Two-factor sign-in with an authenticator app, and passkeys.
