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

// SECOND PASS, after review. The block above only proved a message CONTAINS
// "invalid_grant" — a plain Error passes that regex too, so it could not have
// failed if CalendarGrantRevokedError had never been written, or was deleted
// tomorrow while the class-based clear-on-revoke branch in
// getCalendarAccessToken silently stopped firing. These four blocks each pin
// a property the first pass left provable-but-unproven.
const { freshAccessToken, CalendarGrantRevokedError, revokeConnection } =
  await import("../src/platform/auth/calendarOAuth.ts");

console.log("\ntoken lifecycle — error TYPE, not message shape");
{
  // THE PROPERTY THIS FEATURE EXISTS TO GET RIGHT: invalid_grant is
  // DISTINGUISHABLE, by type, from every other refusal — not just a string
  // that happens to match a regex today.
  const invalidGrant = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  let grantErr = null;
  try { await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: invalidGrant, now: () => 1000 }); }
  catch (e) { grantErr = e; }
  ok("invalid_grant throws CalendarGrantRevokedError specifically, not a plain Error",
    grantErr instanceof CalendarGrantRevokedError, String(grantErr));

  // A NETWORK BLIP MUST NOT DISCONNECT ANYBODY. A 500 is a refusal too, and
  // the earlier regex-only assertion could not tell this apart from
  // invalid_grant — this is the test that actually pins "must not clear".
  const serverError = async () => new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  let serverErr = null;
  try { await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: serverError, now: () => 1000 }); }
  catch (e) { serverErr = e; }
  ok("...but a 500 (a blip, not a revocation) throws a plain Error, not CalendarGrantRevokedError",
    serverErr !== null && !(serverErr instanceof CalendarGrantRevokedError), String(serverErr));
}

console.log("\ntoken lifecycle — a 200 with no access_token is refused, not persisted empty");
{
  // Every neighbouring field is guarded this way (expiryFrom throws on a bad
  // expires_in, exchangeCode refuses a missing refresh_token) — an absent
  // access_token was the one gap: silently returning "" would patch a good
  // stored token to empty with a real hour-out expiry, so isDue reads false
  // and every read returns "" until that expiry lapses on its own.
  const noAccessToken = async () => new Response(JSON.stringify({ expires_in: 3600 }), { status: 200 });
  let emptyMsg = "";
  try { await refreshAccessToken({ provider: "google", refreshToken: "RT1", fetchImpl: noAccessToken, now: () => 1000 }); }
  catch (e) { emptyMsg = e.message; }
  ok("a 200 with no access_token throws instead of returning \"\"", emptyMsg !== "", emptyMsg);
}

console.log("\ntoken lifecycle — the refresh token travels in the POST body, never the URL");
{
  // A fake fetchImpl that ignores its own arguments cannot prove grant_type or
  // where the secret travels — this one inspects what it was actually called
  // with.
  let capturedUrl = null;
  let capturedInit = null;
  const capturing = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return new Response(JSON.stringify({ access_token: "AT3", expires_in: 3600 }), { status: 200 });
  };
  await refreshAccessToken({ provider: "google", refreshToken: "RT-SECRET-VALUE", fetchImpl: capturing, now: () => 1000 });
  ok("the refresh token never appears in the request URL",
    typeof capturedUrl === "string" && !capturedUrl.includes("RT-SECRET-VALUE"), String(capturedUrl));
  const bodyStr = String(capturedInit && capturedInit.body);
  ok("...it travels in the POST body, alongside grant_type=refresh_token",
    bodyStr.includes("grant_type=refresh_token") && bodyStr.includes("RT-SECRET-VALUE"), bodyStr);
}

console.log("\ntoken lifecycle — concurrent refreshes on one connection make exactly one request");
{
  // THE CAS ON THE WRITE (saveConnection) MAKES THE WRITE SAFE; IT DOES NOT
  // MAKE THE REQUEST SAFE. Two callers racing on the same connection would
  // otherwise both POST a refresh_token Microsoft accepts exactly once —
  // whichever CAS write loses discards a still-valid rotated token, and the
  // connection dies at the NEXT refresh instead of this one. `key` is what
  // collapses genuinely-concurrent calls into a single request; this drives
  // freshAccessToken directly (no store) using two calls that share a key,
  // exactly as getCalendarAccessToken's default `${provider}:${userId}` key
  // would for two real concurrent calls on the same person's connection.
  let calls = 0;
  const counted = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      access_token: "AT-CONCURRENT", expires_in: 3600, refresh_token: "RT-CONCURRENT",
    }), { status: 200 });
  };
  const persisted = [];
  const persist = async (patch) => { persisted.push(patch); };
  const dueConnection = {
    provider: "microsoft", accountEmail: "a@b.test",
    refreshToken: "RT0", accessToken: "STALE", expiresAtMs: 0, calendarIds: [], connectedAt: 0,
  };
  const [a, b] = await Promise.all([
    freshAccessToken(dueConnection, persist, { fetchImpl: counted, now: () => 1000, key: "concurrency-test:microsoft" }),
    freshAccessToken(dueConnection, persist, { fetchImpl: counted, now: () => 1000, key: "concurrency-test:microsoft" }),
  ]);
  ok("two concurrent refreshes on the same connection make exactly one network request",
    calls === 1, String(calls));
  ok("...both callers get the same, freshly-refreshed access token",
    a === "AT-CONCURRENT" && b === "AT-CONCURRENT", JSON.stringify([a, b]));
  ok("...and persist runs exactly once, carrying the rotated refresh token",
    persisted.length === 1 && persisted[0].refreshToken === "RT-CONCURRENT", JSON.stringify(persisted));
}

console.log("\nrevoke — microsoft has no revocation endpoint, so disconnecting never calls one");
{
  // Microsoft's `revoke` is "" (calendarProviders.ts). getConnectionImpl and
  // clearConnectionImpl are injected — same reasoning as fetchImpl/now/key on
  // the core above — so this is provable with no live store: a real
  // getConnection would need a real encrypted row to read, and this property
  // (the revoke branch is never entered) does not depend on one existing.
  let revokeCalls = 0;
  let getConnectionCalls = 0;
  let clearCalls = 0;
  const trackingFetch = async () => { revokeCalls += 1; return new Response("{}", { status: 200 }); };
  const trackingGetConnection = async () => { getConnectionCalls += 1; return null; };
  const trackingClearConnection = async () => { clearCalls += 1; };
  await revokeConnection("user-x", "microsoft", {
    fetchImpl: trackingFetch,
    getConnectionImpl: trackingGetConnection,
    clearConnectionImpl: trackingClearConnection,
  });
  ok("microsoft's empty revoke URL means getConnection is never even called",
    getConnectionCalls === 0, String(getConnectionCalls));
  ok("...and the provider is never called either", revokeCalls === 0, String(revokeCalls));
  ok("...but the stored record is still cleared, unconditionally",
    clearCalls === 1, String(clearCalls));
}

const { normaliseMicrosoftEvent, eventDayKeys } = await import("../src/shared/calendar.ts");

console.log("\nmicrosoft normaliser");
{
  const timed = normaliseMicrosoftEvent({
    id: "m1", subject: "Design review", isAllDay: false,
    webLink: "https://outlook.office.com/m1",
    location: { displayName: "Room 4" },
    start: { dateTime: "2026-09-03T09:30:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2026-09-03T10:00:00.0000000", timeZone: "UTC" },
  });
  ok("a timed Microsoft event keeps its subject", timed.title === "Design review");
  ok("...is not all-day", timed.allDay === false);
  ok("...and keeps its link", timed.htmlLink === "https://outlook.office.com/m1");
  ok("...and its location", timed.location === "Room 4");

  // MICROSOFT'S ALL-DAY END IS EXCLUSIVE TOO, exactly like Google's end.date.
  // A one-day event on the 3rd runs 2026-09-03T00:00 to 2026-09-04T00:00 and
  // must occupy ONE cell, not two.
  const oneDay = normaliseMicrosoftEvent({
    id: "m2", subject: "Public holiday", isAllDay: true,
    start: { dateTime: "2026-09-03T00:00:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2026-09-04T00:00:00.0000000", timeZone: "UTC" },
  });
  ok("an all-day Microsoft event is all-day", oneDay.allDay === true);
  ok("...and occupies exactly one cell",
    JSON.stringify(eventDayKeys(oneDay)) === JSON.stringify(["2026-09-03"]),
    JSON.stringify(eventDayKeys(oneDay)));

  ok("an event with no id is dropped", normaliseMicrosoftEvent({ subject: "x" }) === null);
  ok("an untitled event gets a readable placeholder",
    normaliseMicrosoftEvent({ id: "m3", isAllDay: false, start: { dateTime: "2026-09-03T09:00:00" }, end: { dateTime: "2026-09-03T10:00:00" } }).title === "(no title)");
}

const { listEvents } = await import("../src/lib/data/calendarReads.ts");

console.log("\nlistEvents — a single page is not the whole story");
{
  // GOOGLE: a fake fetch returns `nextPageToken` on the first response and a
  // final page with none. THIS TEST MUST FAIL IF THE PAGING LOOP IS EVER
  // REMOVED — without it, page two's event silently never comes back, which
  // is exactly the truncation this proves against.
  const googleCalls = [];
  const googleFetch = async (url) => {
    googleCalls.push(url);
    if (googleCalls.length === 1) {
      return new Response(JSON.stringify({
        items: [{
          id: "g1", summary: "Page one event",
          start: { dateTime: "2026-09-03T09:00:00Z" }, end: { dateTime: "2026-09-03T10:00:00Z" },
        }],
        nextPageToken: "TOKEN2",
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      items: [{
        id: "g2", summary: "Page two event",
        start: { dateTime: "2026-09-04T09:00:00Z" }, end: { dateTime: "2026-09-04T10:00:00Z" },
      }],
    }), { status: 200 });
  };
  const googleEvents = await listEvents(
    { userId: "u1", provider: "google", calendarId: "primary", from: "2026-09-01T00:00:00Z", to: "2026-09-30T00:00:00Z" },
    { fetchImpl: googleFetch, getAccessTokenImpl: async () => "AT-TEST" },
  );
  ok("google follows nextPageToken onto a second request", googleCalls.length === 2, String(googleCalls.length));
  ok("...and the second request's url carries the token",
    googleCalls[1].includes("pageToken=TOKEN2"), googleCalls[1]);
  ok("...both pages' events come back, in order",
    JSON.stringify(googleEvents.map((e) => e.id)) === JSON.stringify(["g1", "g2"]),
    JSON.stringify(googleEvents.map((e) => e.id)));

  // MICROSOFT: the continuation is a full URL (@odata.nextLink), already
  // carrying its own query — fetched directly rather than rebuilt from
  // calendarId/from/to, exactly as calendarReads.ts's comment says it must.
  const msCalls = [];
  const msNextLink = "https://graph.microsoft.com/v1.0/me/calendarView?$skip=250";
  const msFetch = async (url) => {
    msCalls.push(url);
    if (msCalls.length === 1) {
      return new Response(JSON.stringify({
        value: [{
          id: "m1", subject: "Page one", isAllDay: false,
          start: { dateTime: "2026-09-03T09:00:00" }, end: { dateTime: "2026-09-03T10:00:00" },
        }],
        "@odata.nextLink": msNextLink,
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      value: [{
        id: "m2", subject: "Page two", isAllDay: false,
        start: { dateTime: "2026-09-04T09:00:00" }, end: { dateTime: "2026-09-04T10:00:00" },
      }],
    }), { status: 200 });
  };
  const msEvents = await listEvents(
    { userId: "u1", provider: "microsoft", calendarId: "primary", from: "2026-09-01T00:00:00Z", to: "2026-09-30T00:00:00Z" },
    { fetchImpl: msFetch, getAccessTokenImpl: async () => "AT-TEST" },
  );
  ok("microsoft follows @odata.nextLink onto a second request", msCalls.length === 2, String(msCalls.length));
  ok("...fetched directly, exactly as the provider gave it", msCalls[1] === msNextLink, msCalls[1]);
  ok("...both pages' events come back, in order",
    JSON.stringify(msEvents.map((e) => e.id)) === JSON.stringify(["m1", "m2"]),
    JSON.stringify(msEvents.map((e) => e.id)));
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
