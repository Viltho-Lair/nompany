// nompany pricing model. Prices are MONTHLY, quoted at Tier-1 (×1.0) in SAR;
// USD is derived (≈ SAR / 3.75). Departments are priced per-functionality at
// signup; the `sar` here is the "all functionalities" price for the department,
// used as the "from" anchor on the marketing pricing page. See [[nompany-pivot]].

export const SAR_PER_USD = 3.75;

// Locale picker for the {en, ar} label objects below.
export function pick(obj: Record<string, string> | null | undefined, locale: string) {
  if (!obj) return "";
  return obj[locale] ?? obj.en ?? "";
}

// SAR → rounded USD.
export function toUsd(sar: number) {
  return Math.round(sar / SAR_PER_USD);
}

// SAR → grouped string (Western digits for price clarity in both locales).
export function fmtSar(sar: number) {
  return sar.toLocaleString("en-US");
}

// Mandatory base fee.
export const CORE = {
  sar: 750,
  name: { en: "Core platform", ar: "المنصة الأساسية" },
  desc: {
    en: "Users & roles, company settings, tasks, notifications, live chat and documentation.",
    ar: "المستخدمون والصلاحيات وإعدادات الشركة والمهام والإشعارات والدردشة والتوثيق.",
  },
};

// Capacity multipliers by active user count.
export const TIERS = [
  { mult: 1.0, name: { en: "Tier 1", ar: "الفئة 1" }, users: { en: "1–10 users", ar: "1–10 مستخدمين" } },
  { mult: 2.5, name: { en: "Tier 2", ar: "الفئة 2" }, users: { en: "11–50 users", ar: "11–50 مستخدمًا" } },
  { mult: 5.0, name: { en: "Tier 3", ar: "الفئة 3" }, users: { en: "50+ users", ar: "أكثر من 50 مستخدمًا" } },
];

// Optional departments (à-la-carte). `sar` = full-department price.
export const DEPARTMENTS = [
  {
    key: "sales", sar: 870,
    name: { en: "Sales & CRM", ar: "المبيعات وإدارة العملاء" },
    desc: { en: "Leads, tickets, clients, PO approvals and a live board.", ar: "العملاء المحتملون والتذاكر والعملاء واعتماد أوامر الشراء ولوحة مباشرة." },
  },
  {
    key: "technical", sar: 900,
    name: { en: "Technical Approvals", ar: "الاعتمادات الفنية" },
    desc: { en: "Quotation builder, RFQs, cost control and approvals.", ar: "منشئ عروض الأسعار وطلبات التسعير والتحكم بالتكلفة والاعتمادات." },
  },
  {
    key: "projects", sar: 1050,
    name: { en: "Project Management", ar: "إدارة المشاريع" },
    desc: { en: "Gantt plans, SLAs, deliveries and overtime.", ar: "خطط جانت واتفاقيات الخدمة والتسليم والعمل الإضافي." },
  },
  {
    key: "inventory", sar: 870,
    name: { en: "Inventory & AWB", ar: "المخزون وتتبّع الشحن الجوي" },
    desc: { en: "Items, stock, project sheets and shipment tracking.", ar: "الأصناف والمخزون وكشوف المشاريع وتتبّع الشحنات." },
  },
  {
    key: "hr", sar: 640,
    name: { en: "HR", ar: "الموارد البشرية" },
    desc: { en: "Employees, documents, careers and applications.", ar: "الموظفون والمستندات والوظائف وطلبات التوظيف." },
  },
  {
    key: "finance", sar: 710,
    name: { en: "Finance", ar: "المالية" },
    desc: { en: "Project ledgers, cash sheets and spend analytics.", ar: "دفاتر المشاريع وكشوف النقد وتحليلات الإنفاق." },
  },
  {
    key: "operations", sar: 510,
    name: { en: "Operations", ar: "العمليات" },
    desc: { en: "Work schedules, permit watch and live GPS tracking.", ar: "جداول العمل ومتابعة التصاريح والتتبّع المباشر بالموقع." },
  },
];

// Curated bundles, priced at a discount to the à-la-carte sum. `moduleKeys` maps
// each preset to the department keys it pre-selects in the checkout picker.
export const PRESETS = [
  {
    key: "starter", sar: 1190, popular: false,
    moduleKeys: ["sales"],
    name: { en: "Starter", ar: "البداية" },
    tagline: { en: "Light CRM to start selling.", ar: "إدارة عملاء مبسطة للبدء بالبيع." },
    includes: {
      en: ["Core platform", "Sales dashboard & pipeline", "Tickets & leads", "Clients / CRM directory"],
      ar: ["المنصة الأساسية", "لوحة المبيعات والمسار", "التذاكر والعملاء المحتملون", "دليل العملاء"],
    },
  },
  {
    key: "operations", sar: 2650, popular: true,
    moduleKeys: ["projects", "inventory", "operations"],
    name: { en: "Operations Suite", ar: "باقة العمليات" },
    tagline: { en: "Run projects, stock and the field.", ar: "أدِر المشاريع والمخزون والميدان." },
    includes: {
      en: ["Core platform", "Project Management (all)", "Inventory & AWB (all)", "Operations (all)"],
      ar: ["المنصة الأساسية", "إدارة المشاريع (كاملة)", "المخزون والشحن الجوي (كامل)", "العمليات (كاملة)"],
    },
  },
  {
    key: "full", sar: 5040, popular: false,
    moduleKeys: ["sales", "technical", "projects", "inventory", "hr", "finance", "operations"],
    name: { en: "Full Suite", ar: "الباقة الكاملة" },
    tagline: { en: "The entire ERP, every department.", ar: "النظام الكامل، كل الأقسام." },
    includes: {
      en: ["Core platform", "All 7 departments", "Every functionality", "Priority support"],
      ar: ["المنصة الأساسية", "جميع الأقسام السبعة", "كل الوظائف", "دعم ذو أولوية"],
    },
  },
];

export const ALL_DEPARTMENT_KEYS = DEPARTMENTS.map((d) => d.key);

// Seat (employee/login) cap for a company's chosen package. An unset/unknown
// package falls back to the free Micro tier; the Large tier (maxUsers null) is
// unlimited. Used to gate adding/joining a studio ("company is full").
export function seatLimitForPackage(packageKey: string | null | undefined) {
  const plan = PLANS.find((p) => p.key === packageKey) || PLANS.find((p) => p.key === "micro");
  return plan && plan.maxUsers != null ? plan.maxUsers : Infinity;
}

// The "Most Popular" PLAN (headcount package), computed from ACTUAL subscribers:
// the package each company chose at signup (company.packageKey, set from the
// pricing "Get Started" flow). Returns the most-chosen plan key, or null when no
// subscriber has a recorded package yet (callers fall back to the hardcoded flag).
export function mostPopularPlanKey(companies: { status?: string; packageKey?: string }[] | null | undefined) {
  const counts: Record<string, number> = {};
  for (const c of companies || []) {
    if (!c || c.status === "canceled") continue;
    if (c.packageKey) counts[c.packageKey] = (counts[c.packageKey] || 0) + 1;
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (Number(n) > bestN) { best = k; bestN = Number(n); }
  }
  return best;
}

// Compute the monthly plan total: (Core + selected departments) × tier multiplier.
// `moduleKeys` are department keys (Core is always included). Returns SAR amounts
// plus USD. Pure + client-safe, so the picker can show a live total.
export function computePlan(moduleKeys: string[] = [], tierMult: number = 1) {
  const keys = Array.isArray(moduleKeys) ? moduleKeys : [];
  const selected = DEPARTMENTS.filter((d) => keys.includes(d.key));
  const subtotal = CORE.sar + selected.reduce((sum, d) => sum + d.sar, 0);
  const total = Math.round(subtotal * (Number(tierMult) || 1));
  return { subtotal, total, usd: toUsd(total), moduleCount: selected.length };
}

// Resolve a tier multiplier from its index (0/1/2) safely.
export function tierMultByIndex(i: number) {
  return TIERS[i]?.mult ?? 1;
}

// ---- Per-employee subscription plans (public /pricing page) ----------------
// A simpler headcount-based model shown on the marketing pricing page. Prices
// are SAR per EMPLOYEE / month and INCLUDE 15% VAT. Each plan caps how many
// employees a company can add; the monthly "cap" = max seats × per-seat rate.
// Yearly billing is 15% cheaper than monthly (applied after VAT).
// NB: distinct from the à-la-carte CORE/DEPARTMENTS model above, which still
// drives the in-app /subscribe checkout — the two are not yet reconciled.
export const VAT_RATE = 0.15;
export const YEARLY_DISCOUNT = 0.15;

// Four EU SME tiers. Small + Medium are single cards with a headcount SLIDER;
// the per-employee rate steps up across bands and the card shows the TOTAL
// monthly price for the chosen count. Micro is free; Large is invoiced at
// month-end by actual headcount (no fixed price shown).
// ---- what a headcount plan is ----------------------------------------------
/** One price band: everybody up to `upTo` employees pays `rate` each. */
export type PlanBand = { upTo: number; rate: number; label: string };

/**
 * A HEADCOUNT PACKAGE from the public pricing page. Distinct from the in-app
 * à-la-carte model above: this is what a company chooses at signup, and it is
 * what `seatLimitForPackage` gates a studio on.
 *
 * `bands` is absent on the free tier, which has no per-employee rate to step.
 */
export type Plan = {
  key: string;
  free?: boolean;
  minUsers: number;
  /** null on the largest tier, which is unlimited. */
  maxUsers: number | null;
  defaultUsers?: number;
  bands?: PlanBand[];
  /** The top tier bills on headcount after the fact rather than on a band. */
  invoicedMonthly?: boolean;
  unlimited?: boolean;
  name: Record<string, string>;
  tagline: Record<string, string>;
  users: Record<string, string>;
  cta: string;
  popular?: boolean;
  features: Record<string, string[]>;
};

export const PLANS: Plan[] = [
  {
    key: "micro",
    free: true, minUsers: 1, maxUsers: 9,
    name: { en: "Micro", ar: "متناهية الصغر" },
    tagline: { en: "Micro-businesses — fewer than 10 employees.", ar: "المنشآت متناهية الصغر — أقل من 10 موظفين." },
    users: { en: "1–9 users", ar: "1–9 مستخدمين" },
    cta: "start",
    features: {
      en: ["Full platform — every department", "Up to 9 employees", "English & Arabic, RTL-ready", "Community support"],
      ar: ["المنصة كاملة — كل الأقسام", "حتى 9 موظفين", "عربي وإنجليزي، يدعم RTL", "دعم عبر المجتمع"],
    },
  },
  {
    key: "small",
    minUsers: 10, maxUsers: 49, defaultUsers: 15,
    bands: [{ upTo: 25, rate: 150, label: "10–25" }, { upTo: 49, rate: 175, label: "26–49" }],
    name: { en: "Small", ar: "صغيرة" },
    tagline: { en: "Small companies — 10 to 49 employees.", ar: "الشركات الصغيرة — من 10 إلى 49 موظفًا." },
    users: { en: "10–49 users", ar: "10–49 مستخدمًا" },
    cta: "choose",
    features: {
      en: ["Everything in Micro", "10–49 employees", "Priced by your team size", "Priority email support"],
      ar: ["كل ما في متناهية الصغر", "من 10 إلى 49 موظفًا", "التسعير حسب حجم فريقك", "دعم بريدي ذو أولوية"],
    },
  },
  {
    key: "medium",
    minUsers: 50, maxUsers: 249, defaultUsers: 75, popular: true,
    bands: [{ upTo: 99, rate: 200, label: "50–99" }, { upTo: 249, rate: 225, label: "100–249" }],
    name: { en: "Medium", ar: "متوسطة" },
    tagline: { en: "Medium-sized companies — 50 to 249 employees.", ar: "الشركات المتوسطة — من 50 إلى 249 موظفًا." },
    users: { en: "50–249 users", ar: "50–249 مستخدمًا" },
    cta: "choose",
    features: {
      en: ["Everything in Small", "50–249 employees", "Priced by your team size", "Guided onboarding"],
      ar: ["كل ما في الصغيرة", "من 50 إلى 249 موظفًا", "التسعير حسب حجم فريقك", "إعداد موجّه"],
    },
  },
  {
    key: "large",
    invoicedMonthly: true, minUsers: 250, maxUsers: null, unlimited: true,
    name: { en: "Large", ar: "كبيرة" },
    tagline: { en: "Large enterprises — 250 or more employees.", ar: "المؤسسات الكبيرة — 250 موظفًا أو أكثر." },
    users: { en: "250+ users", ar: "250+ مستخدمًا" },
    cta: "contact",
    features: {
      en: ["Everything in Medium", "Unlimited employees", "Invoiced monthly by headcount", "Dedicated support & SLA"],
      ar: ["كل ما في المتوسطة", "موظفون بلا حدود", "فاتورة شهرية حسب عدد الموظفين", "دعم مخصّص واتفاقية مستوى خدمة"],
    },
  },
];

// The per-employee SAR rate for a headcount (steps up across the plan's bands).
export function rateForCount(plan: Plan, count: number) {
  if (!Array.isArray(plan.bands) || !plan.bands.length) return 0;
  const b = plan.bands.find((x) => count <= x.upTo) || plan.bands[plan.bands.length - 1];
  return b.rate;
}

// TOTAL monthly price (SAR) for a headcount in the chosen billing period
// (yearly = 15% off) = count × per-employee rate.
export function planTotal(plan: Plan, count: number, yearly: boolean) {
  const total = rateForCount(plan, count) * count;
  return yearly ? total * (1 - YEARLY_DISCOUNT) : total;
}

// ---- Currency selection (marketing pricing page) ---------------------------
// Prices are authored in SAR; the page lets visitors view them in a few
// currencies. `rate` = units of that currency per 1 SAR (approximate, static).
// SAR/AED are USD-pegged; EUR/GBP are rough static rates flagged "approximate".
export const CURRENCIES = [
  { code: "SAR", rate: 1 },
  { code: "USD", rate: 1 / SAR_PER_USD },       // ≈ 0.2667
  { code: "AED", rate: 3.6725 / SAR_PER_USD },  // ≈ 0.9793
  { code: "EUR", rate: 1 / 4.10 },              // ≈ 0.2439
  { code: "GBP", rate: 1 / 4.80 },              // ≈ 0.2083
];

export function convertFromSar(sar: number, code: string) {
  const c = CURRENCIES.find((x) => x.code === code) || CURRENCIES[0];
  return sar * c.rate;
}

// Format an amount (already in the target currency) — SAR keeps up to 2 decimals
// like the authored prices; converted currencies round to whole units.
export function fmtCurrencyAmount(amount: number | string, code: string) {
  const digits = code === "SAR" ? 2 : 0;
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
