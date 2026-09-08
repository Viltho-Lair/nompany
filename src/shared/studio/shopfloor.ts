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
  problem: (code: string) => string;
};

const en: Strings = {
  tab: "Shop floor",
  title: "Shop floor",
  lead: "Clock on to a work order, and pass or fail what comes off it.",
  noOrders: "No work orders open.",
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
  problem: (code) => (
    code === "other-run" ? "Clock off the job you are on first."
      : code === "already-running" ? "You are already on this one."
        : code === "no-run" ? "You are not clocked on to anything."
          : code === "action" ? "Nothing to do."
            : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "أرضية المصنع",
  title: "أرضية المصنع",
  lead: "سجلوا الدخول على أمر عمل، وأجيزوا أو ارفضوا ما ينتج عنه.",
  noOrders: "لا توجد أوامر عمل مفتوحة.",
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
  problem: (code) => (
    code === "other-run" ? "سجلوا الخروج من العمل الحالي أولا."
      : code === "already-running" ? "أنتم على هذا العمل بالفعل."
        : code === "no-run" ? "لستم مسجلين على أي عمل."
          : code === "action" ? "لا يوجد اجراء."
            : code || ""),
};

const dict = { en, ar };

export function shopFloorDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ShopFloorStrings };
