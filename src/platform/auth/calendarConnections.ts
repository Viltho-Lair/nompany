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
import { getJSON, setJSON, delKeys } from "@/platform/db/store";
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

// The shape actually written to the store: identical, except the two token
// fields hold fieldCrypto's "enc:v1:…" ciphertext rather than a plain value.
// A separate type rather than reusing CalendarConnection so a call site can't
// accidentally hand a decrypted record straight to setJSON.
type StoredCalendarConnection = Omit<CalendarConnection, "refreshToken" | "accessToken"> & {
  refreshToken: string; // encrypted
  accessToken: string;  // encrypted
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

export async function getConnection(userId: string, provider: CalendarProvider): Promise<CalendarConnection | null> {
  const stored = await getJSON<StoredCalendarConnection>(U.calendarConnection(userId, provider));
  if (!stored) return null;
  const refreshToken = decryptField(stored.refreshToken);
  // A RECORD WHOSE refreshToken DOES NOT SURVIVE DECRYPTION READS AS NO
  // CONNECTION. decryptField fails soft (returns "" and logs, rather than
  // throwing — see its own header) so a rotated FIELD_ENCRYPTION_KEY or a
  // corrupted value would otherwise hand back a connection object with a
  // blank refresh token: it would look connected right up until the access
  // token expired and there was nothing left to renew it with. A connection
  // that cannot be refreshed is not one.
  if (!refreshToken) return null;
  return { ...stored, refreshToken, accessToken: decryptField(stored.accessToken) };
}

export async function saveConnection(
  userId: string,
  provider: CalendarProvider,
  patch: Partial<CalendarConnection>,
): Promise<CalendarConnection> {
  const key = U.calendarConnection(userId, provider);
  // Read the existing record RAW (still encrypted) rather than through
  // getConnection: a patch that only carries a fresh accessToken (the hourly
  // refresh case) must not be blocked by getConnection's "no refreshToken ->
  // null" rule, which exists for callers reading the connection, not for the
  // write path that maintains it.
  const existing = await getJSON<StoredCalendarConnection>(key);
  const merged: CalendarConnection = {
    provider,
    accountEmail: patch.accountEmail ?? existing?.accountEmail ?? "",
    refreshToken: patch.refreshToken ?? (existing ? decryptField(existing.refreshToken) : ""),
    accessToken: patch.accessToken ?? (existing ? decryptField(existing.accessToken) : ""),
    expiresAtMs: patch.expiresAtMs ?? existing?.expiresAtMs ?? 0,
    calendarIds: patch.calendarIds ?? existing?.calendarIds ?? [],
    // Set once, on the first save, and never moved by a later refresh.
    connectedAt: existing?.connectedAt ?? Date.now(),
  };
  const toStore: StoredCalendarConnection = {
    ...merged,
    refreshToken: encryptField(merged.refreshToken),
    accessToken: encryptField(merged.accessToken),
  };
  await setJSON(key, toStore);
  return merged;
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
