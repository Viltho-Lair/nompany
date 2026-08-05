// Field-level encryption at rest for sensitive PII (ID & passport numbers).
// Server-only: uses Node's crypto and a key held in FIELD_ENCRYPTION_KEY. Values
// are AES-256-GCM encrypted before they touch the data store and decrypted only
// when served to an authorized viewer, so a dump of the Redis document never
// exposes them in plaintext. The full value is shown to authorized viewers —
// this is confidentiality at rest, not masking.
import crypto from "crypto";

const PREFIX = "enc:v1:";

// Derive a stable 32-byte key from the env secret. Accepts either a 64-char hex
// / base64 32-byte key or any passphrase (hashed to 32 bytes with SHA-256).
function keyBuffer() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const hex = Buffer.from(raw, "hex");
    if (hex.length === 32) return hex;
  } catch {}
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch {}
  return crypto.createHash("sha256").update(String(raw)).digest();
}

// Encrypt a plaintext string → "enc:v1:<iv>:<tag>:<ciphertext>" (all base64).
// Empty/blank input returns "" unchanged; with no key configured the plaintext
// is returned as-is (so the app still works in local dev without the secret).
export function encryptField(plain) {
  const value = plain == null ? "" : String(plain);
  if (!value) return "";
  if (isEncrypted(value)) return value; // already encrypted — don't double-wrap
  const key = keyBuffer();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// Decrypt a value produced by encryptField(). Non-encrypted input (legacy
// plaintext, or values stored before a key existed) is returned unchanged. A
// decrypt failure returns "" rather than throwing so a single bad record can't
// take down a whole listing.
export function decryptField(value) {
  if (!isEncrypted(value)) return value == null ? "" : String(value);
  const key = keyBuffer();
  if (!key) return "";
  try {
    const [, , ivB64, tagB64, dataB64] = value.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
