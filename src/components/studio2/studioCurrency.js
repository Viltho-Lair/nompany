"use client";

import { createContext, useCallback, useContext } from "react";
import { moneyText } from "@/shared/money";

// THE STUDIO'S CURRENCY, FOR EVERY SCREEN (27/09/2026).
//
// An audit of every money figure in the studio found almost none of them in the
// studio's currency: `money(n)` was called without one on some 370 lines, so a
// Jordanian studio's figures showed two decimals and no code at all, and each
// screen that did show a code appended it by hand. The routes round with
// `studio.currency` on the server and, bar a few, never told the screen which
// currency that was.
//
// CONTEXT, NOT A MODULE VARIABLE, AND THAT IS THE WHOLE POINT. The studio's
// screens server-render with their first payload, so the currency has to be
// known during the SERVER render too — and a module variable there is shared by
// every request the process is serving, so one studio's render could print
// another's currency. `lib/format.ts`'s `configureFormat` is that shape, which
// is why it was never wired. Context is per render, on the server and in the
// browser alike, so the server's HTML and the first client render agree.
//
// Provided once, by the studio layout, from the studio record it already holds.

const StudioCurrency = createContext("");

export function StudioCurrencyProvider({ currency, children }) {
  return <StudioCurrency.Provider value={String(currency || "").trim().toUpperCase()}>{children}</StudioCurrency.Provider>;
}

/** The studio's currency code, or "" when the studio has not set one. */
export function useStudioCurrency() {
  return useContext(StudioCurrency);
}

/** An amount with its currency's decimals AND its code: "1,200.000 JOD".
 *  `currency` is the RECORD's own when it has one (a bill in euros is shown in
 *  euros); without it, the studio's. With neither — a studio that has set no
 *  currency — the bare number, rather than a guessed code. */
export function moneyWithCode(n, currency) {
  const code = String(currency || "").trim().toUpperCase();
  const text = moneyText(n, code);
  return code ? `${text} ${code}` : text;
}

/** `money(n, currency?)` for a screen: the record's currency when passed, else
 *  the studio's, always with the code. A hook because the studio's currency is
 *  context — see above. */
export function useMoney() {
  const studio = useContext(StudioCurrency);
  return useCallback((n, currency) => moneyWithCode(n, currency || studio), [studio]);
}
