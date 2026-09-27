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
//   1. Marketing pages only. `SiteShell` mounts it (it was `MarketingShell`
//      until the site was rebuilt, 27/09/2026); the sign-in pages, the account
//      hub, the studio and the console never do, so a tenant's slug, record ids
//      and screens never reach Google. AND ONLY THE PAGES THE PRIVACY POLICY
//      NAMES (`ANALYTICS_PATHS`): the rebuilt shell also wraps the terms,
//      privacy and cookie pages, which that sentence does not list, so the tag
//      is switched off there rather than the policy quietly becoming untrue.
//      (The blog joined the list with policy 1.4, 27/09/2026.)
//   2. Nothing loads before "Accept". Decline, or no answer, means no request
//      to Google at all — not a cookieless ping, nothing.
//   3. The live host only. A sandbox, a preview deployment or localhost would
//      otherwise report into the real property.
//   4. No advertising: Google signals and ad personalisation are switched off,
//      which is what keeps "does not build advertising profiles" true.

export const GA_MEASUREMENT_ID = "G-STL6EY8SEM";

/** Hosts that report. Anything else renders no banner and loads nothing. */
export const ANALYTICS_HOSTS = ["nompany.com", "www.nompany.com"] as const;

/**
 * Locale-relative pages Google Analytics may run on — EXACTLY the pages §9 of
 * the privacy policy names ("the home, platform, pricing, security, about,
 * contact, customers, careers and blog pages" — the blog since policy 1.4,
 * 27/09/2026). Widening this list without widening
 * that sentence makes the policy false; tests/marketing-model.mjs holds the two
 * together.
 */
export const ANALYTICS_PATHS = ["", "/platform", "/pricing", "/security", "/about", "/contact", "/customers", "/careers", "/blog"] as const;

/** Whether the tag may count this page. A job posting is part of careers, a post part of the blog. */
export function analyticsRunsOn(pathname: string): boolean {
  const rel = pathname.replace(/^\/(en|ar)(?=\/|$)/, "").replace(/\/$/, "");
  return (ANALYTICS_PATHS as readonly string[]).includes(rel) || rel.startsWith("/careers/") || rel.startsWith("/blog/");
}

/** `granted` or `denied`; absent means the visitor has not been asked yet. */
export const CONSENT_COOKIE = "analytics_consent";

/** Dispatched on `window` by the footer's link to reopen the choice. */
export const CONSENT_REOPEN_EVENT = "nompany:analytics-consent";

type ConsentStrings = {
  title: string;
  body: string;
  /** Kept for the old banner's readers; the banner now says acceptAll/rejectAll. */
  accept: string;
  decline: string;
  /** Footer link that reopens the choice. */
  settings: string;
  privacyLink: string;
  cookiesLink: string;
  acceptAll: string;
  rejectAll: string;
  manage: string;
  prefsTitle: string;
  prefsBody: string;
  necessaryTitle: string;
  necessaryBody: string;
  alwaysOn: string;
  analyticsTitle: string;
  analyticsBody: string;
  save: string;
  close: string;
};

const en: ConsentStrings = {
  title: "Analytics cookies",
  body: "With your permission we use Google Analytics on these public pages to count visits and see which pages are read. It never runs inside the product, and nothing is used for advertising.",
  accept: "Accept",
  decline: "Decline",
  settings: "Cookie settings",
  privacyLink: "Privacy policy",
  cookiesLink: "Cookie policy",
  acceptAll: "Accept all",
  rejectAll: "Reject all",
  manage: "Manage preferences",
  prefsTitle: "Cookie preferences",
  prefsBody: "Choose which cookies we may use on these public pages. You can change this at any time from Cookie settings in the footer.",
  necessaryTitle: "Strictly necessary",
  necessaryBody: "Needed for the site to work: remembering your language and this choice, and keeping you signed in. These cannot be turned off.",
  alwaysOn: "Always on",
  analyticsTitle: "Analytics",
  analyticsBody: "Google Analytics counts visits and shows which pages are read. It never runs inside the product and is never used for advertising.",
  save: "Save preferences",
  close: "Close",
};

const ar: ConsentStrings = {
  title: "ملفات تعريف الارتباط التحليلية",
  body: "بإذنك نستخدم Google Analytics على هذه الصفحات العامة لإحصاء الزيارات ومعرفة الصفحات الأكثر قراءة. لا يعمل أبدا داخل المنتج، ولا يستخدم أي شيء للإعلانات.",
  accept: "قبول",
  decline: "رفض",
  settings: "إعدادات ملفات تعريف الارتباط",
  privacyLink: "سياسة الخصوصية",
  cookiesLink: "سياسة ملفات تعريف الارتباط",
  acceptAll: "قبول الكل",
  rejectAll: "رفض الكل",
  manage: "إدارة التفضيلات",
  prefsTitle: "تفضيلات ملفات تعريف الارتباط",
  prefsBody: "اختر ملفات تعريف الارتباط التي يمكننا استخدامها على هذه الصفحات العامة. يمكنك تغيير ذلك في أي وقت من إعدادات ملفات تعريف الارتباط في أسفل الصفحة.",
  necessaryTitle: "ضرورية",
  necessaryBody: "يحتاجها الموقع ليعمل: تذكر لغتك وهذا الاختيار، وإبقاؤك مسجلا الدخول. لا يمكن إيقافها.",
  alwaysOn: "مفعلة دائما",
  analyticsTitle: "التحليلات",
  analyticsBody: "يحصي Google Analytics الزيارات ويبين الصفحات الأكثر قراءة. لا يعمل أبدا داخل المنتج ولا يستخدم للإعلانات.",
  save: "حفظ التفضيلات",
  close: "إغلاق",
};

const COPY: Record<Locale, ConsentStrings> = { en, ar };

export function consentCopy(locale: Locale | string = defaultLocale): ConsentStrings {
  return COPY[locale as Locale] ?? COPY[defaultLocale];
}
