"use client";

import { createContext, useContext } from "react";
import { defaultLocale } from "@/shared/locale";

// THE LANDING PAGE'S LANGUAGE, available to any of its components.
//
// The same shape as components/studio2/locale and for the same reason: the
// marketing page is eighteen client components deep in places, and threading a
// `locale` prop through the ones that only pass it on is how the next section
// somebody adds ends up in English on an Arabic page.
//
// SEPARATE FROM THE STUDIO'S on purpose, even though the value is identical.
// The two trees never nest, they load in different chunks, and a landing
// component reaching for `useStudioLocale` would drag the studio's context
// module into the marketing bundle for nothing.
//
// LandingPage already receives `locale` from the server layout — the URL is the
// authority on this side of the product (see preferredLocale in shared/locale) —
// so the provider only has to pass on what it was given.
const LandingLocale = createContext(defaultLocale);

export function LandingLocaleProvider({ locale, children }) {
  return <LandingLocale.Provider value={locale || defaultLocale}>{children}</LandingLocale.Provider>;
}

export function useLandingLocale() {
  return useContext(LandingLocale);
}
