import { defaultLocale, type Locale } from "@/shared/locale";

// THE BLOG'S OWN WORDS — one module for one surface, both locales as keys of one
// typed object, so a missing Arabic string is a compile error. The posts
// themselves are data, written in /super in one language each, and are never
// translated.

type BlogStrings = {
  title: string;
  lead: string;
  all: string;
  categories: { news: string; product: string; events: string };
  empty: string;
  emptyCategory: string;
  read: string;
  minutes: (n: number) => string;
  back: string;
  more: string;
  /** The home page's strip of the newest posts. */
  latestTitle: string;
  filterLabel: string;
};

const en: BlogStrings = {
  title: "Blog",
  lead: "News from nompany, what we have added to the product, and the events we have taken part in.",
  all: "All",
  categories: { news: "News", product: "Product", events: "Events" },
  empty: "Nothing here yet. The first post is on its way.",
  emptyCategory: "Nothing in this category yet.",
  read: "Read",
  minutes: (n) => `${n} min read`,
  back: "All posts",
  more: "More from the blog",
  latestTitle: "From the blog",
  filterLabel: "Show posts about",
};

// HAND-WRITTEN, NO DIACRITICS. The minutes phrase agrees with its number the
// way Arabic counts: one minute, two minutes (dual), three to ten (plural),
// eleven and up (singular accusative).
const ar: BlogStrings = {
  title: "المدونة",
  lead: "أخبار نومباني، وما أضفناه إلى المنتج، والفعاليات التي شاركنا فيها.",
  all: "الكل",
  categories: { news: "أخبار", product: "المنتج", events: "فعاليات" },
  empty: "لا شيء هنا بعد. أول تدوينة في الطريق.",
  emptyCategory: "لا شيء في هذا التصنيف بعد.",
  read: "اقرأ",
  minutes: (n) =>
    n === 1 ? "قراءة دقيقة واحدة" : n === 2 ? "قراءة دقيقتين" : n <= 10 ? `قراءة ${n} دقائق` : `قراءة ${n} دقيقة`,
  back: "كل التدوينات",
  more: "المزيد من المدونة",
  latestTitle: "من المدونة",
  filterLabel: "اعرض التدوينات عن",
};

const blog = { en, ar };

export function blogCopy(locale: string): BlogStrings {
  return blog[locale as Locale] || blog[defaultLocale];
}

export type { BlogStrings };
