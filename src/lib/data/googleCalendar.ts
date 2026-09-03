// THE CONSOLE'S ONE GOOGLE CALENDAR — connected by the same OAuth flow every
// person's own calendar uses, stored at REG.googleCalendar.
//
// IT USED TO BE A SERVICE ACCOUNT, and that is the whole reason this file
// changed shape. Reading the calendar meant impersonating pg-gateway@ through
// Vercel OIDC → STS → IAM Credentials, and an operator had to share the
// calendar with that address BY HAND, outside nompany, before anything worked
// at all. There was no consent screen and no refresh token, so nothing here was
// a credential and the file held only an id. That path (googleCalendarAuth.ts)
// is deleted: the console presses Connect like everybody else, and the tokens
// that come back live here.
//
// WHY THIS IS NOT calendarConnections.ts. That module keys a connection by
// person — U.calendarConnection(userId, provider), one row per user per
// provider. The console's calendar belongs to NO user: it is the deployment's,
// and there is no user id to key it under. What the two share is the part worth
// sharing — `freshAccessToken`, calendarOAuth.ts's storage-agnostic core — so
// the expiry buffer, the refresh, and Google's (rare) refresh-token rotation
// are implemented exactly once and this file is only the storage half.
//
// NO TOKEN LEAVES THIS FILE UNDECRYPTED, AND NONE LEAVES IT AT ALL TOWARDS A
// CLIENT: `publicConnection` below is the only shape a route may return.
import { getJSON, editJSON, delKeys } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import {
  freshAccessToken, revokeConnection, CalendarGrantRevokedError, type CalendarAuthDeps,
} from "@/platform/auth/calendarOAuth";
import type { CalendarConnection } from "@/platform/auth/calendarConnections";
import { CALENDAR_PROVIDERS } from "@/platform/auth/calendarProviders";
import {
  callProvider, listCalendars as readCalendars, listEvents as readEvents,
} from "./calendarReads";
import type { CalendarEvent } from "@/shared/calendar";

/** The console only ever connects Google; the key is `REG.googleCalendar`. */
const PROVIDER = "google" as const;

export type ConsoleCalendarConnection = {
  /** Which Google account consented. Shown on the screen, never used to key anything. */
  accountEmail: string;
  refreshToken: string; // DECRYPTED in memory, encrypted at rest
  accessToken: string;  // DECRYPTED in memory, encrypted at rest
  expiresAtMs: number;
  /** "" until the operator picks one from the dropdown — connected is not the same as chosen. */
  calendarId: string;
  summary: string;
  timeZone: string;
  connectedAt: number;
  connectedBy: string;
};

/** The stored shape: identical fields, with the two tokens holding "enc:v1:…" ciphertext. */
type StoredConsoleCalendarConnection = ConsoleCalendarConnection;

/**
 * THE ONLY SHAPE A ROUTE MAY RETURN — named field by field, never a spread with
 * two deletes. Same rule and the same reason as calendarConnections.ts's own
 * `publicConnection`: a spread that forgets a field added later leaks a token,
 * silently, into a response body and every log that records one.
 */
export type PublicConsoleCalendarConnection = {
  accountEmail: string;
  calendarId: string;
  summary: string;
  timeZone: string;
  connectedAt: number;
  connectedBy: string;
};

export function publicConnection(c: ConsoleCalendarConnection): PublicConsoleCalendarConnection {
  return {
    accountEmail: c.accountEmail,
    calendarId: c.calendarId,
    summary: c.summary,
    timeZone: c.timeZone,
    connectedAt: c.connectedAt,
    connectedBy: c.connectedBy,
  };
}

/**
 * THE DECRYPT-AND-GATE STEP, pulled out so it is provable with no store — hand
 * it a stored shape and it answers the question that matters most here. A
 * record whose refreshToken does not survive decryption reads as NO CONNECTION:
 * decryptField fails soft (returns "" and logs rather than throwing), so a
 * rotated FIELD_ENCRYPTION_KEY or a corrupted value would otherwise hand back
 * something that looks connected right up until the access token expired with
 * nothing left to renew it. A connection that cannot be refreshed is not one.
 */
export function decryptStored(stored: StoredConsoleCalendarConnection): ConsoleCalendarConnection | null {
  const refreshToken = decryptField(stored.refreshToken);
  if (!refreshToken) return null;
  return {
    accountEmail: String(stored.accountEmail || ""),
    refreshToken,
    accessToken: decryptField(stored.accessToken),
    expiresAtMs: Number(stored.expiresAtMs) || 0,
    calendarId: String(stored.calendarId || "").trim(),
    summary: String(stored.summary || "").trim(),
    timeZone: String(stored.timeZone || "UTC").trim(),
    connectedAt: Number(stored.connectedAt) || 0,
    connectedBy: String(stored.connectedBy || "").trim(),
  };
}

export async function getConnection(): Promise<ConsoleCalendarConnection | null> {
  const stored = await getJSON<StoredConsoleCalendarConnection>(REG.googleCalendar);
  if (!stored) return null;
  return decryptStored(stored);
}

export async function saveConnection(
  patch: Partial<ConsoleCalendarConnection>,
): Promise<ConsoleCalendarConnection> {
  // COMPARE-AND-SET (invariant 8), not a bare getJSON/setJSON pair — and here
  // it guards the same race calendarConnections.ts calls out: the callback
  // writes a whole new record while an access-token refresh is in flight, and a
  // blind read-modify-write lets the refresh's stale read overwrite the
  // brand-new refreshToken with the old one.
  return editJSON<StoredConsoleCalendarConnection, ConsoleCalendarConnection>(REG.googleCalendar, (existing) => {
    // A TOKEN THE PATCH DOES NOT SUPPLY IS CARRIED FORWARD AS STORED — the
    // existing ciphertext, unchanged — never decrypted and re-encrypted. That
    // distinction is what stops a transient key problem becoming permanent data
    // loss: decryptField fails soft ("") and encryptField("") also returns ""
    // via its empty-value shortcut, so a round trip through both would silently
    // persist an empty string over the only copy of a token that cannot be
    // re-derived without the operator consenting again. encryptField is
    // idempotent on its own output, so passing either a fresh plaintext or an
    // already-encrypted value through is equally safe.
    const storedRefreshToken = patch.refreshToken !== undefined
      ? encryptField(patch.refreshToken)
      : encryptField(existing?.refreshToken ?? "");
    const storedAccessToken = patch.accessToken !== undefined
      ? encryptField(patch.accessToken)
      : encryptField(existing?.accessToken ?? "");

    const next: StoredConsoleCalendarConnection = {
      accountEmail: patch.accountEmail ?? existing?.accountEmail ?? "",
      refreshToken: storedRefreshToken,
      accessToken: storedAccessToken,
      expiresAtMs: patch.expiresAtMs ?? existing?.expiresAtMs ?? 0,
      calendarId: String(patch.calendarId ?? existing?.calendarId ?? "").trim(),
      summary: String(patch.summary ?? existing?.summary ?? "").trim(),
      timeZone: String(patch.timeZone ?? existing?.timeZone ?? "UTC").trim(),
      connectedAt: patch.connectedAt ?? existing?.connectedAt ?? Date.now(),
      connectedBy: String(patch.connectedBy ?? existing?.connectedBy ?? "").trim(),
    };

    // Decrypted for the caller — who just supplied or already held the
    // plaintext — never for what is written above.
    const result: ConsoleCalendarConnection = {
      ...next,
      refreshToken: decryptField(next.refreshToken),
      accessToken: decryptField(next.accessToken),
    };
    return { next, result };
  });
}

export async function clearConnection(): Promise<void> {
  await delKeys(REG.googleCalendar);
}

/**
 * The core's shape, projected from the console's.
 *
 * `calendarIds` is a LIST in CalendarConnection because a person may pick
 * several; the console has exactly one, so it is stored as one field and
 * projected here rather than stored as an array nothing would ever put a second
 * entry in. Nothing downstream of `freshAccessToken` reads it — it is part of
 * the type, not part of the refresh — so the projection costs nothing and keeps
 * `connection.calendarId` readable on the screen that actually uses it.
 */
function toCore(c: ConsoleCalendarConnection): CalendarConnection {
  return {
    provider: PROVIDER,
    accountEmail: c.accountEmail,
    refreshToken: c.refreshToken,
    accessToken: c.accessToken,
    expiresAtMs: c.expiresAtMs,
    calendarIds: c.calendarId ? [c.calendarId] : [],
    connectedAt: c.connectedAt,
  };
}

/**
 * THE CONSOLE-KEYED WRAPPER — `getCalendarAccessToken`'s twin, over the same
 * core. Loads REG.googleCalendar, runs it through `freshAccessToken`, writes
 * any refreshed token back through the compare-and-set `saveConnection` above.
 *
 * The single-flight key is a fixed string because there is exactly one such
 * connection per deployment: two concurrent reads of the console calendar share
 * an identity in a way two arbitrary CalendarConnection objects do not (see
 * CalendarAuthDeps.key), so coalescing them is safe here in a way the core
 * could never assume on its own.
 */
export async function consoleCalendarAccessToken(deps: CalendarAuthDeps = {}): Promise<string> {
  const connection = await getConnection();
  if (!connection) {
    throw new Error("no Google calendar is connected to this console; connect one first");
  }
  try {
    return await freshAccessToken(
      toCore(connection),
      (patch) => saveConnection(patch),
      { ...deps, key: deps.key ?? "console:google" },
    );
  } catch (err) {
    if (err instanceof CalendarGrantRevokedError) {
      // THE ONLY FAILURE THAT CLEARS THE RECORD — same rule as the user-keyed
      // wrapper. A timeout, a 500 or a DNS blip must leave the connection
      // alone; only Google saying the grant is gone disconnects anything.
      await clearConnection();
      throw new Error("access to this Google calendar was revoked at Google; connect it again");
    }
    throw err;
  }
}

/**
 * Revoke at Google, then forget — not merely forget, which would leave a live
 * grant nobody can see (design spec §6).
 *
 * REUSES revokeConnection RATHER THAN REPEATING IT. That function's userId is
 * only ever handed to the two impls it is given, and both of these ignore it —
 * the console's record is a fixed key — so "" is passed deliberately rather
 * than as a placeholder for something missing. What is reused is everything
 * that matters: the revoke POST's exact body, and the rule that a failed revoke
 * must still clear our own copy.
 */
export async function disconnect(): Promise<void> {
  await revokeConnection("", PROVIDER, {
    getConnectionImpl: async () => {
      const c = await getConnection();
      return c ? toCore(c) : null;
    },
    clearConnectionImpl: async () => { await clearConnection(); },
  });
}

/**
 * EVERY CALENDAR THE CONNECTED ACCOUNT CAN SEE. Under the old service account
 * this was a convenience at best — a calendar shared with a service account
 * routinely never appeared in that account's own calendarList, which is why
 * pasting an id by hand used to be the primary path and this was opt-in behind
 * `?discover=1`. An OAuth grant is the account's own, so the list is simply
 * correct now and the dropdown is the only way a calendar is chosen.
 */
export async function listCalendars(): Promise<{ id: string; summary: string }[]> {
  return readCalendars("", PROVIDER, { getAccessTokenImpl: () => consoleCalendarAccessToken() });
}

/**
 * One calendar by id — how a chosen id is confirmed and its real name and time
 * zone read back, so "saved" always means "readable". calendarList (above)
 * carries no time zone for Microsoft and this console is Google-only, but the
 * board needs one to decide which day is "today" in the calendar's own zone.
 */
export async function getCalendar(id: string): Promise<{ id: string; summary: string; timeZone: string }> {
  const accessToken = await consoleCalendarAccessToken();
  const c = await callProvider(PROVIDER, CALENDAR_PROVIDERS[PROVIDER].calendarUrl(id), accessToken);
  return { id: String(c.id || id), summary: String(c.summary || id), timeZone: String(c.timeZone || "UTC") };
}

export async function listEvents(
  { calendarId, from, to }: { calendarId: string; from: string; to: string },
): Promise<CalendarEvent[]> {
  // THE SAME READER THE ACCOUNT SURFACE USES, including its page-following
  // (Google caps a response at 250 events and says so with `nextPageToken`;
  // not following it is silent data loss). The userId is unused because
  // `getAccessTokenImpl` answers instead of the store.
  return readEvents(
    { userId: "", provider: PROVIDER, calendarId, from, to },
    { getAccessTokenImpl: () => consoleCalendarAccessToken() },
  );
}
