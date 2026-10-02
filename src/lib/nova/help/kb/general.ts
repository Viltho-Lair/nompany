import type { HelpModule } from "../types";

// GETTING STARTED, STUDIO SETTINGS & ACCESS, YOUR ACCOUNT, TROUBLESHOOTING —
// and two departments that belong to nobody in particular: Main and Reports & BI.
//
// Every answer here was written against `docs/functionality/` on 26/09/2026.
// Where a file says "Not built yet", the entry says "not available yet" in
// words rather than describing it, because a help answer that describes a
// missing feature is worse than no answer. When a behaviour changes, the entry
// changes with its functionality file.
export const general: HelpModule = {
  topics: [
    // ---- Getting started ----
    { id: "start.basics", parent: "start", order: 1,
      label: { en: "nompany and your studio", ar: "nompany واستوديوك" },
      blurb: { en: "What a studio is, sections, and switching them on or off", ar: "ما هو الاستوديو، والأقسام، وتشغيلها أو إيقافها" } },
    { id: "start.navigating", parent: "start", order: 2,
      label: { en: "Finding your way around", ar: "التنقل في النظام" },
      blurb: { en: "The sidebar, Settings, language, theme and notifications", ar: "الشريط الجانبي والإعدادات واللغة والمظهر والإشعارات" } },
    { id: "start.people", parent: "start", order: 3,
      label: { en: "Joining and inviting", ar: "الانضمام والدعوة" },
      blurb: { en: "Company codes, join requests and bringing your team in", ar: "رمز الشركة وطلبات الانضمام وإضافة فريقك" } },
    { id: "start.first-steps", parent: "start", order: 4,
      label: { en: "First steps for a new studio", ar: "الخطوات الأولى لاستوديو جديد" },
      blurb: { en: "Currency, time zone, places, people and roles", ar: "العملة والمنطقة الزمنية والمواقع والأشخاص والأدوار" } },
    { id: "start.help", parent: "start", order: 5,
      label: { en: "Nova and support", ar: "Nova والدعم" },
      blurb: { en: "What Nova can do, and how to reach a person at nompany", ar: "ما يمكن أن تفعله Nova، وكيف تصل إلى شخص في nompany" } },

    // ---- Studio settings & access ----
    { id: "admin.people", parent: "admin", order: 1, sectionKey: "administration-members",
      label: { en: "People", ar: "الأشخاص" },
      blurb: { en: "Who is in the studio, their roles, and requests to join", ar: "من في الاستوديو، وأدوارهم، وطلبات الانضمام" } },
    { id: "admin.access", parent: "admin", order: 2, sectionKey: "administration-access",
      label: { en: "Access and roles", ar: "الصلاحيات والأدوار" },
      blurb: { en: "What each role may do, and who may grant it", ar: "ما يستطيع كل دور فعله، ومن يمكنه منحه" } },
    { id: "admin.master", parent: "admin", order: 3, sectionKey: "administration-master",
      label: { en: "Master data", ar: "البيانات الأساسية" },
      blurb: { en: "Locations, departments, cost codes, numbering and units", ar: "المواقع والإدارات ورموز التكلفة والترقيم والوحدات" } },
    { id: "admin.settings", parent: "admin", order: 4, sectionKey: "administration-settings",
      label: { en: "Studio settings", ar: "إعدادات الاستوديو" },
      blurb: { en: "Currency, time zone, language, sections and field of work", ar: "العملة والمنطقة الزمنية واللغة والأقسام ومجال العمل" } },
    { id: "admin.approvals", parent: "admin", order: 5, sectionKey: "approvals",
      label: { en: "Approvals", ar: "الموافقات" },
      blurb: { en: "Answering approvals and setting who approves what", ar: "الرد على الموافقات وتحديد من يوافق على ماذا" } },
    { id: "admin.approvals.settings", parent: "admin.approvals", order: 1, sectionKey: "approvals-settings",
      label: { en: "Approval settings", ar: "إعدادات الموافقات" },
      blurb: { en: "Who approves each kind of request, and from what amount", ar: "من يوافق على كل نوع من الطلبات، وابتداء من أي مبلغ" } },

    // ---- Your account & plan ----
    { id: "account.profile", parent: "account", order: 1,
      label: { en: "Profile and password", ar: "الملف الشخصي وكلمة المرور" },
      blurb: { en: "Your details, picture, password and calendars", ar: "بياناتك وصورتك وكلمة المرور والتقويمات" } },
    { id: "account.security", parent: "account", order: 2,
      label: { en: "Sign-in security", ar: "أمان تسجيل الدخول" },
      blurb: { en: "Two-factor, passkeys, sessions, devices and your PIN", ar: "التحقق الثنائي ومفاتيح المرور والجلسات والأجهزة ورمز PIN" } },
    { id: "account.studios", parent: "account", order: 3,
      label: { en: "Your studios", ar: "استوديوهاتك" },
      blurb: { en: "Switching, creating, renaming and leaving studios", ar: "التبديل والإنشاء وإعادة التسمية ومغادرة الاستوديوهات" } },
    { id: "account.plan", parent: "account", order: 4,
      label: { en: "Packages and payment", ar: "الباقات والدفع" },
      blurb: { en: "What your package includes, upgrading and paying", ar: "ما تشمله باقتك والترقية والدفع" } },

    // ---- Departments this module covers ----
    { id: "dept.main", parent: "departments", order: 0, sectionKey: "main",
      label: { en: "Main", ar: "الرئيسية" },
      blurb: { en: "Your home page: what needs you and what moved", ar: "صفحتك الرئيسية: ما ينتظرك وما تغيّر" } },
    { id: "dept.reports", parent: "departments", order: 16, sectionKey: "reports",
      label: { en: "Reports & BI", ar: "التقارير وذكاء الأعمال" },
      blurb: { en: "Exports, the executive dashboard, your own reports and targets", ar: "التصدير ولوحة الإدارة العليا وتقاريرك الخاصة والأهداف" } },
  ],

  entries: [
    // =====================================================================
    // GETTING STARTED — nompany and your studio
    // =====================================================================
    {
      id: "start.what-is-nompany", topic: "start.basics", kind: "about", common: true,
      q: { en: "What is nompany?", ar: "ما هو nompany؟" },
      a: {
        en: "nompany is an ERP: one system where a company runs its sales, quotations, projects, purchasing, stock, people, finance and more. Each company works in its own studio, and each part of the business is a section in the sidebar. You only see the sections your studio has switched on and your role allows you to open.",
        ar: "nompany نظام لتخطيط موارد المؤسسات: نظام واحد تدير فيه الشركة مبيعاتها وعروض أسعارها ومشاريعها ومشترياتها ومخزونها وموظفيها وماليتها وغير ذلك. تعمل كل شركة في استوديو خاص بها، وكل جزء من العمل قسم في الشريط الجانبي. لا ترى إلا الأقسام المفعّلة في استوديوك والتي يسمح لك دورك بفتحها.",
      },
      keywords: ["ERP", "system", "platform", "overview", "نظام", "منصة", "نظرة عامة", "تخطيط موارد"],
      related: ["start.what-is-a-studio", "start.sidebar"],
    },
    {
      id: "start.what-is-a-studio", topic: "start.basics", kind: "about",
      q: { en: "What is a studio?", ar: "ما هو الاستوديو؟" },
      a: {
        en: "A studio is your company's workspace in nompany, at its own address: nompany.com followed by the company code. Everything your company records lives inside it, and only its members can see any of it. One person can belong to several studios, and each studio keeps its own name, role and profile for them.",
        ar: "الاستوديو هو مساحة عمل شركتك في nompany، وله عنوانه الخاص: nompany.com متبوعا برمز الشركة. كل ما تسجله شركتك موجود داخله، ولا يرى أي شيء منه إلا أعضاؤه. يمكن للشخص الواحد أن ينتمي إلى عدة استوديوهات، ويحتفظ كل استوديو باسمه ودوره وملفه الخاص به.",
      },
      keywords: ["studio", "workspace", "company", "tenant", "استوديو", "مساحة عمل", "شركة", "المستأجر"],
      related: ["start.company-code", "account.studios.switch"],
    },
    {
      id: "start.sections-vs-departments", topic: "start.basics", kind: "about",
      q: { en: "What is the difference between a section and a department?", ar: "ما الفرق بين القسم والإدارة؟" },
      a: {
        en: "A section is a part of the product, such as Finance & Accounting or Projects, and it decides which screens exist and who may open them. A department is part of your company's org chart, such as Site Execution or Legal, kept in Master data with its parent and manager. A department can work across several sections or none, and it never grants access by itself; roles do that.",
        ar: "القسم جزء من المنتج، مثل المالية والمحاسبة أو المشاريع، ويحدد الشاشات الموجودة ومن يمكنه فتحها. أما الإدارة فهي جزء من الهيكل التنظيمي لشركتك، مثل التنفيذ الميداني أو الشؤون القانونية، وتُحفظ في البيانات الأساسية مع الإدارة الأم والمدير. يمكن أن تعمل الإدارة عبر عدة أقسام أو لا شيء منها، ولا تمنح أي صلاحية بنفسها؛ فالأدوار هي التي تفعل ذلك.",
      },
      keywords: ["section", "department", "org chart", "module", "قسم", "إدارة", "هيكل تنظيمي", "وحدة"],
      related: ["admin.master.departments", "start.switch-sections"],
    },
    {
      id: "start.switch-sections", topic: "start.basics", kind: "howto", common: true,
      open: "administration-settings",
      q: { en: "How do I switch a section on or off?", ar: "كيف أفعّل قسما أو أوقفه؟" },
      a: {
        en: "Sections are switched in Studio settings, in the Sections panel, by someone allowed to edit studio settings. Turning one off hides it from everyone, whatever rights they hold, and deletes nothing; turning it back on brings its records back with it. Main, Approvals and Settings are always on.",
        ar: "تُفعّل الأقسام وتُوقف من إعدادات الاستوديو، في لوحة الأقسام، على يد شخص مسموح له بتعديل إعدادات الاستوديو. إيقاف القسم يخفيه عن الجميع مهما كانت صلاحياتهم ولا يحذف شيئا، وإعادة تفعيله تعيد سجلاته معه. الرئيسية والموافقات والإعدادات مفعّلة دائما.",
      },
      steps: {
        en: ["Click Settings at the bottom of the sidebar.", "Open Studio settings.", "Scroll to Sections.", "Switch the section on or off. Use the arrow beside a section to show or hide its sub-sections."],
        ar: ["اضغط الإعدادات أسفل الشريط الجانبي.", "افتح إعدادات الاستوديو.", "انتقل إلى الأقسام.", "فعّل القسم أو أوقفه. استخدم السهم بجانب القسم لإظهار أقسامه الفرعية أو إخفائها."],
      },
      keywords: ["enable", "disable", "turn off", "hide section", "sections panel", "تفعيل", "إيقاف", "إخفاء قسم", "لوحة الأقسام"],
      related: ["start.switched-off-data", "start.always-on", "admin.settings.field-of-work"],
    },
    {
      id: "start.choose-at-creation", topic: "start.basics", kind: "about",
      q: { en: "How were my studio's departments chosen?", ar: "كيف اختيرت أقسام استوديوي؟" },
      a: {
        en: "When the studio was created, the owner answered one yes-or-no question per department, such as whether the company keeps stock. The answers were pre-filled from the field of work, and a yes could be narrowed to only some parts of that department. Nothing about that choice is final: every answer is one switch in the Sections panel of Studio settings.",
        ar: "عند إنشاء الاستوديو أجاب المالك عن سؤال بنعم أو لا لكل قسم، مثل ما إذا كانت الشركة تحتفظ بمخزون. عُبّئت الإجابات مسبقا بحسب مجال العمل، ويمكن حصر الإجابة بنعم في أجزاء محددة من القسم. لا شيء في هذا الاختيار نهائي: كل إجابة مفتاح واحد في لوحة الأقسام في إعدادات الاستوديو.",
      },
      keywords: ["setup", "creation", "which departments", "questions", "الإعداد", "الإنشاء", "أي الأقسام", "أسئلة"],
      related: ["start.switch-sections", "account.studios.create"],
    },
    {
      id: "start.always-on", topic: "start.basics", kind: "about",
      q: { en: "Which parts of the studio are always there?", ar: "ما الأجزاء الموجودة دائما في الاستوديو؟" },
      a: {
        en: "Main, Approvals and Settings cannot be switched off. Main is your home page, Approvals is where you answer what is waiting on you, and Settings holds People, Access, Master data and Studio settings. Being always on does not mean everyone can open them: Main and the Settings screens still need the matching right.",
        ar: "لا يمكن إيقاف الرئيسية والموافقات والإعدادات. الرئيسية صفحتك الأولى، والموافقات مكان الرد على ما ينتظرك، والإعدادات تضم الأشخاص والصلاحيات والبيانات الأساسية وإعدادات الاستوديو. كونها مفعّلة دائما لا يعني أن الجميع يستطيع فتحها: فالرئيسية وشاشات الإعدادات تحتاج الصلاحية المناسبة.",
      },
      keywords: ["always on", "required", "main", "approvals", "settings", "دائما", "إلزامي", "الرئيسية", "الموافقات"],
      related: ["start.switch-sections", "main.about"],
    },
    {
      id: "start.switched-off-data", topic: "start.basics", kind: "about",
      q: { en: "What happens to my records if I switch a section off?", ar: "ماذا يحدث لسجلاتي إذا أوقفت قسما؟" },
      a: {
        en: "Nothing is deleted. The section and its dashboard widgets disappear for everyone, and its records stay exactly where they were. Switch it back on and everything returns as it was. Approvals already requested from a switched-off department still appear on the Approvals page, listed under Departments switched off.",
        ar: "لا يُحذف شيء. يختفي القسم وعناصر لوحته عن الجميع، وتبقى سجلاته كما هي تماما. أعد تفعيله فيعود كل شيء كما كان. والموافقات المطلوبة سابقا من قسم موقوف تظل ظاهرة في صفحة الموافقات تحت عنوان الأقسام الموقوفة.",
      },
      keywords: ["data", "records", "delete", "switch off", "بيانات", "سجلات", "حذف", "إيقاف"],
      related: ["start.switch-sections", "admin.approvals.switched-off"],
    },
    {
      id: "start.field-of-work", topic: "start.basics", kind: "about",
      q: { en: "What does the field of work change?", ar: "ما الذي يغيّره مجال العمل؟" },
      a: {
        en: "The field of work tells nompany what your company does. It suggests which sections you start with, seeds the service actions your items and projects use, offers the departments and pre-built roles your trade usually has, and picks the deal flow. Changing it later switches nothing off by itself: the Sections panel offers a checklist instead, and nothing changes until you press Apply.",
        ar: "يخبر مجال العمل nompany بما تفعله شركتك. فهو يقترح الأقسام التي تبدأ بها، ويعبئ إجراءات الخدمة التي تستخدمها أصنافك ومشاريعك، ويعرض الإدارات والأدوار الجاهزة المعتادة في مجالك، ويختار مسار الصفقات. تغييره لاحقا لا يوقف شيئا بنفسه: إذ تعرض لوحة الأقسام قائمة اختيار بدلا من ذلك، ولا يتغير شيء حتى تضغط تطبيق.",
      },
      keywords: ["field of work", "industry", "trade", "business type", "مجال العمل", "الصناعة", "النشاط", "نوع العمل"],
      related: ["admin.settings.field-of-work", "start.switch-sections"],
    },

    // =====================================================================
    // GETTING STARTED — finding your way around
    // =====================================================================
    {
      id: "start.sidebar", topic: "start.navigating", kind: "about",
      q: { en: "How do I find my way around the studio?", ar: "كيف أتنقل داخل الاستوديو؟" },
      a: {
        en: "The sidebar on the side of the screen lists the departments you may open; click one to expand its parts. Main is at the top, and Settings sits at the bottom of the sidebar. On a phone, the menu button at the top opens the same list. A department you cannot see is either switched off for the studio or not granted to you.",
        ar: "يعرض الشريط الجانبي على جانب الشاشة الأقسام التي يمكنك فتحها؛ اضغط أحدها لعرض أجزائه. الرئيسية في الأعلى، والإعدادات في أسفل الشريط الجانبي. على الهاتف يفتح زر القائمة في الأعلى القائمة نفسها. القسم الذي لا تراه إما موقوف في الاستوديو أو غير ممنوح لك.",
      },
      keywords: ["sidebar", "menu", "navigation", "navigate", "الشريط الجانبي", "القائمة", "التنقل", "تصفح"],
      related: ["start.settings-entry", "trouble.section-missing"],
    },
    {
      id: "start.settings-entry", topic: "start.navigating", kind: "about",
      q: { en: "Where are the studio's settings?", ar: "أين إعدادات الاستوديو؟" },
      a: {
        en: "Click Settings at the bottom of the sidebar. It holds People, Access, Master data and Studio settings: who is in the studio, what they may do, the reference data every department reads, and how the studio itself is set up. You only see the parts you have been granted; if none, the page says Settings is held by the people who administer the studio.",
        ar: "اضغط الإعدادات في أسفل الشريط الجانبي. تضم الأشخاص والصلاحيات والبيانات الأساسية وإعدادات الاستوديو: من في الاستوديو، وما يمكنهم فعله، والبيانات المرجعية التي تقرؤها كل الأقسام، وكيفية إعداد الاستوديو نفسه. لا ترى إلا الأجزاء الممنوحة لك؛ وإن لم يكن لك شيء منها فستخبرك الصفحة بأن الإعدادات بيد من يديرون الاستوديو.",
      },
      keywords: ["settings", "administration", "configuration", "admin", "الإعدادات", "الإدارة", "التهيئة", "المسؤول"],
      related: ["admin.settings.about", "admin.people.about"],
    },
    {
      id: "start.language", topic: "start.navigating", kind: "howto", common: true,
      q: { en: "How do I switch between English and Arabic?", ar: "كيف أبدّل بين العربية والإنجليزية؟" },
      a: {
        en: "Use the language menu in the header. Your choice is yours alone: it overrides the studio's default language for you and does not change what anyone else sees. It is remembered in this browser, so a new browser or device starts on the studio's default again. Anything people typed, such as client names or role names, stays as it was written.",
        ar: "استخدم قائمة اللغة في الشريط العلوي. اختيارك خاص بك وحدك: فهو يتقدم على اللغة الافتراضية للاستوديو بالنسبة لك ولا يغيّر ما يراه غيرك. ويُحفظ في هذا المتصفح، لذا يبدأ المتصفح أو الجهاز الجديد بلغة الاستوديو الافتراضية من جديد. أما ما كتبه الناس، مثل أسماء العملاء أو الأدوار، فيبقى كما كُتب.",
      },
      steps: {
        en: ["Open the language menu in the header.", "Choose English or العربية.", "The page redraws in that language and direction."],
        ar: ["افتح قائمة اللغة في الشريط العلوي.", "اختر English أو العربية.", "تُعاد الصفحة باللغة والاتجاه المختارين."],
      },
      keywords: ["language", "Arabic", "English", "translate", "RTL", "اللغة", "تغيير اللغة", "عربي", "إنجليزي", "ترجمة"],
      related: ["admin.settings.language-default", "start.theme"],
    },
    {
      id: "start.theme", topic: "start.navigating", kind: "howto",
      q: { en: "How do I switch to dark mode?", ar: "كيف أنتقل إلى الوضع الداكن؟" },
      a: {
        en: "Open the theme menu in the header and choose Light, Dark or Device. Device follows your computer or phone's own setting. The theme is a personal choice and affects nobody else.",
        ar: "افتح قائمة المظهر في الشريط العلوي واختر فاتح أو داكن أو الجهاز. خيار الجهاز يتبع إعداد حاسوبك أو هاتفك. المظهر اختيار شخصي ولا يؤثر في أحد غيرك.",
      },
      steps: {
        en: ["Open the theme menu in the header.", "Choose Light, Dark or Device."],
        ar: ["افتح قائمة المظهر في الشريط العلوي.", "اختر فاتح أو داكن أو الجهاز."],
      },
      keywords: ["dark mode", "light mode", "theme", "night", "الوضع الداكن", "الوضع الفاتح", "المظهر", "ليلي"],
      related: ["start.language"],
    },
    {
      id: "start.notifications", topic: "start.navigating", kind: "about",
      q: { en: "How do notifications work?", ar: "كيف تعمل الإشعارات؟" },
      a: {
        en: "The bell in the header shows notifications addressed to you, such as an approval waiting on you or a leave request, with a count of unread ones. Open it to read them, and use Mark all read to clear the count. Notifications are shown in your own language, and an admin can change their wording in Master data.",
        ar: "يعرض الجرس في الشريط العلوي الإشعارات الموجهة إليك، مثل موافقة تنتظرك أو طلب إجازة، مع عدد غير المقروء منها. افتحه لقراءتها، واستخدم تعليم الكل كمقروء لتصفير العدد. تظهر الإشعارات بلغتك، ويمكن للمسؤول تغيير صياغتها من البيانات الأساسية.",
      },
      keywords: ["notifications", "bell", "alerts", "unread", "الإشعارات", "الجرس", "التنبيهات", "غير مقروء"],
      related: ["start.notifications-email", "admin.master.notification-wording"],
    },
    {
      id: "start.notifications-email", topic: "start.navigating", kind: "about",
      q: { en: "Will I get studio notifications by email?", ar: "هل تصلني إشعارات الاستوديو بالبريد الإلكتروني؟" },
      a: {
        en: "No. Studio notifications appear in the bell only; emailing them is not available yet. You also cannot mute a type of notification or choose a digest yet. Emails are sent for account matters, such as sign-in codes and your studio's payment reminders.",
        ar: "لا. تظهر إشعارات الاستوديو في الجرس فقط؛ وإرسالها بالبريد الإلكتروني غير متاح بعد. ولا يمكنك بعد كتم نوع من الإشعارات أو اختيار ملخص دوري. تُرسل الرسائل الإلكترونية لشؤون الحساب، مثل رموز تسجيل الدخول وتذكيرات الدفع الخاصة باستوديوك.",
      },
      keywords: ["email", "notification email", "mute", "digest", "بريد إلكتروني", "كتم", "ملخص", "إشعار بالبريد"],
      related: ["start.notifications", "trouble.email-not-received"],
    },
    {
      id: "start.live-updates", topic: "start.navigating", kind: "about",
      q: { en: "Do I need to refresh to see other people's changes?", ar: "هل أحتاج إلى تحديث الصفحة لرؤية تغييرات الآخرين؟" },
      a: {
        en: "No. Screens update by themselves when someone else changes a record you are looking at. If the connection drops, a banner says you are not receiving live updates and that it is reconnecting. If that banner stays, reload the page.",
        ar: "لا. تتحدث الشاشات تلقائيا عندما يغيّر شخص آخر سجلا تنظر إليه. إذا انقطع الاتصال يظهر شريط يخبرك بأنك لا تتلقى التحديثات المباشرة وأنه يعيد الاتصال. وإذا بقي الشريط ظاهرا فأعد تحميل الصفحة.",
      },
      keywords: ["live", "real time", "refresh", "update", "مباشر", "لحظي", "تحديث", "إعادة تحميل"],
      related: ["trouble.not-live"],
    },
    {
      id: "start.dates", topic: "start.navigating", kind: "about",
      q: { en: "How are dates and times shown?", ar: "كيف تُعرض التواريخ والأوقات؟" },
      a: {
        en: "Dates show as day, month, year, for example 26/09/2026, and they read the same for everyone in the studio whatever language they chose. Which day it is for offers, shifts and daily limits is decided by the studio's time zone, set once in Studio settings. If no time zone is set, the studio's days are read in UTC.",
        ar: "تُعرض التواريخ بترتيب اليوم ثم الشهر ثم السنة، مثل 26/09/2026، وتظهر بالشكل نفسه لكل من في الاستوديو مهما كانت اللغة التي اختاروها. أما تحديد اليوم الحالي للعروض والورديات والحدود اليومية فيعتمد على المنطقة الزمنية للاستوديو التي تُضبط مرة واحدة في إعدادات الاستوديو. وإذا لم تُضبط، تُحسب أيام الاستوديو بتوقيت UTC.",
      },
      keywords: ["date format", "time", "dd/mm/yyyy", "time zone", "صيغة التاريخ", "الوقت", "المنطقة الزمنية", "التوقيت"],
      related: ["admin.settings.timezone", "trouble.wrong-date"],
    },
    {
      id: "start.walkthrough", topic: "start.navigating", kind: "howto",
      q: { en: "How do I see the guided tour again?", ar: "كيف أشاهد الجولة التعريفية مرة أخرى؟" },
      a: {
        en: "Nova shows new people round the account page and the studio, one control at a time. If you ticked Don't show this again, you can bring it back from the avatar menu. The tour covers the main controls only; there is no tour of each department's own screens yet.",
        ar: "تأخذ Nova الأشخاص الجدد في جولة على صفحة الحساب والاستوديو، عنصرا تلو الآخر. إذا اخترت عدم العرض مرة أخرى، يمكنك إعادتها من قائمة الصورة الشخصية. تغطي الجولة العناصر الرئيسية فقط؛ ولا توجد بعد جولة لشاشات كل قسم.",
      },
      steps: {
        en: ["Click your avatar in the header.", "Choose Show the walkthrough."],
        ar: ["اضغط صورتك الشخصية في الشريط العلوي.", "اختر عرض الجولة التعريفية."],
      },
      keywords: ["tour", "walkthrough", "onboarding", "guide", "جولة", "تعريف", "إرشاد", "دليل"],
      related: ["start.nova-what"],
    },

    // =====================================================================
    // GETTING STARTED — joining and inviting
    // =====================================================================
    {
      id: "start.join-studio", topic: "start.people", kind: "howto", common: true,
      q: { en: "How do I join my company's studio?", ar: "كيف أنضم إلى استوديو شركتي؟" },
      a: {
        en: "Ask someone at your company for its company code, then request to join from your account page. Someone in the studio approves the request and gives you a role. Until they do, you cannot see anything inside it.",
        ar: "اطلب رمز الشركة من أحد زملائك، ثم قدّم طلب انضمام من صفحة حسابك. يوافق شخص في الاستوديو على الطلب ويمنحك دورا. وإلى أن يفعل ذلك لا يمكنك رؤية أي شيء داخله.",
      },
      steps: {
        en: ["Sign in and open your account page.", "Choose Join a studio.", "Type the company code and send the request.", "Wait for someone in the studio to approve it; the studio then appears in your list."],
        ar: ["سجّل الدخول وافتح صفحة حسابك.", "اختر الانضمام إلى استوديو.", "اكتب رمز الشركة وأرسل الطلب.", "انتظر موافقة أحد أعضاء الاستوديو؛ وبعدها يظهر الاستوديو في قائمتك."],
      },
      keywords: ["join", "company code", "request access", "access", "انضمام", "رمز الشركة", "طلب وصول", "الدخول"],
      related: ["start.join-pending", "start.company-code"],
    },
    {
      id: "start.invite-people", topic: "start.people", kind: "howto", common: true,
      open: "administration-members",
      q: { en: "How do I invite people to my studio?", ar: "كيف أدعو أشخاصا إلى استوديوي؟" },
      a: {
        en: "Share your company code; there are no invitation links or tokens to pass around. Each person creates a nompany account, enters the code on their account page, and you approve their request on the People screen, choosing their role as you do. Your package decides how many members the studio may have.",
        ar: "شارك رمز شركتك؛ فلا توجد روابط دعوة أو رموز وصول لتمريرها. ينشئ كل شخص حسابا في nompany، ويدخل الرمز في صفحة حسابه، ثم توافق أنت على طلبه في شاشة الأشخاص وتختار دوره في الوقت نفسه. تحدد باقتك عدد الأعضاء المسموح به في الاستوديو.",
      },
      steps: {
        en: ["Open Settings, then People.", "Under Invite people, copy the company code.", "Send it to the people you want in the studio.", "When their requests appear under Requests to join, approve each one and pick a role."],
        ar: ["افتح الإعدادات ثم الأشخاص.", "من قسم دعوة الأشخاص انسخ رمز الشركة.", "أرسله إلى من تريد انضمامهم إلى الاستوديو.", "عندما تظهر طلباتهم تحت طلبات الانضمام، وافق على كل طلب واختر دورا."],
      },
      keywords: ["invite", "add user", "add member", "team", "دعوة", "إضافة مستخدم", "إضافة عضو", "الفريق"],
      related: ["start.approve-join", "start.seat-limit", "start.company-code"],
    },
    {
      id: "start.approve-join", topic: "start.people", kind: "howto",
      open: "administration-members",
      q: { en: "How do I approve a request to join?", ar: "كيف أوافق على طلب انضمام؟" },
      a: {
        en: "Requests appear on the People screen under Requests to join. Approving creates the person's profile inside this studio with the role you choose, and declining sends them away with nothing. You can only give a role whose access you hold yourself, and approval is refused if the studio has no seats left.",
        ar: "تظهر الطلبات في شاشة الأشخاص تحت طلبات الانضمام. الموافقة تنشئ ملف الشخص داخل هذا الاستوديو بالدور الذي تختاره، والرفض يعيده دون أي شيء. لا يمكنك منح دور إلا إذا كنت تملك صلاحياته بنفسك، وتُرفض الموافقة إذا لم يبق في الاستوديو مقاعد.",
      },
      steps: {
        en: ["Open Settings, then People.", "Find the person under Requests to join.", "Pick a role and, if you like, the name they go by in this studio.", "Click Approve, or Decline."],
        ar: ["افتح الإعدادات ثم الأشخاص.", "ابحث عن الشخص تحت طلبات الانضمام.", "اختر دورا، ويمكنك تحديد الاسم الذي يُعرف به في هذا الاستوديو.", "اضغط موافقة أو رفض."],
      },
      keywords: ["approve", "join request", "decline", "new member", "موافقة", "طلب انضمام", "رفض", "عضو جديد"],
      related: ["admin.access.no-escalation", "start.seat-limit"],
    },
    {
      id: "start.join-pending", topic: "start.people", kind: "troubleshoot",
      q: { en: "I asked to join a studio and nothing happened", ar: "طلبت الانضمام إلى استوديو ولم يحدث شيء" },
      a: {
        en: "Your request is waiting for someone in that studio to approve it; nompany does not approve it for them. Let a colleague who manages people know you have asked. If the page says no studio uses that code, check the spelling with them, since a code can also change when the owner renames the studio's link.",
        ar: "طلبك ينتظر موافقة أحد أعضاء ذلك الاستوديو؛ ولا توافق nompany نيابة عنهم. أخبر زميلا مسؤولا عن الأشخاص بأنك قدمت الطلب. وإذا قالت الصفحة إنه لا يوجد استوديو بهذا الرمز فتحقق من كتابته معهم، لأن الرمز قد يتغير عندما يغيّر المالك رابط الاستوديو.",
      },
      keywords: ["pending", "waiting", "request", "not approved", "معلق", "انتظار", "طلب", "لم تتم الموافقة"],
      related: ["start.join-studio", "start.company-code"],
    },
    {
      id: "start.company-code", topic: "start.people", kind: "about",
      q: { en: "What is the company code?", ar: "ما هو رمز الشركة؟" },
      a: {
        en: "The company code is your studio's address on nompany.com, and it is what people type to ask to join. Knowing it lets someone ask, never enter: every request still needs approval. Only the owner can change it, and a change takes effect at midnight, after which the old link stops working.",
        ar: "رمز الشركة هو عنوان استوديوك على nompany.com، وهو ما يكتبه الناس لطلب الانضمام. معرفة الرمز تتيح للشخص أن يطلب فقط لا أن يدخل: فكل طلب يحتاج موافقة. لا يغيّره إلا المالك، ويسري التغيير عند منتصف الليل، وبعدها يتوقف الرابط القديم عن العمل.",
      },
      keywords: ["company code", "slug", "studio link", "address", "رمز الشركة", "رابط الاستوديو", "العنوان", "المعرّف"],
      related: ["start.invite-people", "account.studios.rename"],
    },
    {
      id: "start.seat-limit", topic: "start.people", kind: "troubleshoot",
      q: { en: "It says my package allows no more members", ar: "تظهر رسالة أن باقتي لا تسمح بأعضاء آخرين" },
      a: {
        en: "Every member, the owner included, takes a seat, and your package or subscription sets how many there are. When they are all taken, nobody more can be approved until the studio upgrades or someone is removed. The owner can request an upgrade from the Upgrade button, where the package offers one.",
        ar: "كل عضو، بمن فيهم المالك، يشغل مقعدا، وتحدد باقتك أو اشتراكك عدد المقاعد. عندما تُشغل كلها لا يمكن الموافقة على أحد آخر حتى تُرقّى الباقة أو يُزال أحد الأعضاء. يستطيع المالك طلب الترقية من زر الترقية حين تتيحه الباقة.",
      },
      keywords: ["seats", "member limit", "users", "package limit", "المقاعد", "حد الأعضاء", "المستخدمين", "حد الباقة"],
      related: ["account.plan.upgrade", "admin.people.remove"],
    },

    // =====================================================================
    // GETTING STARTED — first steps
    // =====================================================================
    {
      id: "start.first-steps-checklist", topic: "start.first-steps", kind: "howto", common: true,
      q: { en: "I've just created a studio. What should I set up first?", ar: "أنشأت استوديو للتو. ما الذي أعدّه أولا؟" },
      a: {
        en: "A few company-wide settings make everything else work: the currency and time zone, your departments and places, then your people and their roles. Approvals are worth setting up before anyone asks for one. You can do all of this from Settings at the bottom of the sidebar.",
        ar: "بعض الإعدادات العامة للشركة تجعل كل ما عداها يعمل: العملة والمنطقة الزمنية، ثم إداراتك ومواقعك، ثم الأشخاص وأدوارهم. ومن المفيد إعداد الموافقات قبل أن يطلبها أحد. يمكنك فعل ذلك كله من الإعدادات في أسفل الشريط الجانبي.",
      },
      steps: {
        en: [
          "Studio settings: check the currency and set the time zone, working hours and logo.",
          "Studio settings, Sections: switch off any department you do not run.",
          "Master data: add your departments, with parents and managers, and your locations.",
          "Human Resources, Roles: add the pre-built roles your departments need.",
          "Access: check what each role may do.",
          "People: share the company code and approve people as they ask to join.",
          "Approvals, Approval settings: name who approves bills, requisitions, leave and the rest.",
        ],
        ar: [
          "إعدادات الاستوديو: تحقق من العملة واضبط المنطقة الزمنية وساعات العمل والشعار.",
          "إعدادات الاستوديو، الأقسام: أوقف أي قسم لا تعمل به.",
          "البيانات الأساسية: أضف إداراتك مع الإدارات الأم والمديرين، وأضف مواقعك.",
          "الموارد البشرية، الأدوار: أضف الأدوار الجاهزة التي تحتاجها إداراتك.",
          "الصلاحيات: راجع ما يستطيع كل دور فعله.",
          "الأشخاص: شارك رمز الشركة ووافق على من يطلب الانضمام.",
          "الموافقات، إعدادات الموافقات: حدّد من يوافق على الفواتير وطلبات الشراء والإجازات وغيرها.",
        ],
      },
      keywords: ["setup", "onboarding", "checklist", "new studio", "get started", "الإعداد", "البداية", "قائمة", "استوديو جديد"],
      related: ["admin.settings.currency", "start.first-roles", "admin.approvals.settings"],
    },
    {
      id: "start.set-currency-first", topic: "start.first-steps", kind: "about",
      q: { en: "Why should I set the currency before anything else?", ar: "لماذا أضبط العملة قبل أي شيء آخر؟" },
      a: {
        en: "Amounts across the studio are shown and compared in its currency. An approval step that starts at an amount can only judge a bill, a bid or a requisition against that limit once the studio knows its own currency; without it the amount is unknown. A studio created with a country gets that country's currency, and you can check or change it in Studio settings.",
        ar: "تُعرض المبالغ في الاستوديو وتُقارن بعملته. ولا يمكن لخطوة موافقة تبدأ من مبلغ معين أن تحكم على فاتورة أو عطاء أو طلب شراء مقابل ذلك الحد إلا إذا عرف الاستوديو عملته؛ فبدونها يكون المبلغ مجهولا. الاستوديو الذي أُنشئ مع تحديد دولة يأخذ عملة تلك الدولة، ويمكنك مراجعتها أو تغييرها في إعدادات الاستوديو.",
      },
      keywords: ["currency", "base currency", "money", "approval amount", "العملة", "العملة الأساسية", "المال", "مبلغ الموافقة"],
      related: ["admin.settings.currency", "trouble.currency-not-set"],
    },
    {
      id: "start.first-roles", topic: "start.first-steps", kind: "howto",
      open: "hr",
      q: { en: "How do I set up roles for my team?", ar: "كيف أعدّ أدوارا لفريقي؟" },
      a: {
        en: "A new studio starts with one role, Admin. Roles are named in Human Resources under Roles, grouped by department, and each department can add the pre-built roles its trade usually has, which arrive with sensible access already filled in. Access is then where any role's rights are checked or changed.",
        ar: "يبدأ الاستوديو الجديد بدور واحد هو المسؤول. تُسمّى الأدوار في الموارد البشرية تحت الأدوار، مجمعة حسب الإدارة، ويمكن لكل إدارة إضافة الأدوار الجاهزة المعتادة في مجالها، وهي تأتي بصلاحيات مناسبة معبأة مسبقا. ثم تُراجع صلاحيات أي دور أو تُغيّر من شاشة الصلاحيات.",
      },
      steps: {
        en: ["Make sure the studio's field of work is set, and your departments have codes in Master data.", "Open Human Resources, then Roles.", "Under a department, choose Add pre-built roles, or name a role of your own.", "Open Access to check or adjust what each role may do."],
        ar: ["تأكد من ضبط مجال عمل الاستوديو، ومن أن لإداراتك رموزا في البيانات الأساسية.", "افتح الموارد البشرية ثم الأدوار.", "تحت إحدى الإدارات اختر إضافة أدوار جاهزة، أو سمِّ دورا خاصا بك.", "افتح الصلاحيات لمراجعة ما يستطيع كل دور فعله أو تعديله."],
      },
      keywords: ["roles", "job titles", "permissions", "team", "الأدوار", "المسميات الوظيفية", "الصلاحيات", "الفريق"],
      related: ["admin.access.library", "admin.access.grant"],
    },
    {
      id: "start.new-member-sees-nothing", topic: "start.first-steps", kind: "about",
      q: { en: "Why does a new member see an empty studio?", ar: "لماذا يرى العضو الجديد استوديو فارغا؟" },
      a: {
        en: "Access in nompany is denied by default: a person with no role, or a role with no rights, can open nothing. Give them a role on the People screen, and make sure that role has the rights they need on the Access screen. Main itself is a granted page too, so tick it for the roles that should have a home page.",
        ar: "الوصول في nompany مرفوض افتراضيا: الشخص الذي لا دور له، أو له دور بلا صلاحيات، لا يستطيع فتح شيء. امنحه دورا من شاشة الأشخاص، وتأكد من أن لهذا الدور الصلاحيات التي يحتاجها في شاشة الصلاحيات. والرئيسية نفسها صفحة تحتاج صلاحية، فحددها للأدوار التي ينبغي أن تكون لها صفحة رئيسية.",
      },
      keywords: ["empty", "no access", "new member", "nothing shared", "فارغ", "لا وصول", "عضو جديد", "لم يُشارك شيء"],
      related: ["admin.people.change-role", "trouble.nothing-shared"],
    },

    // =====================================================================
    // GETTING STARTED — Nova and support
    // =====================================================================
    {
      id: "start.nova-what", topic: "start.help", kind: "about", common: true,
      q: { en: "What can Nova do?", ar: "ماذا تستطيع Nova أن تفعل؟" },
      a: {
        en: "Nova is nompany's assistant. This help desk answers questions about how the product works, whether you click through the topics or type. When your package includes Nova's chat, she can also read the studio's records you are allowed to see, such as invoices, projects, stock or your approvals, and carry out a few actions after you confirm them. She never sees or does more than your own rights allow.",
        ar: "Nova هي مساعدة nompany. يجيب مكتب المساعدة هذا عن الأسئلة حول طريقة عمل المنتج، سواء تصفحت المواضيع أو كتبت سؤالك. وحين تشمل باقتك محادثة Nova، يمكنها أيضا قراءة سجلات الاستوديو المسموح لك برؤيتها، مثل الفواتير أو المشاريع أو المخزون أو موافقاتك، وتنفيذ بعض الإجراءات بعد تأكيدك. ولا ترى ولا تفعل أكثر مما تسمح به صلاحياتك.",
      },
      keywords: ["Nova", "assistant", "AI", "chatbot", "help", "مساعد", "ذكاء اصطناعي", "مساعدة", "روبوت محادثة"],
      related: ["start.nova-cannot", "start.nova-key", "start.live-chat"],
    },
    {
      id: "start.nova-cannot", topic: "start.help", kind: "about",
      q: { en: "What can't Nova do?", ar: "ما الذي لا تستطيع Nova فعله؟" },
      a: {
        en: "Nova cannot see records your role does not allow, grant anyone access, or change settings. She can read your approvals but cannot answer one; approving stays with you on the Approvals page, with your PIN. Any change she makes to a record is prepared first and only goes through once you confirm it.",
        ar: "لا تستطيع Nova رؤية سجلات لا يسمح بها دورك، ولا منح أي شخص صلاحية، ولا تغيير الإعدادات. يمكنها قراءة موافقاتك لكنها لا تستطيع الرد على أي منها؛ فالموافقة تبقى لك في صفحة الموافقات برمز PIN الخاص بك. وأي تغيير تُجريه على سجل يُحضَّر أولا ولا يُنفَّذ إلا بعد تأكيدك.",
      },
      keywords: ["Nova limits", "cannot", "permissions", "approve", "حدود Nova", "لا تستطيع", "الصلاحيات", "موافقة"],
      related: ["start.nova-what", "trouble.nova-unavailable"],
    },
    {
      id: "start.nova-key", topic: "start.help", kind: "about",
      q: { en: "Do I need to set anything up to use Nova?", ar: "هل أحتاج إلى إعداد أي شيء لاستخدام Nova؟" },
      a: {
        en: "No. Nova runs on an AI service that nompany connects once for everybody, so there is no key or account for you to add. Whether your studio has Nova at all depends on its package. If Nova says she is not set up, that is on nompany's side, and sending the question to support is the quickest fix.",
        ar: "لا. تعمل Nova على خدمة ذكاء اصطناعي تربطها nompany مرة واحدة للجميع، فلا يوجد مفتاح أو حساب عليك إضافته. ويعتمد توفر Nova في استوديوك على باقته. وإذا قالت Nova إنها غير مهيأة فالأمر من جهة nompany، وإرسال السؤال إلى الدعم هو أسرع حل.",
      },
      keywords: ["API key", "AI key", "Nova setup", "configure Nova", "مفتاح", "إعداد Nova", "مفتاح الذكاء الاصطناعي"],
      related: ["trouble.nova-unavailable", "start.nova-what"],
    },

    {
      id: "start.live-chat", topic: "start.help", kind: "about",
      q: { en: "How do I talk to a person at nompany?", ar: "كيف أتحدث إلى شخص في nompany؟" },
      a: {
        en: "Where your package includes it, the support chat in the studio connects you with someone from nompany; you can start describing the problem while you wait for them to join. Nova answers straight away from what she knows, while the support chat is a real person. The support chat stays open even when a studio is closed for an unpaid invoice.",
        ar: "حين تشمله باقتك، يوصلك الدعم عبر المحادثة داخل الاستوديو بشخص من nompany؛ ويمكنك البدء في وصف المشكلة أثناء انتظار انضمامه. تجيب Nova فورا مما تعرفه، أما محادثة الدعم فيرد عليها شخص حقيقي. وتبقى محادثة الدعم متاحة حتى عندما يكون الاستوديو مغلقا بسبب فاتورة غير مدفوعة.",
      },
      keywords: ["support", "live chat", "contact", "human", "customer service", "الدعم", "محادثة مباشرة", "تواصل", "خدمة العملاء"],
      related: ["start.nova-what"],
    },
    {
      id: "start.nova-bubble", topic: "start.help", kind: "about",
      q: { en: "What are the little messages next to Nova?", ar: "ما الرسائل الصغيرة بجانب Nova؟" },
      a: {
        en: "Every couple of minutes Nova may show a short note beside her launcher with one real fact about your studio, chosen for the screen you are on, such as an approval waiting on you, an overdue invoice or an item out of stock. Each note is worked out from records you may see. Open takes you to the section, and closing a note hides it until you refresh.",
        ar: "قد تعرض Nova كل بضع دقائق ملاحظة قصيرة بجانب زرها تتضمن حقيقة واحدة عن استوديوك تناسب الشاشة التي أنت فيها، مثل موافقة تنتظرك أو فاتورة متأخرة أو صنف نفد من المخزون. تُستخرج كل ملاحظة من سجلات مسموح لك برؤيتها. زر الفتح ينقلك إلى القسم، وإغلاق الملاحظة يخفيها حتى تحدّث الصفحة.",
      },
      keywords: ["bubble", "tips", "insights", "suggestions", "فقاعة", "نصائح", "ملاحظات", "اقتراحات"],
      related: ["start.nova-what"],
    },

    // =====================================================================
    // ADMIN — People
    // =====================================================================
    {
      id: "admin.people.about", topic: "admin.people", kind: "about",
      open: "administration-members",
      q: { en: "What is the People screen for?", ar: "ما الغرض من شاشة الأشخاص؟" },
      a: {
        en: "People lists everyone in the studio with their role, and the requests from people asking to join. It is where you approve or decline a request, change someone's role, rename them inside this studio, or remove them. Seeing who else is in the studio is a management view, so People is a right a role must be given.",
        ar: "تعرض شاشة الأشخاص كل من في الاستوديو مع دوره، وطلبات من يرغبون في الانضمام. ومنها توافق على طلب أو ترفضه، وتغيّر دور شخص، وتعيد تسميته داخل هذا الاستوديو، أو تزيله. رؤية من في الاستوديو نظرة إدارية، لذا فالأشخاص صلاحية يجب منحها للدور.",
      },
      keywords: ["people", "members", "users", "staff list", "الأشخاص", "الأعضاء", "المستخدمون", "قائمة الموظفين"],
      related: ["admin.people.change-role", "start.approve-join"],
    },
    {
      id: "admin.people.change-role", topic: "admin.people", kind: "howto",
      open: "administration-members",
      q: { en: "How do I change someone's role?", ar: "كيف أغيّر دور شخص ما؟" },
      a: {
        en: "Open People, find the person, and pick a new role. The change takes effect on their next request. You can only give a role whose access you hold yourself.",
        ar: "افتح الأشخاص، وابحث عن الشخص، واختر دورا جديدا. يسري التغيير من طلبه التالي. ولا يمكنك منح دور إلا إذا كنت تملك صلاحياته بنفسك.",
      },
      steps: {
        en: ["Open Settings, then People.", "Find the person in the list.", "Choose their new role and save."],
        ar: ["افتح الإعدادات ثم الأشخاص.", "ابحث عن الشخص في القائمة.", "اختر دوره الجديد واحفظ."],
      },
      keywords: ["change role", "assign role", "promote", "permissions", "تغيير الدور", "تعيين دور", "ترقية", "الصلاحيات"],
      related: ["admin.access.no-escalation", "admin.access.grant"],
    },
    {
      id: "admin.people.remove", topic: "admin.people", kind: "howto",
      open: "administration-members",
      q: { en: "How do I remove someone from the studio?", ar: "كيف أزيل شخصا من الاستوديو؟" },
      a: {
        en: "On People, use Remove beside the person. They lose access to this studio at once, and their seat is freed; their nompany account and any other studios they belong to are untouched. The owner cannot be removed.",
        ar: "في شاشة الأشخاص استخدم إزالة بجانب الشخص. يفقد وصوله إلى هذا الاستوديو فورا ويتحرر مقعده؛ ولا يتأثر حسابه في nompany ولا الاستوديوهات الأخرى التي ينتمي إليها. لا يمكن إزالة المالك.",
      },
      steps: {
        en: ["Open Settings, then People.", "Find the person.", "Click Remove and confirm."],
        ar: ["افتح الإعدادات ثم الأشخاص.", "ابحث عن الشخص.", "اضغط إزالة وأكّد."],
      },
      keywords: ["remove user", "delete member", "offboard", "revoke", "إزالة مستخدم", "حذف عضو", "إلغاء الوصول", "سحب"],
      related: ["start.seat-limit", "account.studios.leave"],
    },
    {
      id: "admin.people.make-admin", topic: "admin.people", kind: "settings",
      q: { en: "What does making someone an Admin do?", ar: "ماذا يعني جعل شخص ما مسؤولا؟" },
      a: {
        en: "The Admin role holds every right in the studio, including rights added in future releases, which is why its list cannot be edited. An Admin may also answer their own approval requests. Only someone who holds everything themselves can make another person an Admin.",
        ar: "يملك دور المسؤول كل صلاحيات الاستوديو، بما فيها الصلاحيات التي تضاف في الإصدارات القادمة، ولهذا لا يمكن تعديل قائمته. ويمكن للمسؤول أيضا الرد على طلبات الموافقة التي قدّمها بنفسه. ولا يستطيع جعل شخص آخر مسؤولا إلا من يملك كل الصلاحيات بنفسه.",
      },
      keywords: ["admin", "administrator", "full access", "superuser", "مسؤول", "مدير النظام", "وصول كامل", "كل الصلاحيات"],
      related: ["admin.access.no-escalation", "admin.approvals.no-self"],
    },
    {
      id: "admin.people.name-in-studio", topic: "admin.people", kind: "about",
      q: { en: "Why does my name look different in each studio?", ar: "لماذا يظهر اسمي مختلفا في كل استوديو؟" },
      a: {
        en: "Each studio keeps its own profile for you: the name you go by there and your role apply only inside that studio. Your personal account details are yours alone and are never shown to the studios you join. Human Resources describes who you are within the company once you are in.",
        ar: "يحتفظ كل استوديو بملف خاص بك: الاسم الذي تُعرف به هناك ودورك ينطبقان داخل ذلك الاستوديو فقط. أما بيانات حسابك الشخصية فهي لك وحدك ولا تظهر أبدا للاستوديوهات التي تنضم إليها. وبعد انضمامك تصف الموارد البشرية من أنت داخل الشركة.",
      },
      keywords: ["name", "alias", "profile", "display name", "الاسم", "الاسم المستعار", "الملف", "اسم العرض"],
      related: ["account.profile.edit"],
    },

    // =====================================================================
    // ADMIN — Access and roles
    // =====================================================================
    {
      id: "admin.access.about", topic: "admin.access", kind: "about", common: true,
      open: "administration-access",
      q: { en: "How do permissions work?", ar: "كيف تعمل الصلاحيات؟" },
      a: {
        en: "A person can do what their role allows and nothing else; with no role, they can do nothing. On the Access screen each role gets a level per area, None, View, Edit or Full, plus extra rights such as approving or seeing pay, and a scope for some areas. The roles themselves are the studio's job titles, named in Human Resources.",
        ar: "يستطيع الشخص فعل ما يسمح به دوره فقط؛ ومن لا دور له لا يستطيع فعل شيء. في شاشة الصلاحيات يحصل كل دور على مستوى لكل مجال: لا شيء أو عرض أو تعديل أو كامل، إضافة إلى صلاحيات إضافية مثل رؤية الرواتب، ونطاق لبعض المجالات. أما الأدوار نفسها فهي المسميات الوظيفية في الاستوديو، وتُسمّى في الموارد البشرية.",
      },
      keywords: ["permissions", "access", "rights", "roles", "security", "صلاحية", "الصلاحيات", "دور", "الوصول", "حقوق"],
      related: ["admin.access.grant", "admin.access.no-escalation", "admin.access.scope"],
    },
    {
      id: "admin.access.grant", topic: "admin.access", kind: "howto",
      open: "administration-access",
      q: { en: "How do I change what a role can do?", ar: "كيف أغيّر ما يستطيع دور ما فعله؟" },
      a: {
        en: "Open Access, choose the role, and set a level for each area it needs. Areas are collapsed, so open the ones you want. Saving changes the access of everyone holding that role at once.",
        ar: "افتح الصلاحيات، واختر الدور، وحدّد مستوى لكل مجال يحتاجه. المجالات مطوية، فافتح ما تريد منها. الحفظ يغيّر صلاحيات كل من يحمل ذلك الدور فورا.",
      },
      steps: {
        en: ["Open Settings, then Access.", "Choose the role and click Edit access.", "For each area, choose None, View, Edit or Full, and tick any extra rights.", "Click Save access."],
        ar: ["افتح الإعدادات ثم الصلاحيات.", "اختر الدور واضغط تعديل الصلاحيات.", "لكل مجال اختر لا شيء أو عرض أو تعديل أو كامل، وحدّد أي صلاحيات إضافية.", "اضغط حفظ الصلاحيات."],
      },
      keywords: ["grant", "edit access", "permission level", "role rights", "منح", "تعديل الصلاحيات", "مستوى الصلاحية", "صلاحيات الدور"],
      related: ["admin.access.no-escalation", "admin.access.check"],
    },
    {
      id: "admin.access.no-escalation", topic: "admin.access", kind: "about",
      q: { en: "Why can't I give someone a permission?", ar: "لماذا لا أستطيع منح شخص ما صلاحية؟" },
      a: {
        en: "Nobody can grant a right they do not hold themselves. You can only put things in a role that you can do yourself, and only give people roles within your own reach, whether on the People screen or when approving a join request. This stops anyone handing out more than they have; ask someone who holds the right, such as an Admin, to grant it.",
        ar: "لا يستطيع أحد منح صلاحية لا يملكها بنفسه. لا يمكنك أن تضع في دور إلا ما تستطيع فعله أنت، ولا أن تمنح الأشخاص إلا أدوارا ضمن نطاقك، سواء من شاشة الأشخاص أو عند الموافقة على طلب انضمام. هذا يمنع أي شخص من منح أكثر مما يملك؛ فاطلب من شخص يملك الصلاحية، مثل المسؤول، أن يمنحها.",
      },
      keywords: ["cannot grant", "escalation", "permission denied", "admin", "لا يمكن المنح", "تصعيد", "رفض الصلاحية", "مسؤول"],
      related: ["admin.access.grant", "admin.people.make-admin"],
    },
    {
      id: "admin.access.scope", topic: "admin.access", kind: "about",
      q: { en: "What do Own records, Department and Everyone mean?", ar: "ماذا تعني سجلاتي والإدارة والجميع؟" },
      a: {
        en: "Some areas take a scope as well as a level. Own records means only what the person created or is assigned; Department means records of people in their department and every department beneath it; Everyone means the whole studio. That is why a manager of a department with sub-departments sees the people in all of them.",
        ar: "تأخذ بعض المجالات نطاقا إلى جانب المستوى. سجلاتي تعني ما أنشأه الشخص أو أُسند إليه فقط؛ والإدارة تعني سجلات الأشخاص في إدارته وكل الإدارات التابعة لها؛ والجميع تعني الاستوديو كله. ولهذا يرى مدير إدارة لها إدارات فرعية الأشخاص فيها جميعا.",
      },
      keywords: ["scope", "own records", "department", "everyone", "visibility", "النطاق", "سجلاتي", "الإدارة", "الجميع"],
      related: ["trouble.cant-find-record", "admin.master.departments"],
    },
    {
      id: "admin.access.check", topic: "admin.access", kind: "howto",
      open: "administration-access",
      q: { en: "How do I check whether someone can do something?", ar: "كيف أتحقق مما إذا كان شخص ما يستطيع فعل شيء؟" },
      a: {
        en: "The Access screen has a Check what someone can do tool. Pick a person and an action, and it answers Allowed or Denied from their actual role. Use it before changing a role when you only need to answer one question.",
        ar: "في شاشة الصلاحيات أداة التحقق مما يستطيع شخص فعله. اختر شخصا وإجراء، فتجيب بمسموح أو مرفوض بناء على دوره الفعلي. استخدمها قبل تغيير دور حين تحتاج فقط إلى الإجابة عن سؤال واحد.",
      },
      steps: {
        en: ["Open Settings, then Access.", "Find Check what someone can do.", "Choose the person and the action, then click Check."],
        ar: ["افتح الإعدادات ثم الصلاحيات.", "ابحث عن التحقق مما يستطيع شخص فعله.", "اختر الشخص والإجراء ثم اضغط تحقق."],
      },
      keywords: ["check access", "test permission", "can they", "verify", "تحقق من الصلاحية", "اختبار", "هل يستطيع", "تأكد"],
      related: ["admin.access.grant"],
    },
    {
      id: "admin.access.roles-departments", topic: "admin.access", kind: "about",
      q: { en: "Why does a role belong to a department?", ar: "لماذا ينتمي الدور إلى إدارة؟" },
      a: {
        en: "A role is a job, and a job sits somewhere in the company: a Manager in Finance and a Manager in Site Execution are two roles and can have different access. The department decides where the role is listed and what a pre-built role starts with. It never limits what the role may reach; Access can give any role any right. Admin is the one studio-wide role every studio has.",
        ar: "الدور وظيفة، والوظيفة لها مكان في الشركة: مدير في المالية ومدير في التنفيذ الميداني دوران مختلفان وقد تختلف صلاحياتهما. تحدد الإدارة مكان إدراج الدور وما يبدأ به الدور الجاهز. ولا تقيّد أبدا ما يستطيع الدور الوصول إليه؛ إذ يمكن لشاشة الصلاحيات منح أي دور أي صلاحية. والمسؤول هو الدور الوحيد على مستوى الاستوديو الموجود في كل استوديو.",
      },
      keywords: ["role department", "job", "role", "studio-wide", "دور الإدارة", "وظيفة", "دور", "على مستوى الاستوديو"],
      related: ["admin.access.library", "admin.master.department-grants-nothing"],
    },
    {
      id: "admin.access.library", topic: "admin.access", kind: "howto",
      open: "hr",
      q: { en: "How do I add a pre-built role?", ar: "كيف أضيف دورا جاهزا؟" },
      a: {
        en: "nompany has a catalogue of job titles for each field of work. In Human Resources, under Roles, choose Add pre-built roles under a department and pick from the jobs that department usually has. Each arrives with a copy of suitable access inside that department's own sections, which you can then adjust in Access. The catalogue needs the studio's field of work and the department's code to know which jobs to offer.",
        ar: "لدى nompany دليل للمسميات الوظيفية لكل مجال عمل. في الموارد البشرية، تحت الأدوار، اختر إضافة أدوار جاهزة تحت إحدى الإدارات واختر من الوظائف المعتادة فيها. يصل كل دور بنسخة من صلاحيات مناسبة داخل أقسام تلك الإدارة، ويمكنك تعديلها بعد ذلك من الصلاحيات. ويحتاج الدليل إلى مجال عمل الاستوديو ورمز الإدارة ليعرف الوظائف التي يعرضها.",
      },
      steps: {
        en: ["Set the field of work in Studio settings, and give the department a code in Master data.", "Open Human Resources, then Roles.", "Under the department, choose Add pre-built roles.", "Search, tick the jobs you want, and add them."],
        ar: ["اضبط مجال العمل في إعدادات الاستوديو، وأعط الإدارة رمزا في البيانات الأساسية.", "افتح الموارد البشرية ثم الأدوار.", "تحت الإدارة اختر إضافة أدوار جاهزة.", "ابحث وحدد الوظائف التي تريدها وأضفها."],
      },
      keywords: ["pre-built role", "role library", "job catalogue", "template role", "دور جاهز", "مكتبة الأدوار", "دليل الوظائف", "قالب دور"],
      related: ["admin.access.custom-role", "start.first-roles"],
    },
    {
      id: "admin.access.custom-role", topic: "admin.access", kind: "about",
      q: { en: "Why does a new role I created have no access?", ar: "لماذا لا يملك الدور الجديد الذي أنشأته أي صلاحية؟" },
      a: {
        en: "A role you name yourself starts with no permissions. Naming a job is a Human Resources task, while deciding what it may do happens on the Access screen, so naming a role can never hand anyone access by accident. Open Access and give the new role what it needs.",
        ar: "الدور الذي تسميه بنفسك يبدأ بلا أي صلاحيات. تسمية الوظيفة مهمة للموارد البشرية، أما تحديد ما تستطيع فعله فيتم في شاشة الصلاحيات، ولذلك لا يمكن أن تمنح تسمية دور أي شخص صلاحية عن طريق الخطأ. افتح الصلاحيات وامنح الدور الجديد ما يحتاجه.",
      },
      keywords: ["custom role", "new role", "empty role", "no permissions", "دور مخصص", "دور جديد", "دور فارغ", "بلا صلاحيات"],
      related: ["admin.access.grant", "admin.access.library"],
    },
    {
      id: "admin.access.new-features", topic: "admin.access", kind: "about",
      q: { en: "When nompany adds a feature, do my roles get it?", ar: "عندما تضيف nompany ميزة جديدة، هل تحصل عليها أدواري؟" },
      a: {
        en: "Sometimes. When a new right follows naturally from one a role already holds, every role holding the old right gains the new one by itself. A right with nothing to follow is not given to anyone automatically; an Admin decides who gets it in Access. A right you deliberately removed from a role stays removed.",
        ar: "أحيانا. حين تنبثق صلاحية جديدة طبيعيا من صلاحية يملكها الدور أصلا، يحصل كل دور يملك الصلاحية القديمة على الجديدة تلقائيا. أما الصلاحية التي لا تتبع صلاحية سابقة فلا تُمنح لأحد تلقائيا؛ بل يقرر المسؤول من يحصل عليها في شاشة الصلاحيات. والصلاحية التي أزلتها عمدا من دور تبقى مزالة.",
      },
      keywords: ["new feature", "update", "new permission", "release", "ميزة جديدة", "تحديث", "صلاحية جديدة", "إصدار"],
      related: ["admin.access.grant"],
    },

    // =====================================================================
    // ADMIN — Master data
    // =====================================================================
    {
      id: "admin.master.about", topic: "admin.master", kind: "about",
      open: "administration-master",
      q: { en: "What is Master data?", ar: "ما هي البيانات الأساسية؟" },
      a: {
        en: "Master data holds the studio's reference lists that several departments read and none owns. Its tabs are Locations, Departments, Numbering, Units, Categories, Cost codes, Notices, API keys, Client tags and Item categories. Changing these needs the Master data right, and numbering and units also need the right to edit studio settings.",
        ar: "تضم البيانات الأساسية القوائم المرجعية للاستوديو التي تقرؤها عدة أقسام ولا يملكها أي منها. تبويباتها: المواقع، والإدارات، والترقيم، والوحدات، والفئات، ورموز التكلفة، والإشعارات، ومفاتيح API، ووسوم العملاء، وفئات الأصناف. يحتاج تغييرها إلى صلاحية البيانات الأساسية، ويحتاج الترقيم والوحدات أيضا إلى صلاحية تعديل إعدادات الاستوديو.",
      },
      keywords: ["master data", "reference data", "lists", "setup", "البيانات الأساسية", "البيانات المرجعية", "القوائم", "الإعداد"],
      related: ["admin.master.locations", "admin.master.departments"],
    },
    {
      id: "admin.master.locations", topic: "admin.master", kind: "howto",
      open: "administration-master",
      q: { en: "How do I add a location?", ar: "كيف أضيف موقعا؟" },
      a: {
        en: "Locations are the places your company works from, used by shifts, permits and other screens. A location is a pin first and an address second: use your device's location, drop a pin, or paste a Google Maps link. People can then open directions to it in Google Maps, Waze or Apple Maps.",
        ar: "المواقع هي الأماكن التي تعمل منها شركتك، وتستخدمها الورديات والتصاريح وشاشات أخرى. الموقع نقطة على الخريطة أولا ثم عنوان: استخدم موقع جهازك، أو ضع دبوسا، أو الصق رابط خرائط Google. ويمكن للناس بعد ذلك فتح الاتجاهات إليه في خرائط Google أو Waze أو خرائط Apple.",
      },
      steps: {
        en: ["Open Settings, then Master data.", "Open the Locations tab and add a location.", "Name it and set its position: Use my location, a pin on the map, or a map link.", "Add a note on how to get there if it helps, then save."],
        ar: ["افتح الإعدادات ثم البيانات الأساسية.", "افتح تبويب المواقع وأضف موقعا.", "سمّه وحدد مكانه: استخدام موقعي، أو دبوس على الخريطة، أو رابط خريطة.", "أضف ملاحظة عن كيفية الوصول إن كانت مفيدة، ثم احفظ."],
      },
      keywords: ["location", "site", "branch", "address", "map", "موقع", "فرع", "عنوان", "خريطة"],
      related: ["admin.master.location-delete"],
    },
    {
      id: "admin.master.location-delete", topic: "admin.master", kind: "troubleshoot",
      q: { en: "Why can't I delete a location?", ar: "لماذا لا أستطيع حذف موقع؟" },
      a: {
        en: "A location that a shift or a permit still names cannot be deleted, and the message says how many are using it. Move those shifts or permits to another place first, then delete the location.",
        ar: "لا يمكن حذف موقع ما زالت وردية أو تصريح يشير إليه، وتوضح الرسالة عدد ما يستخدمه. انقل تلك الورديات أو التصاريح إلى مكان آخر أولا، ثم احذف الموقع.",
      },
      keywords: ["delete location", "in use", "refused", "حذف موقع", "مستخدم", "مرفوض", "لا يمكن الحذف"],
      related: ["admin.master.locations"],
    },
    {
      id: "admin.master.departments", topic: "admin.master", kind: "howto",
      open: "administration-master",
      q: { en: "How do I set up my company's departments?", ar: "كيف أعدّ إدارات شركتي؟" },
      a: {
        en: "Departments are your org chart, kept on the Departments tab of Master data. Each has a name, an optional code, a parent department and a manager, and can say which sections its work lives in. A new studio starts with a few common ones, and setting the field of work offers your trade's usual chart.",
        ar: "الإدارات هي هيكلك التنظيمي، وتُحفظ في تبويب الإدارات في البيانات الأساسية. لكل إدارة اسم ورمز اختياري وإدارة أم ومدير، ويمكن أن تحدد الأقسام التي يجري فيها عملها. يبدأ الاستوديو الجديد ببعض الإدارات الشائعة، وضبط مجال العمل يعرض الهيكل المعتاد في مجالك.",
      },
      steps: {
        en: ["Open Settings, then Master data.", "Open the Departments tab.", "Add a department with its name and code.", "Choose its parent and its manager, and the sections it works in, then save."],
        ar: ["افتح الإعدادات ثم البيانات الأساسية.", "افتح تبويب الإدارات.", "أضف إدارة باسمها ورمزها.", "اختر إدارتها الأم ومديرها والأقسام التي تعمل فيها، ثم احفظ."],
      },
      keywords: ["departments", "org chart", "organisation", "hierarchy", "manager", "الإدارات", "الهيكل التنظيمي", "التسلسل", "مدير"],
      related: ["admin.master.department-grants-nothing", "admin.access.scope"],
    },
    {
      id: "admin.master.department-grants-nothing", topic: "admin.master", kind: "about",
      q: { en: "Does putting someone in a department give them access?", ar: "هل يمنح وضع شخص في إدارة ما صلاحية له؟" },
      a: {
        en: "No. A department grants nothing: roles decide access. The sections named on a department decide where its roles are listed and what a pre-built role starts with. What a department does affect is scope: a manager whose right is limited to their department sees the people in it and in every department beneath it.",
        ar: "لا. الإدارة لا تمنح شيئا: فالأدوار هي التي تحدد الصلاحيات. والأقسام المحددة في الإدارة تحدد مكان إدراج أدوارها وما يبدأ به الدور الجاهز. أما ما تؤثر فيه الإدارة فهو النطاق: المدير المحصورة صلاحيته في إدارته يرى الأشخاص فيها وفي كل الإدارات التابعة لها.",
      },
      keywords: ["department access", "grants nothing", "scope", "org chart", "صلاحية الإدارة", "لا تمنح", "النطاق", "الهيكل"],
      related: ["admin.access.scope", "admin.access.roles-departments"],
    },
    {
      id: "admin.master.department-delete", topic: "admin.master", kind: "troubleshoot",
      q: { en: "Why can't I delete a department?", ar: "لماذا لا أستطيع حذف إدارة؟" },
      a: {
        en: "A department is refused deletion while anything stands in it, such as people or departments beneath it. Move them first. There is no way to undo a deletion afterwards, so records stamped with a deleted department read as unplaced.",
        ar: "يُرفض حذف الإدارة ما دام فيها شيء، مثل أشخاص أو إدارات تابعة لها. انقلهم أولا. ولا توجد طريقة للتراجع عن الحذف بعد ذلك، لذا تظهر السجلات المرتبطة بإدارة محذوفة على أنها غير مصنفة.",
      },
      keywords: ["delete department", "refused", "in use", "حذف إدارة", "مرفوض", "مستخدمة", "لا يمكن الحذف"],
      related: ["admin.master.departments"],
    },
    {
      id: "admin.master.cost-codes", topic: "admin.master", kind: "about",
      open: "administration-master",
      q: { en: "What is the cost code library?", ar: "ما هي مكتبة رموز التكلفة؟" },
      a: {
        en: "It is the studio's standard list of cost codes, so every project names its costs the same way and spending can be compared across projects. A project's breakdown can start from the library, and the code is copied, so editing the library never changes a budget already set. Codes use letters, digits, dots, hyphens, slashes and underscores with no spaces, and each needs a name.",
        ar: "هي القائمة القياسية لرموز التكلفة في الاستوديو، حتى تسمي كل المشاريع تكاليفها بالطريقة نفسها ويمكن مقارنة الإنفاق بين المشاريع. يمكن أن يبدأ تفصيل تكاليف المشروع من المكتبة، ويُنسخ الرمز، لذا فتعديل المكتبة لا يغيّر أبدا ميزانية محددة مسبقا. تتكون الرموز من حروف وأرقام ونقاط وشرطات وخطوط مائلة وشرطات سفلية بلا مسافات، ويحتاج كل رمز إلى اسم.",
      },
      keywords: ["cost codes", "cost library", "WBS", "budget codes", "رموز التكلفة", "مكتبة التكاليف", "رموز الميزانية", "هيكل التكاليف"],
      related: ["admin.master.about"],
    },
    {
      id: "admin.master.numbering", topic: "admin.master", kind: "settings",
      open: "administration-master",
      q: { en: "How do I change how invoice and other reference numbers look?", ar: "كيف أغيّر شكل أرقام الفواتير والمراجع الأخرى؟" },
      a: {
        en: "The Numbering tab in Master data sets the prefix for each kind of document, and shows an example of the next reference. A prefix is a capital letter followed by up to seven capitals or digits. Changing a prefix renumbers nothing already issued, and reference numbers only ever move forward, so a deleted invoice's number is never reissued. The invoice series also carries the default days to pay.",
        ar: "يضبط تبويب الترقيم في البيانات الأساسية البادئة لكل نوع من المستندات، ويعرض مثالا للمرجع التالي. البادئة حرف كبير يليه حتى سبعة أحرف كبيرة أو أرقام. تغيير البادئة لا يعيد ترقيم أي شيء صادر، وأرقام المراجع تتقدم دائما إلى الأمام، فلا يُعاد إصدار رقم فاتورة محذوفة أبدا. ويحمل تسلسل الفواتير أيضا مدة السداد الافتراضية.",
      },
      keywords: ["numbering", "prefix", "invoice number", "reference", "sequence", "الترقيم", "البادئة", "رقم الفاتورة", "المرجع", "التسلسل"],
      related: ["admin.master.about"],
    },
    {
      id: "admin.master.units", topic: "admin.master", kind: "settings",
      open: "administration-master",
      q: { en: "How do I add a unit of measure?", ar: "كيف أضيف وحدة قياس؟" },
      a: {
        en: "Add it on the Units tab of Master data. The standard units come first and cannot be removed, but you can switch off one you never use. A unit is a label only: converting between units, such as a box of twelve into pieces, is not available yet.",
        ar: "أضفها من تبويب الوحدات في البيانات الأساسية. تأتي الوحدات القياسية أولا ولا يمكن حذفها، لكن يمكنك إيقاف وحدة لا تستخدمها. الوحدة مجرد تسمية: فالتحويل بين الوحدات، مثل تحويل علبة من اثنتي عشرة قطعة إلى قطع، غير متاح بعد.",
      },
      keywords: ["units", "UoM", "unit of measure", "kg", "pieces", "الوحدات", "وحدة القياس", "كيلو", "قطعة"],
      related: ["admin.master.about"],
    },
    {
      id: "admin.master.notification-wording", topic: "admin.master", kind: "settings",
      open: "administration-master",
      q: { en: "Can I change the wording of notifications?", ar: "هل يمكنني تغيير صياغة الإشعارات؟" },
      a: {
        en: "Yes, on the Notices tab of Master data, per type and per language. The screen shows the placeholders you may use, such as the person's name, and a title cannot be left blank. Anything you have not changed keeps nompany's own wording, including later improvements to it.",
        ar: "نعم، من تبويب الإشعارات في البيانات الأساسية، لكل نوع ولكل لغة. تعرض الشاشة العناصر النائبة التي يمكنك استخدامها، مثل اسم الشخص، ولا يمكن ترك العنوان فارغا. وكل ما لم تغيّره يحتفظ بصياغة nompany نفسها، بما في ذلك تحسيناتها اللاحقة.",
      },
      keywords: ["notification text", "wording", "template", "message", "نص الإشعار", "الصياغة", "قالب", "رسالة"],
      related: ["start.notifications"],
    },
    {
      id: "admin.master.tags-categories", topic: "admin.master", kind: "about",
      q: { en: "What are client tags and item categories?", ar: "ما هي وسوم العملاء وفئات الأصناف؟" },
      a: {
        en: "Client tags are labels you can put on clients, from a short list the studio keeps; a few starter tags are added the first time you open it. Item categories group your stock items, can sit inside one another, and are used by Point of Sale promotions. Deleting a tag untags nobody, and a category with children cannot be deleted.",
        ar: "وسوم العملاء تسميات يمكنك وضعها على العملاء من قائمة قصيرة يحتفظ بها الاستوديو؛ وتُضاف بعض الوسوم المبدئية أول مرة تفتحها. أما فئات الأصناف فتجمع أصناف مخزونك، ويمكن أن تتداخل، وتستخدمها عروض نقاط البيع. حذف الوسم لا يزيله عن أحد، ولا يمكن حذف فئة لها فئات فرعية.",
      },
      keywords: ["tags", "client tags", "categories", "item categories", "الوسوم", "وسوم العملاء", "الفئات", "فئات الأصناف"],
      related: ["admin.master.about"],
    },

    // =====================================================================
    // ADMIN — Studio settings
    // =====================================================================
    {
      id: "admin.settings.about", topic: "admin.settings", kind: "about",
      open: "administration-settings",
      q: { en: "What is in Studio settings?", ar: "ماذا تضم إعدادات الاستوديو؟" },
      a: {
        en: "Studio settings is how the studio itself is set up: its logo, country, currency and favourite currencies, time zone, default language, VAT rate, working hours, legal information, field of work and service actions, deal flows, employment rules, and the Sections panel. Reading it needs the studio settings view right and changing it needs the edit right. Deleting the studio is also here, for the owner.",
        ar: "إعدادات الاستوديو هي طريقة إعداد الاستوديو نفسه: شعاره ودولته وعملته والعملات المفضلة ومنطقته الزمنية ولغته الافتراضية ونسبة ضريبة القيمة المضافة وساعات العمل والمعلومات القانونية ومجال العمل وإجراءات الخدمة ومسارات الصفقات وقواعد التوظيف ولوحة الأقسام. قراءتها تحتاج صلاحية عرض إعدادات الاستوديو وتغييرها يحتاج صلاحية التعديل. وحذف الاستوديو موجود هنا أيضا للمالك.",
      },
      keywords: ["studio settings", "company settings", "configuration", "preferences", "إعدادات الاستوديو", "إعدادات الشركة", "التهيئة", "التفضيلات"],
      related: ["admin.settings.currency", "admin.settings.timezone", "start.switch-sections"],
    },
    {
      id: "admin.settings.currency", topic: "admin.settings", kind: "settings", common: true,
      open: "administration-settings",
      q: { en: "Where do I set the studio's currency?", ar: "أين أضبط عملة الاستوديو؟" },
      a: {
        en: "In Studio settings, under Currency. A studio created with a country starts on that country's currency; if it shows Not set, amounts appear without one. Set it before anyone asks for approval of a bill, bid or requisition, because approval steps that start at an amount are judged in this currency. Favourite currencies, just below, show today's rate for the few others you deal in.",
        ar: "من إعدادات الاستوديو، تحت العملة. الاستوديو الذي أُنشئ مع تحديد دولة يبدأ بعملة تلك الدولة؛ وإن ظهرت غير مضبوطة فستظهر المبالغ بلا عملة. اضبطها قبل أن يطلب أحد الموافقة على فاتورة أو عطاء أو طلب شراء، لأن خطوات الموافقة التي تبدأ من مبلغ معين تُقاس بهذه العملة. وتعرض العملات المفضلة أسفلها سعر اليوم للعملات القليلة الأخرى التي تتعامل بها.",
      },
      keywords: ["currency", "base currency", "money", "exchange rate", "JOD", "SAR", "العملة", "العملة الأساسية", "سعر الصرف"],
      related: ["start.set-currency-first", "trouble.currency-not-set"],
    },
    {
      id: "admin.settings.timezone", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "Where do I set the time zone?", ar: "أين أضبط المنطقة الزمنية؟" },
      a: {
        en: "In Studio settings, beside the currency. The time zone is the whole studio's, not any one department's: offers, shifts, daily limits and nightly jobs all use it to decide which day it is. No department keeps a time zone of its own. If it is not set, days and opening hours are read in UTC.",
        ar: "من إعدادات الاستوديو، بجانب العملة. المنطقة الزمنية تخص الاستوديو كله لا قسما بعينه: فالعروض والورديات والحدود اليومية والمهام الليلية كلها تستخدمها لتحديد اليوم الحالي. ولا يحتفظ أي قسم بمنطقة زمنية خاصة به. وإذا لم تُضبط، تُحسب الأيام وساعات العمل بتوقيت UTC.",
      },
      keywords: ["time zone", "timezone", "UTC", "clock", "local time", "المنطقة الزمنية", "التوقيت", "الساعة", "التوقيت المحلي"],
      related: ["start.dates", "trouble.wrong-date"],
    },
    {
      id: "admin.settings.language-default", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "What does the studio's language setting do?", ar: "ماذا يفعل إعداد لغة الاستوديو؟" },
      a: {
        en: "It is the studio's default: the language someone sees until they choose their own from the header. It does not force everyone into one language. Anything people typed, such as client or role names, is never translated.",
        ar: "هي اللغة الافتراضية للاستوديو: اللغة التي يراها الشخص إلى أن يختار لغته من الشريط العلوي. ولا تفرض لغة واحدة على الجميع. وما كتبه الناس، مثل أسماء العملاء أو الأدوار، لا يُترجم أبدا.",
      },
      keywords: ["default language", "studio language", "Arabic", "English", "اللغة الافتراضية", "لغة الاستوديو", "العربية", "الإنجليزية"],
      related: ["start.language"],
    },
    {
      id: "admin.settings.field-of-work", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "How do I change the studio's field of work?", ar: "كيف أغيّر مجال عمل الاستوديو؟" },
      a: {
        en: "In Studio settings, under Service actions, change the type of industry and confirm. This re-seeds the service actions from the new trade; actions deals still use are kept as retired rather than removed. Your sections are not switched off: the Sections panel shows a checklist of what the new trade uses, and nothing moves until you press Apply. The Departments tab makes a similar offer.",
        ar: "من إعدادات الاستوديو، تحت إجراءات الخدمة، غيّر نوع الصناعة وأكّد. يعيد ذلك تعبئة إجراءات الخدمة من المجال الجديد؛ وتبقى الإجراءات التي ما زالت صفقات تستخدمها كإجراءات متقاعدة بدلا من حذفها. ولا تُوقف أقسامك: إذ تعرض لوحة الأقسام قائمة بما يستخدمه المجال الجديد، ولا يتغير شيء حتى تضغط تطبيق. ويقدم تبويب الإدارات عرضا مشابها.",
      },
      keywords: ["field of work", "industry", "trade", "service actions", "مجال العمل", "الصناعة", "النشاط", "إجراءات الخدمة"],
      related: ["start.field-of-work", "start.switch-sections"],
    },
    {
      id: "admin.settings.working-hours", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "Where do I set our working hours?", ar: "أين أضبط ساعات عملنا؟" },
      a: {
        en: "In Studio settings, under Working hours, set the hours for each day and turn a day off to mark it closed. Leave can be counted in working days using these hours, which is chosen under Employment rules.",
        ar: "من إعدادات الاستوديو، تحت ساعات العمل، حدد الساعات لكل يوم وأوقف اليوم لتعليمه مغلقا. ويمكن احتساب الإجازات بأيام العمل وفق هذه الساعات، ويُختار ذلك تحت قواعد التوظيف.",
      },
      keywords: ["working hours", "opening hours", "weekend", "work days", "ساعات العمل", "أوقات الدوام", "عطلة نهاية الأسبوع", "أيام العمل"],
      related: ["admin.settings.about"],
    },
    {
      id: "admin.settings.vat", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "Where do I set our VAT rate?", ar: "أين أضبط نسبة ضريبة القيمة المضافة؟" },
      a: {
        en: "In Studio settings, under VAT rate. New quotations, orders, invoices and bills start at this rate, and each can still be changed, for example to 0 for a zero-rated sale. Leave it empty if the company is not registered: then no document carries VAT and there is no tax return.",
        ar: "من إعدادات الاستوديو، تحت نسبة ضريبة القيمة المضافة. تبدأ عروض الأسعار والطلبات والفواتير وفواتير الموردين الجديدة بهذه النسبة، ويمكن تغييرها في كل منها، مثل جعلها 0 لبيع معفى. اتركها فارغة إن لم تكن الشركة مسجلة: وعندها لا يحمل أي مستند ضريبة ولا يوجد إقرار ضريبي.",
      },
      keywords: ["VAT", "tax rate", "sales tax", "tax", "ضريبة القيمة المضافة", "نسبة الضريبة", "ضريبة المبيعات", "ضريبة"],
      related: ["admin.settings.about"],
    },
    {
      id: "admin.settings.logo", topic: "admin.settings", kind: "howto",
      open: "administration-settings",
      q: { en: "How do I add our company logo?", ar: "كيف أضيف شعار شركتنا؟" },
      a: {
        en: "Upload it in Studio settings under Studio logo. It replaces the nompany mark at the top of the studio and on the studio's card in every member's account. JPG, PNG or WebP files up to 2 MB are accepted.",
        ar: "ارفعه من إعدادات الاستوديو تحت شعار الاستوديو. يحل محل علامة nompany في أعلى الاستوديو وعلى بطاقته في حساب كل عضو. تُقبل ملفات JPG أو PNG أو WebP حتى 2 ميغابايت.",
      },
      steps: {
        en: ["Open Settings, then Studio settings.", "Under Studio logo, click Change.", "Choose the image file."],
        ar: ["افتح الإعدادات ثم إعدادات الاستوديو.", "تحت شعار الاستوديو اضغط تغيير.", "اختر ملف الصورة."],
      },
      keywords: ["logo", "branding", "company logo", "image", "الشعار", "الهوية", "شعار الشركة", "صورة"],
      related: ["admin.settings.about"],
    },
    {
      id: "admin.settings.signing-pin", topic: "admin.settings", kind: "settings",
      open: "administration-settings",
      q: { en: "Can we require a PIN on every approval?", ar: "هل يمكننا اشتراط رمز PIN على كل موافقة؟" },
      a: {
        en: "Yes. Switch on PIN on every signature in Studio settings, and every approver must type their personal PIN before signing. With it off, only people who have set a PIN are asked. The PIN makes sure the named person signs, even if a login is shared; each person sets theirs on their account's Security page.",
        ar: "نعم. فعّل رمز PIN على كل توقيع في إعدادات الاستوديو، وسيتعين على كل من يوافق إدخال رمزه الشخصي قبل التوقيع. وعند إيقافه يُطلب الرمز فقط ممن ضبطوا رمزا. يضمن الرمز أن الشخص المسمى هو من يوقّع حتى لو كان حساب الدخول مشتركا؛ ويضبط كل شخص رمزه من صفحة الأمان في حسابه.",
      },
      keywords: ["PIN", "signature", "approval PIN", "sign", "رمز PIN", "توقيع", "رمز الموافقة", "الرقم السري"],
      related: ["account.security.pin", "admin.approvals.answer"],
    },
    {
      id: "admin.settings.delete-studio", topic: "admin.settings", kind: "howto",
      open: "administration-settings",
      q: { en: "How do I delete a studio?", ar: "كيف أحذف استوديو؟" },
      a: {
        en: "The owner can schedule deletion at the bottom of Studio settings. Deletion takes 30 days to finalise; until then nothing changes and everyone keeps working. You can cancel at any point in those 30 days and the studio carries on as if you had never asked. Consider downloading everything first.",
        ar: "يستطيع المالك جدولة الحذف في أسفل إعدادات الاستوديو. يستغرق الحذف 30 يوما حتى يكتمل؛ ولا يتغير شيء قبل ذلك ويواصل الجميع العمل. يمكنك الإلغاء في أي وقت خلال هذه الأيام الثلاثين فيستمر الاستوديو كأنك لم تطلب شيئا. ويُستحسن تنزيل كل البيانات أولا.",
      },
      steps: {
        en: ["Open Settings, then Studio settings.", "Scroll to Delete this studio and click Delete studio.", "Read the confirmation and click Schedule deletion.", "To change your mind, return and click Cancel deletion."],
        ar: ["افتح الإعدادات ثم إعدادات الاستوديو.", "انتقل إلى حذف هذا الاستوديو واضغط حذف الاستوديو.", "اقرأ التأكيد واضغط جدولة الحذف.", "إن غيرت رأيك فارجع واضغط إلغاء الحذف."],
      },
      keywords: ["delete studio", "close account", "remove company", "cancel", "حذف الاستوديو", "إغلاق الحساب", "حذف الشركة", "إلغاء"],
      related: ["account.plan.export", "account.studios.leave"],
    },
    {
      id: "admin.settings.showcase", topic: "admin.settings", kind: "settings",
      q: { en: "What is Appear on nompany's website?", ar: "ما خيار الظهور على موقع nompany؟" },
      a: {
        en: "It lets nompany name your company and show your logo on nompany.com as a customer. Nothing else is shared: no numbers, no people and no link into the studio. Agreeing does not publish anything straight away, since nompany gets in touch first, and turning it off removes you from the site on the next page load.",
        ar: "يسمح لـ nompany بذكر اسم شركتك وعرض شعارها على nompany.com كأحد العملاء. ولا يُشارك أي شيء آخر: لا أرقام ولا أشخاص ولا رابط إلى الاستوديو. الموافقة لا تنشر شيئا فورا، إذ تتواصل nompany معك أولا، وإيقافه يزيلك من الموقع عند تحميل الصفحة التالي.",
      },
      keywords: ["showcase", "website", "customer logo", "publicity", "عرض", "الموقع الإلكتروني", "شعار العميل", "الإعلان"],
      related: ["admin.settings.about"],
    },

    // =====================================================================
    // ADMIN — Approvals
    // =====================================================================
    {
      id: "admin.approvals.about", topic: "admin.approvals", kind: "about", common: true,
      open: "approvals",
      q: { en: "How do approvals work?", ar: "كيف تعمل الموافقات؟" },
      a: {
        en: "An approval exists only because a record asked for one, such as a bill, a requisition, a leave request, a quotation or a payroll run, from its own Request approval or Submit button. It is answered on the Approvals page, which every member can open, in ordered steps set up in Approval settings. You see what is waiting on you at the open step and what you asked for, with every answer so far, and Main shows what is awaiting you too.",
        ar: "لا توجد الموافقة إلا لأن سجلا طلبها، مثل فاتورة مورد أو طلب شراء أو طلب إجازة أو عرض سعر أو مسير رواتب، من زر طلب الموافقة أو الإرسال الخاص به. ويُرد عليها في صفحة الموافقات التي يستطيع كل عضو فتحها، عبر خطوات مرتبة تُضبط في إعدادات الموافقات. ترى ما ينتظرك في الخطوة المفتوحة وما طلبته أنت مع كل الردود حتى الآن، كما تعرض الرئيسية ما ينتظرك.",
      },
      keywords: ["approvals", "approve", "workflow", "sign off", "authorisation", "الموافقات", "موافقة", "سير العمل", "اعتماد"],
      related: ["admin.approvals.answer", "admin.approvals.settings", "admin.approvals.no-self"],
    },
    {
      id: "admin.approvals.answer", topic: "admin.approvals", kind: "howto",
      open: "approvals",
      q: { en: "How do I approve or reject something?", ar: "كيف أوافق على شيء أو أرفضه؟" },
      a: {
        en: "Open Approvals, find the item under what is waiting on you, and answer it. Approving asks for your PIN if you have set one, or always when the studio requires it. Rejecting needs a reason and ends the whole approval, and answers are final.",
        ar: "افتح الموافقات، وابحث عن العنصر ضمن ما ينتظرك، ثم أجب عنه. تطلب الموافقة رمز PIN إن كنت قد ضبطته، أو دائما إن اشترط الاستوديو ذلك. أما الرفض فيحتاج سببا وينهي الموافقة كلها، والردود نهائية.",
      },
      steps: {
        en: ["Open Approvals from the sidebar or from Awaiting you on Main.", "Open the item to see the record behind it.", "Click Approve and enter your PIN if asked, or Reject and give a reason."],
        ar: ["افتح الموافقات من الشريط الجانبي أو من ما ينتظرك في الرئيسية.", "افتح العنصر لرؤية السجل المرتبط به.", "اضغط موافقة وأدخل رمز PIN إن طُلب، أو رفض واذكر السبب."],
      },
      keywords: ["approve", "reject", "sign", "decline", "PIN", "موافقة", "رفض", "توقيع", "اعتماد"],
      related: ["admin.approvals.rejected", "admin.settings.signing-pin"],
    },
    {
      id: "admin.approvals.request", topic: "admin.approvals", kind: "howto",
      q: { en: "How do I ask for approval?", ar: "كيف أطلب موافقة؟" },
      a: {
        en: "Ask from the record itself: a bill has Request approval, a requisition or an expense claim is asked for when you submit it, a quotation has Send for Approval, and your own leave is asked for when you request it. There is no new button on the Approvals page. While one approval is pending, a second request for the same record is refused.",
        ar: "اطلبها من السجل نفسه: لفاتورة المورد زر طلب الموافقة، وطلب الشراء أو مطالبة المصروفات يُطلب عند إرساله، ولعرض السعر زر الإرسال للموافقة، وإجازتك تُطلب عند تقديمها. لا يوجد زر إنشاء في صفحة الموافقات. وما دامت موافقة معلقة فإن طلبا ثانيا للسجل نفسه يُرفض.",
      },
      steps: {
        en: ["Open the record that needs approval.", "Click its Request approval, Submit or Send for Approval button.", "Follow its progress on the Approvals page under what you asked for."],
        ar: ["افتح السجل الذي يحتاج موافقة.", "اضغط زر طلب الموافقة أو الإرسال الخاص به.", "تابع تقدمه في صفحة الموافقات ضمن ما طلبته."],
      },
      keywords: ["request approval", "submit", "send for approval", "ask", "طلب موافقة", "إرسال", "إرسال للموافقة", "طلب"],
      related: ["admin.approvals.not-configured", "admin.approvals.about"],
    },
    {
      id: "admin.approvals.settings", topic: "admin.approvals.settings", kind: "howto",
      open: "approvals-settings",
      q: { en: "How do I set who approves what?", ar: "كيف أحدد من يوافق على ماذا؟" },
      a: {
        en: "In Approvals, open Approval settings. Each type, such as bills, requisitions, leave or payroll, gets ordered steps; a step names specific members and says whether all of them must approve or any one is enough. On types with an amount, a step can start from an amount in the studio's currency, and below every limit nothing is asked. Changing the steps never changes who was asked on an approval already running.",
        ar: "في الموافقات افتح إعدادات الموافقات. يحصل كل نوع، مثل فواتير الموردين وطلبات الشراء والإجازات والرواتب، على خطوات مرتبة؛ تحدد كل خطوة أعضاء بعينهم وما إذا كان يجب أن يوافقوا جميعا أو يكفي أحدهم. وفي الأنواع التي تحمل مبلغا يمكن أن تبدأ الخطوة من مبلغ معين بعملة الاستوديو، وتحت كل الحدود لا يُطلب شيء. وتغيير الخطوات لا يغيّر أبدا من طُلب منه في موافقة جارية.",
      },
      steps: {
        en: ["Open Approvals, then Approval settings.", "Choose the type of approval.", "Add steps in order, naming the members on each.", "For each step choose All must approve or Any one, and a starting amount if it applies.", "Save."],
        ar: ["افتح الموافقات ثم إعدادات الموافقات.", "اختر نوع الموافقة.", "أضف الخطوات بالترتيب مع تسمية الأعضاء في كل خطوة.", "اختر لكل خطوة موافقة الجميع أو أي واحد، ومبلغ البداية إن وُجد.", "احفظ."],
      },
      keywords: ["approval chain", "approval steps", "approvers", "workflow setup", "limit", "سلسلة الموافقات", "خطوات الموافقة", "الموافقون", "إعداد سير العمل", "الحد"],
      related: ["admin.approvals.not-configured", "start.set-currency-first"],
    },
    {
      id: "admin.approvals.no-self", topic: "admin.approvals", kind: "about",
      q: { en: "Can I approve my own request?", ar: "هل يمكنني الموافقة على طلبي؟" },
      a: {
        en: "No, unless you are the owner or an Admin. Whoever asked is taken off any step others share, and a request where they would be the only approver on a step is refused. The owner and Admins are the exception, so a one-person studio can still pay itself and its suppliers. A document revision is stricter still: its reviewer and approver must be two different people, the owner included.",
        ar: "لا، إلا إذا كنت المالك أو مسؤولا. يُستبعد مقدم الطلب من أي خطوة يشاركه فيها آخرون، ويُرفض الطلب إذا كان هو الموافق الوحيد في إحدى الخطوات. المالك والمسؤولون هم الاستثناء، حتى يتمكن استوديو من شخص واحد من دفع رواتبه ومستحقات مورديه. ومراجعة المستندات أشد من ذلك: إذ يجب أن يكون المراجع والموافق شخصين مختلفين حتى لو كان أحدهما المالك.",
      },
      keywords: ["self approval", "own request", "reviewer", "approver", "segregation of duties", "موافقة ذاتية", "طلبي", "المراجع", "الموافق", "فصل المهام"],
      related: ["trouble.cannot-approve-own", "admin.people.make-admin"],
    },
    {
      id: "admin.approvals.not-configured", topic: "admin.approvals.settings", kind: "troubleshoot",
      q: { en: "Requesting approval says nobody is set up to approve it", ar: "طلب الموافقة يقول إنه لا يوجد من يوافق عليه" },
      a: {
        en: "That type of approval has no steps with anyone on them, so nompany refuses the request rather than filing one that would wait for ever. Someone with the right to edit approval settings, usually the owner or an Admin, needs to add at least one step naming who approves it. Then ask again.",
        ar: "لا توجد لهذا النوع من الموافقات خطوات فيها أي شخص، لذا ترفض nompany الطلب بدلا من تسجيل طلب سينتظر إلى الأبد. يجب على شخص لديه صلاحية تعديل إعدادات الموافقات، وعادة المالك أو المسؤول، إضافة خطوة واحدة على الأقل تحدد من يوافق عليه. ثم اطلب مجددا.",
      },
      keywords: ["not configured", "no approver", "cannot request", "refused", "غير مهيأ", "لا يوجد موافق", "لا يمكن الطلب", "مرفوض"],
      related: ["admin.approvals.settings"],
    },
    {
      id: "admin.approvals.rejected", topic: "admin.approvals", kind: "about",
      q: { en: "My request was rejected. What now?", ar: "رُفض طلبي. ماذا أفعل الآن؟" },
      a: {
        en: "A no from anyone at the open step rejects the whole approval, and the reason is shown on it. Fix what the reason names, then ask again from the record; that files a new approval, and the rejected one stays on the Approvals page as a record of what happened. A bill, for example, becomes editable again once turned down.",
        ar: "رفض أي شخص في الخطوة المفتوحة يرفض الموافقة كلها، ويظهر السبب عليها. عالج ما يذكره السبب، ثم اطلب مجددا من السجل؛ فيُسجَّل طلب موافقة جديد، ويبقى الطلب المرفوض في صفحة الموافقات سجلا لما حدث. فمثلا تصبح فاتورة المورد قابلة للتعديل مجددا بعد رفضها.",
      },
      keywords: ["rejected", "declined", "resubmit", "try again", "مرفوض", "رُفض", "إعادة الإرسال", "المحاولة مجددا"],
      related: ["admin.approvals.request"],
    },
    {
      id: "admin.approvals.who-sees", topic: "admin.approvals", kind: "about",
      q: { en: "Who can see all the studio's approvals?", ar: "من يستطيع رؤية كل موافقات الاستوديو؟" },
      a: {
        en: "Everyone sees what is waiting on them and what they asked for. Answering needs no special right: being named on the open step is the authority. Two rights exist for the rest, held by the owner and Admins and given to others in Access: seeing every approval in the studio, and viewing or editing approval settings.",
        ar: "يرى الجميع ما ينتظرهم وما طلبوه. ولا يحتاج الرد إلى صلاحية خاصة: فورود اسمك في الخطوة المفتوحة هو التفويض. وتوجد صلاحيتان لما عدا ذلك، يملكهما المالك والمسؤولون ويمكن منحهما لغيرهم من الصلاحيات: رؤية كل الموافقات في الاستوديو، وعرض إعدادات الموافقات أو تعديلها.",
      },
      keywords: ["all approvals", "overview", "who can see", "approval rights", "كل الموافقات", "نظرة عامة", "من يرى", "صلاحيات الموافقة"],
      related: ["admin.approvals.about"],
    },
    {
      id: "admin.approvals.switched-off", topic: "admin.approvals", kind: "about",
      q: { en: "What is the Departments switched off list on Approvals?", ar: "ما قائمة الأقسام الموقوفة في صفحة الموافقات؟" },
      a: {
        en: "Approvals from departments your studio runs come first. Approvals belonging to a department that has since been switched off are listed beneath, still whole and still answerable, because someone is waiting on a request already made. Switching the department back on moves them up again.",
        ar: "تأتي أولا الموافقات الخاصة بالأقسام التي يعمل بها استوديوك. أما موافقات قسم أُوقف لاحقا فتُدرج أسفلها، كاملة وقابلة للرد، لأن هناك من ينتظر طلبا قُدّم بالفعل. وإعادة تفعيل القسم تنقلها إلى الأعلى من جديد.",
      },
      keywords: ["switched off", "hidden department", "approvals list", "الأقسام الموقوفة", "قسم مخفي", "قائمة الموافقات", "موقوف"],
      related: ["start.switched-off-data"],
    },
    {
      id: "admin.approvals.not-yet", topic: "admin.approvals", kind: "about",
      q: { en: "Can I delegate approvals or send reminders?", ar: "هل يمكنني تفويض الموافقات أو إرسال تذكيرات؟" },
      a: {
        en: "Not yet. Delegation, out-of-office reassignment, reminders and withdrawing a request from the Approvals page are not available yet. Steps can only depend on the amount, not on the supplier, project or cost code. If the only approver on a step leaves the studio, that approval cannot be answered, so keep more than one person on important steps.",
        ar: "ليس بعد. التفويض وإعادة الإسناد أثناء الغياب والتذكيرات وسحب الطلب من صفحة الموافقات غير متاحة بعد. ولا يمكن أن تعتمد الخطوات إلا على المبلغ، لا على المورد أو المشروع أو رمز التكلفة. وإذا غادر الموافق الوحيد في خطوة الاستوديو فلا يمكن الرد على تلك الموافقة، لذا أبقِ أكثر من شخص في الخطوات المهمة.",
      },
      keywords: ["delegate", "reminder", "out of office", "reassign", "withdraw", "تفويض", "تذكير", "خارج المكتب", "إعادة إسناد", "سحب"],
      related: ["admin.approvals.settings"],
    },

    // =====================================================================
    // ACCOUNT — profile and password
    // =====================================================================
    {
      id: "account.profile.edit", topic: "account.profile", kind: "howto",
      q: { en: "How do I update my profile?", ar: "كيف أحدّث ملفي الشخصي؟" },
      a: {
        en: "Open your account page and go to Personal info to change your name, phone and profile picture. These details are yours alone; studios you join keep their own profile for you and never see what is here. A picture helps people recognise you.",
        ar: "افتح صفحة حسابك وانتقل إلى المعلومات الشخصية لتغيير اسمك وهاتفك وصورتك الشخصية. هذه البيانات لك وحدك؛ وتحتفظ الاستوديوهات التي تنضم إليها بملف خاص بك ولا ترى ما هنا أبدا. والصورة تساعد الناس على التعرف عليك.",
      },
      steps: {
        en: ["Click your avatar and choose My account.", "Open Personal info.", "Edit your details or picture and save."],
        ar: ["اضغط صورتك الشخصية واختر حسابي.", "افتح المعلومات الشخصية.", "عدّل بياناتك أو صورتك واحفظ."],
      },
      keywords: ["profile", "personal info", "photo", "avatar", "phone", "الملف الشخصي", "المعلومات الشخصية", "الصورة", "الهاتف"],
      related: ["admin.people.name-in-studio"],
    },
    {
      id: "account.password.change", topic: "account.profile", kind: "howto",
      q: { en: "How do I change my password?", ar: "كيف أغيّر كلمة المرور؟" },
      a: {
        en: "On your account's Security page, enter your current password and then a new one. Changing it signs you out on every device and forgets every trusted device, so you will be asked for a code the next time you sign in elsewhere. If you signed up with Google or Microsoft, you can set a password so you can also sign in with your email.",
        ar: "من صفحة الأمان في حسابك، أدخل كلمة المرور الحالية ثم كلمة جديدة. تغييرها يسجل خروجك من كل الأجهزة وينسى كل الأجهزة الموثوقة، لذا سيُطلب منك رمز في المرة التالية التي تسجل فيها الدخول من مكان آخر. وإن سجلت عبر Google أو Microsoft فيمكنك ضبط كلمة مرور لتتمكن من الدخول ببريدك أيضا.",
      },
      steps: {
        en: ["Open your account page, then Security.", "Click Change password.", "Enter your current password and the new one twice.", "Save, then sign in again on your other devices."],
        ar: ["افتح صفحة حسابك ثم الأمان.", "اضغط تغيير كلمة المرور.", "أدخل كلمة المرور الحالية والجديدة مرتين.", "احفظ، ثم سجّل الدخول مجددا على أجهزتك الأخرى."],
      },
      keywords: ["password", "change password", "reset", "security", "كلمة المرور", "تغيير كلمة المرور", "إعادة تعيين", "الأمان"],
      related: ["account.password.forgot", "trouble.logged-out"],
    },
    {
      id: "account.password.forgot", topic: "account.profile", kind: "howto",
      q: { en: "I forgot my password", ar: "نسيت كلمة المرور" },
      a: {
        en: "Use the forgotten password link on the sign-in page. Enter your email and nompany sends a 6-digit code, which expires in 1 hour; use it to set a new password. For safety, you are then signed out everywhere and sign in again with the new password.",
        ar: "استخدم رابط نسيان كلمة المرور في صفحة تسجيل الدخول. أدخل بريدك فترسل nompany رمزا من 6 أرقام تنتهي صلاحيته خلال ساعة؛ استخدمه لضبط كلمة مرور جديدة. وللأمان يُسجَّل خروجك بعد ذلك من كل مكان وتدخل مجددا بكلمة المرور الجديدة.",
      },
      steps: {
        en: ["On the sign-in page, choose to reset your password.", "Enter your email and click Send code.", "Type the 6-digit code from the email.", "Set your new password and sign in."],
        ar: ["في صفحة تسجيل الدخول اختر إعادة تعيين كلمة المرور.", "أدخل بريدك واضغط إرسال الرمز.", "اكتب الرمز المكون من 6 أرقام من البريد.", "اضبط كلمة المرور الجديدة وسجّل الدخول."],
      },
      keywords: ["forgot password", "reset password", "locked out", "recover", "نسيت كلمة المرور", "إعادة تعيين", "لا أستطيع الدخول", "استعادة"],
      related: ["trouble.email-not-received", "account.password.change"],
    },
    {
      id: "account.calendar", topic: "account.profile", kind: "howto",
      q: { en: "Can I connect my Google or Microsoft calendar?", ar: "هل يمكنني ربط تقويم Google أو Microsoft؟" },
      a: {
        en: "Yes, from your account page under Calendars. Connecting shows your own upcoming events on your account page. Nothing about your calendar is shared with any studio, and you can disconnect it at any time.",
        ar: "نعم، من صفحة حسابك تحت التقويمات. يعرض الربط أحداثك القادمة في صفحة حسابك. ولا يُشارك أي شيء من تقويمك مع أي استوديو، ويمكنك فصله في أي وقت.",
      },
      steps: {
        en: ["Open your account page.", "Under Calendars, choose Connect Google Calendar or Connect Microsoft Calendar.", "Sign in to that provider and allow access."],
        ar: ["افتح صفحة حسابك.", "تحت التقويمات اختر ربط تقويم Google أو ربط تقويم Microsoft.", "سجّل الدخول لدى ذلك المزود واسمح بالوصول."],
      },
      keywords: ["calendar", "Google Calendar", "Outlook", "Microsoft", "events", "التقويم", "تقويم Google", "مواعيد", "أحداث"],
      related: ["account.profile.edit"],
    },

    // =====================================================================
    // ACCOUNT — sign-in security
    // =====================================================================
    {
      id: "account.security.two-factor", topic: "account.security", kind: "howto",
      q: { en: "How do I turn on two-factor sign-in?", ar: "كيف أفعّل التحقق الثنائي عند الدخول؟" },
      a: {
        en: "On your account's Security page, turn on Two-factor sign-in and scan the code with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password. After that, a device you have not trusted asks for a code from your phone instead of your email. You will be given recovery codes; keep them somewhere safe, because they are not shown again.",
        ar: "من صفحة الأمان في حسابك فعّل التحقق الثنائي عند الدخول، وامسح الرمز بتطبيق مصادقة مثل Google Authenticator أو Microsoft Authenticator أو 1Password. بعد ذلك يطلب أي جهاز غير موثوق رمزا من هاتفك بدلا من بريدك. وستحصل على رموز استرداد؛ احفظها في مكان آمن لأنها لن تظهر مجددا.",
      },
      steps: {
        en: ["Open your account page, then Security.", "Under Two-factor sign-in, click Turn on.", "Scan the QR code with your authenticator app, or type the key.", "Enter the 6-digit code the app shows.", "Save your recovery codes, then click I've saved them."],
        ar: ["افتح صفحة حسابك ثم الأمان.", "تحت التحقق الثنائي عند الدخول اضغط تفعيل.", "امسح رمز QR بتطبيق المصادقة أو اكتب المفتاح.", "أدخل الرمز المكون من 6 أرقام الذي يعرضه التطبيق.", "احفظ رموز الاسترداد ثم اضغط حفظتها."],
      },
      keywords: ["2FA", "MFA", "two-factor", "authenticator", "OTP", "التحقق الثنائي", "المصادقة الثنائية", "تطبيق المصادقة", "رمز التحقق"],
      related: ["account.security.recovery", "account.security.sign-in-code"],
    },
    {
      id: "account.security.recovery", topic: "account.security", kind: "troubleshoot",
      q: { en: "I lost the phone with my authenticator app", ar: "فقدت الهاتف الذي عليه تطبيق المصادقة" },
      a: {
        en: "When asked for the code, type one of your recovery codes instead; each works once. Then go to Security, turn two-factor off with another recovery code, and turn it on again with your new phone. The Security page shows how many recovery codes you have left.",
        ar: "عند طلب الرمز اكتب أحد رموز الاسترداد بدلا منه؛ فكل رمز يعمل مرة واحدة. ثم انتقل إلى الأمان وأوقف التحقق الثنائي برمز استرداد آخر، وفعّله مجددا بهاتفك الجديد. وتعرض صفحة الأمان عدد رموز الاسترداد المتبقية لديك.",
      },
      keywords: ["recovery codes", "lost phone", "backup codes", "2FA", "رموز الاسترداد", "فقدت الهاتف", "رموز احتياطية", "التحقق الثنائي"],
      related: ["account.security.two-factor"],
    },
    {
      id: "account.security.sign-in-code", topic: "account.security", kind: "about",
      q: { en: "Why am I asked for a code when I sign in?", ar: "لماذا يُطلب مني رمز عند تسجيل الدخول؟" },
      a: {
        en: "A device you have not trusted asks for a code after your password: by email, or from your authenticator app if two-factor is on. Tick Trust this device for 30 days to skip the code on that browser for a month. Changing your password forgets every trusted device, so the codes return everywhere.",
        ar: "الجهاز غير الموثوق يطلب رمزا بعد كلمة المرور: عبر البريد، أو من تطبيق المصادقة إن كان التحقق الثنائي مفعلا. حدّد الثقة بهذا الجهاز لمدة 30 يوما لتتجاوز الرمز على ذلك المتصفح لمدة شهر. وتغيير كلمة المرور ينسى كل الأجهزة الموثوقة، فتعود الرموز في كل مكان.",
      },
      keywords: ["sign-in code", "verification code", "OTP", "trusted device", "رمز الدخول", "رمز التحقق", "جهاز موثوق", "رمز لمرة واحدة"],
      related: ["account.security.devices", "trouble.email-not-received"],
    },
    {
      id: "account.security.passkeys", topic: "account.security", kind: "howto",
      q: { en: "How do I sign in with a passkey?", ar: "كيف أسجل الدخول بمفتاح مرور؟" },
      a: {
        en: "A passkey lets you sign in with your fingerprint, face or device PIN instead of a password and code. Add one on your account's Security page and give it a name such as Work laptop. It stays on your phone, computer or security key, and you can remove it there at any time.",
        ar: "يتيح لك مفتاح المرور تسجيل الدخول ببصمتك أو وجهك أو رمز جهازك بدلا من كلمة المرور والرمز. أضف واحدا من صفحة الأمان في حسابك وسمّه مثلا حاسوب العمل. يبقى على هاتفك أو حاسوبك أو مفتاح الأمان، ويمكنك إزالته من هناك في أي وقت.",
      },
      steps: {
        en: ["Open your account page, then Security.", "Under Passkeys, click Add a passkey and name it.", "Follow your device's prompt.", "Next time, choose Sign in with a passkey on the sign-in page."],
        ar: ["افتح صفحة حسابك ثم الأمان.", "تحت مفاتيح المرور اضغط إضافة مفتاح مرور وسمّه.", "اتبع تعليمات جهازك.", "في المرة القادمة اختر تسجيل الدخول بمفتاح مرور في صفحة الدخول."],
      },
      keywords: ["passkey", "fingerprint", "Face ID", "passwordless", "مفتاح مرور", "البصمة", "بصمة الوجه", "دون كلمة مرور"],
      related: ["account.security.two-factor"],
    },
    {
      id: "account.security.sessions", topic: "account.security", kind: "howto",
      q: { en: "How do I see where I'm signed in?", ar: "كيف أرى الأماكن التي سجلت الدخول منها؟" },
      a: {
        en: "Your account's Security page lists every device signed in to your account: its type, place and last activity, with This session marked. Click Sign out beside any you do not recognise. There is no limit on how many places you can be signed in.",
        ar: "تعرض صفحة الأمان في حسابك كل جهاز مسجل الدخول إلى حسابك: نوعه ومكانه وآخر نشاط له، مع تمييز هذه الجلسة. اضغط تسجيل الخروج بجانب أي جهاز لا تعرفه. ولا يوجد حد لعدد الأماكن التي يمكنك الدخول منها.",
      },
      steps: {
        en: ["Open your account page, then Security.", "Look under Where you're signed in.", "Click Sign out beside any session you want to end."],
        ar: ["افتح صفحة حسابك ثم الأمان.", "انظر تحت الأماكن التي سجلت الدخول منها.", "اضغط تسجيل الخروج بجانب أي جلسة تريد إنهاءها."],
      },
      keywords: ["sessions", "devices", "signed in", "sign out", "logout", "الجلسات", "الأجهزة", "مسجل الدخول", "تسجيل الخروج"],
      related: ["account.security.devices", "trouble.logged-out"],
    },
    {
      id: "account.security.devices", topic: "account.security", kind: "settings",
      q: { en: "How do I remove a trusted device?", ar: "كيف أزيل جهازا موثوقا؟" },
      a: {
        en: "Trusted devices are listed on your account's Security page. Remove one to make it ask for a code again at its next sign-in, or use Remove all devices. A device is trusted in the browser where you ticked the box, and there is no cap on how many you trust.",
        ar: "تظهر الأجهزة الموثوقة في صفحة الأمان في حسابك. أزل أحدها ليطلب رمزا من جديد عند دخوله التالي، أو استخدم إزالة كل الأجهزة. ويُوثق الجهاز في المتصفح الذي حددت فيه الخيار، ولا يوجد حد لعدد الأجهزة الموثوقة.",
      },
      keywords: ["trusted devices", "remove device", "forget device", "الأجهزة الموثوقة", "إزالة جهاز", "نسيان الجهاز", "جهاز"],
      related: ["account.security.sessions", "account.security.sign-in-code"],
    },
    {
      id: "account.security.pin", topic: "account.security", kind: "howto",
      q: { en: "How do I set my PIN?", ar: "كيف أضبط رمز PIN الخاص بي؟" },
      a: {
        en: "Your PIN is 4 to 8 digits, set on your account's Security page with your account password. It unlocks your screen, signs approvals, and opens a till if you sell at one. It cannot be your password, one digit repeated, or a straight run like 1234.",
        ar: "رمز PIN من 4 إلى 8 أرقام، ويُضبط من صفحة الأمان في حسابك باستخدام كلمة مرور حسابك. يفتح قفل شاشتك، ويوقع الموافقات، ويفتح نقطة البيع إن كنت تبيع عليها. ولا يمكن أن يكون كلمة مرورك، أو رقما واحدا مكررا، أو تسلسلا مثل 1234.",
      },
      steps: {
        en: ["Open your account page, then Security.", "Under Screen lock, click Set PIN.", "Type the PIN twice and your account password, then save."],
        ar: ["افتح صفحة حسابك ثم الأمان.", "تحت قفل الشاشة اضغط ضبط رمز PIN.", "اكتب الرمز مرتين وكلمة مرور حسابك ثم احفظ."],
      },
      keywords: ["PIN", "personal PIN", "signing PIN", "lock code", "رمز PIN", "الرقم السري", "رمز التوقيع", "رمز القفل"],
      related: ["account.security.lock", "admin.settings.signing-pin"],
    },
    {
      id: "account.security.lock", topic: "account.security", kind: "howto",
      q: { en: "How do I lock my screen when I step away?", ar: "كيف أقفل شاشتي عندما أبتعد؟" },
      a: {
        en: "Click the lock button beside your profile in the header. It locks every studio and tab on that device without signing you out, and your PIN brings you back to exactly where you were. You can also choose to lock automatically after a period of no activity, from 5 minutes to 8 hours, on the Security page. Five wrong PINs sign you out.",
        ar: "اضغط زر القفل بجانب ملفك في الشريط العلوي. يقفل كل الاستوديوهات والتبويبات على ذلك الجهاز دون تسجيل خروجك، ويعيدك رمز PIN إلى حيث كنت تماما. ويمكنك أيضا اختيار القفل تلقائيا بعد فترة من عدم النشاط، من 5 دقائق إلى 8 ساعات، من صفحة الأمان. وخمسة رموز خاطئة تسجل خروجك.",
      },
      steps: {
        en: ["Set a PIN on your account's Security page if you have none.", "Click the lock button in the header to lock now.", "Optionally choose Lock after inactivity on the Security page."],
        ar: ["اضبط رمز PIN من صفحة الأمان في حسابك إن لم يكن لديك واحد.", "اضغط زر القفل في الشريط العلوي للقفل الآن.", "اختر إن شئت القفل بعد عدم النشاط من صفحة الأمان."],
      },
      keywords: ["lock screen", "idle", "timeout", "away", "قفل الشاشة", "خمول", "مهلة", "ابتعاد"],
      related: ["account.security.pin", "trouble.locked"],
    },

    // =====================================================================
    // ACCOUNT — your studios
    // =====================================================================
    {
      id: "account.studios.switch", topic: "account.studios", kind: "howto",
      q: { en: "How do I switch between studios?", ar: "كيف أنتقل بين الاستوديوهات؟" },
      a: {
        en: "Go to your account page from the avatar menu. Studios you own are under My Studios, and studios others have given you access to are under My Collaborations; click Open studio on the one you want. Each studio has its own address, so you can also keep them open in separate tabs.",
        ar: "انتقل إلى صفحة حسابك من قائمة الصورة الشخصية. الاستوديوهات التي تملكها تحت استوديوهاتي، والاستوديوهات التي منحك الآخرون الوصول إليها تحت تعاوناتي؛ اضغط فتح الاستوديو على الذي تريده. ولكل استوديو عنوانه الخاص، لذا يمكنك أيضا إبقاؤها مفتوحة في تبويبات منفصلة.",
      },
      steps: {
        en: ["Click your avatar and choose Go to account.", "Find the studio under My Studios or My Collaborations.", "Click Open studio."],
        ar: ["اضغط صورتك الشخصية واختر الذهاب إلى الحساب.", "ابحث عن الاستوديو تحت استوديوهاتي أو تعاوناتي.", "اضغط فتح الاستوديو."],
      },
      keywords: ["switch studio", "change company", "other studio", "account page", "تبديل الاستوديو", "تغيير الشركة", "استوديو آخر", "صفحة الحساب"],
      related: ["account.studios.create", "start.what-is-a-studio"],
    },
    {
      id: "account.studios.create", topic: "account.studios", kind: "howto", common: true,
      q: { en: "How do I create a studio?", ar: "كيف أنشئ استوديو؟" },
      a: {
        en: "From your account page, choose Create a studio. You give the company's name, code and country, answer one question per department about what the company does, choose a package, and review before creating. The country sets the studio's currency, and every answer can be changed later in the Sections panel.",
        ar: "من صفحة حسابك اختر إنشاء استوديو. تُدخل اسم الشركة ورمزها ودولتها، وتجيب عن سؤال لكل قسم حول ما تفعله الشركة، وتختار باقة، ثم تراجع قبل الإنشاء. تحدد الدولة عملة الاستوديو، ويمكن تغيير كل إجابة لاحقا من لوحة الأقسام.",
      },
      steps: {
        en: ["Open your account page and choose Create a studio.", "Company: name, company code, country and, optionally, city and the systems you already run.", "What you do: answer yes or no for each department, narrowing a yes to the parts you use.", "Plan: choose a package.", "Review the departments that will be on and off, then click Create studio."],
        ar: ["افتح صفحة حسابك واختر إنشاء استوديو.", "الشركة: الاسم ورمز الشركة والدولة، واختياريا المدينة والأنظمة التي تستخدمها حاليا.", "ما تفعله: أجب بنعم أو لا لكل قسم، مع حصر الإجابة بنعم في الأجزاء التي تستخدمها.", "الباقة: اختر باقة.", "راجع الأقسام التي ستكون مفعلة وموقوفة، ثم اضغط إنشاء الاستوديو."],
      },
      keywords: ["create studio", "new company", "new workspace", "sign up", "إنشاء استوديو", "شركة جديدة", "مساحة عمل جديدة", "تسجيل"],
      related: ["account.studios.free-limit", "start.choose-at-creation", "start.first-steps-checklist"],
    },
    {
      id: "account.studios.free-limit", topic: "account.studios", kind: "about",
      q: { en: "How many studios can I own?", ar: "كم استوديو يمكنني امتلاكه؟" },
      a: {
        en: "You can own more than one studio, but no more than two on the free package. Every new studio starts on the free package, so to own a third, one of your studios needs to be on a paid package first. There is no limit on how many studios you can be a member of.",
        ar: "يمكنك امتلاك أكثر من استوديو، لكن ليس أكثر من اثنين على الباقة المجانية. يبدأ كل استوديو جديد على الباقة المجانية، لذا لتمتلك استوديو ثالثا يجب أن يكون أحد استوديوهاتك على باقة مدفوعة أولا. ولا يوجد حد لعدد الاستوديوهات التي يمكنك أن تكون عضوا فيها.",
      },
      keywords: ["studio limit", "how many studios", "free studios", "multiple companies", "حد الاستوديوهات", "كم استوديو", "استوديوهات مجانية", "عدة شركات"],
      related: ["account.studios.create", "account.plan.packages"],
    },
    {
      id: "account.studios.rename", topic: "account.studios", kind: "settings",
      q: { en: "How do I rename my studio or change its link?", ar: "كيف أعيد تسمية استوديوي أو أغيّر رابطه؟" },
      a: {
        en: "Only the owner can, from the studio's card under My Studios on the account page. A new name or link takes effect at midnight. After a link change the old link no longer works, so share the new one, including the company code people use to join.",
        ar: "لا يستطيع ذلك إلا المالك، من بطاقة الاستوديو تحت استوديوهاتي في صفحة الحساب. يسري الاسم أو الرابط الجديد عند منتصف الليل. وبعد تغيير الرابط يتوقف الرابط القديم عن العمل، فشارك الجديد، بما في ذلك رمز الشركة الذي يستخدمه الناس للانضمام.",
      },
      keywords: ["rename studio", "change link", "company code", "studio name", "إعادة تسمية", "تغيير الرابط", "رمز الشركة", "اسم الاستوديو"],
      related: ["start.company-code"],
    },
    {
      id: "account.studios.leave", topic: "account.studios", kind: "about",
      q: { en: "How do I leave a studio or hand it to someone else?", ar: "كيف أغادر استوديو أو أنقله إلى شخص آخر؟" },
      a: {
        en: "There is no leave button for members; ask someone who manages People in that studio to remove you. Transferring a studio's ownership to another person is not available yet. An owner who no longer wants a studio can schedule its deletion in Studio settings.",
        ar: "لا يوجد زر مغادرة للأعضاء؛ اطلب من شخص يدير الأشخاص في ذلك الاستوديو إزالتك. ونقل ملكية الاستوديو إلى شخص آخر غير متاح بعد. ويمكن للمالك الذي لم يعد يريد الاستوديو جدولة حذفه من إعدادات الاستوديو.",
      },
      keywords: ["leave studio", "transfer ownership", "new owner", "quit", "مغادرة الاستوديو", "نقل الملكية", "مالك جديد", "الخروج"],
      related: ["admin.people.remove", "admin.settings.delete-studio"],
    },

    // =====================================================================
    // ACCOUNT — packages and payment
    // =====================================================================
    {
      id: "account.plan.packages", topic: "account.plan", kind: "about",
      q: { en: "What does my package include?", ar: "ماذا تشمل باقتي؟" },
      a: {
        en: "A studio's package, and its tier, decide how many members it may have and which extras it gets, such as Nova, the support chat, some dashboard widgets and parts of Point of Sale. Packages are priced by region in your region's currency. Standard is free for up to four people for its first three months; larger teams need a paid package, and Large is set up with nompany's team.",
        ar: "تحدد باقة الاستوديو ومستواها عدد الأعضاء المسموح به والإضافات التي يحصل عليها، مثل Nova ومحادثة الدعم وبعض عناصر لوحات المعلومات وأجزاء من نقاط البيع. تُسعَّر الباقات حسب المنطقة وبعملتها. الباقة القياسية مجانية لما يصل إلى أربعة أشخاص في أشهرها الثلاثة الأولى؛ وتحتاج الفرق الأكبر إلى باقة مدفوعة، وتُعدّ الباقة الكبيرة مع فريق nompany.",
      },
      keywords: ["package", "plan", "tier", "pricing", "subscription", "الباقة", "الخطة", "المستوى", "الأسعار", "الاشتراك"],
      related: ["account.plan.upgrade", "account.plan.change-keeps-data"],
    },
    {
      id: "account.plan.free-period", topic: "account.plan", kind: "about",
      q: { en: "What happens when the free months end?", ar: "ماذا يحدث عند انتهاء الأشهر المجانية؟" },
      a: {
        en: "Only the Standard package has a free period, and a banner warns you when it ends within 14 days. Paying at any time ends the free months and starts the paid package that day. If nothing is paid by the end, the studio becomes view-only and follows the same unpaid steps as a late invoice.",
        ar: "الباقة القياسية وحدها لها فترة مجانية، ويظهر شريط تنبيه حين تنتهي خلال 14 يوما. الدفع في أي وقت ينهي الأشهر المجانية ويبدأ الباقة المدفوعة من ذلك اليوم. وإن لم يُدفع شيء عند نهايتها يصبح الاستوديو للعرض فقط ويتبع خطوات عدم الدفع نفسها التي تتبعها الفاتورة المتأخرة.",
      },
      keywords: ["free trial", "free period", "trial end", "Standard", "فترة تجريبية", "الفترة المجانية", "انتهاء التجربة", "القياسية"],
      related: ["account.plan.unpaid", "account.plan.upgrade"],
    },
    {
      id: "account.plan.upgrade", topic: "account.plan", kind: "howto",
      q: { en: "How do I upgrade my package?", ar: "كيف أرقّي باقتي؟" },
      a: {
        en: "The owner clicks Upgrade in the studio header or on the studio's card on the account page, where the package offers it. Pick a package, size, tier and monthly or yearly billing; the price shows in your region's currency with tax. This sends a request rather than charging you: you then pay by bank transfer, and the studio moves onto the new package once nompany confirms the payment.",
        ar: "يضغط المالك زر الترقية في الشريط العلوي للاستوديو أو على بطاقة الاستوديو في صفحة الحساب حين تتيحه الباقة. اختر الباقة والحجم والمستوى والفوترة الشهرية أو السنوية؛ ويظهر السعر بعملة منطقتك شاملا الضريبة. هذا يرسل طلبا ولا يخصم منك شيئا: ثم تدفع بالتحويل البنكي، وينتقل الاستوديو إلى الباقة الجديدة بعد أن تؤكد nompany الدفعة.",
      },
      steps: {
        en: ["Click Upgrade in the studio header.", "Choose the package, size, tier and billing period.", "Send the request.", "Pay using the bank transfer details shown, then tell nompany you have sent it."],
        ar: ["اضغط ترقية في الشريط العلوي للاستوديو.", "اختر الباقة والحجم والمستوى وفترة الفوترة.", "أرسل الطلب.", "ادفع باستخدام بيانات التحويل البنكي المعروضة، ثم أخبر nompany بأنك أرسلته."],
      },
      keywords: ["upgrade", "change plan", "buy", "more users", "ترقية", "تغيير الباقة", "شراء", "مستخدمون أكثر"],
      related: ["account.plan.bank-transfer", "account.plan.packages"],
    },
    {
      id: "account.plan.bank-transfer", topic: "account.plan", kind: "howto",
      q: { en: "How do I pay by bank transfer?", ar: "كيف أدفع بالتحويل البنكي؟" },
      a: {
        en: "Open Billing on your account page, or the upgrade dialog once a package is requested. It shows the amount, the bank accounts for your currency and a transfer reference to quote. After sending the money, click I've sent the transfer and fill in the amount, currency, date and the bank's reference. A person at nompany checks and confirms it, and while your claim is open a closed studio is reopened for a short time.",
        ar: "افتح الفوترة في صفحة حسابك، أو نافذة الترقية بعد طلب باقة. تعرض المبلغ والحسابات البنكية لعملتك ومرجع تحويل تذكره. بعد إرسال المال اضغط أرسلت التحويل واملأ المبلغ والعملة والتاريخ ومرجع البنك. يتحقق شخص في nompany منه ويؤكده، وخلال فترة بقاء مطالبتك مفتوحة يُعاد فتح الاستوديو المغلق لمدة قصيرة.",
      },
      steps: {
        en: ["Open your account page, then Billing.", "Note the amount, the account for your currency and the transfer reference.", "Make the transfer from your bank, quoting the reference.", "Click I've sent the transfer and fill in its details.", "Wait for nompany to confirm; you can withdraw the claim until it is answered."],
        ar: ["افتح صفحة حسابك ثم الفوترة.", "دوّن المبلغ والحساب الخاص بعملتك ومرجع التحويل.", "نفّذ التحويل من بنكك مع ذكر المرجع.", "اضغط أرسلت التحويل واملأ بياناته.", "انتظر تأكيد nompany؛ ويمكنك سحب المطالبة إلى أن يُرد عليها."],
      },
      keywords: ["bank transfer", "wire", "pay", "payment", "IBAN", "billing", "تحويل بنكي", "دفع", "حوالة", "الفوترة"],
      related: ["account.plan.card", "account.plan.unpaid"],
    },
    {
      id: "account.plan.card", topic: "account.plan", kind: "about",
      q: { en: "Can I pay by card, Apple Pay or Google Pay?", ar: "هل يمكنني الدفع بالبطاقة أو Apple Pay أو Google Pay؟" },
      a: {
        en: "Not yet. Online payment by card, Apple Pay or Google Pay is not available yet; for now every payment is made by bank transfer. Bank transfer will stay available after online payment arrives.",
        ar: "ليس بعد. الدفع الإلكتروني بالبطاقة أو Apple Pay أو Google Pay غير متاح بعد؛ وحاليا تتم كل المدفوعات بالتحويل البنكي. وسيبقى التحويل البنكي متاحا بعد وصول الدفع الإلكتروني.",
      },
      keywords: ["card", "credit card", "Apple Pay", "Google Pay", "online payment", "بطاقة", "بطاقة ائتمان", "الدفع الإلكتروني", "دفع أونلاين"],
      related: ["account.plan.bank-transfer"],
    },
    {
      id: "account.plan.unpaid", topic: "account.plan", kind: "about",
      q: { en: "What happens if we don't pay on time?", ar: "ماذا يحدث إذا لم ندفع في الوقت المحدد؟" },
      a: {
        en: "For the first 19 days after payment falls due, everything works as normal. From day 20 the studio is closed: people can view and export but not create or change anything. From day 90 it is shut down: members are locked out and only the owner can read, pay and download everything. Paying at any point before deletion restores the studio at once, and the owner is emailed before each step.",
        ar: "خلال أول 19 يوما بعد استحقاق الدفع يعمل كل شيء كالمعتاد. ومن اليوم العشرين يُغلق الاستوديو: يستطيع الناس العرض والتصدير دون إنشاء أو تغيير أي شيء. ومن اليوم التسعين يُوقف: يُمنع الأعضاء من الدخول ولا يستطيع إلا المالك القراءة والدفع وتنزيل كل البيانات. والدفع في أي وقت قبل الحذف يعيد الاستوديو فورا، ويُرسل بريد إلى المالك قبل كل خطوة.",
      },
      keywords: ["unpaid", "overdue", "closed", "shut down", "late payment", "غير مدفوع", "متأخر", "مغلق", "موقوف", "تأخر الدفع"],
      related: ["trouble.studio-closed", "account.plan.bank-transfer"],
    },
    {
      id: "account.plan.change-keeps-data", topic: "account.plan", kind: "about",
      q: { en: "What happens to our data if our package changes?", ar: "ماذا يحدث لبياناتنا إذا تغيرت باقتنا؟" },
      a: {
        en: "Nothing you have is taken away. A package limit applies when something new is created, never when existing records are read. For example, a studio that moves to a package without advanced promotions keeps every offer it already has, and they keep charging correctly at the till; only creating new ones of that kind stops.",
        ar: "لا يُنتزع منك شيء تملكه. يُطبق حد الباقة عند إنشاء شيء جديد، ولا يُطبق أبدا عند قراءة السجلات الموجودة. فمثلا الاستوديو الذي ينتقل إلى باقة لا تشمل العروض المتقدمة يحتفظ بكل عروضه الحالية، وتظل تُحتسب بشكل صحيح في نقطة البيع؛ وإنما يتوقف إنشاء عروض جديدة من ذلك النوع فقط.",
      },
      keywords: ["downgrade", "plan change", "data", "keep", "limits", "تخفيض الباقة", "تغيير الباقة", "البيانات", "الاحتفاظ", "الحدود"],
      related: ["account.plan.packages", "account.plan.export"],
    },
    {
      id: "account.plan.export", topic: "account.plan", kind: "about",
      q: { en: "How do I download all of my studio's data?", ar: "كيف أنزّل كل بيانات استوديوي؟" },
      a: {
        en: "The owner can download everything as one file from the studio's card on the account page. It contains every record in every section, including switched-off ones, plus members, roles, settings and a list of uploaded files with where each is served from. Secrets such as API keys are left out, and the files themselves are listed rather than included. It works even when the studio is closed or shut down.",
        ar: "يستطيع المالك تنزيل كل شيء في ملف واحد من بطاقة الاستوديو في صفحة الحساب. يحتوي على كل سجل في كل قسم، بما فيها الأقسام الموقوفة، إضافة إلى الأعضاء والأدوار والإعدادات وقائمة بالملفات المرفوعة مع عنوان كل منها. وتُستبعد البيانات السرية مثل مفاتيح API، وتُدرج الملفات نفسها في قائمة دون تضمينها. ويعمل ذلك حتى عندما يكون الاستوديو مغلقا أو موقوفا.",
      },
      keywords: ["export", "download", "backup", "all data", "تصدير", "تنزيل", "نسخة احتياطية", "كل البيانات"],
      related: ["admin.settings.delete-studio", "reports.export"],
    },

    // =====================================================================
    // SOMETHING ISN'T WORKING
    // =====================================================================
    {
      id: "trouble.section-missing", topic: "trouble", kind: "troubleshoot", common: true,
      q: { en: "I can't see a section", ar: "لا أرى قسما معينا" },
      a: {
        en: "There are three usual reasons. The studio may have switched that section off in Studio settings, which hides it from everyone. Your role may not hold the right to open it, which an admin can change in Access. Or the page may say the section isn't open yet, which means it has no screen yet and nobody can open it early.",
        ar: "هناك ثلاثة أسباب معتادة. ربما أوقف الاستوديو ذلك القسم في إعدادات الاستوديو، وهذا يخفيه عن الجميع. أو لا يملك دورك صلاحية فتحه، ويمكن للمسؤول تغيير ذلك من الصلاحيات. أو تقول الصفحة إن القسم غير متاح بعد، وهذا يعني أنه لا شاشة له حتى الآن ولا يستطيع أحد فتحه مبكرا.",
      },
      keywords: ["missing section", "can't see", "hidden", "not in sidebar", "no access", "قسم مفقود", "لا أرى", "مخفي", "غير موجود في القائمة", "لا وصول"],
      related: ["start.switch-sections", "admin.access.about", "trouble.nothing-shared"],
    },
    {
      id: "trouble.nothing-shared", topic: "trouble", kind: "troubleshoot",
      q: { en: "It says nothing has been shared with me yet", ar: "تظهر رسالة أنه لم يُشارك معي شيء بعد" },
      a: {
        en: "You are a member of the studio, but your role gives you no sections, or you have no role at all. Ask an admin of the studio to give you a role, or to grant your role the sections you need from Access.",
        ar: "أنت عضو في الاستوديو، لكن دورك لا يمنحك أي أقسام، أو ليس لديك دور أصلا. اطلب من مسؤول الاستوديو منحك دورا، أو منح دورك الأقسام التي تحتاجها من الصلاحيات.",
      },
      keywords: ["nothing shared", "empty", "no sections", "no role", "لم يُشارك شيء", "فارغ", "لا أقسام", "لا دور"],
      related: ["start.new-member-sees-nothing", "trouble.section-missing"],
    },
    {
      id: "trouble.not-a-member", topic: "trouble", kind: "troubleshoot",
      q: { en: "It says I'm not in this studio", ar: "تظهر رسالة أنني لست في هذا الاستوديو" },
      a: {
        en: "You are signed in, but not as a member of the studio at that address. If you have asked to join, an admin of that studio still needs to approve your request. If you were removed, or you are signed in with a different account than usual, sign in with the right one or ask to join again.",
        ar: "أنت مسجل الدخول، لكن لست عضوا في الاستوديو الموجود على هذا العنوان. إن كنت قد طلبت الانضمام فما زال على مسؤول ذلك الاستوديو الموافقة على طلبك. وإن كنت قد أُزلت، أو سجلت الدخول بحساب غير حسابك المعتاد، فادخل بالحساب الصحيح أو اطلب الانضمام مجددا.",
      },
      keywords: ["not a member", "not in studio", "forbidden", "wrong account", "لست عضوا", "لست في الاستوديو", "ممنوع", "حساب خاطئ"],
      related: ["start.join-studio", "start.join-pending"],
    },
    {
      id: "trouble.button-missing", topic: "trouble", kind: "troubleshoot", common: true,
      q: { en: "A button is missing or greyed out", ar: "زر مفقود أو معطّل" },
      a: {
        en: "Most often your role can view the record but not create, edit, delete or approve it, so the button is hidden; an admin can change that in Access. Sometimes a rule blocks the action instead: you cannot approve your own request, a finished record may be locked, Finance may have closed the month the date falls in, the studio's currency may not be set, or the studio may be closed for an unpaid invoice. Where a rule applies, the screen usually says which one in place of the button.",
        ar: "في الغالب يسمح دورك بعرض السجل لا بإنشائه أو تعديله أو حذفه أو الموافقة عليه، فيُخفى الزر؛ ويمكن للمسؤول تغيير ذلك من الصلاحيات. وأحيانا تمنع قاعدة ما الإجراء: فلا يمكنك الموافقة على طلبك، وقد يكون السجل المكتمل مقفلا، وربما أغلقت المالية الشهر الذي يقع فيه التاريخ، أو لم تُضبط عملة الاستوديو، أو أُغلق الاستوديو بسبب فاتورة غير مدفوعة. وحين تنطبق قاعدة ما تذكرها الشاشة عادة مكان الزر.",
      },
      keywords: ["button missing", "greyed out", "disabled", "can't click", "no edit", "زر مفقود", "معطل", "رمادي", "لا يمكن الضغط", "لا يمكن التعديل"],
      related: ["admin.access.about", "trouble.closed-period", "trouble.currency-not-set"],
    },
    {
      id: "trouble.cannot-approve-own", topic: "trouble", kind: "troubleshoot",
      q: { en: "Why can't I approve this request?", ar: "لماذا لا أستطيع الموافقة على هذا الطلب؟" },
      a: {
        en: "You can only answer an approval when you are named on its open step; a later step waits until the earlier one is done. You also cannot approve a request you made yourself unless you are the owner or an Admin. If a PIN is asked and you have none, set one on your account's Security page.",
        ar: "لا يمكنك الرد على موافقة إلا إذا ورد اسمك في خطوتها المفتوحة؛ فالخطوة اللاحقة تنتظر اكتمال السابقة. ولا يمكنك الموافقة على طلب قدمته بنفسك إلا إذا كنت المالك أو مسؤولا. وإذا طُلب رمز PIN وليس لديك واحد فاضبطه من صفحة الأمان في حسابك.",
      },
      keywords: ["can't approve", "own request", "not my turn", "PIN", "لا أستطيع الموافقة", "طلبي", "ليس دوري", "رمز PIN"],
      related: ["admin.approvals.no-self", "account.security.pin"],
    },
    {
      id: "trouble.closed-period", topic: "trouble", kind: "troubleshoot",
      q: { en: "It says the period is closed", ar: "تظهر رسالة أن الفترة مغلقة" },
      a: {
        en: "Finance has closed the month that the record's date falls in, so nothing more can be posted to it. The document itself still exists; only the posting is refused. Use a date in an open month if that is right, or ask whoever closes periods in Finance to reopen the month, which needs a reason.",
        ar: "أغلقت المالية الشهر الذي يقع فيه تاريخ السجل، لذا لا يمكن ترحيل أي شيء إليه. المستند نفسه ما زال موجودا؛ وإنما يُرفض الترحيل فقط. استخدم تاريخا في شهر مفتوح إن كان ذلك صحيحا، أو اطلب ممن يغلق الفترات في المالية إعادة فتح الشهر، وهذا يحتاج إلى سبب.",
      },
      keywords: ["closed period", "locked month", "posting refused", "month end", "فترة مغلقة", "شهر مقفل", "رفض الترحيل", "نهاية الشهر"],
      related: ["trouble.button-missing"],
    },
    {
      id: "trouble.currency-not-set", topic: "trouble", kind: "troubleshoot",
      q: { en: "It says the studio's currency must be set", ar: "تظهر رسالة أنه يجب ضبط عملة الاستوديو" },
      a: {
        en: "An amount cannot be judged against an approval limit without knowing which currency it is in. Someone with the right to edit studio settings needs to set the studio's currency in Studio settings. Then try again.",
        ar: "لا يمكن مقارنة مبلغ بحد موافقة دون معرفة عملته. يجب على شخص لديه صلاحية تعديل إعدادات الاستوديو ضبط عملة الاستوديو من إعدادات الاستوديو. ثم حاول مجددا.",
      },
      keywords: ["currency not set", "no currency", "approval blocked", "العملة غير مضبوطة", "لا توجد عملة", "الموافقة معطلة", "عملة"],
      related: ["admin.settings.currency", "start.set-currency-first"],
    },
    {
      id: "trouble.nova-unavailable", topic: "trouble", kind: "troubleshoot", common: true,
      q: { en: "Nova says she isn't available or isn't set up", ar: "تقول Nova إنها غير متاحة أو غير مهيأة" },
      a: {
        en: "There are two different messages. \"Not in your plan\" means your studio's package does not include Nova's answers about your data; the studio owner can ask about upgrading. \"Not set up\" means the AI service behind Nova is not connected on nompany's side, which is nothing you can fix in your studio; send it to support. These help topics keep working while Nova's data answers are unavailable.",
        ar: "هناك رسالتان مختلفتان. \"غير مشمولة في باقتك\" تعني أن باقة استوديوك لا تشمل إجابات Nova عن بياناتك، ويمكن لمالك الاستوديو الاستفسار عن الترقية. و\"غير مهيأة\" تعني أن خدمة الذكاء الاصطناعي التي تعمل عليها Nova غير مربوطة من جهة nompany، وليس بإمكانك إصلاح ذلك من استوديوك، فأرسل الأمر إلى الدعم. وتبقى مواضيع المساعدة هذه تعمل ما دامت إجابات Nova عن البيانات غير متاحة.",
      },
      keywords: ["Nova not working", "not in plan", "not set up", "unavailable", "Nova لا تعمل", "غير مشمولة في الباقة", "غير مهيأة"],
      related: ["start.nova-key", "account.plan.upgrade"],
    },

    {
      id: "trouble.not-live", topic: "trouble", kind: "troubleshoot",
      q: { en: "The page isn't updating when others make changes", ar: "الصفحة لا تتحدث عندما يجري الآخرون تغييرات" },
      a: {
        en: "If a banner says you are not receiving live updates, the connection dropped and nompany is reconnecting; this usually fixes itself within seconds. If it does not, check your internet connection and reload the page. Reloading also brings you everything that changed while you were disconnected.",
        ar: "إذا ظهر شريط يقول إنك لا تتلقى التحديثات المباشرة، فقد انقطع الاتصال وتعيد nompany الاتصال؛ وعادة يُصلح ذلك نفسه خلال ثوان. وإن لم يحدث فتحقق من اتصالك بالإنترنت وأعد تحميل الصفحة. وإعادة التحميل تجلب لك أيضا كل ما تغيّر أثناء انقطاعك.",
      },
      keywords: ["not updating", "live updates", "stale", "reconnecting", "لا تتحدث", "التحديثات المباشرة", "قديمة", "إعادة الاتصال"],
      related: ["start.live-updates"],
    },
    {
      id: "trouble.logged-out", topic: "trouble", kind: "troubleshoot",
      q: { en: "I was logged out", ar: "تم تسجيل خروجي" },
      a: {
        en: "A few things sign you out. Changing your password signs you out everywhere, and a session can be signed out from another of your devices, in which case the sign-in page says so. Five wrong PINs on a locked screen also sign you out, and a suspended account cannot sign in. Sign in again; if you did not end the session yourself, check where you are signed in on the Security page and change your password.",
        ar: "هناك أمور قليلة تسجل خروجك. تغيير كلمة المرور يسجل خروجك من كل مكان، ويمكن إنهاء الجلسة من جهاز آخر من أجهزتك، وفي هذه الحالة تخبرك صفحة الدخول بذلك. كما أن خمسة رموز PIN خاطئة على شاشة مقفلة تسجل خروجك، والحساب الموقوف لا يستطيع الدخول. سجّل الدخول مجددا؛ وإن لم تنه الجلسة بنفسك فراجع أماكن دخولك في صفحة الأمان وغيّر كلمة مرورك.",
      },
      keywords: ["logged out", "signed out", "session expired", "kicked out", "تسجيل الخروج", "خرجت", "انتهت الجلسة", "طُردت"],
      related: ["account.security.sessions", "trouble.locked"],
    },
    {
      id: "trouble.locked", topic: "trouble", kind: "troubleshoot",
      q: { en: "My screen is locked and asks for a PIN", ar: "شاشتي مقفلة وتطلب رمز PIN" },
      a: {
        en: "Your screen was locked, by you or after the idle time you chose, and nothing was lost: type your PIN to carry on where you left off. If you have forgotten it, choose Sign out instead and sign in again with your password. Five wrong PINs sign you out.",
        ar: "قُفلت شاشتك، بواسطتك أو بعد مدة الخمول التي اخترتها، ولم يضع شيء: اكتب رمز PIN لتكمل من حيث توقفت. وإن نسيته فاختر تسجيل الخروج بدلا من ذلك وادخل مجددا بكلمة المرور. وخمسة رموز خاطئة تسجل خروجك.",
      },
      keywords: ["locked", "PIN", "unlock", "idle lock", "مقفلة", "رمز PIN", "فتح القفل", "قفل الخمول"],
      related: ["account.security.lock", "account.security.pin"],
    },
    {
      id: "trouble.pin-locked", topic: "trouble", kind: "troubleshoot",
      q: { en: "It says too many wrong PINs when I sign an approval", ar: "تظهر رسالة كثرة الرموز الخاطئة عند توقيع موافقة" },
      a: {
        en: "Five wrong PINs in a row stop your PIN working for signatures and at tills for 15 minutes. Wait, then try again with the right PIN. If you have forgotten it, change it on your account's Security page using your account password.",
        ar: "خمسة رموز PIN خاطئة متتالية توقف عمل رمزك في التوقيعات ونقاط البيع لمدة 15 دقيقة. انتظر ثم حاول مجددا بالرمز الصحيح. وإن نسيته فغيّره من صفحة الأمان في حسابك باستخدام كلمة مرور حسابك.",
      },
      keywords: ["PIN locked", "wrong PIN", "too many attempts", "signature", "قفل الرمز", "رمز خاطئ", "محاولات كثيرة", "توقيع"],
      related: ["account.security.pin"],
    },
    {
      id: "trouble.wrong-date", topic: "trouble", kind: "troubleshoot",
      q: { en: "A date or time looks wrong", ar: "يبدو تاريخ أو وقت غير صحيح" },
      a: {
        en: "Dates are shown as day, month, year, so 03/04 is the 3rd of April. If something lands on the wrong day, such as an offer, a shift or a daily limit, check the studio's time zone in Studio settings; with none set, days are counted in UTC. Nobody can set a separate time zone for one department.",
        ar: "تُعرض التواريخ بترتيب اليوم ثم الشهر ثم السنة، فـ 03/04 تعني الثالث من أبريل. وإن وقع شيء في اليوم الخطأ، مثل عرض أو وردية أو حد يومي، فتحقق من المنطقة الزمنية للاستوديو في إعدادات الاستوديو؛ فإن لم تُضبط تُحسب الأيام بتوقيت UTC. ولا يمكن لأحد ضبط منطقة زمنية منفصلة لقسم واحد.",
      },
      keywords: ["wrong date", "wrong time", "time zone", "date format", "تاريخ خاطئ", "وقت خاطئ", "المنطقة الزمنية", "صيغة التاريخ"],
      related: ["admin.settings.timezone", "start.dates"],
    },
    {
      id: "trouble.cant-find-record", topic: "trouble", kind: "troubleshoot",
      q: { en: "I can't find a record someone else created", ar: "لا أجد سجلا أنشأه شخص آخر" },
      a: {
        en: "Your role may be limited in scope: Own records shows only what you created or are assigned, and Department shows only your department and those beneath it. The record may also sit in a section you cannot open, or one the studio has switched off. Ask an admin to check your role's scope in Access, or ask the colleague to share the reference.",
        ar: "قد يكون نطاق دورك محدودا: سجلاتي تعرض فقط ما أنشأته أو أُسند إليك، والإدارة تعرض فقط إدارتك والإدارات التابعة لها. وقد يكون السجل أيضا في قسم لا تستطيع فتحه، أو قسم أوقفه الاستوديو. اطلب من المسؤول مراجعة نطاق دورك في الصلاحيات، أو اطلب من زميلك مشاركة الرقم المرجعي.",
      },
      keywords: ["can't find", "missing record", "not visible", "scope", "لا أجد", "سجل مفقود", "غير ظاهر", "النطاق"],
      related: ["admin.access.scope", "trouble.section-missing"],
    },
    {
      id: "trouble.email-not-received", topic: "trouble", kind: "troubleshoot", common: true,
      q: { en: "I didn't receive the email or code", ar: "لم يصلني البريد الإلكتروني أو الرمز" },
      a: {
        en: "Check your spam or junk folder and make sure the address is spelled correctly. Codes expire after 1 hour, so use Send the code again if it is late, waiting a moment between requests. Studio notifications are never emailed; they appear in the bell only. If codes still do not arrive, contact nompany support.",
        ar: "تحقق من مجلد البريد العشوائي أو غير المرغوب، وتأكد من كتابة العنوان بشكل صحيح. تنتهي صلاحية الرموز بعد ساعة، لذا استخدم إرسال الرمز مجددا إن تأخر، مع الانتظار قليلا بين الطلبات. ولا تُرسل إشعارات الاستوديو بالبريد أبدا؛ بل تظهر في الجرس فقط. وإن استمر عدم وصول الرموز فتواصل مع دعم nompany.",
      },
      keywords: ["email not received", "no code", "spam", "verification email", "لم يصل البريد", "لا يوجد رمز", "البريد العشوائي", "بريد التحقق"],
      related: ["start.notifications-email", "account.password.forgot"],
    },
    {
      id: "trouble.studio-closed", topic: "trouble", kind: "troubleshoot",
      q: { en: "Everything is view-only and a banner says payment is due", ar: "كل شيء للعرض فقط ويظهر شريط يقول إن الدفع مستحق" },
      a: {
        en: "The studio's subscription is overdue, so it is closed: you can still view and export, but nothing can be created or changed. Only the owner can fix it, by paying from Billing on the account page. As soon as the payment is confirmed the studio works normally again, and while a bank transfer claim is waiting it is reopened for a short time.",
        ar: "اشتراك الاستوديو متأخر، لذا هو مغلق: ما زال بإمكانك العرض والتصدير، لكن لا يمكن إنشاء أو تغيير أي شيء. لا يستطيع إصلاح ذلك إلا المالك، بالدفع من الفوترة في صفحة الحساب. وبمجرد تأكيد الدفعة يعود الاستوديو للعمل كالمعتاد، وخلال انتظار مطالبة التحويل البنكي يُعاد فتحه لمدة قصيرة.",
      },
      keywords: ["view only", "read only", "payment due", "studio closed", "للعرض فقط", "للقراءة فقط", "الدفع مستحق", "الاستوديو مغلق"],
      related: ["account.plan.unpaid", "account.plan.bank-transfer"],
    },

    // =====================================================================
    // MAIN — the home dashboard
    // =====================================================================
    {
      id: "main.about", topic: "dept.main", kind: "about",
      open: "main",
      q: { en: "What is Main?", ar: "ما هي الرئيسية؟" },
      a: {
        en: "Main is the studio's home page: what is happening across the company today. It shows headline figures such as open tickets, live quotations, projects running, money outstanding and items below reorder level, what is awaiting you, recent activity, and trends this month against last. Each figure appears only if you may see the records behind it and its department is switched on.",
        ar: "الرئيسية هي الصفحة الأولى للاستوديو: ما يحدث في الشركة اليوم. تعرض أرقاما رئيسية مثل التذاكر المفتوحة وعروض الأسعار السارية والمشاريع الجارية والمبالغ المستحقة والأصناف تحت حد إعادة الطلب، وما ينتظرك، والنشاط الأخير، والاتجاهات لهذا الشهر مقارنة بالسابق. ولا يظهر أي رقم إلا إذا كان مسموحا لك برؤية السجلات التي خلفه وكان قسمه مفعلا.",
      },
      keywords: ["main", "home", "dashboard", "overview", "الرئيسية", "الصفحة الرئيسية", "لوحة المعلومات", "نظرة عامة"],
      related: ["main.awaiting-you", "main.no-main"],
    },
    {
      id: "main.awaiting-you", topic: "dept.main", kind: "about",
      open: "main",
      q: { en: "What is Awaiting you on Main?", ar: "ما قسم ما ينتظرك في الرئيسية؟" },
      a: {
        en: "Awaiting you lists what is waiting on your action, including the approvals where you are named on the open step, with a count. It is the same list the Approvals page uses, so the two always agree. Nothing waiting means nothing needs you right now.",
        ar: "يعرض ما ينتظرك الأمور التي تنتظر إجراء منك، بما فيها الموافقات التي يرد اسمك في خطوتها المفتوحة، مع عددها. وهي القائمة نفسها التي تستخدمها صفحة الموافقات، لذا يتفقان دائما. وإن لم يكن هناك شيء فلا شيء يحتاجك الآن.",
      },
      keywords: ["awaiting you", "my tasks", "to do", "pending", "ما ينتظرك", "مهامي", "المطلوب", "معلق"],
      related: ["admin.approvals.about"],
    },
    {
      id: "main.no-main", topic: "dept.main", kind: "troubleshoot",
      q: { en: "Why don't I have Main in my sidebar?", ar: "لماذا لا توجد الرئيسية في شريطي الجانبي؟" },
      a: {
        en: "Main is a page a role must be given, so that someone who only works a till, for example, is not shown a page of zeros. Without it, the studio opens on the first section you may open. An admin can tick Main for your role in Access.",
        ar: "الرئيسية صفحة يجب منحها للدور، حتى لا تُعرض مثلا على شخص يعمل فقط على نقطة البيع صفحة مليئة بالأصفار. وبدونها يفتح الاستوديو على أول قسم يمكنك فتحه. ويمكن للمسؤول تحديد الرئيسية لدورك من الصلاحيات.",
      },
      keywords: ["no main", "home missing", "main page", "landing", "لا توجد الرئيسية", "الصفحة الرئيسية مفقودة", "صفحة البداية"],
      related: ["main.about", "admin.access.grant"],
    },
    {
      id: "main.zero-or-missing", topic: "dept.main", kind: "about",
      q: { en: "Why is a figure missing from my home page?", ar: "لماذا يغيب رقم عن صفحتي الرئيسية؟" },
      a: {
        en: "A figure you may not see is left out rather than shown as zero, because zero is a real answer and not being allowed is not. A department that is switched off takes its figures with it. Some widgets also depend on your studio's package tier.",
        ar: "الرقم الذي لا يُسمح لك برؤيته يُحذف بدلا من عرضه صفرا، لأن الصفر إجابة حقيقية وعدم السماح ليس كذلك. والقسم الموقوف يأخذ أرقامه معه. وتعتمد بعض العناصر أيضا على مستوى باقة استوديوك.",
      },
      keywords: ["missing tile", "zero", "widget", "figure", "عنصر مفقود", "صفر", "أداة", "رقم"],
      related: ["main.about", "account.plan.packages"],
    },
    {
      id: "main.engagements", topic: "dept.main", kind: "about",
      q: { en: "What are Engagements?", ar: "ما هي الارتباطات؟" },
      a: {
        en: "An engagement is one deal followed from start to finish: the sales ticket, the RFQ, the quotation, the project and what hangs off it, such as invoices and orders. The Engagements view shows each deal as one thread so you can see where it stands. Every stage is optional, and a missing stage is shown as an invitation rather than an error; each part appears only if you may see it.",
        ar: "الارتباط صفقة واحدة تُتابع من بدايتها إلى نهايتها: تذكرة المبيعات وطلب عرض السعر وعرض السعر والمشروع وما يتبعه مثل الفواتير والطلبات. تعرض شاشة الارتباطات كل صفقة كمسار واحد لترى أين وصلت. كل مرحلة اختيارية، وتظهر المرحلة الناقصة كدعوة لا كخطأ؛ ولا يظهر أي جزء إلا إذا كان مسموحا لك برؤيته.",
      },
      keywords: ["engagements", "deal", "deal timeline", "lifecycle", "الارتباطات", "الصفقة", "مسار الصفقة", "دورة الحياة"],
      related: ["main.about"],
    },
    {
      id: "main.export", topic: "dept.main", kind: "howto",
      open: "main",
      q: { en: "Can I export the figures on Main?", ar: "هل يمكنني تصدير أرقام الرئيسية؟" },
      a: {
        en: "Yes. Headline trends has an Export CSV button that downloads each figure for this period and the one before, with the change as a percentage. For whole registers, use Reports & BI.",
        ar: "نعم. في قسم الاتجاهات الرئيسية زر تصدير CSV ينزّل كل رقم لهذه الفترة والتي قبلها مع نسبة التغير. ولتصدير سجلات كاملة استخدم التقارير وذكاء الأعمال.",
      },
      steps: {
        en: ["Open Main.", "Find Headline trends.", "Click Export CSV."],
        ar: ["افتح الرئيسية.", "ابحث عن الاتجاهات الرئيسية.", "اضغط تصدير CSV."],
      },
      keywords: ["export", "CSV", "download", "trends", "تصدير", "تنزيل", "اتجاهات", "ملف"],
      related: ["reports.export"],
    },

    // =====================================================================
    // REPORTS & BI
    // =====================================================================
    {
      id: "reports.about", topic: "dept.reports", kind: "about",
      open: "reports",
      q: { en: "What is in Reports & BI?", ar: "ماذا تضم التقارير وذكاء الأعمال؟" },
      a: {
        en: "Reports & BI brings the whole company together: an executive dashboard at the top, data exports, a report builder for your own questions, and targets drawn against those reports. Opening it needs the Data exports right. Every figure is still limited to records you can already open.",
        ar: "تجمع التقارير وذكاء الأعمال الشركة كلها في مكان واحد: لوحة الإدارة العليا في الأعلى، وتصدير البيانات، ومنشئ تقارير لأسئلتك الخاصة، وأهداف تُرسم مقابل تلك التقارير. يتطلب فتحها صلاحية تصدير البيانات. ويبقى كل رقم محصورا في السجلات التي يمكنك فتحها أصلا.",
      },
      keywords: ["reports", "BI", "analytics", "business intelligence", "التقارير", "ذكاء الأعمال", "التحليلات", "تحليل"],
      related: ["reports.executive", "reports.builder", "reports.export"],
    },
    {
      id: "reports.export", topic: "dept.reports", kind: "howto",
      open: "reports",
      q: { en: "How do I export data?", ar: "كيف أصدّر البيانات؟" },
      a: {
        en: "On Reports & BI, choose a register and download it as a CSV file. Each export contains only its listed columns and only the records you can already open; the export right never widens what you can see. A register appears once you hold the right to read it and its department is switched on.",
        ar: "من التقارير وذكاء الأعمال اختر سجلا ونزّله كملف CSV. يحتوي كل تصدير على أعمدته المدرجة فقط وعلى السجلات التي يمكنك فتحها أصلا فقط؛ فصلاحية التصدير لا توسّع أبدا ما يمكنك رؤيته. ويظهر السجل بمجرد امتلاكك صلاحية قراءته وكون قسمه مفعلا.",
      },
      steps: {
        en: ["Open Reports & BI.", "Find the register you want among the exports.", "Download it as CSV and open it in your spreadsheet."],
        ar: ["افتح التقارير وذكاء الأعمال.", "ابحث عن السجل الذي تريده ضمن عمليات التصدير.", "نزّله كملف CSV وافتحه في برنامج الجداول."],
      },
      keywords: ["export", "CSV", "Excel", "download data", "spreadsheet", "تصدير", "إكسل", "تنزيل البيانات", "جدول بيانات"],
      related: ["reports.who", "account.plan.export"],
    },
    {
      id: "reports.executive", topic: "dept.reports", kind: "about",
      open: "reports",
      q: { en: "What is the executive dashboard?", ar: "ما هي لوحة الإدارة العليا؟" },
      a: {
        en: "It puts the company on one screen: eight figures, invoiced, supplier bills, deals opened, quoted, projects opened, purchase orders, tenders entered and leave days, each compared with the same length of time before it. A figure you may not see is left out, not shown as zero, and the board says how many were left out. It has no charts or drill-down yet, and money figures are not converted between currencies.",
        ar: "تضع الشركة في شاشة واحدة: ثمانية أرقام هي المفوتر وفواتير الموردين والصفقات المفتوحة والمسعّر والمشاريع المفتوحة وأوامر الشراء والمناقصات المدخلة وأيام الإجازة، كل منها مقارن بفترة مماثلة الطول قبلها. الرقم الذي لا يُسمح لك برؤيته يُحذف ولا يُعرض صفرا، وتذكر اللوحة عدد ما حُذف. ولا تتضمن بعد رسوما بيانية أو تفاصيل أعمق، ولا تُحوَّل الأرقام المالية بين العملات.",
      },
      keywords: ["executive dashboard", "KPIs", "company overview", "management", "لوحة الإدارة العليا", "مؤشرات", "نظرة على الشركة", "الإدارة"],
      related: ["reports.about", "reports.targets"],
    },
    {
      id: "reports.builder", topic: "dept.reports", kind: "howto",
      open: "reports",
      q: { en: "How do I build my own report?", ar: "كيف أنشئ تقريري الخاص؟" },
      a: {
        en: "The report builder lets you ask your own question of one data set, such as overdue invoices by client or projects by status with their values totalled. Choose the data set, the columns, filters, grouping and sort, then save it. A saved report is only the question: each person who runs it sees the answer from their own access.",
        ar: "يتيح لك منشئ التقارير طرح سؤالك الخاص على مجموعة بيانات واحدة، مثل الفواتير المتأخرة حسب العميل أو المشاريع حسب الحالة مع مجموع قيمها. اختر مجموعة البيانات والأعمدة والمرشحات والتجميع والترتيب ثم احفظه. التقرير المحفوظ مجرد سؤال: فكل شخص يشغّله يرى الإجابة وفق صلاحياته.",
      },
      steps: {
        en: ["Open Reports & BI and go to the report builder.", "Choose a data set.", "Pick columns, add filters, and choose how to group and sort.", "Check the result and save the report with a name."],
        ar: ["افتح التقارير وذكاء الأعمال وانتقل إلى منشئ التقارير.", "اختر مجموعة بيانات.", "اختر الأعمدة وأضف المرشحات وحدد التجميع والترتيب.", "راجع النتيجة واحفظ التقرير باسم."],
      },
      keywords: ["report builder", "custom report", "saved report", "query", "منشئ التقارير", "تقرير مخصص", "تقرير محفوظ", "استعلام"],
      related: ["reports.targets", "reports.not-yet"],
    },
    {
      id: "reports.targets", topic: "dept.reports", kind: "howto",
      open: "reports",
      q: { en: "How do I set a target or KPI?", ar: "كيف أضبط هدفا أو مؤشر أداء؟" },
      a: {
        en: "A target is a saved report plus a line: a floor to stay above or a ceiling to stay below. It warns when the figure gets close, by default 90 percent of the way, and turns red when breached. When there is nothing to measure yet, it shows unknown rather than met or breached, and a breached target is shown on screen only, without a notification.",
        ar: "الهدف تقرير محفوظ مع خط: حد أدنى يجب البقاء فوقه أو حد أعلى يجب البقاء تحته. ينبّه حين يقترب الرقم منه، افتراضيا عند 90 بالمئة من المسافة، ويتحول إلى الأحمر عند تجاوزه. وحين لا يوجد ما يُقاس بعد يظهر كغير معروف بدلا من محقق أو متجاوز، ويظهر الهدف المتجاوز على الشاشة فقط دون إشعار.",
      },
      steps: {
        en: ["Save a report that measures what you care about.", "Add a target to it and choose a floor or a ceiling and its value.", "Check its state each time you open Reports & BI."],
        ar: ["احفظ تقريرا يقيس ما يهمك.", "أضف إليه هدفا واختر حدا أدنى أو أعلى وقيمته.", "راجع حالته في كل مرة تفتح فيها التقارير وذكاء الأعمال."],
      },
      keywords: ["target", "KPI", "goal", "threshold", "الهدف", "مؤشر الأداء", "الغاية", "الحد"],
      related: ["reports.builder", "reports.executive"],
    },
    {
      id: "reports.who", topic: "dept.reports", kind: "troubleshoot",
      q: { en: "Why can't I see Reports & BI or a data set in it?", ar: "لماذا لا أرى التقارير وذكاء الأعمال أو مجموعة بيانات فيها؟" },
      a: {
        en: "Two rights are needed. Data exports opens Reports & BI at all, and each data set also asks for the right its own section needs, such as invoices needing the right to read receivables. A data set whose department is switched off is not offered. Ask an admin to grant the missing right in Access.",
        ar: "تحتاج إلى صلاحيتين. صلاحية تصدير البيانات تفتح التقارير وذكاء الأعمال أصلا، وكل مجموعة بيانات تطلب أيضا الصلاحية التي يحتاجها قسمها، مثل حاجة الفواتير إلى صلاحية قراءة الذمم المدينة. ولا تُعرض مجموعة بيانات قسمها موقوف. اطلب من المسؤول منح الصلاحية الناقصة من الصلاحيات.",
      },
      keywords: ["no reports", "data set missing", "export right", "access", "لا تقارير", "مجموعة بيانات مفقودة", "صلاحية التصدير", "الوصول"],
      related: ["reports.about", "admin.access.grant"],
    },
    {
      id: "reports.not-yet", topic: "dept.reports", kind: "about",
      q: { en: "Can I schedule a report or email it?", ar: "هل يمكنني جدولة تقرير أو إرساله بالبريد؟" },
      a: {
        en: "Not yet. Scheduling a report to arrive by email, alerts when a target is breached, charts in the builder, relative periods such as this quarter, and reports that join two data sets are not available yet. For now, run the saved report when you need it, and type dates into its filters.",
        ar: "ليس بعد. جدولة تقرير ليصل بالبريد، والتنبيهات عند تجاوز هدف، والرسوم البيانية في منشئ التقارير، والفترات النسبية مثل هذا الربع، والتقارير التي تربط مجموعتي بيانات، كلها غير متاحة بعد. حاليا شغّل التقرير المحفوظ عندما تحتاجه، واكتب التواريخ في مرشحاته.",
      },
      keywords: ["schedule report", "email report", "charts", "alerts", "جدولة تقرير", "إرسال التقرير بالبريد", "رسوم بيانية", "تنبيهات"],
      related: ["reports.builder", "reports.targets"],
    },
  ],
};
