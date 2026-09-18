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

## Not built yet
- A cap on trusted devices with no silent eviction.
- The lock button, the idle timeout and the PIN.
- Tills paired to a device, and cashiers switching by PIN.
- The PIN asked again before signing an approval.
- Two-factor sign-in with an authenticator app, and passkeys.
