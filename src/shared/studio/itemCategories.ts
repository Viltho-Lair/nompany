import { defaultLocale, type Locale } from "../locale";

// ITEM CATEGORIES' WORDS (Administration → Master data, 22/09/2026). Its own
// module, for the reason ./shell's header gives: one dictionary per surface.
//
// A CATEGORY'S OWN NAME IS NOT HERE. It is the studio's, typed by them, and
// printed as typed wherever it is worn.

type Strings = {
  tab: string;
  lead: string;
  notItemType: string;
  empty: string;
  add: string;
  addChild: string;
  edit: string;
  remove: string;
  save: string;
  cancel: string;
  name: string;
  nameAr: string;
  parent: string;
  topLevel: string;
  deleteNote: string;
  suggestions: string;
  suggestionsLead: string;
  importChosen: (n: number) => string;
  noSuggestions: string;
  category: string;
  noCategory: string;
  subPrice: (name: string) => string;
  subPriceHint: string;
  subQty: string;
  piecesNote: (n: number, unit: string) => string;
  resetTitle: string;
  resetLead: (onHand: number, pieces: number, unit: string) => string;
  resetYes: string;
  resetNo: string;
  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  tab: "Item categories",
  lead: "What this studio calls its goods. Rename or re-nest one and every item keeps it — an item carries the category, not its name.",
  notItemType: "This is not the Type on an item. That one comes from the chosen supplier's own list and sets the lead time; this is the studio's own shelf.",
  empty: "No category yet.",
  add: "Add a category",
  addChild: "Add inside",
  edit: "Edit",
  remove: "Delete",
  save: "Save",
  cancel: "Cancel",
  name: "Name",
  nameAr: "Name in Arabic",
  parent: "Inside",
  topLevel: "— top level —",
  deleteNote: "Deleting a category does not re-file anything — the items carrying it simply stop showing it, and an offer naming it stops matching.",
  suggestions: "From what you already sell",
  suggestionsLead: "Types already typed on this studio's items that no category is named after yet. Pick the ones that are really categories — a supplier's line is often not one.",
  importChosen: (n) => (n === 1 ? "Add 1 category" : `Add ${n} categories`),
  noSuggestions: "Nothing left to suggest.",
  category: "Category",
  noCategory: "— none —",
  subPrice: (name) => `Sell price · ${name}`,
  subPriceHint: "Optional. The price when it is sold as this subcategory, and how many of it one of this item holds. The sell price above is the category's own.",
  subQty: "Quantity",
  resetTitle: "Changing the category resets this item's subcategory prices and quantities.",
  resetLead: (onHand, pieces, unit) => `Stock is not changed: it stays at ${onHand} ${unit}.${pieces > 1 ? ` Until now one of this item sold at its sell price took ${pieces} ${unit} off stock; after the change it takes 1, until you enter quantities for the new category. Check the sell price as well: it was the price of ${pieces} ${unit}.` : ""}`,
  resetYes: "Change and reset",
  resetNo: "Keep the category",
  piecesNote: (n, unit) => `Stock is counted in pieces: one of this item sold at the sell price above takes ${n} ${unit} off stock. Unit cost, reorder level and stock received are per piece.`,
  refusal: (code, x = {}) => {
    switch (code) {
      case "duplicate": return "A category in the same place already has that name.";
      case "name": return "Give the category a name.";
      case "parent": return "That parent no longer exists.";
      case "cycle": return "A category cannot sit inside itself.";
      case "depth": return "Categories go four levels deep.";
      case "has-children": return `Empty it first — ${String(x.children ?? "")} sit inside it.`;
      case "notfound": return "That category no longer exists.";
      case "forbidden": return "You do not have the right to do that.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "فئات الأصناف",
  lead: "ما يسمي به هذا الاستوديو بضاعته. غير الاسم أو الموضع ويبقى على كل صنف — الصنف يحمل الفئة لا اسمها.",
  notItemType: "هذه ليست «النوع» على الصنف. ذاك يأتي من قائمة المورد المختار ويحدد مدة التوريد، وهذه رفوف الاستوديو نفسه.",
  empty: "لا توجد فئة بعد.",
  add: "إضافة فئة",
  addChild: "إضافة بداخلها",
  edit: "تعديل",
  remove: "حذف",
  save: "حفظ",
  cancel: "إلغاء",
  name: "الاسم",
  nameAr: "الاسم بالعربية",
  parent: "بداخل",
  topLevel: "— المستوى الأعلى —",
  deleteNote: "حذف الفئة لا يعيد ترتيب شيء — الأصناف التي تحملها تتوقف عن إظهارها، والعرض الذي يسميها يتوقف عن المطابقة.",
  suggestions: "مما تبيعه بالفعل",
  suggestionsLead: "أنواع مكتوبة على أصناف هذا الاستوديو ولا توجد فئة بأسمائها. اختر ما هو فئة حقا — خط المورد غالبا ليس كذلك.",
  importChosen: (n) => (n === 1 ? "إضافة فئة واحدة" : `إضافة ${n} فئات`),
  noSuggestions: "لم يبق ما يقترح.",
  category: "الفئة",
  noCategory: "— بلا —",
  subPrice: (name) => `سعر البيع · ${name}`,
  subPriceHint: "اختياري. السعر عند بيعه ضمن هذه الفئة الفرعية، وكم منها يحتوي الصنف الواحد. وسعر البيع أعلاه هو سعر الفئة نفسها.",
  subQty: "الكمية",
  resetTitle: "تغيير الفئة يصفّر أسعار وكميات الفئات الفرعية لهذا الصنف.",
  resetLead: (onHand, pieces, unit) => `المخزون لا يتغير: يبقى ${onHand} ${unit}.${pieces > 1 ? ` حتى الآن كان بيع واحد من هذا الصنف بسعر البيع يخصم ${pieces} ${unit} من المخزون، وبعد التغيير يخصم 1 إلى أن تدخل كميات للفئة الجديدة. وراجع سعر البيع أيضا: كان سعر ${pieces} ${unit}.` : ""}`,
  resetYes: "غيّر وصفّر",
  resetNo: "أبق الفئة",
  piecesNote: (n, unit) => `المخزون يُعد بالقطعة: بيع واحد من هذا الصنف بسعر البيع أعلاه يخصم ${n} ${unit} من المخزون. وتكلفة الوحدة وحد إعادة الطلب والكميات المستلمة كلها بالقطعة.`,
  refusal: (code, x = {}) => {
    switch (code) {
      case "duplicate": return "توجد فئة بهذا الاسم في الموضع نفسه.";
      case "name": return "أعط الفئة اسما.";
      case "parent": return "الفئة الأعلى لم تعد موجودة.";
      case "cycle": return "لا تكون الفئة بداخل نفسها.";
      case "depth": return "تصل الفئات إلى أربعة مستويات.";
      case "has-children": return `أفرغها أولا — بداخلها ${String(x.children ?? "")}.`;
      case "notfound": return "هذه الفئة لم تعد موجودة.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function itemCategoriesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
