import { defaultLocale, type Locale } from "../locale";

// THE BATCH REGISTER'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// LOT NUMBERS AND SERIALS ARE NOT TRANSLATED — both are printed on the thing
// and typed off it, which makes them data.

type Strings = {
  tab: string;
  lead: string;
  addBatch: string;
  item: string;
  lot: string;
  received: string;
  expires: string;
  noBatches: string;
  registerItemsFirst: string;
  needsAttention: string;
  expired: string;
  expiring: string;
  inDate: string;
  noDate: string;
  usedUp: string;
  assign: string;
  from: string;
  quantity: string;
  untracked: string;
  untrackedLead: string;
  everythingTracked: string;
  serials: string;
  serialsLead: string;
  held: string;
  allocated: string;
  remove: string;
  cancel: string;
  daysLeft: (n: number) => string;
  expiredDaysAgo: (n: number) => string;
  untraced: (n: number) => string;
  asOf: (day: string) => string;
  removedItem: string;
  /** The FEFO list — which batch of each item to pick next. */
  pickNext: string;
  pickNextLead: string;
  pickLot: (lot: string, expires: string) => string;
  /** Why the server refused, in words — see ./bins `problem`. */
  problem: (token: string, value: string) => string;
  refused: (body: { error?: string; have?: number; needed?: number }) => string;
};

const en: Strings = {
  tab: "Batches",
  lead: "Which units, and when they stop being usable. A batch is a lot number on one item; what is left of it is summed from the movements that name it, so it can never disagree with your stock ledger.",
  addBatch: "Add batch",
  item: "Item",
  lot: "Lot number",
  received: "Received",
  expires: "Expires",
  noBatches: "No batches yet. Add one for each lot you want to be able to trace.",
  registerItemsFirst: "Register an item first — a lot number belongs to something.",
  needsAttention: "Needs attention",
  expired: "Expired",
  expiring: "Expiring",
  inDate: "In date",
  // A BATCH WITH NO DATE SAYS SO rather than looking like one that is fine:
  // plenty of stock is batch-tracked for traceability and never expires.
  noDate: "No expiry",
  usedUp: "Used up",
  assign: "Assign",
  from: "From",
  quantity: "Quantity",
  untracked: "No batch",
  untrackedLead: "Stock the ledger knows about that carries no lot number. Everything recorded before you started using batches is here.",
  everythingTracked: "Every unit is in a batch.",
  serials: "Serial numbers",
  serialsLead: "Which individual units you hold, and which are promised to a project.",
  held: "On the shelf",
  allocated: "Promised to a project",
  remove: "Remove",
  cancel: "Cancel",
  daysLeft: (n) => (n === 0 ? "today" : `${n} ${n === 1 ? "day" : "days"} left`),
  expiredDaysAgo: (n) => `${n} ${n === 1 ? "day" : "days"} ago`,
  untraced: (n) => (n > 0
    ? `${n} held with no serial recorded`
    : `${-n} more serials listed than the ledger holds`),
  asOf: (day) => `As at ${day}`,
  removedItem: "(removed item)",
  pickNext: "Pick next",
  pickNextLead: "The batch of each item that expires soonest and is still in date. A suggestion — the picker at the rack decides.",
  pickLot: (lot, expires) => (expires ? `${lot} · expires ${expires}` : `${lot} · no expiry`),
  problem: (token, value) => ({
    "lot-missing": "A batch needs a lot number.",
    "lot-format": `"${value}" must be 1–24 characters: letters, digits, and - . _ / only.`,
    "item-missing": "A batch needs an item.",
    "item-unknown": "That item no longer exists.",
    "expiry-date": "The expiry date must be a date.",
    "received-date": "The received date must be a date.",
    "expires-before-received": "A batch cannot expire before it was received.",
    "lot-taken": `"${value}" is already a batch of that item.`,
  } as Record<string, string>)[token] || "That did not save.",
  refused: (b) => ({
    forbidden: "You do not have the right to do that.",
    "read-only": "You have view-only access to stock.",
    notfound: "That batch no longer exists — somebody may have removed it.",
    "not-empty": "That batch still holds stock. Assign or issue it first.",
    qty: "Enter a quantity above nought.",
    "same-bin": "The stock is already in that batch — choose a different one.",
    item: "That item no longer exists.",
    bin: "Choose a batch that exists.",
    insufficient: `Not enough there — it holds ${b.have ?? 0} and you asked to assign ${b.needed ?? 0}.`,
    "in-progress": "Somebody else is moving this item's stock right now. Try again in a moment.",
    missing: "Something the request needs is missing — refresh and try again.",
  } as Record<string, string>)[String(b.error || "")] || "That did not save.",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الدفعات",
  lead: "أي وحدات، ومتى تنتهي صلاحيتها. الدفعة رقم تشغيلة على صنف واحد، والمتبقي منها مجموع الحركات التي تسميها، فلا يمكن أن يخالف سجل المخزون.",
  addBatch: "إضافة دفعة",
  item: "الصنف",
  lot: "رقم التشغيلة",
  received: "تاريخ الاستلام",
  expires: "تاريخ الانتهاء",
  noBatches: "لا توجد دفعات بعد. أضيفوا واحدة لكل تشغيلة تريدون تتبعها.",
  registerItemsFirst: "سجلوا صنفا أولا — رقم التشغيلة يخص شيئا ما.",
  needsAttention: "بحاجة الى انتباه",
  expired: "منتهية",
  expiring: "تقترب من الانتهاء",
  inDate: "سارية",
  noDate: "بلا تاريخ انتهاء",
  usedUp: "استهلكت",
  assign: "تخصيص",
  from: "من",
  quantity: "الكمية",
  untracked: "بلا دفعة",
  untrackedLead: "مخزون يعرفه السجل ولا يحمل رقم تشغيلة. كل ما سجل قبل استخدام الدفعات موجود هنا.",
  everythingTracked: "كل وحدة ضمن دفعة.",
  serials: "الأرقام التسلسلية",
  serialsLead: "أي وحدات مفردة لديكم، وأيها محجوز لمشروع.",
  held: "على الرف",
  allocated: "محجوزة لمشروع",
  remove: "حذف",
  cancel: "الغاء",
  daysLeft: (n) => (n === 0 ? "اليوم" : `${n} ${n === 1 ? "يوم متبق" : n === 2 ? "يومان متبقيان" : n <= 10 ? "أيام متبقية" : "يوما متبقيا"}`),
  expiredDaysAgo: (n) => `قبل ${n} ${n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? "أيام" : "يوما"}`,
  untraced: (n) => (n > 0
    ? `${n} وحدة بلا رقم تسلسلي مسجل`
    : `${-n} رقما تسلسليا أكثر مما يحمله السجل`),
  asOf: (day) => `بتاريخ ${day}`,
  removedItem: "(صنف محذوف)",
  pickNext: "الدفعة التالية للصرف",
  pickNextLead: "دفعة كل صنف الأقرب انتهاء والتي لا تزال سارية. اقتراح — والقرار لمن يقف عند الرف.",
  pickLot: (lot, expires) => (expires ? `${lot} · تنتهي ${expires}` : `${lot} · بلا تاريخ انتهاء`),
  problem: (token, value) => ({
    "lot-missing": "الدفعة تحتاج رقم تشغيلة.",
    "lot-format": `"${value}" يجب أن يكون من 1 الى 24 حرفا: حروف وأرقام و - . _ / فقط.`,
    "item-missing": "الدفعة تحتاج صنفا.",
    "item-unknown": "هذا الصنف لم يعد موجودا.",
    "expiry-date": "تاريخ الانتهاء يجب أن يكون تاريخا.",
    "received-date": "تاريخ الاستلام يجب أن يكون تاريخا.",
    "expires-before-received": "لا يمكن أن تنتهي الدفعة قبل استلامها.",
    "lot-taken": `"${value}" دفعة موجودة لهذا الصنف.`,
  } as Record<string, string>)[token] || "لم يحفظ ذلك.",
  refused: (b) => ({
    forbidden: "ليست لديك صلاحية القيام بذلك.",
    "read-only": "لديك صلاحية عرض فقط على المخزون.",
    notfound: "هذه الدفعة لم تعد موجودة — ربما حذفها أحدهم.",
    "not-empty": "هذه الدفعة لا تزال تحتوي مخزونا. خصصه أو اصرفه أولا.",
    qty: "أدخل كمية أكبر من الصفر.",
    "same-bin": "المخزون في هذه الدفعة أصلا — اختر دفعة أخرى.",
    item: "هذا الصنف لم يعد موجودا.",
    bin: "اختر دفعة موجودة.",
    insufficient: `الكمية هناك غير كافية — تحتوي ${b.have ?? 0} وطلبت تخصيص ${b.needed ?? 0}.`,
    "in-progress": "شخص آخر يحرك مخزون هذا الصنف الآن. حاول مجددا بعد لحظة.",
    missing: "ينقص الطلب شيء يحتاجه — حدث الصفحة وحاول مجددا.",
  } as Record<string, string>)[String(b.error || "")] || "لم يحفظ ذلك.",
};

const dict = { en, ar };

export function batchesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as BatchesStrings };
