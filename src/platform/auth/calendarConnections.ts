// THE ONLY CREDENTIAL THIS PRODUCT STORES. Every other secret nompany holds is
// a password hash or a session token — one-way or short-lived. A calendar
// connection is neither: the refresh token grants ongoing read access to a
// person's real Google or Microsoft calendar until they revoke it, so it is
// treated with more care than anything else in this codebase.
//
// Both tokens are AES-256-GCM encrypted (fieldCrypto.ts) before they touch the
// store and decrypted only in memory, on the way back out. `publicConnection`
// is the ONLY shape a route may return — see its own comment below for why it
// is a whitelist and not a spread.
import { getJSON, editJSON, delKeys } from "@/platform/db/store";
import { U } from "@/platform/db/keys";
import { encryptField, decryptField } from "./fieldCrypto";
import { CALENDAR_PROVIDERS, type CalendarProvider } from "./calendarProviders";

export type CalendarConnection = {
  provider: CalendarProvider;
  accountEmail: string;
  refreshToken: string; // DECRYPTED in memory, encrypted at rest
  accessToken: string;  // DECRYPTED in memory, encrypted at rest
  expiresAtMs: number;
  calendarIds: string[];
  connectedAt: number;
};

// The shape actually written to the store: identical fields to
// CalendarConnection, but refreshToken/accessToken hold fieldCrypto's
// "enc:v1:…" ciphertext instead of a decrypted value.
//
// A SEPARATE NAME, NOT A TYPE-LEVEL GUARANTEE. `Omit<CalendarConnection, …> &
// {...}` is structurally identical to CalendarConnection — both fields are
// still plain `string` — so TypeScript accepts a decrypted record wherever
// this type is expected, and the two remain mutually assignable. Nothing here
// stops a call site from handing decrypted values to editJSON's `next`. The
// discipline that actually holds the line is in the code below: encrypt right
// before `next`, decrypt right after `current`, never in between.
type StoredCalendarConnection = Omit<CalendarConnection, "refreshToken" | "accessToken"> & {
  refreshToken: string; // encrypted (enc:v1:…), by naming convention only
  accessToken: string;  // encrypted (enc:v1:…), by naming convention only
};

/**
 * THE ONLY SHAPE A ROUTE MAY RETURN. Built by naming four fields rather than
 * by deleting two from a spread: a spread that forgets a field added later
 * leaks a token, and it leaks it silently, into a response body and every log
 * that records one.
 */
export type PublicCalendarConnection = {
  provider: CalendarProvider;
  accountEmail: string;
  connectedAt: number;
  calendarIds: string[];
};

export function publicConnection(c: CalendarConnection): PublicCalendarConnection {
  return {
    provider: c.provider,
    accountEmail: c.accountEmail,
    connectedAt: c.connectedAt,
    calendarIds: c.calendarIds,
  };
}

/**
 * THE DECRYPT-AND-GATE STEP, pulled out of getConnection so it is testable
 * with no store: hand it a stored shape (real or hand-built with
 * `encryptField`) and it proves the one property that matters most in this
 * file. A record whose refreshToken does not survive decryption reads as NO
 * CONNECTION — decryptField fails soft (returns "" and logs, rather than
 * throwing) so a rotated FIELD_ENCRYPTION_KEY or a corrupted value would
 * otherwise hand back a connection object with a blank refresh token: it
 * would look connected right up until the access token expired and there was
 * nothing left to renew it with. A connection that cannot be refreshed is not
 * one.
 */
export function decryptStored(stored: StoredCalendarConnection): CalendarConnection | null {
  const refreshToken = decryptField(stored.refreshToken);
  if (!refreshToken) return null;
  return {
    provider: stored.provider,
    accountEmail: stored.accountEmail,
    refreshToken,
    accessToken: decryptField(stored.accessToken),
    expiresAtMs: stored.expiresAtMs,
    calendarIds: stored.calendarIds,
    connectedAt: stored.connectedAt,
  };
}

export async function getConnection(userId: string, provider: CalendarProvider): Promise<CalendarConnection | null> {
  const stored = await getJSON<StoredCalendarConnection>(U.calendarConnection(userId, provider));
  if (!stored) return null;
  return decryptStored(stored);
}

export async function saveConnection(
  userId: string,
  provider: CalendarProvider,
  patch: Partial<CalendarConnection>,
): Promise<CalendarConnection> {
  const key = U.calendarConnection(userId, provider);
  // COMPARE-AND-SET (invariant 8), not a bare getJSON/setJSON pair. A blind
  // read-modify-write here loses exactly the value that must never be lost:
  // Task 3's connect callback writes a full record while an hourly
  // access-token refresh is in flight, and without CAS the refresh's stale
  // read wins the race and overwrites the brand-new refreshToken with the old
  // one. editJSON re-applies this function on every contended attempt against
  // whatever is actually there, so the merge always starts from current data.
  return editJSON<StoredCalendarConnection, CalendarConnection>(key, (existing) => {
    const connectedAt = existing?.connectedAt ?? Date.now();

    // STORAGE FIELDS: a token the patch does not supply is carried forward AS
    // STORED — the existing ciphertext, unchanged — rather than decrypted and
    // re-encrypted. That distinction is what stops a transient key problem
    // from becoming permanent data loss: decryptField fails soft ("" on a
    // wrong/rotated key) and encryptField("") ALSO returns "" via its own
    // empty-value shortcut, before it ever gets to the key check — so a
    // decrypt-then-encrypt round trip on an unreadable value would silently
    // persist an empty string over the only copy of a token that cannot be
    // re-derived without the person consenting again. encryptField is
    // idempotent on its own output (`isEncrypted` short-circuits it before
    // the key check), so handing it either a fresh plaintext value or an
    // already-encrypted one to pass through is equally safe.
    const storedRefreshToken = patch.refreshToken !== undefined
      ? encryptField(patch.refreshToken)
      : encryptField(existing?.refreshToken ?? "");
    const storedAccessToken = patch.accessToken !== undefined
      ? encryptField(patch.accessToken)
      : encryptField(existing?.accessToken ?? "");

    const next: StoredCalendarConnection = {
      provider,
      accountEmail: patch.accountEmail ?? existing?.accountEmail ?? "",
      refreshToken: storedRefreshToken,
      accessToken: storedAccessToken,
      expiresAtMs: patch.expiresAtMs ?? existing?.expiresAtMs ?? 0,
      calendarIds: patch.calendarIds ?? existing?.calendarIds ?? [],
      connectedAt,
    };

    // THE RETURN VALUE is decrypted in memory, per this module's contract —
    // decrypted for the caller, who just supplied or already held the
    // plaintext; never for what actually gets written above.
    const result: CalendarConnection = {
      provider,
      accountEmail: next.accountEmail,
      refreshToken: decryptField(next.refreshToken),
      accessToken: decryptField(next.accessToken),
      expiresAtMs: next.expiresAtMs,
      calendarIds: next.calendarIds,
      connectedAt,
    };

    return { next, result };
  });
}

export async function clearConnection(userId: string, provider: CalendarProvider): Promise<void> {
  await delKeys(U.calendarConnection(userId, provider));
}

export async function listConnections(userId: string): Promise<PublicCalendarConnection[]> {
  // Providers come from calendarProviders.ts's own record rather than a second
  // hardcoded list here — the same reason isCalendarProvider exists: one place
  // that knows the set, so a third provider is a row there and not a fork here.
  const providers = Object.keys(CALENDAR_PROVIDERS) as CalendarProvider[];
  const connections = await Promise.all(providers.map((p) => getConnection(userId, p)));
  return connections
    .filter((c): c is CalendarConnection => c != null)
    .map(publicConnection);
}
