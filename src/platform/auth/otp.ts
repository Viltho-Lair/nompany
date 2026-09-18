// OTP repository — one-time-code challenges, abuse limits, and trusted devices.
//
// WHERE THINGS LIVE (and why):
//  • otp:<challengeId>      a challenge. NOT under u:<UserID>:* on purpose — it
//                           must work before the requester is authenticated (and
//                           carries no durable user data). Redis EX expires it,
//                           so there is nothing to clean up or cascade.
//  • u:<UserID>:devices     trusted devices — this IS user data (this person's
//                           remembered browsers), so it lives under the user
//                           prefix and dies with them automatically.
//  • rl:otp:*               fixed-window abuse counters, owned by nobody.
//
// Codes are never stored in the clear: we keep an HMAC of (challengeId + code),
// so a Redis dump yields no usable credentials, and compare in constant time.

import crypto from "node:crypto";
import { derivedSecret } from "@/platform/db/masterKeys";
import { OTP, RL, U, makeId } from "@/platform/db/keys";
import { getJSON, setJSONEx, consume, incrWithTTL, readArr, editArr, editJSON } from "@/platform/db/store";
import { recordSignal } from "./users";
import { bindingHolds, type IntelStatus } from "./deviceIntel";

export const CODE_TTL_SEC = 10 * 60;               // a code is valid 10 minutes
export const MAX_ATTEMPTS = 5;                     // wrong guesses per challenge
export const RESEND_COOLDOWN_MS = 60 * 1000;       // one resend per minute
const RL_WINDOW_SEC = 60 * 60;
const RL_EMAIL_MAX = 5;                            // codes per email per hour
const RL_IP_MAX = 20;                              // codes per IP per hour
export const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // trust lasts 30 days
const MAX_DEVICES = 10;

// HMAC key: OTP_SECRET when set, otherwise a subkey of NOMPANY_DATA_KEY (the
// one key, 17/09/2026 — this used to fall back to FIELD_ENCRYPTION_KEY). The
// constant is the last resort: hashing still applies, but a database dump would
// be brute-forceable. Changing the key only invalidates codes already sent,
// which live ten minutes.
const otpSecret = () => process.env.OTP_SECRET || derivedSecret("otp") || "nompany-otp";
function hashCode(challengeId: string, code: unknown): string {
  return crypto.createHmac("sha256", otpSecret()).update(`${challengeId}:${String(code).trim()}`).digest("hex");
}
function sameHash(a: unknown, b: unknown): boolean {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// 6 digits, uniformly random (not Math.random) — it is a login credential.
function newCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// ---- abuse limits ----------------------------------------------------------
// Checked when a code is SENT (verification attempts are bounded per challenge).
/**
 * A REFUSAL, OR NOTHING TO SAY — as two arms rather than one bag of optionals.
 *
 * Written `{ error?: string; ok?: true }` it is a single type in which both
 * fields are always maybe-there, so no caller can narrow it: `if (r.error)`
 * leaves `error` a `string | undefined` on the other side, and the success
 * fields read as missing. Two arms, and the check every caller already writes
 * tells them which one they hold.
 */
export type LimitResult = { error: "rate-email" | "rate-ip" } | { error?: undefined; ok: true };

export async function checkSendLimits({ email, ip }: { email?: string; ip?: string }): Promise<LimitResult> {
  if (email && (await incrWithTTL(RL.otpEmail(email), RL_WINDOW_SEC)) > RL_EMAIL_MAX) return { error: "rate-email" };
  if (ip && (await incrWithTTL(RL.otpIp(ip), RL_WINDOW_SEC)) > RL_IP_MAX) return { error: "rate-ip" };
  return { ok: true };
}

// ---- challenges ------------------------------------------------------------
// purpose: "signup" | "login". Returns { challengeId, code } — the CODE is for
// the mailer only and must never reach the client.
/** The stored challenge. Written by createChallenge, read by verify and resend. */
export type Challenge = {
  purpose: string;
  email: string;
  userId: string;
  codeHash: string;
  attempts: number;
  lastSentAt: number;
  createdAt: number;
  ip: string;
};

/** A new challenge, or the limiter's refusal. Two arms, so a caller can tell. */
export type ChallengeResult =
  | { error: "rate-email" | "rate-ip"; challengeId?: undefined; code?: undefined }
  | { error?: undefined; challengeId: string; code: string };

export async function createChallenge(
  { purpose, email, userId, ip }: { purpose: string; email: string; userId?: string; ip?: string },
): Promise<ChallengeResult> {
  const limited = await checkSendLimits({ email, ip });
  if (limited.error) return limited;

  const challengeId = makeId("otc");
  const code = newCode();
  const challenge: Challenge = {
    purpose, email, userId: userId || "",
    codeHash: hashCode(challengeId, code),
    attempts: 0,
    lastSentAt: Date.now(),
    createdAt: Date.now(),
    ip: ip || "",
  };
  await setJSONEx(OTP.challenge(challengeId), challenge, CODE_TTL_SEC);
  return { challengeId, code };
}

export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  return challengeId ? getJSON<Challenge>(OTP.challenge(challengeId)) : null;
}

// Verify a submitted code. On success the challenge is CONSUMED atomically, so
// a code can never be replayed and two parallel verifications cannot both win.
// The attempt counter is incremented ATOMICALLY, which is what makes
// MAX_ATTEMPTS a real limit: a burst of parallel guesses used to read the same
// `attempts` value, all pass the check, and have every increment but one
// overwritten — multiplying the guess budget by the burst size. KEEPTTL leaves
// the challenge's own expiry running, so a wrong guess can never extend it.
export async function verifyChallenge(
  challengeId: string, code: unknown,
): Promise<{ ok?: true; challenge?: Challenge; error?: string; attemptsLeft?: number }> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return { error: "expired" };            // TTL elapsed or already used
  if ((challenge.attempts || 0) >= MAX_ATTEMPTS) return { error: "locked" };

  if (!sameHash(challenge.codeHash, hashCode(challengeId, code))) {
    const attempts = await editJSON<Challenge, number>(
      OTP.challenge(challengeId),
      (cur) => {
        if (!cur) return { result: MAX_ATTEMPTS };        // expired or consumed mid-guess
        const n = (cur.attempts || 0) + 1;
        return { next: { ...cur, attempts: n }, result: n };
      },
      { keepTTL: true },
    );
    return { error: attempts >= MAX_ATTEMPTS ? "locked" : "invalid", attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts) };
  }
  if (!(await consume(OTP.challenge(challengeId)))) return { error: "expired" };
  return { ok: true, challenge };
}

// Re-send: same challenge, brand-new code (so the old one dies), attempts reset.
/** What a resend answers: a refusal with the wait, or the new code and its challenge. */
export type ResendResult =
  | { error: "expired" | "cooldown" | "rate-email" | "rate-ip"; retryInMs?: number }
  | { error?: undefined; code: string; challenge: Challenge };

export async function resendChallenge(
  challengeId: string, { ip }: { ip?: string } = {},
): Promise<ResendResult> {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return { error: "expired" };
  const since = Date.now() - (challenge.lastSentAt || 0);
  if (since < RESEND_COOLDOWN_MS) return { error: "cooldown", retryInMs: RESEND_COOLDOWN_MS - since };

  const limited = await checkSendLimits({ email: challenge.email, ip });
  if (limited.error) return limited;

  const code = newCode();
  await setJSONEx(OTP.challenge(challengeId), {
    ...challenge, codeHash: hashCode(challengeId, code), attempts: 0, lastSentAt: Date.now(), createdAt: Date.now(),
  }, CODE_TTL_SEC);
  return { code, challenge };
}

// ---- trusted devices (risk-based login) ------------------------------------
const liveDevices = (rows: DeviceRow[] | null | undefined): DeviceRow[] => (Array.isArray(rows) ? rows : []).filter((d) => (d.expiresAt || 0) > Date.now());

// Record the browser this sign-in came from, and say whether it may SKIP the
// one-time code next time.
//
// Recording and trusting are deliberately separate. Every successful sign-in is
// recorded, so Security can show where the account has been used; only a device
// the person actually ticked "trust" skips the code. Before this split a device
// was written ONLY when the box was ticked, which is why the list could sit
// empty for someone who signs in regularly.
//
// Upserts on `deviceId`: a browser that signs in repeatedly updates its own row
// — refreshing where it was last seen — instead of adding a duplicate each time.
/** What a browser looks like from the server: never the address itself. */
export type DeviceFacts = {
  label?: string;
  deviceType?: string;
  location?: string;
  ipHash?: string;
  /** Keyed digest of Fingerprint's visitor id, when this request proved one (deviceIntel.ts). */
  visitorHash?: string;
  /** What Fingerprint said about this request — never stored, only judged by. */
  intel?: IntelStatus;
};

/** A stored device row. `trusted` absent means trusted — see the note above. */
export type DeviceRow = Omit<DeviceFacts, "intel"> & {
  id: string;
  trusted?: boolean;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
};

export async function recordDevice(
  userId: string,
  deviceId: string | null | undefined,
  { label = "", deviceType = "", location = "", ipHash = "", visitorHash = "" }: DeviceFacts = {},
  // "keep": record the sign-in and leave the device's trust as it was — a
  // passkey sign-in says nothing about whether this browser may skip a code.
  { trusted = true }: { trusted?: boolean | "keep" } = {},
): Promise<{ id: string; trusted: boolean }> {
  const id = deviceId && String(deviceId).startsWith("dev") ? deviceId : makeId("dev");
  const facts = {
    label: String(label).slice(0, 120),
    deviceType: String(deviceType).slice(0, 20),
    location: String(location).slice(0, 80),
    // Digest only — see deviceFingerprint() for why the address itself is
    // never written here.
    ipHash: String(ipHash).slice(0, 64),
  };
  const outcome = await editArr<DeviceRow, { isNew: boolean; trusted: boolean }>(U.devices(userId), (rows) => {
    const live = liveDevices(rows);
    const existing = live.find((d) => d.id === id);
    // NO CAP ON TRUSTED DEVICES (the owner, 19/09/2026: a cap of three shipped
    // with the session limit on 18/09/2026 and went with it). "keep" leaves the
    // device's trust as it was.
    const mayTrust = trusted === "keep" ? Boolean(existing && existing.trusted !== false) : Boolean(trusted);
    // THE BINDING IS MADE WHERE TRUST IS GRANTED, and only there: the code
    // step (or a provider) has just proved this person is at THIS browser, so
    // the browser Fingerprint saw is the one the cookie now belongs to. A
    // sign-in on the cookie alone never re-binds — that is the path a copied
    // cookie takes. Trusting again without a proven visitor (an ad blocker, a
    // Fingerprint outage) clears the binding rather than keeping an old one
    // that would ask this browser for a code every time.
    const binding = trusted === true ? (visitorHash ? String(visitorHash).slice(0, 64) : undefined) : existing?.visitorHash;
    const row: DeviceRow = {
      ...existing,
      ...facts,
      visitorHash: binding,
      id,
      trusted: mayTrust,
      createdAt: existing?.createdAt || Date.now(),
      lastSeenAt: Date.now(),
      expiresAt: Date.now() + DEVICE_TTL_MS,
    };
    // THE LIST IS BOUNDED, AND WHAT FALLS OFF IS HISTORY: the oldest rows that
    // were never trusted. A trusted device is never pushed off by a new one —
    // the list used to drop its oldest row, trusted or not, and a person lost
    // a trusted browser without being told.
    // Rows are newest first, so the untrusted ones past the room left are the
    // oldest of them.
    const others = live.filter((d) => d.id !== id);
    const untrusted = others.filter((d) => d.trusted === false);
    const room = Math.max(0, MAX_DEVICES - 1 - (others.length - untrusted.length));
    const dropped = new Set(untrusted.slice(room).map((d) => d.id));
    return { next: [row, ...others.filter((d) => !dropped.has(d.id))], result: { isNew: !existing, trusted: mayTrust } };
  });
  const isNew = outcome.isNew;
  // A DEVICE THIS ACCOUNT HAD NEVER USED — one of the console's two sharing
  // signals. Counted where the row is first written, because that is the one
  // place that knows the difference between a new browser and a returning one.
  if (isNew) await recordSignal(userId, "newDevices");
  return { id, trusted: outcome.trusted };
}

// True only for a live, unexpired device belonging to THIS user — a device
// cookie from another account can never skip this user's challenge.
// Rows written before recording and trusting were separated carry no `trusted`
// field, and every one of those was created only when the box WAS ticked — so a
// missing flag means trusted. Only an explicit false is untrusted.
export async function isTrustedDevice(
  userId: string, deviceId: string, facts: DeviceFacts | null = null,
): Promise<boolean> {
  if (!userId || !deviceId) return false;
  return editArr<DeviceRow, boolean>(U.devices(userId), (rows) => {
    const live = liveDevices(rows);
    const found = live.find((d) => d.id === deviceId);
    if (!found) return { result: false };
    // A DEVICE BOUND TO A BROWSER ONLY SKIPS THE CODE IN THAT BROWSER. The
    // cookie is the device's id and nothing more; copied onto another machine
    // it used to be enough. Now that machine must also be the browser
    // Fingerprint saw when trust was granted — and a request that withheld or
    // forged the event is asked for the code too, because both are the
    // caller's choice. Fingerprint being off or down is not, and changes
    // nothing. Unbound rows (trusted before this, or with the agent blocked)
    // behave as they always did. Nothing is refreshed on a mismatch: this is
    // not a sign-in on this device.
    if (!bindingHolds(found.visitorHash, facts)) return { result: false };
    // Seen again: refresh when and where, so the Security list reflects the last
    // sign-in rather than the first. Details only, never the trust flag.
    const fresh = facts
      ? { label: facts.label || found.label, deviceType: facts.deviceType || found.deviceType,
          location: facts.location || found.location, ipHash: facts.ipHash || found.ipHash,
          visitorHash: found.visitorHash }
      : {};
    return {
      next: live.map((d) => (d.id === deviceId ? { ...d, ...fresh, lastSeenAt: Date.now() } : d)),
      result: found.trusted !== false,
    };
  });
}

export async function listDevices(userId: string) {
  return liveDevices(await readArr(U.devices(userId)));
}
export async function revokeDevice(userId: string, deviceId: string) {
  await editArr<DeviceRow, void>(U.devices(userId), (rows) => ({
    next: liveDevices(rows).filter((d) => d.id !== deviceId),
  }));
}
// The lockout escape hatch: forget every device, forcing OTP on next sign-in.
// Atomic so a device trusted mid-revoke is caught by the retry rather than
// surviving the purge.
export async function revokeAllDevices(userId: string) {
  await editArr(U.devices(userId), () => ({ next: [] }));
}
