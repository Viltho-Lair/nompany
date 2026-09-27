import { defaultLocale, type Locale } from "@/shared/locale";

// THE COOKIE POLICY'S WORDS (27/09/2026) — one module for one surface, both
// locales as keys of one typed object.
//
// EVERY ROW IS A COOKIE THE CODE SETS, measured rather than remembered: the
// names are the constants in platform/auth (identity, oauth, otp,
// purchaseIntent, superAuth), lib/langCookie, the theme toggle and
// shared/marketing/consent. A cookie added in code and not here is a policy
// that says less than the site does; tests/marketing-model.mjs holds the
// names against those constants.
//
// Two categories, as the banner has: strictly necessary, and analytics. No
// marketing category, because nothing sets one.

export type CookieRow = { name: string; purpose: string; lifetime: string; category: "necessary" | "analytics" };

type CookieStrings = {
  title: string;
  lead: string;
  updated: string;
  whatTitle: string;
  whatBody: string;
  kindsTitle: string;
  necessaryTitle: string;
  necessaryBody: string;
  analyticsTitle: string;
  analyticsBody: string;
  tableTitle: string;
  head: { name: string; purpose: string; lifetime: string; category: string };
  categoryName: { necessary: string; analytics: string };
  rows: CookieRow[];
  manageTitle: string;
  manageBody: string;
  manageButton: string;
  browserBody: string;
  contactTitle: string;
  contactBody: string;
};

const en: CookieStrings = {
  title: "Cookie policy",
  lead: "Which cookies nompany sets, why, and for how long. Two kinds only: the ones the site needs to work, and analytics you can refuse.",
  updated: "Last updated 27/09/2026",
  whatTitle: "What cookies are",
  whatBody:
    "A cookie is a small file a website stores in your browser so it can remember something between pages or visits, such as that you are signed in or which language you chose.",
  kindsTitle: "The two kinds we use",
  necessaryTitle: "Strictly necessary",
  necessaryBody:
    "They keep you signed in, protect sign-in against forgery, and remember your language, your theme inside the product and your cookie choice. The site cannot work without them, so they are always on and need no consent. None of them is used for advertising or shared with anyone.",
  analyticsTitle: "Analytics, only if you accept",
  analyticsBody:
    "On the home, platform, pricing, security, about, contact, customers and careers pages, and only after you choose Accept, we use Google Analytics to count visits and see which pages are read. Before you accept, or if you decline, nothing is loaded and no request is made to Google. Google's advertising features and signals are switched off. Analytics never runs inside the product: not on the sign-in pages, your account or any studio.",
  tableTitle: "Every cookie, one by one",
  head: { name: "Cookie", purpose: "What it does", lifetime: "How long it lasts", category: "Kind" },
  categoryName: { necessary: "Necessary", analytics: "Analytics" },
  rows: [
    { name: "nc_sid", purpose: "Keeps you signed in. Holds a session reference, never your password.", lifetime: "8 hours", category: "necessary" },
    { name: "nc_super", purpose: "The same, for nompany's own operations console.", lifetime: "12 hours", category: "necessary" },
    { name: "nc_otp", purpose: "Carries a sign-in through the one-time-code step.", lifetime: "10 minutes", category: "necessary" },
    { name: "nc_pend", purpose: "Holds a sign-in between your password and your second step.", lifetime: "10 minutes", category: "necessary" },
    { name: "nc_dev", purpose: "Recognises a device you asked us to remember, so you are not asked for a code on it. Set only if you tick the box.", lifetime: "30 days, or until you revoke the device", category: "necessary" },
    { name: "nc_oauth", purpose: "Protects sign-in and calendar connections against cross-site request forgery.", lifetime: "10 minutes", category: "necessary" },
    { name: "nc_intent", purpose: "Remembers the plan you chose with Start free while you create your account.", lifetime: "7 days", category: "necessary" },
    { name: "lang", purpose: "Remembers whether you chose English or Arabic.", lifetime: "1 year", category: "necessary" },
    { name: "theme", purpose: "Remembers light or dark inside your account and studio.", lifetime: "1 year", category: "necessary" },
    { name: "analytics_consent", purpose: "Remembers whether you accepted or declined analytics.", lifetime: "1 year", category: "necessary" },
    { name: "_ga, _ga_<id>", purpose: "Google Analytics: tells one visit from another. Set only after you accept.", lifetime: "Up to 2 years, or until you withdraw", category: "analytics" },
  ],
  manageTitle: "Changing your mind",
  manageBody:
    "You can accept or refuse analytics at any time. Refusing after accepting deletes the Google Analytics cookies straight away.",
  manageButton: "Open cookie settings",
  browserBody:
    "Your browser can also block or delete cookies. Blocking the necessary ones will stop you from signing in.",
  contactTitle: "Questions",
  contactBody: "Write to info@nompany.com. How we handle personal data in general is in the privacy policy.",
};

// HAND-WRITTEN, NO DIACRITICS. Cookie names are code and stay Latin.
const ar: CookieStrings = {
  title: "سياسة ملفات تعريف الارتباط",
  lead: "ما ملفات تعريف الارتباط التي تضعها نومباني، ولماذا، وإلى متى. نوعان فقط: ما يحتاجه الموقع ليعمل، والتحليلات التي يمكنك رفضها.",
  updated: "آخر تحديث 27/09/2026",
  whatTitle: "ما هي ملفات تعريف الارتباط",
  whatBody:
    "ملف تعريف الارتباط ملف صغير يحفظه الموقع في متصفحك ليتذكر شيئا بين الصفحات أو الزيارات، مثل أنك مسجل الدخول أو اللغة التي اخترتها.",
  kindsTitle: "النوعان اللذان نستخدمهما",
  necessaryTitle: "ضرورية",
  necessaryBody:
    "تبقيك مسجلا الدخول، وتحمي تسجيل الدخول من التزوير، وتتذكر لغتك والمظهر داخل المنتج واختيارك بشأن ملفات تعريف الارتباط. لا يعمل الموقع دونها، لذلك هي مفعلة دائما ولا تحتاج إلى موافقة. لا يستخدم أي منها للإعلانات ولا يشارك مع أحد.",
  analyticsTitle: "التحليلات، فقط إن وافقت",
  analyticsBody:
    "على صفحات الرئيسية والمنصة والأسعار والأمان وعن نومباني والتواصل والعملاء والوظائف، وفقط بعد أن تختار القبول، نستخدم Google Analytics لإحصاء الزيارات ومعرفة الصفحات الأكثر قراءة. قبل أن توافق، أو إن رفضت، لا يحمل شيء ولا يرسل أي طلب إلى Google. ميزات Google الإعلانية وإشاراتها معطلة. لا تعمل التحليلات أبدا داخل المنتج: لا في صفحات تسجيل الدخول ولا في حسابك ولا في أي استوديو.",
  tableTitle: "كل ملف، واحدا واحدا",
  head: { name: "الملف", purpose: "ما يفعله", lifetime: "مدته", category: "النوع" },
  categoryName: { necessary: "ضروري", analytics: "تحليلات" },
  rows: [
    { name: "nc_sid", purpose: "يبقيك مسجلا الدخول. يحمل مرجع الجلسة، لا كلمة مرورك أبدا.", lifetime: "8 ساعات", category: "necessary" },
    { name: "nc_super", purpose: "الأمر نفسه، لوحة تشغيل نومباني الخاصة.", lifetime: "12 ساعة", category: "necessary" },
    { name: "nc_otp", purpose: "ينقل تسجيل الدخول عبر خطوة الرمز لمرة واحدة.", lifetime: "10 دقائق", category: "necessary" },
    { name: "nc_pend", purpose: "يحفظ تسجيل الدخول بين كلمة المرور والخطوة الثانية.", lifetime: "10 دقائق", category: "necessary" },
    { name: "nc_dev", purpose: "يتعرف على جهاز طلبت منا تذكره، فلا يطلب منك رمز عليه. يوضع فقط إن اخترت ذلك.", lifetime: "30 يوما، أو حتى تلغي الجهاز", category: "necessary" },
    { name: "nc_oauth", purpose: "يحمي تسجيل الدخول وربط التقويم من تزوير الطلبات بين المواقع.", lifetime: "10 دقائق", category: "necessary" },
    { name: "nc_intent", purpose: "يتذكر الخطة التي اخترتها من ابدأ مجانا بينما تنشئ حسابك.", lifetime: "7 أيام", category: "necessary" },
    { name: "lang", purpose: "يتذكر إن كنت اخترت العربية أو الإنجليزية.", lifetime: "سنة", category: "necessary" },
    { name: "theme", purpose: "يتذكر المظهر الفاتح أو الداكن داخل حسابك والاستوديو.", lifetime: "سنة", category: "necessary" },
    { name: "analytics_consent", purpose: "يتذكر إن كنت قبلت التحليلات أو رفضتها.", lifetime: "سنة", category: "necessary" },
    { name: "_ga, _ga_<id>", purpose: "Google Analytics: يميز زيارة عن أخرى. يوضع فقط بعد قبولك.", lifetime: "حتى سنتين، أو حتى تسحب موافقتك", category: "analytics" },
  ],
  manageTitle: "تغيير رأيك",
  manageBody: "يمكنك قبول التحليلات أو رفضها في أي وقت. الرفض بعد القبول يحذف ملفات Google Analytics فورا.",
  manageButton: "افتح إعدادات ملفات تعريف الارتباط",
  browserBody: "يمكن لمتصفحك أيضا حظر ملفات تعريف الارتباط أو حذفها. حظر الضرورية منها سيمنعك من تسجيل الدخول.",
  contactTitle: "أسئلة",
  contactBody: "اكتب إلى info@nompany.com. طريقة تعاملنا مع البيانات الشخصية عموما مذكورة في سياسة الخصوصية.",
};

const cookies = { en, ar };

export function cookiesCopy(locale: string): CookieStrings {
  return cookies[locale as Locale] || cookies[defaultLocale];
}

export type { CookieStrings };
