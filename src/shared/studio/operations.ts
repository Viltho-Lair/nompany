import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// OPERATIONS — locations, permits, shifts and tracking.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessOperationsStudio: string;
  acrossEveryScheduledShift: string;
  activePermits: string;
  addLocation: string;
  addPermit: string;
  address: string;
  calendarLegend: string;
  cancel: string;
  city: string;
  coverageAcrossRotaWindow: string;
  covers: string;
  date: string;
  dayRosterPrefix: string;
  delete: string;
  edit: string;
  end: string;
  issued: string;
  kind: string;
  listBelowStillWorks: string;
  loadingOperations: string;
  location: string;
  locations: string;
  locationsPlacesWorkHappens: string;
  mapLink: string;
  name: string;
  noLocationsYet: string;
  noMapConfigured: string;
  noOneScheduled: string;
  noPermitsCarryEnd: string;
  noPermitsRecordedYet: string;
  noPermitsYet: string;
  nobodySharingRightNow: string;
  notes: string;
  nothingScheduledYet: string;
  openProject: string;
  optionalTextAddedAbove: string;
  permitNumber: string;
  permitsExpiring: string;
  permitsRecordWhatStudio: string;
  permitsStatus: string;
  permitsType: string;
  placeWorkHappensSite: string;
  project: string;
  removeMyLastPosition: string;
  reportedPositions: string;
  role: string;
  roleShift: string;
  saved: string;
  scheduleShift: string;
  shareMyLocation: string;
  shiftsLocation: string;
  shiftsWeek: string;
  start: string;
  stopSharing: string;
  title: string;
  tracking: string;
  type: string;
  valid: string;
  valid2: string;
  validExpiringExpired: string;
  validityTimeline: string;
  viewOnlyAccessOperations: string;
  week: string;
  whatKindAuthorisation: string;
  whatPermittedWhereUntil: string;
  who: string;
  whoWorkingWhenWhere: string;
  workingHours: string;
};

const en: Strings = {
  ...commonEn,
  accessOperationsStudio: "You don't have access to Operations in this studio.",
  acrossEveryScheduledShift: "Across every scheduled shift",
  activePermits: "Active permits",
  addLocation: "Add location",
  addPermit: "Add permit",
  address: "Address",
  calendarLegend: "Calendar legend",
  cancel: "Cancel",
  city: "City",
  coverageAcrossRotaWindow: "Coverage across the rota window",
  covers: "Covers",
  date: "Date",
  dayRosterPrefix: "Day roster prefix",
  delete: "Delete",
  edit: "Edit",
  end: "End",
  issued: "Issued by",
  kind: "Kind",
  listBelowStillWorks: "The list below still works. A map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.",
  loadingOperations: "Loading Operations…",
  location: "Location",
  locations: "Locations",
  locationsPlacesWorkHappens: "Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them.",
  mapLink: "Map link",
  name: "Name",
  noLocationsYet: "No locations yet",
  noMapConfigured: "No map configured",
  noOneScheduled: "No one scheduled",
  noPermitsCarryEnd: "No permits carry an end date.",
  noPermitsRecordedYet: "No permits recorded yet.",
  noPermitsYet: "No permits yet",
  nobodySharingRightNow: "Nobody is sharing right now.",
  notes: "Notes",
  nothingScheduledYet: "Nothing scheduled yet.",
  openProject: "Open the project",
  optionalTextAddedAbove: "Optional text added above the copied roster for a day — a greeting, or a standing note.",
  permitNumber: "Permit number",
  permitsExpiring: "Permits expiring",
  permitsRecordWhatStudio: "Permits record what the studio is authorised to do, where, and until when.",
  permitsStatus: "Permits by status",
  permitsType: "Permits by type",
  placeWorkHappensSite: "A place work happens — a site, an office, a warehouse.",
  project: "Project",
  removeMyLastPosition: "Remove my last position",
  reportedPositions: "Reported positions",
  role: "Role",
  roleShift: "The role on this shift",
  saved: "Saved",
  scheduleShift: "Schedule a shift",
  shareMyLocation: "Share my location",
  shiftsLocation: "Shifts by location",
  shiftsWeek: "Shifts this week",
  start: "Start",
  stopSharing: "Stop sharing",
  title: "Title",
  tracking: "Tracking",
  type: "Type",
  valid: "Valid from",
  valid2: "Valid to",
  validExpiringExpired: "Valid, expiring, expired",
  validityTimeline: "Validity timeline",
  viewOnlyAccessOperations: "You have view-only access to Operations settings.",
  week: "This week",
  whatKindAuthorisation: "What kind of authorisation",
  whatPermittedWhereUntil: "What is permitted, where, and until when.",
  who: "Who",
  whoWorkingWhenWhere: "Who is working, when, and where.",
  workingHours: "Working hours",
};

const ar: Strings = {
  ...commonAr,
  accessOperationsStudio: "لا تملك صلاحية الوصول إلى العمليات في هذا الاستوديو.",
  acrossEveryScheduledShift: "عبر كل وردية مجدولة",
  activePermits: "التصاريح السارية",
  addLocation: "إضافة موقع",
  addPermit: "إضافة تصريح",
  address: "العنوان",
  calendarLegend: "مفتاح التقويم",
  cancel: "إلغاء",
  city: "المدينة",
  coverageAcrossRotaWindow: "التغطية عبر نافذة الجدول",
  covers: "يغطي",
  date: "التاريخ",
  dayRosterPrefix: "مقدمة جدول اليوم",
  delete: "حذف",
  edit: "تعديل",
  end: "النهاية",
  issued: "جهة الإصدار",
  kind: "النوع",
  listBelowStillWorks: "القائمة أدناه تعمل كالمعتاد. أما الخريطة فتحتاج إلى ضبط NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
  loadingOperations: "جارٍ تحميل العمليات…",
  location: "الموقع",
  locations: "المواقع",
  locationsPlacesWorkHappens: "المواقع هي الأماكن التي يجري فيها العمل — مواقع العمل والمكاتب والمستودعات. وتشير إليها الورديات والتصاريح.",
  mapLink: "رابط الخريطة",
  name: "الاسم",
  noLocationsYet: "لا توجد مواقع بعد",
  noMapConfigured: "لم تُضبط خريطة",
  noOneScheduled: "لا أحد مجدول",
  noPermitsCarryEnd: "لا يحمل أي تصريح تاريخ انتهاء.",
  noPermitsRecordedYet: "لم تُسجَّل أي تصاريح بعد.",
  noPermitsYet: "لا توجد تصاريح بعد",
  nobodySharingRightNow: "لا أحد يشارك موقعه الآن.",
  notes: "ملاحظات",
  nothingScheduledYet: "لا شيء مجدول بعد.",
  openProject: "افتح المشروع",
  optionalTextAddedAbove: "نص اختياري يُضاف أعلى جدول اليوم المنسوخ — تحية، أو ملاحظة ثابتة.",
  permitNumber: "رقم التصريح",
  permitsExpiring: "تصاريح توشك على الانتهاء",
  permitsRecordWhatStudio: "تسجّل التصاريح ما يُسمح للاستوديو بفعله، وأين، وحتى متى.",
  permitsStatus: "التصاريح حسب الحالة",
  permitsType: "التصاريح حسب النوع",
  placeWorkHappensSite: "مكان يجري فيه العمل — موقع أو مكتب أو مستودع.",
  project: "المشروع",
  removeMyLastPosition: "إزالة آخر موقع لي",
  reportedPositions: "المواقع المُبلَّغ عنها",
  role: "الدور",
  roleShift: "الدور في هذه الوردية",
  saved: "تم الحفظ",
  scheduleShift: "جدولة وردية",
  shareMyLocation: "مشاركة موقعي",
  shiftsLocation: "الورديات حسب الموقع",
  shiftsWeek: "ورديات هذا الأسبوع",
  start: "البداية",
  stopSharing: "إيقاف المشاركة",
  title: "العنوان",
  tracking: "التتبّع",
  type: "النوع",
  valid: "ساري من",
  valid2: "ساري حتى",
  validExpiringExpired: "ساري، يوشك على الانتهاء، منتهٍ",
  validityTimeline: "المسار الزمني للسريان",
  viewOnlyAccessOperations: "لديك صلاحية عرض فقط على إعدادات العمليات.",
  week: "هذا الأسبوع",
  whatKindAuthorisation: "أي نوع من التصريح",
  whatPermittedWhereUntil: "ما المسموح به، وأين، وحتى متى.",
  who: "من",
  whoWorkingWhenWhere: "من يعمل، ومتى، وأين.",
  workingHours: "ساعات العمل",
};

const operations = { en, ar };

export function operationsDict(locale: string): Strings {
  return operations[locale as Locale] || operations[defaultLocale];
}
