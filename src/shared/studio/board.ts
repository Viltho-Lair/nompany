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
  clearBoard: string;
  clearBoardRemovesAll: string;
  clearSearch: string;
  column: string;
  columnOptions: string;
  dangerZone: string;
  deleteSubtask: string;
  description: string;
  doubleClickRename: string;
  moveDown: string;
  moveUp: string;
  priority: string;
  searchCards: string;
  subtasks: string;
  tags: string;
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
  clearBoard: "Clear board",
  clearBoardRemovesAll: "Clear the board (removes all cards)",
  clearSearch: "Clear search",
  column: "Column",
  columnOptions: "Column options",
  dangerZone: "Danger zone",
  deleteSubtask: "Delete subtask",
  description: "Description",
  doubleClickRename: "Double-click to rename",
  moveDown: "Move down",
  moveUp: "Move up",
  priority: "Priority",
  searchCards: "Search cards…",
  subtasks: "Subtasks",
  tags: "Tags",
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
  clearBoard: "إفراغ اللوحة",
  clearBoardRemovesAll: "إفراغ اللوحة (يزيل كل البطاقات)",
  clearSearch: "مسح البحث",
  column: "العمود",
  columnOptions: "خيارات العمود",
  dangerZone: "منطقة الخطر",
  deleteSubtask: "حذف المهمة الفرعية",
  description: "الوصف",
  doubleClickRename: "انقر نقرًا مزدوجًا لإعادة التسمية",
  moveDown: "تحريك لأسفل",
  moveUp: "تحريك لأعلى",
  priority: "الأولوية",
  searchCards: "ابحث في البطاقات…",
  subtasks: "المهام الفرعية",
  tags: "الوسوم",
  taskTitle: "عنوان المهمة",
  whatNeedsHappenHow: "ما الذي يجب أن يحدث، وكيف سنعرف أنه اكتمل؟",
};

const board = { en, ar };

export function boardDict(locale: string): Strings {
  return board[locale as Locale] || board[defaultLocale];
}
