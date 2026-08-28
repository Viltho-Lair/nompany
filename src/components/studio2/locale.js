"use client";

import { createContext, useContext } from "react";
import { defaultLocale } from "@/shared/locale";

// WHICH LANGUAGE THIS TREE READS IN, available to any component without being
// passed one.
//
// The alternative was a `locale` prop, and it does not survive contact with this
// codebase. Eighty-odd components need it, most of them nested three or four
// deep inside a screen that itself takes only `slug` — so the prop would have to
// be threaded through every intermediate component that has no use for it, and
// the next dialog somebody adds is the one that forgets. A screen rendering half
// in Arabic is a worse failure than one rendering all in English, because it
// looks like a translation bug rather than a missing wire.
//
// Resolved on the SERVER (see preferredLocale in shared/locale) and handed to the
// provider as a value, so the first paint is already right. The provider itself
// holds no state and never re-renders on its own: changing language goes through
// router.refresh(), which re-runs the server component and hands down a new
// value, because the DICTIONARY has to come from the server render anyway.
//
// Deliberately NOT the dictionary. Each surface loads its own (see
// shared/studio/*), and putting a dictionary in here would be the barrel that
// file warns about — every screen would carry every screen's words.
const StudioLocale = createContext(defaultLocale);

export function StudioLocaleProvider({ locale, children }) {
  return <StudioLocale.Provider value={locale || defaultLocale}>{children}</StudioLocale.Provider>;
}

// English when there is no provider above — a component rendered in isolation,
// in a test or a story, still has words. Silent, because the alternative is a
// screen that throws rather than one that reads English.
export function useStudioLocale() {
  return useContext(StudioLocale);
}
