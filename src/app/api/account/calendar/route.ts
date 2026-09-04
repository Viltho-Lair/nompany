import { route } from "@/platform/http/route";
import { listConnections } from "@/platform/auth/calendarConnections";
import { revokeConnection } from "@/platform/auth/calendarOAuth";
import { isCalendarProvider, enabledCalendarProviders, calendarRedirectUri } from "@/platform/auth/calendarProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PERSON'S OWN CONNECTIONS, never a studio's. `auth: "user"` rather than
// "studio" because a calendar connection belongs to the account (design
// spec §4.1) — reachable from every studio a person is in, and gated on none
// of them.
export const GET = route({ auth: "user", name: "account/calendar" }, async ({ request, user }) => {
  // listConnections ALREADY RETURNS THE PUBLIC SHAPE (calendarConnections.ts)
  // — provider, account email, connected-at, calendar ids. No token reaches
  // this route by construction, not by remembering to strip one on the way
  // out; reaching for getConnection here instead would be the mistake this
  // comment exists to head off.
  const connections = await listConnections(String(user.id));
  // `available`, not the fixed two-provider list — enabledCalendarProviders()
  // filters to whichever has a client id/secret configured, so the screen
  // never offers a Connect button that can only ever fail against an
  // unregistered OAuth client. No network call: it reads process.env.
  const available = enabledCalendarProviders();
  // THE EXACT STRING GOOGLE/MICROSOFT WILL COMPARE, computed from THIS
  // request rather than a guess — an operator who registers what the browser
  // showed them (nompany.com) gets refused when the site actually serves on
  // www.nompany.com, because x-forwarded-host is what calendarRedirectUri
  // reads and the two hosts are different strings byte for byte. Keyed by
  // every provider in `available` only — an unconfigured provider has no
  // Connect button to put a URI next to.
  const redirectUris = Object.fromEntries(
    available.map((p) => [p, calendarRedirectUri(request, p)]),
  );
  return { connections, available, redirectUris };
});

export const DELETE = route({ auth: "user", name: "account/calendar" }, async ({ request, user }) => {
  const provider = new URL(request.url).searchParams.get("provider");
  if (!isCalendarProvider(provider)) return { error: "invalid" };
  // NOTHING PASSED AS THE THIRD ARGUMENT. revokeConnection's deps parameter
  // is an OBJECT (`{ fetchImpl?, getConnectionImpl?, clearConnectionImpl? }`)
  // as of Task 3 — built that way so the token-revocation call could be
  // driven from a test with no live Postgres — and every real caller,
  // including this one, omits it to use the real fetch and the real store.
  await revokeConnection(String(user.id), provider);
  return { ok: true };
});
