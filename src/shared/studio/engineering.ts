import { defaultLocale, type Locale } from "../locale";

// ENGINEERING & DOCUMENTS' DASHBOARD WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// A DOCUMENT STATE, A SUBMITTAL OUTCOME AND A BALL-IN-COURT PARTY ARE TOKENS on
// the record and translate on DISPLAY only, with the raw token shown for anything
// a studio added itself — typed data is data.

type Strings = {
  dashboard: string;
  dashboardSub: (date: string) => string;
  loading: string;
  nothingYours: string;
  waitingOnYou: string;
  inReview: (n: number) => string;
  openRfis: string;
  overdue: (n: number) => string;
  answeredAwaiting: (n: number) => string;
  rfisAnswered: string;
  submittalsOut: string;
  reviewsDue: string;
  reviewsDueSub: (days: number) => string;
  transmittalsAwaiting: string;
  bomInReview: string;
  libraryCurrent: string;
  withdrawn: (n: number) => string;
  documentStatus: string;
  documentStatusHint: string;
  documentsWord: string;
  noDocuments: string;
  ballInCourt: string;
  ballInCourtHint: string;
  noOpenRfis: string;
  submittalOutcomes: string;
  submittalOutcomesHint: string;
  noOutcomes: string;
  rfiIntake: string;
  rfiIntakeHint: string;
  noRfis: string;
  reviewDueTitle: string;
  reviewDueHint: string;
  nothingDue: string;
  attention: string;
  attentionHint: string;
  nothingLate: string;
  daysLate: (n: number) => string;
  dueIn: (n: number) => string;
  kind: (k: string) => string;
  state: (t: string) => string;
  outcome: (t: string) => string;
  party: (t: string) => string;
  refuse: Record<string, string>;
};

const EN_STATE: Record<string, string> = {
  draft: "Draft", "in-review": "In review", approved: "Approved, not issued", effective: "Effective", obsolete: "Obsolete",
};
const EN_PARTY: Record<string, string> = {
  Us: "Us", Client: "Client", Consultant: "Consultant", Contractor: "Contractor", Subcontractor: "Subcontractor",
  "": "Not set", other: "Other",
};

const en: Strings = {
  dashboard: "Engineering & Documents",
  dashboardSub: (date) => `Documents, RFIs, submittals and transmittals, as of ${date}.`,
  loading: "Loading the engineering dashboard…",
  nothingYours: "None of this department's registers is open to you. Ask an admin for the one you work in.",
  waitingOnYou: "Waiting on you",
  inReview: (n) => `${n} in review or approval`,
  openRfis: "Open RFIs",
  overdue: (n) => (n ? `${n} past the date needed` : "None late"),
  answeredAwaiting: (n) => `${n} answered, awaiting acceptance`,
  rfisAnswered: "RFIs answered, awaiting acceptance",
  submittalsOut: "Submittals out for review",
  reviewsDue: "Document reviews due",
  reviewsDueSub: (days) => `Effective documents, next ${days} days`,
  transmittalsAwaiting: "Transmittals awaiting acknowledgement",
  bomInReview: "Engineering BOMs in review",
  libraryCurrent: "Current library references",
  withdrawn: (n) => `${n} withdrawn`,
  documentStatus: "Documents by state",
  documentStatusHint: "Every controlled document, by where its revisions stand",
  documentsWord: "documents",
  noDocuments: "No documents in the register yet.",
  ballInCourt: "Where the ball is",
  ballInCourtHint: "Open RFIs, by who has to act next",
  noOpenRfis: "No open RFIs.",
  submittalOutcomes: "How submittals came back",
  submittalOutcomesHint: "Reviewed submittals, by their current outcome",
  noOutcomes: "No submittal has been reviewed yet.",
  rfiIntake: "RFIs raised per month",
  rfiIntakeHint: "Last six months, by the date each was raised",
  noRfis: "No RFIs raised in the last six months.",
  reviewDueTitle: "Reviews coming due",
  reviewDueHint: "Effective documents whose next review falls in the next 30 days, or has passed",
  nothingDue: "No document review is due in the next 30 days.",
  attention: "Late, by name",
  attentionHint: "Open RFIs past the date needed and submittals past their response date, most late first",
  nothingLate: "Nothing is late.",
  daysLate: (n) => `${n} ${n === 1 ? "day" : "days"} late`,
  dueIn: (n) => (n < 0 ? `${-n} ${n === -1 ? "day" : "days"} overdue` : n === 0 ? "Due today" : `In ${n} ${n === 1 ? "day" : "days"}`),
  kind: (k) => (k === "rfi" ? "RFI" : "Submittal"),
  state: (t) => EN_STATE[t] || t,
  outcome: (t) => t,
  party: (t) => EN_PARTY[t] ?? t,
  refuse: {
    forbidden: "None of this department's registers is open to you.",
    "no-section": "This studio has no Engineering & Documents section.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_STATE: Record<string, string> = {
  draft: "مسودة", "in-review": "قيد المراجعة", approved: "معتمد ولم يصدر", effective: "سار", obsolete: "ملغى",
};
const AR_OUTCOME: Record<string, string> = {
  Approved: "معتمد", "Approved as noted": "معتمد مع ملاحظات", "Revise and resubmit": "يعدل ويعاد تقديمه",
};
const AR_PARTY: Record<string, string> = {
  Us: "نحن", Client: "العميل", Consultant: "الاستشاري", Contractor: "المقاول", Subcontractor: "مقاول الباطن",
  "": "غير محدد", other: "أخرى",
};

const ar: Strings = {
  dashboard: "الهندسة والمستندات",
  dashboardSub: (date) => `المستندات وطلبات الاستيضاح والتقديمات وكتب الإحالة، حتى ${date}.`,
  loading: "جار تحميل لوحة الهندسة…",
  nothingYours: "لا يتاح لكم أي سجل من سجلات هذا القسم. اطلبوا من المسؤول السجل الذي تعملون فيه.",
  waitingOnYou: "بانتظاركم",
  inReview: (n) => `${n} قيد المراجعة أو الاعتماد`,
  openRfis: "طلبات استيضاح مفتوحة",
  overdue: (n) => (n ? `${n} تجاوزت الموعد المطلوب` : "لا شيء متأخر"),
  answeredAwaiting: (n) => `${n} أجيب عنها بانتظار القبول`,
  rfisAnswered: "طلبات استيضاح أجيب عنها بانتظار القبول",
  submittalsOut: "تقديمات قيد المراجعة",
  reviewsDue: "مراجعات مستندات مستحقة",
  reviewsDueSub: (days) => `المستندات السارية، خلال ${days} يوما`,
  transmittalsAwaiting: "كتب إحالة بانتظار الإقرار",
  bomInReview: "قوائم مواد هندسية قيد المراجعة",
  libraryCurrent: "مراجع المكتبة السارية",
  withdrawn: (n) => `${n} مسحوبة`,
  documentStatus: "المستندات حسب الحالة",
  documentStatusHint: "كل مستند مضبوط، حسب موقع إصداراته",
  documentsWord: "مستند",
  noDocuments: "لا توجد مستندات في السجل بعد.",
  ballInCourt: "لدى من الكرة",
  ballInCourtHint: "طلبات الاستيضاح المفتوحة، حسب من عليه التصرف التالي",
  noOpenRfis: "لا توجد طلبات استيضاح مفتوحة.",
  submittalOutcomes: "نتائج مراجعة التقديمات",
  submittalOutcomesHint: "التقديمات المراجعة، حسب نتيجتها الحالية",
  noOutcomes: "لم تراجع أي تقديمات بعد.",
  rfiIntake: "طلبات الاستيضاح شهريا",
  rfiIntakeHint: "آخر ستة أشهر، حسب تاريخ رفع كل طلب",
  noRfis: "لم ترفع طلبات استيضاح خلال الأشهر الستة الماضية.",
  reviewDueTitle: "مراجعات تقترب",
  reviewDueHint: "المستندات السارية التي تحل مراجعتها خلال 30 يوما أو فات موعدها",
  nothingDue: "لا توجد مراجعة مستند مستحقة خلال 30 يوما.",
  attention: "المتأخر بالاسم",
  attentionHint: "طلبات الاستيضاح المفتوحة بعد الموعد المطلوب والتقديمات بعد موعد الرد، الأكثر تأخرا أولا",
  nothingLate: "لا شيء متأخر.",
  daysLate: (n) => `متأخر ${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوما"}`,
  dueIn: (n) => (n < 0 ? `فات موعدها بـ ${-n} يوما` : n === 0 ? "مستحقة اليوم" : `خلال ${n} يوما`),
  kind: (k) => (k === "rfi" ? "طلب استيضاح" : "تقديم"),
  state: (t) => AR_STATE[t] || t,
  outcome: (t) => AR_OUTCOME[t] || t,
  party: (t) => AR_PARTY[t] ?? t,
  refuse: {
    forbidden: "لا يتاح لكم أي سجل من سجلات هذا القسم.",
    "no-section": "لا يوجد في هذا الحساب قسم للهندسة والمستندات.",
  },
};

const dict = { en, ar };

export function engineeringDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as EngineeringStrings };
