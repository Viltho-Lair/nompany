import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PLANNER — plans, the WBS, templates and presets.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
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
  duration: string;
  effortCost: string;
  end: string;
  filterTasks: string;
  fitTasks: string;
  float: string;
  gridColumns: string;
  highlightLongestPathThrough: string;
  hold: string;
  hours: string;
  howNewPlanOpens: string;
  howNewPlanOpens2: string;
  link: string;
  links: string;
  loadingTemplates: string;
  new: string;
  newPlan: string;
  newPlanDefaults: string;
  noDescription: string;
  noDescription2: string;
  noDescription3: string;
  noTemplatesYet: string;
  notes: string;
  offTrack: string;
  permissionChangeTheseDefaults: string;
  pinnedStart: string;
  pinnedStart2: string;
  priority: string;
  projectPlan: string;
  redo: string;
  risk: string;
  saveDefaults: string;
  saving: string;
  scheduling: string;
  showDependencyArrows: string;
  start: string;
  status: string;
  statusAtRisk: string;
  statusOffTrack: string;
  statusOnHold: string;
  statusOnTrack: string;
  team: string;
  today: string;
  track: string;
  trimWaterfallOneDay: string;
  unassigned: string;
  undo: string;
  unnamed: string;
  untitledPlan: string;
  untitledPlan2: string;
  untitledTemplate: string;
  untitledTemplate2: string;
  untitledTemplate3: string;
  updated: string;
  viewDefaults: string;
  viewDefaults2: string;
  viewDefaultsHeading: string;
};

const en: Strings = {
  ...commonEn,
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
  duration: "Duration",
  effortCost: "Effort / cost",
  end: "End",
  filterTasks: "Filter tasks",
  fitTasks: "Fit to tasks",
  float: "Float",
  gridColumns: "Grid columns",
  highlightLongestPathThrough: "Highlight the longest path through the plan",
  hold: "On hold",
  hours: "Hours",
  howNewPlanOpens: "How a new plan opens the first time it is viewed. Its working week and people come from the studio itself.",
  howNewPlanOpens2: "How a new plan opens the first time it is viewed.",
  link: "Link from",
  links: "Links",
  loadingTemplates: "Loading templates…",
  new: "New",
  newPlan: "New plan",
  newPlanDefaults: "New-plan defaults",
  noDescription: "No description.",
  noDescription2: "No description.",
  noDescription3: "No description.",
  noTemplatesYet: "No templates yet.",
  notes: "Notes",
  offTrack: "Off track",
  permissionChangeTheseDefaults: "You don't have permission to change these defaults.",
  pinnedStart: "Pinned start — predecessors are ignored",
  pinnedStart2: "Pinned start - predecessors are ignored",
  priority: "Priority",
  projectPlan: "Project plan",
  redo: "Redo",
  risk: "At risk",
  saveDefaults: "Save defaults",
  saving: "Saving…",
  scheduling: "Scheduling",
  showDependencyArrows: "Show dependency arrows",
  start: "Start",
  status: "Status",
  statusAtRisk: "At risk",
  statusOffTrack: "Off track",
  statusOnHold: "On hold",
  statusOnTrack: "On track",
  team: "Team",
  today: "Today",
  track: "On track",
  trimWaterfallOneDay: "Trim the waterfall to one day either side of the work",
  unassigned: "Unassigned",
  undo: "Undo",
  unnamed: "Unnamed",
  untitledPlan: "Untitled plan",
  untitledPlan2: "Untitled plan",
  untitledTemplate: "Untitled template",
  untitledTemplate2: "Untitled template",
  untitledTemplate3: "Untitled template",
  updated: "Updated",
  viewDefaults: "View defaults",
  viewDefaults2: "View defaults",
  viewDefaultsHeading: "View defaults",
};

const ar: Strings = {
  ...commonAr,
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
  duration: "المدة",
  effortCost: "الجهد / التكلفة",
  end: "النهاية",
  filterTasks: "تصفية المهام",
  fitTasks: "ملاءمة العرض للمهام",
  float: "الفسحة الزمنية",
  gridColumns: "أعمدة الجدول",
  highlightLongestPathThrough: "إبراز أطول مسار خلال الخطة",
  hold: "معلّقة",
  hours: "الساعات",
  howNewPlanOpens: "كيف تُفتح الخطة الجديدة أول مرة تُعرض فيها. أما أسبوع العمل والأشخاص فيأتيان من الاستوديو نفسه.",
  howNewPlanOpens2: "كيف تُفتح الخطة الجديدة أول مرة تُعرض فيها.",
  link: "الربط من",
  links: "الروابط",
  loadingTemplates: "جارٍ تحميل القوالب…",
  new: "جديدة",
  newPlan: "خطة جديدة",
  newPlanDefaults: "افتراضيات الخطة الجديدة",
  noDescription: "لا يوجد وصف.",
  noDescription2: "لا يوجد وصف.",
  noDescription3: "لا يوجد وصف.",
  noTemplatesYet: "لا توجد قوالب بعد.",
  notes: "ملاحظات",
  offTrack: "خارج المسار",
  permissionChangeTheseDefaults: "لا تملك صلاحية تغيير هذه الإعدادات الافتراضية.",
  pinnedStart: "بداية مثبتة — تُتجاهل المهام السابقة",
  pinnedStart2: "بداية مثبتة — تُتجاهل المهام السابقة",
  priority: "الأولوية",
  projectPlan: "خطة المشروع",
  redo: "إعادة",
  risk: "معرّضة للخطر",
  saveDefaults: "حفظ الإعدادات الافتراضية",
  saving: "جارٍ الحفظ…",
  scheduling: "الجدولة",
  showDependencyArrows: "إظهار أسهم الاعتماديات",
  start: "البداية",
  status: "الحالة",
  statusAtRisk: "معرّضة للخطر",
  statusOffTrack: "خارج المسار",
  statusOnHold: "معلّقة",
  statusOnTrack: "على المسار",
  team: "الفريق",
  today: "اليوم",
  track: "على المسار",
  trimWaterfallOneDay: "قصّ المخطط إلى يوم واحد على جانبي العمل",
  unassigned: "غير مُسندة",
  undo: "تراجع",
  unnamed: "بلا اسم",
  untitledPlan: "خطة بلا عنوان",
  untitledPlan2: "خطة بلا عنوان",
  untitledTemplate: "قالب بلا عنوان",
  untitledTemplate2: "قالب بلا عنوان",
  untitledTemplate3: "قالب بلا عنوان",
  updated: "آخر تحديث",
  viewDefaults: "عرض الإعدادات الافتراضية",
  viewDefaults2: "عرض الإعدادات الافتراضية",
  viewDefaultsHeading: "الإعدادات الافتراضية للعرض",
};

const planner = { en, ar };

export function plannerDict(locale: string): Strings {
  return planner[locale as Locale] || planner[defaultLocale];
}
