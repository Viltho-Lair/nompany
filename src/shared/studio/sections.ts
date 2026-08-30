import { defaultLocale, type Locale } from "../locale";

// WHAT A SECTION IS CALLED, in the reader's language.
//
// I GOT THIS WRONG THE FIRST TIME, and the reasoning is worth keeping so nobody
// repeats it. Section names are STORED on the studio record, so they looked like
// tenant data and were left in English — which meant an Arabic studio had an
// Arabic shell wrapped around an English sidebar, on every screen.
//
// They are not tenant data. `SECTION_DEFS` in platform/db/keys defines every one
// of them — "Sales", "Tickets", "Live view" — and createStudio seeds the whole
// list; nothing in the product ever renames one (`updateSection` is only ever
// called with `settings`). So they are code, exactly like the status tokens in
// ./statuses and the stage labels in ./stages, and they translate the same way:
// on DISPLAY, keyed by the section KEY, with the stored name as the fallback.
//
// The fallback is what makes this safe to keep. If a rename ever ships, a
// studio that has renamed a section keeps its own word — the key stops matching
// nothing, it matches and is simply overridden by what the tenant typed, because
// the caller passes the stored name in. And a section added to SECTION_DEFS
// before it is added here reads as English rather than disappearing.

type SectionMap = Record<string, string>;

const ar: SectionMap = {
  main: "الرئيسية",

  sales: "المبيعات",
  "crm-sales-tickets": "التذاكر",
  "crm-sales-clients": "العملاء",
  "crm-sales-live": "العرض المباشر",
  "crm-sales-settings": "الإعدادات",

  technical: "القسم الفني",
  "crm-sales-quotations": "عروض الأسعار",
  // Kept as the initialism. An Arabic engineer says "RFQ"; the expanded
  // "طلب عرض سعر" is the right phrase in a sentence and the wrong one on a
  // sidebar row that has to stay short.
  "engineering-docs-rfq": "طلبات عروض الأسعار",
  "engineering-docs-live": "العرض المباشر",
  "engineering-docs-settings": "الإعدادات",

  projects: "المشاريع",
  "projects-list": "قائمة المشاريع",
  "projects-sla": "اتفاقيات مستوى الخدمة",
  "projects-overtimes": "الأعمال الإضافية",
  "projects-settings": "الإعدادات",

  inventory: "المخزون",
  "inventory-stock": "إدارة المخزون",
  "procurement-suppliers": "الموردون",
  "inventory-items": "الأصناف المسجّلة",
  "inventory-sheets": "كشوف المشاريع",
  "logistics-shipments": "تتبّع بوليصة الشحن",

  hr: "الموارد البشرية",
  "hr-employees": "الموظفون",

  finance: "المالية",
  "finance-cash": "النقد",
  "finance-ledger": "دفتر الأستاذ",
  "finance-payables": "الذمم الدائنة",
  "finance-assets": "الأصول",
  "finance-settings": "الإعدادات",

  operations: "العمليات",
  "field-service-schedule": "الجدول",
  "field-service-tracking": "التتبّع",
  "projects-planner": "المخطِّط",
  "field-service-settings": "الإعدادات",

  quality: "الجودة",
  "engineering-docs-register": "الوثائق",

  tasks: "المهام",
  "tasks-settings": "إعدادات المهام",
};

const maps: Partial<Record<Locale, SectionMap>> = { ar };

/** The section's name to SHOW. Falls back to the name stored on the record. */
export function sectionName(key: unknown, stored: string, locale: string): string {
  const k = key == null ? "" : String(key);
  return maps[locale as Locale]?.[k] || stored;
}
