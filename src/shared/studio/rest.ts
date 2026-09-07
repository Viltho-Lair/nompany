import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE LAST OF IT — the data grid, the field wrapper, the board's own chrome, the editor, and the skeletons.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  addColumn: string;
  couldNotReachGoogleFonts: string;
  font: string;
  footer: string;
  header: string;
  loading: string;
  loadingFonts: string;
  pageFooter: string;
  pageHeader: string;
  // THE RECORD ENGINE'S GENERIC SCREEN. Its words live here rather than in a
  // dictionary of their own because that screen belongs to no department — it
  // draws whatever type it is pointed at — and this module is already where the
  // surfaces that answer to nobody in particular keep their copy.
  //
  // NOTHING HERE NAMES A TYPE. A type's label, its field labels and its status
  // words are TENANT DATA, typed into a studio's own type editor, so the screen
  // renders them verbatim and never translates them — the rule section names
  // and client names already follow.
  //
  // `cancel` and `save` are DELIBERATELY ABSENT. `Strings` extends
  // `CommonStrings`, which carries both in both languages, so `tr.cancel` and
  // `tr.save` already resolve through this dictionary. Restating them would put
  // a second English and a second Arabic word behind one button, free to drift
  // from the fifty other buttons that say it — the exact duplication ./common
  // exists to prevent.
  recordDeleteConfirm: (reference: string) => string;
  recordMove: (to: string) => string;
  recordNew: string;
  recordsEmpty: string;
  recordsEmptyBody: string;
  recordsLoading: string;
  refuseNotAllowed: string;
  refuseMissing: string;
  refuseStatusUnknown: string;
  search1900Fonts: string;
};

const en: Strings = {
  ...commonEn,
  addColumn: "Add column",
  couldNotReachGoogleFonts: "Could not reach Google Fonts. Check the connection and the GOOGLE_FONTS_API_KEY.",
  font: "Font",
  footer: "Footer",
  header: "Header",
  loading: "Loading",
  loadingFonts: "Loading fonts…",
  pageFooter: "Page footer",
  pageHeader: "Page header",
  recordDeleteConfirm: (reference) => `Delete ${reference}? This cannot be undone.`,
  recordMove: (to) => `Move to ${to}`,
  recordNew: "New",
  recordsEmpty: "Nothing here yet",
  recordsEmptyBody: "Records of this kind will appear here once somebody adds one.",
  recordsLoading: "Loading…",
  refuseNotAllowed: "That move is not one this record type allows.",
  refuseMissing: "Fill in every required field before saving.",
  refuseStatusUnknown: "That is not a status this record type has.",
  search1900Fonts: "Search 1,900+ fonts",
};

const ar: Strings = {
  ...commonAr,
  addColumn: "إضافة عمود",
  couldNotReachGoogleFonts: "تعذّر الوصول إلى Google Fonts. تحقّق من الاتصال ومن GOOGLE_FONTS_API_KEY.",
  font: "الخط",
  footer: "التذييل",
  header: "الترويسة",
  loading: "جارٍ التحميل",
  loadingFonts: "جارٍ تحميل الخطوط…",
  pageFooter: "تذييل الصفحة",
  pageHeader: "ترويسة الصفحة",
  recordDeleteConfirm: (reference) => `حذف ${reference}؟ لا يمكن التراجع عن ذلك.`,
  recordMove: (to) => `النقل إلى ${to}`,
  recordNew: "جديد",
  recordsEmpty: "لا شيء هنا بعد",
  recordsEmptyBody: "تظهر السجلات من هذا النوع هنا بعد أن يضيف أحدهم واحداً.",
  recordsLoading: "جارٍ التحميل…",
  refuseNotAllowed: "هذه النقلة لا يسمح بها هذا النوع من السجلات.",
  refuseMissing: "أكمل كل حقل مطلوب قبل الحفظ.",
  refuseStatusUnknown: "ليست هذه حالة يحملها هذا النوع من السجلات.",
  search1900Fonts: "ابحث في أكثر من 1,900 خط",
};

const rest = { en, ar };

export function restDict(locale: string): Strings {
  return rest[locale as Locale] || rest[defaultLocale];
}
