import { defaultLocale, type Locale } from "./locale";

// THE MARKETING SITE — the landing page, its sections, the pricing and contact views, the top nav and the footer.
//
// Generated from the page's own copy and then translated by hand. It does NOT
// spread the studio's `common` dictionary: that vocabulary belongs to a record
// system, and a marketing page shares none of it.

type Strings = {
  adaptiveBody: string;
  adaptiveHint: string;
  adaptiveSchema: string;
  adaptiveTitle: string;
  allSystemsOk: string;
  americas: string;
  approve: string;
  assistantReadsLedgerBefore: string;
  bookDemoSolutionsEngineer: string;
  cashFlow: string;
  cityRowAmericas: string;
  cityRowEmea: string;
  colCompany: string;
  colPlatform: string;
  colResources: string;
  company: string;
  contactEyebrow: string;
  contactLead: string;
  contactSales: string;
  createStudio: string;
  ctaFootnote: string;
  ctaLead: string;
  ctaTitle: string;
  dashMargin: string;
  dashOrders: string;
  dashRevenue: string;
  enterValidWorkEmail: string;
  enterpriseDepthWithoutEnterprise: string;
  errCompany: string;
  errCompanyRequired: string;
  errEmail: string;
  errMessage: string;
  errName: string;
  errTellUsStack: string;
  errValidEmail: string;
  featAutomation: string;
  featAutomationBody: string;
  featEyebrow: string;
  featLiveAnalytics: string;
  featLiveAnalyticsBody: string;
  featMultiEntity: string;
  featMultiEntityBody: string;
  featSupplyChain: string;
  featSupplyChainBody: string;
  featWorkforce: string;
  featWorkforceBody: string;
  featZeroTrust: string;
  featZeroTrustBody: string;
  financeHrSupply: string;
  footerTagline: string;
  forecastAccuracy: string;
  fourMovesRawEvent: string;
  freeSignup: string;
  fullName: string;
  goStudio: string;
  goToAccount: string;
  heroBadge: string;
  heroLead: string;
  heroLine1: string;
  heroLine2: string;
  hiw1Body: string;
  hiw1Step: string;
  hiw1Title: string;
  hiw1a: string;
  hiw1b: string;
  hiw1c: string;
  hiw2Body: string;
  hiw2Step: string;
  hiw2Title: string;
  hiw2a: string;
  hiw2b: string;
  hiw2c: string;
  hiw3Body: string;
  hiw3Step: string;
  hiw3Title: string;
  hiw3a: string;
  hiw3b: string;
  hiw3c: string;
  hiw4Body: string;
  hiw4Step: string;
  hiw4Title: string;
  hiw4a: string;
  hiw4b: string;
  hiw4c: string;
  hiwEyebrow: string;
  insCashFlow: string;
  insCashFlowBody: string;
  insEyebrow: string;
  insInventory: string;
  insInventoryBody: string;
  insProcurement: string;
  insProcurementBody: string;
  insWorkforce: string;
  insWorkforceBody: string;
  lnkAbout: string;
  lnkAnalytics: string;
  lnkApiReference: string;
  lnkCareers: string;
  lnkCustomers: string;
  lnkDocumentation: string;
  lnkFinance: string;
  lnkHr: string;
  lnkImplementation: string;
  lnkInventory: string;
  lnkManufacturing: string;
  lnkSecurity: string;
  lnkStatus: string;
  lnkTerms: string;
  loadingPrices: string;
  logIn: string;
  margin: string;
  moduleHealth: string;
  morphAlt: string;
  navDark: string;
  navLight: string;
  navLogIn: string;
  navStartFree: string;
  navSystem: string;
  navTheme: string;
  navYourAccount: string;
  nompanyHome: string;
  nothingMatches: string;
  novaAlwaysOn: string;
  novaName: string;
  novaNompanyAiAssistant: string;
  novaSitsIn: string;
  novaWatchesEveryEvent: string;
  officesAmericas: string;
  officesEmea: string;
  onTheList: string;
  orders: string;
  payrollRunScheduled: string;
  po4821Approved: string;
  preInsights: string;
  preLedgers: string;
  preModules: string;
  preReady: string;
  preSecureSession: string;
  priAllModules: string;
  priAllModulesBody: string;
  priAlwaysFree: string;
  priBilledEndMonth: string;
  priBilledYearly: string;
  priContactSales: string;
  priCtaBody: string;
  priCtaTitle: string;
  priCurrency: string;
  priEyebrow: string;
  priFree: string;
  priFreeUnderTen: string;
  priFreeUnderTenBody: string;
  priGetStarted: string;
  priIncludes: string;
  priInvoicedMonthly: string;
  priInvoicedMonthly2: string;
  priMonthly: string;
  priMostPopular: string;
  priPayYearly: string;
  priStartFree: string;
  priStartFreeLower: string;
  priTitle: string;
  priYearly: string;
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
  reachOutOneDay: string;
  replyOneDay: string;
  requestDemo: string;
  revenue: string;
  rightsReserved: string;
  sales: string;
  scrollWatchDataFlow: string;
  searchCodeNameCountry: string;
  searchCurrencies: string;
  seePricing: string;
  selected: string;
  sendAnother: string;
  showWorkings: string;
  signOut: string;
  sixPillarsOneDeployment: string;
  startFree: string;
  startFreeNow: string;
  statClose: string;
  statCountries: string;
  statTransactions: string;
  statUptime: string;
  stockReorderTriggered: string;
  support: string;
  theme: string;
  themeDark: string;
  themeLight: string;
  themeSystem: string;
  thisQuarter: string;
  viewContact: string;
  viewOverview: string;
  viewPricing: string;
  whatRunningToday: string;
  workEmail: string;
  yourAccount: string;
};

const en: Strings = {
  adaptiveBody: "Add a dimension, split an entity, or introduce a new cost model and Nompany reshapes the graph in place — every report, permission and integration follows automatically.",
  adaptiveHint: "Hover the shape to see the model reconfigure.",
  adaptiveSchema: "Adaptive schema",
  adaptiveTitle: "Your data model bends to the business, not the other way round",
  allSystemsOk: "All systems operational",
  americas: "Americas",
  approve: "Approve",
  assistantReadsLedgerBefore: "An assistant that reads the ledger before you do",
  bookDemoSolutionsEngineer: "Book a demo with a solutions engineer",
  cashFlow: "Cash flow",
  cityRowAmericas: "Austin · Toronto",
  cityRowEmea: "Amsterdam · Riyadh",
  colCompany: "Company",
  colPlatform: "Platform",
  colResources: "Resources",
  company: "Company",
  contactEyebrow: "Contact",
  contactLead: "45 minutes, your data model on screen, no slide deck. We'll tell you honestly if Nompany isn't the right fit.",
  contactSales: "Contact Sales",
  createStudio: "Create your studio",
  ctaFootnote: "Average implementation: 38 days · Dedicated migration engineer",
  ctaLead: "Most teams are live in under six weeks. Bring your data, keep your processes, retire the spreadsheets.",
  ctaTitle: "Replace nine systems with one operating layer",
  dashMargin: "Margin",
  dashOrders: "Orders",
  dashRevenue: "Revenue",
  enterValidWorkEmail: "Enter a valid work email so we can reach you.",
  enterpriseDepthWithoutEnterprise: "Enterprise depth, without the enterprise drag",
  errCompany: "Company name required.",
  errCompanyRequired: "Company name required.",
  errEmail: "Enter a valid work email.",
  errMessage: "A sentence or two about your stack helps us prepare.",
  errName: "Tell us who to ask for.",
  errTellUsStack: "A sentence or two about your stack helps us prepare.",
  errValidEmail: "Enter a valid work email.",
  featAutomation: "Automation engine",
  featAutomationBody: "Compose approvals, reorders, and escalations from rules or let an agent draft the workflow for you.",
  featEyebrow: "Platform",
  featLiveAnalytics: "Live analytics",
  featLiveAnalyticsBody: "Sub-second queries over the operational ledger — no warehouse hop, no stale extract.",
  featMultiEntity: "Multi-entity finance",
  featMultiEntityBody: "Consolidate 40 legal entities, 12 currencies, and local tax rules into one close cycle.",
  featSupplyChain: "Supply chain control",
  featSupplyChainBody: "Track every SKU from PO to pallet with live landed-cost and demand signals.",
  featWorkforce: "Workforce operations",
  featWorkforceBody: "Scheduling, payroll, and skills mapping wired straight into cost centres.",
  featZeroTrust: "Zero-trust security",
  featZeroTrustBody: "Row-level permissions, SSO/SCIM, and an append-only audit log every auditor has already seen.",
  financeHrSupply: "Finance · HR · Supply",
  footerTagline: "The operating system for your enterprise. One ledger, every department, in real time.",
  forecastAccuracy: "Forecast accuracy",
  fourMovesRawEvent: "Four moves from raw event to board decision",
  freeSignup: "Free sign up · No card required",
  fullName: "Full name",
  goStudio: "Go to Studio",
  goToAccount: "Go to account",
  heroBadge: "Nompany 4.0 — now with agentic workflows",
  heroLead: "Run every corner of your business on one live data model. Manage your",
  heroLine1: "The Operating System",
  heroLine2: "for Your Enterprise",
  hiw1Body: "Point-of-sale, purchase orders, payroll and bank feeds stream into a single normalised event log the moment they happen. No nightly batch, no reconciliation spreadsheets.",
  hiw1Step: "01 — Capture",
  hiw1Title: "Every transaction lands in one ledger",
  hiw1a: "Real-time ingestion",
  hiw1b: "180+ connectors",
  hiw1c: "Immutable audit trail",
  hiw2Body: "Finance, HR, inventory and manufacturing read and write the same records. When procurement receives a shipment, the balance sheet already knows.",
  hiw2Step: "02 — Unify",
  hiw2Title: "One data model across every department",
  hiw2a: "Shared entity graph",
  hiw2b: "Cross-module integrity",
  hiw2c: "Zero double entry",
  hiw3Body: "Rules and agents watch the event stream: approvals route by policy, stock reorders fire at threshold, anomalies escalate before they become write-offs.",
  hiw3Step: "03 — Automate",
  hiw3Title: "Workflows that run themselves",
  hiw3a: "Policy-based approvals",
  hiw3b: "Agentic exception handling",
  hiw3c: "SLA timers",
  hiw4Body: "Live dashboards and scenario models sit on top of the same ledger, so the number the CFO quotes is the number the warehouse just produced.",
  hiw4Step: "04 — Decide",
  hiw4Title: "Forecasts your board can act on",
  hiw4a: "Rolling forecasts",
  hiw4b: "Scenario modelling",
  hiw4c: "Board-ready exports",
  hiwEyebrow: "How it works",
  insCashFlow: "Cash flow",
  insCashFlowBody: "Receivables in the EU entity are trending 9 days late. Want me to trigger the dunning sequence?",
  insEyebrow: "Smart insights",
  insInventory: "Inventory",
  insInventoryBody: "SKU-4471 will stock out in 11 days at current velocity. A reorder of 2,400 units keeps you covered.",
  insProcurement: "Procurement",
  insProcurementBody: "Three suppliers quote below your contracted rate for resin. Estimated saving: $184k / year.",
  insWorkforce: "Workforce",
  insWorkforceBody: "Overtime in Plant 2 is up 14%. Two shift swaps would bring it back under budget.",
  lnkAbout: "About",
  lnkAnalytics: "Analytics",
  lnkApiReference: "API reference",
  lnkCareers: "Careers",
  lnkCustomers: "Customers",
  lnkDocumentation: "Documentation",
  lnkFinance: "Finance",
  lnkHr: "Human resources",
  lnkImplementation: "Implementation guide",
  lnkInventory: "Inventory",
  lnkManufacturing: "Manufacturing",
  lnkSecurity: "Security",
  lnkStatus: "Status",
  lnkTerms: "Terms & conditions",
  loadingPrices: "Loading prices…",
  logIn: "Log in",
  margin: "Margin",
  moduleHealth: "Module health",
  morphAlt: "Abstract data shape that reshapes on hover",
  navDark: "Dark",
  navLight: "Light",
  navLogIn: "Log in",
  navStartFree: "Start free",
  navSystem: "System",
  navTheme: "Theme",
  navYourAccount: "Your account",
  nompanyHome: "Nompany home",
  nothingMatches: "Nothing matches that.",
  novaAlwaysOn: "Nova · always on",
  novaName: "Nova",
  novaNompanyAiAssistant: "Nova, the Nompany AI assistant",
  novaSitsIn: "Nova will sit in on the call and map your entities live.",
  novaWatchesEveryEvent: "Nova watches every event as it lands, spots the pattern, and brings you the decision — not another dashboard to interpret.",
  officesAmericas: "Austin · Toronto",
  officesEmea: "Amsterdam · Riyadh",
  onTheList: "You're on the list.",
  orders: "Orders",
  payrollRunScheduled: "Payroll run scheduled",
  po4821Approved: "PO-4821 approved",
  preInsights: "Compiling real-time insights",
  preLedgers: "Synchronising ledgers",
  preModules: "Loading finance · HR · inventory",
  preReady: "Ready",
  preSecureSession: "Establishing secure session",
  priAllModules: "The whole platform, every plan",
  priAllModulesBody: "Every department is switched on from the free tier up. You pay for team size, not for modules.",
  priAlwaysFree: "Always free",
  priBilledEndMonth: "Billed at the end of each month based on your number of employees.",
  priBilledYearly: "billed yearly",
  priContactSales: "Contact Sales",
  priCtaBody: "Create your free account — no card required.",
  priCtaTitle: "Ready to run your company on one platform?",
  priCurrency: "Currency",
  priEyebrow: "Pricing",
  priFree: "Free",
  priFreeUnderTen: "Free under ten people",
  priFreeUnderTenBody: "Micro is free forever for up to 9 employees — English and Arabic, RTL-ready, no card required.",
  priGetStarted: "Get Started",
  priIncludes: "Includes",
  priInvoicedMonthly: "invoiced monthly",
  priInvoicedMonthly2: "Invoiced monthly",
  priMonthly: "Monthly",
  priMostPopular: "Most popular",
  priPayYearly: "Pay yearly, pay less",
  priStartFree: "Start Free",
  priStartFreeLower: "Start free",
  priTitle: "Pricing that scales with your team",
  priYearly: "Yearly",
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
  reachOutOneDay: "A solutions engineer will reach out within one business day.",
  replyOneDay: "We reply within one business day. No sequences, no drip.",
  requestDemo: "Request demo",
  revenue: "Revenue",
  rightsReserved: "All rights reserved.",
  sales: "Sales",
  scrollWatchDataFlow: "Scroll to watch the data flow through the Nompany core.",
  searchCodeNameCountry: "Search code, name or country",
  searchCurrencies: "Search currencies",
  seePricing: "See pricing",
  selected: "Selected",
  sendAnother: "Send another request",
  showWorkings: "Show workings",
  signOut: "Sign out",
  sixPillarsOneDeployment: "Six pillars, one deployment. Every module shares the same permissions, the same ledger, and the same API.",
  startFree: "Start Free",
  startFreeNow: "Start free now",
  statClose: "faster month-end close",
  statCountries: "countries supported",
  statTransactions: "transactions processed / day",
  statUptime: "platform uptime",
  stockReorderTriggered: "Stock reorder triggered",
  support: "Support",
  theme: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  themeSystem: "System",
  thisQuarter: "this quarter",
  viewContact: "Contact",
  viewOverview: "Overview",
  viewPricing: "Pricing",
  whatRunningToday: "What are you running today?",
  workEmail: "Work email",
  yourAccount: "Your account",
};

const ar: Strings = {
  adaptiveBody: "أضف بعدًا، أو افصل كيانًا، أو أدخل نموذج تكلفة جديدًا، فيعيد nompany تشكيل الرسم في مكانه — وكل تقرير وصلاحية وتكامل يتبع تلقائيًا.",
  adaptiveHint: "مرّر المؤشر على الشكل لترى النموذج يعيد ترتيب نفسه.",
  adaptiveSchema: "بنية تتكيّف",
  adaptiveTitle: "نموذج بياناتك ينحني للعمل، لا العكس",
  allSystemsOk: "جميع الأنظمة تعمل",
  americas: "الأمريكتان",
  approve: "اعتماد",
  assistantReadsLedgerBefore: "مساعد يقرأ السجل قبلك",
  bookDemoSolutionsEngineer: "احجز عرضًا توضيحيًا مع مهندس حلول",
  cashFlow: "التدفق النقدي",
  cityRowAmericas: "أوستن · تورونتو",
  cityRowEmea: "أمستردام · الرياض",
  colCompany: "الشركة",
  colPlatform: "المنصة",
  colResources: "الموارد",
  company: "الشركة",
  contactEyebrow: "تواصل معنا",
  contactLead: "خمس وأربعون دقيقة، ونموذج بياناتك على الشاشة، بلا عرض شرائح. وسنخبرك بصراحة إن لم يكن nompany مناسبًا لك.",
  contactSales: "تواصل مع المبيعات",
  createStudio: "أنشئ استوديوك",
  ctaFootnote: "متوسط التنفيذ: 38 يومًا · مهندس ترحيل مخصص",
  ctaLead: "معظم الفرق تعمل خلال أقل من ستة أسابيع. أحضر بياناتك، واحتفظ بإجراءاتك، وتخلّص من الجداول.",
  ctaTitle: "استبدل تسعة أنظمة بطبقة تشغيل واحدة",
  dashMargin: "الهامش",
  dashOrders: "الطلبات",
  dashRevenue: "الإيرادات",
  enterValidWorkEmail: "أدخل بريد عمل صحيحًا كي نتمكن من الوصول إليك.",
  enterpriseDepthWithoutEnterprise: "عمق المؤسسات، دون ثِقلها",
  errCompany: "اسم الشركة مطلوب.",
  errCompanyRequired: "اسم الشركة مطلوب.",
  errEmail: "أدخل بريد عمل صالحًا.",
  errMessage: "جملة أو اثنتان عن أنظمتك الحالية تساعداننا على الاستعداد.",
  errName: "أخبرنا بمن نسأل عنه.",
  errTellUsStack: "جملة أو جملتان عن منظومتك التقنية تساعداننا على الاستعداد.",
  errValidEmail: "أدخل بريد عمل صحيحًا.",
  featAutomation: "محرك الأتمتة",
  featAutomationBody: "ركّب الاعتمادات وإعادة الطلب والتصعيد من قواعد، أو دع وكيلًا يصوغ سير العمل نيابة عنك.",
  featEyebrow: "المنصة",
  featLiveAnalytics: "تحليلات فورية",
  featLiveAnalyticsBody: "استعلامات دون الثانية على السجل التشغيلي — بلا مرور على مستودع بيانات، وبلا نسخة قديمة.",
  featMultiEntity: "مالية متعددة الكيانات",
  featMultiEntityBody: "وحّد 40 كيانًا قانونيًا و12 عملة وقواعد ضريبية محلية في دورة إقفال واحدة.",
  featSupplyChain: "التحكم في سلسلة التوريد",
  featSupplyChainBody: "تتبّع كل صنف من أمر الشراء إلى المنصة، مع تكلفة وصول حية وإشارات طلب.",
  featWorkforce: "عمليات القوى العاملة",
  featWorkforceBody: "الجدولة والرواتب وخرائط المهارات موصولة مباشرة بمراكز التكلفة.",
  featZeroTrust: "أمان بلا ثقة ضمنية",
  featZeroTrustBody: "صلاحيات على مستوى الصف، ودخول موحّد SSO/SCIM، وسجل تدقيق لا يقبل إلا الإضافة وقد رآه كل مدقق من قبل.",
  financeHrSupply: "المالية · الموارد البشرية · التوريد",
  footerTagline: "نظام التشغيل لمؤسستك. سجل واحد، وكل قسم، في الوقت الفعلي.",
  forecastAccuracy: "دقة التوقعات",
  fourMovesRawEvent: "أربع خطوات من الحدث الخام إلى قرار المجلس",
  freeSignup: "تسجيل مجاني · بلا بطاقة",
  fullName: "الاسم الكامل",
  goStudio: "اذهب إلى الاستوديو",
  goToAccount: "الذهاب إلى الحساب",
  heroBadge: "‏nompany 4.0 — مع سير عمل ذكي الآن",
  heroLead: "شغّل كل ركن من عملك على نموذج بيانات حيّ واحد. أدِر",
  heroLine1: "نظام التشغيل",
  heroLine2: "لمؤسستك",
  hiw1Body: "نقاط البيع وأوامر الشراء والرواتب وتغذيات البنوك تتدفق إلى سجل أحداث موحّد لحظة وقوعها. بلا دفعات ليلية، وبلا جداول تسوية.",
  hiw1Step: "01 — الالتقاط",
  hiw1Title: "كل معاملة تصل إلى سجل واحد",
  hiw1a: "استيعاب فوري",
  hiw1b: "أكثر من 180 موصّلًا",
  hiw1c: "أثر تدقيق غير قابل للتعديل",
  hiw2Body: "المالية والموارد البشرية والمخزون والتصنيع تقرأ وتكتب السجلات نفسها. وحين يستلم المشتريات شحنة، تكون الميزانية قد عرفت.",
  hiw2Step: "02 — التوحيد",
  hiw2Title: "نموذج بيانات واحد عبر كل قسم",
  hiw2a: "رسم كيانات مشترك",
  hiw2b: "تكامل بين الوحدات",
  hiw2c: "بلا إدخال مزدوج",
  hiw3Body: "القواعد والوكلاء يراقبون تدفق الأحداث: الاعتمادات تُوجَّه بالسياسة، وطلبات التوريد تنطلق عند الحد، والشذوذ يُصعَّد قبل أن يتحول إلى خسارة.",
  hiw3Step: "03 — الأتمتة",
  hiw3Title: "مسارات عمل تُدير نفسها",
  hiw3a: "اعتمادات وفق السياسات",
  hiw3b: "معالجة الاستثناءات بوكلاء",
  hiw3c: "مؤقتات مستوى الخدمة",
  hiw4Body: "اللوحات الحية ونماذج السيناريو تقوم على السجل نفسه، فالرقم الذي يذكره المدير المالي هو الرقم الذي أنتجه المستودع للتو.",
  hiw4Step: "04 — القرار",
  hiw4Title: "توقعات يستطيع مجلسك التصرف بناءً عليها",
  hiw4a: "توقعات متجددة",
  hiw4b: "نمذجة السيناريوهات",
  hiw4c: "تصديرات جاهزة للمجلس",
  hiwEyebrow: "كيف يعمل",
  insCashFlow: "التدفق النقدي",
  insCashFlowBody: "الذمم المدينة في كيان الاتحاد الأوروبي متأخرة بتسعة أيام في المتوسط. أأبدأ سلسلة المطالبات؟",
  insEyebrow: "رؤى ذكية",
  insInventory: "المخزون",
  insInventoryBody: "سينفد الصنف SKU-4471 خلال 11 يومًا بالوتيرة الحالية. إعادة طلب 2,400 وحدة تكفيك.",
  insProcurement: "المشتريات",
  insProcurementBody: "ثلاثة موردين يعرضون سعرًا أقل من سعرك التعاقدي للراتنج. التوفير المقدّر: 184 ألف دولار سنويًا.",
  insWorkforce: "القوى العاملة",
  insWorkforceBody: "ارتفع العمل الإضافي في المصنع 2 بنسبة 14٪. تبديل ورديتين يعيده تحت الميزانية.",
  lnkAbout: "من نحن",
  lnkAnalytics: "التحليلات",
  lnkApiReference: "مرجع واجهة البرمجة",
  lnkCareers: "الوظائف",
  lnkCustomers: "العملاء",
  lnkDocumentation: "التوثيق",
  lnkFinance: "المالية",
  lnkHr: "الموارد البشرية",
  lnkImplementation: "دليل التطبيق",
  lnkInventory: "المخزون",
  lnkManufacturing: "التصنيع",
  lnkSecurity: "الأمان",
  lnkStatus: "حالة الخدمة",
  lnkTerms: "الشروط والأحكام",
  loadingPrices: "جارٍ تحميل الأسعار…",
  logIn: "تسجيل الدخول",
  margin: "الهامش",
  moduleHealth: "حالة الوحدات",
  morphAlt: "شكل بيانات مجرد يتغير عند التحويم",
  navDark: "داكن",
  navLight: "فاتح",
  navLogIn: "تسجيل الدخول",
  navStartFree: "ابدأ مجانًا",
  navSystem: "النظام",
  navTheme: "المظهر",
  navYourAccount: "حسابك",
  nompanyHome: "الصفحة الرئيسية لـ nompany",
  nothingMatches: "لا شيء يطابق ذلك.",
  novaAlwaysOn: "نوفا · دائمًا في الخدمة",
  novaName: "نوفا",
  novaNompanyAiAssistant: "نوفا، مساعد nompany الذكي",
  novaSitsIn: "ستحضر نوفا المكالمة وترسم كياناتك مباشرة.",
  novaWatchesEveryEvent: "تراقب نوفا كل حدث لحظة وقوعه، وتلتقط النمط، وتأتيك بالقرار — لا بلوحة أخرى عليك تفسيرها.",
  officesAmericas: "أوستن · تورونتو",
  officesEmea: "أمستردام · الرياض",
  onTheList: "أنت على القائمة.",
  orders: "الطلبات",
  payrollRunScheduled: "جُدولت دورة الرواتب",
  po4821Approved: "اعتُمد أمر الشراء PO-4821",
  preInsights: "جارٍ تجميع الرؤى الفورية",
  preLedgers: "جارٍ مزامنة السجلات",
  preModules: "جارٍ تحميل المالية · الموارد البشرية · المخزون",
  preReady: "جاهز",
  preSecureSession: "جارٍ تأمين الجلسة",
  priAllModules: "المنصة كاملة، في كل باقة",
  priAllModulesBody: "كل قسم مفعّل ابتداءً من الباقة المجانية. تدفع مقابل حجم الفريق، لا مقابل الوحدات.",
  priAlwaysFree: "مجاني دائمًا",
  priBilledEndMonth: "تُفوتر في نهاية كل شهر بحسب عدد موظفيك.",
  priBilledYearly: "تُفوتر سنويًا",
  priContactSales: "تواصل مع المبيعات",
  priCtaBody: "أنشئ حسابك المجاني — بلا بطاقة.",
  priCtaTitle: "مستعد لإدارة شركتك من منصة واحدة؟",
  priCurrency: "العملة",
  priEyebrow: "الأسعار",
  priFree: "مجاني",
  priFreeUnderTen: "مجاني لأقل من عشرة أشخاص",
  priFreeUnderTenBody: "باقة Micro مجانية للأبد حتى 9 موظفين — بالعربية والإنجليزية، وجاهزة لليمين‑إلى‑اليسار، بلا بطاقة.",
  priGetStarted: "ابدأ الآن",
  priIncludes: "تشمل",
  priInvoicedMonthly: "تُفوتر شهريًا",
  priInvoicedMonthly2: "تُفوتر شهريًا",
  priMonthly: "شهري",
  priMostPopular: "الأكثر شيوعًا",
  priPayYearly: "ادفع سنويًا، وادفع أقل",
  priStartFree: "ابدأ مجانًا",
  priStartFreeLower: "ابدأ مجانًا",
  priTitle: "تسعير ينمو مع فريقك",
  priYearly: "سنوي",
  pvAs1Body: "كل قسم مفعَّل من الخطة المجانية فما فوق. تدفع مقابل حجم الفريق، لا مقابل الوحدات.",
  pvAs1Title: "المنصة كاملة، في كل خطة",
  pvAs2Body: "خطة مايكرو مجانية دائمًا حتى تسعة موظفين — بالعربية والإنجليزية، وبدعم كامل للاتجاهين، وبلا بطاقة.",
  pvAs2Title: "مجاني تحت العشرة",
  pvAs3Body: "انتقل إلى الفوترة السنوية ليُطبَّق الخصم على كل خطة. أما الشركات التي تتجاوز 250 موظفًا فتُفوتر شهريًا على العدد الفعلي.",
  pvAs3Title: "ادفع سنويًا، وادفع أقل",
  pvBandText: "أنشئ حسابك المجاني — بلا بطاقة.",
  pvBandTitle: "جاهز لإدارة شركتك على منصة واحدة؟",
  pvBilledYearly: "يُفوتر سنويًا",
  pvCurrency: "العملة",
  pvEmployees: "موظفًا",
  pvEyebrow: "الأسعار",
  pvFreeNote: "مجاني دائمًا",
  pvFreePrice: "مجاني",
  pvGetStarted: "ابدأ الآن",
  pvIncludes: "يشمل",
  pvInvoicedMonthly: "فاتورة شهرية",
  pvInvoicedNote: "تُحتسب الفاتورة في نهاية كل شهر بحسب عدد موظفيك.",
  pvLead: "السعر بحسب حجم فريقك — ابدأ مجانًا حتى تسعة مستخدمين، ثم اختر الخطة التي تناسب عدد موظفيك. وكل خطة تشمل المنصة كاملة.",
  pvMonthly: "شهري",
  pvMostPopular: "الأكثر اختيارًا",
  pvNoPackages: "لم تُنشر أي باقات بعد.",
  pvPerMaxUsers: "حتى {n} مستخدمًا / شهريًا",
  pvTitle: "أسعار تنمو مع فريقك",
  pvYearly: "سنوي",
  reachOutOneDay: "سيتواصل معك مهندس حلول خلال يوم عمل واحد.",
  replyOneDay: "نرد خلال يوم عمل واحد. بلا رسائل متسلسلة، وبلا ملاحقة.",
  requestDemo: "اطلب عرضًا توضيحيًا",
  revenue: "الإيرادات",
  rightsReserved: "جميع الحقوق محفوظة.",
  sales: "المبيعات",
  scrollWatchDataFlow: "مرّر لترى البيانات تتدفق عبر نواة nompany.",
  searchCodeNameCountry: "ابحث بالرمز أو الاسم أو الدولة",
  searchCurrencies: "ابحث في العملات",
  seePricing: "اطّلع على الأسعار",
  selected: "المحدد",
  sendAnother: "أرسل طلبًا آخر",
  showWorkings: "اعرض الحساب",
  signOut: "تسجيل الخروج",
  sixPillarsOneDeployment: "ستة أركان في نشرٍ واحد. كل وحدة تشترك في الصلاحيات نفسها، والسجل نفسه، وواجهة البرمجة نفسها.",
  startFree: "ابدأ مجانًا",
  startFreeNow: "ابدأ مجانًا الآن",
  statClose: "إقفال أسرع لنهاية الشهر",
  statCountries: "دولة مدعومة",
  statTransactions: "معاملة تُعالَج يوميًا",
  statUptime: "جاهزية المنصة",
  stockReorderTriggered: "بدأت إعادة طلب المخزون",
  support: "الدعم",
  theme: "المظهر",
  themeDark: "داكن",
  themeLight: "فاتح",
  themeSystem: "النظام",
  thisQuarter: "هذا الربع",
  viewContact: "تواصل معنا",
  viewOverview: "نظرة عامة",
  viewPricing: "الأسعار",
  whatRunningToday: "ما الذي تُشغّله اليوم؟",
  workEmail: "بريد العمل",
  yourAccount: "حسابك",
};

const landing = { en, ar };

export function landingDict(locale: string): Strings {
  return landing[locale as Locale] || landing[defaultLocale];
}
