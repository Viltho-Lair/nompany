import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";

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
const PLATFORM = new Set(["api", "_next", "super", "brand", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.webmanifest", "studio"]);

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

  if (seg1 === "super") return NextResponse.next();

  // Public site: locale-prefixed.
  const hasLocale = locales.some((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`));
  if (hasLocale) {
    const locale = pathname.startsWith("/ar") ? "ar" : defaultLocale;
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    return NextResponse.next({ request: { headers } });
  }

  // Root itself → default locale.
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
