// A CUSTOMER'S PHONE NUMBER, as typed at a counter — one spelling per number.
//
// THE DEFECT THIS EXISTS FOR: the till recognises a repeat customer by the
// number they give (the owner, 18/09/2026), and a number is typed four ways —
// "055 123 4567", "0551234567", "+966551234567", "00966 55 123 4567" — by
// different cashiers on different days. Recognised by the raw text, one person
// becomes four customers. So every spelling is reduced to ONE international
// form before anything is looked up or stored.
//
// PURE, and shared with the till so the screen says what will be matched.

import { COUNTRIES, codeOfCountry } from "./countries";

// Eastern Arabic (٠-٩) and Persian (۰-۹) digits are digits: an Arabic keyboard
// types them, and a number typed in them is the same number.
const toAsciiDigits = (v: string) =>
  v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/**
 * THE NUMBER IN ONE FORM: "+<country code><number>", or "" when it is not a
 * phone number (fewer than six digits, or more than fifteen — the E.164 cap).
 *
 * A number with no "+" or "00" is LOCAL: its leading trunk zeros are dropped
 * and the studio's own country code is put in front. A studio with no country
 * cannot know which country a local number is in, so the digits are kept as
 * they are, without a "+" — consistent within the studio, which is all a
 * lookup needs, and never mistaken for an international number.
 */
export function normalizePhone(raw: unknown, studioCountry?: unknown): string {
  let v = toAsciiDigits(String(raw ?? "")).trim();
  const international = v.startsWith("+") || /^00/.test(v.replace(/\D/g, ""));
  v = v.replace(/\D/g, "");
  if (international) v = v.replace(/^00/, "");
  else {
    // SIX DIGITS OF WHAT WAS TYPED, before the country code is put in front —
    // otherwise "12345" becomes a plausible eight-digit number by prefixing.
    const local = v.replace(/^0+/, "");
    if (local.length < 6) return "";
    const dial = COUNTRIES.find((c) => c.code === codeOfCountry(studioCountry))?.dial || "";
    if (dial) v = dial.slice(1) + local;
    else return v.length <= 15 ? v : "";
  }
  return v.length >= 6 && v.length <= 15 ? `+${v}` : "";
}

/** The last four digits, for a screen that must not show the whole number. */
export const maskPhone = (normalized: string): string => {
  const digits = String(normalized || "").replace(/\D/g, "");
  return digits.length >= 4 ? `···${digits.slice(-4)}` : "";
};
