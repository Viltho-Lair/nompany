import { defaultLocale, type Locale } from "../locale";

// THE CLASSIFICATION REGISTER'S OWN WORDS. See the header of ./shell for why
// each surface keeps its own dictionary and why nothing may enumerate them.
//
// THE AXIS KEYS ARE TRANSLATED AND THE VALUES ARE NOT. An axis is the product's
// — there are exactly seven and they never change — so it has a name in both
// languages. A value is either something the product shipped or something the
// studio TYPED, and neither is translated: the same rule that leaves client
// names, section names and units alone.

type Strings = {
  tab: string;
  lead: string;
  /** Every axis. Keyed by the stored key so a missing one is a compile error. */
  axis: Record<
    "clientIndustries" | "expenseCategories" | "paymentMethods"
    | "leaveTypes" | "locationKinds" | "permitTypes" | "tenderSources"
    | "failureProblems" | "failureCauses" | "failureRemedies",
    { name: string; used: string }
  >;
  add: string;
  addLabel: (axis: string) => string;
  remove: (value: string) => string;
  removeHint: string;
  save: string;
  saving: string;
  saved: string;
};

const en: Strings = {
  tab: "Categories",
  // WHAT CAN AND CANNOT BE DONE, said before somebody tries. The shipped values
  // stay because records already name them.
  lead: "The lists the product classifies things by. Add whatever your company uses. The values that come with the product stay, because records already name them — remove one of your own and it simply stops being offered.",
  axis: {
    clientIndustries: { name: "Client industries", used: "On clients, deals and quotations" },
    expenseCategories: { name: "Expense categories", used: "On petty cash expenses" },
    paymentMethods: { name: "Payment methods", used: "On invoice and bill payments" },
    leaveTypes: { name: "Leave types", used: "On leave requests" },
    locationKinds: { name: "Location kinds", used: "On the places you work from" },
    permitTypes: { name: "Permit types", used: "On permits to work" },
    tenderSources: { name: "Tender sources", used: "On the tender register" },
    failureProblems: { name: "Failure problems", used: "What went wrong, when corrective work is completed" },
    failureCauses: { name: "Failure causes", used: "Why it went wrong, when corrective work is completed" },
    failureRemedies: { name: "Failure remedies", used: "What put it right, when corrective work is completed" },
  },
  add: "Add",
  // "Add to Client industries", not "New client industries" — every axis
  // name is plural, so "New" reads as though several are being added.
  addLabel: (axis) => `Add to ${axis}`,
  remove: (value) => `Remove ${value}`,
  // WHY REMOVING IS SAFE, said at the point somebody hesitates over it.
  removeHint: "Records that already name it keep reading correctly.",
  save: "Save lists",
  saving: "Saving…",
  saved: "Saved",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "التصنيفات",
  lead: "القوائم التي يصنف بها النظام. أضيفوا ما تستخدمه شركتكم. القيم التي تأتي مع النظام تبقى، لأن سجلات قائمة تحمل أسماءها — وحذف قيمة أضفتموها يوقف عرضها فقط.",
  axis: {
    clientIndustries: { name: "قطاعات العملاء", used: "على العملاء والصفقات وعروض الأسعار" },
    expenseCategories: { name: "أبواب المصاريف", used: "على مصاريف النثرية" },
    paymentMethods: { name: "طرق الدفع", used: "على دفعات الفواتير والذمم" },
    leaveTypes: { name: "أنواع الإجازات", used: "على طلبات الإجازة" },
    locationKinds: { name: "أنواع المواقع", used: "على أماكن العمل" },
    permitTypes: { name: "أنواع التصاريح", used: "على تصاريح العمل" },
    tenderSources: { name: "مصادر المناقصات", used: "على سجل المناقصات" },
    failureProblems: { name: "مشكلات الأعطال", used: "ما الذي تعطل، عند إنجاز العمل التصحيحي" },
    failureCauses: { name: "أسباب الأعطال", used: "لماذا تعطل، عند إنجاز العمل التصحيحي" },
    failureRemedies: { name: "معالجات الأعطال", used: "ما الذي أصلحه، عند إنجاز العمل التصحيحي" },
  },
  add: "إضافة",
  addLabel: (axis) => `إضافة إلى ${axis}`,
  remove: (value) => `حذف ${value}`,
  removeHint: "السجلات التي تحمل الاسم تبقى صحيحة.",
  save: "حفظ القوائم",
  saving: "جار الحفظ…",
  saved: "حُفظ",
};

const dict = { en, ar };

export const taxonomyDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
