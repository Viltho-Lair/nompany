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
  // NO `redirectUris` IN THIS RESPONSE ANY MORE. It was computed per request
  // for one consumer — a block on the account hub that printed each provider's
  // callback address and told the reader to register it. That instruction is
  // the platform owner's, not a tenant's, and it lives in /super now. Nothing
  // else read this field, so computing it was work done to fill a panel that
  // should not have been there.
  //
  // `calendarRedirectUri` itself is untouched and load-bearing: the OAuth start
  // and callback both build the real redirect from it, and it reads
  // x-forwarded-host precisely so the string the provider is sent matches the
  // host that served the request.
  return { connections, available };
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
