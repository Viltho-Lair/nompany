import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// OPERATIONS — locations, permits, shifts and tracking.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  countPermits: (n: number) => string;
  countShifts: (n: number) => string;
  forWindow: (from: string, to: string) => string;
  joinAnd: (parts: string[]) => string;
  mClash: (from: string, to: string) => string;
  mInUse: (what: string) => string;
  mOnLeave: (kind: string, from: string, to: string) => string;
  soonestLapseWindow: (days: number) => string;
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
  editLocation: string;
  editPermit: string;
  end: string;
  issued: string;
  justNow: string;
  kind: string;
  listBelowStillWorks: string;
  loadingOperations: string;
  location: string;
  locations: string;
  locationsPlacesWorkHappens: string;
  mDidntSave: string;
  mDuplicate: string;
  mPerson: string;
  mRange: string;
  mReadOnly: string;
  mTime: string;
  mapLink: string;
  name: string;
  newLocation: string;
  newPermit: string;
  noDatesSet: string;
  noLocation: string;
  noLocationsYet: string;
  noMapConfigured: string;
  noOneScheduled: string;
  noPermitsCarryEnd: string;
  noPermitsRecordedYet: string;
  noPermitsYet: string;
  noShiftsScheduled: string;
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
  save: string;
  saveSettings: string;
  saved: string;
  saving: string;
  schedule: string;
  scheduleShift: string;
  seriesShifts: string;
  shareMyLocation: string;
  shifts: string;
  shiftsLocation: string;
  shiftsWeek: string;
  start: string;
  stopSharing: string;
  thisWeek: string;
  thisWeekSuffix: string;
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
  countPermits: (n) => `${n} ${n === 1 ? "permit" : "permits"}`,
  countShifts: (n) => `${n} ${n === 1 ? "shift" : "shifts"}`,
  forWindow: (from, to) => `for ${from} – ${to}`,
  joinAnd: (parts) => parts.join(" and "),
  mClash: (from, to) => `They're already scheduled ${from}–${to} that day.`,
  mInUse: (what) => `Still used by ${what} — move those first.`,
  mOnLeave: (kind, from, to) => `They're on approved ${kind} leave ${from} – ${to}.`,
  soonestLapseWindow: (days) => `Soonest to lapse first · window ${days}d`,
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
  editLocation: "Edit location",
  editPermit: "Edit permit",
  end: "End",
  issued: "Issued by",
  justNow: "just now",
  kind: "Kind",
  listBelowStillWorks: "The list below still works. A map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.",
  loadingOperations: "Loading Operations…",
  location: "Location",
  locations: "Locations",
  locationsPlacesWorkHappens: "Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them.",
  mDidntSave: "That didn't save.",
  mDuplicate: "That name is already in use.",
  mPerson: "Pick who is working.",
  mRange: "The end date can't be before the start date.",
  mReadOnly: "You have view-only access to Operations.",
  mTime: "Give the shift a date, a start and an end.",
  mapLink: "Map link",
  name: "Name",
  newLocation: "New location",
  newPermit: "New permit",
  noDatesSet: "No dates set",
  noLocation: "No location",
  noLocationsYet: "No locations yet",
  noMapConfigured: "No map configured",
  noOneScheduled: "No one scheduled",
  noPermitsCarryEnd: "No permits carry an end date.",
  noPermitsRecordedYet: "No permits recorded yet.",
  noPermitsYet: "No permits yet",
  noShiftsScheduled: "No shifts scheduled",
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
  save: "Save",
  saveSettings: "Save settings",
  saved: "Saved",
  saving: "Saving…",
  schedule: "Schedule",
  scheduleShift: "Schedule a shift",
  seriesShifts: "Shifts",
  shareMyLocation: "Share my location",
  shifts: "Shifts",
  shiftsLocation: "Shifts by location",
  shiftsWeek: "Shifts this week",
  start: "Start",
  stopSharing: "Stop sharing",
  thisWeek: "this week",
  thisWeekSuffix: "this week",
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
  countPermits: (n) => `${n === 1 ? "تصريح واحد" : n === 2 ? "تصريحان" : n <= 10 ? `${n} تصاريح` : `${n} تصريحًا`}`,
  countShifts: (n) => `${n === 1 ? "وردية واحدة" : n === 2 ? "ورديتان" : n <= 10 ? `${n} ورديات` : `${n} وردية`}`,
  forWindow: (from, to) => `للفترة ${from} – ${to}`,
  joinAnd: (parts) => parts.join(" و"),
  mClash: (from, to) => `هو مجدول بالفعل من ${from} إلى ${to} في ذلك اليوم.`,
  mInUse: (what) => `لا يزال مستخدمًا من ${what} — انقلها أولًا.`,
  mOnLeave: (kind, from, to) => `هو في إجازة ${kind} معتمدة من ${from} إلى ${to}.`,
  soonestLapseWindow: (days) => `الأقرب انتهاءً أولًا · نافذة ${days} يومًا`,
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
  editLocation: "تعديل الموقع",
  editPermit: "تعديل التصريح",
  end: "النهاية",
  issued: "جهة الإصدار",
  justNow: "الآن",
  kind: "النوع",
  listBelowStillWorks: "القائمة أدناه تعمل كالمعتاد. أما الخريطة فتحتاج إلى ضبط NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
  loadingOperations: "جارٍ تحميل العمليات…",
  location: "الموقع",
  locations: "المواقع",
  locationsPlacesWorkHappens: "المواقع هي الأماكن التي يجري فيها العمل — مواقع العمل والمكاتب والمستودعات. وتشير إليها الورديات والتصاريح.",
  mDidntSave: "لم يُحفظ ذلك.",
  mDuplicate: "هذا الاسم مستخدم بالفعل.",
  mPerson: "اختر من سيعمل.",
  mRange: "لا يمكن أن يسبق تاريخ النهاية تاريخ البداية.",
  mReadOnly: "لديك صلاحية عرض فقط على العمليات.",
  mTime: "أعطِ الوردية تاريخًا وبداية ونهاية.",
  mapLink: "رابط الخريطة",
  name: "الاسم",
  newLocation: "موقع جديد",
  newPermit: "تصريح جديد",
  noDatesSet: "لم تُحدَّد تواريخ",
  noLocation: "بلا موقع",
  noLocationsYet: "لا توجد مواقع بعد",
  noMapConfigured: "لم تُضبط خريطة",
  noOneScheduled: "لا أحد مجدول",
  noPermitsCarryEnd: "لا يحمل أي تصريح تاريخ انتهاء.",
  noPermitsRecordedYet: "لم تُسجَّل أي تصاريح بعد.",
  noPermitsYet: "لا توجد تصاريح بعد",
  noShiftsScheduled: "لا توجد ورديات مجدولة",
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
  save: "حفظ",
  saveSettings: "حفظ الإعدادات",
  saved: "تم الحفظ",
  saving: "جارٍ الحفظ…",
  schedule: "جدولة",
  scheduleShift: "جدولة وردية",
  seriesShifts: "الورديات",
  shareMyLocation: "مشاركة موقعي",
  shifts: "الورديات",
  shiftsLocation: "الورديات حسب الموقع",
  shiftsWeek: "ورديات هذا الأسبوع",
  start: "البداية",
  stopSharing: "إيقاف المشاركة",
  thisWeek: "هذا الأسبوع",
  thisWeekSuffix: "هذا الأسبوع",
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
