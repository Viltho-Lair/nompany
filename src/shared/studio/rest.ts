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
  // THE REGISTER'S OWN CONTROLS. Search, a status filter, sorting and an export
  // are what every comparable product treats as the baseline for a custom
  // record type — the engine shipped with a table and a dialog and none of
  // them, which is fine for the eleven rows a new studio has and unusable at
  // the few hundred a real register reaches.
  // A LINK'S FAR END, WHEN IT CANNOT BE SHOWN. Two different facts, and a blank
  // would be a third meaning "nothing linked" — which is what the reader would
  // wrongly conclude from either.
  refHidden: string;
  refMissing: string;
  recordSearch: string;
  recordSearchNothing: string;
  recordFilterAll: string;
  recordExport: string;
  recordCount: (shown: number, total: number) => string;
  recordMore: string;
  recordDeleteConfirm: (reference: string) => string;
  recordMove: (to: string) => string;
  // A move can raise a record of its own (a rejected test raises its NCR); the
  // person who pressed the button is told which, by reference.
  recordRaised: (refs: string) => string;
  recordNew: string;
  recordsEmpty: string;
  recordsEmptyBody: string;
  recordsLoading: string;
  refuseNotAllowed: string;
  refuseMissing: string;
  refuseStatusUnknown: string;
  // EVERY OTHER REFUSAL THE ENGINE ROUTE CAN SEND, as a sentence. The screen
  // used to print the token itself — `forbidden`, `no-section` — as the whole
  // page when a read failed, which tells a reader nothing they can act on.
  refuseForbidden: string;
  refuseNotFound: string;
  refuseNoSection: string;
  refuseControlled: string;
  refuseSignedOut: string;
  // Anything unnamed. Never the raw token: a word the reader cannot act on is
  // worse than a plain "it did not work".
  refuseFailed: string;
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
  refHidden: "Linked — not yours to open",
  refMissing: "Deleted",
  recordSearch: "Search",
  recordSearchNothing: "Nothing matches that.",
  recordFilterAll: "Any status",
  recordExport: "Export CSV",
  recordCount: (shown, total) => (shown === total ? `${total}` : `${shown} of ${total}`),
  recordMore: "Show more",
  recordDeleteConfirm: (reference) => `Delete ${reference}? This cannot be undone.`,
  recordMove: (to) => `Move to ${to}`,
  recordRaised: (refs) => `This move raised ${refs}.`,
  recordNew: "New",
  recordsEmpty: "Nothing here yet",
  recordsEmptyBody: "Records of this kind will appear here once somebody adds one.",
  recordsLoading: "Loading…",
  refuseNotAllowed: "That move is not one this record type allows.",
  refuseMissing: "Fill in every required field before saving.",
  refuseStatusUnknown: "This record or its type has changed since you opened it. Refresh and try again.",
  refuseForbidden: "You do not have access to do that in this register.",
  refuseNotFound: "This register or record no longer exists. It may have been deleted.",
  refuseNoSection: "This register has nowhere to keep its records in this studio yet. Ask the studio owner to check its sections.",
  refuseControlled: "Records of this kind are kept and cannot be deleted.",
  refuseSignedOut: "Your session has ended. Sign in again.",
  refuseFailed: "That did not work. Try again in a moment.",
  search1900Fonts: "Search 1,900+ fonts",
};

const ar: Strings = {
  ...commonAr,
  addColumn: "إضافة عمود",
  couldNotReachGoogleFonts: "تعذر الوصول إلى Google Fonts. تحقق من الاتصال ومن GOOGLE_FONTS_API_KEY.",
  font: "الخط",
  footer: "التذييل",
  header: "الترويسة",
  loading: "جار التحميل",
  loadingFonts: "جار تحميل الخطوط…",
  pageFooter: "تذييل الصفحة",
  pageHeader: "ترويسة الصفحة",
  refHidden: "مرتبط — ليس من صلاحيتك فتحه",
  refMissing: "محذوف",
  recordSearch: "بحث",
  recordSearchNothing: "لا شيء يطابق ذلك.",
  recordFilterAll: "أي حالة",
  recordExport: "تصدير CSV",
  recordCount: (shown, total) => (shown === total ? `${total}` : `${shown} من ${total}`),
  recordMore: "عرض المزيد",
  recordDeleteConfirm: (reference) => `حذف ${reference}؟ لا يمكن التراجع عن ذلك.`,
  recordMove: (to) => `النقل إلى ${to}`,
  recordRaised: (refs) => `نتج عن هذا النقل ${refs}.`,
  recordNew: "جديد",
  recordsEmpty: "لا شيء هنا بعد",
  recordsEmptyBody: "تظهر السجلات من هذا النوع هنا بعد أن يضيف أحدهم واحدا.",
  recordsLoading: "جار التحميل…",
  refuseNotAllowed: "هذه النقلة لا يسمح بها هذا النوع من السجلات.",
  refuseMissing: "أكمل كل حقل مطلوب قبل الحفظ.",
  refuseStatusUnknown: "تغيّر هذا السجل أو نوعه منذ أن فتحته. حدّث الصفحة وحاول مرة أخرى.",
  refuseForbidden: "ليست لديك صلاحية القيام بذلك في هذا السجل.",
  refuseNotFound: "لم يعد هذا السجل أو هذا القيد موجودا. ربما حُذف.",
  refuseNoSection: "لا يوجد لهذا السجل مكان يحفظ فيه قيوده في هذا الاستوديو بعد. اطلب من مالك الاستوديو مراجعة أقسامه.",
  refuseControlled: "تُحفظ السجلات من هذا النوع ولا يمكن حذفها.",
  refuseSignedOut: "انتهت جلستك. سجّل الدخول مرة أخرى.",
  refuseFailed: "لم ينجح ذلك. حاول مرة أخرى بعد قليل.",
  search1900Fonts: "ابحث في أكثر من 1,900 خط",
};

const rest = { en, ar };

export function restDict(locale: string): Strings {
  return rest[locale as Locale] || rest[defaultLocale];
}
