import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PLANNER — plans, the WBS, templates and presets.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  addMilestone: string;
  addPredecessor: string;
  addSubtask: string;
  addTask: string;
  addTaskBelow: string;
  auto: string;
  autoSchedule: string;
  // THE AVAILABILITY STRIP — when a colleague is busy, and never what they are
  // doing. Every word here has to survive that distinction, so none of them
  // names an event, a place or a person: "Busy" is the whole vocabulary.
  availability: string;
  availabilityBusy: string;
  availabilityChecking: string;
  availabilityConnectInAccount: string;
  availabilityFree: string;
  availabilityNoCalendar: string;
  availabilityNoCalendarConnected: string;
  availabilityNobodyAssigned: string;
  availabilityNotShared: string;
  availabilityOutsideWindow: string;
  availabilityShareFailed: string;
  availabilityShareHint: string;
  availabilityShareLabel: string;
  availabilityShareUnreadable: string;
  availabilityUnavailable: string;
  byAssignee: string;
  byPhase: string;
  byPriority: string;
  byStatus: string;
  calendarDaysWord: string;
  cancel: string;
  choosePreset: string;
  clearAll: string;
  colAssignee: string;
  colDuration: string;
  colEffort: string;
  colEnd: string;
  colPredecessors: string;
  colPriority: string;
  colProgress: string;
  colStart: string;
  colStatus: string;
  colTaskName: string;
  colWbs: string;
  issueMissingPredecessor: string;
  nCalendarDays: (n: number) => string;
  nTasks: (n: number) => string;
  nMilestones: (n: number) => string;
  nSchedulingIssues: (n: number) => string;
  collapseAllPhases: string;
  colorBy: string;
  convertToMilestone: string;
  convertToTask: string;
  critical: string;
  dayWindow: string;
  defaults: string;
  delete: string;
  deleteNamed: (what: string) => string;
  assign: string;
  assignee: string;
  calculatedFromStart: string;
  calculatedFromStart2: string;
  close: string;
  close2: string;
  contextLinksAcceptanceCriteria: string;
  creating: string;
  criticalPath: string;
  days: string;
  defaultColour: string;
  defaultZoom: string;
  defaultsCouldNotSaved: string;
  details: string;
  duplicate: string;
  duration: string;
  edit: string;
  effortCost: string;
  end: string;
  expandAll: string;
  fields: string;
  filterTasks: string;
  fitTasks: string;
  float: string;
  fromStudioWorkingHours: string;
  generateWorkBreakdown: string;
  gridColumns: string;
  highlightLongestPathThrough: string;
  hold: string;
  hours: string;
  howNewPlanOpens: string;
  howNewPlanOpens2: string;
  indent: string;
  issueCircular: string;
  issuePinnedTooEarly: string;
  issueSelfDependency: string;
  lastChangeNotSaved: string;
  link: string;
  links: string;
  loadingTemplates: string;
  new: string;
  newMilestone: string;
  newPlan: string;
  newPlanDefaults: string;
  newTask: string;
  noDescription: string;
  noDescription2: string;
  noDescription3: string;
  noIncomingLinks: string;
  noPlansYet: string;
  noTemplatesYet: string;
  noTemplatesYetUse: string;
  notes: string;
  nothingPlannedYet: string;
  offTrack: string;
  outdent: string;
  permissionChangeTheseDefaults: string;
  phAtRisk: string;
  phOffTrack: string;
  phOnHold: string;
  phOnTrack: string;
  pickTemplateLayout: string;
  pinStartDate: string;
  pinned: string;
  pinnedStart: string;
  pinnedStart2: string;
  planCouldNotLoad: string;
  plans: string;
  plansCouldNotLoad: string;
  plansFromEitherAppear: string;
  prCritical: string;
  prHigh: string;
  prLow: string;
  prMedium: string;
  predecessors: string;
  presets: string;
  printPlan: string;
  priority: string;
  projectPlan: string;
  projectSchedules: string;
  quarterPrefix: string;
  redo: string;
  resetToAppDefaults: string;
  reusableTaskStructures: string;
  risk: string;
  rolledUpFromSubtasks: string;
  saveDefaults: string;
  saving: string;
  scheduling: string;
  selectRowToEdit: string;
  showDependencyArrows: string;
  stAtRisk: string;
  stBlocked: string;
  stComplete: string;
  stInProgress: string;
  stNotStarted: string;
  stOnTrack: string;
  start: string;
  startFromPreset: string;
  startFromScratch: string;
  startFromTemplate: string;
  status: string;
  statusAtRisk: string;
  statusOffTrack: string;
  statusOnHold: string;
  statusOnTrack: string;
  successors: string;
  summaryRowBracket: string;
  team: string;
  templates: string;
  toBuildOne: string;
  toStartExternal: string;
  today: string;
  track: string;
  trimWaterfallOneDay: string;
  unassigned: string;
  undo: string;
  unnamed: string;
  untitledPlan: string;
  untitledPlan2: string;
  untitledProject: string;
  untitledTemplate: string;
  untitledTemplate2: string;
  untitledTemplate3: string;
  updated: string;
  use: string;
  usePlanStart: string;
  viewDefaults: string;
  viewDefaults2: string;
  viewDefaultsHeading: string;
  viewGrid: string;
  viewOnly: string;
  viewOnlyAccessPlan: string;
  viewSplit: string;
  viewTimeline: string;
  weekOf: string;
  withSubtasks: string;
  workItem: string;
  workingDays: string;
  workingHours: string;
  workingWeek: string;
  zoomDays: string;
  zoomHours: string;
  zoomMonths: string;
  zoomQuarters: string;
  zoomWeeks: string;
};

const en: Strings = {
  ...commonEn,
  addMilestone: "Add milestone",
  addPredecessor: "Add predecessor",
  addSubtask: "Add sub-task",
  addTask: "Add task",
  addTaskBelow: "Add task below",
  auto: "Auto",
  autoSchedule: "Auto-schedule",
  availability: "Who is busy",
  availabilityBusy: "Busy",
  availabilityChecking: "Checking…",
  availabilityConnectInAccount: "Connect one in your account settings",
  availabilityFree: "Free",
  availabilityNoCalendar: "You have no calendar connected, so there is nothing to share yet.",
  availabilityNoCalendarConnected: "No calendar connected",
  availabilityNobodyAssigned: "Nobody is assigned to this plan yet.",
  availabilityNotShared: "Not shared",
  availabilityOutsideWindow: "Not checked",
  availabilityShareFailed: "That couldn't be saved. Try again.",
  availabilityShareHint: "Colleagues see when you are busy — never what you are doing, where, or with whom.",
  availabilityShareLabel: "Let colleagues in this studio see when I'm busy",
  availabilityShareUnreadable: "Your sharing setting couldn't be read, so it can't be changed here yet.",
  availabilityUnavailable: "Couldn't be checked",
  byAssignee: "Assignee",
  byPhase: "Phase",
  byPriority: "Priority",
  byStatus: "Status",
  calendarDaysWord: "calendar days",
  cancel: "Cancel",
  choosePreset: "Choose a preset",
  clearAll: "Clear all",
  colAssignee: "Assignee",
  colDuration: "Duration",
  colEffort: "Effort (h)",
  colEnd: "End",
  colPredecessors: "Predecessors",
  colPriority: "Priority",
  colProgress: "% Done",
  colStart: "Start",
  colStatus: "Status",
  colTaskName: "Task name",
  colWbs: "WBS",
  issueMissingPredecessor: "A predecessor no longer exists",
  nCalendarDays: (n) => `${n} calendar day${n === 1 ? "" : "s"}`,
  nTasks: (n) => `${n} task${n === 1 ? "" : "s"}`,
  nMilestones: (n) => `${n} milestone${n === 1 ? "" : "s"}`,
  nSchedulingIssues: (n) => `${n} scheduling issue${n === 1 ? "" : "s"}`,
  collapseAllPhases: "Collapse all phases",
  colorBy: "Color",
  convertToMilestone: "Convert to milestone",
  convertToTask: "Convert to task",
  critical: "Critical",
  dayWindow: "Day window",
  defaults: "Defaults",
  delete: "Delete",
  deleteNamed: (what) => `Delete ${what}`,
  assign: "Assign to",
  assignee: "Assignee",
  calculatedFromStart: "Calculated from start + duration over working time",
  calculatedFromStart2: "Calculated from start + duration over working time",
  close: "Close",
  close2: "Close",
  contextLinksAcceptanceCriteria: "Context, links, acceptance criteria…",
  creating: "Creating…",
  criticalPath: "Critical path",
  days: "Days",
  defaultColour: "Default colour-by",
  defaultZoom: "Default zoom",
  defaultsCouldNotSaved: "The defaults could not be saved. Please try again.",
  details: "Details",
  duplicate: "Duplicate",
  duration: "Duration",
  edit: "Edit",
  effortCost: "Effort / cost",
  end: "End",
  expandAll: "Expand all",
  fields: "Fields",
  filterTasks: "Filter tasks",
  fitTasks: "Fit to tasks",
  float: "Float",
  fromStudioWorkingHours: "From the studio's working hours — change them in Studio settings.",
  generateWorkBreakdown: "Generate a work breakdown from a preset, or add your first row and build the plan from scratch. Sub-rows turn their parent into a summary bracket automatically.",
  gridColumns: "Grid columns",
  highlightLongestPathThrough: "Highlight the longest path through the plan",
  hold: "On hold",
  hours: "Hours",
  howNewPlanOpens: "How a new plan opens the first time it is viewed. Its working week and people come from the studio itself.",
  howNewPlanOpens2: "How a new plan opens the first time it is viewed.",
  indent: "Indent",
  issueCircular: "Circular dependency - this link was ignored",
  issuePinnedTooEarly: "Pinned start is earlier than its predecessors allow",
  issueSelfDependency: "A task cannot depend on itself",
  lastChangeNotSaved: "Your last change couldn't be saved. Check your connection or access, then edit again.",
  link: "Link from",
  links: "Links",
  loadingTemplates: "Loading templates…",
  new: "New",
  newMilestone: "New milestone",
  newPlan: "New plan",
  newPlanDefaults: "New-plan defaults",
  newTask: "New task",
  noDescription: "No description.",
  noDescription2: "No description.",
  noDescription3: "No description.",
  noIncomingLinks: "No incoming links. This task starts on its own date.",
  noPlansYet: "No plans yet",
  noTemplatesYet: "No templates yet.",
  noTemplatesYetUse: "No templates yet. Use",
  notes: "Notes",
  nothingPlannedYet: "Nothing planned yet",
  offTrack: "Off track",
  outdent: "Outdent",
  permissionChangeTheseDefaults: "You don't have permission to change these defaults.",
  phAtRisk: "At Risk",
  phOffTrack: "Off Track",
  phOnHold: "On Hold",
  phOnTrack: "On Track",
  pickTemplateLayout: "Pick a template to lay this plan out from. A template carries its own dependency links, so the plan lays its timeline out on its own. Templates are created and edited on the planner landing, not here.",
  pinStartDate: "Pin start date",
  pinned: "Pinned",
  pinnedStart: "Pinned start — predecessors are ignored",
  pinnedStart2: "Pinned start - predecessors are ignored",
  planCouldNotLoad: "This plan could not be loaded — you may not have access to it.",
  plans: "Plans",
  plansCouldNotLoad: "These plans could not be loaded — you may not have access to the planner.",
  plansFromEitherAppear: "action. Plans from either appear here.",
  prCritical: "Critical",
  prHigh: "High",
  prLow: "Low",
  prMedium: "Medium",
  predecessors: "Predecessors",
  presets: "Presets",
  printPlan: "Print",
  priority: "Priority",
  projectPlan: "Project plan",
  projectSchedules: "Project schedules across this studio",
  quarterPrefix: "Q",
  redo: "Redo",
  resetToAppDefaults: "Reset to app defaults",
  reusableTaskStructures: "Reusable task structures a plan can start from",
  risk: "At risk",
  rolledUpFromSubtasks: "Rolled up from sub-tasks",
  saveDefaults: "Save defaults",
  saving: "Saving…",
  scheduling: "Scheduling",
  selectRowToEdit: "Select a row to see and edit its details.",
  showDependencyArrows: "Show dependency arrows",
  stAtRisk: "At risk",
  stBlocked: "Blocked",
  stComplete: "Complete",
  stInProgress: "In progress",
  stNotStarted: "Not started",
  stOnTrack: "On track",
  start: "Start",
  startFromPreset: "Start from a preset…",
  startFromScratch: "Start from scratch",
  startFromTemplate: "Start from a template",
  status: "Status",
  statusAtRisk: "At risk",
  statusOffTrack: "Off track",
  statusOnHold: "On hold",
  statusOnTrack: "On track",
  successors: "Successors",
  summaryRowBracket: "Summary row (bracket)",
  team: "Team",
  templates: "Templates",
  toBuildOne: "to build one.",
  toStartExternal: "to start an external schedule, or open a project and use its",
  today: "Today",
  track: "On track",
  trimWaterfallOneDay: "Trim the waterfall to one day either side of the work",
  unassigned: "Unassigned",
  undo: "Undo",
  unnamed: "Unnamed",
  untitledPlan: "Untitled plan",
  untitledPlan2: "Untitled plan",
  untitledProject: "Untitled project",
  untitledTemplate: "Untitled template",
  untitledTemplate2: "Untitled template",
  untitledTemplate3: "Untitled template",
  updated: "Updated",
  use: "Use",
  usePlanStart: "Use",
  viewDefaults: "View defaults",
  viewDefaults2: "View defaults",
  viewDefaultsHeading: "View defaults",
  viewGrid: "Information table",
  viewOnly: "View only",
  viewOnlyAccessPlan: "You have view-only access to this plan — changes you make here are not saved.",
  viewSplit: "Split",
  viewTimeline: "Waterfall",
  weekOf: "Week of",
  withSubtasks: " with sub-tasks",
  workItem: "Work item",
  workingDays: "Working days",
  workingHours: "Working hours",
  workingWeek: "Working week",
  zoomDays: "Days",
  zoomHours: "Hours",
  zoomMonths: "Months",
  zoomQuarters: "Quarters",
  zoomWeeks: "Weeks",
};

const ar: Strings = {
  ...commonAr,
  addMilestone: "أضف معلمًا",
  addPredecessor: "أضف سابقة",
  addSubtask: "أضف مهمة فرعية",
  addTask: "أضف مهمة",
  addTaskBelow: "أضف مهمة أدناه",
  auto: "تلقائي",
  autoSchedule: "جدولة تلقائية",
  availability: "من المشغول",
  availabilityBusy: "مشغول",
  availabilityChecking: "جارٍ التحقق…",
  availabilityConnectInAccount: "اربط تقويمًا من إعدادات حسابك",
  availabilityFree: "متفرّغ",
  availabilityNoCalendar: "لا يوجد تقويم مرتبط بحسابك، فلا شيء لمشاركته بعد.",
  availabilityNoCalendarConnected: "لا تقويم مرتبط",
  availabilityNobodyAssigned: "لم يُسنَد أحد إلى هذه الخطة بعد.",
  availabilityNotShared: "غير مُشارَك",
  availabilityOutsideWindow: "لم يُفحص",
  availabilityShareFailed: "تعذّر حفظ هذا. حاول مرة أخرى.",
  availabilityShareHint: "يرى الزملاء متى تكون مشغولًا — لا ماذا تفعل ولا أين ولا مع مَن.",
  availabilityShareLabel: "اسمح لزملائي في هذا الاستوديو برؤية أوقات انشغالي",
  availabilityShareUnreadable: "تعذّرت قراءة إعداد المشاركة، فلا يمكن تغييره هنا الآن.",
  availabilityUnavailable: "تعذّر التحقق",
  byAssignee: "المسؤول",
  byPhase: "المرحلة",
  byPriority: "الأولوية",
  byStatus: "الحالة",
  calendarDaysWord: "يومًا تقويميًا",
  cancel: "إلغاء",
  choosePreset: "اختر إعدادًا جاهزًا",
  clearAll: "امسح الكل",
  colAssignee: "المسؤول",
  colDuration: "المدة",
  colEffort: "الجهد (س)",
  colEnd: "النهاية",
  colPredecessors: "السوابق",
  colPriority: "الأولوية",
  colProgress: "٪ الإنجاز",
  colStart: "البداية",
  colStatus: "الحالة",
  colTaskName: "اسم المهمة",
  colWbs: "الترقيم",
  issueMissingPredecessor: "لم تعد إحدى السوابق موجودة",
  nCalendarDays: (n) =>
    n === 1 ? "يوم تقويمي واحد"
    : n === 2 ? "يومان تقويميان"
    : n <= 10 ? `${n} أيام تقويمية`
    : `${n} يومًا تقويميًا`,
  nTasks: (n) =>
    n === 1 ? "مهمة واحدة"
    : n === 2 ? "مهمتان"
    : n <= 10 ? `${n} مهام`
    : `${n} مهمة`,
  nMilestones: (n) =>
    n === 1 ? "معلم واحد"
    : n === 2 ? "معلمان"
    : n <= 10 ? `${n} معالم`
    : `${n} معلمًا`,
  nSchedulingIssues: (n) =>
    n === 1 ? "مشكلة جدولة واحدة"
    : n === 2 ? "مشكلتا جدولة"
    : n <= 10 ? `${n} مشاكل جدولة`
    : `${n} مشكلة جدولة`,
  collapseAllPhases: "اطوِ كل المراحل",
  colorBy: "اللون",
  convertToMilestone: "حوّل إلى معلم",
  convertToTask: "حوّل إلى مهمة",
  critical: "حرجة",
  dayWindow: "نافذة اليوم",
  defaults: "الإعدادات الافتراضية",
  delete: "حذف",
  deleteNamed: (what) => `حذف ${what}`,
  assign: "إسناد إلى",
  assignee: "المُسنَد إليه",
  calculatedFromStart: "محسوب من البداية + المدة على وقت العمل",
  calculatedFromStart2: "محسوب من البداية + المدة على وقت العمل",
  close: "إغلاق",
  close2: "إغلاق",
  contextLinksAcceptanceCriteria: "السياق، الروابط، معايير القبول…",
  creating: "جارٍ الإنشاء…",
  criticalPath: "المسار الحرج",
  days: "الأيام",
  defaultColour: "التلوين الافتراضي حسب",
  defaultZoom: "التكبير الافتراضي",
  defaultsCouldNotSaved: "تعذّر حفظ الإعدادات الافتراضية. حاول مرة أخرى.",
  details: "التفاصيل",
  duplicate: "تكرار",
  duration: "المدة",
  edit: "تعديل",
  effortCost: "الجهد / التكلفة",
  end: "النهاية",
  expandAll: "وسّع الكل",
  fields: "الحقول",
  filterTasks: "تصفية المهام",
  fitTasks: "ملاءمة العرض للمهام",
  float: "الفسحة الزمنية",
  fromStudioWorkingHours: "من ساعات عمل الاستوديو — غيّرها في إعدادات الاستوديو.",
  generateWorkBreakdown: "ولّد هيكل عمل من إعداد جاهز، أو أضف صفك الأول وابنِ المخطط من الصفر. والصفوف الفرعية تحوّل الصف الأب إلى قوس تجميعي تلقائيًا.",
  gridColumns: "أعمدة الجدول",
  highlightLongestPathThrough: "إبراز أطول مسار خلال الخطة",
  hold: "معلّقة",
  hours: "الساعات",
  howNewPlanOpens: "كيف تُفتح الخطة الجديدة أول مرة تُعرض فيها. أما أسبوع العمل والأشخاص فيأتيان من الاستوديو نفسه.",
  howNewPlanOpens2: "كيف تُفتح الخطة الجديدة أول مرة تُعرض فيها.",
  indent: "إزاحة للداخل",
  issueCircular: "اعتماد دائري — تُجوهل هذه الصلة",
  issuePinnedTooEarly: "البداية المثبّتة أبكر مما تسمح به سوابقها",
  issueSelfDependency: "لا يمكن أن تعتمد المهمة على نفسها",
  lastChangeNotSaved: "تعذّر حفظ آخر تغيير. تحقّق من اتصالك أو صلاحيتك ثم عدّل مرة أخرى.",
  link: "الربط من",
  links: "الروابط",
  loadingTemplates: "جارٍ تحميل القوالب…",
  new: "جديدة",
  newMilestone: "معلم جديد",
  newPlan: "خطة جديدة",
  newPlanDefaults: "افتراضيات الخطة الجديدة",
  newTask: "مهمة جديدة",
  noDescription: "لا يوجد وصف.",
  noDescription2: "لا يوجد وصف.",
  noDescription3: "لا يوجد وصف.",
  noIncomingLinks: "لا روابط واردة. تبدأ هذه المهمة في تاريخها الخاص.",
  noPlansYet: "لا مخططات بعد",
  noTemplatesYet: "لا توجد قوالب بعد.",
  noTemplatesYetUse: "لا قوالب بعد. استخدم",
  notes: "ملاحظات",
  nothingPlannedYet: "لا شيء مخطط بعد",
  offTrack: "خارج المسار",
  outdent: "إزاحة للخارج",
  permissionChangeTheseDefaults: "لا تملك صلاحية تغيير هذه الإعدادات الافتراضية.",
  phAtRisk: "معرّضة للخطر",
  phOffTrack: "خارج المسار",
  phOnHold: "معلّقة",
  phOnTrack: "على المسار",
  pickTemplateLayout: "اختر قالبًا يُبنى منه هذا المخطط. والقالب يحمل روابط اعتماده الخاصة، فيرسم المخطط جدوله الزمني بنفسه. وتُنشأ القوالب وتُعدَّل في صفحة المخطِّط الرئيسية، لا هنا.",
  pinStartDate: "ثبّت تاريخ البدء",
  pinned: "مثبّت",
  pinnedStart: "بداية مثبتة — تُتجاهل المهام السابقة",
  pinnedStart2: "بداية مثبتة — تُتجاهل المهام السابقة",
  planCouldNotLoad: "تعذّر تحميل هذا المخطط — قد لا تملك الوصول إليه.",
  plans: "المخططات",
  plansCouldNotLoad: "تعذّر تحميل هذه المخططات — قد لا تملك الوصول إلى المخطِّط.",
  plansFromEitherAppear: "فيه. وتظهر مخططات الاثنين هنا.",
  prCritical: "حرجة",
  prHigh: "عالية",
  prLow: "منخفضة",
  prMedium: "متوسطة",
  predecessors: "السوابق",
  presets: "الإعدادات الجاهزة",
  printPlan: "طباعة",
  priority: "الأولوية",
  projectPlan: "خطة المشروع",
  projectSchedules: "جداول المشاريع في هذا الاستوديو",
  quarterPrefix: "ر",
  redo: "إعادة",
  resetToAppDefaults: "أعد الضبط إلى إعدادات التطبيق",
  reusableTaskStructures: "هياكل مهام قابلة لإعادة الاستخدام يبدأ منها المخطط",
  risk: "معرّضة للخطر",
  rolledUpFromSubtasks: "محسوب من المهام الفرعية",
  saveDefaults: "حفظ الإعدادات الافتراضية",
  saving: "جارٍ الحفظ…",
  scheduling: "الجدولة",
  selectRowToEdit: "اختر صفًا لعرض تفاصيله وتعديلها.",
  showDependencyArrows: "إظهار أسهم الاعتماديات",
  stAtRisk: "معرّضة للخطر",
  stBlocked: "متوقفة",
  stComplete: "مكتملة",
  stInProgress: "قيد التنفيذ",
  stNotStarted: "لم تبدأ",
  stOnTrack: "على المسار",
  start: "البداية",
  startFromPreset: "ابدأ من إعداد جاهز…",
  startFromScratch: "ابدأ من الصفر",
  startFromTemplate: "ابدأ من قالب",
  status: "الحالة",
  statusAtRisk: "معرّضة للخطر",
  statusOffTrack: "خارج المسار",
  statusOnHold: "معلّقة",
  statusOnTrack: "على المسار",
  successors: "اللواحق",
  summaryRowBracket: "صف تجميعي (قوس)",
  team: "الفريق",
  templates: "القوالب",
  toBuildOne: "لبناء واحد.",
  toStartExternal: "لبدء جدول خارجي، أو افتح مشروعًا واستخدم إجراء",
  today: "اليوم",
  track: "على المسار",
  trimWaterfallOneDay: "قصّ المخطط إلى يوم واحد على جانبي العمل",
  unassigned: "غير مُسندة",
  undo: "تراجع",
  unnamed: "بلا اسم",
  untitledPlan: "خطة بلا عنوان",
  untitledPlan2: "خطة بلا عنوان",
  untitledProject: "مشروع بلا اسم",
  untitledTemplate: "قالب بلا عنوان",
  untitledTemplate2: "قالب بلا عنوان",
  untitledTemplate3: "قالب بلا عنوان",
  updated: "آخر تحديث",
  use: "استخدم",
  usePlanStart: "استخدم",
  viewDefaults: "عرض الإعدادات الافتراضية",
  viewDefaults2: "عرض الإعدادات الافتراضية",
  viewDefaultsHeading: "الإعدادات الافتراضية للعرض",
  viewGrid: "جدول المعلومات",
  viewOnly: "عرض فقط",
  viewOnlyAccessPlan: "وصولك إلى هذا المخطط للعرض فقط — والتغييرات التي تجريها هنا لا تُحفظ.",
  viewSplit: "مقسّم",
  viewTimeline: "المخطط الزمني",
  weekOf: "أسبوع",
  withSubtasks: " مع مهامها الفرعية",
  workItem: "بند عمل",
  workingDays: "أيام العمل",
  workingHours: "ساعات العمل",
  workingWeek: "أسبوع العمل",
  zoomDays: "أيام",
  zoomHours: "ساعات",
  zoomMonths: "أشهر",
  zoomQuarters: "أرباع",
  zoomWeeks: "أسابيع",
};

const planner = { en, ar };

export function plannerDict(locale: string): Strings {
  return planner[locale as Locale] || planner[defaultLocale];
}

// A SCHEDULING ISSUE ARRIVES AS A CODE. The engine that raises it is pure
// arithmetic over dates and has no locale, so the words are attached here.
// An unknown code renders as itself rather than as nothing — a new issue the
// engine learns to raise should be visible before it is translated.
const ISSUES: Record<string, keyof Strings> = {
  "self-dependency": "issueSelfDependency",
  "circular-dependency": "issueCircular",
  "pinned-too-early": "issuePinnedTooEarly",
  "missing-predecessor": "issueMissingPredecessor",
};

export function plannerIssue(tr: Strings, code: string): string {
  const key = ISSUES[code.split(":")[0]];
  const words = key ? tr[key] : undefined;
  return typeof words === "string" ? words : code;
}

// A VOCABULARY ENTRY ARRIVES AS A KEY. Status, priority, zoom and the rest are
// stored ids with a `labelKey` beside them, so the lookup is dynamic — and a
// dynamic index into a typed dictionary is an implicit `any`. Narrowed here, in
// one place, falling back to the key so a missing translation is visible rather
// than blank.
export function plannerWord(tr: Strings, key: string): string {
  const value = (tr as Record<string, unknown>)[key];
  return typeof value === "string" ? value : key;
}
