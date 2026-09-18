// THE PERSONAL PIN, THE LOCK AND THE IDLE TIMEOUT (the owner, 18/09/2026).
// `docs/functionality/sessions-and-devices.md` is the file.
//
// A person may lock their session from a button beside their profile, and may
// choose an idle timeout after which it locks by itself. A locked session is
// refused on EVERY request — `currentUser` answers null for it and the route
// wrapper says 423 — so locking covers every tab, the live stream and anybody
// calling the API with the cookie, not only the screen that drew the lock.
//
// The PIN unlocks it. Five wrong PINs end the session and forget the device, so
// the next sign-in there needs the password AND the emailed code: a PIN is four
// to eight digits, and guessing at one must cost a person their session long
// before it could succeed.
//
// THE LOCK COVERS THE WHOLE SIGN-IN, not one studio (the owner, 18/09/2026) —
// a session is one per device and spans every studio the person belongs to.

import { U } from "@/platform/db/keys";
import { getJSON, editJSON } from "@/platform/db/store";
import { hashPassword, verifyPassword } from "./passwords";
import {
  getUserById, listSessionRows, patchSessionState, ensureSessionState, endSessions, digestOf, sessionId,
  type SessionState,
} from "./users";
import { revokeDevice } from "./otp";
import { isLocked } from "./sessionPolicy";
import { pinProblem, isIdleChoice, PIN_MAX_FAILS } from "@/shared/pin";

/** One person's own security settings. User data, under their prefix. */
export type UserSecurity = {
  pinHash?: string;
  pinSetAt?: string;
  /** 0 or absent: off. Only a person with a PIN may set one. */
  idleMinutes?: number;
  /**
   * WRONG PINS OUTSIDE A LOCKED SESSION — at a till, or when signing an
   * approval — where there is no session of the person's own to end. Five in a
   * row stop the PIN working there for fifteen minutes.
   */
  pinGuard?: { fails: number; until: number };
  /** Authenticator (TOTP) two-factor sign-in, when switched on. */
  totp?: { secret: string; recoveryCodes: string[]; enabledAt: string } | null;
};

export const getSecurity = (userId: string) => getJSON<UserSecurity>(U.security(userId));

async function patchSecurity(userId: string, fn: (cur: UserSecurity) => UserSecurity) {
  return editJSON<UserSecurity, UserSecurity>(U.security(userId), (cur) => {
    const next = fn(cur || {});
    return { next, result: next };
  });
}

/** What the Security page shows: never the hash. */
export async function securitySummary(userId: string) {
  const [sec, user] = await Promise.all([getSecurity(userId), getUserById(userId)]);
  return {
    hasPin: Boolean(sec?.pinHash),
    pinSetAt: sec?.pinSetAt || "",
    idleMinutes: Number(sec?.idleMinutes) || 0,
    hasPassword: Boolean(user?.passwordHash),
    totp: Boolean(sec?.totp?.enabledAt),
  };
}

// CHANGING A SECURITY SETTING NEEDS THE PASSWORD, where the account has one. A
// session somebody walked up to must not be enough to set the PIN that then
// locks the owner out of their own screen, or to switch the lock off.
async function passwordProblem(userId: string, password: unknown) {
  const user = await getUserById(userId);
  if (!user) return "notfound" as const;
  if (!user.passwordHash) return "";            // a social sign-in has none to ask for
  return (await verifyPassword(String(password || ""), user.passwordHash)) ? "" : ("invalid" as const);
}

export async function setPin(userId: string, pin: unknown, password: unknown) {
  const problem = pinProblem(pin);
  if (problem) return { error: `pin-${problem}` as const };
  const bad = await passwordProblem(userId, password);
  if (bad) return { error: bad };
  // NEVER THE PASSWORD. A PIN is typed in front of other people; a password
  // that doubled as one would be a password shown to the room.
  const user = await getUserById(userId);
  if (user?.passwordHash && (await verifyPassword(String(pin), user.passwordHash))) return { error: "pin-is-password" as const };
  const pinHash = await hashPassword(String(pin));
  await patchSecurity(userId, (cur) => ({ ...cur, pinHash, pinSetAt: new Date().toISOString() }));
  return { ok: true as const };
}

/** Removing the PIN switches the idle lock off with it: nothing could unlock it. */
export async function removePin(userId: string, password: unknown) {
  const bad = await passwordProblem(userId, password);
  if (bad) return { error: bad };
  await patchSecurity(userId, (cur) => ({ ...cur, pinHash: "", pinSetAt: "", idleMinutes: 0 }));
  await applyIdleToSessions(userId, 0);
  return { ok: true as const };
}

export async function setIdleMinutes(userId: string, minutes: unknown) {
  if (!isIdleChoice(minutes)) return { error: "idle" as const };
  const m = Number(minutes);
  const sec = await getSecurity(userId);
  if (m > 0 && !sec?.pinHash) return { error: "pin-required" as const };
  await patchSecurity(userId, (cur) => ({ ...cur, idleMinutes: m }));
  await applyIdleToSessions(userId, m);
  return { ok: true as const, idleMinutes: m };
}

// THE TIMEOUT IS COPIED ONTO EACH SESSION, so a request reads one document to
// know whether it is locked. Changing it rewrites every session this person has
// open — except a till's (cashiers change by PIN) and the desktop app's, which
// has no heartbeat and sits behind its own operating system's lock.
async function applyIdleToSessions(userId: string, minutes: number) {
  for (const row of await listSessionRows(userId)) {
    if (row.scope === "till" || row.client === "desktop") continue;
    const digest = digestOf(row);
    if (!digest || !(await ensureSessionState(digest))) continue;
    await patchSessionState(digest, (s) => ({ ...s, idleMs: minutes > 0 ? minutes * 60 * 1000 : 0, lastActiveAt: Date.now() }));
  }
}

/** Is this PIN this person's? False when they have none. */
export async function checkPin(userId: string, pin: unknown): Promise<boolean> {
  const sec = await getSecurity(userId);
  if (!sec?.pinHash || pinProblem(pin) === "format") return false;
  return verifyPassword(String(pin), sec.pinHash);
}

/**
 * THE PIN ASKED FOR AN ACT — a cashier taking over a till, a signature on an
 * approval. Guarded on the person: five wrong in a row and the PIN stops
 * working for these acts for fifteen minutes, wherever they are typed.
 */
const PIN_GUARD_MS = 15 * 60 * 1000;
export async function checkPinForAct(userId: string, pin: unknown) {
  const sec = await getSecurity(userId);
  if (!sec?.pinHash) return { error: "pin-not-set" as const };
  const now = Date.now();
  if (sec.pinGuard && sec.pinGuard.until > now) {
    return { error: "pin-locked" as const, retryAfter: Math.ceil((sec.pinGuard.until - now) / 1000) };
  }
  if (await checkPin(userId, pin)) {
    if (sec.pinGuard?.fails) await patchSecurity(userId, (cur) => ({ ...cur, pinGuard: { fails: 0, until: 0 } }));
    return { ok: true as const };
  }
  const after = await patchSecurity(userId, (cur) => {
    const fails = (cur.pinGuard && cur.pinGuard.until <= now ? cur.pinGuard.fails : 0) + 1;
    return { ...cur, pinGuard: { fails: fails >= PIN_MAX_FAILS ? 0 : fails, until: fails >= PIN_MAX_FAILS ? now + PIN_GUARD_MS : 0 } };
  });
  if (after.pinGuard && after.pinGuard.until > now) return { error: "pin-locked" as const, retryAfter: PIN_GUARD_MS / 1000 };
  return { error: "pin-invalid" as const, attemptsLeft: PIN_MAX_FAILS - (after.pinGuard?.fails || 0) };
}

// ---- the session's lock ----------------------------------------------------

/** Lock, unlock and heartbeat all act on the session the request carries, by digest. */
export async function lockStatus(digest: string) {
  const state = await ensureSessionState(digest);
  if (!state) return { signedIn: false as const };
  const sec = await getSecurity(state.userId);
  return {
    signedIn: true as const,
    locked: isLocked(state, Date.now()),
    hasPin: Boolean(sec?.pinHash),
    idleMs: Number(state.idleMs) || 0,
  };
}

export async function lockSession(digest: string) {
  const state = await ensureSessionState(digest);
  if (!state) return { error: "unauthorized" as const };
  const sec = await getSecurity(state.userId);
  if (!sec?.pinHash) return { error: "pin-required" as const };
  await patchSessionState(digest, (s) => ({ ...s, lockedAt: s.lockedAt || Date.now() }));
  return { ok: true as const };
}

/** A sign of the person — refused once the session has locked, or it would unlock it. */
export async function heartbeat(digest: string) {
  const state = await ensureSessionState(digest);
  if (!state) return { error: "unauthorized" as const };
  if (isLocked(state, Date.now())) return { error: "session-locked" as const };
  await patchSessionState(digest, (s) => (isLocked(s, Date.now()) ? null : { ...s, lastActiveAt: Date.now() }));
  return { ok: true as const };
}

export async function unlockSession(digest: string, pin: unknown) {
  const state = await ensureSessionState(digest);
  if (!state) return { error: "unauthorized" as const };
  if (await checkPin(state.userId, pin)) {
    await patchSessionState(digest, (s) => ({ ...s, lockedAt: 0, pinFails: 0, lastActiveAt: Date.now() }));
    return { ok: true as const };
  }
  const after = await patchSessionState(digest, (s) => ({ ...s, pinFails: (Number(s.pinFails) || 0) + 1 }));
  const fails = Number(after?.pinFails) || PIN_MAX_FAILS;
  if (fails < PIN_MAX_FAILS) return { error: "pin-invalid" as const, attemptsLeft: PIN_MAX_FAILS - fails };
  await endAfterPinFailures(state, digest);
  return { error: "pin-locked-out" as const };
}

// FIVE WRONG PINS: the session ends and its device is forgotten, so signing in
// again there needs the password and the emailed code — not just another PIN.
async function endAfterPinFailures(state: SessionState, digest: string) {
  const rows = await listSessionRows(state.userId);
  const row = rows.find((r) => digestOf(r) === digest);
  if (!row) return;
  await endSessions(state.userId, [sessionId(row)], { reason: "pin-failed" });
  if (row.deviceId) await revokeDevice(state.userId, row.deviceId);
}

// ---- the PIN on a signature (18/09/2026) -------------------------------------
//
// SIGNING AN APPROVAL ASKS THE SIGNER'S PIN — a bill, a bid, a requisition, a
// stock adjustment, a till return. A login handed round a team produces
// signatures nobody can attribute; a PIN typed at the moment of signing is the
// one thing the person whose name is on the signature has and the others do
// not. Asked when the person has set a PIN, and of EVERYBODY when the studio
// has switched `signingPin` on (Studio settings → Approvals), in which case a
// signer with no PIN is told to set one. Only approving asks; turning a
// document down commits nobody to anything.
//
// A request without the PIN answers `pin-required` (428), and the page asks
// for it and sends the same request again (components/security/SessionLock).
export async function signingPinProblem(
  studio: object | null | undefined, userId: string, pin: unknown,
) {
  const sec = await getSecurity(userId);
  const required = Boolean((studio as { signingPin?: unknown } | null)?.signingPin) || Boolean(sec?.pinHash);
  if (!required) return null;
  if (!sec?.pinHash) return { error: "pin-not-set" as const };
  if (pin === undefined || pin === null || String(pin) === "") return { error: "pin-required" as const };
  const checked = await checkPinForAct(userId, pin);
  return "error" in checked ? checked : null;
}
