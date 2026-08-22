// Client-safe auth constants. Kept in their own module so the edge proxy can
// name the console's cookie without importing lib/superAuth.js (bcrypt + Redis).
//
// WHAT USED TO BE HERE: a whole parallel authorisation model built on
// `user.tags` — ADMIN_TAG, LEADER_TAG, TECHNICAL_TAG, SALES_TAG, PRESALES_TAG,
// FINANCE_TAG, MANAGEMENT_TAG, HR_TAG, plus isHR() and canSeeAllIn(). It went
// with the move to roles, and the User row has carried no `tags` field for some
// time, so every one of those helpers answered false for everybody. Dead code
// that LOOKS like a security check is worse than none: it reads as though
// urgency is Leader-gated or the employee directory is HR-gated, and neither
// was true any more. Access is answered in platform/access/resolve.ts, in one place.

// The platform owner's session for /super. A SEPARATE identity from the studio
// session above — an owner is not a subscriber — so it gets its own cookie and
// never grants (or is granted by) anything in the studio world. It lives here
// rather than in lib/superAuth.js because the edge proxy needs the name to gate
// /super/* and cannot import that module (bcrypt + Redis).
export const SUPER_COOKIE = "nc_super";
