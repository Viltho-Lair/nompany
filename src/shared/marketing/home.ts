import { defaultLocale, type Locale } from "@/shared/locale";

// THE HOME PAGE'S COPY.
//
// WHAT IT REPLACED, because the list is the reason this module is careful.
// Everything below the hero was invented. `HowItWorks` described point-of-sale
// and bank feeds streaming into a ledger through "180+ connectors" — there are
// no integrations at all. `Features` offered multi-entity finance consolidating
// "40 legal entities, 12 currencies", "sub-second queries", SSO/SCIM, and an
// automation engine where "an agent drafts the workflow for you". `SmartInsights`
// forecast. The closing band promised an "average implementation: 38 days" and a
// "dedicated migration engineer" for a product that has never been implemented.
//
// None of it was true, and every sentence here was written against a screen that
// exists. Where a number is stated it comes from the claims register, which names
// the module backing it and fails the build if that module stops saying so.
//
// THE STRUCTURE IS THE SPEC'S: what it is, the departments at a glance, a
// pricing teaser, a closing call to action. The featured-companies band and the
// platform-statistics row belong between the second and third of those and are
// NOT here — they need a consent path and a nightly job respectively, and both
// must degrade to nothing rather than to placeholders. A logo wall of companies
// that are not customers says less than no logo wall.

type HomeStrings = {
  whatEyebrow: string;
  whatTitle: string;
  whatBody: string;
  customersTitle: string;
  customersAll: string;
  departmentsTitle: string;
  departmentsLead: string;
  departmentsCta: string;
  pricingTitle: string;
  pricingLead: string;
  pricingCta: string;
  closingTitle: string;
  closingLead: string;
};

const en: HomeStrings = {
  whatEyebrow: "What it is",
  whatTitle: "One system, not nine that talk to each other",
  whatBody:
    "Most companies run a different tool for each department and spend their week reconciling them. nompany is one system with one data model underneath it: a quotation becomes a contract, the contract opens a project, the project raises requisitions and bills, and the same record carries through all of it. Nothing is re-typed, because there is nothing to re-type it into.",
  customersTitle: "Companies running on nompany",
  customersAll: "See them all",
  departmentsTitle: "Eleven departments, built and running",
  departmentsLead:
    "Not a roadmap. Every one of these opens onto a screen you can use today, and this list is read from the software itself rather than written here — so it cannot promise a department that does not exist.",
  departmentsCta: "See what each one does",
  pricingTitle: "Free until you are ten people",
  pricingLead:
    "The whole product, every department, for teams of one to nine. Paid plans start at ten, priced per employee per month with VAT included. No card to begin, and no call to sit through.",
  pricingCta: "See pricing",
  closingTitle: "Start with your next quotation",
  closingLead:
    "Open a studio, invite the people who need it, and give the rest their own language. There is nothing to install and nothing to migrate on day one.",
};

// HAND-WRITTEN, NEVER MACHINE-TRANSLATED — Arabic-speaking buyers detect
// translated copy immediately, and it is this site's strongest asset in this
// market. NO DIACRITICS: nobody types a kasra into a search box.
const ar: HomeStrings = {
  whatEyebrow: "ما هو",
  whatTitle: "نظام واحد، لا تسعة أنظمة تتحدث إلى بعضها",
  whatBody:
    "أغلب الشركات تشغل أداة مختلفة لكل قسم، ثم تقضي أسبوعها في المطابقة بينها. نومباني نظام واحد بنموذج بيانات واحد تحته: عرض السعر يصبح عقدا، والعقد يفتح مشروعا، والمشروع يصدر طلبات شراء وفواتير، والسجل نفسه يمر بذلك كله. لا شيء يعاد إدخاله، لأنه لا يوجد مكان آخر يعاد إدخاله فيه.",
  customersTitle: "شركات تعمل على نومباني",
  customersAll: "اطلع عليها كلها",
  departmentsTitle: "أحد عشر قسما، مبنية وتعمل",
  departmentsLead:
    "ليست خطة مستقبلية. كل قسم منها يفتح على شاشة تستطيع استخدامها اليوم، وهذه القائمة تقرأ من البرنامج نفسه لا تكتب هنا — فلا يمكنها أن تعد بقسم غير موجود.",
  departmentsCta: "اطلع على ما يفعله كل قسم",
  pricingTitle: "مجاني حتى تصبحوا عشرة",
  pricingLead:
    "المنتج كاملا، بكل أقسامه، للفرق من واحد إلى تسعة. والخطط المدفوعة تبدأ من عشرة، بسعر لكل موظف شهريا شامل ضريبة القيمة المضافة. بلا بطاقة للبدء، وبلا مكالمة تجلس فيها.",
  pricingCta: "اطلع على الأسعار",
  closingTitle: "ابدأ بعرض سعرك القادم",
  closingLead:
    "افتح مساحة عمل، وادع من يحتاجها، واترك لكل واحد لغته. لا تثبيت، ولا ترحيل بيانات في اليوم الأول.",
};

const home = { en, ar };

export function homeCopy(locale: string): HomeStrings {
  return home[locale as Locale] || home[defaultLocale];
}

export type { HomeStrings };
