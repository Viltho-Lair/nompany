import { defaultLocale, type Locale } from "../locale";

// LIFECYCLE & CONTRACTS' OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// THE STATUS WORDS ARE NOT HERE. An employment status is a stored token
// translated on DISPLAY by the shared `statusLabel` map, exactly as a leave
// status is — so what the API returns and what payroll reads are the same
// either way, and one pill renders every ladder in the product.
//
// A CONTRACT TYPE AND AN EXIT REASON ARE ALSO TOKENS, and those DO live here:
// unlike a status they come from the country pack, which is English data, and
// the pill map is for colours rather than for every closed list in the product.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  attention: string;
  nothingDue: string;
  probationDue: string;
  contractDue: string;
  noticeDue: string;
  person: string;
  status: string;
  contract: string;
  jobTitle: string;
  since: string;
  noContract: string;
  noContractHint: string;
  newContract: string;
  amend: string;
  amending: string;
  history: string;
  noHistory: string;
  versions: (n: number) => string;
  type: string;
  startDate: string;
  endDate: string;
  probationMonths: string;
  noticeDays: string;
  weeklyHours: string;
  note: string;
  reason: string;
  effectiveDate: string;
  lastWorkingDay: string;
  deductions: string;
  save: string;
  saving: string;
  cancel: string;
  packSays: (country: string, source: string) => string;
  packDefaults: (probation: number, notice: number) => string;
  noPack: string;
  // the moves
  move: (key: string) => string;
  moveLead: (key: string) => string;
  // the settlement
  settlement: string;
  settlementLead: string;
  service: string;
  years: (n: number) => string;
  endOfService: string;
  noEosRule: string;
  encashment: string;
  leaveDays: (n: number) => string;
  unknownBalance: string;
  noticeInLieu: string;
  owedToThem: string;
  owedByThem: string;
  dailyWage: string;
  total: string;
  incomplete: string;
  payHidden: string;
  // refusals
  problem: (code: string) => string;
  viewOnly: string;
  contractTypeLabel: (token: string) => string;
  reasonLabel: (token: string) => string;
  eventLabel: (token: string) => string;
};

const EN_MOVES: Record<string, string> = {
  hire: "Rehire", start: "Start", confirm: "Confirm", suspend: "Suspend",
  reinstate: "Reinstate", giveNotice: "Give notice", withdrawNotice: "Withdraw notice",
  exit: "Record the exit",
};
const EN_MOVE_LEAD: Record<string, string> = {
  hire: "They worked here before. This starts a new employment; the old one stays in the history.",
  start: "Their first day. Probation runs from the contract's start date.",
  confirm: "Probation is over and they are confirmed in the job.",
  suspend: "Still employed and not at work.",
  reinstate: "Back at work.",
  giveNotice: "Either side has given notice. They stay on the payroll until the last working day.",
  exit: "Their last day. This is what the final settlement is calculated on.",
  withdrawNotice: "The notice is off and they stay.",
};
const EN_TYPES: Record<string, string> = {
  Permanent: "Permanent", "Fixed term": "Fixed term", "Part time": "Part time",
  Casual: "Casual", Internship: "Internship", Secondment: "Secondment",
};
const EN_REASONS: Record<string, string> = {
  Resignation: "Resigned", Termination: "Terminated", "End of contract": "Contract ended",
  Redundancy: "Redundancy", Retirement: "Retired", Death: "Death in service",
};
const EN_EVENTS: Record<string, string> = {
  ...EN_MOVES, contract: "Contract signed", amendment: "Contract amended",
  transfer: "Transferred", promotion: "Promoted", note: "Note",
};
const EN_PROBLEMS: Record<string, string> = {
  collaborator: "Pick who this contract is for.",
  type: "That kind of contract is not one this country recognises.",
  start: "A contract needs a start date.",
  end: "An open-ended contract cannot carry an end date, and an end date cannot be before the start.",
  term: "A fixed-term contract needs an end date.",
  probation: "That is longer than this country allows.",
  notice: "That is longer than this country allows.",
  hours: "That is more hours than there are in a week.",
  "illegal-move": "That is not a step this employment can take from where it is.",
  "unknown-move": "That is not a step this employment can take.",
  supersedes: "That contract is not this person's.",
  superseded: "That version has already been amended. Reload and amend the current one.",
  "salary-forbidden": "The settlement needs the right to see pay.",
  department: "That department is not part of this studio.",
  forbidden: "That person is not in your part of the studio.",
  "read-only": "You have view-only access here.",
};

const en: Strings = {
  tab: "Lifecycle",
  title: "Employment",
  lead: "The contract somebody is on, the state their employment is in, and what is owed when it ends.",
  attention: "Running out",
  nothingDue: "Nothing needs you today.",
  probationDue: "Probation ends",
  contractDue: "Contract ends",
  noticeDue: "Last working day",
  person: "Person",
  status: "State",
  contract: "Contract",
  jobTitle: "Job title",
  since: "Since",
  noContract: "No contract on file",
  noContractHint: "Their employment has no terms recorded — no probation, no notice period, and nothing for a settlement to read.",
  newContract: "New contract",
  amend: "Amend",
  amending: "Amending — the current version is kept and this replaces it from its own start date.",
  history: "History",
  noHistory: "Nothing recorded yet.",
  versions: (n) => (n === 1 ? "1 version" : `${n} versions`),
  type: "Kind",
  startDate: "Starts",
  endDate: "Ends",
  probationMonths: "Probation (months)",
  noticeDays: "Notice (days)",
  weeklyHours: "Hours a week",
  note: "Note",
  reason: "Reason",
  effectiveDate: "Effective",
  lastWorkingDay: "Last working day",
  deductions: "Deductions",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  packSays: (country, source) => `${country} — ${source}`,
  packDefaults: (probation, notice) =>
    `Defaults: ${probation} months' probation, ${notice} days' notice.`,
  noPack: "No country rules for this studio — the defaults below are the product's, not a country's. Set the studio's country in Studio settings.",
  move: (k) => EN_MOVES[k] || k,
  moveLead: (k) => EN_MOVE_LEAD[k] || "",
  settlement: "Final settlement",
  settlementLead: "Recalculated as you change the date. Nothing is stored until the exit is recorded.",
  service: "Service",
  years: (n) => `${n} ${n === 1 ? "year" : "years"}`,
  endOfService: "End of service",
  noEosRule: "This studio has no end-of-service rule.",
  encashment: "Unused leave",
  leaveDays: (n) => `${n} ${n === 1 ? "day" : "days"}`,
  unknownBalance: "No leave rule — nothing to encash from.",
  noticeInLieu: "Notice not served",
  owedToThem: "owed to them",
  owedByThem: "owed by them",
  dailyWage: "A day's pay",
  total: "Total",
  incomplete: "One of these figures could not be read, so this total is not the whole settlement.",
  payHidden: "You cannot see pay, so no settlement is calculated. The exit can still be recorded.",
  problem: (code) => EN_PROBLEMS[code] || "That did not save.",
  viewOnly: "View only",
  contractTypeLabel: (t) => EN_TYPES[t] || t,
  reasonLabel: (t) => EN_REASONS[t] || t,
  eventLabel: (t) => EN_EVENTS[t] || t,
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_MOVES: Record<string, string> = {
  hire: "اعادة توظيف", start: "مباشرة العمل", confirm: "تثبيت", suspend: "ايقاف",
  reinstate: "اعادة الى العمل", giveNotice: "تقديم اشعار", withdrawNotice: "سحب الاشعار",
  exit: "تسجيل انهاء الخدمة",
};
const AR_MOVE_LEAD: Record<string, string> = {
  hire: "عمل هنا سابقا. هذه خدمة جديدة، والخدمة القديمة تبقى في السجل.",
  start: "أول يوم عمل. فترة التجربة تبدأ من تاريخ بداية العقد.",
  confirm: "انتهت فترة التجربة وثبت في وظيفته.",
  suspend: "على رأس الخدمة وغير مباشر للعمل.",
  reinstate: "عاد الى العمل.",
  giveNotice: "قدم أحد الطرفين اشعارا. يبقى على كشف الرواتب حتى آخر يوم عمل.",
  exit: "آخر يوم عمل. عليه تحسب المستحقات النهائية.",
  withdrawNotice: "سحب الاشعار ويبقى في عمله.",
};
const AR_TYPES: Record<string, string> = {
  Permanent: "غير محدد المدة", "Fixed term": "محدد المدة", "Part time": "دوام جزئي",
  Casual: "مياومة", Internship: "تدريب", Secondment: "اعارة",
};
const AR_REASONS: Record<string, string> = {
  Resignation: "استقالة", Termination: "انهاء خدمة", "End of contract": "انتهاء العقد",
  Redundancy: "الغاء الوظيفة", Retirement: "تقاعد", Death: "وفاة",
};
const AR_EVENTS: Record<string, string> = {
  ...AR_MOVES, contract: "توقيع عقد", amendment: "تعديل عقد",
  transfer: "نقل", promotion: "ترقية", note: "ملاحظة",
};
const AR_PROBLEMS: Record<string, string> = {
  collaborator: "اختاروا صاحب العقد.",
  type: "هذا النوع من العقود غير معترف به في هذه الدولة.",
  start: "العقد يحتاج تاريخ بداية.",
  end: "العقد غير محدد المدة لا يحمل تاريخ انتهاء، وتاريخ الانتهاء لا يسبق البداية.",
  term: "العقد محدد المدة يحتاج تاريخ انتهاء.",
  probation: "هذه المدة أطول مما تسمح به الدولة.",
  notice: "هذه المدة أطول مما تسمح به الدولة.",
  hours: "هذه ساعات أكثر مما في الاسبوع.",
  "illegal-move": "هذه الخطوة غير ممكنة من الحالة الحالية.",
  "unknown-move": "هذه الخطوة غير معروفة.",
  supersedes: "هذا العقد ليس لهذا الموظف.",
  superseded: "هذه النسخة عدلت سابقا. حدثوا الصفحة وعدلوا النسخة الحالية.",
  "salary-forbidden": "حساب المستحقات يحتاج صلاحية الاطلاع على الرواتب.",
  department: "هذا القسم ليس من هذه المنشأة.",
  forbidden: "هذا الموظف ليس ضمن نطاقكم.",
  "read-only": "صلاحيتكم هنا للاطلاع فقط.",
};

const ar: Strings = {
  tab: "دورة الخدمة",
  title: "الخدمة والعقود",
  lead: "العقد الذي يعمل به الموظف، وحالة خدمته، وما يستحقه عند انتهائها.",
  attention: "على وشك الانتهاء",
  nothingDue: "لا شيء يحتاجكم اليوم.",
  probationDue: "انتهاء فترة التجربة",
  contractDue: "انتهاء العقد",
  noticeDue: "آخر يوم عمل",
  person: "الموظف",
  status: "الحالة",
  contract: "العقد",
  jobTitle: "المسمى الوظيفي",
  since: "منذ",
  noContract: "لا يوجد عقد مسجل",
  noContractHint: "خدمته بلا شروط مسجلة — لا فترة تجربة ولا مدة اشعار ولا أساس لحساب المستحقات.",
  newContract: "عقد جديد",
  amend: "تعديل",
  amending: "تعديل — تبقى النسخة الحالية محفوظة ويحل هذا محلها من تاريخ بدايته.",
  history: "السجل",
  noHistory: "لا شيء مسجل بعد.",
  versions: (n) => (n === 1 ? "نسخة واحدة" : n === 2 ? "نسختان" : `${n} نسخ`),
  type: "النوع",
  startDate: "البداية",
  endDate: "الانتهاء",
  probationMonths: "فترة التجربة (أشهر)",
  noticeDays: "مدة الاشعار (أيام)",
  weeklyHours: "ساعات الاسبوع",
  note: "ملاحظة",
  reason: "السبب",
  effectiveDate: "تاريخ السريان",
  lastWorkingDay: "آخر يوم عمل",
  deductions: "الاستقطاعات",
  save: "حفظ",
  saving: "جار الحفظ…",
  cancel: "الغاء",
  packSays: (country, source) => `${country} — ${source}`,
  packDefaults: (probation, notice) => `الافتراضي: ${probation} أشهر تجربة و${notice} يوما اشعارا.`,
  noPack: "لا توجد قواعد دولة لهذه المنشأة — القيم أدناه قيم المنتج لا قيم دولة. حددوا دولة المنشأة في اعدادات المنشأة.",
  move: (k) => AR_MOVES[k] || k,
  moveLead: (k) => AR_MOVE_LEAD[k] || "",
  settlement: "المستحقات النهائية",
  settlementLead: "تحتسب من جديد مع كل تغيير للتاريخ. لا يحفظ شيء حتى يسجل انهاء الخدمة.",
  service: "مدة الخدمة",
  years: (n) => `${n} ${n === 1 ? "سنة" : n === 2 ? "سنتان" : "سنوات"}`,
  endOfService: "مكافأة نهاية الخدمة",
  noEosRule: "لا توجد قاعدة لمكافأة نهاية الخدمة في هذه المنشأة.",
  encashment: "بدل الاجازات غير المستخدمة",
  leaveDays: (n) => `${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : "أيام"}`,
  unknownBalance: "لا توجد قاعدة اجازات — لا أساس لحساب البدل.",
  noticeInLieu: "بدل الاشعار غير المخدوم",
  owedToThem: "له",
  owedByThem: "عليه",
  dailyWage: "أجر اليوم",
  total: "الاجمالي",
  incomplete: "تعذرت قراءة أحد هذه المبالغ، فهذا الاجمالي ليس كامل المستحقات.",
  payHidden: "لا تملكون صلاحية الاطلاع على الرواتب، فلن تحتسب المستحقات. ويمكن تسجيل انهاء الخدمة.",
  problem: (code) => AR_PROBLEMS[code] || "لم يحفظ.",
  viewOnly: "للاطلاع فقط",
  contractTypeLabel: (t) => AR_TYPES[t] || t,
  reasonLabel: (t) => AR_REASONS[t] || t,
  eventLabel: (t) => AR_EVENTS[t] || t,
};

const dict = { en, ar };

export function lifecycleDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as LifecycleStrings };
