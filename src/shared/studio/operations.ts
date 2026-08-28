import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// OPERATIONS — locations, permits, shifts and tracking.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  coloursCalendarDraws: string;
  countPermits: (n: number) => string;
  countShifts: (n: number) => string;
  forWindow: (from: string, to: string) => string;
  joinAnd: (parts: string[]) => string;
  locationsPermitsShiftsRight: string;
  mClash: (from: string, to: string) => string;
  mInUse: (what: string) => string;
  mOnLeave: (kind: string, from: string, to: string) => string;
  showOnlyWorkingHours: string;
  soonestLapseWindow: (days: number) => string;
  accessOperationsStudio: string;
  acquiringSignal: string;
  acrossEveryScheduledShift: string;
  activePermits: string;
  addLocation: string;
  addPermit: string;
  address: string;
  browserCantReport: string;
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
  locationError: string;
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
  needsSecureConnection: string;
  newLocation: string;
  newPermit: string;
  noAddress: string;
  noDatesSet: string;
  noFixAvailable: string;
  noLocation: string;
  noLocationsYet: string;
  noMapConfigured: string;
  noOneScheduled: string;
  noPermitsCarryEnd: string;
  noPermitsRecordedYet: string;
  noPermitsYet: string;
  noShiftsScheduled: string;
  nobodySharingRightNow: string;
  notSharing: string;
  notes: string;
  nothingScheduledYet: string;
  openProject: string;
  optionalTextAddedAbove: string;
  pausedNotFocused: string;
  permissionDenied: string;
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
  screenNotYours: string;
  seriesShifts: string;
  shareMyLocation: string;
  sharing: string;
  shifts: string;
  shiftsLocation: string;
  shiftsWeek: string;
  start: string;
  stopSharing: string;
  tabLocations: string;
  tabPermits: string;
  tabSchedule: string;
  takenFromStudioSettings: string;
  thisWeek: string;
  thisWeekSuffix: string;
  timedOutFix: string;
  title: string;
  tracking: string;
  type: string;
  valid: string;
  valid2: string;
  validExpiringExpired: string;
  validityTimeline: string;
  viewCalendar: string;
  viewList: string;
  viewOnlyAccessOperations: string;
  week: string;
  whatKindAuthorisation: string;
  whatPermittedWhereUntil: string;
  whereTeamIsNow: string;
  who: string;
  whoWorkingWhenWhere: string;
  workingHours: string;
};

const en: Strings = {
  ...commonEn,
  coloursCalendarDraws: "The colours the calendar draws shifts in. These kinds are fixed — recolour or rename them, but they cannot be added to or removed, because a shift whose kind has no entry would have no colour to be drawn in.",
  countPermits: (n) => `${n} ${n === 1 ? "permit" : "permits"}`,
  countShifts: (n) => `${n} ${n === 1 ? "shift" : "shifts"}`,
  forWindow: (from, to) => `for ${from} – ${to}`,
  joinAnd: (parts) => parts.join(" and "),
  locationsPermitsShiftsRight: "Locations, permits and shifts are kept behind a right of their own here. Tracking and Settings are unaffected.",
  mClash: (from, to) => `They're already scheduled ${from}–${to} that day.`,
  mInUse: (what) => `Still used by ${what} — move those first.`,
  mOnLeave: (kind, from, to) => `They're on approved ${kind} leave ${from} – ${to}.`,
  showOnlyWorkingHours: "Show only working hours on the calendar",
  soonestLapseWindow: (days) => `Soonest to lapse first · window ${days}d`,
  accessOperationsStudio: "You don't have access to Operations in this studio.",
  acquiringSignal: "Acquiring signal…",
  acrossEveryScheduledShift: "Across every scheduled shift",
  activePermits: "Active permits",
  addLocation: "Add location",
  addPermit: "Add permit",
  address: "Address",
  browserCantReport: "This browser can't report a location.",
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
  locationError: "Location error",
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
  needsSecureConnection: "Location needs a secure connection.",
  newLocation: "New location",
  newPermit: "New permit",
  noAddress: "No address",
  noDatesSet: "No dates set",
  noFixAvailable: "No fix available.",
  noLocation: "No location",
  noLocationsYet: "No locations yet",
  noMapConfigured: "No map configured",
  noOneScheduled: "No one scheduled",
  noPermitsCarryEnd: "No permits carry an end date.",
  noPermitsRecordedYet: "No permits recorded yet.",
  noPermitsYet: "No permits yet",
  noShiftsScheduled: "No shifts scheduled",
  nobodySharingRightNow: "Nobody is sharing right now.",
  notSharing: "Not sharing",
  notes: "Notes",
  nothingScheduledYet: "Nothing scheduled yet.",
  openProject: "Open the project",
  optionalTextAddedAbove: "Optional text added above the copied roster for a day — a greeting, or a standing note.",
  pausedNotFocused: "Paused — page not in focus",
  permissionDenied: "Permission denied — allow location for this site.",
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
  screenNotYours: "This screen isn't yours to see",
  seriesShifts: "Shifts",
  shareMyLocation: "Share my location",
  sharing: "Sharing",
  shifts: "Shifts",
  shiftsLocation: "Shifts by location",
  shiftsWeek: "Shifts this week",
  start: "Start",
  stopSharing: "Stop sharing",
  tabLocations: "Locations",
  tabPermits: "Permits",
  tabSchedule: "Schedule",
  takenFromStudioSettings: "Taken from Studio settings — the days and hours the studio works are one answer for the whole product, not a per-section one. The calendar shades days that are off and draws against those hours.",
  thisWeek: "this week",
  thisWeekSuffix: "this week",
  timedOutFix: "Timed out waiting for a fix.",
  title: "Title",
  tracking: "Tracking",
  type: "Type",
  valid: "Valid from",
  valid2: "Valid to",
  validExpiringExpired: "Valid, expiring, expired",
  validityTimeline: "Validity timeline",
  viewCalendar: "Calendar",
  viewList: "List",
  viewOnlyAccessOperations: "You have view-only access to Operations settings.",
  week: "This week",
  whatKindAuthorisation: "What kind of authorisation",
  whatPermittedWhereUntil: "What is permitted, where, and until when.",
  whereTeamIsNow: "Where the team is right now. Sharing is per session — it stops when you close this page, and only your latest position is kept, never a history of where you have been.",
  who: "Who",
  whoWorkingWhenWhere: "Who is working, when, and where.",
  workingHours: "Working hours",
};

const ar: Strings = {
  ...commonAr,
  coloursCalendarDraws: "الألوان التي يرسم بها التقويم الورديات. وهذه الأنواع ثابتة — أعد تلوينها أو تسميتها، لكن لا يمكن الإضافة إليها أو الحذف منها، لأن وردية بلا نوع مسجّل لن يكون لها لون تُرسم به.",
  countPermits: (n) => `${n === 1 ? "تصريح واحد" : n === 2 ? "تصريحان" : n <= 10 ? `${n} تصاريح` : `${n} تصريحًا`}`,
  countShifts: (n) => `${n === 1 ? "وردية واحدة" : n === 2 ? "ورديتان" : n <= 10 ? `${n} ورديات` : `${n} وردية`}`,
  forWindow: (from, to) => `للفترة ${from} – ${to}`,
  joinAnd: (parts) => parts.join(" و"),
  locationsPermitsShiftsRight: "المواقع والتصاريح والورديات محفوظة خلف صلاحية خاصة بها هنا. أما التتبع والإعدادات فلا يتأثران.",
  mClash: (from, to) => `هو مجدول بالفعل من ${from} إلى ${to} في ذلك اليوم.`,
  mInUse: (what) => `لا يزال مستخدمًا من ${what} — انقلها أولًا.`,
  mOnLeave: (kind, from, to) => `هو في إجازة ${kind} معتمدة من ${from} إلى ${to}.`,
  showOnlyWorkingHours: "اعرض ساعات العمل فقط على التقويم",
  soonestLapseWindow: (days) => `الأقرب انتهاءً أولًا · نافذة ${days} يومًا`,
  accessOperationsStudio: "لا تملك صلاحية الوصول إلى العمليات في هذا الاستوديو.",
  acquiringSignal: "جارٍ التقاط الإشارة…",
  acrossEveryScheduledShift: "عبر كل وردية مجدولة",
  activePermits: "التصاريح السارية",
  addLocation: "إضافة موقع",
  addPermit: "إضافة تصريح",
  address: "العنوان",
  browserCantReport: "لا يستطيع هذا المتصفح الإبلاغ عن موقع.",
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
  locationError: "خطأ في تحديد الموقع",
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
  needsSecureConnection: "يحتاج تحديد الموقع إلى اتصال آمن.",
  newLocation: "موقع جديد",
  newPermit: "تصريح جديد",
  noAddress: "لا يوجد عنوان",
  noDatesSet: "لم تُحدَّد تواريخ",
  noFixAvailable: "لا يوجد تحديد متاح.",
  noLocation: "بلا موقع",
  noLocationsYet: "لا توجد مواقع بعد",
  noMapConfigured: "لم تُضبط خريطة",
  noOneScheduled: "لا أحد مجدول",
  noPermitsCarryEnd: "لا يحمل أي تصريح تاريخ انتهاء.",
  noPermitsRecordedYet: "لم تُسجَّل أي تصاريح بعد.",
  noPermitsYet: "لا توجد تصاريح بعد",
  noShiftsScheduled: "لا توجد ورديات مجدولة",
  nobodySharingRightNow: "لا أحد يشارك موقعه الآن.",
  notSharing: "لا تتم المشاركة",
  notes: "ملاحظات",
  nothingScheduledYet: "لا شيء مجدول بعد.",
  openProject: "افتح المشروع",
  optionalTextAddedAbove: "نص اختياري يُضاف أعلى جدول اليوم المنسوخ — تحية، أو ملاحظة ثابتة.",
  pausedNotFocused: "متوقف مؤقتًا — الصفحة ليست في المقدمة",
  permissionDenied: "رُفض الإذن — اسمح بالموقع لهذا الموقع الإلكتروني.",
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
  screenNotYours: "هذه الشاشة ليست من صلاحياتك",
  seriesShifts: "الورديات",
  shareMyLocation: "مشاركة موقعي",
  sharing: "تتم المشاركة",
  shifts: "الورديات",
  shiftsLocation: "الورديات حسب الموقع",
  shiftsWeek: "ورديات هذا الأسبوع",
  start: "البداية",
  stopSharing: "إيقاف المشاركة",
  tabLocations: "المواقع",
  tabPermits: "التصاريح",
  tabSchedule: "الجدول",
  takenFromStudioSettings: "مأخوذة من إعدادات الاستوديو — فأيام العمل وساعاته إجابة واحدة للمنتج كله، لا لكل قسم على حدة. ويظلّل التقويم أيام العطلة ويرسم على تلك الساعات.",
  thisWeek: "هذا الأسبوع",
  thisWeekSuffix: "هذا الأسبوع",
  timedOutFix: "انتهت المهلة في انتظار التحديد.",
  title: "العنوان",
  tracking: "التتبّع",
  type: "النوع",
  valid: "ساري من",
  valid2: "ساري حتى",
  validExpiringExpired: "ساري، يوشك على الانتهاء، منتهٍ",
  validityTimeline: "المسار الزمني للسريان",
  viewCalendar: "التقويم",
  viewList: "قائمة",
  viewOnlyAccessOperations: "لديك صلاحية عرض فقط على إعدادات العمليات.",
  week: "هذا الأسبوع",
  whatKindAuthorisation: "أي نوع من التصريح",
  whatPermittedWhereUntil: "ما المسموح به، وأين، وحتى متى.",
  whereTeamIsNow: "أين الفريق الآن. والمشاركة لكل جلسة — تتوقف عند إغلاق هذه الصفحة، ولا يُحفظ إلا آخر موقع لك، لا سجل بمسارك.",
  who: "من",
  whoWorkingWhenWhere: "من يعمل، ومتى، وأين.",
  workingHours: "ساعات العمل",
};

const operations = { en, ar };

export function operationsDict(locale: string): Strings {
  return operations[locale as Locale] || operations[defaultLocale];
}
