// Password helpers: bcrypt hashing + random password generation + opaque
// session token minting. Kept in one small module so nothing else touches
// bcryptjs directly.

import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 10;

// Character sets tuned to be typo-friendly on both English and Arabic
// keyboards while still hitting typical password-complexity requirements.
const LOWER = "abcdefghijkmnpqrstuvwxyz";      // no l/o
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";      // no I/O
const DIGIT = "23456789";                      // no 0/1
const SYMB = "@#$%^&+=?";

export function generatePassword(length = 16) {
  const all = LOWER + UPPER + DIGIT + SYMB;
  // Guarantee at least one from each class so it always passes complexity checks.
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const req = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMB)];
  while (req.length < length) req.push(pick(all));
  // Fisher–Yates shuffle so the guaranteed chars aren't always first.
  for (let i = req.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [req[i], req[j]] = [req[j], req[i]];
  }
  return req.join("");
}

export async function hashPassword(plaintext) {
  return bcrypt.hash(String(plaintext), BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext, hash) {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(String(plaintext), hash);
  } catch {
    return false;
  }
}

// Opaque session token (32 bytes base64url ≈ 43 chars). Stored on the user
// record and matched byte-for-byte against the cookie. Rotate on logout.
export function newSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}
