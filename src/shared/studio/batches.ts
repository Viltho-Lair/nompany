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
};

const dict = { en, ar };

export function batchesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as BatchesStrings };
