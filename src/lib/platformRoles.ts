// PLATFORM roles and account status — the vocabulary the /super Users console
// lists people by. Pure functions and constants only, so the client table and
// the server that feeds it agree by construction instead of by copy-paste.
//
// A platform role is NOT a studio role. Studio membership is a Collaborator row
// with its own tags (src/platform/auth/authConstants.js), scoped to one studio; this is
// the platform-wide label the owner puts on a person, stored as `platformRole`
// on the user's registry row. Everyone starts a Member.

export const MEMBER_ROLE = "Member";
export const SUPER_ROLE = "Super Admin";

// What the owner may assign from the row menu. Member is not in this list — it
// is the absence of a role, expressed by clearing the field.
export const ASSIGNABLE_ROLES = ["Sales", "Marketing", "Finance", "Moderator", "Staff"];

// Order of the role filter: the owner, then the assigned roles, then everyone
// with no role at all — the same order the table itself sorts in.
export const ROLE_OPTIONS = [SUPER_ROLE, ...ASSIGNABLE_ROLES, MEMBER_ROLE];

export function isAssignableRole(role) {
  return ASSIGNABLE_ROLES.includes(String(role || ""));
}

// ---- status ----------------------------------------------------------------
export const STATUS = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
  suspended: "Suspended",
};

export const ACTIVE_WINDOW_DAYS = 30;
export const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Suspended and invited are STATES OF THE ACCOUNT and outrank the activity
// clock: a suspended account that signed in yesterday is suspended, not active.
// Everyone else is judged purely on whether they have signed in inside the
// window — never having signed in counts as inactive, not as invited.
// The most recent evidence this person was here.
export function lastAround(user) {
  const seen = Date.parse(user?.lastSeenAt || "");
  const login = Date.parse(user?.lastLoginAt || "");
  const best = Math.max(Number.isFinite(seen) ? seen : 0, Number.isFinite(login) ? login : 0);
  return best || NaN;
}

export function statusOf(user, now = Date.now()) {
  const state = String(user?.status || "").toLowerCase();
  if (state === "suspended") return STATUS.suspended;
  if (state === "invited") return STATUS.invited;
  // Whichever is later: signing in counts as being around, but so does using
  // the product a week into a session that started before that.
  const last = lastAround(user);
  if (Number.isFinite(last) && now - last <= ACTIVE_WINDOW_MS) return STATUS.active;
  return STATUS.inactive;
}

// Was this user active AS OF some earlier moment? The same test statusOf makes,
// run against a clock in the past: seen before that moment, and recently enough
// at that moment to have counted then.
//
// This is what makes a week-over-week figure honest — the timestamps are
// already stored, so the past is re-read rather than separately recorded.
export function wasActiveAt(user, at) {
  const last = lastAround(user);
  return Number.isFinite(last) && last <= at && at - last <= ACTIVE_WINDOW_MS;
}

// ---- ordering ---------------------------------------------------------------
// The owner first, then anyone carrying a role, then plain members. Within a
// rank the list is alphabetical by email, which is the only field every user is
// guaranteed to have.
export function roleRank(role) {
  if (role === SUPER_ROLE) return 0;
  if (isAssignableRole(role)) return 1;
  return 2;
}

export function compareUsers(a, b) {
  const byRank = roleRank(a.role) - roleRank(b.role);
  if (byRank) return byRank;
  return String(a.email).localeCompare(String(b.email));
}
