import { defaultLocale, type Locale } from "./locale";

// THE MARKETING SITE — the landing page, its sections, the pricing and contact views, the top nav and the footer.
//
// Generated from the page's own copy and then translated by hand. It does NOT
// spread the studio's `common` dictionary: that vocabulary belongs to a record
// system, and a marketing page shares none of it.

type Strings = {
  allSystemsOk: string;
  approve: string;
  cashFlow: string;
  cityRowEmea: string;
  company: string;
  contactEyebrow: string;
  contactLead: string;
  contactSales: string;
  createStudio: string;
  errCompany: string;
  errEmail: string;
  errMessage: string;
  errName: string;
  footerTagline: string;
  fullName: string;
  goStudio: string;
  goToAccount: string;
  language: string;
  loadingPrices: string;
  logIn: string;
  margin: string;
  moduleHealth: string;
  nompanyHome: string;
  nothingMatches: string;
  novaNompanyAiAssistant: string;
  orders: string;
  payrollRunScheduled: string;
  po4821Approved: string;
  pvAs1Body: string;
  pvAs1Title: string;
  pvAs2Body: string;
  pvAs2Title: string;
  pvAs3Body: string;
  pvAs3Title: string;
  pvBandText: string;
  pvBandTitle: string;
  pvBilledYearly: string;
  pvCurrency: string;
  pvEmployees: string;
  pvEyebrow: string;
  pvFreeNote: string;
  pvFreePrice: string;
  pvGetStarted: string;
  pvIncludes: string;
  pvInvoicedMonthly: string;
  pvInvoicedNote: string;
  pvLead: string;
  pvMonthly: string;
  pvMostPopular: string;
  pvNoPackages: string;
  pvPerMaxUsers: string;
  pvTitle: string;
  pvYearly: string;
  sales: string;
  searchCodeNameCountry: string;
  searchCurrencies: string;
  seePricing: string;
  selected: string;
  sendAnother: string;
  signOut: string;
  startFree: string;
  startFreeNow: string;
  stockReorderTriggered: string;
  support: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  thisQuarter: string;
  whatRunningToday: string;
  workEmail: string;
  yourAccount: string;
};

const en: Strings = {
  // NOT AN UPTIME CLAIM. This read "All systems operational", which is a
  // statement about the SERVICE and nothing measures it — the security page
  // says so in as many words ("no uptime figure — nothing measures one, so none
  // is quoted") and the footer's green status dot was deleted for exactly this.
  // It arrived as the replacement for "96.4% forecast accuracy this quarter"
  // (see the note at its call site), so one fabricated claim was swapped for a
  // quieter one. What is true of a department on this card is that it is built,
  // which is what the home page already claims of all fourteen.
  allSystemsOk: "Built and running",
  approve: "Approve",
  cashFlow: "Cash flow",
  cityRowEmea: "Amsterdam · Riyadh",
  company: "Company",
  contactEyebrow: "Contact",
  contactLead: "45 minutes, your data model on screen, no slide deck. We'll tell you honestly if Nompany isn't the right fit.",
  contactSales: "Contact Sales",
  createStudio: "Create your studio",
  errCompany: "Company name required.",
  errEmail: "Enter a valid work email.",
  errMessage: "A sentence or two about your stack helps us prepare.",
  errName: "Tell us who to ask for.",
  footerTagline: "The operating system for your enterprise. One ledger, every department, in real time.",
  fullName: "Full name",
  goStudio: "Go to Studio",
  goToAccount: "Go to account",
  language: "Language",
  loadingPrices: "Loading prices…",
  logIn: "Log in",
  margin: "Margin",
  moduleHealth: "Module health",
  nompanyHome: "nompany home",
  nothingMatches: "Nothing matches that.",
  novaNompanyAiAssistant: "Nova, the nompany AI assistant",
  orders: "Orders",
  payrollRunScheduled: "Payroll run scheduled",
  po4821Approved: "PO-4821 approved",
  pvAs1Body: "Every department is switched on from the free tier up. You pay for team size, not for modules.",
  pvAs1Title: "The whole platform, every plan",
  pvAs2Body: "Micro is free forever for up to 9 employees — English and Arabic, RTL-ready, no card required.",
  pvAs2Title: "Free under ten people",
  pvAs3Body: "Switch to yearly billing and the discount comes off every plan. Companies of 250+ are invoiced monthly on actual headcount instead.",
  pvAs3Title: "Pay yearly, pay less",
  pvBandText: "Create your free account — no card required.",
  pvBandTitle: "Ready to run your company on one platform?",
  pvBilledYearly: "billed yearly",
  pvCurrency: "Currency",
  pvEmployees: "employees",
  pvEyebrow: "Pricing",
  pvFreeNote: "Always free",
  pvFreePrice: "Free",
  pvGetStarted: "Get Started",
  pvIncludes: "Includes",
  pvInvoicedMonthly: "Invoiced monthly",
  pvInvoicedNote: "Billed at the end of each month based on your number of employees.",
  pvLead: "Priced by your team size — start free for up to 9 users, then choose the plan that fits your headcount. Every plan includes the full platform.",
  pvMonthly: "Monthly",
  pvMostPopular: "Most popular",
  pvNoPackages: "No packages are published yet.",
  pvPerMaxUsers: "for up to {n} users / month",
  pvTitle: "Pricing that scales with your team",
  pvYearly: "Yearly",
  sales: "Sales",
  searchCodeNameCountry: "Search code, name or country",
  searchCurrencies: "Search currencies",
  seePricing: "See pricing",
  selected: "Selected",
  sendAnother: "Send another request",
  signOut: "Sign out",
  startFree: "Start Free",
  startFreeNow: "Start free now",
  stockReorderTriggered: "Stock reorder triggered",
  support: "Support",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  themeSystem: "System",
  thisQuarter: "this quarter",
  whatRunningToday: "What are you running today?",
  workEmail: "Work email",
  yourAccount: "Your account",
};

const ar: Strings = {
  allSystemsOk: "مبني ويعمل",
  approve: "اعتماد",
  cashFlow: "التدفق النقدي",
  cityRowEmea: "أمستردام · الرياض",
  company: "الشركة",
  contactEyebrow: "تواصل معنا",
  contactLead: "خمس وأربعون دقيقة، ونموذج بياناتك على الشاشة، بلا عرض شرائح. وسنخبرك بصراحة إن لم يكن nompany مناسبا لك.",
  contactSales: "تواصل مع المبيعات",
  createStudio: "أنشئ استوديوك",
  errCompany: "اسم الشركة مطلوب.",
  errEmail: "أدخل بريد عمل صالحا.",
  errMessage: "جملة أو اثنتان عن أنظمتك الحالية تساعداننا على الاستعداد.",
  errName: "أخبرنا بمن نسأل عنه.",
  footerTagline: "نظام التشغيل لمؤسستك. سجل واحد، وكل قسم، في الوقت الفعلي.",
  fullName: "الاسم الكامل",
  goStudio: "اذهب إلى الاستوديو",
  goToAccount: "الذهاب إلى الحساب",
  language: "اللغة",
  loadingPrices: "جار تحميل الأسعار…",
  logIn: "تسجيل الدخول",
  margin: "الهامش",
  moduleHealth: "حالة الوحدات",
  nompanyHome: "الصفحة الرئيسية لـ nompany",
  nothingMatches: "لا شيء يطابق ذلك.",
  novaNompanyAiAssistant: "نوفا، مساعد nompany الذكي",
  orders: "الطلبات",
  payrollRunScheduled: "جدولت دورة الرواتب",
  po4821Approved: "اعتمد أمر الشراء PO-4821",
  pvAs1Body: "كل قسم مفعل من الخطة المجانية فما فوق. تدفع مقابل حجم الفريق، لا مقابل الوحدات.",
  pvAs1Title: "المنصة كاملة، في كل خطة",
  pvAs2Body: "خطة مايكرو مجانية دائما حتى تسعة موظفين — بالعربية والإنجليزية، وبدعم كامل للاتجاهين، وبلا بطاقة.",
  pvAs2Title: "مجاني تحت العشرة",
  pvAs3Body: "انتقل إلى الفوترة السنوية ليطبق الخصم على كل خطة. أما الشركات التي تتجاوز 250 موظفا فتفوتر شهريا على العدد الفعلي.",
  pvAs3Title: "ادفع سنويا، وادفع أقل",
  pvBandText: "أنشئ حسابك المجاني — بلا بطاقة.",
  pvBandTitle: "جاهز لإدارة شركتك على منصة واحدة؟",
  pvBilledYearly: "يفوتر سنويا",
  pvCurrency: "العملة",
  pvEmployees: "موظفا",
  pvEyebrow: "الأسعار",
  pvFreeNote: "مجاني دائما",
  pvFreePrice: "مجاني",
  pvGetStarted: "ابدأ الآن",
  pvIncludes: "يشمل",
  pvInvoicedMonthly: "فاتورة شهرية",
  pvInvoicedNote: "تحتسب الفاتورة في نهاية كل شهر بحسب عدد موظفيك.",
  pvLead: "السعر بحسب حجم فريقك — ابدأ مجانا حتى تسعة مستخدمين، ثم اختر الخطة التي تناسب عدد موظفيك. وكل خطة تشمل المنصة كاملة.",
  pvMonthly: "شهري",
  pvMostPopular: "الأكثر اختيارا",
  pvNoPackages: "لم تنشر أي باقات بعد.",
  pvPerMaxUsers: "حتى {n} مستخدما / شهريا",
  pvTitle: "أسعار تنمو مع فريقك",
  pvYearly: "سنوي",
  sales: "المبيعات",
  searchCodeNameCountry: "ابحث بالرمز أو الاسم أو الدولة",
  searchCurrencies: "ابحث في العملات",
  seePricing: "اطلع على الأسعار",
  selected: "المحدد",
  sendAnother: "أرسل طلبا آخر",
  signOut: "تسجيل الخروج",
  startFree: "ابدأ مجانا",
  startFreeNow: "ابدأ مجانا الآن",
  stockReorderTriggered: "بدأت إعادة طلب المخزون",
  support: "الدعم",
  theme: "المظهر",
  themeDark: "داكن",
  themeLight: "فاتح",
  themeSystem: "النظام",
  thisQuarter: "هذا الربع",
  whatRunningToday: "ما الذي تشغله اليوم؟",
  workEmail: "بريد العمل",
  yourAccount: "حسابك",
};

const landing = { en, ar };

export function landingDict(locale: string): Strings {
  return landing[locale as Locale] || landing[defaultLocale];
}
