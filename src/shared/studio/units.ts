import { defaultLocale, type Locale } from "../locale";

// THE UNIT REGISTRY'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// THE UNITS THEMSELVES ARE NOT TRANSLATED. "kg" is kg in both languages, and a
// unit a studio TYPED is data — the same rule that leaves client names, section
// names and service actions alone.

type Strings = {
  tab: string;
  lead: string;
  isDefault: string;
  add: string;
  addLabel: string;
  remove: (unit: string) => string;
  save: string;
  saving: string;
  saved: string;
};

const en: Strings = {
  tab: "Units",
  // WHAT CAN AND CANNOT BE DONE, said before somebody tries. The shipped units
  // stay because items are already measured in them.
  lead: "What you count in. Add whatever your trade uses — bags, tonnes, man hours. The units that come with the product stay, because items may already be measured in them.",
  isDefault: "default",
  add: "Add unit",
  addLabel: "New unit",
  remove: (unit) => `Remove ${unit}`,
  save: "Save units",
  saving: "Saving…",
  saved: "Saved",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الوحدات",
  lead: "وحدات القياس لديكم. أضيفوا ما يستخدمه مجالكم — أكياس، أطنان، ساعات عمل. الوحدات التي تأتي مع النظام تبقى، لأن أصنافا قد تكون مقاسة بها.",
  isDefault: "الافتراضي",
  add: "إضافة وحدة",
  addLabel: "وحدة جديدة",
  remove: (unit) => `حذف ${unit}`,
  save: "حفظ الوحدات",
  saving: "جار الحفظ…",
  saved: "حُفظ",
};

const dict = { en, ar };

export function unitsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as UnitsStrings };
