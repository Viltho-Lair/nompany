import { defaultLocale, type Locale } from "../locale";

// CLIENT TAGS' WORDS (Administration → Master data, 22/09/2026). Its own
// module, for the reason ./shell's header gives: one dictionary per surface.
//
// A TAG'S OWN NAME IS NOT HERE. It is the studio's — typed by them in whichever
// languages they wrote it in, and printed as typed wherever a tag is worn.

type Strings = {
  tab: string;
  lead: string;
  empty: string;
  add: string;
  edit: string;
  remove: string;
  save: string;
  cancel: string;
  name: string;
  nameAr: string;
  colour: string;
  sample: string;
  deleteNote: string;
  tags: string;
  noTags: string;
  refusal: (code: string) => string;
};

const en: Strings = {
  tab: "Client tags",
  lead: "How this studio groups the people it sells to. Rename one and every client keeps it — a client carries the tag, not its name.",
  empty: "No tag yet.",
  add: "Add a tag",
  edit: "Rename",
  remove: "Delete",
  save: "Save",
  cancel: "Cancel",
  name: "Name",
  nameAr: "Name in Arabic",
  colour: "Colour",
  sample: "Tag",
  deleteNote: "Deleting a tag does not untag anybody — the clients carrying it simply stop showing it.",
  tags: "Tags",
  noTags: "No tag.",
  refusal: (code) => {
    switch (code) {
      case "duplicate": return "A tag already has that name.";
      case "name": return "Give the tag a name.";
      case "notfound": return "That tag no longer exists.";
      case "forbidden": return "You do not have the right to do that.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "وسوم العملاء",
  lead: "كيف يصنف هذا الاستوديو من يبيع لهم. غير الاسم ويبقى الوسم على كل عميل — العميل يحمل الوسم لا اسمه.",
  empty: "لا يوجد وسم بعد.",
  add: "إضافة وسم",
  edit: "إعادة تسمية",
  remove: "حذف",
  save: "حفظ",
  cancel: "إلغاء",
  name: "الاسم",
  nameAr: "الاسم بالعربية",
  colour: "اللون",
  sample: "وسم",
  deleteNote: "حذف الوسم لا يزيله عن أحد — العملاء الذين يحملونه يتوقفون عن إظهاره فقط.",
  tags: "الوسوم",
  noTags: "لا يوجد وسم.",
  refusal: (code) => {
    switch (code) {
      case "duplicate": return "يوجد وسم بهذا الاسم.";
      case "name": return "أعط الوسم اسما.";
      case "notfound": return "هذا الوسم لم يعد موجودا.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function clientTagsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
