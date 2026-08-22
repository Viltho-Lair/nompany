// SECOND FACTOR FOR THE CONSOLE.
//
// /super can change a studio's plan, assign platform roles and rewrite the price
// list. It has one door, a handful of legitimate sign-ins a day, and until now a
// password was the whole of it — so a leaked or reused password was the whole
// platform.
//
// TOTP rather than an emailed code, chosen because the console must keep working
// when email does not: a delivery outage that locks nompany out of its own
// console is a worse day than the one it was protecting against. No new service,
// no per-sign-in cost, and it works offline.
//
// WHAT IS STORED, AND HOW:
//
//   secret        ENCRYPTED at rest with fieldCrypto, the same treatment ID and
//                 passport numbers get. A TOTP secret is a bearer credential —
//                 whoever reads it can mint codes forever — so storing it in the
//                 clear would put every future code in any copy of the database,
//                 which is the exact shape of finding H-1.
//
//   recoveryCodes HASHED, never stored readable. They are passwords: shown once
//                 at enrolment, verified by digest afterwards. If they could be
//                 read back they would be a second copy of the factor rather
//                 than a way around losing it.
//
// WHY RECOVERY IS NOT OPTIONAL. Every scheme needs an answer for a lost phone,
// and for a two-person console the alternative is being locked out of your own
// platform with no way back in. Codes are single-use and consumed on the write,
// so a code cannot be replayed even if the screen it was read from is still open.

import * as OTPAuth from "otpauth";
import crypto from "node:crypto";
import { encryptField, decryptField } from "./fieldCrypto";
import { hashToken } from "./passwords";

const ISSUER = "nompany";

// The window either side of now that a code is accepted in. One step is 30
// seconds, so ±1 tolerates about a minute of clock drift between the phone and
// the server — enough for a device nobody has synced in a while, and far short
// of making a stolen code useful.
const WINDOW = 1;

const RECOVERY_COUNT = 10;

/** A fresh secret, and the URI an authenticator app reads from a QR code. */
export function beginEnrolment(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: String(email || "console"),
    algorithm: "SHA1",   // what every authenticator app implements
    digits: 6,
    period: 30,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

/** Is this code right for this secret, now? */
export function verifyCode(secretBase32: string, code: unknown): boolean {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== 6 || !secretBase32) return false;

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  // `validate` returns the delta in steps, or null. Anything non-null inside the
  // window is a match; 0 means the current step.
  return totp.validate({ token: clean, window: WINDOW }) !== null;
}

/**
 * Ten single-use codes, and the digests to store.
 *
 * The plain codes are returned ONCE, to be shown to the person enrolling and
 * never again. Formatted in two groups so they can be read off a screen and
 * typed without losing your place.
 */
export function makeRecoveryCodes() {
  const plain = Array.from({ length: RECOVERY_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashes: plain.map((c) => hashToken(normaliseRecovery(c))) };
}

// Typed by a person, from paper or a screenshot: case and dashes are noise.
const normaliseRecovery = (code: unknown) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Match a recovery code against the stored digests.
 *
 * @returns {{ ok: boolean, remaining?: string[] }} `remaining` is the list with
 *   the used digest removed — the caller writes it, so consumption is part of
 *   the same atomic update as whatever the code let them do.
 */
// CONSUME, not "use". `useX` is reserved by convention for React hooks, and the
// linter reads it that way — it refused this as a hook called from a
// non-component. The name is better for it: consuming is exactly what happens.
export function consumeRecoveryCode(hashes: string[] | undefined, code: unknown) {
  const digest = hashToken(normaliseRecovery(code));
  const list = Array.isArray(hashes) ? hashes : [];
  if (!list.includes(digest)) return { ok: false };
  return { ok: true, remaining: list.filter((h) => h !== digest) };
}

/** The stored shape, for an admin row. */
export function sealSecret(secretBase32: string): string {
  return encryptField(secretBase32);
}

export function openSecret(sealed: unknown): string {
  return decryptField(sealed);
}

/** Is MFA switched on for this admin? */
export const mfaEnabled = (admin: { mfa?: { enabledAt?: string; secret?: string } } | null | undefined) => Boolean(admin?.mfa?.enabledAt && admin?.mfa?.secret);
