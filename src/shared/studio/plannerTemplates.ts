import { defaultLocale, type Locale } from "../locale";

// THE BUILT-IN PLANNER TEMPLATES, IN THE STUDIO'S LANGUAGE.
//
// Every studio's template library is seeded once, on first load, from the six
// presets in `components/planner/lib/templates`. What is written is a STORED
// document — a plan a person then edits and renames — so it cannot be
// translated on display without overwriting their edit. It takes the studio's
// language at seed time instead, the same rule the task board's four columns
// follow.
//
// Keyed by the English string rather than by a slug, because the presets are a
// flat list of literals with no ids on their rows, and a lookup that misses
// falls through to the English it was given. That is the right failure: a row
// somebody adds to a preset appears untranslated rather than blank.
//
// NOTE FOR WHOEVER TOUCHES THE PRESETS NEXT: they are six INDUSTRY-SPECIFIC
// plans (software delivery, a construction fit-out, a marketing campaign…) and
// every studio gets all six. That is a product question, not a translation one,
// and it is flagged rather than decided here.
const ar: Record<string, string> = {
  // ---- the six presets, as the picker shows them ----
  "Blank project": "مشروع فارغ",
  "Start from an empty grid and build the WBS yourself.":
    "ابدأ من شبكة فارغة وابنِ هيكل العمل بنفسك.",
  Custom: "مخصص",
  "Software delivery": "تسليم برمجي",
  "Discovery through hardening, with a QA gate and a release milestone.":
    "من الاستكشاف حتى التثبيت، ببوابة جودة ومعلم إصدار.",
  Engineering: "الهندسة",
  "Construction / fit-out": "إنشاء / تجهيز",
  "Permit-gated build sequence with procurement lead times and handover.":
    "تسلسل بناء مقيّد بالتصاريح، مع مُهَل التوريد والتسليم.",
  "Capital works": "الأعمال الرأسمالية",
  "Campaign launch": "إطلاق حملة",
  "Creative production with a hard launch date and post-launch reporting.":
    "إنتاج إبداعي بتاريخ إطلاق ثابت وتقارير بعد الإطلاق.",
  Marketing: "التسويق",
  "Product launch (GTM)": "إطلاق منتج (الذهاب إلى السوق)",
  "Cross-functional launch: readiness workstreams converging on a launch gate.":
    "إطلاق متعدد الفرق: مسارات جاهزية تلتقي عند بوابة إطلاق.",
  Product: "المنتج",
  "Two-week sprint": "سباق أسبوعين",
  "Hour-granular sprint plan - pairs with the Working hours toggle.":
    "خطة سباق بدقة الساعة — تعمل مع مفتاح ساعات العمل.",

  // ---- software delivery ----
  Discovery: "الاستكشاف",
  "Stakeholder interviews": "مقابلات أصحاب المصلحة",
  "Requirements & acceptance criteria": "المتطلبات ومعايير القبول",
  "Technical spike": "استطلاع تقني",
  "Scope signed off": "اعتماد النطاق",
  Design: "التصميم",
  "Information architecture": "معمارية المعلومات",
  "High-fidelity screens": "شاشات عالية الدقة",
  "Design system updates": "تحديثات نظام التصميم",
  Build: "البناء",
  "Data model & migrations": "نموذج البيانات والترحيلات",
  "API endpoints": "نقاط الواجهة البرمجية",
  "Front-end implementation": "تنفيذ الواجهة الأمامية",
  "Auth refactor": "إعادة هيكلة المصادقة",
  "CI/CD pipeline": "خط التكامل والنشر",
  "Code review": "مراجعة الشيفرة",
  "Quality & release": "الجودة والإصدار",
  "Test plan": "خطة الاختبار",
  "QA sweep": "جولة ضمان الجودة",
  "Bug fix & hardening": "إصلاح العلل والتثبيت",
  "Regression pass": "جولة انحدار",
  "Go live": "الانطلاق",

  // ---- construction / fit-out ----
  "Pre-construction": "ما قبل الإنشاء",
  "Site survey": "مسح الموقع",
  "Concept drawings": "الرسومات المبدئية",
  "Permit submission": "تقديم التصاريح",
  "Permit approval window": "مهلة اعتماد التصاريح",
  "Permit granted": "صدور التصريح",
  Procurement: "المشتريات",
  "Tender package": "حزمة المناقصة",
  "Contractor selection": "اختيار المقاول",
  "Long-lead material order": "طلب المواد طويلة التوريد",
  Construction: "الإنشاء",
  "Site mobilisation": "تجهيز الموقع",
  "Demolition & strip-out": "الهدم والتفكيك",
  "MEP first fix": "التمديدات الأولى",
  "Partitions & ceilings": "القواطع والأسقف",
  "Second fix & finishes": "التمديدات الثانية والتشطيبات",
  "Systems commissioning": "تشغيل الأنظمة",
  Snagging: "معالجة الملاحظات",
  "Practical completion": "الإنجاز العملي",
  "Commissioning & handover": "التشغيل والتسليم",
  "Client walkthrough": "جولة العميل",

  // ---- campaign launch ----
  Strategy: "الاستراتيجية",
  "Audience research": "بحث الجمهور",
  "Messaging framework": "إطار الرسائل",
  "Channel & budget plan": "خطة القنوات والميزانية",
  "Creative production": "الإنتاج الإبداعي",
  "Key visual concepts": "المفاهيم البصرية الأساسية",
  "Localised ad creative": "إعلانات مُوطَّنة",
  "Landing page build": "بناء صفحة الهبوط",
  "Copy & legal review": "مراجعة النص والشؤون القانونية",
  Launch: "الإطلاق",
  "Media buying setup": "إعداد شراء الوسائط",
  "Campaign live": "الحملة على الهواء",
  "Performance monitoring": "متابعة الأداء",
  "Results readout": "قراءة النتائج",

  // ---- product launch (GTM) ----
  "Launch readiness": "جاهزية الإطلاق",
  "Pricing system changes": "تغييرات نظام التسعير",
  "Beta programme": "برنامج النسخة التجريبية",
  "Docs & help centre": "الوثائق ومركز المساعدة",
  "Go to market": "الذهاب إلى السوق",
  "Positioning & pricing": "التموضع والتسعير",
  "Sales deck & battlecards": "عرض المبيعات وبطاقات المنافسة",
  "Press & analyst briefing": "إحاطة الصحافة والمحللين",
  Enablement: "التمكين",
  "Internal training": "التدريب الداخلي",
  "Support runbooks": "أدلة تشغيل الدعم",
  "Launch gate": "بوابة الإطلاق",

  // ---- two-week sprint ----
  "Sprint 24": "السباق 24",
  "Sprint planning": "تخطيط السباق",
  "Settings screen": "شاشة الإعدادات",
  "Empty states polish": "تحسين الحالات الفارغة",
  "QA across devices": "ضمان الجودة عبر الأجهزة",
  "Production cutover": "التحويل إلى الإنتاج",
  "Day-1 monitoring": "مراقبة اليوم الأول",
  "Sprint review": "مراجعة السباق",
  Retrospective: "الاستعادة",

  // ---- the blank row ----
  "New task": "مهمة جديدة",
};

const words: Record<Locale, Record<string, string>> = { en: {}, ar };

/**
 * The studio's words for one preset string. Unknown strings — and English
 * studios, whose map is deliberately empty — get back what they passed in.
 */
export function templateWord(locale: string, english: string): string {
  const map = words[locale as Locale] ?? words[defaultLocale];
  return map[english] ?? english;
}
