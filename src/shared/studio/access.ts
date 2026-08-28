import { defaultLocale, type Locale } from "../locale";

// THE PERMISSION CATALOGUE'S WORDS.
//
// `platform/access/catalogue` is the catalogue itself — 102 keys, their groups,
// their verbs and their extras — and it is a pure module that the resolver and
// the route wrapper both import. It has no business knowing about languages, and
// a client component already imports it, so the words live out here and are
// looked up on DISPLAY, keyed by the permission key that is stored.
//
// Same rule as section names and statuses: nothing stored changes, no golden
// response moves, and a catalogue entry with no translation renders the English
// the catalogue gave it rather than nothing at all.

const groups: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    Sales: "المبيعات",
    Technical: "القسم الفني",
    Projects: "المشاريع",
    Inventory: "المخزون",
    "Human Resources": "الموارد البشرية",
    Finance: "المالية",
    Operations: "العمليات",
    Quality: "الجودة",
    Tasks: "المهام",
    People: "الأشخاص",
    Studio: "الاستوديو",
    Engagements: "الارتباطات",
  },
};

// Keyed by the AREA KEY, not by the English label: two areas both called
// "Settings" are different rows on the grid and may not be the same word.
const areas: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "sales.dashboard": "لوحة المبيعات",
    "technical.dashboard": "اللوحة الفنية",
    "projects.dashboard": "لوحة المشاريع",
    "inventory.dashboard": "لوحة المخزون",
    "hr.dashboard": "لوحة الموارد البشرية",
    "finance.dashboard": "لوحة المالية",
    "operations.dashboard": "الشاشة الرئيسية",
    "quality.dashboard": "لوحة الجودة",
    "sales.tickets": "التذاكر",
    "sales.clients": "العملاء",
    "sales.live": "العرض المباشر",
    "sales.settings": "الإعدادات",
    "technical.rfq": "طلبات عروض الأسعار",
    "technical.quotations": "عروض الأسعار",
    "technical.live": "العرض المباشر",
    "technical.settings": "الإعدادات",
    "projects.list": "المشاريع",
    "projects.sla": "اتفاقيات مستوى الخدمة",
    "projects.overtimes": "الساعات الإضافية",
    "projects.settings": "الإعدادات",
    "inventory.stock": "المخزون",
    "inventory.vendors": "المورّدون",
    "inventory.items": "الأصناف المسجّلة",
    "inventory.sheets": "أوراق المشاريع",
    "inventory.awb": "تتبّع بوالص الشحن",
    "hr.employees": "الموظفون",
    "hr.vacations": "الإجازات",
    "finance.cash": "النقد",
    "finance.ledger": "دفتر الأستاذ",
    "finance.payables": "الذمم الدائنة",
    "finance.assets": "الأصول الثابتة",
    "finance.settings": "الإعدادات",
    "operations.schedule": "الجدول",
    "operations.tracking": "التتبّع",
    "operations.settings": "الإعدادات",
    "operations.planner": "المخطِّط",
    "quality.documents": "الوثائق",
    "tasks.board": "لوحة المهام",
    "tasks.settings": "الإعدادات",
    "people.members": "الأشخاص والصلاحيات",
    "studio.settings": "إعدادات الاستوديو",
    engagements: "الارتباطات",
  },
};

// Keyed by `<area>.<extra>` so `approve` under HR and `approve` under Finance
// stay two different sentences.
const extras: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "technical.rfq.convert": "التحويل إلى عرض سعر",
    "technical.quotations.lock": "القفل الدائم",
    "technical.quotations.unlock": "فتح عرض سعر مقفل",
    "hr.employees.salary": "الاطلاع على الأجر والراتب",
    "hr.vacations.approve": "اعتماد الطلبات",
    "finance.ledger.post": "ترحيل القيود",
    "finance.ledger.reverse": "عكس القيود",
    "finance.payables.approve": "اعتماد الفواتير",
    "finance.payables.pay": "تسجيل المدفوعات",
    "finance.assets.dispose": "استبعاد أصل",
    "quality.documents.review": "التوقيع كمراجع",
    "quality.documents.approve": "التوقيع كمعتمد",
    "quality.documents.publish": "إصدار مراجعة",
    "quality.documents.obsolete": "سحب وثيقة",
    "engagements.lock": "قفل صفقة وفتحها",
  },
};

const pick = (
  table: Record<Locale, Record<string, string>>,
  key: unknown,
  stored: string,
  locale: string,
) => table[locale as Locale]?.[key == null ? "" : String(key)] || stored;

/** A permission group's name — "Sales", "Human Resources". */
export function areaGroup(stored: string, locale: string): string {
  return pick(groups, stored, stored, locale);
}

/** One row on the access grid, keyed by its permission key. */
export function areaLabel(key: unknown, stored: string, locale: string): string {
  return pick(areas, key, stored, locale);
}

/** An extra power beside the view/create/edit/delete ladder. */
export function extraLabel(
  areaKey: unknown,
  extraKey: unknown,
  stored: string,
  locale: string,
): string {
  return pick(extras, `${areaKey}.${extraKey}`, stored, locale);
}
