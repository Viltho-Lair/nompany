"use client";

import { UI_LANG_COOKIE, isLocale, defaultLocale } from "@/shared/locale";

// THE ONE WRITER OF THE LANGUAGE COOKIE.
//
// Every language control in the product goes through here: the public header's
// LangMenu, the auth screens' pill switch, the account hub, and the studio's
// header menu. There is exactly one because `theme` already showed what happens
// otherwise — that cookie is written in three places with the same hand-copied
// string, and the day one of them drifts the choice stops sticking on whichever
// surface holds the stale copy.
//
// Same shape as `theme` on purpose: path=/ so it crosses the public site and
// every studio, a year of max-age, samesite=lax so it survives an OAuth return,
// and `secure` only where the protocol can carry it (localhost is http).
export function rememberLocale(code) {
  if (!isLocale(code)) return;
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${UI_LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax${secure}`;
  } catch {
    // A browser refusing cookies loses the preference, not the page. The studio
    // falls back to the tenant's language and the public site to its URL.
  }
}

export function readLocale(fallback = defaultLocale) {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${UI_LANG_COOKIE}=([^;]+)`));
    const v = m ? decodeURIComponent(m[1]) : "";
    return isLocale(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
