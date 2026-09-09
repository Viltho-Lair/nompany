import { defaultLocale, type Locale } from "../locale";

// MANPOWER PLANNING'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// ROLE NAMES AND PROJECT NAMES ARE NOT TRANSLATED — both are typed by a studio.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  day: string;
  nothingPlanned: string;
  role: string;
  needed: string;
  have: string;
  gap: string;
  ahead: string;
  thePlan: string;
  noLines: string;
  project: string;
  from: string;
  to: string;
  add: string;
  cancel: string;
  remove: string;
  short: (n: number) => string;
  spare: (n: number) => string;
  shortFrom: (n: number, day: string) => string;
  problem: (code: string) => string;
};

const en: Strings = {
  tab: "Manpower",
  title: "What the work needs",
  lead: "How many people each project wants, against how many hold the role. A plan is a demand, not an assignment — it does not decide who goes.",
  day: "On",
  nothingPlanned: "Nothing planned for this day.",
  role: "Role",
  needed: "Needed",
  have: "Hold the role",
  gap: "Gap",
  ahead: "Coming up",
  thePlan: "The plan",
  noLines: "No plan lines yet.",
  project: "Project",
  from: "From",
  to: "To",
  add: "Add a plan line",
  cancel: "Cancel",
  remove: "Remove",
  // TWO WORDS FOR TWO FACTS: one is a hiring decision, the other a reassignment.
  short: (n) => `${n} short`,
  spare: (n) => `${n} spare`,
  shortFrom: (n, day) => `${n} short from ${day}`,
  problem: (code) => (
    code === "role" ? "That role no longer exists."
      : code === "project" ? "That project no longer exists."
        : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "القوى العاملة",
  title: "ما يحتاجه العمل",
  lead: "كم شخصا يحتاج كل مشروع، مقابل عدد من يحملون الدور. الخطة طلب وليست تكليفا — لا تقرر من يذهب.",
  day: "بتاريخ",
  nothingPlanned: "لا يوجد تخطيط لهذا اليوم.",
  role: "الدور",
  needed: "المطلوب",
  have: "يحملون الدور",
  gap: "الفجوة",
  ahead: "قادم",
  thePlan: "الخطة",
  noLines: "لا توجد سطور خطة بعد.",
  project: "المشروع",
  from: "من",
  to: "الى",
  add: "إضافة سطر",
  cancel: "الغاء",
  remove: "حذف",
  short: (n) => `نقص ${n}`,
  spare: (n) => `فائض ${n}`,
  shortFrom: (n, day) => `نقص ${n} اعتبارا من ${day}`,
  problem: (code) => (
    code === "role" ? "هذا الدور لم يعد موجودا."
      : code === "project" ? "هذا المشروع لم يعد موجودا."
        : code || ""),
};

const dict = { en, ar };

export function manpowerDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ManpowerStrings };
