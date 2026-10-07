import { defaultLocale, type Locale } from "../locale";

// THE STOCK COUNT'S WORDS — Inventory → Stock → Counts. Its own module, for the
// reason every surface has one: nothing may enumerate them.

type Strings = {
  tab: string;
  lead: string;
  newCount: string;
  notePlaceholder: string;
  noCounts: string;
  noCountsBody: string;
  status: (s: string) => string;
  startedBy: (who: string, when: string) => string;
  postedBy: (who: string, when: string) => string;
  progress: (counted: number, total: number) => string;
  open: string;
  close: string;
  search: string;
  colItem: string;
  colBooks: string;
  colCounted: string;
  colDifference: string;
  colOutcome: string;
  blankHint: string;
  save: string;
  saved: string;
  post: string;
  postConfirm: (n: number) => string;
  cancelCount: string;
  outcome: (o: string) => string;
  noDifferences: string;
  stocktakeNote: string;
  refusal: (token: string) => string;
};

const en: Strings = {
  tab: "Counts",
  lead: "Count what is on the shelves. Leave a line blank if you did not count it; posting turns every difference into a stock adjustment, and one over your approval limit waits on the Approvals page.",
  newCount: "Start a count",
  notePlaceholder: "Which store or racks, and who is counting",
  noCounts: "No counts yet",
  noCountsBody: "Start a count to check the shelves against the books.",
  status: (s) => ({ Counting: "Counting", Posting: "Posting…", Posted: "Posted", Cancelled: "Cancelled" } as Record<string, string>)[s] || s,
  startedBy: (who, when) => `Started by ${who || "—"} on ${when}`,
  postedBy: (who, when) => `Posted by ${who || "—"} on ${when}`,
  progress: (counted, total) => `${counted} of ${total} counted`,
  open: "Open",
  close: "Close",
  search: "Find an item",
  colItem: "Item",
  colBooks: "Books say",
  colCounted: "Counted",
  colDifference: "Difference",
  colOutcome: "Result",
  blankHint: "Blank = not counted (left alone). 0 = the shelf is empty.",
  save: "Save counts",
  saved: "Saved.",
  post: "Post differences",
  postConfirm: (n) => `Post ${n} difference${n === 1 ? "" : "s"} as stock adjustments? This moves stock.`,
  cancelCount: "Cancel count",
  outcome: (o) => ({ applied: "Adjusted", pending: "Waiting for approval", refused: "Refused" } as Record<string, string>)[o] || o,
  noDifferences: "Everything counted matched the books — nothing was adjusted.",
  stocktakeNote: "The Stocktakes register records that a count happened; the count itself, and the adjustments it makes, are here.",
  refusal: (token) => ({
    "not-counting": "This count is no longer open — somebody posted or cancelled it.",
    "nothing-counted": "Count at least one line before posting.",
    "no-items": "Register items before counting them.",
    notfound: "This count no longer exists.",
    forbidden: "You can read counts but not take or post one.",
  } as Record<string, string>)[token] || "That did not save.",
};

const ar: Strings = {
  tab: "الجرد",
  lead: "اجرد ما على الرفوف. اترك البند فارغا إن لم تجرده؛ عند الترحيل يصبح كل فرق تسوية مخزون، وما يتجاوز حد الاعتماد ينتظر في صفحة الاعتمادات.",
  newCount: "بدء جرد",
  notePlaceholder: "أي مستودع أو رفوف، ومن يجرد",
  noCounts: "لا يوجد جرد بعد",
  noCountsBody: "ابدأ جردا لمطابقة الرفوف مع الدفاتر.",
  status: (s) => ({ Counting: "قيد الجرد", Posting: "قيد الترحيل…", Posted: "مُرحّل", Cancelled: "ملغى" } as Record<string, string>)[s] || s,
  startedBy: (who, when) => `بدأه ${who || "—"} في ${when}`,
  postedBy: (who, when) => `رحّله ${who || "—"} في ${when}`,
  progress: (counted, total) => `${counted} من ${total} تم جردها`,
  open: "فتح",
  close: "إغلاق",
  search: "ابحث عن صنف",
  colItem: "الصنف",
  colBooks: "في الدفاتر",
  colCounted: "المجرود",
  colDifference: "الفرق",
  colOutcome: "النتيجة",
  blankHint: "فارغ = لم يُجرد (يُترك كما هو). 0 = الرف فارغ.",
  save: "حفظ الجرد",
  saved: "تم الحفظ.",
  post: "ترحيل الفروق",
  postConfirm: (n) => `ترحيل ${n} من الفروق كتسويات مخزون؟ هذا يحرك المخزون.`,
  cancelCount: "إلغاء الجرد",
  outcome: (o) => ({ applied: "تمت التسوية", pending: "بانتظار الاعتماد", refused: "مرفوض" } as Record<string, string>)[o] || o,
  noDifferences: "كل ما جُرد طابق الدفاتر — لم تُجرَ أي تسوية.",
  stocktakeNote: "سجل الجرد يثبت أن جردا حدث؛ أما الجرد نفسه والتسويات التي يجريها فهنا.",
  refusal: (token) => ({
    "not-counting": "هذا الجرد لم يعد مفتوحا — رحّله أو ألغاه شخص آخر.",
    "nothing-counted": "اجرد بندا واحدا على الأقل قبل الترحيل.",
    "no-items": "سجّل الأصناف قبل جردها.",
    notfound: "هذا الجرد لم يعد موجودا.",
    forbidden: "يمكنك قراءة الجرد لكن ليس إجراءه أو ترحيله.",
  } as Record<string, string>)[token] || "لم يُحفظ ذلك.",
};

const dict = { en, ar };

export function stockCountsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as StockCountsStrings };
