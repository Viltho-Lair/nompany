import { defaultLocale, type Locale } from "../locale";

// THE NUMBERING EDITOR'S OWN WORDS. See the header of ./shell for why each
// surface's dictionary is a separate module and why nothing may enumerate them.
//
// THE GROUP HEADINGS ARE NOT HERE. A series names the SECTION its documents
// live on, and section names come from `shared/studio/sections` — the studio's
// own dictionary — so putting them here would be a second set of names for
// fifteen things that already have one.

type Strings = {
  tab: string;
  lead: string;
  isDefault: string;
  prefixFor: (label: string) => string;
  padFor: (label: string) => string;
  save: string;
  saving: string;
  saved: string;
};

const en: Strings = {
  tab: "Numbering",
  // WHAT CHANGING ONE ACTUALLY DOES, said before somebody does it. The second
  // sentence is the one that matters: nothing is renumbered, because references
  // only move forward and the counter is keyed on the prefix.
  lead: "What your documents are called. Changing a prefix starts a new sequence from the first number — documents already issued keep the name they were issued under, and nothing is renumbered.",
  isDefault: "default",
  prefixFor: (label) => `Prefix for ${label}`,
  padFor: (label) => `Number width for ${label}`,
  save: "Save numbering",
  saving: "Saving…",
  saved: "Saved",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الترقيم",
  lead: "أسماء مستنداتكم. تغيير البادئة يبدأ تسلسلا جديدا من أول رقم — والمستندات الصادرة تحتفظ بالاسم الذي صدرت به، ولا يعاد ترقيم شيء.",
  isDefault: "الافتراضي",
  prefixFor: (label) => `بادئة ${label}`,
  padFor: (label) => `عدد خانات ${label}`,
  save: "حفظ الترقيم",
  saving: "جار الحفظ…",
  saved: "حُفظ",
};

const dict = { en, ar };

export function numberingDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as NumberingStrings };
