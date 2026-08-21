import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/shared/i18n";
import { SUPER_COOKIE } from "@/lib/authConstants";

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
  // Skip Next internals, API routes and static assets (files with a dot).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
