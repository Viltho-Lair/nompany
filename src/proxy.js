import { NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";
import { SESSION_COOKIE } from "@/lib/auth";

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // /admin has migrated to /studio — redirect old links/bookmarks straight
  // through (route slugs match 1:1, e.g. /admin/vendors -> /studio/vendors).
  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/studio" + pathname.slice("/admin".length);
    return NextResponse.redirect(url);
  }

  // Studio guard — edge-level: any non-empty session cookie passes through so
  // the login page redirects work. Per-page tag enforcement (admin-only pages,
  // Technical section, etc.) is handled inside each server component using
  // `requireTag()` from lib/session.js, which can hit the DB.
  if (pathname.startsWith("/studio")) {
    if (pathname === "/studio/login") return NextResponse.next();
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/studio/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Locale routing for the public site.
  const hasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );
  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Expose the active locale to the server layout so it can set <html lang/dir>.
  const locale = pathname.startsWith("/ar") ? "ar" : defaultLocale;
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip Next internals, API routes and static assets (files with a dot).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)"],
};
