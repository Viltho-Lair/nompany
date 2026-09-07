// WHICH PUBLIC PATHS WEAR THE MARKETING CHROME — asked in three places.
//
// THREE LISTS OF THE SAME FACT WERE DRIFTING APART, and the drift is silent by
// construction. The root layout decided the light/dark default from a
// hand-typed regex; `Nav` and `Footer` each decided whether to stand down from
// their own hand-typed list. A page added to one and not the others still
// builds, still renders, and still passes every test — it just comes out
// wrong, and wrong in the two ways the layout's own comment already warns
// about: the shell paints its dark background while every token inside it
// resolves to a light value, or the account nav renders above the marketing
// nav and the visitor sees two of everything.
//
// It happened twice within a day. `/contact` shipped as a route and reached
// the layout's regex in neither direction, so a page built on the dark shell
// was being served the light theme's tokens; `/careers` was about to do the
// same. Both were found by opening the page, which is the only thing that
// could have found either.
//
// THE AUTHORITY IS "DOES THE PAGE RENDER `MarketingShell`", and the suite
// asserts this file against the pages themselves — an import added without an
// entry here, or an entry with no page behind it, fails rather than renders
// wrong.

/** Locale-relative paths whose page renders `MarketingShell`. */
export const SHELL_PATHS = ["/platform", "/pricing", "/security", "/about", "/contact"] as const;

/**
 * Locale-relative prefixes whose whole family renders `MarketingShell`.
 *
 * A ROUTE FAMILY CANNOT BE LISTED EXHAUSTIVELY: careers is `/careers` and one
 * `/careers/<jobId>` per opening. The job page is where a candidate arrives
 * from a job board, often before they have seen anything else of the company,
 * so it is the worst one to leave wearing another site's chrome.
 */
export const SHELL_PREFIXES = ["/careers"] as const;

/**
 * The auth screens. They do NOT render `MarketingShell` — they have their own
 * narrow layout — but they are painted from the landing palette (`landing-field`,
 * `landing-submit`), so they take the dark default with the rest of the public
 * site. Listed apart from the shell paths precisely because they answer the
 * theme question and not the chrome question.
 */
export const LANDING_AUTH_PATHS = ["/login", "/signup", "/forgot"] as const;

/** Strip the locale segment and any trailing slash: "/en/about/" → "/about". */
function localeRelative(pathname: string): string {
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  return rest.replace(/\/$/, "");
}

/** Does the page at this locale-relative path bring the marketing chrome? */
export function bringsOwnChrome(rel: string): boolean {
  return (
    (SHELL_PATHS as readonly string[]).includes(rel) ||
    (SHELL_PREFIXES as readonly string[]).some((p) => rel === p || rel.startsWith(`${p}/`))
  );
}

/**
 * Does this full pathname belong to the public marketing surface?
 *
 * Used by the root layout to pick the theme DEFAULT. A saved `theme` cookie
 * still wins over it: what is decided here is only what somebody who has never
 * chosen gets to see.
 */
export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const rel = localeRelative(pathname);
  if (rel === "") return true; // the home page at /en or /ar
  return bringsOwnChrome(rel) || (LANDING_AUTH_PATHS as readonly string[]).includes(rel);
}
