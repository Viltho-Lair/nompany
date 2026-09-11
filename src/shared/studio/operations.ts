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
  nShiftsOutside: (n: number) => string;
  showOnlyWorkingHours: string;
  soonestLapseWindow: (days: number) => string;
  accessOperationsStudio: string;
  acquiringSignal: string;
  acrossEveryScheduledShift: string;
  activePermits: string;
  addLocation: string;
  addDepartment: string;
  manager: string;
  addStandardDepartments: string;
  code: string;
  departmentCycle: string;
  departmentInUse: (people: number, children: number) => string;
  departmentTooDeep: string;
  departments: string;
  departmentsAwaitingMigration: string;
  departmentsNotMigrated: string;
  departmentsOrgChart: string;
  duplicateCode: string;
  editDepartment: string;
  locationsTab: string;
  newDepartment: string;
  noDepartmentsYet: string;
  reportsInto: string;
  standardMissing: (names: string[]) => string;
  topLevel: string;
  unplaced: string;
  worksIn: string;
  addPermit: string;
  // ---- one permit register (tier 5) ----
  permitsTitle: string;
  permitsLead: string;
  permitsMoved: string;
  openPermits: string;
  permitStatus: (status: string) => string;
  issuePermit: string;
  closePermit: string;
  cancelPermit: string;
  alreadyIssued: string;
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
  masterData: string;
  loadingMasterData: string;
  // The route refuses a delete with the counts of what still points at the
  // place, so the message can name them rather than saying only "no".
  locationInUse: (shifts: number, permits: number) => string;
  locationsPlacesWorkHappens: string;
  mDidntSave: string;
  mDuplicate: string;
  mPerson: string;
  mRange: string;
  mReadOnly: string;
  mTime: string;
  mapLink: string;
  // Where a place is — LocationsPanel, PinPicker, PlacesMap, NavigateMenu.
  coordinates: string;
  coordinatesHint: string;
  coordinatesUnreadable: string;
  coordinatesShortLink: string;
  shortLinkReadOnSave: string;
  directions: string;
  directionsHint: string;
  useMyLocation: string;
  locating: string;
  pickOnMap: string;
  closeMap: string;
  pickOnMapHint: string;
  accuracyAbout: (m: number) => string;
  accuracyPoor: (m: number) => string;
  navigate: string;
  copyCoordinates: string;
  noPin: string;
  pinsOnMap: (n: number, total: number) => string;
  noPinsYet: string;
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
  // The dashboards' richer half (10/09/2026).
  dashShiftHeat: string;
  dashShiftHeatHint: string;
  dashPermitExpiry: string;
  dashPermitExpiryHint: string;
  dashSeriesPermits: string;
  dashHoursByLocation: string;
  dashHoursByLocationHint: string;
  dashHoursUnit: (n: number) => string;
  dashStateByType: string;
  dashStateByTypeHint: string;
  dashOther: string;
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
  nShiftsOutside: (n: number) => `${n} shift${n === 1 ? "" : "s"} fall outside the hours shown`,
  showOnlyWorkingHours: "Show only working hours on the calendar",
  soonestLapseWindow: (days) => `Soonest to lapse first · window ${days}d`,
  accessOperationsStudio: "You don't have access to Operations in this studio.",
  acquiringSignal: "Acquiring signal…",
  acrossEveryScheduledShift: "Across every scheduled shift",
  activePermits: "Active permits",
  addLocation: "Add location",
  addDepartment: "Add department",
  manager: "Manager",
  addStandardDepartments: "Add the ones we're missing",
  code: "Code",
  departmentCycle: "A department cannot report into one of its own sub-departments.",
  departmentInUse: (people, children) => {
    const parts: string[] = [];
    if (people) parts.push(`${people} ${people === 1 ? "person" : "people"}`);
    if (children) parts.push(`${children} sub-${children === 1 ? "department" : "departments"}`);
    return `Still in use by ${parts.join(" and ")}. Move them first.`;
  },
  departmentTooDeep: "That would nest the chart more than four levels deep.",
  departments: "Departments",
  departmentsAwaitingMigration: "This studio's people are still filed under the old section-based departments. Until those are moved across, no chart is created here — so nothing is invented beside the one you already have. An administrator needs to run the departments migration.",
  departmentsNotMigrated: "Departments not moved across yet",
  departmentsOrgChart: "Your own org chart — who reports where. Not the same as the product's sections: a department may span several, or none.",
  duplicateCode: "Another department already uses that code.",
  editDepartment: "Edit department",
  locationsTab: "Locations",
  newDepartment: "New department",
  noDepartmentsYet: "No departments yet",
  reportsInto: "Reports into",
  standardMissing: (names) => `Companies in your field usually also have: ${names.join(", ")}.`,
  topLevel: "Top level",
  unplaced: "Not placed",
  worksIn: "Works in",
  addPermit: "Add permit",
  permitsTitle: "Permits",
  permitsLead: "Every permit the studio holds or has asked for — authority permits and permits to work — where each stands, and whether it is in force.",
  permitsMoved: "Permits are kept in Quality & HSE now.",
  openPermits: "Open permits",
  permitStatus: (status) => status,
  issuePermit: "Issue",
  closePermit: "Close",
  cancelPermit: "Cancel permit",
  alreadyIssued: "Already issued",
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
  listBelowStillWorks: "The list below still works. A map needs NEXT_GOOGLE_MAPS_API_KEY to be set.",
  loadingOperations: "Loading Operations…",
  location: "Location",
  locationError: "Location error",
  locations: "Locations",
  masterData: "Master data",
  loadingMasterData: "Loading master data…",
  locationInUse: (shifts, permits) => {
    const parts: string[] = [];
    if (shifts) parts.push(`${shifts} shift${shifts === 1 ? "" : "s"}`);
    if (permits) parts.push(`${permits} permit${permits === 1 ? "" : "s"}`);
    return `Still used by ${parts.join(" and ")}. Change those first, then delete the place.`;
  },
  locationsPlacesWorkHappens: "Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them.",
  mDidntSave: "That didn't save.",
  mDuplicate: "That name is already in use.",
  mPerson: "Pick who is working.",
  mRange: "The end date can't be before the start date.",
  mReadOnly: "You have view-only access to Operations.",
  mTime: "Give the shift a date, a start and an end.",
  mapLink: "Map link",
  coordinates: "Coordinates",
  coordinatesHint: "Latitude, longitude — or paste a map link",
  coordinatesUnreadable: "There is no location in this. Type a pair like 31.9539, 35.9106, paste a map link, or pick the spot on the map.",
  coordinatesShortLink: "Paste short links into Map link instead — they are read when you save.",
  shortLinkReadOnSave: "A short link is read when you save.",
  directions: "Directions",
  directionsHint: "How to find it once there — a landmark, a gate, a floor",
  useMyLocation: "Use my location",
  locating: "Finding your location…",
  pickOnMap: "Pick on map",
  closeMap: "Close map",
  pickOnMapHint: "Click the map to drop the pin, then drag it to adjust.",
  accuracyAbout: (m) => `From this device, accurate to about ${m} m`,
  accuracyPoor: (m) => `Only accurate to about ${m} m — step outside, or pick the spot on the map.`,
  navigate: "Navigate",
  copyCoordinates: "Copy coordinates",
  noPin: "No pin",
  pinsOnMap: (n, total) => `${n} of ${total} on the map`,
  noPinsYet: "No location has a pin yet. Edit one and add its coordinates to see it on a map.",
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
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashShiftHeat: "Rota by location and day",
  dashShiftHeatHint: "Shifts at each place, this week's rota",
  dashPermitExpiry: "Permits lapsing by month",
  dashPermitExpiryHint: "End dates falling this month and in the next five",
  dashSeriesPermits: "Permits",
  dashHoursByLocation: "Hours by location",
  dashHoursByLocationHint: "Scheduled shift hours at each place",
  dashHoursUnit: (n) => `${n} h`,
  dashStateByType: "Permit state by type",
  dashStateByTypeHint: "Valid, expiring and expired within each kind",
  dashOther: "Other",
};

const ar: Strings = {
  ...commonAr,
  coloursCalendarDraws: "الألوان التي يرسم بها التقويم الورديات. وهذه الأنواع ثابتة — أعد تلوينها أو تسميتها، لكن لا يمكن الإضافة إليها أو الحذف منها، لأن وردية بلا نوع مسجل لن يكون لها لون ترسم به.",
  countPermits: (n) => `${n === 1 ? "تصريح واحد" : n === 2 ? "تصريحان" : n <= 10 ? `${n} تصاريح` : `${n} تصريحا`}`,
  countShifts: (n) => `${n === 1 ? "وردية واحدة" : n === 2 ? "ورديتان" : n <= 10 ? `${n} ورديات` : `${n} وردية`}`,
  forWindow: (from, to) => `للفترة ${from} – ${to}`,
  joinAnd: (parts) => parts.join(" و"),
  locationsPermitsShiftsRight: "المواقع والتصاريح والورديات محفوظة خلف صلاحية خاصة بها هنا. أما التتبع والإعدادات فلا يتأثران.",
  mClash: (from, to) => `هو مجدول بالفعل من ${from} إلى ${to} في ذلك اليوم.`,
  mInUse: (what) => `لا يزال مستخدما من ${what} — انقلها أولا.`,
  mOnLeave: (kind, from, to) => `هو في إجازة ${kind} معتمدة من ${from} إلى ${to}.`,
  nShiftsOutside: (n: number) => `${n === 1 ? "وردية واحدة تقع" : n === 2 ? "ورديتان تقعان" : n <= 10 ? `${n} ورديات تقع` : `${n} وردية تقع`} خارج الساعات المعروضة`,
  showOnlyWorkingHours: "اعرض ساعات العمل فقط على التقويم",
  soonestLapseWindow: (days) => `الأقرب انتهاء أولا · نافذة ${days} يوما`,
  accessOperationsStudio: "لا تملك صلاحية الوصول إلى العمليات في هذا الاستوديو.",
  acquiringSignal: "جار التقاط الإشارة…",
  acrossEveryScheduledShift: "عبر كل وردية مجدولة",
  activePermits: "التصاريح السارية",
  addLocation: "إضافة موقع",
  addDepartment: "إضافة قسم",
  manager: "المدير",
  addStandardDepartments: "أضف الأقسام الناقصة",
  code: "الرمز",
  departmentCycle: "لا يمكن أن يتبع القسم أحد أقسامه الفرعية.",
  departmentInUse: (people, children) => {
    const parts: string[] = [];
    if (people) parts.push(`${people} من الموظفين`);
    if (children) parts.push(`${children} من الأقسام الفرعية`);
    return `ما زال مستخدما من ${parts.join(" و")}. انقلهم أولا.`;
  },
  departmentTooDeep: "هذا يجعل الهيكل أعمق من أربعة مستويات.",
  departments: "الأقسام",
  departmentsAwaitingMigration: "ما زال موظفو هذا الاستوديو مصنفين ضمن الأقسام القديمة المبنية على أقسام النظام. ولن يتم إنشاء هيكل جديد هنا قبل نقلهم، حتى لا يستحدث هيكل مواز للهيكل الحالي. يلزم أن يقوم المسؤول بتشغيل عملية ترحيل الأقسام.",
  departmentsNotMigrated: "لم يتم نقل الأقسام بعد",
  departmentsOrgChart: "الهيكل التنظيمي الخاص بك — من يتبع من. وهو ليس أقسام النظام: قد يمتد القسم الواحد على عدة أقسام في النظام، أو لا يرتبط بأي منها.",
  duplicateCode: "هذا الرمز مستخدم في قسم آخر.",
  editDepartment: "تعديل القسم",
  locationsTab: "المواقع",
  newDepartment: "قسم جديد",
  noDepartmentsYet: "لا توجد أقسام بعد",
  reportsInto: "يتبع",
  standardMissing: (names) => `الشركات في مجالك عادة لديها أيضا: ${names.join("، ")}.`,
  topLevel: "مستوى أعلى",
  unplaced: "غير محدد",
  worksIn: "يعمل في",
  addPermit: "إضافة تصريح",
  permitsTitle: "التصاريح",
  permitsLead: "كل تصريح يحمله الاستوديو أو طلبه — تصاريح الجهات وتصاريح العمل — وأين يقف كل منها، وهل هو ساري.",
  permitsMoved: "التصاريح في الجودة والسلامة الآن.",
  openPermits: "فتح التصاريح",
  permitStatus: (status) => AR_PERMIT_STATUS[status] || status,
  issuePermit: "إصدار",
  closePermit: "إغلاق",
  cancelPermit: "إلغاء التصريح",
  alreadyIssued: "صادر مسبقا",
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
  listBelowStillWorks: "القائمة أدناه تعمل كالمعتاد. أما الخريطة فتحتاج إلى ضبط NEXT_GOOGLE_MAPS_API_KEY.",
  loadingOperations: "جار تحميل العمليات…",
  location: "الموقع",
  locationError: "خطأ في تحديد الموقع",
  locations: "المواقع",
  masterData: "البيانات الأساسية",
  loadingMasterData: "جار تحميل البيانات الأساسية…",
  locationInUse: (shifts, permits) => {
    const parts: string[] = [];
    if (shifts) parts.push(`${shifts} مناوبة`);
    if (permits) parts.push(`${permits} تصريح`);
    return `لا يزال مستخدما في ${parts.join(" و")}. غير ذلك أولا ثم احذف الموقع.`;
  },
  locationsPlacesWorkHappens: "المواقع هي الأماكن التي يجري فيها العمل — مواقع العمل والمكاتب والمستودعات. وتشير إليها الورديات والتصاريح.",
  mDidntSave: "لم يحفظ ذلك.",
  mDuplicate: "هذا الاسم مستخدم بالفعل.",
  mPerson: "اختر من سيعمل.",
  mRange: "لا يمكن أن يسبق تاريخ النهاية تاريخ البداية.",
  mReadOnly: "لديك صلاحية عرض فقط على العمليات.",
  mTime: "أعط الوردية تاريخا وبداية ونهاية.",
  mapLink: "رابط الخريطة",
  coordinates: "الإحداثيات",
  coordinatesHint: "خط العرض، خط الطول — أو الصق رابط خريطة",
  coordinatesUnreadable: "لا يوجد موقع في هذا النص. اكتب زوجًا مثل 31.9539، 35.9106، أو الصق رابط خريطة، أو حدّد المكان على الخريطة.",
  coordinatesShortLink: "الصق الروابط المختصرة في حقل رابط الخريطة — تُقرأ عند الحفظ.",
  shortLinkReadOnSave: "يُقرأ الرابط المختصر عند الحفظ.",
  directions: "إرشادات الوصول",
  directionsHint: "كيف تجده عند الوصول — معلَم قريب أو بوابة أو طابق",
  useMyLocation: "استخدم موقعي",
  locating: "جارٍ تحديد موقعك…",
  pickOnMap: "حدّد على الخريطة",
  closeMap: "إغلاق الخريطة",
  pickOnMapHint: "انقر على الخريطة لوضع الدبوس، ثم اسحبه لضبط مكانه.",
  accuracyAbout: (m) => `من هذا الجهاز، بدقة تقارب ${m} م`,
  accuracyPoor: (m) => `الدقة تقارب ${m} م فقط — اخرج إلى مكان مفتوح، أو حدّد المكان على الخريطة.`,
  navigate: "الاتجاهات",
  copyCoordinates: "نسخ الإحداثيات",
  noPin: "بلا دبوس",
  pinsOnMap: (n, total) => `${n} من ${total} على الخريطة`,
  noPinsYet: "لا يوجد موقع عليه دبوس بعد. عدّل أحد المواقع وأضف إحداثياته ليظهر على الخريطة.",
  name: "الاسم",
  needsSecureConnection: "يحتاج تحديد الموقع إلى اتصال آمن.",
  newLocation: "موقع جديد",
  newPermit: "تصريح جديد",
  noAddress: "لا يوجد عنوان",
  noDatesSet: "لم تحدد تواريخ",
  noFixAvailable: "لا يوجد تحديد متاح.",
  noLocation: "بلا موقع",
  noLocationsYet: "لا توجد مواقع بعد",
  noMapConfigured: "لم تضبط خريطة",
  noOneScheduled: "لا أحد مجدول",
  noPermitsCarryEnd: "لا يحمل أي تصريح تاريخ انتهاء.",
  noPermitsRecordedYet: "لم تسجل أي تصاريح بعد.",
  noPermitsYet: "لا توجد تصاريح بعد",
  noShiftsScheduled: "لا توجد ورديات مجدولة",
  nobodySharingRightNow: "لا أحد يشارك موقعه الآن.",
  notSharing: "لا تتم المشاركة",
  notes: "ملاحظات",
  nothingScheduledYet: "لا شيء مجدول بعد.",
  openProject: "افتح المشروع",
  optionalTextAddedAbove: "نص اختياري يضاف أعلى جدول اليوم المنسوخ — تحية، أو ملاحظة ثابتة.",
  pausedNotFocused: "متوقف مؤقتا — الصفحة ليست في المقدمة",
  permissionDenied: "رفض الإذن — اسمح بالموقع لهذا الموقع الإلكتروني.",
  permitNumber: "رقم التصريح",
  permitsExpiring: "تصاريح توشك على الانتهاء",
  permitsRecordWhatStudio: "تسجل التصاريح ما يسمح للاستوديو بفعله، وأين، وحتى متى.",
  permitsStatus: "التصاريح حسب الحالة",
  permitsType: "التصاريح حسب النوع",
  placeWorkHappensSite: "مكان يجري فيه العمل — موقع أو مكتب أو مستودع.",
  project: "المشروع",
  removeMyLastPosition: "إزالة آخر موقع لي",
  reportedPositions: "المواقع المبلغ عنها",
  role: "الدور",
  roleShift: "الدور في هذه الوردية",
  save: "حفظ",
  saveSettings: "حفظ الإعدادات",
  saved: "تم الحفظ",
  saving: "جار الحفظ…",
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
  takenFromStudioSettings: "مأخوذة من إعدادات الاستوديو — فأيام العمل وساعاته إجابة واحدة للمنتج كله، لا لكل قسم على حدة. ويظلل التقويم أيام العطلة ويرسم على تلك الساعات.",
  thisWeek: "هذا الأسبوع",
  thisWeekSuffix: "هذا الأسبوع",
  timedOutFix: "انتهت المهلة في انتظار التحديد.",
  title: "العنوان",
  tracking: "التتبع",
  type: "النوع",
  valid: "ساري من",
  valid2: "ساري حتى",
  validExpiringExpired: "ساري، يوشك على الانتهاء، منته",
  validityTimeline: "المسار الزمني للسريان",
  viewCalendar: "التقويم",
  viewList: "قائمة",
  viewOnlyAccessOperations: "لديك صلاحية عرض فقط على إعدادات العمليات.",
  week: "هذا الأسبوع",
  whatKindAuthorisation: "أي نوع من التصريح",
  whatPermittedWhereUntil: "ما المسموح به، وأين، وحتى متى.",
  whereTeamIsNow: "أين الفريق الآن. والمشاركة لكل جلسة — تتوقف عند إغلاق هذه الصفحة، ولا يحفظ إلا آخر موقع لك، لا سجل بمسارك.",
  who: "من",
  whoWorkingWhenWhere: "من يعمل، ومتى، وأين.",
  workingHours: "ساعات العمل",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashShiftHeat: "المناوبات حسب الموقع واليوم",
  dashShiftHeatHint: "المناوبات في كل موقع ضمن جدول هذا الأسبوع",
  dashPermitExpiry: "التصاريح المنتهية شهرياً",
  dashPermitExpiryHint: "تواريخ الانتهاء في هذا الشهر والأشهر الخمسة التالية",
  dashSeriesPermits: "التصاريح",
  dashHoursByLocation: "الساعات حسب الموقع",
  dashHoursByLocationHint: "ساعات المناوبات المجدولة في كل موقع",
  dashHoursUnit: (n) => `${n} س`,
  dashStateByType: "حالة التصاريح حسب النوع",
  dashStateByTypeHint: "الصالحة والقريبة الانتهاء والمنتهية ضمن كل نوع",
  dashOther: "أخرى",
};

const operations = { en, ar };

// A PERMIT'S STANDING IN ARABIC, keyed by the stored token (tier 5).
const AR_PERMIT_STATUS: Record<string, string> = {
  Requested: "مطلوب",
  Issued: "صادر",
  Closed: "مغلق",
  Cancelled: "ملغى",
};

export function operationsDict(locale: string): Strings {
  return operations[locale as Locale] || operations[defaultLocale];
}
