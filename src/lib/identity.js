// IDENTITY SERVICE (restructured model) — the single place that turns HTTP
// requests into User operations. Sits on top of src/lib/data/users.js and owns
// NOTHING itself: every byte it writes lands under u:<UserID>:* .
//
// One identity, one session cookie. There is no separate "account" vs "studio"
// login any more — a person is a User, and which studio they are operating in
// is decided by the studio they enter (Phase 3), never by a second credential.
//
// USER-SCOPED ONLY. Nothing here may write studio data; studio membership lives
// in the Collaborator row inside each studio (src/lib/data/collaborators.js).

import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  createUser, getUserById, getUserByEmail, updateUser,
  getProfile, updateProfile,
  getVerification, updateVerification,
  getQuestionnaire, updateQuestionnaire,
  mintSession, findUserBySession, revokeSession, revokeAllSessions,
} from "@/lib/data/users";
import { getOwnedStudio, listUserCollaborations } from "@/lib/data/studios";
import {
  createChallenge, verifyChallenge, resendChallenge,
  trustDevice, isTrustedDevice, revokeAllDevices,
  CODE_TTL_SEC, DEVICE_TTL_MS, MAX_ATTEMPTS,
} from "@/lib/data/otp";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";
import { checkPassword } from "@/lib/passwordPolicy";
import { sendEmail } from "@/lib/email";
import { verificationCodeEmail, passwordResetCodeEmail } from "@/lib/emailTemplates";

// The ONE session cookie of the restructured model. Deliberately a new name so
// it can never be confused with the old-structure cookies (nc_session/mt_admin)
// while both systems coexist before cutover.
export const SESSION_COOKIE = "nc_sid";
export const SESSION_TTL = 60 * 60 * 8;        // 8 hours
export const REMEMBER_TTL = 60 * 60 * 24 * 30; // 30 days
// Ties step 1 (send code) to step 2 (verify) without exposing the challenge id
// to scripts; short-lived, matching the code's own lifetime.
export const OTP_COOKIE = "nc_otp";
// Marks a browser this person already proved themselves on ("remember me").
export const DEVICE_COOKIE = "nc_dev";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RESET_TTL_MS = 60 * 60 * 1000;       // password reset code (own mechanism)

const norm = (s) => String(s || "").trim().toLowerCase();
// 6-digit code for the password-reset flow (OTP codes are minted in data/otp.js).
function newCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// ---- cookies ---------------------------------------------------------------
export function sessionCookie(token, maxAge, isHttps) {
  const secure = isHttps ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
export function otpCookie(challengeId, isHttps) {
  const secure = isHttps ? "; Secure" : "";
  return `${OTP_COOKIE}=${challengeId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CODE_TTL_SEC}${secure}`;
}
export function clearedOtpCookie() {
  return `${OTP_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
export function deviceCookie(deviceId, isHttps) {
  const secure = isHttps ? "; Secure" : "";
  return `${DEVICE_COOKIE}=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(DEVICE_TTL_MS / 1000)}${secure}`;
}
// Best-effort client label for the trusted-device list ("Chrome on Windows").
// What we record about a device, and deliberately what we do NOT.
//
// The IP is never stored. It is HMAC'd with the server's key and only the
// digest is kept, so two sign-ins from the same address still match each other
// while the address itself cannot be recovered from the database — and, because
// the HMAC is keyed, it cannot be brute-forced from the tiny IPv4 space either,
// which a plain hash could be.
//
// Location is COARSE and comes from the edge (Vercel geo headers), not from the
// browser: city and country only, never coordinates, and no permission prompt.
export function deviceFingerprint(request) {
  const h = request?.headers;
  const ua = h?.get?.("user-agent") || "";
  const ip = h?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || h?.get?.("x-real-ip") || "";
  const city = h?.get?.("x-vercel-ip-city") || "";
  const country = h?.get?.("x-vercel-ip-country") || "";
  return {
    label: deviceLabel(request),
    deviceType: /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Phone" : "Computer",
    location: [decodeURIComponent(city), country].filter(Boolean).join(", "),
    ipHash: ip ? hashIp(ip) : "",
  };
}

// Keyed digest, truncated: enough to compare two sign-ins, useless as a lookup.
function hashIp(ip) {
  const key = process.env.FIELD_ENCRYPTION_KEY || "";
  if (!key) return "";
  return crypto.createHmac("sha256", key).update(String(ip)).digest("hex").slice(0, 24);
}

export function deviceLabel(request) {
  const ua = request?.headers?.get?.("user-agent") || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "device";
  return `${browser} on ${os}`;
}
// Caller IP for rate limiting (Vercel sets x-forwarded-for).
export function clientIp(request) {
  const fwd = request?.headers?.get?.("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || request?.headers?.get?.("x-real-ip") || "";
}
export function requestIsHttps(request) {
  try {
    return request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  } catch { return false; }
}

// ---- signup (OTP-first: no session until the address is proven) ------------
// Creates the User + its three satellites and opens an OTP challenge. It does
// NOT mint a session — access begins only after the emailed code is verified,
// so an unproven address can never hold a logged-in session.
export async function signup({ email, password, fullName, ip }) {
  const mail = norm(email);
  const pass = String(password || "");
  const name = String(fullName || "").trim();
  if (!mail || !pass) return { error: "missing" };
  if (!EMAIL_RE.test(mail)) return { error: "email" };
  const strength = checkPassword(pass);
  if (!strength.ok) return { error: "weak", failed: strength.failed };

  const created = await createUser({ email: mail, passwordHash: await hashPassword(pass), fullName: name });
  if (created.error) return { error: created.error }; // "exists" when the email is taken

  const challenge = await createChallenge({ purpose: "signup", email: mail, userId: created.user.id, ip });
  if (challenge.error) return { error: challenge.error };
  const emailSent = await deliverCode(mail, name, challenge.code, verificationCodeEmail);
  return { user: created.user, challengeId: challenge.challengeId, emailSent };
}

// Delivery is CRITICAL PATH: a code that never arrives is a locked-out person.
// sendEmail retries transient failures itself within a bounded budget, so by the
// time we see `ok:false` the address has been refused or the provider stayed
// down through every attempt — either way it is worth logging loudly, with the
// attempt count, so the difference is visible afterwards.
async function deliverCode(to, name, code, template) {
  const msg = template({ name, code });
  const res = await sendEmail({ to, subject: msg.subject, html: msg.html, text: msg.text });
  if (!res?.ok) {
    console.error(
      `[identity] OTP delivery FAILED to ${to} after ${res?.attempts ?? 0} attempt(s): `
      + `${res?.error || "unknown error"}${res?.skipped ? " (suppressed)" : ""}`,
    );
  }
  return Boolean(res?.ok);
}

// ---- OTP verification (completes signup OR an untrusted login) -------------
// Success always proves control of the address, so it stamps emailVerifiedAt
// for both purposes, mints the session, and optionally remembers the device.
export async function verifyOtp({ challengeId, code, remember, trustThisDevice, device }) {
  const result = await verifyChallenge(challengeId, code);
  if (result.error) return { error: result.error, attemptsLeft: result.attemptsLeft };

  const userId = result.challenge.userId;
  const user = await getUserById(userId);
  if (!user) return { error: "notfound" };          // user deleted mid-challenge
  if (user.status === "suspended") return { error: "suspended" };

  const v = (await getVerification(userId)) || {};
  if (!v.emailVerifiedAt) await updateVerification(userId, { emailVerifiedAt: new Date().toISOString() });

  const ttl = remember ? REMEMBER_TTL : SESSION_TTL;
  const token = await mintSession(userId, ttl);
  const deviceId = trustThisDevice ? await trustDevice(userId, device || {}) : "";
  return { user, token, ttl, deviceId };
}

// Re-send the code for an in-flight challenge (new code, attempts reset).
export async function resendOtp({ challengeId, ip }) {
  const result = await resendChallenge(challengeId, { ip });
  if (result.error) return result;
  const profile = result.challenge.userId ? await getProfile(result.challenge.userId) : null;
  const emailSent = await deliverCode(result.challenge.email, profile?.fullName, result.code, verificationCodeEmail);
  return { ok: true, emailSent };
}

// ---- OAuth sign-in ---------------------------------------------------------
// The provider already proved the address, so this skips OTP entirely: an
// existing user is signed straight in; a new one is created with the email
// pre-verified and a random password they never see (they can set their own
// later via "forgot password"). Returns { user, token, ttl } or { error }.
export async function signInWithProvider({ email, fullName, provider }) {
  const mail = norm(email);
  if (!EMAIL_RE.test(mail)) return { error: "email" };

  let user = await getUserByEmail(mail);
  if (user) {
    if (user.status === "suspended") return { error: "suspended" };
  } else {
    const created = await createUser({
      email: mail,
      passwordHash: await hashPassword(generatePassword(24)),
      fullName: String(fullName || "").trim(),
    });
    if (created.error) return { error: created.error };
    user = created.user;
  }
  // Remember HOW they got in, so the account page can explain why they have no
  // password and support can answer "why can't I sign in with my password?".
  if (provider && user.provider !== provider) {
    user = (await updateUser(user.id, { provider })) || user;
  }

  // Provider-verified: stamp verification if it isn't already set.
  const v = (await getVerification(user.id)) || {};
  if (!v.emailVerifiedAt) await updateVerification(user.id, { emailVerifiedAt: new Date().toISOString() });

  return { user, token: await mintSession(user.id, REMEMBER_TTL), ttl: REMEMBER_TTL };
}

// ---- login (risk-based: OTP only from an unrecognised device) --------------
// Returns either { user, token } for a trusted device, or { otpRequired } with
// a challenge to complete. Credentials are always checked FIRST, so a code is
// never sent to an address whose password was not supplied correctly.
export async function login({ email, password, remember, deviceId, ip }) {
  const user = await getUserByEmail(email);
  if (!user) return { error: "invalid" };                 // generic — never reveals existence
  if (user.status === "suspended") return { error: "suspended" };
  if (!(await verifyPassword(String(password || ""), user.passwordHash))) return { error: "invalid" };

  if (await isTrustedDevice(user.id, deviceId)) {
    const ttl = remember ? REMEMBER_TTL : SESSION_TTL;
    return { user, token: await mintSession(user.id, ttl), ttl };
  }

  const challenge = await createChallenge({ purpose: "login", email: user.email, userId: user.id, ip });
  if (challenge.error) return { error: challenge.error };
  const profile = await getProfile(user.id);
  const emailSent = await deliverCode(user.email, profile?.fullName, challenge.code, verificationCodeEmail);
  return { otpRequired: true, challengeId: challenge.challengeId, emailSent };
}

export async function logout(token) {
  const user = await findUserBySession(token);
  if (user) await revokeSession(user.id, token);
}

// The signed-in User for this request, or null.
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? findUserBySession(token) : null;
}

// Everything the account UI needs, in one read. `studio` = the ONE studio they
// own (Phase 3 creates it); `collaborations` = the studios they were approved
// into, derived from ix:collab.
export async function currentIdentity() {
  const user = await currentUser();
  if (!user) return null;
  const [profile, verification, questionnaire, studio, collaborations] = await Promise.all([
    getProfile(user.id), getVerification(user.id), getQuestionnaire(user.id),
    getOwnedStudio(user.id), listUserCollaborations(user.id),
  ]);
  return {
    user: publicUser(user),
    profile: profile || {},
    emailVerified: Boolean(verification?.emailVerifiedAt),
    questionnaire: questionnaire || {},
    studio: studio ? { id: studio.id, name: studio.name, slug: studio.slug } : null,
    collaborations: collaborations.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  };
}

// Never expose the password hash.
export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, status: user.status, provider: user.provider || "", createdAt: user.createdAt };
}

// ---- password: change / forgot / reset -------------------------------------
export async function changePassword(userId, currentPassword, nextPassword) {
  const user = await getUserById(userId);
  if (!user) return { error: "notfound" };
  if (!(await verifyPassword(String(currentPassword || ""), user.passwordHash))) return { error: "invalid" };
  const pass = String(nextPassword || "");
  const strength = checkPassword(pass);
  if (!strength.ok) return { error: "weak", failed: strength.failed };
  await updateUser(userId, { passwordHash: await hashPassword(pass) });
  // A credential change is a security event: drop every session AND forget every
  // trusted device, so the next sign-in anywhere must pass OTP again.
  await revokeAllSessions(userId);
  await revokeAllDevices(userId);
  return { ok: true };
}

// Always resolves the same way to the caller — never reveals whether the email
// is registered.
export async function requestPasswordReset(email) {
  const user = await getUserByEmail(email);
  if (!user) return { ok: true };
  const profile = await getProfile(user.id);
  const code = newCode();
  await updateVerification(user.id, { resetCode: code, resetCodeExpires: Date.now() + RESET_TTL_MS, resetCodeAttempts: 0 });
  await deliverCode(user.email, profile?.fullName, code, passwordResetCodeEmail);
  return { ok: true };
}

export async function resetPassword({ email, code, newPassword }) {
  const user = await getUserByEmail(email);
  if (!user) return { error: "invalid" };
  const v = (await getVerification(user.id)) || {};
  if (!v.resetCode) return { error: "invalid" };
  // Same attempt cap as the OTP challenges, so both code mechanisms behave alike.
  if ((v.resetCodeAttempts || 0) >= MAX_ATTEMPTS) return { error: "locked" };
  if (!v.resetCodeExpires || Date.now() > v.resetCodeExpires) return { error: "expired" };
  if (String(code || "").trim() !== v.resetCode) {
    await updateVerification(user.id, { resetCodeAttempts: (v.resetCodeAttempts || 0) + 1 });
    return { error: "invalid" };
  }
  const pass = String(newPassword || "");
  const strength = checkPassword(pass);
  if (!strength.ok) return { error: "weak", failed: strength.failed };
  await updateUser(user.id, { passwordHash: await hashPassword(pass) });
  await updateVerification(user.id, { resetCode: "", resetCodeExpires: 0, resetCodeAttempts: 0 });
  await revokeAllSessions(user.id);
  await revokeAllDevices(user.id);
  return { ok: true };
}

// ---- personal information (1:1, isolated to this user) ---------------------
const PROFILE_FIELDS = ["fullName", "shortName", "phone", "dob", "photo", "language", "workAddress"];
export async function savePersonalInfo(userId, patch = {}) {
  const clean = {};
  for (const f of PROFILE_FIELDS) {
    if (patch[f] === undefined) continue;
    clean[f] = f === "photo" ? String(patch[f] || "").slice(0, 1_500_000) : String(patch[f] || "").trim().slice(0, 300);
  }
  if (clean.language && !["en", "ar"].includes(clean.language)) clean.language = "en";
  if (!Object.keys(clean).length) return { error: "missing" };
  return { profile: await updateProfile(userId, clean) };
}

// ---- questionnaire (1:1, exclusively this user's) --------------------------
const INTENTS = ["create", "join"];
export async function saveQuestionnaire(userId, answers = {}) {
  const clean = {
    intent: INTENTS.includes(answers.intent) ? answers.intent : "",
    field: String(answers.field || "").trim().slice(0, 120),
    country: String(answers.country || "").trim().slice(0, 80),
    city: String(answers.city || "").trim().slice(0, 80),
    erps: Array.isArray(answers.erps) ? answers.erps.map((e) => String(e).slice(0, 60)).slice(0, 20) : [],
    packageKey: String(answers.packageKey || "").trim().slice(0, 40),
    completedAt: new Date().toISOString(),
  };
  if (!clean.intent) return { error: "intent" };
  return { questionnaire: await updateQuestionnaire(userId, clean) };
}
export { getQuestionnaire };
