"use client";
import { createContext, useContext, useEffect } from "react";
import { defaultLocale } from "@/shared/locale";
import { readLocale, rememberLocale } from "@/lib/langCookie";

// THE ACCOUNT PAGES' LOCALE, for the same reason the studio and the marketing
// site each have their own: these components are nested five deep in places
// (AccountHome → Security → SetPasswordDialog) and threading a `locale` prop
// through every one of them is how a dialog ends up in the wrong language.
//
// It is a THIRD context rather than a shared one because a context module is
// imported by everything that reads it: one shared provider would put the
// studio's module in the marketing bundle and the marketing site's in the
// studio's. The value is four bytes; the import graph is what matters.
const AccountLocale = createContext(defaultLocale);

export function AccountLocaleProvider({ locale, children }) {
  // THE LANGUAGE A PERSON IS READING THE SITE IN IS THE ONE THE STUDIO OPENS IN.
  // The studio has no locale in its URL and reads only the `lang` cookie, and the
  // cookie used to be written only when somebody pressed a LangMenu — so arriving
  // on /ar by a link, a typed address, the mobile menu's plain <a> or the sign-in
  // redirect left it saying "en" (or nothing), and the studio and the account hub
  // disagreed about a language the person had plainly chosen. Every page under
  // /[locale] renders this provider, so syncing here covers them all at once.
  useEffect(() => {
    if (locale && readLocale("") !== locale) rememberLocale(locale);
  }, [locale]);
  return <AccountLocale.Provider value={locale || defaultLocale}>{children}</AccountLocale.Provider>;
}

// Defaults to English outside a provider so a component rendered in isolation —
// a test, a storybook, a route that forgot the wrapper — still has words.
export function useAccountLocale() {
  return useContext(AccountLocale);
}
