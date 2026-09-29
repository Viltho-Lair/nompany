import { FIELDS_OF_WORK } from "./fieldsOfWork";
import { departmentsForField, departmentSeedProblems, type DepartmentSeed } from "./departments/starters";
import { withNeeds } from "./tradeSections";

// WHAT A COMPANY SAYS IT DOES, IN TWO LEVELS — the owner, 29/09/2026: "i want
// mine to be organized like this way", pointing at Salesforce's industries.
// Sixteen industries a visitor recognises at a glance, and inside each the
// specialisms a company actually names itself by: a studio picks a SPECIALISM
// ("MEP & specialist contractors"), never an industry alone.
//
// AND THE CONSOLE OWNS IT — the owner, the same day: "i need to control these
// industries, set in-active industries, and each industry will have its own
// profile, what sections and departments does it offer". This file is the
// BUILT-IN list and the rules; /super stores rows that replace a built-in or
// add a new industry (lib/data/industries), and a row taken away falls back to
// what is here — the same shape the ERP settings' trades already have.
//
// AN INDUSTRY'S PROFILE IS WHAT A NEW STUDIO IN IT STARTS WITH: the sections
// switched on at creation (pre-filled on the create screen, where the owner
// can still say yes or no to each) and the org chart seeded into its empty
// department register. It is a SEED: a studio's own switches and departments
// are its own from the first minute, and nothing re-applies a profile to a
// studio that exists — editing one in /super changes the next studio, never
// the last.
//
// THE 25 FIELDS OF WORK REMAIN THE TEMPLATES for what a profile does not
// decide — the service-action pool, the role library and the deal flow — all
// keyed by `studio.fieldOfWork`. Each specialism names its field, and saving a
// specialism writes both `industry` (the key chosen) and `fieldOfWork`.
//
// A STUDIO STORES THE KEY, NEVER THE NAME, and keys are published (the
// website's industry pages are addressed by them), so a key is never renamed
// — the console creates keys and does not edit them.
//
// SERVER-SIDE ONLY. A client component never imports this file: the pickers
// are handed the RESOLVED list (built-ins plus the console's rows) by the
// server, and use shared/industryPick to draw it. Importing this into a client
// would ship every built-in org chart to the browser and still show a list
// that ignores the console.

export type Specialism = {
  key: string;
  en: string;
  ar: string;
  /** The field of work whose service actions, roles and deal flow it starts from. */
  field: string;
  /** Offered to new studios. A studio that already chose it keeps it either way. */
  active: boolean;
};

export type IndustryProfile = {
  /** Root section keys a new studio starts with switched on. */
  sections: string[];
  /** The org chart seeded into a new studio's department register. */
  departments: DepartmentSeed[];
};

export type Industry = {
  key: string;
  en: string;
  ar: string;
  /** One sentence for the website's industry page, per language. */
  lead: { en: string; ar: string };
  /** Offered to new studios and shown on the website. */
  active: boolean;
  /** Refuses every change in /super until somebody unlocks it on purpose. */
  locked: boolean;
  profile: IndustryProfile;
  specialisms: Specialism[];
  /** True when this key ships in the code; false for one the console added. */
  builtIn: boolean;
};

type BuiltInSpecialism = Omit<Specialism, "active">;
type BuiltIn = { key: string; en: string; ar: string; specialisms: BuiltInSpecialism[] };

const s = (key: string, en: string, ar: string, field: string): BuiltInSpecialism => ({ key, en, ar, field });

const BUILT_IN: BuiltIn[] = [
  {
    key: "construction-real-estate", en: "Construction & Real Estate", ar: "البناء والعقارات",
    specialisms: [
      s("general-contracting", "General contracting", "المقاولات العامة", "Construction & Contracting"),
      s("mep-contracting", "MEP & specialist contractors", "مقاولات الأعمال الكهروميكانيكية والتخصصية", "Construction & Contracting"),
      s("fit-out", "Fit-out & interiors", "التشطيبات والتصميم الداخلي", "Construction & Contracting"),
      s("infrastructure", "Infrastructure & civil works", "البنية التحتية والأعمال المدنية", "Construction & Contracting"),
      s("real-estate-development", "Real estate development", "التطوير العقاري", "Real Estate & Property Development"),
      s("property-management", "Property management", "إدارة الأملاك", "Real Estate & Property Development"),
      s("engineering-consultancy", "Engineering & design consultancy", "الاستشارات الهندسية والتصميم", "Professional, Scientific & Technical Services"),
    ],
  },
  {
    key: "manufacturing", en: "Manufacturing", ar: "التصنيع",
    specialisms: [
      s("food-production", "Food & beverage production", "إنتاج الأغذية والمشروبات", "Manufacturing"),
      s("building-materials", "Building materials & metal fabrication", "مواد البناء وتشكيل المعادن", "Manufacturing"),
      s("plastics-chemicals", "Plastics, chemicals & packaging", "البلاستيك والكيماويات والتغليف", "Manufacturing"),
      s("furniture", "Furniture & wood", "الأثاث والأخشاب", "Manufacturing"),
      s("textiles", "Textiles & garments", "المنسوجات والملابس", "Manufacturing"),
      s("machinery-automation", "Machinery & industrial automation", "الآلات والأتمتة الصناعية", "Industrial Automation & Robotics"),
      s("automotive-aerospace-parts", "Automotive & aerospace parts", "قطع السيارات والطيران", "Automotive & Aerospace Manufacturing"),
    ],
  },
  {
    key: "energy-utilities", en: "Energy & Utilities", ar: "الطاقة والمرافق",
    specialisms: [
      s("oil-gas-epc", "Oil & gas services & EPC", "خدمات النفط والغاز ومشاريع EPC", "Oil, Gas & Petrochemicals (EPC)"),
      s("power-renewables", "Power & renewables", "الكهرباء والطاقة المتجددة", "Energy & Utilities (Electricity, Gas)"),
      s("utilities", "Electricity, gas & water utilities", "مرافق الكهرباء والغاز والمياه", "Energy & Utilities (Electricity, Gas)"),
      s("water-waste", "Water, sewerage & waste", "المياه والصرف الصحي والنفايات", "Water Supply, Sewerage & Waste Management"),
      s("mining", "Mining & quarrying", "التعدين والمحاجر", "Mining & Quarrying"),
    ],
  },
  {
    key: "trading-distribution", en: "Trading & Distribution", ar: "التجارة والتوزيع",
    specialisms: [
      s("general-trading", "General trading & import/export", "التجارة العامة والاستيراد والتصدير", "Wholesale & Retail Trade"),
      s("fmcg-distribution", "FMCG wholesale & distribution", "بيع وتوزيع السلع الاستهلاكية بالجملة", "Wholesale & Retail Trade"),
      s("equipment-supply", "Building materials & equipment supply", "توريد مواد البناء والمعدات", "Wholesale & Retail Trade"),
      s("medical-supply", "Medical & pharmaceutical supply", "توريد المستلزمات الطبية والأدوية", "Wholesale & Retail Trade"),
      s("car-dealers", "Car dealers & spare parts", "وكلاء السيارات وقطع الغيار", "Wholesale & Retail Trade"),
    ],
  },
  {
    key: "retail-ecommerce", en: "Retail & E-commerce", ar: "التجزئة والتجارة الإلكترونية",
    specialisms: [
      s("shops", "Shops & showrooms", "المتاجر وصالات العرض", "Wholesale & Retail Trade"),
      s("supermarkets", "Supermarkets & groceries", "الأسواق المركزية والبقالات", "Wholesale & Retail Trade"),
      s("pharmacies", "Pharmacies", "الصيدليات", "Wholesale & Retail Trade"),
      s("online-stores", "Online stores", "المتاجر الإلكترونية", "Wholesale & Retail Trade"),
      s("fashion-jewellery", "Fashion & jewellery", "الأزياء والمجوهرات", "Wholesale & Retail Trade"),
    ],
  },
  {
    key: "hospitality", en: "Hospitality & Food Service", ar: "الضيافة وخدمات الطعام",
    specialisms: [
      s("restaurants", "Restaurants & cafés", "المطاعم والمقاهي", "Hospitality & Food Services"),
      s("catering", "Catering & central kitchens", "الإعاشة والمطابخ المركزية", "Hospitality & Food Services"),
      s("hotels", "Hotels & serviced apartments", "الفنادق والشقق الفندقية", "Hospitality & Food Services"),
    ],
  },
  {
    key: "transport-logistics", en: "Transportation & Logistics", ar: "النقل والخدمات اللوجستية",
    specialisms: [
      s("freight-customs", "Freight forwarding & customs clearance", "الشحن والتخليص الجمركي", "Transportation, Logistics & Storage"),
      s("warehousing", "Warehousing & 3PL", "التخزين والخدمات اللوجستية للغير", "Transportation, Logistics & Storage"),
      s("fleet-delivery", "Fleet, delivery & courier", "الأساطيل والتوصيل والبريد السريع", "Transportation, Logistics & Storage"),
      s("travel-agencies", "Travel & tourism agencies", "وكالات السفر والسياحة", "Administrative & Support Services"),
    ],
  },
  {
    key: "healthcare", en: "Healthcare & Life Sciences", ar: "الرعاية الصحية وعلوم الحياة",
    specialisms: [
      s("clinics", "Clinics & medical centres", "العيادات والمراكز الطبية", "Healthcare & Social Services"),
      s("hospitals", "Hospitals", "المستشفيات", "Healthcare & Social Services"),
      s("laboratories", "Laboratories & diagnostics", "المختبرات والتشخيص", "Healthcare & Social Services"),
      s("pharma", "Pharma & life sciences", "الأدوية وعلوم الحياة", "Manufacturing"),
    ],
  },
  {
    key: "professional-services", en: "Professional Services", ar: "الخدمات المهنية",
    specialisms: [
      s("accounting", "Accounting & audit", "المحاسبة والتدقيق", "Professional, Scientific & Technical Services"),
      s("legal", "Legal", "المحاماة والخدمات القانونية", "Professional, Scientific & Technical Services"),
      s("management-consulting", "Management consulting", "الاستشارات الإدارية", "Management Consulting"),
      s("marketing-agencies", "Marketing & advertising agencies", "وكالات التسويق والإعلان", "Media, Publishing & Creative Production"),
      s("testing-inspection", "Testing, inspection & certification", "الفحص والتفتيش ومنح الشهادات", "Professional, Scientific & Technical Services"),
      s("recruitment-manpower", "Recruitment & manpower supply", "التوظيف وتوريد العمالة", "Administrative & Support Services"),
    ],
  },
  {
    key: "technology", en: "Technology & Communications", ar: "التقنية والاتصالات",
    specialisms: [
      s("software-it", "Software & IT services", "البرمجيات وخدمات تقنية المعلومات", "Information Technology & Software"),
      s("systems-integration", "Systems integration & hardware", "تكامل الأنظمة والأجهزة", "Information Technology & Software"),
      s("telecom", "Telecommunications", "الاتصالات", "Telecommunications"),
    ],
  },
  {
    key: "financial-services", en: "Financial Services", ar: "الخدمات المالية",
    specialisms: [
      s("banks-finance", "Banks & finance companies", "البنوك وشركات التمويل", "Financial Services & Insurance"),
      s("insurance", "Insurance & brokerage", "التأمين والوساطة", "Financial Services & Insurance"),
      s("investment", "Investment & wealth management", "الاستثمار وإدارة الثروات", "Financial Services & Insurance"),
      s("fintech", "Payments & fintech", "المدفوعات والتقنية المالية", "Financial Services & Insurance"),
    ],
  },
  {
    key: "education", en: "Education", ar: "التعليم",
    specialisms: [
      s("schools", "Schools", "المدارس", "Education & Training"),
      s("universities", "Universities & colleges", "الجامعات والكليات", "Education & Training"),
      s("training-centres", "Training centres", "مراكز التدريب", "Education & Training"),
    ],
  },
  {
    key: "media-events", en: "Media & Events", ar: "الإعلام والفعاليات",
    specialisms: [
      s("media-publishing", "Media & publishing", "الإعلام والنشر", "Media, Publishing & Creative Production"),
      s("production-studios", "Production & creative studios", "استوديوهات الإنتاج والإبداع", "Media, Publishing & Creative Production"),
      s("events", "Events, exhibitions & entertainment", "الفعاليات والمعارض والترفيه", "Arts, Entertainment & Events"),
    ],
  },
  {
    key: "facility-field-services", en: "Facility & Field Services", ar: "خدمات المرافق والخدمات الميدانية",
    specialisms: [
      s("facility-management", "Facility management & cleaning", "إدارة المرافق والنظافة", "Administrative & Support Services"),
      s("security-services", "Security services", "خدمات الحراسة والأمن", "Administrative & Support Services"),
      s("repair-workshops", "Maintenance & repair workshops", "ورش الصيانة والإصلاح", "Personal & Other Services"),
      s("personal-services", "Personal services (salons, fitness, laundry)", "الخدمات الشخصية (صالونات، لياقة، مغاسل)", "Personal & Other Services"),
    ],
  },
  {
    key: "agriculture", en: "Agriculture", ar: "الزراعة",
    specialisms: [
      s("farming", "Farming & livestock", "الزراعة والثروة الحيوانية", "Agriculture, Forestry & Fishing"),
      s("fisheries", "Fisheries", "مصائد الأسماك", "Agriculture, Forestry & Fishing"),
      s("agri-trading", "Agri-trading", "تجارة المنتجات الزراعية", "Agriculture, Forestry & Fishing"),
    ],
  },
  {
    key: "public-nonprofit", en: "Public Sector & Nonprofit", ar: "القطاع العام والقطاع غير الربحي",
    specialisms: [
      s("government", "Government entities", "الجهات الحكومية", "Public Administration & Defense"),
      s("nonprofits", "Nonprofits & charities", "المنظمات غير الربحية والجمعيات الخيرية", "Healthcare & Social Services"),
    ],
  },
];

// The website's sentence per industry. EVERY NOUN IN ONE NAMES SOMETHING THE
// PRODUCT DOES TODAY — a department or a register that exists.
const LEADS_EN: Record<string, string> = {
    "construction-real-estate": "From the tender to the handover: bills of quantities, project budgets and costs, procurement and subcontractors, and the site, on one record.",
    manufacturing: "Production planned against orders and stock, work orders on the shop floor, quality checks and the cost of what you make, beside sales, purchasing and finance.",
    "energy-utilities": "Projects and field crews, permits to work and inspections, and assets with their maintenance, for companies that build, run and service plant.",
    "trading-distribution": "Quotations and sales orders, purchasing from suppliers, stock across warehouses, deliveries and invoices, in one flow from order to payment.",
    "retail-ecommerce": "Tills and receipts, promotions, stock across branches, customers and what they buy, and the books that close behind them.",
    hospitality: "Point of sale, purchasing and stock for kitchens and outlets, staff shifts and payroll, and the accounts.",
    "transport-logistics": "Fleet and drivers, deliveries and dispatch, warehouses and stock, and the invoices that follow each job.",
    healthcare: "Staff, schedules and payroll, supplies and medicines in stock, equipment and its maintenance, and the finance behind them.",
    "professional-services": "Clients and proposals, projects and their costs, billing by milestone, and the people who deliver the work.",
    technology: "Deals and quotations, projects and installations in the field, hardware in stock, and support and maintenance contracts.",
    "financial-services": "Clients and relationships, approvals that need a second signature, people and payroll, and the accounts, with VAT and zakat where your country requires them.",
    education: "Staff, contracts and payroll, purchasing and assets, and the accounts.",
    "media-events": "Proposals and projects, suppliers and equipment, and billing for every job.",
    "facility-field-services": "Maintenance contracts and planned work, field jobs dispatched to crews, spare parts in stock, and the invoices that follow.",
    agriculture: "Production and stock, purchasing and sales, fleet and equipment, and the people and accounts behind them.",
    "public-nonprofit": "Budgets and approvals, purchasing through requisitions, people and payroll, and accounts that can be audited.",
};
const LEADS_AR: Record<string, string> = {
    "construction-real-estate": "من المناقصة إلى التسليم: جداول الكميات، وموازنات المشاريع وتكاليفها، والمشتريات ومقاولو الباطن، والموقع، في سجل واحد.",
    manufacturing: "إنتاج يخطط وفق الطلبات والمخزون، وأوامر عمل في أرض المصنع، وفحوص الجودة، وتكلفة ما تصنعه، إلى جانب المبيعات والمشتريات والمالية.",
    "energy-utilities": "المشاريع والفرق الميدانية، وتصاريح العمل والفحوص، والأصول وصيانتها، للشركات التي تنشئ المنشآت وتشغلها وتخدمها.",
    "trading-distribution": "عروض الأسعار وأوامر البيع، والشراء من الموردين، والمخزون في المستودعات، والتوصيل والفواتير، في مسار واحد من الطلب إلى الدفع.",
    "retail-ecommerce": "نقاط البيع والإيصالات، والعروض الترويجية، والمخزون في الفروع، والعملاء وما يشترونه، والحسابات التي تقفل خلفها.",
    hospitality: "نقاط البيع، والمشتريات والمخزون للمطابخ والمنافذ، وورديات الموظفين ورواتبهم، والحسابات.",
    "transport-logistics": "الأسطول والسائقون، والتوصيل والتوزيع، والمستودعات والمخزون، والفواتير التي تتبع كل مهمة.",
    healthcare: "الموظفون وجداولهم ورواتبهم، والمستلزمات والأدوية في المخزون، والأجهزة وصيانتها، والمالية خلفها.",
    "professional-services": "العملاء والعروض، والمشاريع وتكاليفها، والفوترة حسب المراحل، والأشخاص الذين ينجزون العمل.",
    technology: "الصفقات وعروض الأسعار، والمشاريع والتركيبات في الميدان، والأجهزة في المخزون، وعقود الدعم والصيانة.",
    "financial-services": "العملاء والعلاقات، والموافقات التي تحتاج توقيعا ثانيا، والموظفون والرواتب، والحسابات، مع ضريبة القيمة المضافة والزكاة حيث يلزم بلدك بها.",
    education: "الموظفون وعقودهم ورواتبهم، والمشتريات والأصول، والحسابات.",
    "media-events": "العروض والمشاريع، والموردون والمعدات، والفوترة لكل عمل.",
    "facility-field-services": "عقود الصيانة والأعمال المخططة، والمهام الميدانية الموزعة على الفرق، وقطع الغيار في المخزون، والفواتير التي تتبعها.",
    agriculture: "الإنتاج والمخزون، والمشتريات والمبيعات، والأسطول والمعدات، والأشخاص والحسابات خلفها.",
    "public-nonprofit": "الموازنات والموافقات، والشراء عبر طلبات الشراء، والموظفون والرواتب، وحسابات قابلة للتدقيق.",
};

// THE SECTIONS EACH BUILT-IN INDUSTRY STARTS WITH, before the back office every
// company has (`BACK_OFFICE`). CHOSEN, NOT COMPUTED — and computing was tried
// first: unioning the old trade gating across an industry's specialisms
// switched on 10 to 18 of the 18 departments everywhere, so a bank "started
// with" Point of Sale and a restaurant with Tendering. These are the few a
// company of the kind leans on first; the console edits them.
const FOCUS: Record<string, readonly string[]> = {
  "construction-real-estate": ["tendering", "projects", "engineering-docs", "procurement", "assets", "quality-hse", "finance"],
  manufacturing: ["manufacturing", "inventory", "procurement", "quality-hse", "maintenance", "crm-sales", "finance"],
  "energy-utilities": ["projects", "field-service", "assets", "maintenance", "quality-hse", "procurement", "finance"],
  "trading-distribution": ["crm-sales", "quotations", "procurement", "inventory", "logistics", "finance"],
  "retail-ecommerce": ["pos", "inventory", "crm-sales", "marketing", "finance"],
  hospitality: ["pos", "inventory", "procurement", "hr", "finance"],
  "transport-logistics": ["logistics", "inventory", "field-service", "maintenance", "finance"],
  healthcare: ["hr", "inventory", "procurement", "assets", "maintenance", "quality-hse", "finance"],
  "professional-services": ["crm-sales", "quotations", "projects", "hr", "finance"],
  technology: ["crm-sales", "quotations", "projects", "field-service", "inventory", "maintenance", "finance"],
  "financial-services": ["crm-sales", "marketing", "hr", "finance", "reports"],
  education: ["hr", "procurement", "assets", "finance", "reports"],
  "media-events": ["crm-sales", "quotations", "projects", "procurement", "logistics", "finance"],
  "facility-field-services": ["maintenance", "field-service", "inventory", "hr", "finance"],
  agriculture: ["inventory", "procurement", "crm-sales", "logistics", "assets", "finance"],
  "public-nonprofit": ["finance", "procurement", "hr", "assets", "reports"],
};

/** The part of every company: selling, people, money and the reports on them. */
export const BACK_OFFICE = ["crm-sales", "hr", "finance", "reports"] as const;

/** The field most of an industry's specialisms start from — its org chart's source. */
function primaryField(b: BuiltIn): string {
  const counts = new Map<string, number>();
  for (const sp of b.specialisms) counts.set(sp.field, (counts.get(sp.field) || 0) + 1);
  let best = b.specialisms[0]?.field || "";
  for (const sp of b.specialisms) if ((counts.get(sp.field) || 0) > (counts.get(best) || 0)) best = sp.field;
  return best;
}

function builtInIndustry(b: BuiltIn): Industry {
  return {
    key: b.key, en: b.en, ar: b.ar,
    lead: { en: LEADS_EN[b.key] || "", ar: LEADS_AR[b.key] || "" },
    active: true,
    locked: false,
    profile: {
      sections: [...withNeeds([...(FOCUS[b.key] || []), ...BACK_OFFICE])],
      departments: departmentsForField(primaryField(b)),
    },
    specialisms: b.specialisms.map((sp) => ({ ...sp, active: true })),
    builtIn: true,
  };
}

/** The built-in list, fully formed. A fresh copy every call — callers edit it. */
export function builtInIndustries(): Industry[] {
  return BUILT_IN.map(builtInIndustry);
}

export const BUILT_IN_KEYS: ReadonlySet<string> = new Set(BUILT_IN.map((b) => b.key));

// ---- cleaning and checking what the console sends --------------------------

const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const strings = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : []);

/** A key from an English name: "Oil & Gas" → "oil-gas". The console mints keys; nobody types one. */
export function keyFromName(name: string): string {
  return name.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/**
 * ONE INDUSTRY, AS STORED — a whitelist, run on the way in AND on the way out,
 * because a stored row is whatever was written by whichever version wrote it.
 */
export function cleanIndustry(raw: unknown, builtIn: boolean): Industry {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lead = (r.lead && typeof r.lead === "object" ? r.lead : {}) as Record<string, unknown>;
  const profile = (r.profile && typeof r.profile === "object" ? r.profile : {}) as Record<string, unknown>;
  const specialisms = Array.isArray(r.specialisms) ? r.specialisms : [];
  const departments = Array.isArray(profile.departments) ? profile.departments : [];
  return {
    key: text(r.key, 60),
    en: text(r.en, 80),
    ar: text(r.ar, 80),
    lead: { en: text(lead.en, 300), ar: text(lead.ar, 300) },
    active: r.active !== false,
    locked: r.locked === true,
    profile: {
      sections: [...new Set(strings(profile.sections))],
      departments: departments.map((d) => {
        const x = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
        return { name: text(x.name, 80), code: text(x.code, 12).toUpperCase(), parent: text(x.parent, 12).toUpperCase(), sectionKeys: [...new Set(strings(x.sectionKeys))] };
      }),
    },
    specialisms: specialisms.map((sp) => {
      const x = (sp && typeof sp === "object" ? sp : {}) as Record<string, unknown>;
      return { key: text(x.key, 60), en: text(x.en, 120), ar: text(x.ar, 120), field: text(x.field, 120), active: x.active !== false };
    }),
    builtIn,
  };
}

/**
 * WHAT IS WRONG WITH ONE INDUSTRY, as a list of codes the console translates.
 * `rootKeys` are the sections a profile may switch on (the product's root
 * departments); `allSectionKeys` is every section a department may point at,
 * Administration included; `others` is the rest of the
 * catalogue, because a specialism key must be unique across ALL industries — a
 * studio stores the specialism alone, and two industries sharing one would
 * make which industry a studio is in a coin toss.
 */
export function industryProblems(
  ind: Industry,
  rootKeys: readonly string[],
  allSectionKeys: readonly string[],
  others: readonly Industry[],
): string[] {
  const out: string[] = [];
  if (!KEY_RE.test(ind.key)) out.push("key");
  if (!ind.en || !ind.ar) out.push("name");
  if (!ind.specialisms.length) out.push("no-specialisms");
  const taken = new Set(others.filter((o) => o.key !== ind.key).flatMap((o) => o.specialisms.map((sp) => sp.key)));
  const seen = new Set<string>();
  for (const sp of ind.specialisms) {
    if (!KEY_RE.test(sp.key)) out.push(`specialism-key:${sp.key}`);
    else if (seen.has(sp.key) || taken.has(sp.key) || sp.key === ind.key) out.push(`specialism-taken:${sp.key}`);
    seen.add(sp.key);
    if (!sp.en || !sp.ar) out.push(`specialism-name:${sp.key}`);
    if (!FIELDS_OF_WORK.includes(sp.field)) out.push(`specialism-field:${sp.key}`);
  }
  if (!ind.profile.sections.length) out.push("no-sections");
  for (const k of ind.profile.sections) if (!rootKeys.includes(k)) out.push(`section:${k}`);
  if (!ind.profile.departments.length) out.push("no-departments");
  for (const p of departmentSeedProblems(allSectionKeys, { [ind.key]: ind.profile.departments })) out.push(`department:${p}`);
  return [...new Set(out)];
}

/**
 * THE CATALOGUE: built-ins in their order, each replaced by the console's row
 * of the same key when there is one, then the industries the console added.
 */
export function mergeIndustries(stored: readonly unknown[]): Industry[] {
  const rows = stored.map((r) => cleanIndustry(r, false)).filter((r) => r.key);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const merged = builtInIndustries().map((b) => (byKey.has(b.key) ? { ...(byKey.get(b.key) as Industry), builtIn: true } : b));
  return [...merged, ...rows.filter((r) => !BUILT_IN_KEYS.has(r.key))];
}
