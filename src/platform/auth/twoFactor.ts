// TWO-FACTOR SIGN-IN WITH AN AUTHENTICATOR APP, for everybody (18/09/2026).
// `docs/functionality/sessions-and-devices.md` is the file.
//
// The console has had it since C-5; a studio account had only the emailed code
// on a new device. With an authenticator switched on, a new device asks for a
// code from the person's PHONE instead of their inbox — and a login handed
// round a team then needs that phone for every new machine, which an inbox
// forwarded to the team does not.
//
// THE SAME MACHINERY AS THE CONSOLE'S (superMfa.ts — TOTP, a sealed secret,
// ten single-use recovery codes stored as digests), not a second copy of it.
// Enrolment is the console's three steps for the console's reason: nothing is
// stored until the app has produced one working code, so a mis-scanned QR can
// never lock anybody out.

import { verifyPassword } from "./passwords";
import { getUserById } from "./users";
import { getSecurity, patchSecurity } from "./lock";
import {
  beginEnrolment, verifyCode, makeRecoveryCodes, consumeRecoveryCode, sealSecret, openSecret,
} from "./superMfa";

export async function twoFactorEnabled(userId: string): Promise<boolean> {
  return Boolean((await getSecurity(userId))?.totp?.enabledAt);
}

/** A fresh secret and its URI. Nothing is stored — see the note above. */
export async function beginTwoFactor(userId: string) {
  const user = await getUserById(userId);
  if (!user) return { error: "notfound" as const };
  if (await twoFactorEnabled(userId)) return { error: "already" as const };
  return beginEnrolment(user.email);
}

/**
 * SWITCH IT ON: the secret the app was shown, a code it produced, and the
 * account password where there is one — a session somebody walked up to must
 * not be able to put the owner's second factor on the walker's phone.
 */
export async function enableTwoFactor(userId: string, secret: unknown, code: unknown, password: unknown) {
  const user = await getUserById(userId);
  if (!user) return { error: "notfound" as const };
  if (await twoFactorEnabled(userId)) return { error: "already" as const };
  if (user.passwordHash && !(await verifyPassword(String(password || ""), user.passwordHash))) return { error: "invalid" as const };
  const s = String(secret || "");
  if (!s || !verifyCode(s, code)) return { error: "code" as const };
  const { plain, hashes } = makeRecoveryCodes();
  await patchSecurity(userId, (cur) => ({
    ...cur, totp: { secret: sealSecret(s), recoveryCodes: hashes, enabledAt: new Date().toISOString() },
  }));
  // SHOWN ONCE — stored as digests, so this is the only time they are readable.
  return { ok: true as const, recoveryCodes: plain };
}

/** Switching it off needs a current code (or a recovery code), not only a session. */
export async function disableTwoFactor(userId: string, code: unknown) {
  const passed = await passTwoFactor(userId, code);
  if (!passed) return { error: "code" as const };
  await patchSecurity(userId, (cur) => ({ ...cur, totp: null }));
  return { ok: true as const };
}

/**
 * IS THIS THE PERSON'S SECOND FACTOR? An app code, or a recovery code — which
 * is consumed in the same write that accepts it, so it cannot be used twice.
 */
export async function passTwoFactor(userId: string, code: unknown): Promise<boolean> {
  const totp = (await getSecurity(userId))?.totp;
  if (!totp?.enabledAt) return false;
  if (verifyCode(openSecret(totp.secret), code)) return true;
  const used = consumeRecoveryCode(totp.recoveryCodes, code);
  if (!used.ok) return false;
  let consumed = false;
  await patchSecurity(userId, (cur) => {
    const again = consumeRecoveryCode(cur.totp?.recoveryCodes, code);
    consumed = again.ok;
    return again.ok && cur.totp ? { ...cur, totp: { ...cur.totp, recoveryCodes: again.remaining || [] } } : cur;
  });
  return consumed;
}

/** How many recovery codes are left, for the Security page. */
export async function recoveryCodesLeft(userId: string) {
  return (await getSecurity(userId))?.totp?.recoveryCodes?.length || 0;
}
