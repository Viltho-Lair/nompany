import { defaultLocale, type Locale } from "@/shared/locale";

// THE PRODUCT SHOWCASE'S COPY — the tour, the record's journey, the language
// switch and the live charts on the home page, and the screens /platform reuses.
//
// WHAT EVERY PICTURE IS, said in words. The screens are real captures of the
// product, taken by scripts/screenshots.mjs from an INVENTED company — Qimam
// Contracting & Trading — built in the sandbox through the product's own
// services. The site says so under every one (`sampleNote`), because a visitor
// has no other way to know the figures in them are not anybody's real business.
//
// NO FIGURE IS STATED HERE. A number in a caption would be a claim, and claims
// live in the register (claims.ts) with a source; the screens carry their own
// numbers, and those are the sample company's.

type Screen = { title: string; body: string };

type TourStrings = {
  sampleNote: string;
  heroAlt: string;
  tourEyebrow: string;
  tourTitle: string;
  tourLead: string;
  tabs: { sales: string; projects: string; supply: string };
  screens: Record<string, Screen>;
  pause: string;
  play: string;
  journeyEyebrow: string;
  journeyTitle: string;
  journeyLead: string;
  journey: { key: string; dept: string; label: string; ref: string }[];
  languageEyebrow: string;
  languageTitle: string;
  languageLead: string;
  languageHandle: string;
  english: string;
  arabic: string;
  chartsEyebrow: string;
  chartsTitle: string;
  chartsLead: string;
  chartsNote: string;
  chartIn: string;
  chartOut: string;
  chartPipeline: string;
  periods: { six: string; twelve: string };
  stages: string[];
};

const en: TourStrings = {
  sampleNote: "Real nompany screens, filled with an invented company's sample data.",
  heroAlt: "The nompany sales pipeline: deals in each stage with their value, weighted value and days in stage.",
  tourEyebrow: "The product, as it is",
  tourTitle: "Screens you can open today",
  tourLead: "Nothing below is a mock-up. Each picture is a screen of the product, photographed from a sample company that runs on it.",
  tabs: { sales: "Sales & pipeline", projects: "Projects & planning", supply: "Inventory & procurement" },
  screens: {
    pipeline: { title: "One board for every open deal", body: "Each stage shows what it is worth and what it is likely worth, and each deal how long it has waited there." },
    clients: { title: "Every customer in one place", body: "Contacts, sites and every deal, quotation, contract and project a customer has, on one page." },
    quotations: { title: "Quotations priced from your own catalogue", body: "Lines come from registered items at the customer's agreed rate, and a signed quotation opens the project." },
    projects: { title: "Every job, and how far along it is", body: "Progress comes from the plan itself, so nobody types a percentage by hand." },
    gantt: { title: "A plan with its critical path", body: "Phases, dependencies and milestones, with the chain that decides the finish date drawn in red." },
    "project-costs": { title: "What a job may cost, and what it has", body: "Budget per cost code against what has been billed and ordered, with earned value beside it." },
    stock: { title: "Stock that arrived on a purchase order", body: "On-hand quantities come from receipts, and anything under its reorder level is flagged." },
    requisitions: { title: "Requests stopped before the money is spent", body: "A requisition waits for a signature, and a larger one waits for a second person's." },
    orders: { title: "Purchase orders from order to receipt", body: "Each order shows what was ordered, what has arrived, and what is still to come." },
  },
  pause: "Pause the tour",
  play: "Play the tour",
  journeyEyebrow: "One data model",
  journeyTitle: "One record, start to finish",
  journeyLead: "A deal is not re-typed as it moves. The same record carries through each department that touches it.",
  journey: [
    { key: "lead", dept: "CRM & Sales", label: "A lead comes in", ref: "Deal" },
    { key: "quote", dept: "Quotations", label: "It is priced", ref: "Q-0001" },
    { key: "approve", dept: "Approvals", label: "It is signed off", ref: "Approved" },
    { key: "project", dept: "Projects", label: "It becomes a job", ref: "PRJ-0001" },
    { key: "buy", dept: "Procurement", label: "Materials are bought", ref: "PR-0001" },
    { key: "invoice", dept: "Finance", label: "The client is billed", ref: "Invoice" },
  ],
  languageEyebrow: "Arabic and English",
  languageTitle: "The same screen, in either language",
  languageLead: "Drag across. Arabic is laid out right to left throughout, not translated on top of an English page.",
  languageHandle: "Move to compare English and Arabic",
  english: "English",
  arabic: "العربية",
  chartsEyebrow: "The product's own charts",
  chartsTitle: "Live, not a picture",
  chartsLead: "These charts are the same components the dashboards draw with, running here on sample figures.",
  chartsNote: "Sample figures, drawn by the product's chart components.",
  chartIn: "Invoiced",
  chartOut: "Spent",
  chartPipeline: "Pipeline by stage",
  periods: { six: "6 months", twelve: "12 months" },
  stages: ["Lead", "Opportunity", "Commit", "Won"],
};

const ar: TourStrings = {
  sampleNote: "شاشات حقيقية من نومباني، معبأة ببيانات تجريبية لشركة وهمية.",
  heroAlt: "مسار الصفقات في نومباني: الصفقات في كل مرحلة مع قيمتها وقيمتها المرجحة وعدد أيامها في المرحلة.",
  tourEyebrow: "المنتج كما هو",
  tourTitle: "شاشات يمكنك فتحها اليوم",
  tourLead: "لا شيء أدناه تصميم تخيلي. كل صورة شاشة من المنتج، ملتقطة من شركة تجريبية تعمل عليه.",
  tabs: { sales: "المبيعات ومسار الصفقات", projects: "المشاريع والتخطيط", supply: "المخزون والمشتريات" },
  screens: {
    pipeline: { title: "لوحة واحدة لكل صفقة مفتوحة", body: "كل مرحلة تبين قيمتها وقيمتها المرجحة، وكل صفقة كم انتظرت فيها." },
    clients: { title: "كل عميل في مكان واحد", body: "جهات الاتصال والمواقع وكل صفقة وعرض سعر وعقد ومشروع للعميل في صفحة واحدة." },
    quotations: { title: "عروض أسعار من كتالوجك الخاص", body: "البنود من الأصناف المسجلة بسعر العميل المتفق عليه، والعرض الموقع يفتح المشروع." },
    projects: { title: "كل مشروع، وأين وصل", body: "التقدم يأتي من الخطة نفسها، فلا أحد يكتب نسبة بيده." },
    gantt: { title: "خطة بمسارها الحرج", body: "مراحل وارتباطات ومحطات، والسلسلة التي تحدد موعد الانتهاء مرسومة بالأحمر." },
    "project-costs": { title: "ما يسمح للمشروع أن يكلفه، وما كلفه", body: "الموازنة لكل رمز تكلفة مقابل ما فوتر وما طلب، والقيمة المكتسبة بجانبها." },
    stock: { title: "مخزون وصل بأمر شراء", body: "الكميات المتوفرة من الاستلامات، وكل صنف تحت حد إعادة الطلب ينبه عليه." },
    requisitions: { title: "طلبات توقف قبل صرف المال", body: "طلب الشراء ينتظر توقيعا، والطلب الأكبر ينتظر توقيع شخص ثان." },
    orders: { title: "أوامر الشراء من الطلب إلى الاستلام", body: "كل أمر يبين ما طلب وما وصل وما بقي." },
  },
  pause: "إيقاف الجولة",
  play: "تشغيل الجولة",
  journeyEyebrow: "نموذج بيانات واحد",
  journeyTitle: "سجل واحد من البداية إلى النهاية",
  journeyLead: "الصفقة لا يعاد إدخالها وهي تتنقل. السجل نفسه يمر عبر كل قسم يتعامل معه.",
  journey: [
    { key: "lead", dept: "المبيعات", label: "يصل عميل محتمل", ref: "صفقة" },
    { key: "quote", dept: "عروض الأسعار", label: "يسعر", ref: "Q-0001" },
    { key: "approve", dept: "الموافقات", label: "يعتمد", ref: "معتمد" },
    { key: "project", dept: "المشاريع", label: "يصبح مشروعا", ref: "PRJ-0001" },
    { key: "buy", dept: "المشتريات", label: "تشترى المواد", ref: "PR-0001" },
    { key: "invoice", dept: "المالية", label: "يفوتر العميل", ref: "فاتورة" },
  ],
  languageEyebrow: "العربية والإنجليزية",
  languageTitle: "الشاشة نفسها، بأي من اللغتين",
  languageLead: "اسحب عبر الصورة. العربية مرتبة من اليمين إلى اليسار في كل مكان، لا ترجمة فوق صفحة إنجليزية.",
  languageHandle: "حرك للمقارنة بين الإنجليزية والعربية",
  english: "English",
  arabic: "العربية",
  chartsEyebrow: "رسوم المنتج البيانية",
  chartsTitle: "حية، لا صورة",
  chartsLead: "هذه الرسوم هي المكونات نفسها التي ترسم بها لوحات المعلومات، تعمل هنا على أرقام تجريبية.",
  chartsNote: "أرقام تجريبية، مرسومة بمكونات الرسوم في المنتج.",
  chartIn: "المفوتر",
  chartOut: "المصروف",
  chartPipeline: "المسار حسب المرحلة",
  periods: { six: "6 أشهر", twelve: "12 شهرا" },
  stages: ["مبدئي", "فرصة", "التزام", "مكسوبة"],
};

const tour = { en, ar };

export function tourCopy(locale: string): TourStrings {
  return tour[locale as Locale] || tour[defaultLocale];
}

export type { TourStrings };
