import { defaultLocale, type Locale } from "@/shared/locale";

// THE INDUSTRIES PAGES' WORDS (29/09/2026). The industries and specialisms
// themselves are NOT here: they are the product's own list
// (shared/industryCatalogue), the one a company picks from when it creates a
// studio, so the site cannot offer an industry the product does not know.
// What lives here is the page chrome alone: each industry's sentence and the
// departments it starts with are ITS OWN, kept on the industry and edited in
// /super (shared/industryCatalogue holds the built-in ones).

type IndustriesStrings = {
  title: string;
  lead: string;
  eyebrow: string;
  specialismsTitle: string;
  departmentsTitle: string;
  departmentsLead: string;
  explore: string;
  all: string;
  start: string;
  contact: string;
  closing: string;
  count: (n: number) => string;
};

const en: IndustriesStrings = {
  title: "Industries",
  lead: "One ERP, set up for the way your kind of company works. Pick your industry and your specialism, and your studio starts with the departments that fit it.",
  eyebrow: "Industry",
  specialismsTitle: "Who it is for",
  departmentsTitle: "The departments you start with",
  departmentsLead: "A new studio in this industry opens with these switched on. Every plan carries every department: add any of the others when you create your studio, or later in its settings.",
  explore: "Explore",
  all: "All industries",
  start: "Start free",
  contact: "Talk to us",
  closing: "Your industry is not a template you are locked into: change your specialism later and your studio adjusts.",
  count: (n) => (n === 1 ? "1 specialism" : `${n} specialisms`),
};

const ar: IndustriesStrings = {
  title: "المجالات",
  lead: "نظام تخطيط موارد واحد، مهيأ لطريقة عمل شركتك. اختر مجالك وتخصصك، ليبدأ الاستوديو بالأقسام التي تناسبه.",
  eyebrow: "المجال",
  specialismsTitle: "لمن هو",
  departmentsTitle: "الأقسام التي تبدأ بها",
  departmentsLead: "يفتح الاستوديو الجديد في هذا المجال وهذه الأقسام مفعلة. وكل خطة تحمل كل الأقسام: أضف أيا من الأقسام الأخرى عند إنشاء الاستوديو، أو لاحقا من إعداداته.",
  explore: "استكشف",
  all: "كل المجالات",
  start: "ابدأ مجانا",
  contact: "تحدث إلينا",
  closing: "مجالك ليس قالبا تقيد به: غير تخصصك لاحقا ويتكيف الاستوديو معه.",
  count: (n) => (n === 1 ? "تخصص واحد" : n === 2 ? "تخصصان" : n <= 10 ? `${n} تخصصات` : `${n} تخصصا`),
};

const industries = { en, ar };

export function industriesCopy(locale: string): IndustriesStrings {
  return industries[locale as Locale] || industries[defaultLocale];
}

export type { IndustriesStrings };
