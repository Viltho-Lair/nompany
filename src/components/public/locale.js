"use client";
import { createContext, useContext } from "react";
import { defaultLocale } from "@/shared/locale";

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
  return <AccountLocale.Provider value={locale || defaultLocale}>{children}</AccountLocale.Provider>;
}

// Defaults to English outside a provider so a component rendered in isolation —
// a test, a storybook, a route that forgot the wrapper — still has words.
export function useAccountLocale() {
  return useContext(AccountLocale);
}
