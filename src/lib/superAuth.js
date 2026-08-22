// nompany OWNER auth for the /super console — a standalone identity, separate
// from the User model entirely (an owner is not a subscriber). Super admins are
// platform data: they sit OUTSIDE every cascade and outlive every user/studio.
//
// RESTRUCTURED: this now reads/writes the new registry key `g:superAdmins`
// (src/lib/data/keys.js REG.superAdmins). The old `nompany:g:c:superAdmins`
// location is gone along with the rest of the old structure.
//
// A superAdmin record: { id, email, passwordHash, sessionTokens[], createdAt,
//   passwordSetAt }.
//
// `sessionTokens` holds DIGESTS, not tokens:
//   { tokenHash, createdAt, expiresAt, label, location }
// and it is a display list, not the authority. What authorises a request is
// ix:supersession:<sha256(token)> -> SuperAdminID, carrying a real Redis EX.
// See findSuperBySession for why that distinction is the whole point.

import { cookies } from "next/headers";
import { REG, IX, makeId } from "@/lib/data/keys";
import { readArr, editArr, claim, getIndex, release } from "@/lib/data/store";
import { hashPassword, verifyPassword, newSessionToken, hashToken, generatePassword } from "@/lib/passwords";
import { mfaEnabled, openSecret, verifyCode, consumeRecoveryCode } from "@/lib/superMfa";
import { SUPER_COOKIE } from "@/lib/authConstants";

export { SUPER_COOKIE };
// A console session lasts a working day and is never "remembered" — the owner
// signs in again tomorrow. There is no long-lived variant on purpose.
export const SUPER_TTL_SEC = 60 * 60 * 12;
const MAX_SESSIONS = 6;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Atomic — this is how session tokens are added and removed, so a lost write
// would either drop a live sign-in from the list or resurrect a revoked one.
// `patch` may be a function of the current row so callers can express "append to
// whatever tokens are there now" rather than "to the ones I last read".
// EXPORTED so the MFA routes can write the admin row through the same
// compare-and-set every other write here uses. A second way to update this row
// is a second place for the session list to be clobbered.
export async function patchAdmin(id, patch) {
  return editArr(REG.superAdmins, (rows) => {
    let updated = null;
    const next = rows.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...(typeof patch === "function" ? patch(a) : patch), id: a.id };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

export async function findSuperByEmail(email) {
  const e = normEmail(email);
  if (!e) return null;
  const rows = await readArr(REG.superAdmins);
  return rows.find((a) => normEmail(a.email) === e) || null;
}

// Every owner address, lowercased — how the Users console tells which of its
// rows is a super admin. A super admin is a separate identity from the User of
// the same address, so the match is on email and nothing else.
export async function listSuperAdminEmails() {
  const rows = await readArr(REG.superAdmins);
  return new Set(rows.map((a) => normEmail(a.email)).filter(Boolean));
}

// THE SESSION INDEX IS THE AUTHORITY, and it is what carries the expiry.
//
// This used to scan g:superAdmins for an array containing the raw token, which
// was wrong three times over. The token was stored in the CLEAR, so any read of
// the database was a list of live console sessions. The comparison was
// `Array.includes`, which is not constant-time on a secret. And nothing on the
// row carried an expiry at all — SUPER_TTL_SEC was applied only to the cookie's
// Max-Age, which is a hint the client controls, so a captured owner token stayed
// valid until six newer sign-ins happened to push it off the end of the list.
//
// Now it works exactly the way the subscriber side already did: ix:supersession
// holds sha256(token) -> SuperAdminID with a real Redis EX. Expiry is enforced
// by the database, the stored value cannot be replayed, and the lookup is a
// single O(1) GET on a key an attacker cannot construct without the token.
export async function findSuperBySession(token) {
  if (!token) return null;
  const adminId = await getIndex(IX.superSession(hashToken(token)));
  if (!adminId) return null;
  const rows = await readArr(REG.superAdmins);
  return rows.find((a) => a.id === adminId) || null;
}

// Create a super-admin. If `password` is omitted, a random one is generated and
// returned in cleartext EXACTLY ONCE (for relaying) — never stored raw.
// Idempotent on email.
export async function seedSuperAdmin({ email, password } = {}) {
  const mail = normEmail(email);
  if (!EMAIL_RE.test(mail)) return { error: "email" };
  const plain = password || generatePassword(16);
  const now = new Date().toISOString();
  const admin = {
    id: makeId("sup"),
    email: mail,
    passwordHash: await hashPassword(plain),
    sessionTokens: [],
    createdAt: now,
    passwordSetAt: now,
  };
  // Idempotence on email is decided INSIDE the write, so seeding twice at once
  // yields one super-admin, not two accounts sharing an address.
  return editArr(REG.superAdmins, (rows) => {
    const existing = rows.find((a) => normEmail(a.email) === mail);
    if (existing) return { result: { admin: existing, existed: true } };
    return { next: [admin, ...rows], result: { admin, password: plain, existed: false } };
  });
}

// Verify credentials, mint a new session token. Generic failure (never reveals
// whether the email exists).
//
// A SECOND FACTOR STOPS THE SESSION BEING MINTED, rather than being checked
// after one exists. The order is the whole control: `mfaRequired` returns before
// claim(), so a correct password on its own produces no token, no index entry
// and nothing to replay. Anything that reversed that — minting first and
// verifying second — would leave a working session behind for the seconds
// between, which is all a leaked password needs.
export async function loginSuper(email, password, { code = "", device = null } = {}) {
  const admin = await findSuperByEmail(email);
  if (!admin) return null;
  if (!(await verifyPassword(password, admin.passwordHash))) return null;

  if (mfaEnabled(admin)) {
    if (!code) return { mfaRequired: true };

    const secret = openSecret(admin.mfa.secret);
    if (verifyCode(secret, code)) {
      // accepted
    } else {
      // A RECOVERY CODE IS CONSUMED IN THE SAME WRITE that accepts it, so the
      // same code cannot be used twice even by two requests arriving together —
      // patchAdmin is a compare-and-set, and the loser re-reads a list the code
      // is no longer in.
      const used = consumeRecoveryCode(admin.mfa?.recoveryCodes, code);
      if (!used.ok) return null;
      await patchAdmin(admin.id, (a) => ({
        mfa: { ...(a.mfa || {}), recoveryCodes: used.remaining, recoveryUsedAt: new Date().toISOString() },
      }));
    }
  }

  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const now = Date.now();

  // THE INDEX FIRST, because it is what actually authorises: the row below is a
  // list for the Security screen to render, and a session that exists in the
  // list but not in the index is not a session.
  await claim(IX.superSession(tokenHash), admin.id, SUPER_TTL_SEC);

  // The list keeps DIGESTS, never tokens, and each row carries its own expiry so
  // an old one can be dropped rather than lingering as a phantom device.
  // Appended as the list stands at the moment of the write, so two simultaneous
  // sign-ins both end up signed in.
  const updated = await patchAdmin(admin.id, (a) => ({
    sessionTokens: [
      {
        tokenHash,
        createdAt: now,
        expiresAt: now + SUPER_TTL_SEC * 1000,
        // WHAT THE ROW WAS ALWAYS MISSING. Digests and expiries make a list that
        // is true and useless: "a session started at 14:02" answers nothing a
        // person could act on. The browser and the city are what turn it into
        // "that one is not me" — which is the only question anybody opens a
        // session list to ask.
        //
        // The same deviceFingerprint the studio side has collected for months.
        // No IP is stored: the studio path keeps an HMAC of it and the console
        // has no screen that would show one, so keeping it here would be storing
        // an address for nobody.
        label: String(device?.label || ""),
        location: String(device?.location || ""),
      },
      // Anything that is not the new shape is a raw token from before this
      // change. It can no longer authorise anything, so it is dropped rather
      // than migrated — there is nothing in it worth keeping.
      ...(Array.isArray(a.sessionTokens) ? a.sessionTokens : [])
        .filter((s) => s && typeof s === "object" && s.tokenHash && s.expiresAt > now),
    ].slice(0, MAX_SESSIONS),
  }));
  return { ...admin, sessionTokens: updated?.sessionTokens || [], token };
}

// THE SECURITY FACTS ABOUT THIS ACCOUNT, and only the facts.
//
// Every number here is real and none of them is a credential: how many recovery
// codes remain, not which; when the password was last set, not what it is. The
// screen that reads this used to invent all three ("Enabled", "8 remaining",
// "Changed 42 days ago", hardcoded), and an invented "Enabled" is the worst of
// the three — it is a claim that a second factor is protecting an account that,
// until the MFA work landed, had none at all.
//
// A function rather than an endpoint: the page is a server component, so it can
// read this directly and render it in the same pass. An API for it would be one
// more door onto the same data for a screen that never needed to ask twice.
export async function superSecuritySummary(adminId) {
  const admin = (await readArr(REG.superAdmins)).find((a) => a.id === adminId);
  if (!admin) return null;

  const now = Date.now();
  const live = (Array.isArray(admin.sessionTokens) ? admin.sessionTokens : [])
    .filter((t) => t && t.expiresAt > now);

  return {
    mfaEnabled: Boolean(admin.mfa?.secret && admin.mfa?.enabledAt),
    mfaEnabledAt: admin.mfa?.enabledAt || "",
    // A COUNT OF HASHES, which is all this may ever be. The codes themselves
    // were shown once at enrolment and are stored the way passwords are.
    recoveryCodesLeft: Array.isArray(admin.mfa?.recoveryCodes) ? admin.mfa.recoveryCodes.length : 0,
    passwordSetAt: admin.passwordSetAt || admin.createdAt || "",
    sessionCount: live.length,
  };
}

// EVERY LIVE SESSION, newest first — for the console's own Security screen.
//
// Expired rows are filtered rather than trusted: the list is a DISPLAY of what
// the index holds, and the index expires on its own through Redis. A row whose
// expiresAt has passed authorises nothing, so showing it would be showing a
// session that is not one.
export async function listSuperSessions(adminId, currentToken = "") {
  const admin = (await readArr(REG.superAdmins)).find((a) => a.id === adminId);
  if (!admin) return [];

  const now = Date.now();
  const currentHash = currentToken ? hashToken(currentToken) : "";

  return (Array.isArray(admin.sessionTokens) ? admin.sessionTokens : [])
    .filter((s) => s && typeof s === "object" && s.tokenHash && s.expiresAt > now)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((s) => ({
      // The DIGEST is safe to hand out: it is the index key, not the credential,
      // and no cookie can be forged from it without a preimage. It is what the
      // revoke call names, so there is nothing to look up twice.
      tokenHash: s.tokenHash,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      // Rows written before this existed carry neither, and say so rather than
      // pretending to a precision they never had.
      label: s.label || "Unknown device",
      location: s.location || "",
      current: Boolean(currentHash) && s.tokenHash === currentHash,
    }));
}

/**
 * Sign one session out by its digest — "that one is not me".
 *
 * THE INDEX GOES FIRST, as it does everywhere here: it is the half that decides,
 * and a failure between the two leaves a signed-OUT session still listed rather
 * than a signed-in one hidden.
 */
export async function revokeSuperSession(adminId, tokenHash) {
  if (!adminId || !tokenHash) return false;

  // SCOPED TO THIS ADMIN inside the read, not after it. Without that, one
  // console owner could sign another out by naming a digest they saw.
  const admin = (await readArr(REG.superAdmins)).find((a) => a.id === adminId);
  const owns = (admin?.sessionTokens || []).some((s) => s?.tokenHash === tokenHash);
  if (!owns) return false;

  await release(IX.superSession(tokenHash));
  await patchAdmin(adminId, (a) => ({
    sessionTokens: (a.sessionTokens || []).filter((s) => s?.tokenHash !== tokenHash),
  }));
  return true;
}

// Invalidate only the presented token (other devices stay signed in). The index
// is released first — that is the half that decides — and the list is tidied
// after, so a failure between the two leaves a signed-OUT session listed rather
// than a signed-in one hidden.
export async function logoutSuper(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  const adminId = await getIndex(IX.superSession(tokenHash));
  await release(IX.superSession(tokenHash));
  if (!adminId) return;
  await patchAdmin(adminId, (a) => ({
    sessionTokens: (a.sessionTokens || []).filter((s) => s?.tokenHash !== tokenHash),
  }));
}

// Client-safe projection — never the hash or tokens.
export function publicSuperAdmin(a) {
  if (!a) return null;
  return { id: a.id, email: a.email };
}

/* ---- the session cookie -------------------------------------------------- */

export function superCookie(token, isHttps) {
  const secure = isHttps ? "; Secure" : "";
  return `${SUPER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SUPER_TTL_SEC}${secure}`;
}

export function clearedSuperCookie() {
  return `${SUPER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// THE gate for every /super server component and API route: the cookie is only
// a claim, and this is where it is checked against the stored token list. The
// edge proxy's cookie-presence test (src/proxy.js) is a convenience redirect,
// never authorisation — a forged cookie gets past it and dies here.
export async function currentSuperAdmin() {
  const token = (await cookies()).get(SUPER_COOKIE)?.value;
  if (!token) return null;
  return findSuperBySession(token);
}
