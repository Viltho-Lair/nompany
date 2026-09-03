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

console.log(fails ? `\n${fails} failure(s)` : "\nall good");
process.exitCode = fails ? 1 : 0;
