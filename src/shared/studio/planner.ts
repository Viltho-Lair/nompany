import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PLANNER — plans, the WBS, templates and presets.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  assign: string;
  assignee: string;
  contextLinksAcceptanceCriteria: string;
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
  noTemplatesYet: string;
  notes: string;
  offTrack: string;
  priority: string;
  projectPlan: string;
  redo: string;
  risk: string;
  scheduling: string;
  showDependencyArrows: string;
  start: string;
  status: string;
  team: string;
  track: string;
  trimWaterfallOneDay: string;
  unassigned: string;
  undo: string;
  untitledPlan: string;
  updated: string;
};

const en: Strings = {
  ...commonEn,
  assign: "Assign to",
  assignee: "Assignee",
  contextLinksAcceptanceCriteria: "Context, links, acceptance criteria…",
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
  noTemplatesYet: "No templates yet.",
  notes: "Notes",
  offTrack: "Off track",
  priority: "Priority",
  projectPlan: "Project plan",
  redo: "Redo",
  risk: "At risk",
  scheduling: "Scheduling",
  showDependencyArrows: "Show dependency arrows",
  start: "Start",
  status: "Status",
  team: "Team",
  track: "On track",
  trimWaterfallOneDay: "Trim the waterfall to one day either side of the work",
  unassigned: "Unassigned",
  undo: "Undo",
  untitledPlan: "Untitled plan",
  updated: "Updated",
};

const ar: Strings = {
  ...commonAr,
  assign: "إسناد إلى",
  assignee: "المُسنَد إليه",
  contextLinksAcceptanceCriteria: "السياق، الروابط، معايير القبول…",
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
  noTemplatesYet: "لا توجد قوالب بعد.",
  notes: "ملاحظات",
  offTrack: "خارج المسار",
  priority: "الأولوية",
  projectPlan: "خطة المشروع",
  redo: "إعادة",
  risk: "معرّضة للخطر",
  scheduling: "الجدولة",
  showDependencyArrows: "إظهار أسهم الاعتماديات",
  start: "البداية",
  status: "الحالة",
  team: "الفريق",
  track: "على المسار",
  trimWaterfallOneDay: "قصّ المخطط إلى يوم واحد على جانبي العمل",
  unassigned: "غير مُسندة",
  undo: "تراجع",
  untitledPlan: "خطة بلا عنوان",
  updated: "آخر تحديث",
};

const planner = { en, ar };

export function plannerDict(locale: string): Strings {
  return planner[locale as Locale] || planner[defaultLocale];
}
