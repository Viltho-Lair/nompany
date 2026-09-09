import { defaultLocale, type Locale } from "@/shared/locale";

// THE STATISTICS STRIP'S COPY — and its fallback, which is the point.
//
// THE PAGE SAYS SOMETHING TRUE ON EVERY NIGHT OF ITS LIFE. The figures come
// from a nightly aggregate that is empty today and will be small for a while,
// and "trusted by 3 companies" is worse than saying nothing — it invites the
// reader to do arithmetic nobody wanted them to do. So each slot has TWO
// answers: a product fact that is true regardless of how many people use the
// product, and a figure that replaces it once the figure is worth stating.
//
// THE SWITCH IS AUTOMATIC IN ONE DIRECTION ONLY. `showsFigure` turns a slot on
// when the count clears its threshold; nothing turns it off again, because
// nothing here goes down — and if it ever did, a page quietly reverting to
// "fifteen departments" is a better failure than one advertising a number that
// fell. Nobody has to remember to switch it on, and nobody can switch it on
// early, which is the whole reason the threshold lives in code rather than in
// somebody's judgement.

type StatsStrings = {
  heading: string;
  /** Shown until a figure clears its threshold. Each is independently true, and
   *  each must say something the rest of its page does not — a "166 currencies"
   *  line lived here until it turned out to repeat the platform page's own
   *  foundation list two screens further up. */
  factDepartments: string;
  factFree: string;
  factBilingual: string;
  /** Shown once the count is worth stating. `{n}` is the rounded figure. */
  figureStudios: string;
  figurePeople: string;
  figureRecords: string;
  /** How the figures are qualified, so a rounded number is not read as exact. */
  note: string;
};

const en: StatsStrings = {
  heading: "Where it stands",
  factDepartments: "Fourteen departments on one data model, every one of them open today.",
  factFree: "Free for teams of up to nine people, with no time limit.",
  factBilingual: "Arabic and English throughout, with real right-to-left — not a translation layer.",
  figureStudios: "{n}+ companies run their work on it.",
  figurePeople: "{n}+ people use it at work.",
  figureRecords: "{n}+ records held across every department.",
  note: "Figures are rounded down and rebuilt nightly, so they are never larger than the truth — only older.",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: StatsStrings = {
  heading: "أين وصلنا",
  factDepartments: "أربعة عشر قسما على نموذج بيانات واحد، وكلها مفتوحة اليوم.",
  factFree: "مجاني للفرق حتى تسعة أشخاص، بلا حد زمني.",
  factBilingual: "بالعربية والإنجليزية بالكامل، بدعم حقيقي للكتابة من اليمين إلى اليسار — لا طبقة ترجمة.",
  figureStudios: "أكثر من {n} شركة تدير عملها عليه.",
  figurePeople: "أكثر من {n} شخص يستخدمونه في عملهم.",
  figureRecords: "أكثر من {n} سجل عبر كل الأقسام.",
  note: "الأرقام مقربة إلى الأسفل ويعاد بناؤها ليلا، فهي لا تكون أكبر من الحقيقة أبدا — بل أقدم منها فقط.",
};

const stats = { en, ar };

export function statsCopy(locale: string): StatsStrings {
  return stats[locale as Locale] || stats[defaultLocale];
}

/** Substitute the one placeholder these strings carry. */
export function withFigure(template: string, n: number): string {
  // WESTERN DIGITS IN BOTH LOCALES. `ar-EG` would render Arabic-Indic numerals,
  // which appear nowhere else in this product — prices, dates and every studio
  // figure are Western — so an Arabic reader would meet one number shaped
  // differently from all the others on the same page. The locale is therefore
  // deliberately not a parameter here: there is nothing for it to decide.
  return template.replace("{n}", new Intl.NumberFormat("en-GB").format(n));
}

export type { StatsStrings };
