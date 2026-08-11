// Feature catalog for the public /features page. Each module lists the concrete
// functionalities it ships (grounded in the studio components / pricing model).
// Bilingual — use `pick(obj, locale)` from lib/pricing to render. See
// [[nompany-pivot]]. Module `key`s align with lib/pricing DEPARTMENTS.

// Core platform — included in every plan.
export const CORE_FEATURES = {
  name: { en: "Core platform", ar: "المنصة الأساسية" },
  tagline: { en: "Included in every plan — the foundation your whole company runs on.", ar: "مضمّنة في كل باقة — الأساس الذي تعمل عليه شركتك بالكامل." },
  items: [
    { en: "Company dashboard with live KPIs", ar: "لوحة تحكم الشركة مع مؤشرات أداء مباشرة" },
    { en: "Users, roles & granular per-feature permissions", ar: "المستخدمون والأدوار وصلاحيات دقيقة لكل ميزة" },
    { en: "Company & system settings", ar: "إعدادات الشركة والنظام" },
    { en: "Task scheduling, assignment & approvals", ar: "جدولة المهام وإسنادها واعتمادها" },
    { en: "Targeted notifications with @mentions", ar: "إشعارات موجّهة مع الإشارة @" },
    { en: "Built-in live chat inbox", ar: "صندوق دردشة مباشر مدمج" },
    { en: "Step-by-step documentation guides", ar: "أدلة إرشادية خطوة بخطوة" },
  ],
};

// Optional departments (à la carte).
export const MODULE_FEATURES = [
  {
    key: "sales",
    name: { en: "Sales & CRM", ar: "المبيعات وإدارة العملاء" },
    tagline: { en: "Capture leads, run the pipeline and close.", ar: "استقطب العملاء المحتملين وأدِر المسار وأغلق الصفقات." },
    items: [
      { en: "Sales dashboard & pipeline analytics", ar: "لوحة المبيعات وتحليلات المسار" },
      { en: "Tickets & full lead lifecycle (New → Won)", ar: "التذاكر ودورة حياة العميل المحتمل كاملة (جديد ← مكسوب)" },
      { en: "Clients / CRM directory with multiple locations", ar: "دليل العملاء مع مواقع متعددة" },
      { en: "PO submission & approval flow", ar: "تقديم أوامر الشراء ومسار اعتمادها" },
      { en: "Real-time sales board for floor screens", ar: "لوحة مبيعات لحظية لشاشات العمل" },
    ],
  },
  {
    key: "technical",
    name: { en: "Technical Approvals", ar: "الاعتمادات الفنية" },
    tagline: { en: "Quote, cost and approve with control.", ar: "سعّر واحسب التكلفة واعتمد بتحكّم كامل." },
    items: [
      { en: "Quotation Builder — multi-table with PDF export", ar: "منشئ عروض الأسعار — جداول متعددة مع تصدير PDF" },
      { en: "Quotations manager (status, versions, columns)", ar: "إدارة عروض الأسعار (الحالة والإصدارات والأعمدة)" },
      { en: "RFQ management (New → Converted)", ar: "إدارة طلبات التسعير (جديد ← محوّل)" },
      { en: "Cost visibility control per role", ar: "التحكم بإظهار التكلفة حسب الدور" },
      { en: "Real-time approvals board", ar: "لوحة اعتمادات لحظية" },
    ],
  },
  {
    key: "projects",
    name: { en: "Project Management", ar: "إدارة المشاريع" },
    tagline: { en: "Plan, schedule and deliver on time.", ar: "خطّط وجدوِل وسلّم في الوقت المحدد." },
    items: [
      { en: "Project list & lifecycle with auto-status", ar: "قائمة المشاريع ودورة حياتها مع حالة تلقائية" },
      { en: "Full-screen Gantt plan builder", ar: "منشئ خطط جانت بملء الشاشة" },
      { en: "SLA management (scheduled & emergency visits)", ar: "إدارة اتفاقيات الخدمة (زيارات مجدولة وطارئة)" },
      { en: "Logistics, stock booking & delivery notes", ar: "الخدمات اللوجستية وحجز المخزون وإشعارات التسليم" },
      { en: "Overtime tracking & export", ar: "تتبّع العمل الإضافي وتصديره" },
    ],
  },
  {
    key: "inventory",
    name: { en: "Inventory & AWB", ar: "المخزون وتتبّع الشحن الجوي" },
    tagline: { en: "Know your stock, from shelf to shipment.", ar: "اعرف مخزونك، من الرف حتى الشحنة." },
    items: [
      { en: "Registered items catalog with pricing", ar: "كتالوج أصناف مسجّلة مع التسعير" },
      { en: "Stock management with serials", ar: "إدارة المخزون بالأرقام التسلسلية" },
      { en: "Vendors / supplier directory", ar: "دليل الموردين" },
      { en: "Project sheets & stock booking", ar: "كشوف المشاريع وحجز المخزون" },
      { en: "Orders & shortfall tracking per vendor", ar: "الطلبات وتتبّع النقص لكل مورّد" },
      { en: "AWB (Air Waybill) shipment tracking", ar: "تتبّع شحنات بوليصة الشحن الجوي" },
    ],
  },
  {
    key: "hr",
    name: { en: "HR", ar: "الموارد البشرية" },
    tagline: { en: "Your people, documents and hiring in one place.", ar: "موظفوك ومستنداتك والتوظيف في مكان واحد." },
    items: [
      { en: "Employees management with encrypted PII", ar: "إدارة الموظفين مع تشفير البيانات الشخصية" },
      { en: "Document expiry watch & self-service profiles", ar: "متابعة انتهاء المستندات وملفات ذاتية للموظف" },
      { en: "Employee ↔ login account linking", ar: "ربط الموظف بحساب الدخول" },
      { en: "Public careers postings", ar: "نشر الوظائف للعامة" },
      { en: "Applications / recruitment inbox", ar: "صندوق طلبات التوظيف" },
    ],
  },
  {
    key: "finance",
    name: { en: "Finance", ar: "المالية" },
    tagline: { en: "Ledgers, cash and spend — clear and current.", ar: "الدفاتر والنقد والإنفاق — بوضوح وفي حينه." },
    items: [
      { en: "Per-project finance ledger", ar: "دفتر مالي لكل مشروع" },
      { en: "Per-user cash management sheets", ar: "كشوف نقدية لكل مستخدم" },
      { en: "Spending analytics & drill-down", ar: "تحليلات الإنفاق والتفصيل" },
      { en: "Project-number issuance", ar: "إصدار أرقام المشاريع" },
      { en: "Configurable cash categories", ar: "فئات نقدية قابلة للتخصيص" },
    ],
  },
  {
    key: "operations",
    name: { en: "Operations", ar: "العمليات" },
    tagline: { en: "Schedule the field and see it live.", ar: "جدوِل الميدان وتابعه مباشرة." },
    items: [
      { en: "Work-schedule calendar & reporting", ar: "تقويم جداول العمل والتقارير" },
      { en: "Document-expiry & permit watch", ar: "متابعة انتهاء المستندات والتصاريح" },
      { en: "Live GPS tracking & dispatch", ar: "تتبّع مباشر بالموقع والإرسال" },
      { en: "Configurable schedule legend", ar: "مفتاح جدول قابل للتخصيص" },
    ],
  },
];
