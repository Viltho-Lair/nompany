// EVERY PURE ASSERTION FOR THE /super GOOGLE CALENDAR, with no Google, no store
// and no network in the room. The integration halves — the four routes and their
// goldens — live in tests/gate-a.mjs, because they need a console session.
//
// THIS FILE SHRANK WHEN THE SERVICE ACCOUNT WENT. Its middle section drove the
// old credential chain (Vercel OIDC → STS → IAM Credentials → an impersonated
// access token) end to end against a recording fetch. That chain is deleted —
// the console connects by OAuth now, like everybody else — so those assertions
// went with their subject rather than being kept as a monument. What is left is
// what still describes live behaviour: the shared federation reader the Cloud
// Run gateway depends on, the console connection's own public shape, and the
// calendar arithmetic the board renders from.
//
// WHAT THIS FILE CANNOT PROVE, stated rather than implied: that Google accepts
// a real OAuth client, that consent works, or that a token refreshes against
// the live endpoint. Those need registrations only the operator can create; see
// the spec's §10. The token lifecycle itself is asserted, with a fake fetch, in
// tests/connected-calendars.mjs.
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
  GOOGLE_FEDERATION_DEFAULTS, readFederationConfig, isFresh, assertVercelTokenMatchesPool,
} = await import("../src/platform/auth/googleFederation.ts");
const { readGatewayAuthConfig, PG_GATEWAY_DEFAULTS } =
  await import("../src/platform/db/pgGatewayAuth.ts");

console.log("\ngoogle federation");
{
  // THE WHOLE REASON THE EXTRACTION EXISTS. The gateway's config reader throws
  // without PG_GATEWAY_URL — correctly, it is where a token is addressed. The
  // calendar addresses nothing, so a shared reader that demanded a gateway URL
  // would make the calendar unusable on any deployment without one.
  const cfg = readFederationConfig({});
  ok("readFederationConfig needs no PG_GATEWAY_URL", Boolean(cfg.stsAudience));
  ok("...and builds the STS audience from project, pool and provider",
    cfg.stsAudience ===
      `//iam.googleapis.com/projects/${GOOGLE_FEDERATION_DEFAULTS.projectNumber}` +
      `/locations/global/workloadIdentityPools/${GOOGLE_FEDERATION_DEFAULTS.workloadIdentityPool}` +
      `/providers/${GOOGLE_FEDERATION_DEFAULTS.workloadIdentityProvider}`,
    cfg.stsAudience);

  let threw = "";
  try { readGatewayAuthConfig({}); } catch (e) { threw = e.message; }
  ok("the gateway's reader still refuses a missing PG_GATEWAY_URL",
    /PG_GATEWAY_URL is not set/.test(threw), threw);

  ok("PG_GATEWAY_DEFAULTS still carries every federation value",
    PG_GATEWAY_DEFAULTS.serviceAccount === GOOGLE_FEDERATION_DEFAULTS.serviceAccount &&
    PG_GATEWAY_DEFAULTS.oidcIssuer === GOOGLE_FEDERATION_DEFAULTS.oidcIssuer &&
    PG_GATEWAY_DEFAULTS.projectNumber === GOOGLE_FEDERATION_DEFAULTS.projectNumber);

  // NO LONGER ANYTHING TO DO WITH THE CALENDAR. This used to read "the service
  // account is the one the calendar must be shared with"; nothing is shared
  // with it any more. It is the gateway's identity and only the gateway's, and
  // it is pinned here because the value is a production constant a typo in
  // would break every database call.
  ok("the federation default names the gateway's service account",
    GOOGLE_FEDERATION_DEFAULTS.serviceAccount === "pg-gateway@nompany-application.iam.gserviceaccount.com",
    GOOGLE_FEDERATION_DEFAULTS.serviceAccount);

  // THE SKEW IS THE POINT OF isFresh: a token still valid when this process
  // checks it can be expired by the time it reaches Google.
  ok("a token inside the skew is not fresh", isFresh({ expiresAtMs: 1_000_000 }, 900_000, 120_000) === false);
  ok("...and one outside it is", isFresh({ expiresAtMs: 1_000_000 }, 800_000, 120_000) === true);
  ok("no token is never fresh", isFresh(null, 0, 120_000) === false);

  // The `who` prefix is what stops a calendar misconfiguration reporting itself
  // as a database problem.
  const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const jwt = (c) => `${b64({ alg: "RS256" })}.${b64(c)}.c2ln`;
  let msg = "";
  try {
    assertVercelTokenMatchesPool(jwt({ iss: "someone-else", aud: cfg.expectedAudience }), cfg, "google-calendar auth");
  } catch (e) { msg = e.message; }
  ok("a pool mismatch names the caller that asked", /^google-calendar auth:/.test(msg), msg);
  ok("...and names the issuer it saw", /someone-else/.test(msg), msg);

  // readFederationConfig's OWN `who` PARAMETER — the finding carried forward
  // from Task 1's review. Left unset, it must still say "pg-gateway auth" so
  // the gateway's existing messages and `readGatewayAuthConfig`'s single-
  // argument call site stay byte-identical.
  //
  // ITS SECOND CALLER IS GONE. googleCalendarAuth.ts passed "google-calendar
  // auth" so a calendar misconfiguration would not report itself as a database
  // problem; the calendar no longer uses federation at all. The parameter is
  // kept rather than unpicked — this is production auth code the Cloud Run
  // gateway depends on, and reverting a split to tidy up a motivation is risk
  // for nothing — so the override stays asserted here rather than becoming a
  // branch nothing ever proves.
  let skewMsg = "";
  try { readFederationConfig({ PG_GATEWAY_TOKEN_SKEW_MS: "not-a-number" }); } catch (e) { skewMsg = e.message; }
  ok("readFederationConfig defaults its own `who` to pg-gateway auth",
    /^pg-gateway auth: PG_GATEWAY_TOKEN_SKEW_MS/.test(skewMsg), skewMsg);

  let otherSkewMsg = "";
  try {
    readFederationConfig({ PG_GATEWAY_TOKEN_SKEW_MS: "not-a-number" }, "some other caller");
  } catch (e) { otherSkewMsg = e.message; }
  ok("...and a passed `who` still overrides it",
    /^some other caller: PG_GATEWAY_TOKEN_SKEW_MS/.test(otherSkewMsg), otherSkewMsg);
}

// A real key, scoped to this test process only. fieldCrypto's encryptField
// throws without one (deliberately — see its header), so this must be set
// BEFORE googleCalendar.ts's functions are called, not merely imported. Same
// value and same reason as tests/connected-calendars.mjs.
process.env.FIELD_ENCRYPTION_KEY = "test-only-key-never-used-outside-this-process";

const { publicConnection, decryptStored } = await import("../src/lib/data/googleCalendar.ts");
const { encryptField } = await import("../src/platform/auth/fieldCrypto.ts");

console.log("\nthe console connection's public shape");
{
  // THE ONE SHAPE A ROUTE MAY RETURN. Built by naming its fields rather than
  // by deleting two from a spread, because a spread that forgets a field added
  // later leaks a token silently, into a response body and every log line that
  // records one. Asserted by handing it a connection that carries obvious
  // tokens and checking that NOTHING resembling one survives — a whole-object
  // check, not a per-field one, so a field added to the record tomorrow
  // without being added to publicConnection is caught by this test rather than
  // by a support ticket.
  const full = {
    accountEmail: "ops@nompany.test",
    refreshToken: "1//refresh-secret",
    accessToken: "ya29.access-secret",
    expiresAtMs: 1_800_000,
    calendarId: "team@group.calendar.google.com",
    summary: "Team",
    timeZone: "Asia/Riyadh",
    connectedAt: 1_700_000,
    connectedBy: "ops@nompany.test",
  };
  const pub = publicConnection(full);
  const serialised = JSON.stringify(pub);
  ok("no refresh token survives", !serialised.includes("refresh-secret"), serialised);
  ok("no access token survives", !serialised.includes("access-secret"), serialised);
  ok("no expiry survives either — it describes a token and nothing else",
    !("expiresAtMs" in pub), serialised);
  ok("and the six fields the screen actually reads do",
    JSON.stringify(Object.keys(pub).sort()) ===
      JSON.stringify(["accountEmail", "calendarId", "connectedAt", "connectedBy", "summary", "timeZone"]),
    JSON.stringify(Object.keys(pub)));

  // A CONNECTION WHOSE REFRESH TOKEN DOES NOT DECRYPT IS NOT A CONNECTION.
  // decryptField fails soft (returns "" rather than throwing) so a rotated
  // FIELD_ENCRYPTION_KEY or a corrupted value would otherwise hand back
  // something that looks connected right up until the access token expired
  // with nothing left to renew it.
  ok("an unreadable refresh token reads as no connection",
    decryptStored({ ...full, refreshToken: "enc:v1:not-really-ciphertext", accessToken: "" }) === null);
  const good = decryptStored({
    ...full,
    refreshToken: encryptField("1//refresh-secret"),
    accessToken: encryptField("ya29.access-secret"),
  });
  ok("...and a readable one comes back decrypted", good?.refreshToken === "1//refresh-secret");
  ok("...with the chosen calendar intact", good?.calendarId === "team@group.calendar.google.com");
}

const { normaliseEvent, eventDayKeys } = await import("../src/shared/calendar.ts");

console.log("\nevent normaliser");
{
  const timed = normaliseEvent({
    id: "e1", summary: "Platform standup", location: "Room 2",
    htmlLink: "https://calendar.google.com/e1", colorId: "5",
    start: { dateTime: "2026-09-03T09:30:00+03:00" },
    end: { dateTime: "2026-09-03T09:45:00+03:00" },
  });
  ok("a timed event is not all-day", timed.allDay === false);
  ok("...and keeps its title", timed.title === "Platform standup");
  ok("...and its link", timed.htmlLink === "https://calendar.google.com/e1");

  // GOOGLE'S ALL-DAY `end.date` IS EXCLUSIVE. A one-day event on the 3rd is
  // stored as start 2026-09-03, end 2026-09-04. Treating that end as inclusive
  // paints every all-day event one cell too wide — the bug this function is
  // factored out to assert against.
  const oneDay = normaliseEvent({
    id: "e2", summary: "Beta freeze",
    start: { date: "2026-09-03" }, end: { date: "2026-09-04" },
  });
  ok("an all-day event is all-day", oneDay.allDay === true);
  ok("a one-day all-day event occupies exactly one cell",
    JSON.stringify(eventDayKeys(oneDay)) === JSON.stringify(["2026-09-03"]),
    JSON.stringify(eventDayKeys(oneDay)));

  const threeDay = normaliseEvent({
    id: "e3", summary: "Offsite", start: { date: "2026-09-03" }, end: { date: "2026-09-06" },
  });
  ok("a three-day all-day event occupies three cells",
    JSON.stringify(eventDayKeys(threeDay)) ===
      JSON.stringify(["2026-09-03", "2026-09-04", "2026-09-05"]),
    JSON.stringify(eventDayKeys(threeDay)));

  ok("an event with no id is dropped rather than rendered blank",
    normaliseEvent({ summary: "x", start: { date: "2026-09-03" } }) === null);
  ok("a cancelled-shaped payload with no start is dropped",
    normaliseEvent({ id: "e4", summary: "x" }) === null);
  ok("an untitled event gets a readable placeholder",
    normaliseEvent({ id: "e5", start: { date: "2026-09-03" }, end: { date: "2026-09-04" } }).title === "(no title)");
}

const { monthGrid, eventsByDay } = await import("../src/shared/calendar.ts");

console.log("\nmonth grid");
{
  // THE WEEK STARTS MONDAY — the existing screen's DOW row is Mon…Sun and the
  // grid must agree with it. September 2026 starts on a Tuesday, so there is
  // exactly one lead cell.
  const g = monthGrid({ year: 2026, month: 9, todayKey: "2026-09-03" });
  ok("the grid is whole weeks", g.length % 7 === 0, String(g.length));
  ok("September 2026 opens with one trailing August day",
    g.filter((c) => !c.inMonth && c.key < "2026-09-01").length === 1,
    JSON.stringify(g.slice(0, 3)));
  ok("...and holds all thirty days", g.filter((c) => c.inMonth).length === 30);
  ok("the first cell is Monday 31 August", g[0].key === "2026-08-31", g[0].key);
  ok("today is marked exactly once", g.filter((c) => c.isToday).length === 1);
  ok("...on the right day", g.find((c) => c.isToday).key === "2026-09-03");

  // A MONTH THAT STARTS ON A MONDAY HAS NO LEAD CELLS — the off-by-one that a
  // hardcoded LEAD array can never express. June 2026 starts on a Monday.
  const june = monthGrid({ year: 2026, month: 6, todayKey: "2026-09-03" });
  ok("a month starting on Monday has no lead cells", june[0].key === "2026-06-01", june[0].key);
  ok("...and no day is marked today when today is elsewhere",
    june.every((c) => !c.isToday));

  // FEBRUARY IN A LEAP YEAR, because 28 is the number everyone hardcodes.
  const feb = monthGrid({ year: 2028, month: 2, todayKey: "2026-09-03" });
  ok("February 2028 has twenty-nine days", feb.filter((c) => c.inMonth).length === 29);

  const events = [
    { id: "a", title: "A", start: "2026-09-03", end: "2026-09-04", allDay: true, location: "", htmlLink: "", colorId: "" },
    { id: "b", title: "B", start: "2026-09-03T09:00:00Z", end: "2026-09-03T10:00:00Z", allDay: false, location: "", htmlLink: "", colorId: "" },
  ];
  const byDay = eventsByDay(events);
  ok("both events land on the third", byDay["2026-09-03"].length === 2, JSON.stringify(Object.keys(byDay)));
  ok("and nothing lands on the fourth", byDay["2026-09-04"] === undefined);
}

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
