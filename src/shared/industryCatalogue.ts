import { FIELDS_OF_WORK, OTHER_FIELD } from "./fieldsOfWork";

// WHAT A COMPANY SAYS IT DOES, IN TWO LEVELS — the owner, 29/09/2026: "i want
// mine to be organized like this way", pointing at Salesforce's industries.
// Sixteen industries a visitor recognises at a glance, and inside each the
// specialisms a company actually names itself by: a studio picks a SPECIALISM
// ("MEP & specialist contractors"), never an industry alone.
//
// THE 25 FIELDS OF WORK ARE NOT REPLACED; THEY BECOME THE TEMPLATES. Everything
// that sets a studio up for its trade — the service-action matrix, the starter
// org charts, the role library, the flow templates, the sections a trade starts
// with — is keyed by a `FIELD_ACTION_MATRIX` name, and ~25 places read it from
// `studio.fieldOfWork`. Each specialism names the one field whose setup fits it
// (`field`), and saving a specialism writes BOTH: `industry` is the key the
// studio chose, `fieldOfWork` is its template. Every reader of `fieldOfWork`
// keeps working untouched, and a specialism can be given a setup of its own
// later by pointing `field` somewhere new — without a migration.
//
// A STUDIO STORES THE KEY, NEVER THE NAME. `fieldOfWork` stores an English
// display string, which is how two lists of the same twenty-five trades came to
// spell four of them differently (see platform/engagement/industries.ts). Keys
// here are published — the marketing site's industry pages are addressed by
// the industry key — so, like a section key, one is never renamed.
//
// The words are in both languages here rather than in a copy module because
// the list IS the data: the create screen, Studio settings, the alert and the
// public site all read this one array.

export type Specialism = {
  key: string;
  en: string;
  ar: string;
  /** The field of work whose setup this specialism starts from. */
  field: string;
};

export type Industry = {
  key: string;
  en: string;
  ar: string;
  specialisms: Specialism[];
};

const s = (key: string, en: string, ar: string, field: string): Specialism => ({ key, en, ar, field });

export const INDUSTRY_CATALOGUE: Industry[] = [
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

/** "Something else", with the company's own words — it seeds nothing. */
export const OTHER_INDUSTRY = "other";

const BY_KEY = new Map<string, { industry: Industry; specialism: Specialism }>();
for (const industry of INDUSTRY_CATALOGUE) {
  for (const specialism of industry.specialisms) BY_KEY.set(specialism.key, { industry, specialism });
}

export const SPECIALISM_KEYS = [...BY_KEY.keys()];

export function isIndustryKey(key: unknown): boolean {
  return key === OTHER_INDUSTRY || BY_KEY.has(String(key));
}

/** The specialism and the industry it sits in, or null. */
export function specialismOf(key: unknown) {
  return BY_KEY.get(String(key)) || null;
}

/** The field of work a chosen industry key sets the studio up from. */
export function fieldForIndustry(key: unknown): string {
  if (key === OTHER_INDUSTRY) return OTHER_FIELD;
  return BY_KEY.get(String(key))?.specialism.field || "";
}

/** A specialism's name in a language, or "" for an unknown key. */
export function industryLabel(key: unknown, locale: string): string {
  const hit = BY_KEY.get(String(key));
  if (!hit) return "";
  return locale === "ar" ? hit.specialism.ar : hit.specialism.en;
}

/**
 * STILL ON THE OLD LIST: the studio chose a field of work before the catalogue
 * existed and has not picked a specialism since. What the alert asks about.
 * A studio that chose nothing at all ("I'll set this up later") is not asked —
 * it skipped the question on purpose and Settings still offers it.
 */
export function needsIndustry(studio: object): boolean {
  const { fieldOfWork, industry } = studio as { fieldOfWork?: unknown; industry?: unknown };
  return Boolean(String(fieldOfWork || "").trim()) && !isIndustryKey(industry);
}

/**
 * The specialism to OFFER a studio still on an old field: the first one that
 * starts from the same template, so accepting the suggestion changes nothing
 * about how the studio is set up. Offered, never applied — the owner's rule:
 * "current studios will need to update their fields".
 */
export function suggestedIndustry(field: unknown): string {
  const f = String(field || "");
  if (f === OTHER_FIELD) return OTHER_INDUSTRY;
  for (const industry of INDUSTRY_CATALOGUE) {
    const hit = industry.specialisms.find((sp) => sp.field === f);
    if (hit) return hit.key;
  }
  return "";
}

/**
 * The picker's rows: every specialism under its industry's heading, then
 * "Other". `group` is what SelectMenu draws as a heading and searches as well,
 * so typing "construction" finds all seven.
 */
export function industryOptions(locale: string, otherLabel: string) {
  const ar = locale === "ar";
  return [
    ...INDUSTRY_CATALOGUE.flatMap((industry) =>
      industry.specialisms.map((sp) => ({ value: sp.key, label: ar ? sp.ar : sp.en, group: ar ? industry.ar : industry.en })),
    ),
    { value: OTHER_INDUSTRY, label: otherLabel },
  ];
}

// Every template the catalogue names must be a real field of work, or a
// specialism would set a studio up from nothing. Checked in the model test too;
// asserted here so a typo fails on import rather than at a studio's creation.
for (const sp of BY_KEY.values()) {
  if (!FIELDS_OF_WORK.includes(sp.specialism.field)) throw new Error(`industry catalogue: unknown field "${sp.specialism.field}" on ${sp.specialism.key}`);
}
