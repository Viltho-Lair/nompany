// IS THIS REQUEST COMING FROM SOMEBODY ELSE'S PAGE?
//
// Lives on its own, in one file with no imports, for two reasons. It is used by
// /api/track — a public, unauthenticated, high-volume endpoint that should not
// drag the identity and studio modules into its bundle just to read a header —
// and by the route wrapper, which guards every authenticated mutation. Two
// callers meant two copies, and two copies of a security check are how one of
// them quietly stops matching the other.
//
// WHAT IT CATCHES. Session cookies are sent by the browser on cross-site form
// posts and fetches, which is the whole CSRF problem: attacker.example can make
// your browser POST to nompany.com carrying your cookie. A browser attaches an
// `Origin` header to exactly those requests, so a mismatch against `Host` is
// somebody else's page acting as you.
//
// WHAT IT DOES NOT CATCH, and this matters more than what it does: a request
// with NO Origin header at all passes. curl sends none; a non-browser client
// sends none. That is deliberate rather than an oversight — the threat model is
// a browser being used as a confused deputy, and a browser cannot omit the
// header on the requests that matter. An attacker who can already set arbitrary
// headers from outside a browser does not need CSRF.
//
// So this is one layer, not the answer. SameSite on the session cookie is the
// other half, and neither is sufficient alone: SameSite=Lax still permits
// top-level GET navigations, and this check still passes header-less clients.

/**
 * @param {Request} request
 * @returns {boolean} true when Origin is present and disagrees with Host
 */
export function isCrossSite(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (request.headers.get("host") || "");
  } catch {
    return true; // an Origin we cannot parse is not one we trust
  }
}

// Anything that can change state. GET and HEAD are excluded because a CSRF'd
// read returns its body to the attacker's page only if CORS lets it, which is a
// separate control — and because blocking cross-site GETs would break ordinary
// linking.
export const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
