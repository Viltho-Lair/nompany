// Field-level encryption at rest for the credentials nompany keeps: calendar
// OAuth tokens, the platform's Nova API key, console MFA secrets. Server-only.
// Values are AES-256-GCM encrypted before they touch the store and decrypted
// only when used — confidentiality at rest, not masking.
//
// ONE KEY — the owner's decision of 17/09/2026. Values are encrypted under a
// subkey of NOMPANY_DATA_KEY (platform/db/masterKeys.ts), the same key that
// seals client data, and name the master that made them so a rotated master
// still reads what the old one wrote:
//
//   enc:v2:<masterId>:<iv>:<tag>:<ciphertext>          (base64 parts)
//
// `enc:v1:` values were written under FIELD_ENCRYPTION_KEY, which is RETIRED:
// every stored v1 value was re-encrypted on 17/09/2026 (a console action, run
// inside the deployment, then proven empty by a live scan) and the variable was
// deleted. A v1 value can no longer be opened, and one turning up is reported
// as unreadable like any other.
import crypto from "crypto";
import { log } from "@/platform/http/observability";
import { currentMasterKey, masterKeyById, subkey } from "@/platform/db/masterKeys";

const V1 = "enc:v1:";   // recognised as encrypted, never opened
const V2 = "enc:v2:";
const PURPOSE = "field-crypto";

// Encrypt a plaintext string.
//
// FAILS CLOSED — finding H-9. This used to return the plaintext when no key was
// configured, "so the app still works in local dev without the secret". What it
// actually meant was that a deploy with the variable missing wrote credentials
// to the database in the clear, with no error, no log line and no way to tell
// afterwards which records were affected. It throws now, and a missing key is a
// startup problem rather than a data problem discovered later.
export function encryptField(plain: unknown): string {
  const value = plain == null ? "" : String(plain);
  if (!value) return "";
  // Already encrypted under the current scheme — don't double-wrap.
  if (value.startsWith(V2)) return value;
  const master = currentMasterKey();
  if (!master) throw new Error("NOMPANY_DATA_KEY is not set — refusing to store a credential in plaintext");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", subkey(master, PURPOSE), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${V2}${master.id}:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && (value.startsWith(V1) || value.startsWith(V2));
}

function open(value: string): string {
  if (!value.startsWith(V2)) throw new Error("written under the retired FIELD_ENCRYPTION_KEY");
  const [, , masterId, ivB64, tagB64, dataB64] = value.split(":");
  const master = masterKeyById(masterId);
  if (!master) throw new Error(`master key ${masterId} is not in NOMPANY_DATA_KEY`);
  return gcmOpen(subkey(master, PURPOSE), ivB64, tagB64, dataB64);
}

function gcmOpen(key: Buffer, ivB64: string, tagB64: string, dataB64: string): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

// Decrypt a value produced by encryptField(). Non-encrypted input is returned
// unchanged.
//
// A DECRYPT FAILURE STILL RETURNS "" RATHER THAN THROWING, and that asymmetry
// with encrypt is deliberate. One unreadable record must not take down a whole
// listing — but it must not be SILENT either, which was the other half of H-9:
// a key rotation blanked every existing value and nothing said so. It is logged
// now, once per failure, with the reason and no ciphertext.
export function decryptField(value: unknown): string {
  if (!isEncrypted(value)) return value == null ? "" : String(value);
  try {
    return open(String(value));
  } catch (e) {
    // The value itself is never logged: it is the thing being protected.
    log.error(`[fieldCrypto] decrypt failed (${(e as Error).message}) — wrong key, or the value was written under another one`);
    return "";
  }
}
