import { defaultLocale, type Locale } from "@/shared/locale";

// THE INDUSTRIES PAGES' WORDS (29/09/2026). The industries and specialisms
// themselves are NOT here: they are the product's own list
// (shared/industryCatalogue), the one a company picks from when it creates a
// studio, so the site cannot offer an industry the product does not know.
// What lives here is the page copy and one sentence per industry.
//
// EVERY LEAD NAMES ONLY WHAT THE PRODUCT DOES TODAY — each noun in it is a
// department or a register that exists (tenders and bills of quantities, work
// orders, tills, permits to work, maintenance contracts, milestone billing).
//
// THE DEPARTMENTS EACH INDUSTRY LEANS ON ARE CHOSEN, NOT COMPUTED — and it was
// tried the other way first. Unioning the create-studio suggestion across an
// industry's specialisms listed 10 to 18 of the 18 departments everywhere: a
// bank "started with" Point of Sale and a restaurant with Tendering, because
// the trade gating switches very little off. True of the product, and useless
// to a visitor. So FOCUS names the few departments a company of this kind uses
// first, by section KEY; the names are the product's own (liveDepartments),
// and the model test refuses a key that is not a live department.

type IndustriesStrings = {
  title: string;
  lead: string;
  eyebrow: string;
  specialismsTitle: string;
  departmentsTitle: string;
  departmentsLead: string;
  explore: string;
  all: string;
  start: string;
  contact: string;
  closing: string;
  count: (n: number) => string;
  leads: Record<string, string>;
};

const en: IndustriesStrings = {
  title: "Industries",
  lead: "One ERP, set up for the way your kind of company works. Pick your industry and your specialism, and your studio starts with the departments that fit it.",
  eyebrow: "Industry",
  specialismsTitle: "Who it is for",
  departmentsTitle: "The departments at the heart of it",
  departmentsLead: "Every plan carries every department. These are the ones a company like yours leans on first, and you choose which to switch on when you create your studio.",
  explore: "Explore",
  all: "All industries",
  start: "Start free",
  contact: "Talk to us",
  closing: "Your industry is not a template you are locked into: change your specialism later and your studio adjusts.",
  count: (n) => (n === 1 ? "1 specialism" : `${n} specialisms`),
  leads: {
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
  },
};

const ar: IndustriesStrings = {
  title: "المجالات",
  lead: "نظام تخطيط موارد واحد، مهيأ لطريقة عمل شركتك. اختر مجالك وتخصصك، ليبدأ الاستوديو بالأقسام التي تناسبه.",
  eyebrow: "المجال",
  specialismsTitle: "لمن هو",
  departmentsTitle: "الأقسام الأساسية فيه",
  departmentsLead: "كل خطة تحمل كل الأقسام. وهذه هي الأقسام التي تعتمد عليها شركة مثل شركتك أولا، وتختار ما تفعله منها عند إنشاء الاستوديو.",
  explore: "استكشف",
  all: "كل المجالات",
  start: "ابدأ مجانا",
  contact: "تحدث إلينا",
  closing: "مجالك ليس قالبا تقيد به: غير تخصصك لاحقا ويتكيف الاستوديو معه.",
  count: (n) => (n === 1 ? "تخصص واحد" : n === 2 ? "تخصصان" : n <= 10 ? `${n} تخصصات` : `${n} تخصصا`),
  leads: {
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
  },
};

export const FOCUS: Readonly<Record<string, readonly string[]>> = {
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

const industries = { en, ar };

export function industriesCopy(locale: string): IndustriesStrings {
  return industries[locale as Locale] || industries[defaultLocale];
}

export type { IndustriesStrings };
