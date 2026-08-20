// WHAT A REFUSAL IS WORTH, in one place.
//
// Ninety-six route files map their service's `{ error: "..." }` onto an HTTP
// status by hand, and fifty-nine of them write their own little ladder to do
// it. They do not agree. `notfound` is 404 in most places and 400 in a few;
// `forbidden` is 403 in most places and 400 in technical/quotations; and the
// quotations DELETE sends EVERY error as 404, so a permission refusal there
// arrives claiming the record does not exist — which is the one answer that
// tells a caller to stop asking.
//
// This is the table those ninety-six copies collapse into. It is a plain frozen
// object rather than a function so the test suite can assert against it without
// running a route, and so the wrapper, the goldens and the scanner all read the
// SAME source rather than three opinions that drift.
//
// ONLY NON-400 ENTRIES ARE LISTED. 400 is the default because the overwhelming
// majority of these names are validation failures — a missing field, a bad
// number, an empty patch — and enumerating a hundred of them would be a list
// nobody maintains. An unknown name means "the caller sent something we would
// not accept", which is exactly 400.

// 401 — WE DO NOT KNOW WHO YOU ARE. Not "you may not": no credential at all.
// Both spellings are here because both exist in the codebase, which is itself a
// small bug: `unauthorised` appears where `unauthorized` was meant. Converging
// them is a rename with callers, so the table accepts both rather than letting
// one of them silently fall through to 400.
const UNAUTHENTICATED = ["unauthorized", "unauthorised"];

// 403 — WE KNOW WHO YOU ARE AND THE ANSWER IS STILL NO. The distinction from
// 401 matters: a client that retries with fresh credentials is wasting its time
// here, and a client that gets 401 should retry exactly once.
const FORBIDDEN = [
  "forbidden", "forbidden-field", "role-forbidden", "read-only",
  "escalation",        // nobody grants what they do not hold
  "not-yours",         // someone else's record, and you cannot manage the area
  "protected",         // the built-in admin role is not editable
  "authority",         // signing outside the authorities you hold
  "suspended",         // the account exists and is switched off
  "unverified",        // the email behind it was never confirmed
  "owner-immutable", "typed-immutable",
];

// 404 — IT IS NOT THERE, or you are not allowed to know that it is. Membership
// refusals deliberately render identically to absence (see CLAUDE.md), so this
// is load-bearing for tenancy, not just tidiness.
const NOT_FOUND = ["notfound", "not-found", "no-record", "no-section"];

// 409 — THE REQUEST IS WELL FORMED AND THE WORLD DISAGREES WITH IT. This is the
// class most often mislabelled 400 today, and the distinction is worth keeping:
// 400 means "fix your request", 409 means "the request was fine, the record has
// moved on" — which is a retry-after-refresh, not a bug in the caller.
const CONFLICT = [
  "already", "already-member", "already-issued", "already-decided",
  "already-open", "already-owner", "received-already",
  "duplicate", "duplicate-sku", "exists", "taken", "slug-taken",
  "in-use", "has-payments",
  "locked",            // see the note below — this name is overloaded
  "issued", "not-issued", "approved", "not-approved", "cancelled", "obsolete",
  "controlled",        // an effective document is not editable in place
  "wrong-state",       // the signable transition table refused the move
  "same-signer",       // reviewer is not approver, enforced at the transition
  "clash", "overlap",  // a shift or a leave already occupies that window
  "pending",           // a join request is already open; never stack duplicates
];

// 429 — SLOW DOWN. Separated from 403 on purpose: a rate limit is temporary and
// a permission refusal is not, and a client should treat them differently.
const RATE_LIMITED = ["rate-limited", "rate-email", "rate-ip", "cooldown"];

// 413 — the upload is bigger than the ceiling.
const TOO_LARGE = ["too-large"];

// 500 — OUR BUG, NOT THEIRS. `unknown-permission` means a route asked for a
// permission key the catalogue does not define; no request the caller could
// have sent would avoid it, so telling them "bad request" would be a lie that
// sends them looking in the wrong place.
const SERVER_FAULT = ["unknown-permission"];

const build = () => {
  const table = {};
  const put = (names, status) => { for (const n of names) table[n] = status; };
  put(UNAUTHENTICATED, 401);
  put(FORBIDDEN, 403);
  put(NOT_FOUND, 404);
  put(CONFLICT, 409);
  put(TOO_LARGE, 413);
  put(RATE_LIMITED, 429);
  put(SERVER_FAULT, 500);
  return Object.freeze(table);
};

export const STATUS = build();

/** The default for anything unlisted: the caller sent something we will not take. */
export const DEFAULT_STATUS = 400;

/**
 * What HTTP status a service error name is worth.
 *
 * @param {string} error - the `error` field a service returned
 * @returns {number}
 */
export function statusFor(error) {
  return STATUS[error] ?? DEFAULT_STATUS;
}

// ONE NAME MEANS TWO THINGS, and the table cannot fix it alone.
//
// `locked` is a record that may not be edited (technical/quotations) AND an OTP
// challenge whose attempts are exhausted (data/otp.js). The first is 409, the
// second is really 429 — a temporary lockout with a ladder behind it. The table
// resolves it to 409 because that is what every route sends today and the
// goldens record it.
//
// Renaming the OTP one to `too-many-attempts` is the actual fix; it belongs with
// the identity conversion, where the route and its golden change together.
export const OVERLOADED = Object.freeze(["locked"]);
