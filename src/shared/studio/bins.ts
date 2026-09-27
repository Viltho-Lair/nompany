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
  /** Said where the item a bin line names has since been deleted. */
  removedItem: string;
  /**
   * WHY THE SERVER REFUSED, in words. The server answers with a token (and the
   * code that was typed, for the sentences that repeat it); English sentences
   * built there reached Arabic studios verbatim. Unknown tokens fall back to
   * `failed`, never to the raw token.
   */
  problem: (token: string, value: string) => string;
  refused: (body: { error?: string; have?: number; needed?: number; holding?: number }) => string;
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
  removedItem: "(removed item)",
  problem: (token, value) => ({
    "code-missing": "A bin needs a code.",
    "code-format": `"${value}" must be 1–16 characters: letters, digits, and - . / only.`,
    "location-missing": "A bin needs a location.",
    "location-unknown": "That location no longer exists.",
    "code-taken": `"${value}" is already a bin in that location.`,
  } as Record<string, string>)[token] || "That did not save.",
  refused: (b) => ({
    forbidden: "You do not have the right to do that.",
    "read-only": "You have view-only access to stock.",
    notfound: "That bin no longer exists — somebody may have removed it.",
    "not-empty": `That bin still holds ${b.holding || "some"} ${b.holding === 1 ? "item" : "items"}. Move or issue them first.`,
    qty: "Enter a quantity above nought.",
    "same-bin": "The stock is already there — choose a different bin.",
    item: "That item no longer exists.",
    bin: "Choose a bin that exists.",
    insufficient: `Not enough there — it holds ${b.have ?? 0} and you asked to move ${b.needed ?? 0}.`,
    "in-progress": "Somebody else is moving this item's stock right now. Try again in a moment.",
    missing: "Something the request needs is missing — refresh and try again.",
  } as Record<string, string>)[String(b.error || "")] || "That did not save.",
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
  removedItem: "(صنف محذوف)",
  problem: (token, value) => ({
    "code-missing": "الموقع الفرعي يحتاج رمزا.",
    "code-format": `"${value}" يجب أن يكون من 1 الى 16 حرفا: حروف وأرقام و - . / فقط.`,
    "location-missing": "الموقع الفرعي يحتاج موقعا.",
    "location-unknown": "هذا الموقع لم يعد موجودا.",
    "code-taken": `"${value}" موقع فرعي موجود في هذا الموقع.`,
  } as Record<string, string>)[token] || "لم يحفظ ذلك.",
  refused: (b) => ({
    forbidden: "ليست لديك صلاحية القيام بذلك.",
    "read-only": "لديك صلاحية عرض فقط على المخزون.",
    notfound: "هذا الموقع الفرعي لم يعد موجودا — ربما حذفه أحدهم.",
    "not-empty": "هذا الموقع الفرعي لا يزال يحتوي أصنافا. انقلها أو اصرفها أولا.",
    qty: "أدخل كمية أكبر من الصفر.",
    "same-bin": "المخزون موجود هناك أصلا — اختر موقعا فرعيا آخر.",
    item: "هذا الصنف لم يعد موجودا.",
    bin: "اختر موقعا فرعيا موجودا.",
    insufficient: `الكمية هناك غير كافية — يحتوي ${b.have ?? 0} وطلبت نقل ${b.needed ?? 0}.`,
    "in-progress": "شخص آخر يحرك مخزون هذا الصنف الآن. حاول مجددا بعد لحظة.",
    missing: "ينقص الطلب شيء يحتاجه — حدث الصفحة وحاول مجددا.",
  } as Record<string, string>)[String(b.error || "")] || "لم يحفظ ذلك.",
};

const dict = { en, ar };

export function binsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as BinsStrings };
