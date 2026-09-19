import { defaultLocale, type Locale } from "../locale";

// MARKETING FORMS' WORDS IN THE STUDIO (19/09/2026) — the forms list, the
// editor's three tabs and sharing. One dictionary per surface, and nothing may
// enumerate them. The public page speaks ../forms; what a studio TYPED (a
// form's name, its questions) is data and is shown as typed.

type Strings = {
  loading: string;
  forms: string;
  formsSub: string;
  startNew: string;
  template: (t: string) => string;
  templateHint: (t: string) => string;
  recent: string;
  noForms: string;
  noFormsBody: string;
  newForm: string;
  name: string;
  language: string;
  langName: (l: string) => string;
  create: string;
  creating: string;
  cancel: string;
  status: (s: string) => string;
  responsesCount: (n: number) => string;
  makesLeads: string;
  open: string;
  back: string;
  tabQuestions: string;
  tabResponses: string;
  tabSettings: string;
  save: string;
  saving: string;
  saved: string;
  unsaved: string;
  preview: string;
  hidePreview: string;
  pages: string;
  addPage: string;
  page: (n: number) => string;
  removePage: string;
  pageTitle: string;
  pageLead: string;
  addQuestion: string;
  typeName: (t: string) => string;
  question: string;
  description: string;
  requiredToggle: string;
  choices: string;
  addChoice: string;
  multiple: string;
  allowOther: string;
  placeholder: string;
  scaleFrom: string;
  scaleTo: string;
  lowLabel: string;
  highLabel: string;
  moveUp: string;
  moveDown: string;
  remove: string;
  noQuestions: string;
  logic: string;
  logicHint: string;
  whenAnswer: string;
  thenShow: string;
  addRule: string;
  removeRule: string;
  statusHeading: string;
  statusHint: string;
  openIt: string;
  closeIt: string;
  toDraft: string;
  problem: (p: string) => string;
  campaign: string;
  campaignNone: string;
  campaignHint: string;
  createLead: string;
  createLeadHint: string;
  salesOff: string;
  leadField: (k: string) => string;
  leadFieldNone: string;
  confirmation: string;
  confirmationHint: string;
  closesOn: string;
  closesOnHint: string;
  share: string;
  shareHint: string;
  shareDraft: string;
  link: string;
  copy: string;
  copied: string;
  qr: string;
  downloadQr: string;
  embed: string;
  embedHint: string;
  deleteForm: string;
  confirmDelete: string;
  responsesHeading: (n: number) => string;
  downloadCsv: string;
  noResponses: string;
  answered: (a: number, s: number) => string;
  retired: string;
  every: string;
  when: string;
  lead: string;
  refuse: Record<string, string>;
};

const TYPE_EN: Record<string, string> = {
  "short-text": "Short answer", "long-text": "Paragraph", email: "Email", phone: "Phone", number: "Number",
  date: "Date", website: "Website", "multiple-choice": "Multiple choice", dropdown: "Dropdown", "yes-no": "Yes / No",
  legal: "Consent", rating: "Rating", "opinion-scale": "Scale", nps: "Recommend score (0–10)", statement: "Text only",
};
const TYPE_AR: Record<string, string> = {
  "short-text": "إجابة قصيرة", "long-text": "فقرة", email: "بريد إلكتروني", phone: "هاتف", number: "رقم",
  date: "تاريخ", website: "موقع إلكتروني", "multiple-choice": "اختيار من متعدد", dropdown: "قائمة منسدلة", "yes-no": "نعم / لا",
  legal: "موافقة", rating: "تقييم", "opinion-scale": "مقياس", nps: "مؤشر التوصية (0–10)", statement: "نص فقط",
};

const en: Strings = {
  loading: "Loading forms…",
  forms: "Forms",
  formsSub: "Forms the public fills in: enquiries that become Sales leads, event registrations, customer surveys.",
  startNew: "Start a new form",
  template: (t) => ({ blank: "Blank form", enquiry: "Enquiry", event: "Event registration", feedback: "Customer feedback" } as Record<string, string>)[t] || t,
  templateHint: (t) => ({
    blank: "One page, one question.",
    enquiry: "Name, company, phone, email, message and consent. Makes Sales leads.",
    event: "Who is coming, how many and to which session.",
    feedback: "Recommend score, rating and comments.",
  } as Record<string, string>)[t] || "",
  recent: "Your forms",
  noForms: "No forms yet",
  noFormsBody: "Start from a template above. A form is a draft until you open it; nobody outside the studio can see it before then.",
  newForm: "New form",
  name: "Form name",
  language: "Language of the form",
  langName: (l) => (l === "ar" ? "Arabic" : "English"),
  create: "Create",
  creating: "Creating…",
  cancel: "Cancel",
  status: (s) => ({ Draft: "Draft", Open: "Open", Closed: "Closed" } as Record<string, string>)[s] || s,
  responsesCount: (n) => (n === 1 ? "1 response" : `${n} responses`),
  makesLeads: "Makes Sales leads",
  open: "Open",
  back: "All forms",
  tabQuestions: "Questions",
  tabResponses: "Responses",
  tabSettings: "Settings",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  unsaved: "Unsaved changes",
  preview: "Preview",
  hidePreview: "Hide preview",
  pages: "Pages",
  addPage: "Add page",
  page: (n) => `Page ${n}`,
  removePage: "Remove page",
  pageTitle: "Page title",
  pageLead: "Page description (optional)",
  addQuestion: "Add a question",
  typeName: (t) => TYPE_EN[t] || t,
  question: "Question",
  description: "Help text (optional)",
  requiredToggle: "Required",
  choices: "Choices",
  addChoice: "Add a choice",
  multiple: "Allow more than one answer",
  allowOther: "Add an “Other” answer",
  placeholder: "Placeholder",
  scaleFrom: "From",
  scaleTo: "To",
  lowLabel: "Label at the low end",
  highLabel: "Label at the high end",
  moveUp: "Move up",
  moveDown: "Move down",
  remove: "Remove",
  noQuestions: "This page has no questions yet.",
  logic: "Show other questions depending on the answer",
  logicHint: "Questions shown by a rule are hidden until the rule is met.",
  whenAnswer: "When the answer is",
  thenShow: "show",
  addRule: "Add a rule",
  removeRule: "Remove rule",
  statusHeading: "Who can answer",
  statusHint: "A draft is only visible inside the studio. Open it to take answers; close it to stop.",
  openIt: "Open to the public",
  closeIt: "Close",
  toDraft: "Back to draft",
  problem: (p) => ({
    "no-questions": "Add at least one question.",
    "lead-contact": "It makes Sales leads: choose which answer is the phone or the email.",
    "lead-name": "It makes Sales leads: choose which answer is the person's or the company's name.",
    consent: "It collects contact details: add a required Consent question.",
  } as Record<string, string>)[p] || p,
  campaign: "Campaign",
  campaignNone: "— None —",
  campaignHint: "Answers count toward this campaign, and its lead deadline applies.",
  createLead: "Each answer becomes a Sales lead",
  createLeadHint: "It arrives in Sales unassigned, for a Sales manager to hand to an executive.",
  salesOff: "Sales is switched off in this studio, so answers cannot become leads.",
  leadField: (k) => ({ name: "Person's name", company: "Company", phone: "Phone", email: "Email" } as Record<string, string>)[k] || k,
  leadFieldNone: "— Not asked —",
  confirmation: "Thank-you message",
  confirmationHint: "Shown after someone sends their answers.",
  closesOn: "Stops taking answers after",
  closesOnHint: "Optional. The form closes itself at the end of this day.",
  share: "Share",
  shareHint: "Anyone with the link can answer. No sign-in.",
  shareDraft: "Open the form to share it. A draft's link shows nothing to the public.",
  link: "Link",
  copy: "Copy",
  copied: "Copied",
  qr: "QR code",
  downloadQr: "Download QR code",
  embed: "Embed on your website",
  embedHint: "Paste this into your website's HTML — in WordPress, Wix, Shopify and most site builders it goes in a “Custom HTML” or “Embed” block. It works the same on every website.",
  deleteForm: "Delete form",
  confirmDelete: "Delete this form? This cannot be undone.",
  responsesHeading: (n) => (n === 1 ? "1 response" : `${n} responses`),
  downloadCsv: "Download all (CSV)",
  noResponses: "No responses yet.",
  answered: (a, s) => `${a} answered · ${s} skipped`,
  retired: "No longer asked",
  every: "Every response",
  when: "When",
  lead: "Sales lead",
  refuse: {
    name: "Give the form a name.",
    campaign: "That campaign no longer exists.",
    "has-responses": "This form has responses, so it is kept. Close it instead.",
    status: "That is not a status a form can have.",
    notfound: "That form no longer exists.",
    forbidden: "You don't have the right to do that.",
    "no-questions": "Add at least one question.",
    "lead-contact": "It makes Sales leads: choose which answer is the phone or the email.",
    "lead-name": "It makes Sales leads: choose which answer is the name.",
    consent: "It collects contact details: add a required Consent question.",
  },
};

const ar: Strings = {
  loading: "جار تحميل النماذج…",
  forms: "النماذج",
  formsSub: "نماذج يملؤها الجمهور: استفسارات تصبح عملاء محتملين للمبيعات، وتسجيل في الفعاليات، واستبيانات العملاء.",
  startNew: "ابدأ نموذجا جديدا",
  template: (t) => ({ blank: "نموذج فارغ", enquiry: "استفسار", event: "تسجيل في فعالية", feedback: "رأي العملاء" } as Record<string, string>)[t] || t,
  templateHint: (t) => ({
    blank: "صفحة واحدة وسؤال واحد.",
    enquiry: "الاسم والشركة والهاتف والبريد والرسالة والموافقة. يصنع عملاء محتملين للمبيعات.",
    event: "من سيحضر، وكم عددهم، وأي جلسة.",
    feedback: "مؤشر التوصية والتقييم والملاحظات.",
  } as Record<string, string>)[t] || "",
  recent: "نماذجك",
  noForms: "لا توجد نماذج بعد",
  noFormsBody: "ابدأ من أحد القوالب أعلاه. النموذج مسودة حتى تفتحه، ولا يراه أحد من خارج الاستوديو قبل ذلك.",
  newForm: "نموذج جديد",
  name: "اسم النموذج",
  language: "لغة النموذج",
  langName: (l) => (l === "ar" ? "العربية" : "الإنجليزية"),
  create: "إنشاء",
  creating: "جار الإنشاء…",
  cancel: "إلغاء",
  status: (s) => ({ Draft: "مسودة", Open: "مفتوح", Closed: "مغلق" } as Record<string, string>)[s] || s,
  responsesCount: (n) => (n === 1 ? "إجابة واحدة" : `${n} إجابات`),
  makesLeads: "يصنع عملاء محتملين للمبيعات",
  open: "فتح",
  back: "كل النماذج",
  tabQuestions: "الأسئلة",
  tabResponses: "الإجابات",
  tabSettings: "الإعدادات",
  save: "حفظ",
  saving: "جار الحفظ…",
  saved: "تم الحفظ",
  unsaved: "تغييرات غير محفوظة",
  preview: "معاينة",
  hidePreview: "إخفاء المعاينة",
  pages: "الصفحات",
  addPage: "إضافة صفحة",
  page: (n) => `الصفحة ${n}`,
  removePage: "حذف الصفحة",
  pageTitle: "عنوان الصفحة",
  pageLead: "وصف الصفحة (اختياري)",
  addQuestion: "إضافة سؤال",
  typeName: (t) => TYPE_AR[t] || t,
  question: "السؤال",
  description: "نص مساعد (اختياري)",
  requiredToggle: "مطلوب",
  choices: "الخيارات",
  addChoice: "إضافة خيار",
  multiple: "السماح بأكثر من إجابة",
  allowOther: "إضافة إجابة «أخرى»",
  placeholder: "نص توضيحي",
  scaleFrom: "من",
  scaleTo: "إلى",
  lowLabel: "تسمية الطرف الأدنى",
  highLabel: "تسمية الطرف الأعلى",
  moveUp: "تحريك لأعلى",
  moveDown: "تحريك لأسفل",
  remove: "حذف",
  noQuestions: "لا توجد أسئلة في هذه الصفحة بعد.",
  logic: "إظهار أسئلة أخرى بحسب الإجابة",
  logicHint: "الأسئلة التي تظهرها قاعدة تبقى مخفية حتى تتحقق القاعدة.",
  whenAnswer: "عندما تكون الإجابة",
  thenShow: "أظهر",
  addRule: "إضافة قاعدة",
  removeRule: "حذف القاعدة",
  statusHeading: "من يمكنه الإجابة",
  statusHint: "المسودة لا تظهر إلا داخل الاستوديو. افتح النموذج لاستقبال الإجابات، وأغلقه لإيقافها.",
  openIt: "فتح للجمهور",
  closeIt: "إغلاق",
  toDraft: "إعادة إلى مسودة",
  problem: (p) => ({
    "no-questions": "أضف سؤالا واحدا على الأقل.",
    "lead-contact": "يصنع عملاء محتملين: حدد أي إجابة هي الهاتف أو البريد.",
    "lead-name": "يصنع عملاء محتملين: حدد أي إجابة هي اسم الشخص أو الشركة.",
    consent: "يجمع بيانات تواصل: أضف سؤال موافقة مطلوبا.",
  } as Record<string, string>)[p] || p,
  campaign: "الحملة",
  campaignNone: "— لا شيء —",
  campaignHint: "تحسب الإجابات لهذه الحملة، وتطبق مهلة عملائها المحتملين.",
  createLead: "كل إجابة تصبح عميلا محتملا للمبيعات",
  createLeadHint: "تصل إلى المبيعات دون إسناد، ليسندها مدير المبيعات إلى مندوب.",
  salesOff: "المبيعات متوقفة في هذا الاستوديو، فلا يمكن أن تصبح الإجابات عملاء محتملين.",
  leadField: (k) => ({ name: "اسم الشخص", company: "الشركة", phone: "الهاتف", email: "البريد الإلكتروني" } as Record<string, string>)[k] || k,
  leadFieldNone: "— غير مسؤول —",
  confirmation: "رسالة الشكر",
  confirmationHint: "تظهر بعد أن يرسل الشخص إجاباته.",
  closesOn: "يتوقف عن استقبال الإجابات بعد",
  closesOnHint: "اختياري. يغلق النموذج تلقائيا في نهاية هذا اليوم.",
  share: "المشاركة",
  shareHint: "يمكن لأي شخص لديه الرابط أن يجيب دون تسجيل دخول.",
  shareDraft: "افتح النموذج لمشاركته. رابط المسودة لا يعرض شيئا للجمهور.",
  link: "الرابط",
  copy: "نسخ",
  copied: "تم النسخ",
  qr: "رمز QR",
  downloadQr: "تنزيل رمز QR",
  embed: "التضمين في موقعك",
  embedHint: "الصق هذا في HTML موقعك — في ووردبريس وويكس وشوبيفاي ومعظم منشئي المواقع يوضع في كتلة «HTML مخصص» أو «تضمين». يعمل بالطريقة نفسها في أي موقع.",
  deleteForm: "حذف النموذج",
  confirmDelete: "حذف هذا النموذج؟ لا يمكن التراجع عن ذلك.",
  responsesHeading: (n) => (n === 1 ? "إجابة واحدة" : `${n} إجابات`),
  downloadCsv: "تنزيل الكل (CSV)",
  noResponses: "لا توجد إجابات بعد.",
  answered: (a, s) => `${a} أجابوا · ${s} تخطوا`,
  retired: "لم يعد يسأل",
  every: "كل الإجابات",
  when: "الوقت",
  lead: "عميل محتمل",
  refuse: {
    name: "أعط النموذج اسما.",
    campaign: "تلك الحملة لم تعد موجودة.",
    "has-responses": "لهذا النموذج إجابات، لذا يحتفظ به. أغلقه بدلا من ذلك.",
    status: "هذه ليست حالة يمكن أن يكون عليها النموذج.",
    notfound: "هذا النموذج لم يعد موجودا.",
    forbidden: "ليست لديك صلاحية القيام بذلك.",
    "no-questions": "أضف سؤالا واحدا على الأقل.",
    "lead-contact": "يصنع عملاء محتملين: حدد أي إجابة هي الهاتف أو البريد.",
    "lead-name": "يصنع عملاء محتملين: حدد أي إجابة هي الاسم.",
    consent: "يجمع بيانات تواصل: أضف سؤال موافقة مطلوبا.",
  },
};

const forms: Record<Locale, Strings> = { en, ar };

export function formsDict(locale: string): Strings {
  return forms[(locale as Locale)] || forms[defaultLocale];
}

export type { Strings as FormsStrings };
