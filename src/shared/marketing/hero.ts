import { defaultLocale, type Locale } from "@/shared/locale";
import { claimText } from "@/shared/marketing/claims";

// THE HERO'S COPY, one module for one surface — the studio's own convention
// (src/shared/studio/, one module per surface, and nothing enumerates them). A
// barrel over src/shared/marketing would make every page's words reachable from
// every component and the split stops paying.
//
// BOTH LOCALES ARE KEYS OF ONE TYPED OBJECT, which is the property that has kept
// this site at parity without anybody policing it: a missing Arabic string is a
// compile error rather than an English sentence on an Arabic page.
//
// WHAT LEFT WITH THE OLD COPY. `landing.ts` supplies heroBadge "Nompany 4.0 —
// now with agentic workflows": a version number that does not exist, a
// capability that does not exist, and the brand spelled with a capital. Every
// figure here is registered in ./claims and asserted against its source.

type HeroStrings = {
  badge: string;
  h1: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  footnote: string;
  marqueeLabel: string;
};

const en: HeroStrings = {
  badge: claimText("free-under-ten", "en"),
  // ONE TEXT NODE. Not two lines, not a highlighted word carved out of a
  // sentence — the component receives a string and renders a string.
  h1: "Run the whole company on one system",
  lead: "Sales, tendering, projects, procurement, inventory, field work, logistics, engineering, people and finance — sharing one data model, in Arabic and English, with every record permissioned to the row.",
  ctaPrimary: "Start free",
  ctaSecondary: "See how it works",
  footnote: claimText("paid-from-ten", "en"),
  marqueeLabel: "The departments, today",
};

// HAND-WRITTEN, NEVER MACHINE-TRANSLATED (SEO-PLAN §2.9). Arabic-speaking buyers
// detect translated copy immediately and it is this site's strongest asset in
// this market. NO DIACRITICS: the live Arabic title is `أدِر`, and nobody types
// a kasra into a search box (SEO-PLAN §1.8).
const ar: HeroStrings = {
  badge: claimText("free-under-ten", "ar"),
  h1: "أدر الشركة كلها على نظام واحد",
  lead: "المبيعات والمناقصات والمشاريع والمشتريات والمخزون والعمل الميداني والخدمات اللوجستية والهندسة والموارد البشرية والمالية — على نموذج بيانات واحد، بالعربية والإنجليزية، وكل سجل محكوم بالصلاحيات حتى مستوى الصف.",
  ctaPrimary: "ابدأ مجانا",
  ctaSecondary: "شاهد كيف يعمل",
  footnote: claimText("paid-from-ten", "ar"),
  marqueeLabel: "الأقسام، اليوم",
  // NOT "نظام واحد لـ". The tatweel form (لـ) cites the proclitic لـ IN
  // ISOLATION, the way English writes "pre-" — correct in a dictionary entry,
  // wrong on a page, because HeroV3Continuity renders the prefix in its own
  // <span> with a gap before the department name, so the لام never joins what
  // follows and displays as a detached, broken fragment. يشمل ("includes") is
  // chosen over لإدارة deliberately: لإدارة reads redundantly against "المبيعات
  // وإدارة العملاء" and awkwardly against "الإدارة والإعدادات", while يشمل is
  // grammatical and natural against all eleven department names.
};

const hero = { en, ar };

export function heroCopy(locale: string): HeroStrings {
  return hero[locale as Locale] || hero[defaultLocale];
}

export type { HeroStrings };
