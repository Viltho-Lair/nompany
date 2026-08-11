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
import { OTP, RL, U, makeId } from "@/lib/data/keys";
import { getJSON, setJSONEx, consume, incrWithTTL, readArr, writeArr } from "@/lib/data/store";

export const CODE_TTL_SEC = 10 * 60;               // a code is valid 10 minutes
export const MAX_ATTEMPTS = 5;                     // wrong guesses per challenge
export const RESEND_COOLDOWN_MS = 60 * 1000;       // one resend per minute
const RL_WINDOW_SEC = 60 * 60;
const RL_EMAIL_MAX = 5;                            // codes per email per hour
const RL_IP_MAX = 20;                              // codes per IP per hour
export const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // trust lasts 30 days
const MAX_DEVICES = 10;

// HMAC key. Reuses the existing field-encryption secret so no new env var is
// required; falls back to a constant (hashing still applies, but a Redis dump
// would be brute-forceable — set FIELD_ENCRYPTION_KEY in production).
const OTP_SECRET = process.env.OTP_SECRET || process.env.FIELD_ENCRYPTION_KEY || "nompany-otp";
function hashCode(challengeId, code) {
  return crypto.createHmac("sha256", OTP_SECRET).update(`${challengeId}:${String(code).trim()}`).digest("hex");
}
function sameHash(a, b) {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// 6 digits, uniformly random (not Math.random) — it is a login credential.
function newCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// ---- abuse limits ----------------------------------------------------------
// Checked when a code is SENT (verification attempts are bounded per challenge).
export async function checkSendLimits({ email, ip }) {
  if (email && (await incrWithTTL(RL.otpEmail(email), RL_WINDOW_SEC)) > RL_EMAIL_MAX) return { error: "rate-email" };
  if (ip && (await incrWithTTL(RL.otpIp(ip), RL_WINDOW_SEC)) > RL_IP_MAX) return { error: "rate-ip" };
  return { ok: true };
}

// ---- challenges ------------------------------------------------------------
// purpose: "signup" | "login". Returns { challengeId, code } — the CODE is for
// the mailer only and must never reach the client.
export async function createChallenge({ purpose, email, userId, ip }) {
  const limited = await checkSendLimits({ email, ip });
  if (limited.error) return limited;

  const challengeId = makeId("otc");
  const code = newCode();
  await setJSONEx(OTP.challenge(challengeId), {
    purpose, email, userId: userId || "",
    codeHash: hashCode(challengeId, code),
    attempts: 0,
    lastSentAt: Date.now(),
    createdAt: Date.now(),
    ip: ip || "",
  }, CODE_TTL_SEC);
  return { challengeId, code };
}

export async function getChallenge(challengeId) {
  return challengeId ? getJSON(OTP.challenge(challengeId)) : null;
}

// Verify a submitted code. On success the challenge is CONSUMED atomically, so
// a code can never be replayed and two parallel verifications cannot both win.
export async function verifyChallenge(challengeId, code) {
  const challenge = await getChallenge(challengeId);
  if (!challenge) return { error: "expired" };            // TTL elapsed or already used
  if ((challenge.attempts || 0) >= MAX_ATTEMPTS) return { error: "locked" };

  if (!sameHash(challenge.codeHash, hashCode(challengeId, code))) {
    const attempts = (challenge.attempts || 0) + 1;
    const remainingTtl = Math.max(1, CODE_TTL_SEC - Math.floor((Date.now() - challenge.createdAt) / 1000));
    await setJSONEx(OTP.challenge(challengeId), { ...challenge, attempts }, remainingTtl);
    return { error: attempts >= MAX_ATTEMPTS ? "locked" : "invalid", attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts) };
  }
  if (!(await consume(OTP.challenge(challengeId)))) return { error: "expired" };
  return { ok: true, challenge };
}

// Re-send: same challenge, brand-new code (so the old one dies), attempts reset.
export async function resendChallenge(challengeId, { ip } = {}) {
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
const liveDevices = (rows) => (Array.isArray(rows) ? rows : []).filter((d) => (d.expiresAt || 0) > Date.now());

export async function trustDevice(userId, { label = "" } = {}) {
  const deviceId = makeId("dev");
  const rows = liveDevices(await readArr(U.devices(userId)));
  const next = [{ id: deviceId, label: String(label).slice(0, 120), createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt: Date.now() + DEVICE_TTL_MS }, ...rows]
    .slice(0, MAX_DEVICES);
  await writeArr(U.devices(userId), next);
  return deviceId;
}

// True only for a live, unexpired device belonging to THIS user — a device
// cookie from another account can never skip this user's challenge.
export async function isTrustedDevice(userId, deviceId) {
  if (!userId || !deviceId) return false;
  const rows = liveDevices(await readArr(U.devices(userId)));
  const hit = rows.find((d) => d.id === deviceId);
  if (!hit) return false;
  await writeArr(U.devices(userId), rows.map((d) => (d.id === deviceId ? { ...d, lastSeenAt: Date.now() } : d)));
  return true;
}

export async function listDevices(userId) {
  return liveDevices(await readArr(U.devices(userId)));
}
export async function revokeDevice(userId, deviceId) {
  const rows = liveDevices(await readArr(U.devices(userId)));
  await writeArr(U.devices(userId), rows.filter((d) => d.id !== deviceId));
}
// The lockout escape hatch: forget every device, forcing OTP on next sign-in.
export async function revokeAllDevices(userId) {
  await writeArr(U.devices(userId), []);
}
