// EVERY PURE ASSERTION FOR CONNECTED CALENDARS — no provider, no network, no
// store. What this cannot prove, stated rather than implied: that Google or
// Microsoft accept a real client, that consent works, or that a token refreshes
// against the live endpoint. Those need registrations only the operator can
// create; see the spec's section 10.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("./loader.mjs", import.meta.url), { data: { root } });
}
let fails = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  ok   ${label}`);
  else { fails++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const {
  CALENDAR_PROVIDERS, isCalendarProvider, providerConfigured, enabledCalendarProviders,
  calendarAuthorizeUrl, calendarRedirectUri,
} = await import("../src/platform/auth/calendarProviders.ts");

// `host` is a FORBIDDEN header name in the Fetch spec — `new Request(url, {
// headers: { host: ... } })` silently drops it, which would make the
// redirect-uri assertion below prove nothing. `x-forwarded-host` is what
// oauth.ts's origin() prefers anyway, and it's the header Vercel sets in
// production, so it's the one worth asserting against.
const req = (origin = "https://nompany.com") =>
  new Request(`${origin}/x`, {
    headers: {
      "x-forwarded-host": origin.replace(/^https?:\/\//, ""),
      "x-forwarded-proto": origin.startsWith("https") ? "https" : "http",
    },
  });

console.log("\ncalendar providers");
{
  ok("google and microsoft, and nothing else",
    JSON.stringify(Object.keys(CALENDAR_PROVIDERS)) === JSON.stringify(["google", "microsoft"]));
  ok("an unknown provider name is refused", isCalendarProvider("apple") === false);
  ok("...and a real one is accepted", isCalendarProvider("microsoft") === true);

  ok("google asks for read-only calendar",
    CALENDAR_PROVIDERS.google.scope === "https://www.googleapis.com/auth/calendar.readonly");

  // WITHOUT offline_access MICROSOFT NEVER ISSUES A REFRESH TOKEN. It is that
  // provider's access_type=offline, and its absence fails an hour later with
  // nothing that says why — which is why it is asserted rather than trusted.
  ok("microsoft asks for Calendars.Read AND offline_access",
    CALENDAR_PROVIDERS.microsoft.scope === "Calendars.Read offline_access");
  ok("google asks for offline access and forces consent",
    CALENDAR_PROVIDERS.google.offlineParams.access_type === "offline" &&
    CALENDAR_PROVIDERS.google.offlineParams.prompt === "consent");

  // /me/events DOES NOT EXPAND RECURRENCE; /me/calendarView DOES. The exact
  // analogue of Google's singleEvents=true — get it wrong and a weekly standup
  // shows once a year.
  const msUrl = CALENDAR_PROVIDERS.microsoft.eventsUrl("primary", "2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z");
  ok("microsoft reads calendarView, not events", /\/me\/calendarView\?/.test(msUrl), msUrl);
  ok("...bounded by the range it was given",
    msUrl.includes("startDateTime=2026-09-01T00%3A00%3A00Z") && msUrl.includes("endDateTime=2026-09-30T00%3A00%3A00Z"), msUrl);
  const gUrl = CALENDAR_PROVIDERS.google.eventsUrl("primary", "2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z");
  ok("google expands recurring series", gUrl.includes("singleEvents=true"), gUrl);
  ok("...and orders by start", gUrl.includes("orderBy=startTime"), gUrl);

  ok("a provider with no client id is not offered",
    providerConfigured("google", {}) === false);
  ok("...and one with both halves is",
    providerConfigured("google", { GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" }) === true);
  ok("only configured providers are enabled",
    JSON.stringify(enabledCalendarProviders({ MICROSOFT_CLIENT_ID: "a", MICROSOFT_CLIENT_SECRET: "b" })) ===
      JSON.stringify(["microsoft"]));

  ok("the redirect uri is the one registered with the provider",
    calendarRedirectUri(req(), "google") === "https://nompany.com/api/auth/calendar/callback/google",
    calendarRedirectUri(req(), "google"));

  const url = calendarAuthorizeUrl({ provider: "microsoft", request: req(), state: "st8" });
  ok("the authorize url points at the provider", url.startsWith(CALENDAR_PROVIDERS.microsoft.authorize), url);
  ok("...carries the state", url.includes("state=st8"));
  ok("...asks for a code", url.includes("response_type=code"));
  ok("...and carries the scope including offline_access",
    url.includes(encodeURIComponent("Calendars.Read offline_access")), url);
}

// A real key, scoped to this test process only. fieldCrypto's encryptField
// throws without one (deliberately — see its header), so this must be set
// BEFORE calendarConnections.ts's functions are called, not just imported.
process.env.FIELD_ENCRYPTION_KEY = "test-only-key-never-used-outside-this-process";

const { publicConnection, decryptStored } = await import("../src/platform/auth/calendarConnections.ts");
const { encryptField } = await import("../src/platform/auth/fieldCrypto.ts");

console.log("\nconnection shape");
{
  const full = {
    provider: "google", accountEmail: "a@b.test",
    refreshToken: "REFRESH-SECRET", accessToken: "ACCESS-SECRET",
    expiresAtMs: 123, calendarIds: ["primary"], connectedAt: 456,
  };
  const pub = publicConnection(full);
  const serialised = JSON.stringify(pub);
  // THE ONE ASSERTION THIS FILE EXISTS FOR. A token reaching a response body is
  // the worst failure available to this feature, and a spread that forgets a
  // field added later is exactly how it would happen.
  ok("no token survives publicConnection",
    !serialised.includes("REFRESH-SECRET") && !serialised.includes("ACCESS-SECRET"), serialised);
  ok("...nor does the expiry, which is nobody's business either",
    !("expiresAtMs" in pub));
  ok("what the client needs does survive",
    pub.provider === "google" && pub.accountEmail === "a@b.test" && pub.connectedAt === 456);
}

console.log("\ndecrypt-and-gate contract (no store)");
{
  const stored = {
    provider: "google", accountEmail: "a@b.test",
    refreshToken: encryptField("REFRESH-SECRET"), accessToken: encryptField("ACCESS-SECRET"),
    expiresAtMs: 999, calendarIds: ["primary"], connectedAt: 111,
  };
  // WHAT WOULD BE WRITTEN IS CIPHERTEXT, NOT PLAINTEXT — the property
  // saveConnection depends on (it stores exactly this shape).
  ok("the stored refresh token is ciphertext, not the plaintext",
    !stored.refreshToken.includes("REFRESH-SECRET") && stored.refreshToken.startsWith("enc:v1:"),
    stored.refreshToken);

  const live = decryptStored(stored);
  ok("a readable stored record decrypts back to the real tokens",
    live?.refreshToken === "REFRESH-SECRET" && live?.accessToken === "ACCESS-SECRET",
    JSON.stringify(live));

  // THE SECOND MOST IMPORTANT BEHAVIOUR IN THIS FILE. A stored record whose
  // refreshToken cannot be decrypted — corrupted, or written under a key that
  // has since rotated — must read as NO CONNECTION rather than as a connection
  // with a blank refresh token, because the latter looks fine right up until
  // the access token expires with nothing left to renew it.
  const unreadable = { ...stored, refreshToken: "enc:v1:not-a-real-payload" };
  ok("an unreadable refreshToken reads as no connection (null), not a broken one",
    decryptStored(unreadable) === null);
}

const { isDue, expiryFrom, refreshAccessToken, REFRESH_BUFFER_MS } =
  await import("../src/platform/auth/calendarOAuth.ts");

console.log("\ntoken lifecycle");
{
  ok("the buffer is five minutes", REFRESH_BUFFER_MS === 5 * 60_000);
  // A TOKEN STILL VALID WHEN WE CHECK CAN BE EXPIRED WHEN IT ARRIVES. The
  // buffer is what turns "expired mid-flight" from a failure mode into
  // arithmetic.
  ok("a token inside the buffer is due", isDue(1_000_000, 700_000) === true);
  ok("...and one outside it is not", isDue(1_000_000, 600_000) === false);
  ok("an absent expiry is always due", isDue(0, 1) === true);

  ok("expires_in becomes an absolute stamp", expiryFrom(3600, 1_000) === 1_000 + 3600_000);
  for (const bad of [undefined, null, "", "soon", -1]) {
    let threw = false;
    try { expiryFrom(bad, 1_000); } catch { threw = true; }
    ok(`an unusable expires_in is refused (${JSON.stringify(bad)})`, threw);
  }

  // MICROSOFT ROTATES REFRESH TOKENS. Every refresh may return a NEW one which
  // must replace the stored one. Writing the old one back leaves a connection
  // that works until the next refresh and then fails permanently, days later
  // and far from the cause.
  const rotating = async () => new Response(JSON.stringify({
    access_token: "AT2", expires_in: 3600, refresh_token: "RT2",
  }), { status: 200 });
  const rotated = await refreshAccessToken({ provider: "microsoft", refreshToken: "RT1", fetchImpl: rotating, now: () => 1000 });
  ok("a rotated refresh token is returned so the caller can store it", rotated.refreshToken === "RT2", JSON.stringify(rotated));

  const steady = async () => new Response(JSON.stringify({ access_token: "AT2", expires_in: 3600 }), { status: 200 });
  const kept = await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: steady, now: () => 1000 });
  ok("a provider that does not rotate returns none, and the old one stands",
    kept.refreshToken === undefined, JSON.stringify(kept));

  const refused = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  let msg = "";
  try { await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: refused }); }
  catch (e) { msg = e.message; }
  ok("a refused refresh names the provider's own reason", /invalid_grant/.test(msg), msg);
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
