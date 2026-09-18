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

## Not built yet

- The session limit, the sign-in step that asks which session to end, and the console's
  sharing flag.
- A cap on trusted devices with no silent eviction.
- The lock button, the idle timeout and the PIN.
- Tills paired to a device, and cashiers switching by PIN.
- The PIN asked again before signing an approval.
- Two-factor sign-in with an authenticator app, and passkeys.
