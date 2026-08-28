import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TASKS — the board, its authority routing and the approvals queue.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessTasksStudio: string;
  adminCanAppoint: string;
  appointSomeoneTaskSettings: string;
  approvedOpenProject: string;
  assign: string;
  authorityIsnPartTask: string;
  blankOrdinaryTaskAssigned: string;
  canMoveTaskTick: string;
  canOnlyChangeTasks: string;
  canOpenProjects: string;
  cancel: string;
  checklist: string;
  createProjectSheet: string;
  createTaskAssignSomeone: string;
  decisionBelongsWhoeverHolds: string;
  delete: string;
  description: string;
  didnGoThrough: string;
  didnSave: string;
  dueDate: string;
  edit: string;
  editTask: string;
  everyKindOfTask: string;
  giveTaskTitle: string;
  kind: string;
  kindFixed: string;
  loadingTasks: string;
  member: string;
  needsYourDecision: string;
  newTask: string;
  noOpenTasks: string;
  nobodyAppointed: string;
  nobodyAppointedAuthorityYet: string;
  nobodyStudioYet: string;
  nothingAssigned: string;
  nothingFinishedYet: string;
  nothingOverdue: string;
  oneAuthoritySigns: string;
  onlyManagerCanChange: string;
  onlyManagerCanCreate: string;
  open: string;
  openProject: string;
  openQuotationBeingDecided: string;
  opening: string;
  overdue: string;
  overdue2: string;
  priority: string;
  project: string;
  projectAlreadyOpenedQuotation: string;
  projectHandler: string;
  projectHandler2: string;
  quotationNotApproved: string;
  raisedOnBoard: string;
  save: string;
  saveTaskSettings: string;
  saved: string;
  saving: string;
  saving2: string;
  task: string;
  taskDecisionSystemRaised: string;
  taskIsnApproval: string;
  taskSettings: string;
  tasks: string;
  tasksAssignedWillAppear: string;
  tasksOnly: string;
  title: string;
  unassigned: string;
  unassigned2: string;
  viewOnlyAccessTask: string;
  whereComes: string;
  whoHandles: string;
};

const en: Strings = {
  ...commonEn,
  accessTasksStudio: "You don't have access to Tasks in this studio.",
  adminCanAppoint: " — an admin can appoint someone in Task settings",
  appointSomeoneTaskSettings: "appoint someone in Task settings",
  approvedOpenProject: "Approved — open the project",
  assign: "Assign to",
  authorityIsnPartTask: "That authority isn't part of this task.",
  blankOrdinaryTaskAssigned: "Blank is an ordinary task — assigned to a person.",
  canMoveTaskTick: "You can move your task and tick its checklist — the rest is the manager's to change.",
  canOnlyChangeTasks: "You can only change tasks assigned to you.",
  canOpenProjects: "You can't open projects.",
  cancel: "Cancel",
  checklist: "Checklist",
  createProjectSheet: "Create project & sheet",
  createTaskAssignSomeone: "Create a task and assign it to someone in this studio.",
  decisionBelongsWhoeverHolds: "That decision belongs to whoever holds that authority.",
  delete: "Delete",
  description: "Description",
  didnGoThrough: "That didn't go through.",
  didnSave: "That didn't save.",
  dueDate: "Due date",
  edit: "Edit",
  editTask: "Edit task",
  everyKindOfTask: "Every kind of task the studio raises, and who decides it. Appointing someone routes the matching tasks to them straight away, existing ones included — assignment is read from here on every load, never copied onto the task, so it can never keep pointing at whoever used to hold the job.",
  giveTaskTitle: "Give the task a title.",
  kind: "Kind",
  kindFixed: "A task's kind is fixed once it exists.",
  loadingTasks: "Loading Tasks…",
  member: "Member",
  needsYourDecision: "Needs your decision",
  newTask: "New task",
  noOpenTasks: "No open tasks",
  nobodyAppointed: "Nobody appointed",
  nobodyAppointedAuthorityYet: "Nobody is appointed to this authority yet",
  nobodyStudioYet: "Nobody in this studio yet",
  nothingAssigned: "Nothing assigned to you",
  nothingFinishedYet: "Nothing finished yet",
  nothingOverdue: "Nothing overdue",
  oneAuthoritySigns: "One authority signs",
  onlyManagerCanChange: "Only a manager can change task settings.",
  onlyManagerCanCreate: "Only a manager can create or assign tasks.",
  open: "Open",
  openProject: "Open the project",
  openQuotationBeingDecided: "Open the quotation being decided",
  opening: "Opening…",
  overdue: "Overdue",
  overdue2: "Overdue",
  priority: "Priority",
  project: "Project",
  projectAlreadyOpenedQuotation: "A project has already been opened from this quotation.",
  projectHandler: "Project handler",
  projectHandler2: "Project handler…",
  quotationNotApproved: "That quotation is not approved.",
  raisedOnBoard: "Raised on the Tasks board.",
  save: "Save",
  saveTaskSettings: "Save task settings",
  saved: "Saved",
  saving: "Saving…",
  saving2: "Saving...",
  task: "task is",
  taskDecisionSystemRaised: "That task is a decision the system raised — it can't be edited or deleted. Withdraw the approval instead.",
  taskIsnApproval: "That task isn't an approval.",
  taskSettings: "Task settings",
  tasks: "tasks are",
  tasksAssignedWillAppear: "Tasks assigned to you will appear here.",
  tasksOnly: "Your tasks only",
  title: "Title",
  unassigned: "Unassigned",
  unassigned2: "Unassigned",
  viewOnlyAccessTask: "You have view-only access to Task settings.",
  whereComes: "Where it comes from",
  whoHandles: "Who handles it",
};

const ar: Strings = {
  ...commonAr,
  accessTasksStudio: "لا تملك صلاحية الوصول إلى المهام في هذا الاستوديو.",
  adminCanAppoint: " — يمكن لمسؤول تعيين شخص من إعدادات المهام",
  appointSomeoneTaskSettings: "عيّن شخصًا من إعدادات المهام",
  approvedOpenProject: "معتمد — افتح المشروع",
  assign: "إسناد إلى",
  authorityIsnPartTask: "هذه السلطة ليست جزءًا من هذه المهمة.",
  blankOrdinaryTaskAssigned: "الفراغ يعني مهمة عادية — مُسنَدة إلى شخص.",
  canMoveTaskTick: "يمكنك تحريك مهمتك وتعليم قائمة التحقق الخاصة بها — أما البقية فتغييرها للمدير.",
  canOnlyChangeTasks: "لا يمكنك تغيير سوى المهام المُسنَدة إليك.",
  canOpenProjects: "لا يمكنك فتح المشاريع.",
  cancel: "إلغاء",
  checklist: "قائمة التحقق",
  createProjectSheet: "إنشاء المشروع والكشف",
  createTaskAssignSomeone: "أنشئ مهمة وأسنِدها إلى شخص في هذا الاستوديو.",
  decisionBelongsWhoeverHolds: "هذا القرار يعود لمن يحمل تلك السلطة.",
  delete: "حذف",
  description: "الوصف",
  didnGoThrough: "لم تتم العملية.",
  didnSave: "لم يُحفظ ذلك.",
  dueDate: "تاريخ الاستحقاق",
  edit: "تعديل",
  editTask: "تعديل المهمة",
  everyKindOfTask: "كل نوع من المهام التي يرفعها الاستوديو، ومن يبتّ فيه. وتعيين شخص يوجّه إليه المهام المطابقة فورًا، بما فيها القائمة — إذ يُقرأ الإسناد من هنا مع كل تحميل، ولا يُنسخ على المهمة، فلا يظل أبدًا مشيرًا إلى من كان يشغل الوظيفة.",
  giveTaskTitle: "أعطِ المهمة عنوانًا.",
  kind: "النوع",
  kindFixed: "يُثبَّت نوع المهمة بمجرد وجودها.",
  loadingTasks: "جارٍ تحميل المهام…",
  member: "عضو",
  needsYourDecision: "تحتاج إلى قرارك",
  newTask: "مهمة جديدة",
  noOpenTasks: "لا توجد مهام مفتوحة",
  nobodyAppointed: "لم يُعيَّن أحد",
  nobodyAppointedAuthorityYet: "لم يُعيَّن أحد لهذه السلطة بعد",
  nobodyStudioYet: "لا أحد في هذا الاستوديو بعد",
  nothingAssigned: "لا شيء مُسنَد إليك",
  nothingFinishedYet: "لم يُنجز شيء بعد",
  nothingOverdue: "لا شيء متأخر",
  oneAuthoritySigns: "سلطة واحدة توقّع",
  onlyManagerCanChange: "لا يمكن تغيير إعدادات المهام إلا لمدير.",
  onlyManagerCanCreate: "لا يمكن إنشاء المهام أو إسنادها إلا لمدير.",
  open: "مفتوحة",
  openProject: "افتح المشروع",
  openQuotationBeingDecided: "افتح عرض السعر قيد البت فيه",
  opening: "جارٍ الفتح…",
  overdue: "متأخرة",
  overdue2: "متأخرة",
  priority: "الأولوية",
  project: "المشروع",
  projectAlreadyOpenedQuotation: "سبق فتح مشروع من عرض السعر هذا.",
  projectHandler: "مسؤول المشروع",
  projectHandler2: "مسؤول المشروع…",
  quotationNotApproved: "عرض السعر هذا غير معتمد.",
  raisedOnBoard: "رُفعت في لوحة المهام.",
  save: "حفظ",
  saveTaskSettings: "حفظ إعدادات المهام",
  saved: "تم الحفظ",
  saving: "جارٍ الحفظ…",
  saving2: "جارٍ الحفظ…",
  task: "المهمة",
  taskDecisionSystemRaised: "هذه المهمة قرار رفعه النظام — لا يمكن تعديلها أو حذفها. اسحب الاعتماد بدلًا من ذلك.",
  taskIsnApproval: "هذه المهمة ليست اعتمادًا.",
  taskSettings: "إعدادات المهام",
  tasks: "مهام",
  tasksAssignedWillAppear: "ستظهر هنا المهام المُسنَدة إليك.",
  tasksOnly: "مهامك فقط",
  title: "العنوان",
  unassigned: "غير مُسندة",
  unassigned2: "غير مُسندة",
  viewOnlyAccessTask: "لديك صلاحية عرض فقط على إعدادات المهام.",
  whereComes: "مصدرها",
  whoHandles: "من يتولاها",
};

const tasks = { en, ar };

export function tasksDict(locale: string): Strings {
  return tasks[locale as Locale] || tasks[defaultLocale];
}
