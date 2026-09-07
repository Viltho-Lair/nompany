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
// IT SAYS WHERE THE COMPANY IS BY SAYING THERE IS NOWHERE YET. That is a real
// answer to a question buyers ask, and the alternative is what the site did
// before: assert a Riyadh address in the Organization schema, machine-readable,
// on every page, for a company that has never been there.

type AboutStrings = {
  title: string;
  lead: string;
  whatHeading: string;
  whatBody: string;
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
    "nompany is an ERP: one place for sales, tendering, projects, engineering documents, procurement, inventory, field operations, logistics, people and finance, with a single data model underneath so a quotation can become a contract, a project and an invoice without being typed out four times. It is built for small and medium companies across the region, in Arabic and English, and it is free until you are ten people.",
  whereHeading: "Where we are",
  whereBody:
    "Nowhere, yet — and we would rather say so than imply otherwise. The company is not incorporated and has no registered office; it will be based in Jordan. We serve the region rather than a single country, the product ships in Arabic and English with genuine right-to-left throughout, and every price is quoted in SAR with VAT included. When there is an address, it will be on this page.",
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
    "نومباني نظام تخطيط موارد: مكان واحد للمبيعات والمناقصات والمشاريع والوثائق الهندسية والمشتريات والمخزون والعمليات الميدانية والخدمات اللوجستية والموارد البشرية والمالية، بنموذج بيانات واحد تحته، فيصبح عرض السعر عقدا ومشروعا وفاتورة دون ان يكتب اربع مرات. مبني للشركات الصغيرة والمتوسطة في المنطقة، بالعربية والإنجليزية، ومجاني حتى تصبحوا عشرة.",
  whereHeading: "اين نحن",
  whereBody:
    "في لا مكان بعد، ونفضل قول ذلك على التلميح بغيره. الشركة غير مسجلة ولا مقر رسمي لها، وستتخذ من الاردن مقرا. نخدم المنطقة لا بلدا واحدا، والمنتج يصدر بالعربية والإنجليزية بدعم حقيقي للكتابة من اليمين الى اليسار، وكل سعر مذكور بالريال السعودي شامل الضريبة. وحين يوجد عنوان، سيكون على هذه الصفحة.",
  whyHeading: "لماذا نبنيه",
  whyBody:
    "اغلب الشركات بهذا الحجم تشغل اداة مختلفة لكل قسم، وتقضي يوما في الاسبوع في التوفيق بينها — والتوفيق عمل غير مرئي لا ينتج شيئا. والمسائل المهمة هي الوصلات: كم كلفت المناقصة مقابل ما انفقه المشروع، وما طلب مقابل ما وصل، وما وعد به مقابل ما فوتر. ولا يجيب عن اي منها برنامج لا يحمل الا طرفا واحدا.",
  contactHeading: "التواصل",
  contactLead: "كلا العنوانين يصل الى شخص، والرد يأتي من شخص.",
};

const about = { en, ar };

export function aboutCopy(locale: string): AboutStrings {
  return about[locale as Locale] || about[defaultLocale];
}

export type { AboutStrings };
