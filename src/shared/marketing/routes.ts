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

/**
 * Retired public URLs, and where each now goes (locale-relative; "" is home).
 *
 * These were real pages before the rebuild. Without a map they fall into the
 * studio-slug branch of the proxy and answer 307 to a login screen, so any
 * link that ever pointed at them lands a visitor on a form and tells a crawler
 * the page moved somewhere temporary.
 *
 * IT LIVES HERE RATHER THAN IN THE PROXY because the proxy is not its only
 * reader: every key below must ALSO be an unavailable studio slug, and it was
 * not. `/projects`, `/services`, `/vendors`, `/clients` and `/gallery` were all
 * takeable — a studio that registered one would have been permanently
 * redirected away from its own address by this very table, with nothing in the
 * product able to explain why.
 */
export const RETIRED_PATHS: Record<string, string> = {
  "/features": "/platform",
  "/pricing": "/pricing",
  "/contact": "",
  "/services": "",
  "/projects": "",
  "/vendors": "",
  "/clients": "",
  "/gallery": "",
};

/**
 * Reserved now so no URL ever has to move later (§3 of the rebuild design).
 *
 * A slug is the studio's address AND its tenant handle, so a name taken today
 * is a page that can never exist tomorrow. These are the pages the design
 * commits to building — per-department pages under `/platform/<section>`,
 * documentation, a changelog — plus the ones already built. Reserving costs a
 * word nobody may register; not reserving costs a URL, permanently.
 */
export const RESERVED_FOR_LATER = ["docs", "changelog", "blog", "help", "support", "status", "legal"] as const;

/** Every first path segment the public site owns or intends to own. */
export function reservedPublicSegments(): string[] {
  const fromShell = [...SHELL_PATHS, ...SHELL_PREFIXES].map((p) => p.slice(1));
  const fromRetired = Object.keys(RETIRED_PATHS).map((p) => p.slice(1));
  return [...new Set([...fromShell, ...fromRetired, ...RESERVED_FOR_LATER, "customers"])];
}
