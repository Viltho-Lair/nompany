// Password helpers: bcrypt hashing + random password generation + opaque
// session token minting. Kept in one small module so nothing else touches
// bcryptjs directly.

import bcrypt from "bcryptjs";
import crypto from "crypto";

// THE COST OF GUESSING ONE PASSWORD. Each step doubles it, so 12 is four times
// the work of the 10 this started at — the current sensible floor, and cheap
// insurance while /api/identity/login still verifies before it rate-limits.
//
// Raising it does NOT invalidate anything: bcrypt stores the cost inside the
// hash, so `compare` keeps verifying older 10-round hashes correctly. What it
// does mean is that an existing password stays at the cost it was created with
// until it is written again — which is what needsRehash() below is for.
const BCRYPT_ROUNDS = 12;

// Character sets tuned to be typo-friendly on both English and Arabic
// keyboards while still hitting typical password-complexity requirements.
const LOWER = "abcdefghijkmnpqrstuvwxyz";      // no l/o
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";      // no I/O
const DIGIT = "23456789";                      // no 0/1
const SYMB = "@#$%^&+=?";

export function generatePassword(length = 16) {
  const all = LOWER + UPPER + DIGIT + SYMB;
  // Guarantee at least one from each class so it always passes complexity checks.
  const pick = (chars: string) => chars[crypto.randomInt(chars.length)];
  const req = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMB)];
  while (req.length < length) req.push(pick(all));
  // Fisher–Yates shuffle so the guaranteed chars aren't always first.
  for (let i = req.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [req[i], req[j]] = [req[j], req[i]];
  }
  return req.join("");
}

export async function hashPassword(plaintext: unknown): Promise<string> {
  return bcrypt.hash(String(plaintext), BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: unknown, hash: unknown): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(String(plaintext), String(hash));
  } catch {
    return false;
  }
}

// IS THIS HASH WEAKER THAN WHAT WE MINT TODAY?
//
// Without this, raising BCRYPT_ROUNDS only protects accounts created afterwards
// — everyone who signed up earlier keeps whatever cost was current on the day,
// forever, because a password hash is only rewritten when the password changes.
// A correct sign-in is the one moment we hold the plaintext and can quietly
// upgrade it, so that is where the caller re-hashes.
//
// Reads the cost out of the hash itself ("$2b$10$…"), so it stays right no
// matter what the constant becomes next.
export function needsRehash(hash: unknown): boolean {
  const cost = Number(String(hash || "").split("$")[2]);
  return Number.isFinite(cost) && cost < BCRYPT_ROUNDS;
}

// Opaque session token (32 bytes base64url ≈ 43 chars). Handed to the browser
// in a cookie and never stored as-is — see hashToken. Rotate on logout.
export function newSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// WHAT GOES IN THE DATABASE INSTEAD OF THE TOKEN.
//
// A session token is a bearer credential: whoever holds it is signed in. Stored
// in the clear, every copy of the database — a backup, a support export, a
// second application sharing the instance — is a list of live sessions that can
// be replayed as-is. Storing the digest costs one hash per lookup and makes a
// leaked dump useless: the cookie cannot be derived back from it.
//
// Plain SHA-256, deliberately, not bcrypt: the input is 32 bytes of CSPRNG
// output rather than something a person chose, so there is no dictionary to
// slow down and no reason to pay a work factor on every authenticated request.
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}
