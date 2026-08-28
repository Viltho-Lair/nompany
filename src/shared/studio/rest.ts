import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE LAST OF IT — the data grid, the field wrapper, the board's own chrome, the editor, and the skeletons.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  addColumn: string;
  font: string;
  header: string;
  loading: string;
  pageHeader: string;
  search1900Fonts: string;
};

const en: Strings = {
  ...commonEn,
  addColumn: "Add column",
  font: "Font",
  header: "Header",
  loading: "Loading",
  pageHeader: "Page header",
  search1900Fonts: "Search 1,900+ fonts",
};

const ar: Strings = {
  ...commonAr,
  addColumn: "إضافة عمود",
  font: "الخط",
  header: "الترويسة",
  loading: "جارٍ التحميل",
  pageHeader: "ترويسة الصفحة",
  search1900Fonts: "ابحث في أكثر من 1,900 خط",
};

const rest = { en, ar };

export function restDict(locale: string): Strings {
  return rest[locale as Locale] || rest[defaultLocale];
}
