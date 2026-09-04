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

// KEYED BY THE AREA'S `group` FIELD, VERBATIM — platform/access/catalogue.ts,
// not by department. The P0 restructure changed several of these strings even
// where the PERMISSION keys underneath did not: Inventory and Finance keep
// their area keys but their group WIDENED to "Inventory & Warehouse" and
// "Finance & Accounting", so a dict still keyed by the old bare word would
// silently stop matching and fall back to English — the same failure mode as
// an unmapped permission key, just on a heading instead of a row. People and
// Studio settings, screens without a section before this restructure, are now
// both areas grouped under the single "Administration & Settings" (keys.ts's
// SECTION_DEFS gives it three children: members, master data, settings), so
// the two separate old groups collapse into one here too.
const groups: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    Main: "الرئيسية",
    "CRM & Sales": "المبيعات",
    "Engineering & Documents": "الهندسة والوثائق",
    Projects: "المشاريع",
    "Inventory & Warehouse": "المخزون",
    "Procurement & Subcontracting": "المشتريات",
    "Human Resources": "الموارد البشرية",
    "Finance & Accounting": "المالية",
    "Field Operations & Service": "العمليات الميدانية",
    "Logistics & Fleet": "اللوجستيات",
    "Quality & HSE": "الجودة والسلامة",
    "Administration & Settings": "الإدارة والإعدادات",
    Tasks: "المهام",
  },
};

// Keyed by the AREA KEY, not by the English label: two areas both called
// "Settings" are different rows on the grid and may not be the same word.
const areas: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "crmSales.dashboard": "لوحة المبيعات",
    "engineeringDocs.dashboard": "اللوحة الفنية",
    "projects.dashboard": "لوحة المشاريع",
    "inventory.dashboard": "لوحة المخزون",
    "hr.dashboard": "لوحة الموارد البشرية",
    "finance.dashboard": "لوحة المالية",
    "fieldService.dashboard": "الشاشة الرئيسية",
    "qualityHse.dashboard": "لوحة الجودة",
    "crmSales.pipeline": "مسار الصفقات",
    "crmSales.tickets": "التذاكر",
    "crmSales.clients": "العملاء",
    "crmSales.live": "العرض المباشر",
    "crmSales.settings": "الإعدادات",
    "engineeringDocs.rfq": "طلبات عروض الأسعار",
    "crmSales.quotations": "عروض الأسعار",
    "crmSales.contracts": "العقود",
    "engineeringDocs.live": "العرض المباشر",
    "engineeringDocs.settings": "الإعدادات",
    "projects.list": "المشاريع",
    "projects.sla": "اتفاقيات مستوى الخدمة",
    "projects.overtimes": "الساعات الإضافية",
    "projects.settings": "الإعدادات",
    "inventory.stock": "المخزون",
    "procurement.suppliers": "المورّدون",
    "inventory.items": "الأصناف المسجّلة",
    "inventory.sheets": "أوراق المشاريع",
    "logistics.shipments": "تتبّع بوالص الشحن",
    "hr.employees": "الموظفون",
    "hr.vacations": "الإجازات",
    "finance.cash": "النقد",
    "finance.ledger": "دفتر الأستاذ",
    "finance.payables": "الذمم الدائنة",
    "finance.assets": "الأصول الثابتة",
    "finance.settings": "الإعدادات",
    "fieldService.schedule": "الجدول",
    "fieldService.tracking": "التتبّع",
    "fieldService.settings": "الإعدادات",
    "projects.planner": "المخطِّط",
    "engineeringDocs.register": "الوثائق",
    "tasks.board": "لوحة المهام",
    "tasks.settings": "الإعدادات",
    "administration.members": "الأشخاص",
    "administration.access": "الأدوار والصلاحيات",
    "administration.master": "البيانات الأساسية",
    "administration.settings": "إعدادات الاستوديو",
    engagements: "الارتباطات",
  },
};

// Keyed by `<area>.<extra>` so `approve` under HR and `approve` under Finance
// stay two different sentences.
const extras: Record<Locale, Record<string, string>> = {
  en: {},
  ar: {
    "engineeringDocs.rfq.convert": "التحويل إلى عرض سعر",
    "crmSales.quotations.lock": "القفل الدائم",
    "crmSales.quotations.unlock": "فتح عرض سعر مقفل",
    "hr.employees.salary": "الاطلاع على الأجر والراتب",
    "hr.vacations.approve": "اعتماد الطلبات",
    "finance.ledger.post": "ترحيل القيود",
    "finance.ledger.reverse": "عكس القيود",
    "finance.payables.approve": "اعتماد الفواتير",
    "finance.payables.pay": "تسجيل المدفوعات",
    "finance.payables.approveHigh": "اعتماد الفواتير فوق الحد",
    "finance.assets.dispose": "استبعاد أصل",
    "engineeringDocs.register.review": "التوقيع كمراجع",
    "engineeringDocs.register.approve": "التوقيع كمعتمد",
    "engineeringDocs.register.publish": "إصدار مراجعة",
    "engineeringDocs.register.obsolete": "سحب وثيقة",
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
