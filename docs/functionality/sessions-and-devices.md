# Sessions and devices — sign-in, the devices a person uses, and seats kept to one person

The owner's plan of 18/09/2026 (the decision ledger in `docs/progress.md`): a seat is
for one person. **There is no limit on how many places a person may be signed in** — a
limit of two computers and one phone, and a cap of three trusted devices, shipped on
18/09/2026 and were removed on the owner's instruction the next day ("remove limitations for
users"). What stays against a shared login is what stops nobody working: the console sees
where each person is signed in and flags an account meeting many new devices, a signature
asks the signer's PIN, and a till opens only on its paired device.

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

**All of it is reported by the browser and can be faked**, so a type describes a sign-in and
controls nothing.

Rows written before 18/09/2026 say "Tablet"; they read as Portable Device.

**The device list marks "This device"** on the Security page, and lists it first — every
office machine is "Chrome on Windows", so without it nobody tidying the list could tell
their own browser from the one they meant to remove.

## Every sign-in, one door

`openSession` in `identity.ts` is the one place every sign-in ends — the password on a
trusted device, the emailed code, a Google or Microsoft callback, a passkey, and a sign-in
resumed after the authenticator — so what a session is minted with (its device, the desktop
app's marker) is the same whichever way in was taken. **It asks nothing about how many
sessions the person already has.**

- **The session list no longer drops rows silently.** It was capped at 10 by slicing, and a
  sliced-off session's token still worked while "sign out everywhere" could no longer see it.
  The list is bounded at 25 live sessions now — a storage bound far past anybody's desk, not a
  policy — and a row past it is ENDED, its index released.
- **A session that was ended is told why.** Ending one writes an ended state
  (`IX.sessionState`, kept seven days); the sign-in page asks `GET /api/identity/session/ended`
  and says "This session was signed out from another of your devices."

**The Security page lists where the person is signed in** (`GET/DELETE
/api/identity/sessions`): each session's device, type, place and last activity, "This
session" marked, and a Sign out button on the others — the answer to "I left myself signed in
somewhere".

## The sharing flag, in the console

`/super` → Users shows, for every person, **how many places they are signed in right now**
(a till's session not counted) and a **Flagged** badge when their sign-ins look like more
than one person. `sharingSignals` in `sessionPolicy.ts` decides it from one signal kept on
`u:<id>:activity`: **five or more devices this account had never used, in the last 30 days.**
A new device is counted where its row is first written (`recordDevice`), and the badge's
tooltip gives the count. (A second signal — sessions ended by another sign-in — went with the
session limit that produced it, 19/09/2026.) How many places a person is signed in is shown
beside the flag and filterable, but is not a trigger: with no limit it is a fact to read, not
a rule broken. **A flag is a reason to look, never a verdict**: nothing suspends anybody
because of one.

- **Filters**: flagged, warned, and the number of active sessions (0, 1, 2, 3 or more). The card
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

A trusted device skips the emailed code for 30 days — **in the browser it was trusted in**,
when Fingerprint identified that browser (`device-intel.md`): the device cookie copied onto
another machine asks for the code again. **There is no cap on how many** — a cap of
three shipped with the session limit and was removed with it (19/09/2026).

**Nothing trusted is dropped to make room**, silently or otherwise. The list used to be capped
at 10 by dropping the oldest row, trusted or not. It is still bounded at 10, but what falls off
is the oldest *untrusted* history. A passkey sign-in records its device and leaves the device's
trust as it was: trust is about skipping the code after a password.

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
could unlock it. The browser notes activity in shared storage — a click, a key, the wheel, a
touch, **moving the pointer and scrolling any panel** (added 2026-09-19: reading a page with
the mouse used to count as idle), and **coming back to the tab or window** — at most once
every five seconds, and tells the server at most once a minute; the server locks the session
when the timeout has run out plus 90 seconds' grace for one missed beat (`isLocked`).
**Activity never revives a session already timed out**: a background tab's timers are
throttled, so a mouse move on returning is checked against the clock first and locks rather
than resetting it. **Thirty seconds before an idle lock** a small "Locking in N seconds —
still here?" bar counts down at the foot of the screen, with an "I'm here" button; any
activity in any tab clears it. It takes no focus and covers nothing. Changing the timeout
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

## Tills

A till is paired to one device, opens only there, and cashiers take it over with their PIN —
`docs/functionality/pos.md` has the whole of it. For sessions: **a till's session is scoped**
(`scope: "till"` on the session and its state) to one studio's Point of Sale, refused
elsewhere by the route wrapper (`till-only`, 403) and redirected back by the studio shell, has
no idle timeout, and is left out of the person's session count in the console.

**A till's session does not count as signed in anywhere but its till** (2026-09-26). The
sign-in page shows its form to one rather than skipping to the account hub, and any sign-in
on that browser — password, code, passkey, Google — ends the till session before minting the
person's own (`openSession`). The account hub, reached by a till session, says which till the
browser is on and offers "Back to the till" and "Sign in as yourself". Before this, someone who
had taken over a collaborator's till could not reach their own studio at all: the sign-in page
sent them straight to the hub, and every studio link sent them back to that till.

## The PIN on a signature

The same PIN is asked before an approval is signed — `docs/functionality/approvals.md`, "The
signer's PIN".

## Two-factor sign-in with an authenticator app

A person can switch on an authenticator app on the Security page (`platform/auth/twoFactor.ts`,
`/api/identity/two-factor`). **It replaces the emailed code on a device the account has not
trusted**: after the password, the sign-in pauses on a ticket (`stage: "totp"`) and asks for
the app's six digits or one of ten recovery codes. A Google or Microsoft sign-in is asked the
same on an untrusted device — the provider proving the address is the first factor, not the
second. Five wrong codes spend the ticket and the person starts again from the password.

It is the console's machinery (`superMfa.ts`), not a second copy: TOTP, the secret sealed at
rest, recovery codes stored as digests and consumed in the same write that accepts one.
**Switching it on is three steps** — the server hands out a secret and a QR (drawn on the
server as SVG; a QR of the secret must never go to a third party) and stores nothing; the
person sends back a code the app produced, **with their password**; only then is it stored and
the recovery codes shown, once. Switching it off needs a current code or a recovery code.

For sharing, this is what makes a new device need the owner's **phone**, not an inbox that can
be forwarded to a team.

## Passkeys

A person can add passkeys on the Security page and **sign in with one** from the sign-in
page (`platform/auth/passkeys.ts`, through `@simplewebauthn/server` and `/browser`). **A
passkey is a whole sign-in**: the device holds a private key that never leaves it and its own
unlock proves the person, so neither the emailed code nor the authenticator is asked. Nothing is typed — the passkeys are discoverable, and the user id
travels inside each one and comes back as its user handle, which is how the server knows
whose it is.

- **Stored on the person's security document: public keys only** — credential id, public
  key, signature counter, when added and last used, whether it syncs. Nothing secret.
- **Every ceremony's challenge is kept five minutes and spent on first use**; a registration's
  on the person's document, a sign-in's on a ticket (`OTP.pending`) the page sends back.
- **Adding and removing need the account password** where there is one. Ten at most.
- **The relying party is the site's domain without "www."**, so a passkey made on
  www.nompany.com works on nompany.com where studios live; `PASSKEY_RP_ID` overrides it.
- A passkey sign-in records the device like any sign-in and **leaves its trust as it was**;
  trust is about skipping the code after a password.
- The browser library is loaded only when a passkey is used or made, so the sign-in page does
  not pay for it up front.

## Resetting a person's sign-in, from the console

`/super` → Users has a **Security** column (2FA, PIN, passkeys) and, in the row menu, **Reset
two-factor**, **Reset PIN** and **Remove passkeys** — each offered only when the person has it,
each confirmed first (`/api/super/users/<id>/reset`, `resetSecurity` in `lock.ts`). It is for
somebody locked out of their own account: a lost phone with no recovery codes, a forgotten PIN,
a lost security key.

- **Resetting two-factor also forgets every trusted device**, so the next sign-in anywhere
  passes the emailed code — the factor that is left.
- **Resetting the PIN** clears it, switches the idle lock off, and opens any session locked
  behind it (nothing could unlock it any more).
- **The person is emailed** that nompany support reset that part of their sign-in, and what to do
  if they did not ask for it (`securityResetEmail`). The route wrapper writes the audit line.

## Not built yet

- **Two-factor and passkeys in the desktop app** — left aside on the owner's instruction,
  18/09/2026. Its login answer carries `totpRequired` and the ticket id; it has no screen for them.
