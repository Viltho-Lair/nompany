import { defaultLocale, type Locale } from "../locale";

// THE MARKETING DEPARTMENT'S WORDS (19/09/2026) — its dashboard and its
// campaign register. One dictionary per surface, and nothing may enumerate
// them. Named `marketingDept` because `shared/marketing/` is the PUBLIC SITE's
// copy, a different surface entirely.
//
// STATUSES, OBJECTIVES AND CHANNELS ARE TOKENS on the record and translate on
// DISPLAY only. What a tenant TYPED — a campaign's name, a UTM value, a person's
// alias — is data and is shown as typed.

type Strings = {
  loading: string;
  refused: string;
  campaigns: string;
  campaignsSub: string;
  newCampaign: string;
  editCampaign: string;
  noCampaigns: string;
  noCampaignsBody: string;
  nothingHere: string;
  filterOpen: string;
  filterFinished: string;
  filterAll: string;
  name: string;
  description: string;
  objective: string;
  channelsLabel: string;
  parent: string;
  noParent: string;
  starts: string;
  ends: string;
  owner: string;
  nobody: string;
  budget: string;
  budgetHint: (currency: string) => string;
  expectedLeads: string;
  expectedCustomers: string;
  expectedRevenue: string;
  expectedHeading: string;
  expectedHint: string;
  trackingHeading: string;
  trackingHint: string;
  landingUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmCampaignHint: string;
  utmContent: string;
  utmTerm: string;
  trackedLink: string;
  copy: string;
  copied: string;
  subCampaignOf: (name: string) => string;
  subCampaigns: (n: number) => string;
  allocated: (amount: string, left: string) => string;
  allocatedNoBudget: (amount: string) => string;
  when: (from: string, to: string) => string;
  ownedBy: (who: string) => string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  clone: string;
  remove: string;
  confirmRemove: string;
  moveTo: string;
  status: (s: string) => string;
  objectiveName: (o: string) => string;
  channelName: (c: string) => string;
  attention: (why: string) => string;
  refuse: Record<string, string>;
  // dashboard
  running: string;
  openCampaigns: string;
  startingSoon: string;
  needsAttention: string;
  openBudget: string;
  expectedRevenueTile: string;
  expectedLeadsTile: string;
  plannedNote: string;
  byStatus: string;
  byChannel: string;
  byChannelHint: string;
  runningNow: string;
  attentionHeading: string;
  nothingRunning: string;
  nothingNeeds: string;
  noChannels: string;
  openRegister: string;
  endsOn: (d: string) => string;
  noEnd: string;
  // leads (19/09/2026)
  leadDeadline: string;
  leadDeadlineHint: string;
  ownerManaged: string;
  results: (leads: number, won: number, value: string) => string;
  noResults: string;
  sendLead: string;
  sendLeadTitle: string;
  sendLeadHint: string;
  leadName: string;
  leadContact: string;
  leadPhone: string;
  leadEmail: string;
  leadWants: string;
  leadNotes: string;
  send: string;
  leadSent: string;
  leadsTile: string;
  wonValueTile: string;
  target: (v: string) => string;
};

const STATUS_EN: Record<string, string> = {
  Draft: "Draft", Planned: "Planned", Active: "Running", Paused: "Paused", Completed: "Completed", Cancelled: "Cancelled",
};
const STATUS_AR: Record<string, string> = {
  Draft: "مسودة", Planned: "مخطط لها", Active: "جارية", Paused: "متوقفة مؤقتا", Completed: "مكتملة", Cancelled: "ملغاة",
};
const OBJECTIVE_EN: Record<string, string> = {
  awareness: "Awareness", leads: "Leads", revenue: "Sales", launch: "Product launch", retention: "Retention", event: "Event", other: "Other",
};
const OBJECTIVE_AR: Record<string, string> = {
  awareness: "التعريف بالعلامة", leads: "جذب عملاء محتملين", revenue: "المبيعات", launch: "إطلاق منتج", retention: "الاحتفاظ بالعملاء", event: "فعالية", other: "أخرى",
};
const CHANNEL_EN: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", social: "Social media", "paid-search": "Paid search",
  "paid-social": "Paid social", display: "Display ads", website: "Website", events: "Events", print: "Print",
  outdoor: "Outdoor", broadcast: "TV & radio", referral: "Referral", partners: "Partners", other: "Other",
};
const CHANNEL_AR: Record<string, string> = {
  email: "البريد الإلكتروني", sms: "الرسائل النصية", whatsapp: "واتساب", social: "وسائل التواصل", "paid-search": "إعلانات البحث",
  "paid-social": "إعلانات التواصل", display: "الإعلانات المصورة", website: "الموقع الإلكتروني", events: "الفعاليات", print: "المطبوعات",
  outdoor: "الإعلانات الخارجية", broadcast: "التلفزيون والإذاعة", referral: "الإحالات", partners: "الشركاء", other: "أخرى",
};

const en: Strings = {
  loading: "Loading marketing…",
  refused: "You can't open this part of Marketing.",
  campaigns: "Campaigns",
  campaignsSub: "Every campaign, with its channels, dates, owner, budget and tracked link. Open ones first.",
  newCampaign: "New campaign",
  editCampaign: "Edit campaign",
  noCampaigns: "No campaigns yet",
  noCampaignsBody: "A campaign is the parent of everything Marketing does. Start one with its objective, channels and dates; add the budget and tracked link when you have them.",
  nothingHere: "Nothing under this filter.",
  filterOpen: "Open",
  filterFinished: "Finished",
  filterAll: "All",
  name: "Name",
  description: "Description",
  objective: "Objective",
  channelsLabel: "Channels",
  parent: "Part of",
  noParent: "— A campaign of its own —",
  starts: "Starts",
  ends: "Ends",
  owner: "Owner",
  nobody: "— Nobody —",
  budget: "Budget",
  budgetHint: (c) => (c ? `In ${c}. Leave blank if it is not decided yet.` : "Leave blank if it is not decided yet."),
  expectedLeads: "Expected leads",
  expectedCustomers: "Expected customers",
  expectedRevenue: "Expected revenue",
  expectedHeading: "What it should bring in",
  expectedHint: "Targets, not results. Leave any of them blank.",
  trackingHeading: "Tracked link",
  trackingHint: "The page this campaign sends people to, and the UTM tags that say they came from it.",
  landingUrl: "Landing page address",
  utmSource: "Source (utm_source)",
  utmMedium: "Medium (utm_medium)",
  utmCampaign: "Campaign (utm_campaign)",
  utmCampaignHint: "Blank uses the campaign's name.",
  utmContent: "Content (utm_content)",
  utmTerm: "Term (utm_term)",
  trackedLink: "Tracked link",
  copy: "Copy",
  copied: "Copied",
  subCampaignOf: (n) => `Part of ${n}`,
  subCampaigns: (n) => (n === 1 ? "1 sub-campaign" : `${n} sub-campaigns`),
  allocated: (a, left) => `${a} handed to sub-campaigns · ${left} left`,
  allocatedNoBudget: (a) => `${a} in sub-campaigns`,
  when: (from, to) => `${from || "No start date"} → ${to || "no end date"}`,
  ownedBy: (who) => `Owner: ${who}`,
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  edit: "Edit",
  clone: "Run again",
  remove: "Delete",
  confirmRemove: "Delete this campaign? This cannot be undone.",
  moveTo: "Move to",
  status: (s) => STATUS_EN[s] || s,
  objectiveName: (o) => OBJECTIVE_EN[o] || o,
  channelName: (c) => CHANNEL_EN[c] || c,
  attention: (why) => ({
    "late-start": "Should have started",
    "past-end": "Running past its end date",
    starting: "Starts within 7 days",
  } as Record<string, string>)[why] || "",
  refuse: {
    name: "Give the campaign a name.",
    dates: "The end date is before the start date.",
    parent: "That campaign no longer exists.",
    "parent-self": "A campaign cannot be part of itself.",
    "parent-depth": "Sub-campaigns go one level deep: a sub-campaign cannot have its own, and a campaign with sub-campaigns cannot become one.",
    "landing-url": "The landing page must be a web address starting with http:// or https://.",
    owner: "That person is not in this studio.",
    "wrong-state": "A campaign cannot move there from where it is.",
    "campaign-final": "A finished campaign is kept as it ran. Use Run again to start a new one.",
    "campaign-ran": "A campaign that has run is kept as a record. Cancel it or complete it instead.",
    "has-sub-campaigns": "Delete its sub-campaigns first.",
    notfound: "That campaign no longer exists.",
    forbidden: "You don't have the right to do that.",
    "lead-name": "Give the person's or the company's name.",
    "lead-contact": "Give a phone number or an email address, so Sales can reach them.",
    "no-sales": "Sales is switched off in this studio, so there is nowhere to send a lead.",
  },
  running: "Running now",
  openCampaigns: "Open campaigns",
  startingSoon: "Starting this week",
  needsAttention: "Need attention",
  openBudget: "Budget in open campaigns",
  expectedRevenueTile: "Expected revenue",
  expectedLeadsTile: "Expected leads",
  plannedNote: "Leads and won value come from the Sales tickets each campaign sent. Spend arrives with Budget & Spend.",
  byStatus: "Campaigns by status",
  byChannel: "Open campaigns by channel",
  byChannelHint: "A campaign on several channels counts once in each.",
  runningNow: "Running now",
  attentionHeading: "What needs somebody",
  nothingRunning: "Nothing is running.",
  nothingNeeds: "Nothing needs attention.",
  noChannels: "No open campaign names a channel yet.",
  openRegister: "Open campaigns",
  endsOn: (d) => `Ends ${d}`,
  noEnd: "No end date",
  leadDeadline: "Lead deadline (hours)",
  leadDeadlineHint: "How long a lead from this campaign may wait: first for a Sales manager to assign it, then for the executive to act on it. Blank for none.",
  ownerManaged: "The Marketing manager chooses who owns a campaign.",
  results: (leads, won, value) => `Leads: ${leads} · Won: ${won} · Won value: ${value}`,
  noResults: "No leads yet",
  sendLead: "Send a lead to Sales",
  sendLeadTitle: "Send a lead to Sales",
  sendLeadHint: "It arrives in Sales as a new lead from this campaign, waiting for a Sales manager to assign it.",
  leadName: "Person or company",
  leadContact: "Contact name",
  leadPhone: "Phone",
  leadEmail: "Email",
  leadWants: "What they want",
  leadNotes: "Notes",
  send: "Send to Sales",
  leadSent: "Sent to Sales.",
  leadsTile: "Leads from campaigns",
  wonValueTile: "Won from campaigns",
  target: (v) => `Target: ${v}`,
};

const ar: Strings = {
  loading: "جار تحميل التسويق…",
  refused: "لا يمكنك فتح هذا الجزء من التسويق.",
  campaigns: "الحملات",
  campaignsSub: "كل حملة بقنواتها وتواريخها ومسؤولها وميزانيتها ورابطها المتتبع. المفتوحة أولا.",
  newCampaign: "حملة جديدة",
  editCampaign: "تعديل الحملة",
  noCampaigns: "لا توجد حملات بعد",
  noCampaignsBody: "الحملة هي الأصل لكل ما يقوم به التسويق. ابدأ حملة بهدفها وقنواتها وتواريخها، وأضف الميزانية والرابط المتتبع متى توفرا.",
  nothingHere: "لا شيء ضمن هذا التصنيف.",
  filterOpen: "مفتوحة",
  filterFinished: "منتهية",
  filterAll: "الكل",
  name: "الاسم",
  description: "الوصف",
  objective: "الهدف",
  channelsLabel: "القنوات",
  parent: "جزء من",
  noParent: "— حملة مستقلة —",
  starts: "تبدأ",
  ends: "تنتهي",
  owner: "المسؤول",
  nobody: "— لا أحد —",
  budget: "الميزانية",
  budgetHint: (c) => (c ? `بعملة ${c}. اتركها فارغة إن لم تحدد بعد.` : "اتركها فارغة إن لم تحدد بعد."),
  expectedLeads: "العملاء المحتملون المتوقعون",
  expectedCustomers: "العملاء المتوقعون",
  expectedRevenue: "الإيراد المتوقع",
  expectedHeading: "ما يتوقع أن تحققه",
  expectedHint: "أهداف لا نتائج. يمكن ترك أي منها فارغا.",
  trackingHeading: "الرابط المتتبع",
  trackingHint: "الصفحة التي ترسل إليها الحملة الناس، ووسوم UTM التي تبين أنهم جاؤوا منها.",
  landingUrl: "عنوان صفحة الهبوط",
  utmSource: "المصدر (utm_source)",
  utmMedium: "الوسيط (utm_medium)",
  utmCampaign: "الحملة (utm_campaign)",
  utmCampaignHint: "إن ترك فارغا يستخدم اسم الحملة.",
  utmContent: "المحتوى (utm_content)",
  utmTerm: "الكلمة (utm_term)",
  trackedLink: "الرابط المتتبع",
  copy: "نسخ",
  copied: "تم النسخ",
  subCampaignOf: (n) => `جزء من ${n}`,
  subCampaigns: (n) => (n === 1 ? "حملة فرعية واحدة" : `${n} حملات فرعية`),
  allocated: (a, left) => `${a} مخصص للحملات الفرعية · المتبقي ${left}`,
  allocatedNoBudget: (a) => `${a} في الحملات الفرعية`,
  when: (from, to) => `${from || "دون تاريخ بدء"} ← ${to || "دون تاريخ انتهاء"}`,
  ownedBy: (who) => `المسؤول: ${who}`,
  save: "حفظ",
  saving: "جار الحفظ…",
  cancel: "إلغاء",
  edit: "تعديل",
  clone: "تشغيل مجددا",
  remove: "حذف",
  confirmRemove: "حذف هذه الحملة؟ لا يمكن التراجع عن ذلك.",
  moveTo: "نقل إلى",
  status: (s) => STATUS_AR[s] || s,
  objectiveName: (o) => OBJECTIVE_AR[o] || o,
  channelName: (c) => CHANNEL_AR[c] || c,
  attention: (why) => ({
    "late-start": "كان يجب أن تبدأ",
    "past-end": "مستمرة بعد تاريخ انتهائها",
    starting: "تبدأ خلال 7 أيام",
  } as Record<string, string>)[why] || "",
  refuse: {
    name: "أعط الحملة اسما.",
    dates: "تاريخ الانتهاء قبل تاريخ البدء.",
    parent: "تلك الحملة لم تعد موجودة.",
    "parent-self": "لا يمكن أن تكون الحملة جزءا من نفسها.",
    "parent-depth": "الحملات الفرعية مستوى واحد: لا يكون للحملة الفرعية حملات فرعية، ولا تصبح حملة لها حملات فرعية حملة فرعية.",
    "landing-url": "يجب أن تكون صفحة الهبوط عنوانا يبدأ بـ http:// أو https://.",
    owner: "هذا الشخص ليس في هذا الاستوديو.",
    "wrong-state": "لا يمكن نقل الحملة إلى هناك من حالتها الحالية.",
    "campaign-final": "الحملة المنتهية تحفظ كما جرت. استخدم «تشغيل مجددا» لبدء حملة جديدة.",
    "campaign-ran": "الحملة التي جرت تحفظ سجلا. ألغها أو أكملها بدلا من ذلك.",
    "has-sub-campaigns": "احذف حملاتها الفرعية أولا.",
    notfound: "تلك الحملة لم تعد موجودة.",
    forbidden: "ليست لديك صلاحية القيام بذلك.",
    "lead-name": "اذكر اسم الشخص أو الشركة.",
    "lead-contact": "اذكر رقم هاتف أو بريدا إلكترونيا ليتمكن فريق المبيعات من التواصل.",
    "no-sales": "المبيعات متوقفة في هذا الاستوديو، فلا يوجد مكان لإرسال العميل المحتمل إليه.",
  },
  running: "جارية الآن",
  openCampaigns: "الحملات المفتوحة",
  startingSoon: "تبدأ هذا الأسبوع",
  needsAttention: "تحتاج إلى متابعة",
  openBudget: "ميزانية الحملات المفتوحة",
  expectedRevenueTile: "الإيراد المتوقع",
  expectedLeadsTile: "العملاء المحتملون المتوقعون",
  plannedNote: "العملاء المحتملون وقيمة الصفقات الرابحة من تذاكر المبيعات التي أرسلتها كل حملة. الإنفاق يأتي مع الميزانية والإنفاق.",
  byStatus: "الحملات حسب الحالة",
  byChannel: "الحملات المفتوحة حسب القناة",
  byChannelHint: "الحملة على عدة قنوات تحسب مرة في كل منها.",
  runningNow: "جارية الآن",
  attentionHeading: "ما يحتاج إلى متابعة",
  nothingRunning: "لا شيء جار.",
  nothingNeeds: "لا شيء يحتاج إلى متابعة.",
  noChannels: "لا توجد حملة مفتوحة تذكر قناة بعد.",
  openRegister: "فتح الحملات",
  endsOn: (d) => `تنتهي ${d}`,
  noEnd: "دون تاريخ انتهاء",
  leadDeadline: "مهلة العميل المحتمل (بالساعات)",
  leadDeadlineHint: "المدة التي ينتظرها العميل المحتمل من هذه الحملة: أولا حتى يسنده مدير المبيعات، ثم حتى يتصرف المندوب. اتركها فارغة لعدم وجود مهلة.",
  ownerManaged: "مدير التسويق هو من يحدد مسؤول الحملة.",
  results: (leads, won, value) => `العملاء المحتملون: ${leads} · الصفقات الرابحة: ${won} · قيمتها: ${value}`,
  noResults: "لا يوجد عملاء محتملون بعد",
  sendLead: "إرسال عميل محتمل إلى المبيعات",
  sendLeadTitle: "إرسال عميل محتمل إلى المبيعات",
  sendLeadHint: "يصل إلى المبيعات عميلا محتملا جديدا من هذه الحملة، بانتظار أن يسنده مدير المبيعات.",
  leadName: "الشخص أو الشركة",
  leadContact: "اسم جهة الاتصال",
  leadPhone: "الهاتف",
  leadEmail: "البريد الإلكتروني",
  leadWants: "ما يطلبه",
  leadNotes: "ملاحظات",
  send: "إرسال إلى المبيعات",
  leadSent: "تم الإرسال إلى المبيعات.",
  leadsTile: "العملاء المحتملون من الحملات",
  wonValueTile: "قيمة الصفقات الرابحة من الحملات",
  target: (v) => `المستهدف: ${v}`,
};

const marketingDept: Record<Locale, Strings> = { en, ar };

export function marketingDeptDict(locale: string): Strings {
  return marketingDept[(locale as Locale)] || marketingDept[defaultLocale];
}

export type { Strings as MarketingDeptStrings };
