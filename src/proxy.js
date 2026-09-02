import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/shared/i18n";
import { SUPER_COOKIE } from "@/platform/auth/authConstants";

// SLUG-DRIVEN ROUTING.
//
// A studio's address IS its slug: www.nompany.com/<slug>. Anything at the root
// that isn't a locale, an asset, or a platform path is treated as a studio slug
// and REWRITTEN (never redirected) onto the internal studio route, with the slug
// passed along in `x-studio-slug`. The browser only ever shows /<slug>/….
//
// The edge cannot reach Redis, so it does not try to validate the slug — it just
// routes. The studio page resolves the slug against the database and decides
// 404 vs "not a member". Membership is the authorisation, never the URL.
//
// NB: never pair this rewrite with a redirect in the other direction — doing so
// previously produced an infinite loop (ERR_TOO_MANY_REDIRECTS).

/* ---- the desktop client's CORS, for /api only ----------------------------
 *
 * FOLDED IN FROM src/middleware.ts, and not by preference: Next 16 refuses to
 * start when a middleware file and a proxy file both exist ("Both middleware
 * file and proxy file are detected"), so the edge has room for exactly one of
 * them and this is it. The matcher below gained `/api/:path*` to carry the work
 * the middleware's own matcher used to do.
 *
 * WHO IS ALLOWED TO CALL THIS API FROM A WEBVIEW.
 *
 * The web app is same-origin and needs none of this — CORS is a rule about other
 * origins, and its own pages are not one. This exists for the desktop client,
 * whose webview loads from `http://tauri.localhost` on Windows' WebView2 and
 * `tauri://localhost` elsewhere. Those are named explicitly.
 *
 * NEVER `*`, and not for the usual reason. These routes accept a session cookie,
 * and a wildcard cannot be combined with credentials at all — but the sharper
 * point is that reflecting whatever `Origin` arrives would let any page on the
 * internet call this API and read the answer.
 *
 * AND CREDENTIALS ARE DELIBERATELY NOT ALLOWED. The desktop client authenticates
 * with a bearer token out of the OS keychain, so it never needs the browser to
 * attach a cookie. Leaving `Access-Control-Allow-Credentials` off means a
 * cross-origin page cannot ride a signed-in person's cookie even if it somehow
 * got itself onto this list — and it is why the web app's own `SameSite=Lax`
 * cookie did not have to be weakened to `None` to make the desktop app work.
 */
const BUILT_IN = ["http://tauri.localhost", "tauri://localhost"];

// Extra origins for a preview deployment, comma-separated, so one can be admitted
// without a code change. Malformed entries are simply absent rather than silently
// widening anything.
const EXTRA = (process.env.DESKTOP_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED = new Set([...BUILT_IN, ...EXTRA]);

// The desktop client's marker rides alongside content-type and the bearer, and a
// header not named here fails the preflight rather than the request.
const ALLOW_HEADERS = "content-type, authorization, x-nompany-client, x-nompany-device";

function cors(origin, response) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  // WITHOUT THIS A CACHE WILL SERVE ONE ORIGIN'S ANSWER TO ANOTHER. The response
  // differs by request header, and every layer in front of this needs to know.
  response.headers.append("Vary", "Origin");
  return response;
}

/**
 * A FUNCTION OVER A REQUEST, deliberately: it reads the origin and the method and
 * nothing else — no `nextUrl`, no cookies — so tests/desktop-transport.test.mjs
 * can call it with a plain `Request` and no server. Exported for that reason.
 */
export function apiCors(request) {
  const origin = request.headers.get("origin") || "";

  // Not a cross-origin call, or not one we know: behave exactly as before. An
  // unknown origin gets no CORS headers, which is what makes the browser refuse
  // it — a 403 here would be a worse answer, because it would tell a caller that
  // the route exists.
  if (!origin || !ALLOWED.has(origin)) return NextResponse.next();

  // A PREFLIGHT IS ANSWERED HERE AND GOES NO FURTHER. Next's default OPTIONS
  // reply carries `Allow` but no CORS headers, which is a preflight failure.
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    preflight.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return cors(origin, preflight);
  }

  return cors(origin, NextResponse.next());
}

const LOGIN_PATH = `/${defaultLocale}/login`;

// Root paths that belong to the platform and can never be a studio slug.
// "c" served the public company profile (/c/<slug>) until that feature was
// removed on 2026-08-12 — studios have no public site under nompany.com. It
// stays reserved here (and in RESERVED_SLUGS) so the prefix can never be
// claimed as a studio slug, which would resurrect the collision it prevented.
const PLATFORM = new Set(["api", "_next", "super", "brand", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.webmanifest", "studio", "c", "q"]);

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const seg1 = pathname.split("/")[1] || "";

  // THE API IS THE CORS BRANCH AND NOTHING ELSE. It is first because every rule
  // below is about addressing a PAGE — a slug, a locale, the console — and none
  // of them can ever apply to /api, which is reserved in PLATFORM precisely so a
  // studio cannot claim it. Falling through would reach the same
  // `NextResponse.next()` by a longer road.
  if (seg1 === "api") return apiCors(request);

  // The old /admin and /studio surfaces are gone — send anyone with a stale
  // bookmark to sign in, where their account lists the studios they can enter.
  if (seg1 === "admin" || seg1 === "studio") {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // The owner's console. Everything under /super except the sign-in page itself
  // requires a session; someone without one is sent to the door rather than
  // being shown a console shell that would only redirect a moment later.
  //
  // This checks that the cookie EXISTS, nothing more — the edge cannot reach
  // Redis, so it cannot know whether the token is real. Authorisation happens
  // in src/app/super/(shell)/layout.js, which verifies it against the stored
  // token list before rendering anything.
  if (seg1 === "super") {
    const signInPage = pathname === "/super" || pathname === "/super/";
    if (!signInPage && !request.cookies.get(SUPER_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/super";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public site: locale-prefixed.
  const hasLocale = locales.some((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`));
  if (hasLocale) {
    const locale = pathname.startsWith("/ar") ? "ar" : defaultLocale;
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    // The root layout resolves the saved theme server-side and needs to know
    // which surface it is rendering, because the no-choice default differs
    // between the marketing pages and the app.
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  // Root itself → default locale (the landing page).
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}`;
    return NextResponse.redirect(url);
  }

  // A studio address: /<slug>/… → internal studio route, URL unchanged.
  if (seg1 && !PLATFORM.has(seg1)) {
    const rest = pathname.slice(`/${seg1}`.length);
    const url = request.nextUrl.clone();
    url.pathname = `/studio${rest}`;
    const headers = new Headers(request.headers);
    headers.set("x-studio-slug", seg1);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  // TWO PATTERNS, NOT ONE WIDENED PATTERN. The second is the page rule and is
  // unchanged — it still skips Next internals, API routes and static assets
  // (files with a dot). The first restores exactly what the middleware's own
  // matcher covered, and it has to be stated separately because the page rule
  // excludes anything containing a dot: an API path that had one would
  // otherwise silently lose its CORS headers, which surfaces in the desktop
  // client as a thrown fetch with no status rather than as a refusal.
  matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
