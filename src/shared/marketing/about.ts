import { defaultLocale, type Locale } from "@/shared/locale";

// THE ABOUT PAGE'S COPY — the entity home.
//
// WHAT THIS PAGE IS FOR, and it is not "company background". It is the single
// URL every external profile points back at: a directory listing, a review
// site, a knowledge panel. Those profiles are created once and are expensive to
// correct afterwards, so the description they copy has to be settled before any
// of them exists — which is why the canonical sentence lives in
// `shared/marketing/company` and is reused here verbatim rather than reworded
// for this page. A profile written from a second draft is a permanent
// inconsistency nobody can fix from here.
//
// THE DEPARTMENT LIST IS WORDS, NOT A NUMBER (23/09/2026). It named ten
// departments for a fortnight while the product grew to eighteen; it is written
// out again from SECTION_DEFS, and it names no count, for company.ts's reason.
// When a department ships, it joins this sentence in the same commit.
//
// IT SAYS WHERE THE COMPANY IS BY SAYING THERE IS NOWHERE YET. That is a real
// answer to a question buyers ask, and the alternative is what the site did
// before: assert a city address in the Organization schema, machine-readable,
// on every page, for a company that has never been there.

type AboutStrings = {
  title: string;
  lead: string;
  whatHeading: string;
  whatBody: string;
  fitHeading: string;
  fitBody: string;
  whereHeading: string;
  whereBody: string;
  whyHeading: string;
  whyBody: string;
  contactHeading: string;
  contactLead: string;
};

const en: AboutStrings = {
  title: "About nompany",
  lead: "A small company building one system for the work a company actually does.",
  whatHeading: "What we make",
  whatBody:
    "nompany is an ERP: one place for sales and quotations, tendering, projects, engineering documents, procurement, inventory, manufacturing, field service, logistics, assets and maintenance, quality and safety, people, finance, marketing, a point of sale and reporting — with a single data model underneath, so what one team enters the next one already has. It is built for small and medium companies across the region, in Arabic and English, and the first 3 months are free for teams of one to four.",
  fitHeading: "How it fits your company",
  fitBody:
    "You choose which departments you run when you set up, and your field of work fills in the first answers — a contractor starts differently from a clinic or a shop, and anything left off can be switched on later. Your org chart and the roles in it start from your own trade rather than a generic list, every right can be narrowed to a single action, and approvals follow the limits you set. Each person works in the language they choose, Arabic or English, fully right-to-left or left-to-right.",
  whereHeading: "Where we are",
  whereBody:
    "Nowhere, yet — and we would rather say so than imply otherwise. The company is not incorporated and has no registered office; it will be based in Jordan. We serve the region rather than a single country, the product ships in Arabic and English with genuine right-to-left throughout, and prices are shown in the currency you choose rather than in one country's. When there is an address, it will be on this page.",
  whyHeading: "Why we are building it",
  whyBody:
    "Most companies of this size run a different tool for each department and spend a day a week reconciling them — and the reconciling is invisible work that never makes anything. The interesting problems are the joins: what a tender costs against what the project spent, what was ordered against what arrived, what was promised against what was invoiced. None of those can be answered by software that only holds one side.",
  contactHeading: "Getting in touch",
  contactLead: "Both addresses reach a person, and a reply comes from one.",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: AboutStrings = {
  title: "عن نومباني",
  lead: "شركة صغيرة تبني نظاما واحدا للعمل الذي تقوم به الشركات فعلا.",
  whatHeading: "ما الذي نصنعه",
  whatBody:
    "نومباني نظام تخطيط موارد: مكان واحد للمبيعات وعروض الأسعار والمناقصات والمشاريع والوثائق الهندسية والمشتريات والمخزون والتصنيع والخدمة الميدانية والخدمات اللوجستية والأصول والصيانة والجودة والسلامة والموارد البشرية والمالية والتسويق ونقاط البيع والتقارير، بنموذج بيانات واحد تحته، فما يدخله فريق يجده الفريق التالي جاهزا. مبني للشركات الصغيرة والمتوسطة في المنطقة، بالعربية والإنجليزية، وأول 3 أشهر مجانا للفرق من واحد إلى أربعة.",
  fitHeading: "كيف يناسب شركتك",
  fitBody:
    "تختار الأقسام التي تعمل بها عند الإعداد، ومجال عملك يملأ الإجابات الأولى — فالمقاول يبدأ بشكل مختلف عن العيادة أو المتجر، وما تركته يمكن تفعيله لاحقا. وهيكلك التنظيمي والأدوار فيه تبدأ من مجالك لا من قائمة عامة، وكل صلاحية يمكن حصرها في إجراء واحد، والاعتمادات تتبع الحدود التي تضعها. وكل شخص يعمل باللغة التي يختارها، العربية أو الإنجليزية، من اليمين إلى اليسار أو العكس بالكامل.",
  whereHeading: "أين نحن",
  whereBody:
    "لا عنوان لنا بعد، ونفضل قول ذلك على التلميح بغيره. الشركة غير مسجلة ولا مقر رسمي لها، وستتخذ من الأردن مقرا. نخدم المنطقة لا بلدا واحدا، والمنتج يصدر بالعربية والإنجليزية بدعم حقيقي للكتابة من اليمين إلى اليسار، والأسعار تظهر بالعملة التي تختارها لا بعملة بلد بعينه. وحين يوجد عنوان، سيكون على هذه الصفحة.",
  whyHeading: "لماذا نبنيه",
  whyBody:
    "أغلب الشركات بهذا الحجم تشغل أداة مختلفة لكل قسم، وتقضي يوما في الأسبوع في المطابقة بينها — والمطابقة عمل غير مرئي لا ينتج شيئا. والمهم هو ما بين الأقسام: كم كلفت المناقصة مقابل ما أنفقه المشروع، وما طلب مقابل ما وصل، وما وعد به مقابل ما فوتر. ولا يجيب عن أي منها برنامج لا يرى إلا طرفا واحدا.",
  contactHeading: "التواصل",
  contactLead: "كلا العنوانين يصل إلى شخص، والرد يأتي من شخص.",
};

const about = { en, ar };

export function aboutCopy(locale: string): AboutStrings {
  return about[locale as Locale] || about[defaultLocale];
}

export type { AboutStrings };
