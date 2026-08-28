import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TASKS — the board, its authority routing and the approvals queue.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessTasksStudio: string;
  appointSomeoneTaskSettings: string;
  approvedOpenProject: string;
  assign: string;
  cancel: string;
  checklist: string;
  delete: string;
  description: string;
  dueDate: string;
  edit: string;
  kind: string;
  loadingTasks: string;
  newTask: string;
  onlyManagerCanChange: string;
  openProject: string;
  openQuotationBeingDecided: string;
  overdue: string;
  priority: string;
  project: string;
  projectHandler: string;
  projectHandler2: string;
  saved: string;
  taskSettings: string;
  tasksOnly: string;
  title: string;
  unassigned: string;
  viewOnlyAccessTask: string;
  whereComes: string;
  whoHandles: string;
};

const en: Strings = {
  ...commonEn,
  accessTasksStudio: "You don't have access to Tasks in this studio.",
  appointSomeoneTaskSettings: "appoint someone in Task settings",
  approvedOpenProject: "Approved — open the project",
  assign: "Assign to",
  cancel: "Cancel",
  checklist: "Checklist",
  delete: "Delete",
  description: "Description",
  dueDate: "Due date",
  edit: "Edit",
  kind: "Kind",
  loadingTasks: "Loading Tasks…",
  newTask: "New task",
  onlyManagerCanChange: "Only a manager can change task settings.",
  openProject: "Open the project",
  openQuotationBeingDecided: "Open the quotation being decided",
  overdue: "Overdue",
  priority: "Priority",
  project: "Project",
  projectHandler: "Project handler",
  projectHandler2: "Project handler…",
  saved: "Saved",
  taskSettings: "Task settings",
  tasksOnly: "Your tasks only",
  title: "Title",
  unassigned: "Unassigned",
  viewOnlyAccessTask: "You have view-only access to Task settings.",
  whereComes: "Where it comes from",
  whoHandles: "Who handles it",
};

const ar: Strings = {
  ...commonAr,
  accessTasksStudio: "لا تملك صلاحية الوصول إلى المهام في هذا الاستوديو.",
  appointSomeoneTaskSettings: "عيّن شخصًا من إعدادات المهام",
  approvedOpenProject: "معتمد — افتح المشروع",
  assign: "إسناد إلى",
  cancel: "إلغاء",
  checklist: "قائمة التحقق",
  delete: "حذف",
  description: "الوصف",
  dueDate: "تاريخ الاستحقاق",
  edit: "تعديل",
  kind: "النوع",
  loadingTasks: "جارٍ تحميل المهام…",
  newTask: "مهمة جديدة",
  onlyManagerCanChange: "لا يمكن تغيير إعدادات المهام إلا لمدير.",
  openProject: "افتح المشروع",
  openQuotationBeingDecided: "افتح عرض السعر قيد البت فيه",
  overdue: "متأخرة",
  priority: "الأولوية",
  project: "المشروع",
  projectHandler: "مسؤول المشروع",
  projectHandler2: "مسؤول المشروع…",
  saved: "تم الحفظ",
  taskSettings: "إعدادات المهام",
  tasksOnly: "مهامك فقط",
  title: "العنوان",
  unassigned: "غير مُسندة",
  viewOnlyAccessTask: "لديك صلاحية عرض فقط على إعدادات المهام.",
  whereComes: "مصدرها",
  whoHandles: "من يتولاها",
};

const tasks = { en, ar };

export function tasksDict(locale: string): Strings {
  return tasks[locale as Locale] || tasks[defaultLocale];
}
