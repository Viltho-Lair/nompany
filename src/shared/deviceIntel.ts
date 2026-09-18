// FINGERPRINT — the values the browser and the server must agree on.
//
// The PUBLIC key is public by design: it is in every page that runs the agent,
// and it can only ask Fingerprint to identify the browser it runs in. What a
// result MEANS is only ever read on the server, with the secret key
// (`FINGERPRINT_SECRET_API_KEY`), from the event id this cookie carries — a
// visitor id handed over by the browser is whatever the browser says it is.
// `platform/auth/deviceIntel.ts` is that half; docs/functionality/device-intel.md
// says what it is used for.

export const FINGERPRINT_PUBLIC_KEY = "wP2oCNslyim5n0TGz191";

// THE WORKSPACE IS IN THE EU, and the agent, the Server API and the key must
// all name the same region or every call is refused as `wrong_region`.
export const FINGERPRINT_REGION = "eu" as const;

// The latest identification event, written by the sign-in and sign-up pages
// the way the device-hints cookie is, so every route that mints a session —
// the password, the emailed code, a Google or Microsoft callback — reads the
// same event off the request without each form having to send it.
export const DEVICE_EVENT_COOKIE = "nc_fe";

// How long an event proves anything. The cookie lives this long and the server
// refuses an event older than it: long enough to type an emailed code, short
// enough that an event id copied off one machine is soon worth nothing.
export const DEVICE_EVENT_MAX_AGE_SEC = 10 * 60;
