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

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

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
  return {
    refreshToken: body.refresh_token,
    accessToken: typeof body.access_token === "string" ? body.access_token : "",
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
    const reason = providerReason(body, res);
    const message = `${provider} refresh failed: ${reason}`;
    // invalid_grant IS THE ONLY FAILURE THAT MEANS THE PERSON REVOKED ACCESS.
    // Everything else — a timeout, a 500, a transient DNS blip — must leave
    // the stored connection alone; only this reason is worth a distinct error
    // type a caller can act on.
    if (reason === "invalid_grant") throw new CalendarGrantRevokedError(message);
    throw new Error(message);
  }
  return {
    accessToken: typeof body.access_token === "string" ? body.access_token : "",
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
): Promise<string> {
  if (!isDue(connection.expiresAtMs, Date.now())) return connection.accessToken;

  const refreshed = await refreshAccessToken({ provider: connection.provider, refreshToken: connection.refreshToken });
  const patch: ConnectionPatch = { accessToken: refreshed.accessToken, expiresAtMs: refreshed.expiresAtMs };
  if (refreshed.refreshToken !== undefined) patch.refreshToken = refreshed.refreshToken;
  await persist(patch);
  return refreshed.accessToken;
}

/**
 * THE USER-KEYED WRAPPER, and what Tasks 4 and 6 call. Loads the person's
 * connection, runs it through the core, writes back through
 * calendarConnections.ts's own compare-and-set `saveConnection` (invariant 8
 * — never a blind overwrite, so a refresh in flight can't clobber a connect
 * that lands mid-request or vice versa).
 */
export async function getCalendarAccessToken(userId: string, provider: CalendarProvider): Promise<string> {
  const connection = await getConnection(userId, provider);
  if (!connection) {
    throw new Error(`no ${provider} calendar is connected; the person must connect one first`);
  }
  try {
    return await freshAccessToken(connection, (patch) => saveConnection(userId, provider, patch));
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

export async function revokeConnection(
  userId: string,
  provider: CalendarProvider,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const cfg = CALENDAR_PROVIDERS[provider];
  // Microsoft's revoke is "" — delegated (user) tokens have no revocation
  // endpoint there (see the comment on CALENDAR_PROVIDERS.microsoft.revoke in
  // calendarProviders.ts for why this was considered, not forgotten), so
  // there is nothing to call and disconnecting simply drops our own copy
  // below; the token expires on Microsoft's side on its own schedule.
  if (cfg.revoke) {
    const connection = await getConnection(userId, provider);
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
  await clearConnection(userId, provider);
}
