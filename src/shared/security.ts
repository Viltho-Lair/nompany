import { defaultLocale, type Locale } from "./locale";
import type { DeviceType } from "./deviceClass";

// THE SECURITY SURFACES' WORDS — device types, the session limit, the lock
// screen, the PIN, two-factor sign-in and the till's cashier switch. One module
// for the lot because they are read together: the account's Security page, the
// sign-in steps and the lock overlay all speak about the same few things, and
// a phrase that differs between them reads as two different features.
//
// Both locales are keys of one typed object, so a string missing from Arabic
// is a compile error rather than an English word in an Arabic session.

const en = {
  deviceType: {
    Computer: "Computer",
    Phone: "Phone",
    "Portable Device": "Portable Device",
  } as Record<DeviceType, string>,
};

const ar: typeof en = {
  deviceType: {
    Computer: "حاسوب",
    Phone: "هاتف",
    "Portable Device": "جهاز محمول",
  },
};

const dict = { en, ar } as const;

export type SecurityStrings = typeof en;

export function securityDict(locale: string): SecurityStrings {
  return dict[locale as Locale] || dict[defaultLocale];
}
