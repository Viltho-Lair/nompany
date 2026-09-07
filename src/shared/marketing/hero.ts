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
  /** V3's rotating line reads `<prefix> <department> <suffix>`. */
  rotatingPrefix: string;
  rotatingSuffix: string;
  /** The preview shell's own chrome — never shipped on a public page. */
  previewLabel: string;
  variantLabels: { v1: string; v2: string; v3: string };
};

const en: HeroStrings = {
  badge: claimText("free-under-ten", "en"),
  // ONE TEXT NODE. Not two lines, not a highlighted word carved out of a
  // sentence — the component receives a string and renders a string.
  h1: "Run the whole company on one system",
  lead: "Sales, tendering, projects, procurement, inventory, field work, logistics, engineering, people and finance — sharing one data model, in Arabic and English, with every record permissioned to the row.",
  ctaPrimary: "Start free",
  ctaSecondary: "See how it works",
  footnote: "Free for teams of one to nine. No card, no sales call.",
  marqueeLabel: "The departments, today",
  rotatingPrefix: "One system for",
  rotatingSuffix: "",
  previewLabel: "Hero preview — not a public page",
  variantLabels: {
    v1: "V1 · Assembly",
    v2: "V2 · Scroll reveal",
    v3: "V3 · Continuity",
  },
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
  footnote: "مجاني للفرق من واحد إلى تسعة. بدون بطاقة، وبدون مكالمة مبيعات.",
  marqueeLabel: "الأقسام، اليوم",
  rotatingPrefix: "نظام واحد لـ",
  rotatingSuffix: "",
  previewLabel: "معاينة الواجهة — ليست صفحة عامة",
  variantLabels: {
    v1: "الأول · التجميع",
    v2: "الثاني · الكشف بالتمرير",
    v3: "الثالث · الاستمرارية",
  },
};

const hero = { en, ar };

export function heroCopy(locale: string): HeroStrings {
  return hero[locale as Locale] || hero[defaultLocale];
}

export type { HeroStrings };
