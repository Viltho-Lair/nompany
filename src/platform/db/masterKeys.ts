// THE ONE KEY — `NOMPANY_DATA_KEY`, the owner's decision of 17/09/2026: every
// secret nompany keeps is protected by it, and FIELD_ENCRYPTION_KEY is retired.
//
// This module only READS the keyring (sealCipher.ts parses it) and hands out
// purpose-bound subkeys. Nothing uses the master directly: sealing wraps
// studio keys with it, and every other use takes a subkey derived with HKDF
// under its own label, so a value made for one purpose can never be mistaken
// for, or used as, a value made for another.
//
// NO DATABASE HERE, deliberately: platform/auth imports this and must not drag
// the store in with it.

import crypto from "crypto";
import { KEY_PREFIX } from "./keys";
import { parseMasterKeyring, type MasterKey } from "./sealCipher";

let ring: MasterKey[] | null = null;

/** Current key first; retired keys after it, kept only to read old values. */
export function masterKeyring(): MasterKey[] {
  ring ??= parseMasterKeyring(process.env.NOMPANY_DATA_KEY, Boolean(KEY_PREFIX));
  return ring;
}

export const currentMasterKey = (): MasterKey | null => masterKeyring()[0] || null;

export function masterKeyById(id: string): MasterKey | null {
  return masterKeyring().find((k) => k.id === id) || null;
}

/** A 32-byte subkey of one master, for one named purpose. */
export function subkey(master: MasterKey, purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", master.key, Buffer.alloc(0), `nompany/${purpose}`, 32));
}

/**
 * A secret for one purpose from the CURRENT master, or null when there is no
 * key. Never throws: the callers are sign-in paths, and a malformed variable
 * must surface where it is used to encrypt, not stop a login page loading.
 */
export function derivedSecret(purpose: string): Buffer | null {
  try {
    const m = currentMasterKey();
    return m ? subkey(m, purpose) : null;
  } catch {
    return null;
  }
}

/** For tests: forget the parsed keyring. */
export function resetMasterKeyring() {
  ring = null;
}
