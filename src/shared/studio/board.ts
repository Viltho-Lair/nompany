import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE KANBAN BOARD — columns, cards, subtasks and the task dialog.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  addSubtask: string;
  addSubtaskPressEnter: string;
  addTask: string;
  allPriorities: string;
  assignees: string;
  cancel: string;
  changesSavedType: string;
  clearBoard: string;
  clearBoardRemovesAll: string;
  clearSearch: string;
  column: string;
  columnOptions: string;
  createTask: string;
  dangerZone: string;
  deleteSubtask: string;
  description: string;
  done: string;
  doubleClickRename: string;
  dropCardHereClick: string;
  editTask: string;
  fillDetailsNewTask: string;
  hasDescription: string;
  moveDown: string;
  moveUp: string;
  noCardsMatchCurrent: string;
  priority: string;
  searchCards: string;
  subtasks: string;
  tags: string;
  taskOptions: string;
  taskTitle: string;
  whatNeedsHappenHow: string;
};

const en: Strings = {
  ...commonEn,
  addSubtask: "Add subtask",
  addSubtaskPressEnter: "Add a subtask and press Enter",
  addTask: "Add task",
  allPriorities: "All priorities",
  assignees: "Assignees",
  cancel: "Cancel",
  changesSavedType: "Changes are saved as you type.",
  clearBoard: "Clear board",
  clearBoardRemovesAll: "Clear the board (removes all cards)",
  clearSearch: "Clear search",
  column: "Column",
  columnOptions: "Column options",
  createTask: "Create task",
  dangerZone: "Danger zone",
  deleteSubtask: "Delete subtask",
  description: "Description",
  done: "Done",
  doubleClickRename: "Double-click to rename",
  dropCardHereClick: "Drop a card here or click to add",
  editTask: "Edit task",
  fillDetailsNewTask: "Fill in the details for a new task.",
  hasDescription: "Has a description",
  moveDown: "Move down",
  moveUp: "Move up",
  noCardsMatchCurrent: "No cards match the current filter",
  priority: "Priority",
  searchCards: "Search cards…",
  subtasks: "Subtasks",
  tags: "Tags",
  taskOptions: "Task options",
  taskTitle: "Task title",
  whatNeedsHappenHow: "What needs to happen, and how will we know it's done?",
};

const ar: Strings = {
  ...commonAr,
  addSubtask: "إضافة مهمة فرعية",
  addSubtaskPressEnter: "أضف مهمة فرعية ثم اضغط Enter",
  addTask: "إضافة مهمة",
  allPriorities: "كل الأولويات",
  assignees: "المُسنَد إليهم",
  cancel: "إلغاء",
  changesSavedType: "تُحفظ التغييرات أثناء الكتابة.",
  clearBoard: "إفراغ اللوحة",
  clearBoardRemovesAll: "إفراغ اللوحة (يزيل كل البطاقات)",
  clearSearch: "مسح البحث",
  column: "العمود",
  columnOptions: "خيارات العمود",
  createTask: "إنشاء مهمة",
  dangerZone: "منطقة الخطر",
  deleteSubtask: "حذف المهمة الفرعية",
  description: "الوصف",
  done: "تم",
  doubleClickRename: "انقر نقرًا مزدوجًا لإعادة التسمية",
  dropCardHereClick: "أفلت بطاقة هنا أو انقر للإضافة",
  editTask: "تعديل المهمة",
  fillDetailsNewTask: "أدخل تفاصيل المهمة الجديدة.",
  hasDescription: "له وصف",
  moveDown: "تحريك لأسفل",
  moveUp: "تحريك لأعلى",
  noCardsMatchCurrent: "لا توجد بطاقات تطابق التصفية الحالية",
  priority: "الأولوية",
  searchCards: "ابحث في البطاقات…",
  subtasks: "المهام الفرعية",
  tags: "الوسوم",
  taskOptions: "خيارات المهمة",
  taskTitle: "عنوان المهمة",
  whatNeedsHappenHow: "ما الذي يجب أن يحدث، وكيف سنعرف أنه اكتمل؟",
};

const board = { en, ar };

export function boardDict(locale: string): Strings {
  return board[locale as Locale] || board[defaultLocale];
}
