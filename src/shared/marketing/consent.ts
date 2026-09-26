import { defaultLocale, type Locale } from "@/shared/locale";

// GOOGLE ANALYTICS ON THE PUBLIC SITE, AND THE CONSENT IN FRONT OF IT —
// added 26/09/2026 on the owner's instruction.
//
// UNTIL THEN THE SITE PROMISED THE OPPOSITE, in two places a careful reader
// checks: the security page said the public pages load no analytics script,
// and the privacy policy said there were no analytics cookies "which is why
// you are not asked to consent to any". Both were rewritten in the same commit
// as this file, and they now describe exactly what the code below does. If
// the behaviour here changes, those two sentences change with it.
//
// FOUR LIMITS, each of which the wording depends on:
//   1. Marketing pages only. `MarketingShell` mounts it; the sign-in pages, the
//      account hub, the studio and the console never do, so a tenant's slug,
//      record ids and screens never reach Google.
//   2. Nothing loads before "Accept". Decline, or no answer, means no request
//      to Google at all — not a cookieless ping, nothing.
//   3. The live host only. A sandbox, a preview deployment or localhost would
//      otherwise report into the real property.
//   4. No advertising: Google signals and ad personalisation are switched off,
//      which is what keeps "does not build advertising profiles" true.

export const GA_MEASUREMENT_ID = "G-STL6EY8SEM";

/** Hosts that report. Anything else renders no banner and loads nothing. */
export const ANALYTICS_HOSTS = ["nompany.com", "www.nompany.com"] as const;

/** `granted` or `denied`; absent means the visitor has not been asked yet. */
export const CONSENT_COOKIE = "analytics_consent";

/** Dispatched on `window` by the footer's link to reopen the choice. */
export const CONSENT_REOPEN_EVENT = "nompany:analytics-consent";

type ConsentStrings = {
  title: string;
  body: string;
  accept: string;
  decline: string;
  /** Footer link that reopens the choice. */
  settings: string;
  privacyLink: string;
};

const en: ConsentStrings = {
  title: "Analytics cookies",
  body: "With your permission we use Google Analytics on these public pages to count visits and see which pages are read. It never runs inside the product, and nothing is used for advertising.",
  accept: "Accept",
  decline: "Decline",
  settings: "Cookie settings",
  privacyLink: "Privacy policy",
};

const ar: ConsentStrings = {
  title: "ملفات تعريف الارتباط التحليلية",
  body: "بإذنك نستخدم Google Analytics على هذه الصفحات العامة لإحصاء الزيارات ومعرفة الصفحات الأكثر قراءة. لا يعمل أبدا داخل المنتج، ولا يستخدم أي شيء للإعلانات.",
  accept: "قبول",
  decline: "رفض",
  settings: "إعدادات ملفات تعريف الارتباط",
  privacyLink: "سياسة الخصوصية",
};

const COPY: Record<Locale, ConsentStrings> = { en, ar };

export function consentCopy(locale: Locale | string = defaultLocale): ConsentStrings {
  return COPY[locale as Locale] ?? COPY[defaultLocale];
}
