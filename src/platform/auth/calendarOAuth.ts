// The token lifecycle for a connected calendar — the single door everything
// else (Tasks 4, 6, 8) reads a calendar's access token through.
//
// TWO LAYERS, DELIBERATELY. `freshAccessToken` is the core: it takes a
// CalendarConnection and a `persist` write-back callback and knows nothing
// about where that connection is stored. `getCalendarAccessToken` is the
// user-keyed wrapper around it — loads via calendarConnections.ts's
// `getConnection`, writes back through `saveConnection`. The console's single
// calendar (REG.googleCalendar, Task 8) belongs to no user, so it needed its
// own wrapper over the SAME core rather than a second copy of the refresh
// logic, or `getCalendarAccessToken(userId, provider)`'s signature would have
// had to grow a "there might not be a userId" branch into every call site.
//
// NO TOKEN MAY REACH A LOG LINE OR AN ERROR MESSAGE. A provider's error BODY
// (its `error`/`error_description`) may be surfaced — that is what lets
// `invalid_grant` be told apart from a network blip — but the refresh token or
// access token this file sends never appears in anything thrown here.
import { CALENDAR_PROVIDERS, calendarRedirectUri, type CalendarProvider } from "./calendarProviders";
import { getConnection, saveConnection, clearConnection, type CalendarConnection } from "./calendarConnections";
// REUSED, NOT REDECLARED: googleFederation.ts already exports the shape a fake
// fetch needs to satisfy for a test (`(input: string, init: RequestInit) =>
// Promise<Response>`). Its `init` is required where a from-scratch version
// here would default it optional, but every call site in this file always
// passes one, and the global `fetch` this defaults to still satisfies the
// stricter type — so there is nothing this file needs that the shared type
// does not already give it.
import type { FetchLike } from "./googleFederation";

// A TOKEN STILL VALID WHEN WE CHECK IT CAN BE EXPIRED BY THE TIME IT REACHES
// THE PROVIDER — the request itself takes time, and a background refresh
// sweep only runs periodically. Five minutes turns "expired mid-flight" from
// an occasional failure into arithmetic that never gets a chance to fire.
export const REFRESH_BUFFER_MS = 5 * 60_000;

export function isDue(expiresAtMs: number, nowMs: number, bufferMs: number = REFRESH_BUFFER_MS): boolean {
  // expiresAtMs === 0 (no connection has ever been refreshed) falls out of
  // this formula on its own: 0 - bufferMs is negative, and nowMs is never
  // negative, so it reads as due without a separate branch.
  return nowMs >= expiresAtMs - bufferMs;
}

// expires_in arrives as SECONDS FROM NOW, provider-supplied and untyped by the
// time it is JSON-parsed. Turning it into an absolute millisecond stamp here,
// once, means every other function in this file compares two absolute times
// instead of re-deriving "now" at a different moment.
export function expiryFrom(expiresIn: unknown, nowMs: number): number {
  const seconds = typeof expiresIn === "number" ? expiresIn : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    // Not the token — just what the provider said about its lifetime, which
    // is the useful half of this error and carries nothing secret.
    throw new Error(`a provider returned an unusable expires_in: ${JSON.stringify(expiresIn)}`);
  }
  return nowMs + seconds * 1000;
}

// Thrown ONLY when a provider's own reason for refusing a refresh is
// `invalid_grant` — the person revoked access at the provider. Every other
// failure (network blip, 5xx, timeout, malformed body) throws a plain Error,
// so `instanceof` is what tells a wrapper whether to clear its stored record.
export class CalendarGrantRevokedError extends Error {}

type TokenResponseBody = {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  error?: unknown;
};

async function readTokenBody(res: Response): Promise<TokenResponseBody> {
  return (await res.json().catch(() => ({}))) as TokenResponseBody;
}

function providerReason(body: TokenResponseBody, res: Response): string {
  return typeof body.error === "string" && body.error ? body.error : `http ${res.status}`;
}

// EXACT MATCH ON PURPOSE, AND A KNOWN TRADE-OFF. Both providers document
// `error: "invalid_grant"` as a flat top-level string on a 400, which is what
// this checks for. A provider that ever nested it (`{ error: { code:
// "invalid_grant" } }`) or renamed the field would not be recognised — the
// refresh would then fail every time with a plain Error, forever, and the
// person would never be told to reconnect. Accepted rather than guarded
// against: guessing at alternate shapes risks the opposite mistake, treating
// some other refusal as a revocation and disconnecting somebody who never
// touched their consent screen.
function isInvalidGrant(body: TokenResponseBody): boolean {
  return body.error === "invalid_grant";
}

export async function exchangeCode(
  { provider, code, request, fetchImpl = fetch }:
    { provider: CalendarProvider; code: string; request: Request; fetchImpl?: FetchLike },
): Promise<{ refreshToken: string; accessToken: string; expiresAtMs: number }> {
  const cfg = CALENDAR_PROVIDERS[provider];
  const res = await fetchImpl(cfg.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[cfg.idEnv] || "",
      client_secret: process.env[cfg.secretEnv] || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: calendarRedirectUri(request, provider),
    }),
  });
  const body = await readTokenBody(res);
  if (!res.ok) {
    throw new Error(`${provider} code exchange failed: ${providerReason(body, res)}`);
  }
  // A refresh token is the entire point of this exchange — without one the
  // connection cannot outlive its first access token, an hour at most, and
  // would fail silently the next time something read it. offlineParams
  // (calendarProviders.ts) is what asks the provider for one; its absence
  // here means that request was not honoured, so this fails loudly at
  // connect time instead of leaving a calendar that quietly stops working.
  if (typeof body.refresh_token !== "string" || !body.refresh_token) {
    throw new Error(`${provider} did not return a refresh token`);
  }
  // Same shape of failure as the refresh_token check above: a 200 with no
  // access_token is not "connected with an empty token", it is a connection
  // that will fail the moment anything tries to use it. Refused here, at
  // connect time, rather than stored as "" and discovered later.
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new Error(`${provider} did not return an access token`);
  }
  return {
    refreshToken: body.refresh_token,
    accessToken: body.access_token,
    expiresAtMs: expiryFrom(body.expires_in, Date.now()),
  };
}

export async function refreshAccessToken(
  { provider, refreshToken, now = Date.now, fetchImpl = fetch }:
    { provider: CalendarProvider; refreshToken: string; now?: () => number; fetchImpl?: FetchLike },
): Promise<{ accessToken: string; expiresAtMs: number; refreshToken?: string }> {
  const cfg = CALENDAR_PROVIDERS[provider];
  const res = await fetchImpl(cfg.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[cfg.idEnv] || "",
      client_secret: process.env[cfg.secretEnv] || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await readTokenBody(res);
  if (!res.ok) {
    const message = `${provider} refresh failed: ${providerReason(body, res)}`;
    // invalid_grant IS THE ONLY FAILURE THAT MEANS THE PERSON REVOKED ACCESS.
    // Everything else — a timeout, a 500, a transient DNS blip — must leave
    // the stored connection alone; only this reason gets a distinct error
    // TYPE (not just a message a caller would have to pattern-match) so
    // getCalendarAccessToken can tell "clear the record" apart from
    // "try again later" with `instanceof`, not a string test that a changed
    // wording could silently break.
    if (isInvalidGrant(body)) throw new CalendarGrantRevokedError(message);
    throw new Error(message);
  }
  // A 200 with no access_token is not "refreshed to nothing" — it is
  // indistinguishable from success unless checked. Left unguarded, this
  // patches the stored connection to an empty access token with a real
  // (hour-out) expiry: isDue then reads false and every read returns "" until
  // the expiry the provider gave for a token it never actually issued.
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new Error(`${provider} refresh returned no access_token`);
  }
  return {
    accessToken: body.access_token,
    expiresAtMs: expiryFrom(body.expires_in, now()),
    // MICROSOFT ROTATES REFRESH TOKENS on (most) refreshes; Google usually
    // does not send one back. `undefined` here — not the old value — is what
    // lets the caller's persist step tell "nothing to update" apart from "the
    // provider re-issued the same one", so a steady provider never triggers a
    // pointless re-encrypt-and-write.
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
  };
}

export type ConnectionPatch = { accessToken: string; expiresAtMs: number; refreshToken?: string };

/**
 * Optional dependencies threaded through the core and both wrappers, same
 * shape as googleFederation.ts's `MintDeps` for the same reason: a function
 * with no injection point can only ever be driven against the real `fetch`
 * and the real clock, which makes "a rotated token is returned", "invalid_grant
 * clears the record" and "a 500 does not" all unprovable without a live
 * network call.
 */
export type CalendarAuthDeps = {
  fetchImpl?: FetchLike;
  now?: () => number;
  /**
   * DEDUPES CONCURRENT REFRESHES OF THE SAME STORED CONNECTION. CAS on the
   * WRITE (saveConnection, invariant 8) makes the write safe; it does nothing
   * about the REQUEST. Two callers racing on one connection — Task 6 reading
   * two calendars for the same person, or two open tabs — both see `isDue`
   * true and both POST a refresh_token that Microsoft accepts exactly once.
   * Whichever CAS write loses is discarded, and the refresh_token it carried
   * is gone with it: the connection then keeps working on the winner's access
   * token until the NEXT refresh, which fails permanently — the same failure
   * shape as forgetting rotation entirely, just delayed by however long the
   * access token has left.
   *
   * Same shape as googleCalendarAuth.ts's module-scope `inFlight` (this
   * file's sibling, same folder) — a promise a second caller awaits instead
   * of starting its own request. That file only ever has ONE calendar, so one
   * variable is enough; this one serves many stored connections, so it is a
   * `key` a caller opts into rather than an unconditional module-scope slot.
   * No key = no dedup, which is the correct default here specifically because
   * `freshAccessToken` cannot derive one on its own: two calls holding
   * separately-fetched CalendarConnection objects have no shared identity it
   * is safe to assume, and coalescing two DIFFERENT people's connections
   * because they happened to share an object shape would silently run one
   * person's persist callback with another person's refreshed token.
   */
  key?: string;
};

const inFlightRefresh = new Map<string, Promise<string>>();

/**
 * THE CORE. Provider- and storage-agnostic: given a live connection and a way
 * to write changed fields back, it returns a token that is good for at least
 * REFRESH_BUFFER_MS. `persist` is only called when a refresh actually
 * happened — a token that was not due is returned as-is, no write.
 *
 * Does NOT catch CalendarGrantRevokedError. Clearing a stored record is a
 * storage decision (which key, which store) that this function was built
 * specifically not to know — that judgment belongs to whichever wrapper
 * called it, which is also the only thing that knows how to clear its own
 * record.
 */
export async function freshAccessToken(
  connection: CalendarConnection,
  persist: (patch: ConnectionPatch) => Promise<unknown>,
  deps: CalendarAuthDeps = {},
): Promise<string> {
  const now = deps.now ?? Date.now;
  if (!isDue(connection.expiresAtMs, now())) return connection.accessToken;

  if (deps.key) {
    const existing = inFlightRefresh.get(deps.key);
    if (existing) return existing;
  }

  const attempt = (async () => {
    const refreshed = await refreshAccessToken({
      provider: connection.provider,
      refreshToken: connection.refreshToken,
      now: deps.now,
      fetchImpl: deps.fetchImpl,
    });
    const patch: ConnectionPatch = { accessToken: refreshed.accessToken, expiresAtMs: refreshed.expiresAtMs };
    if (refreshed.refreshToken !== undefined) patch.refreshToken = refreshed.refreshToken;
    await persist(patch);
    return refreshed.accessToken;
  })();

  if (!deps.key) return attempt;

  // Registered synchronously, right after `attempt` is created and before
  // this function's own next `await` — so a second call sharing `key`, even
  // one resuming on the very next microtask, is guaranteed to see it rather
  // than racing to create its own.
  inFlightRefresh.set(deps.key, attempt);
  try {
    return await attempt;
  } finally {
    inFlightRefresh.delete(deps.key);
  }
}

/**
 * THE USER-KEYED WRAPPER, and what Tasks 4 and 6 call. Loads the person's
 * connection, runs it through the core, writes back through
 * calendarConnections.ts's own compare-and-set `saveConnection` (invariant 8
 * — never a blind overwrite, so a refresh in flight can't clobber a connect
 * that lands mid-request or vice versa). Defaults the single-flight `key` to
 * `<provider>:<userId>` — the exact identity two concurrent calls to THIS
 * function with the same arguments share — so a caller gets the dedup
 * described on CalendarAuthDeps.key without having to know it exists;
 * `deps.key` can still override it, which is what lets the test below drive
 * the same behaviour on `freshAccessToken` directly, with no store involved.
 */
export async function getCalendarAccessToken(
  userId: string,
  provider: CalendarProvider,
  deps: CalendarAuthDeps = {},
): Promise<string> {
  const connection = await getConnection(userId, provider);
  if (!connection) {
    throw new Error(`no ${provider} calendar is connected; the person must connect one first`);
  }
  try {
    return await freshAccessToken(
      connection,
      (patch) => saveConnection(userId, provider, patch),
      { ...deps, key: deps.key ?? `${provider}:${userId}` },
    );
  } catch (err) {
    if (err instanceof CalendarGrantRevokedError) {
      // The ONLY failure that clears the record. A network blip, a 500, a
      // timeout — none of those may disconnect anybody; only the provider
      // itself saying the grant is gone does.
      await clearConnection(userId, provider);
      throw new Error(`access to this ${provider} calendar was revoked at the provider; the person must reconnect it`);
    }
    throw err;
  }
}

export type RevokeConnectionDeps = {
  fetchImpl?: FetchLike;
  // Injected so the "microsoft never calls the provider" branch is provable
  // with no live store, the same way `key`/`now`/`fetchImpl` make the core
  // provable above — defaulting to the real calendarConnections.ts functions
  // for every real caller.
  getConnectionImpl?: typeof getConnection;
  clearConnectionImpl?: typeof clearConnection;
};

export async function revokeConnection(
  userId: string,
  provider: CalendarProvider,
  deps: RevokeConnectionDeps = {},
): Promise<void> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const loadConnection = deps.getConnectionImpl ?? getConnection;
  const dropConnection = deps.clearConnectionImpl ?? clearConnection;
  const cfg = CALENDAR_PROVIDERS[provider];
  // Microsoft's revoke is "" — delegated (user) tokens have no revocation
  // endpoint there (see the comment on CALENDAR_PROVIDERS.microsoft.revoke in
  // calendarProviders.ts for why this was considered, not forgotten), so
  // there is nothing to call — not even loadConnection, which exists purely
  // to build the revoke request below — and disconnecting simply drops our
  // own copy at the bottom; the token expires on Microsoft's side on its own
  // schedule.
  if (cfg.revoke) {
    const connection = await loadConnection(userId, provider);
    if (connection) {
      try {
        await fetchImpl(cfg.revoke, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env[cfg.idEnv] || "",
            client_secret: process.env[cfg.secretEnv] || "",
            token: connection.refreshToken,
          }),
        });
      } catch {
        // Best-effort. A person who clicks "disconnect" expects nompany to
        // stop reading their calendar even if the provider is unreachable
        // right now — the clearConnection below is what actually guarantees
        // that, so a failed revoke call here must not stop it from running.
      }
    }
  }
  await dropConnection(userId, provider);
}
