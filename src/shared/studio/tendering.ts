import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TENDERING & ESTIMATING. Its own module, like every other surface's — see the
// header of ./shell for why nothing may enumerate them.
//
// WHAT IS NOT HERE: the STAGE names. Those come from ./statuses, keyed by the
// stored token, because the register and every later tendering screen have to
// call a stage the same thing — and because what the API returns and the
// goldens pin must not move when a word is translated.

type Strings = CommonStrings & {
  tenders: string;
  tendersSub: string;
  loadingTenders: string;
  noTendersYet: string;
  noTendersBody: string;
  addTender: string;
  editTender: string;

  // The form.
  tenderTitle: string;
  issuer: string;
  issuerHint: string;
  source: string;
  issueDate: string;
  deadline: string;
  estimatedValue: string;
  assignedTo: string;
  unassigned: string;

  // The register's own numbers.
  closingSoon: string;
  nOpenTenders: (n: number) => string;
  submittedCount: string;
  winRate: string;
  nDecided: (n: number) => string;

  // Deadlines. `daysLeft`/`daysAgo` take a number so each language decides
  // where the digits go, and the two are separate strings because "in 3 days"
  // and "3 days ago" are not one sentence with a sign.
  daysLeft: (n: number) => string;
  dueToday: string;
  overdueBy: (n: number) => string;
  missed: string;
  noDeadline: string;

  // Moving a tender along.
  moveTo: string;
  decisionReason: string;
  whyDecision: string;
  whyDecisionHint: string;
  save: string;
  deleteTender: string;
  confirmDelete: (title: string) => string;

  // Refusals, translated from the tokens the service returns.
  refuseAlreadyDecided: string;
  refuseNotSubmitted: string;
  refuseAlreadySubmitted: string;
  refuseReasonRequired: string;
  refuseDeleteSubmitted: string;
};

const en: Strings = {
  ...commonEn,
  tenders: "Tender register",
  tendersSub: "What the studio is bidding, what it decided not to, and what became of each.",
  loadingTenders: "Loading the register…",
  noTendersYet: "No tenders yet",
  noTendersBody: "Record a tender the day you hear about it — including the ones you decide not to bid. That decision is the register's most useful entry.",
  addTender: "Add a tender",
  editTender: "Edit tender",

  tenderTitle: "Title",
  issuer: "Issuing body",
  issuerHint: "As it appears on the notice. Link it to a customer only if you already work for them.",
  source: "Source",
  issueDate: "Issued",
  deadline: "Submission deadline",
  estimatedValue: "Estimated value",
  assignedTo: "Owner",
  unassigned: "Unassigned",

  closingSoon: "Closing soon",
  nOpenTenders: (n) => (n === 1 ? "1 open tender" : `${n} open tenders`),
  submittedCount: "Submitted",
  winRate: "Win rate",
  nDecided: (n) => `${n} decided`,

  daysLeft: (n) => (n === 1 ? "1 day left" : `${n} days left`),
  dueToday: "Due today",
  overdueBy: (n) => (n === 1 ? "1 day past" : `${n} days past`),
  // NOT "overdue". A tender whose date has gone without a bid is not late —
  // it is gone, and calling it late suggests it can still be caught up.
  missed: "Missed",
  noDeadline: "No deadline",

  moveTo: "Move to",
  decisionReason: "Reason",
  whyDecision: "Why this decision?",
  whyDecisionHint: "Required. Losing, declining and withdrawing are the three entries a register is read back for.",
  save: "Save",
  deleteTender: "Delete",
  confirmDelete: (title) => `Delete “${title}”? This is for a tender entered by mistake — a real one you are dropping should be No Bid or Withdrawn.`,

  refuseAlreadyDecided: "This tender has been decided. A decision is history, not a stage it can be moved out of.",
  refuseNotSubmitted: "This tender was never submitted, so it cannot be won or lost.",
  refuseAlreadySubmitted: "The bid has already gone in. Withdrawing it is not the same as never having bid.",
  refuseReasonRequired: "Say why before recording this decision.",
  refuseDeleteSubmitted: "The bid has gone in, so this tender is a record of something the studio did. Withdraw it instead.",
};

const ar: Strings = {
  ...commonAr,
  tenders: "سجلّ المناقصات",
  tendersSub: "ما تتقدّم له الشركة، وما قرّرت عدم التقدّم له، وما آل إليه كلّ منها.",
  loadingTenders: "جارٍ تحميل السجلّ…",
  noTendersYet: "لا توجد مناقصات بعد",
  noTendersBody: "سجّل المناقصة يوم تسمع بها — بما فيها التي تقرّر عدم التقدّم لها. هذا القرار هو أنفع ما يحفظه السجلّ.",
  addTender: "إضافة مناقصة",
  editTender: "تعديل المناقصة",

  tenderTitle: "العنوان",
  issuer: "الجهة الطارحة",
  issuerHint: "كما وردت في الإعلان. اربطها بعميل فقط إن كنت تعمل معه بالفعل.",
  source: "المصدر",
  issueDate: "تاريخ الطرح",
  deadline: "آخر موعد للتقديم",
  estimatedValue: "القيمة التقديرية",
  assignedTo: "المسؤول",
  unassigned: "غير مُسند",

  closingSoon: "تُغلق قريبًا",
  nOpenTenders: (n) => (n === 1 ? "مناقصة مفتوحة واحدة" : `${n} مناقصة مفتوحة`),
  submittedCount: "المُقدَّمة",
  winRate: "نسبة الفوز",
  nDecided: (n) => `${n} محسومة`,

  daysLeft: (n) => (n === 1 ? "بقي يوم واحد" : `بقي ${n} يومًا`),
  dueToday: "تنتهي اليوم",
  overdueBy: (n) => (n === 1 ? "مضى يوم واحد" : `مضى ${n} يومًا`),
  missed: "فائتة",
  noDeadline: "بلا موعد",

  moveTo: "نقل إلى",
  decisionReason: "السبب",
  whyDecision: "ما سبب هذا القرار؟",
  whyDecisionHint: "مطلوب. الخسارة والاعتذار والانسحاب هي المداخل الثلاثة التي يُقرأ السجلّ من أجلها.",
  save: "حفظ",
  deleteTender: "حذف",
  confirmDelete: (title) => `حذف «${title}»؟ هذا للمناقصة المُدخلة بالخطأ — أمّا التي تتراجع عنها فعلًا فسجّلها "لم نتقدّم" أو "مسحوبة".`,

  refuseAlreadyDecided: "حُسمت هذه المناقصة. القرار سجلّ، وليس مرحلة يمكن نقلها منها.",
  refuseNotSubmitted: "لم تُقدَّم هذه المناقصة، فلا يمكن ربحها أو خسارتها.",
  refuseAlreadySubmitted: "العرض قُدّم بالفعل. الانسحاب ليس كعدم التقدّم أصلًا.",
  refuseReasonRequired: "اذكر السبب قبل تسجيل هذا القرار.",
  refuseDeleteSubmitted: "العرض قُدّم، فصارت هذه المناقصة سجلًّا لشيء فعلته الشركة. اسحبها بدلًا من حذفها.",
};

// KEYED BY LOCALE WITH A FALLBACK, like every other surface's dictionary — not
// `locale === "ar" ? ar : en`. A third language added to ./locale would then
// silently read English instead of going through the same door as the other two.
const tendering: Record<Locale, Strings> = { en, ar };

export function tenderingDict(locale: string): Strings {
  return tendering[locale as Locale] || tendering[defaultLocale];
}
