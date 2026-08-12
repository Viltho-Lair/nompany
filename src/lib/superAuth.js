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

import { REG, makeId } from "@/lib/data/keys";
import { readArr, editArr } from "@/lib/data/store";
import { hashPassword, verifyPassword, newSessionToken, generatePassword } from "@/lib/passwords";

export const SUPER_COOKIE = "nc_super";
const MAX_SESSIONS = 6;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Atomic — this is how session tokens are added and removed, so a lost write
// would either drop a live sign-in from the list or resurrect a revoked one.
// `patch` may be a function of the current row so callers can express "append to
// whatever tokens are there now" rather than "to the ones I last read".
async function patchAdmin(id, patch) {
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

export async function findSuperBySession(token) {
  if (!token) return null;
  const rows = await readArr(REG.superAdmins);
  return rows.find((a) => Array.isArray(a.sessionTokens) && a.sessionTokens.includes(token)) || null;
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
export async function loginSuper(email, password) {
  const admin = await findSuperByEmail(email);
  if (!admin) return null;
  if (!(await verifyPassword(password, admin.passwordHash))) return null;
  const token = newSessionToken();
  // Appended to the token list as it stands at the moment of the write — two
  // simultaneous sign-ins both end up signed in.
  const updated = await patchAdmin(admin.id, (a) => ({
    sessionTokens: [token, ...(Array.isArray(a.sessionTokens) ? a.sessionTokens : []).filter(Boolean)]
      .slice(0, MAX_SESSIONS),
  }));
  return { ...admin, sessionTokens: updated?.sessionTokens || [token], token };
}

// Invalidate only the presented token (other devices stay signed in).
export async function logoutSuper(token) {
  const admin = await findSuperBySession(token);
  if (!admin) return;
  await patchAdmin(admin.id, (a) => ({
    sessionTokens: (a.sessionTokens || []).filter((t) => t && t !== token),
  }));
}

// Client-safe projection — never the hash or tokens.
export function publicSuperAdmin(a) {
  if (!a) return null;
  return { id: a.id, email: a.email };
}
