// FINDING A SEALED VALUE WITHOUT OPENING EVERY ROW — a keyed hash stored beside
// it in the clear.
//
// EVERY CLIENT FIELD IS SEALED (./sealCipher, invariant 18), so "which client
// has this phone number" cannot be asked of the database: the number is
// ciphertext bound to its own row. Opening every client in the studio to
// compare would work for thirty clients and not for thirty thousand, and a
// till asks it on every sale. So the row carries `phoneKey` in the clear:
// HMAC-SHA256 of the studio id and the normalised number (shared/phone), under
// a purpose subkey of NOMPANY_DATA_KEY — never a second key variable.
//
// WHAT THE HASH GIVES AWAY: nothing without the key, and it is bound to the
// studio, so one person's key in two studios does not match across tenants.
// Whoever holds the database AND the key can confirm a number they already
// have — which is no more than the key alone already allows.
//
// EVERY KEY IN THE KEYRING IS TRIED on a lookup, current first: after a
// rotation, customers stored under the retired key must still be recognised,
// or every regular becomes a new customer the day the key changes. A new
// record is always written under the current key.

import crypto from "crypto";
import { masterKeyring, subkey } from "./masterKeys";

const PURPOSE = "client-phone";

const hmac = (key: Buffer, studioId: string, normalized: string) =>
  crypto.createHmac("sha256", key).update(`${studioId}|${normalized}`).digest("hex");

/** Every lookup key this number could be stored under, current key first. Empty with no key. */
export function phoneLookupKeys(studioId: string, normalized: string): string[] {
  if (!studioId || !normalized) return [];
  // A MALFORMED KEY VARIABLE MUST NOT STOP A SALE — the same posture
  // derivedSecret takes. No key means no recognition; the sale goes through.
  try {
    return masterKeyring().map((m) => hmac(subkey(m, PURPOSE), studioId, normalized));
  } catch {
    return [];
  }
}

/** The key a NEW record is stored under, or null when there is no key or no number. */
export const phoneLookupKey = (studioId: string, normalized: string): string | null =>
  phoneLookupKeys(studioId, normalized)[0] || null;
