# Device intelligence (Fingerprint)

Fingerprint identifies the browser on the **sign-in and sign-up pages only**, and the server
uses what it says for three things: binding a trusted device to its browser, refusing bots,
and counting failed passwords and new accounts per device. Nothing else reads it.

Code: `platform/auth/deviceIntel.ts` (server), `components/public/deviceIntel.js` (browser),
`shared/deviceIntel.ts` (the public key, region and cookie). The sessions and trusted devices
it strengthens are in `sessions-and-devices.md`.

## How a sign-in is judged

1. The sign-in and sign-up pages start Fingerprint's agent when they open
   (`useDeviceHints`) and write the **event id** into a ten-minute cookie, `nc_fe`. The form
   waits up to three seconds for it before sending.
2. The route reads the cookie and asks Fingerprint's **Server API** about that event, with
   the secret key (`https://eu.api.fpjs.io/v4/events/<id>`). The visitor id the browser
   reported is never believed.
3. The event must be **less than ten minutes old** and must have happened **on this site**
   (its URL's host is the request's host). An event made with our public key on somebody
   else's page is refused.
4. The visitor id is stored only as a **keyed digest** (a subkey of `NOMPANY_DATA_KEY`), like
   the IP digest beside it.

The answer is one of five:

| Status | Meaning | Who caused it |
|---|---|---|
| `ok` | A fresh event on this site; the device is known | — |
| `missing` | No event cookie (ad blocker, agent failed) | the browser |
| `invalid` | Forged, stale, from another site, or unknown to Fingerprint | the browser |
| `unavailable` | Fingerprint unreachable or refusing our key | us / Fingerprint |
| `off` | `FINGERPRINT_SECRET_API_KEY` is not set | us |

**Our failures never cost the person anything; theirs can.** `off` and `unavailable` make
sign-in behave exactly as it did before Fingerprint was added. `missing` and `invalid` are
things a caller can choose, so they count against a bound device.

## What it does

- **A trusted device is bound to its browser.** When a device is trusted (the emailed code
  with "Trust this device" ticked, or a Google or Microsoft sign-in), the row records the
  browser Fingerprint saw. From then on the device cookie skips the code **only in that
  browser**; copied onto another machine, or sent with no event, it asks for the code again.
  A sign-in on the cookie alone never re-binds. Devices trusted before this, or trusted with
  the agent blocked, are unbound and behave as they always did. Unbound rows expire within
  30 days anyway.
- **Bad bots are refused** at sign-in and sign-up (403 `automated`), before the password is
  checked. The message tells the person what happened and to try without automation or
  another browser.
- **Failed passwords are counted per device**: 10 in 15 minutes, beside the existing
  address, IP and address-with-IP counters (`attempts.ts`). This is the one a proxy pool cannot
  reset.
- **New accounts are counted per device**: 3 a day (429 `rate-device`). Counted before the
  account is made, so refusals cost a signup farm too.

No verified device means no per-device counter at all, never one shared bucket.

The desktop app runs no agent and is never asked. Passkey sign-in, the till and the console
do not use this.

## Setting it up

| Variable | Where | What |
|---|---|---|
| `FINGERPRINT_SECRET_API_KEY` | Vercel, Production (and `.env.local` to test) | The workspace's **secret** Server API key. Without it everything above is off. |

The public key and the EU region are constants in `shared/deviceIntel.ts`: the public key is
in every sign-in page by design. The agent, the Server API and the workspace must all say
`eu`, or every call is refused as `wrong_region`.

The Content-Security-Policy allows `https://fpnpmcdn.net` (the agent), `https://*.fpjs.io`
(identification) and `worker-src blob:` (the agent's worker), measured in the browser on
19/09/2026.

**The agent is loaded on demand** (`import()` in a client module), so it is its own chunk and
no page's first load carries it.

## Not built yet

- **No proxy integration.** Ad blockers commonly block `fpnpmcdn.net` and `fpjs.io`. A
  blocked browser signs in as before, but a **bound** device then asks for the emailed code
  every time. Fingerprint's fix is a custom subdomain or a proxy (the Cloudflare one is on
  every plan; there is no Vercel or Next.js integration in their list). Until one exists,
  expect that friction for people with ad blockers.
- **The privacy policy does not mention Fingerprint.** It should name Fingerprint as a
  processor, say the purpose (securing sign-in), and say what is kept (a keyed digest of the
  device id, nothing else). That is legal copy for the owner to approve, in
  `legal-pages.md`'s files.
- **VPN, incognito and the suspect score are read and not used.** Nothing flags a sign-in
  for them, and the console's sharing flag does not count devices by Fingerprint.
- **The password reset and the emailed-code resend** are not counted per device.
- **Nothing tells a person their device stopped counting as trusted.** They are asked for
  the code as if the device were new.
