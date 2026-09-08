import { defaultLocale, type Locale } from "../locale";

// THE BIN REGISTER'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// BIN CODES AND LOCATION NAMES ARE NOT TRANSLATED. Both are things a studio
// typed, and typed data is never translated — the same rule that leaves client
// names, section names and service actions alone.

type Strings = {
  tab: string;
  lead: string;
  addBin: string;
  code: string;
  binName: string;
  location: string;
  holds: string;
  empty: string;
  noBins: string;
  noLocations: string;
  unbinned: string;
  unbinnedLead: string;
  nothingUnbinned: string;
  negative: string;
  negativeLead: string;
  putAway: string;
  moveHere: string;
  item: string;
  from: string;
  quantity: string;
  anywhere: string;
  move: string;
  remove: string;
  cancel: string;
  units: (n: number) => string;
};

const en: Strings = {
  tab: "Bins",
  lead: "Where the stock physically is. A bin sits in one of your locations; the totals here always add up to what the stock ledger says you hold.",
  addBin: "Add bin",
  code: "Code",
  binName: "Description",
  location: "Location",
  holds: "Holds",
  empty: "Empty",
  noBins: "No bins yet. Add one for each shelf, rack or yard you pick from.",
  // A studio with no locations cannot have a bin, and saying which screen fixes
  // that beats an empty dropdown nobody can explain.
  noLocations: "Add a location under Master data first — a bin has to sit somewhere.",
  unbinned: "Not in a bin",
  unbinnedLead: "Stock the ledger knows about that nobody has put away. Everything recorded before you started using bins is here.",
  nothingUnbinned: "Everything is put away.",
  negative: "Needs reconciling",
  negativeLead: "These bins show less than nothing, which means stock left them without being recorded going in. The company total is not in doubt — only where it sits.",
  putAway: "Put away",
  moveHere: "Move",
  item: "Item",
  from: "From",
  quantity: "Quantity",
  anywhere: "Not in a bin",
  move: "Move stock",
  remove: "Remove",
  cancel: "Cancel",
  units: (n) => `${n} ${n === 1 ? "unit" : "units"}`,
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "المواقع الفرعية",
  lead: "أين يوجد المخزون فعليا. كل موقع فرعي يقع ضمن أحد مواقعكم، ومجاميع هذه الصفحة تساوي دائما ما يقوله سجل الحركات.",
  addBin: "إضافة موقع فرعي",
  code: "الرمز",
  binName: "الوصف",
  location: "الموقع",
  holds: "يحتوي",
  empty: "فارغ",
  noBins: "لا توجد مواقع فرعية بعد. أضيفوا واحدا لكل رف أو ساحة تسحبون منها.",
  noLocations: "أضيفوا موقعا في البيانات الأساسية أولا — الموقع الفرعي يجب أن يقع في مكان.",
  unbinned: "خارج المواقع الفرعية",
  unbinnedLead: "مخزون يعرفه السجل ولم يوضع في مكان بعد. كل ما سجل قبل استخدام المواقع الفرعية موجود هنا.",
  nothingUnbinned: "كل شيء في مكانه.",
  negative: "بحاجة الى تسوية",
  negativeLead: "هذه المواقع تظهر أقل من الصفر، أي أن مخزونا خرج منها دون تسجيل دخوله. المجموع الكلي غير مشكوك فيه — الموقع فقط.",
  putAway: "وضع في مكان",
  moveHere: "نقل",
  item: "الصنف",
  from: "من",
  quantity: "الكمية",
  anywhere: "خارج المواقع الفرعية",
  move: "نقل المخزون",
  remove: "حذف",
  cancel: "الغاء",
  units: (n) => `${n} ${n === 1 ? "وحدة" : n === 2 ? "وحدتان" : n <= 10 ? "وحدات" : "وحدة"}`,
};

const dict = { en, ar };

export function binsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as BinsStrings };
