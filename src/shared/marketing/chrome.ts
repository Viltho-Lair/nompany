import { defaultLocale, type Locale } from "@/shared/locale";

// THE MARKETING CHROME'S OWN WORDS — the nav and the closing call to action.
//
// WHY THIS MODULE EXISTS, and it is a measurement rather than a preference.
// `TopNav` needed eleven strings and `CtaBand` four, and both read them from
// `shared/landing` — the whole marketing site's copy, both locales, 31.5 KB.
// The nav is on every public page, so that module was reachable from every
// marketing route, and the bundler put a COPY of it in more than one chunk
// group: the contact route's unique chunk alone carried 19.6 KB gz of which
// most was that dictionary, duplicated. It is the failure this repository has
// already recorded once with date-fns — two groups reaching one module by
// different paths get a copy each.
//
// Fifteen strings, so the chrome no longer drags a dictionary behind it.

type ChromeStrings = {
  goToAccount: string;
  language: string;
  logIn: string;
  nompanyHome: string;
  signOut: string;
  startFree: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  yourAccount: string;
  createStudio: string;
  goStudio: string;
  seePricing: string;
  startFreeNow: string;
};

const en: ChromeStrings = {
  goToAccount: "Go to account",
  language: "Language",
  logIn: "Log in",
  nompanyHome: "nompany home",
  signOut: "Sign out",
  startFree: "Start Free",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  themeSystem: "System",
  yourAccount: "Your account",
  createStudio: "Create your studio",
  goStudio: "Go to Studio",
  seePricing: "See pricing",
  startFreeNow: "Start free now",
};

const ar: ChromeStrings = {
  goToAccount: "الذهاب إلى الحساب",
  language: "اللغة",
  logIn: "تسجيل الدخول",
  nompanyHome: "الصفحة الرئيسية لـ nompany",
  signOut: "تسجيل الخروج",
  startFree: "ابدأ مجانا",
  theme: "المظهر",
  themeDark: "داكن",
  themeLight: "فاتح",
  themeSystem: "النظام",
  yourAccount: "حسابك",
  createStudio: "أنشئ استوديوك",
  goStudio: "اذهب إلى الاستوديو",
  seePricing: "اطلع على الأسعار",
  startFreeNow: "ابدأ مجانا الآن",
};

const chrome = { en, ar };

export function chromeCopy(locale: string): ChromeStrings {
  return chrome[locale as Locale] || chrome[defaultLocale];
}

export type { ChromeStrings };
