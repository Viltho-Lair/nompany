import { defaultLocale, type Locale } from "../locale";

// THE SHOP-FLOOR TERMINAL'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// A QC RESULT IS A STORED TOKEN translated on DISPLAY — the same rule every
// status in the product follows, so what the API returns is unchanged.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  noOrders: string;
  clockOn: string;
  clockOff: string;
  joinRun: string;
  quality: string;
  qualityLead: string;
  noBatches: string;
  notChecked: string;
  check: string;
  resultLabel: string;
  why: string;
  conceded: string;
  record: string;
  cancel: string;
  running: (title: string) => string;
  running2: (n: number) => string;
  since: (time: string) => string;
  effort: (hours: number, runs: number) => string;
  awaiting: (n: number) => string;
  result: (token: string) => string;
  checkFor: (ref: string) => string;
  /**
   * A refusal, by its token. `title` names the job for `other-run` and
   * `already-running`. NEVER THE TOKEN ITSELF: this fell back to the raw code,
   * so "forbidden" and "order" reached an operator's screen as words.
   */
  problem: (code: string, title?: string) => string;
};

const en: Strings = {
  tab: "Shop floor",
  title: "Shop floor",
  lead: "Clock on to a work order, and pass or fail what comes off it.",
  noOrders: "No open work orders. Completed and cancelled orders are not shown here.",
  clockOn: "Clock on",
  clockOff: "Clock off",
  // Somebody else is already on it. Shown rather than hidden: an operator
  // arriving at a busy station should see that, not an empty list.
  joinRun: "Clock on (somebody else is on it)",
  quality: "Quality",
  qualityLead: "A batch is not releasable until somebody has passed it. Nothing is passed by default.",
  noBatches: "No production batches recorded.",
  notChecked: "Not checked",
  check: "Record check",
  resultLabel: "Result",
  why: "Why it failed",
  conceded: "What was conceded",
  record: "Record",
  cancel: "Cancel",
  running: (title) => `You are on ${title}`,
  running2: (n) => (n === 1 ? "1 running" : `${n} running`),
  since: (time) => `Since ${time}`,
  effort: (hours, runs) => (runs === 0 ? "No time logged" : `${hours} h over ${runs} ${runs === 1 ? "run" : "runs"}`),
  awaiting: (n) => `${n} ${n === 1 ? "batch has" : "batches have"} not been checked.`,
  result: (token) => (token === "pass" ? "Passed" : token === "fail" ? "Failed" : token === "concession" ? "Conceded" : token),
  checkFor: (ref) => `Check for ${ref}`,
  problem: (code, title) => ({
    "other-run": title ? `Clock off ${title} first.` : "Clock off the job you are on first.",
    "already-running": "You are already on this one.",
    "no-run": "You are not clocked on to anything.",
    order: "Choose a work order.",
    "no-order": "That work order is not in the register any more.",
    "order-closed": "That work order is completed or cancelled, so no time can be logged on it.",
    "no-batch": "That batch is not in the register any more.",
    batch: "Choose a batch.",
    result: "Choose a result.",
    "fail-reason": "Say why it failed.",
    "concession-reason": "Say what was conceded.",
    action: "Nothing to do.",
    forbidden: "You do not have the right to do that.",
    "no-section": "Manufacturing is not set up in this studio.",
  } as Record<string, string>)[code] || "That did not work. Try again.",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "أرضية المصنع",
  title: "أرضية المصنع",
  lead: "سجلوا الدخول على أمر عمل، وأجيزوا أو ارفضوا ما ينتج عنه.",
  noOrders: "لا توجد أوامر عمل مفتوحة. الأوامر المكتملة والملغاة لا تظهر هنا.",
  clockOn: "تسجيل الدخول",
  clockOff: "تسجيل الخروج",
  joinRun: "تسجيل الدخول (شخص آخر عليه)",
  quality: "الجودة",
  qualityLead: "الدفعة غير قابلة للتسليم حتى يجيزها أحد. لا شيء يجاز تلقائيا.",
  noBatches: "لا توجد دفعات انتاج مسجلة.",
  notChecked: "لم تفحص",
  check: "تسجيل فحص",
  resultLabel: "النتيجة",
  why: "سبب الرفض",
  conceded: "ما الذي تم التنازل عنه",
  record: "تسجيل",
  cancel: "الغاء",
  running: (title) => `أنتم على ${title}`,
  running2: (n) => (n === 1 ? "واحد قيد التشغيل" : `${n} قيد التشغيل`),
  since: (time) => `منذ ${time}`,
  effort: (hours, runs) => (runs === 0 ? "لا وقت مسجل" : `${hours} ساعة على ${runs} ${runs === 1 ? "تشغيلة" : "تشغيلات"}`),
  awaiting: (n) => `${n} ${n === 1 ? "دفعة لم تفحص" : "دفعات لم تفحص"}.`,
  result: (token) => (token === "pass" ? "مجازة" : token === "fail" ? "مرفوضة" : token === "concession" ? "بتنازل" : token),
  checkFor: (ref) => `فحص ${ref}`,
  problem: (code, title) => ({
    "other-run": title ? `سجلوا الخروج من ${title} أولا.` : "سجلوا الخروج من العمل الحالي أولا.",
    "already-running": "أنتم على هذا العمل بالفعل.",
    "no-run": "لستم مسجلين على أي عمل.",
    order: "اختاروا أمر عمل.",
    "no-order": "أمر العمل هذا لم يعد في السجل.",
    "order-closed": "أمر العمل هذا مكتمل أو ملغى، فلا يمكن تسجيل وقت عليه.",
    "no-batch": "هذه الدفعة لم تعد في السجل.",
    batch: "اختاروا دفعة.",
    result: "اختاروا نتيجة.",
    "fail-reason": "اذكروا سبب الرفض.",
    "concession-reason": "اذكروا ما الذي تم التنازل عنه.",
    action: "لا يوجد اجراء.",
    forbidden: "لا تملكون صلاحية القيام بذلك.",
    "no-section": "التصنيع غير مفعل في هذا الاستوديو.",
  } as Record<string, string>)[code] || "لم تنجح العملية. حاولوا مرة أخرى.",
};

const dict = { en, ar };

export function shopFloorDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ShopFloorStrings };
