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

// FIFTEEN-SECTION RESTRUCTURE (P0). The four roots this file used to key as
// BARE IDENTIFIERS — sales, technical, operations, quality — are retired:
// SECTION_KEY_MAP (platform/db/restructure.ts) renamed them to crm-sales,
// engineering-docs (technical also split off tendering, which is new and
// carries no old word), field-service and quality-hse respectively. A bare
// identifier here was invisible to tests/restructure.mjs's grep assertion,
// which only matches a QUOTED literal — the reason those four survived an
// otherwise-green sweep. Every key below is a quoted string for exactly that
// reason, except the six roots that kept their name unchanged (main,
// projects, inventory, hr, finance, tasks), which stay bare identifiers
// because nothing retired them.
//
// Children that only changed their key (their parent renamed, they did not)
// keep the word they already had — a rename is not a retranslation.
const ar: SectionMap = {
  main: "الرئيسية",

  // SALES BECAME CRM & SALES AND GAINED QUOTATIONS (keys.ts SECTION_DEFS).
  "crm-sales": "المبيعات وإدارة العملاء",
  "crm-sales-pipeline": "مسار الصفقات",
  "crm-sales-tickets": "التذاكر",
  "crm-sales-clients": "العملاء",
  "crm-sales-quotations": "عروض الأسعار",
  "crm-sales-contracts": "العقود",
  "crm-sales-live": "العرض المباشر",
  "crm-sales-settings": "الإعدادات",

  // NEW ROOT, no children yet (see keys.ts) — declared for ordering alone.
  tendering: "المناقصات والتسعير",
  "tendering-register": "سجلّ المناقصات",

  projects: "المشاريع",
  "projects-list": "قائمة المشاريع",
  "projects-sla": "اتفاقيات مستوى الخدمة",
  "projects-overtimes": "الأعمال الإضافية",
  // The planner moved here from Operations; the word travels with it.
  "projects-planner": "المخطِّط",
  "projects-settings": "الإعدادات",

  // TECHNICAL BECAME ENGINEERING & DOCUMENTS AND GAINED THE CONTROLLED
  // REGISTER (formerly Quality's Documents sub-section).
  "engineering-docs": "الهندسة والوثائق",
  "engineering-docs-register": "الوثائق",
  // Kept as the initialism. An Arabic engineer says "RFQ"; the expanded
  // "طلب عرض سعر" is the right phrase in a sentence and the wrong one on a
  // sidebar row that has to stay short.
  "engineering-docs-rfq": "طلبات عروض الأسعار",
  "engineering-docs-live": "العرض المباشر",
  "engineering-docs-settings": "الإعدادات",

  // NEW ROOT. Starts with the supplier master, carried over from Inventory's
  // former Vendors screen.
  procurement: "المشتريات والمقاولات من الباطن",
  "procurement-suppliers": "الموردون",

  inventory: "المخزون والمستودعات",
  "inventory-stock": "إدارة المخزون",
  "inventory-items": "الأصناف المسجّلة",
  "inventory-sheets": "كشوف المشاريع",

  // NEW ROOT, no children yet.
  manufacturing: "التصنيع والإنتاج",

  // OPERATIONS BECAME FIELD SERVICE once the planner (to Projects), permits
  // (to Quality & HSE) and locations (to Administration) moved out.
  "field-service": "العمليات الميدانية والخدمة",
  "field-service-schedule": "الجدول",
  "field-service-tracking": "التتبّع",
  "field-service-settings": "الإعدادات",

  // NEW ROOT. Carries the AWB tracking screen from Inventory.
  logistics: "اللوجستيات والأسطول",
  "logistics-shipments": "تتبّع بوليصة الشحن",

  // NEW ROOT, no children yet.
  assets: "الأصول والمعدات",

  // QUALITY WIDENED TO QUALITY & HSE, and keeps permits to work (formerly an
  // Operations tab). No children yet.
  "quality-hse": "الجودة والسلامة",

  hr: "الموارد البشرية",
  "hr-employees": "الموظفون",

  finance: "المالية والمحاسبة",
  "finance-cash": "النقد",
  "finance-ledger": "دفتر الأستاذ",
  "finance-payables": "الذمم الدائنة",
  "finance-assets": "الأصول",
  "finance-settings": "الإعدادات",

  // NEW ROOT, no children yet.
  reports: "التقارير وذكاء الأعمال",

  // NEW ROOT. Absorbs People and Studio settings, screens that had no
  // section before this restructure, plus the master-data (locations) tab
  // carried over from Operations. "People" and "Studio settings" match the
  // wording already used for the same rows in the permission catalogue
  // (shared/studio/access.ts's areas map) so the sidebar and the access grid
  // say the same thing for the same screen.
  administration: "الإدارة والإعدادات",
  "administration-members": "الأشخاص",
  "administration-access": "الصلاحيات",
  "administration-master": "البيانات الأساسية",
  "administration-settings": "إعدادات الاستوديو",

  tasks: "المهام",
  "tasks-settings": "إعدادات المهام",
};

const maps: Partial<Record<Locale, SectionMap>> = { ar };

/** The section's name to SHOW. Falls back to the name stored on the record. */
export function sectionName(key: unknown, stored: string, locale: string): string {
  const k = key == null ? "" : String(key);
  return maps[locale as Locale]?.[k] || stored;
}
