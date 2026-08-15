// USER repository — the single identity (merges the old companies-auth +
// users-login split). A User owns exactly its own satellites:
//   u:<UserID>:profile        1:1 editable personal information
//   u:<UserID>:verification   1:1 email-verification + reset codes
//   u:<UserID>:questionnaire  1:1 personal questionnaire (exclusively theirs)
//   u:<UserID>:sessions       1:N login sessions (ix:session:<token> has EX)
//
// USER-scoped data lives HERE and only here — never on a studio.
// Deletion goes through cascade.js (cascadeDeleteUser), never this file.

import { REG, U, IX, ID, normEmail } from "@/lib/data/keys";
import { readArr, editArr, editJSON, getJSON, setJSON, claim, getIndex, release } from "@/lib/data/store";
import { newSessionToken } from "@/lib/passwords";
import { listStudios, ownedStudioId, collaborationStudioIds } from "@/lib/data/studios";
import { isAssignableRole } from "@/lib/platformRoles";
import { emitPlatform, PLATFORM } from "@/lib/data/events";

// ---- create ----------------------------------------------------------------
// Claims the email index FIRST (SET NX) so two concurrent signups can never
// share an address, then writes the registry row + all three 1:1 satellites.
export async function createUser({ email, passwordHash, fullName = "" }) {
  const mail = normEmail(email);
  if (!mail) return { error: "email" };
  const id = ID.user();
  if (!(await claim(IX.email(mail), id))) return { error: "exists" };
  try {
    const user = { id, email: mail, passwordHash, status: "active", createdAt: new Date().toISOString() };
    await setJSON(U.profile(id), { fullName, shortName: "", phone: "", dob: "", photo: "", language: "en", workAddress: "" });
    await setJSON(U.verification(id), { emailCode: "", emailCodeExpires: 0, emailVerifiedAt: "", lastSentAt: 0, resetCode: "", resetCodeExpires: 0 });
    await setJSON(U.questionnaire(id), { intent: "", field: "", country: "", city: "", erps: [], packageKey: "", completedAt: "" });
    await editArr(REG.users, (rows) => ({ next: [user, ...rows] }));
    // The console's feed. An event, not a notification: signups are routine and
    // wanted in the history, but they are not something an owner has to act on,
    // and a bell that rings for every one of them stops being read.
    await emitPlatform({
      type: PLATFORM.userSignedUp,
      title: "New user signed up",
      body: mail,
      href: "/super/application/users",
      refId: id,
    });
    return { user };
  } catch (e) {
    await release(IX.email(mail)); // roll back the claim so the email isn't stranded
    throw e;
  }
}

// ---- lookups ---------------------------------------------------------------
export async function getUserById(userId) {
  if (!userId) return null;
  const rows = await readArr(REG.users);
  return rows.find((u) => u.id === userId) || null;
}
export async function getUserByEmail(email) {
  const id = await getIndex(IX.email(email));
  return id ? getUserById(id) : null;
}
export async function listUsers() {
  return readArr(REG.users);
}

// ---- registry updates (id/email are immutable here) ------------------------
export async function updateUser(userId, patch) {
  return editArr(REG.users, (rows) => {
    let updated = null;
    const next = rows.map((u) => {
      if (u.id !== userId) return u;
      const { id, email, ...safe } = patch || {};
      updated = { ...u, ...safe, id: u.id, email: u.email };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

// ---- platform role + activity ----------------------------------------------
// `platformRole` is the owner-assigned, platform-wide label (see
// src/lib/platformRoles.js). An empty field means Member, so clearing a role is
// how someone goes back to being one — there is no "Member" value to store.
export async function setPlatformRole(userId, role) {
  const value = String(role || "");
  if (value && !isAssignableRole(value)) return { error: "role" };
  const updated = await updateUser(userId, { platformRole: value });
  return updated ? { user: updated } : { error: "notfound" };
}

// Stamped on the registry row at every sign-in, because nothing else can answer
// "active in the last 30 days": a session lasts 8 hours and a device row 30
// days, so both are gone or stale long before the question stops mattering.
// One field on a key the console already reads, rather than a per-user scan.
export async function touchLastLogin(userId) {
  if (!userId) return;
  await updateUser(userId, { lastLoginAt: new Date().toISOString() });
}

// LAST SEEN, as distinct from last signed in.
//
// lastLoginAt answers "when did they last authenticate", which is the wrong
// question for "are they around": a remember-me session lasts 30 days, so
// somebody using the product daily still looked a month stale.
//
// Called on every authenticated request, so it is THROTTLED: it only writes
// when the stored stamp is older than the window below. That turns one write
// per request into at most one per user per few minutes, which is the whole
// reason this is affordable to do at all.
export const SEEN_THROTTLE_MS = 3 * 60 * 1000;

export async function touchLastSeen(userId) {
  if (!userId) return;
  const user = await getUserById(userId);
  if (!user) return;
  const last = Date.parse(user.lastSeenAt || "");
  if (Number.isFinite(last) && Date.now() - last < SEEN_THROTTLE_MS) return;
  await updateUser(userId, { lastSeenAt: new Date().toISOString() });
}

// Every user with the fields the owner console lists. The studio registry is
// read ONCE and shared; only the two per-user back-pointers are fetched per
// person, in parallel.
export async function listUsersForConsole() {
  const [rows, studios] = await Promise.all([readArr(REG.users), listStudios()]);
  const byId = new Map(studios.map((s) => [s.id, s]));
  const nameOf = (id) => byId.get(id)?.name || byId.get(id)?.slug || "";

  return Promise.all(
    rows.map(async (u) => {
      const [profile, ownedId, collabIds] = await Promise.all([
        getProfile(u.id),
        ownedStudioId(u.id),
        collaborationStudioIds(u.id),
      ]);
      // Owned first — it is the studio that dies with them — then the ones they
      // were let into, deduped in case the owner also holds a collaborator row.
      const names = [ownedId, ...(collabIds || [])]
        .filter(Boolean)
        .map(nameOf)
        .filter(Boolean);
      return {
        id: u.id,
        email: u.email,
        status: u.status || "",
        platformRole: u.platformRole || "",
        createdAt: u.createdAt || "",
        lastLoginAt: u.lastLoginAt || "",
        lastSeenAt: u.lastSeenAt || "",
        fullName: profile?.fullName || "",
        studios: [...new Set(names)],
      };
    })
  );
}

// ---- 1:1 satellites (merge-patch semantics) --------------------------------
// Atomic merge: editing your phone number while another tab writes your photo
// keeps both, instead of whichever request finished second winning outright.
const patchDoc = (key) => async (userId, patch) => {
  return editJSON(key(userId), (cur) => {
    const next = { ...(cur || {}), ...patch };
    return { next, result: next };
  });
};
export const getProfile = (userId) => getJSON(U.profile(userId));
export const updateProfile = patchDoc(U.profile);
export const getVerification = (userId) => getJSON(U.verification(userId));
export const updateVerification = patchDoc(U.verification);
export const getQuestionnaire = (userId) => getJSON(U.questionnaire(userId));
export const updateQuestionnaire = patchDoc(U.questionnaire);

// ---- sessions (1:N; expiry enforced by Redis EX on the index key) ----------
export async function mintSession(userId, ttlSec) {
  const token = newSessionToken();
  const now = Date.now();
  await claim(IX.session(token), userId, ttlSec); // fresh random token — claim always succeeds
  // Atomic: signing in on two devices at once must list BOTH sessions. A lost
  // row here leaves a live session that "sign out everywhere" cannot see.
  await editArr(U.sessions(userId), (sessions) => ({
    next: [{ token, createdAt: now, expiresAt: now + ttlSec * 1000 }, ...sessions]
      .filter((s) => s.expiresAt > now)
      .slice(0, 10), // bound per user
  }));
  return token;
}
export async function findUserBySession(token) {
  if (!token) return null;
  const userId = await getIndex(IX.session(token));
  return userId ? getUserById(userId) : null;
}
export async function revokeSession(userId, token) {
  await release(IX.session(token));
  await editArr(U.sessions(userId), (sessions) => ({ next: sessions.filter((s) => s.token !== token) }));
}
// The list is emptied atomically and the indexes released from the list AS IT
// WAS EMPTIED — so a session minted mid-revoke is either revoked with the rest
// or lands after, never left live-but-unlisted.
export async function revokeAllSessions(userId) {
  const revoked = await editArr(U.sessions(userId), (sessions) => ({ next: [], result: sessions }));
  for (const s of revoked) await release(IX.session(s.token));
}
