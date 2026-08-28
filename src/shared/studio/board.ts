import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE KANBAN BOARD — columns, cards, subtasks and the task dialog.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  acAmber: string;
  acEmerald: string;
  acRose: string;
  acSky: string;
  acSlate: string;
  acViolet: string;
  accentColour: string;
  addACard: string;
  addSubtask: string;
  addSubtaskPressEnter: string;
  addTags: string;
  addTask: string;
  allPriorities: string;
  assignees: string;
  byPriority: string;
  cancel: string;
  changesSavedType: string;
  clearAllCards: string;
  clearBoard: string;
  clearBoardRemovesAll: string;
  clearSearch: string;
  close3: string;
  column: string;
  columnOptions: string;
  createTask: string;
  dangerZone: string;
  delete: string;
  deleteColumn: string;
  deleteSubtask: string;
  deleteTask: string;
  description: string;
  done: string;
  doubleClickRename: string;
  dropCardHereClick: string;
  duplicate: string;
  duplicateColumn: string;
  editTask: string;
  editTask2: string;
  fillDetailsNewTask: string;
  hasDescription: string;
  hasDescription2: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  newColumn: string;
  newestFirst: string;
  noCardsMatchCurrent: string;
  noSubtasksYet: string;
  prHigh: string;
  prLow: string;
  prMedium: string;
  prUrgent: string;
  priority: string;
  renameColumn: string;
  searchCards: string;
  seedBacklog: string;
  seedBoardName: string;
  seedDone: string;
  seedInProgress: string;
  seedInReview: string;
  sortCards: string;
  subtasks: string;
  tags: string;
  taskOptions: string;
  taskOptions2: string;
  taskTitle: string;
  untitledBoard: string;
  untitledTask: string;
  whatNeedsHappenHow: string;
};

const en: Strings = {
  ...commonEn,
  acAmber: "Amber",
  acEmerald: "Emerald",
  acRose: "Rose",
  acSky: "Sky",
  acSlate: "Slate",
  acViolet: "Violet",
  accentColour: "Accent colour",
  addACard: "Add a card",
  addSubtask: "Add subtask",
  addSubtaskPressEnter: "Add a subtask and press Enter",
  addTags: "Add tags…",
  addTask: "Add task",
  allPriorities: "All priorities",
  assignees: "Assignees",
  byPriority: "By priority",
  cancel: "Cancel",
  changesSavedType: "Changes are saved as you type.",
  clearAllCards: "Clear all cards",
  clearBoard: "Clear board",
  clearBoardRemovesAll: "Clear the board (removes all cards)",
  clearSearch: "Clear search",
  close3: "Close",
  column: "Column",
  columnOptions: "Column options",
  createTask: "Create task",
  dangerZone: "Danger zone",
  delete: "Delete",
  deleteColumn: "Delete column",
  deleteSubtask: "Delete subtask",
  deleteTask: "Delete task",
  description: "Description",
  done: "Done",
  doubleClickRename: "Double-click to rename",
  dropCardHereClick: "Drop a card here or click to add",
  duplicate: "Duplicate",
  duplicateColumn: "Duplicate column",
  editTask: "Edit task",
  editTask2: "Edit task",
  fillDetailsNewTask: "Fill in the details for a new task.",
  hasDescription: "Has a description",
  hasDescription2: "Has a description",
  moveDown: "Move down",
  moveLeft: "Move left",
  moveRight: "Move right",
  moveUp: "Move up",
  newColumn: "New Column",
  newestFirst: "Newest first",
  noCardsMatchCurrent: "No cards match the current filter",
  noSubtasksYet: "No subtasks yet — break this down into steps below.",
  prHigh: "High",
  prLow: "Low",
  prMedium: "Medium",
  prUrgent: "Urgent",
  priority: "Priority",
  renameColumn: "Rename column",
  searchCards: "Search cards…",
  seedBacklog: "Backlog",
  seedBoardName: "Project board",
  seedDone: "Done",
  seedInProgress: "In Progress",
  seedInReview: "In Review",
  sortCards: "Sort cards",
  subtasks: "Subtasks",
  tags: "Tags",
  taskOptions: "Task options",
  taskOptions2: "Task options",
  taskTitle: "Task title",
  untitledBoard: "Untitled board",
  untitledTask: "Untitled task",
  whatNeedsHappenHow: "What needs to happen, and how will we know it's done?",
};

const ar: Strings = {
  ...commonAr,
  acAmber: "كهرماني",
  acEmerald: "زمردي",
  acRose: "وردي",
  acSky: "سماوي",
  acSlate: "رمادي",
  acViolet: "بنفسجي",
  accentColour: "لون التمييز",
  addACard: "أضف بطاقة",
  addSubtask: "إضافة مهمة فرعية",
  addSubtaskPressEnter: "أضف مهمة فرعية ثم اضغط Enter",
  addTags: "أضف وسومًا…",
  addTask: "إضافة مهمة",
  allPriorities: "كل الأولويات",
  assignees: "المُسنَد إليهم",
  byPriority: "حسب الأولوية",
  cancel: "إلغاء",
  changesSavedType: "تُحفظ التغييرات أثناء الكتابة.",
  clearAllCards: "امسح كل البطاقات",
  clearBoard: "إفراغ اللوحة",
  clearBoardRemovesAll: "إفراغ اللوحة (يزيل كل البطاقات)",
  clearSearch: "مسح البحث",
  close3: "إغلاق",
  column: "العمود",
  columnOptions: "خيارات العمود",
  createTask: "إنشاء مهمة",
  dangerZone: "منطقة الخطر",
  delete: "حذف",
  deleteColumn: "احذف العمود",
  deleteSubtask: "حذف المهمة الفرعية",
  deleteTask: "احذف المهمة",
  description: "الوصف",
  done: "تم",
  doubleClickRename: "انقر نقرًا مزدوجًا لإعادة التسمية",
  dropCardHereClick: "أفلت بطاقة هنا أو انقر للإضافة",
  duplicate: "تكرار",
  duplicateColumn: "كرّر العمود",
  editTask: "تعديل المهمة",
  editTask2: "تعديل المهمة",
  fillDetailsNewTask: "أدخل تفاصيل المهمة الجديدة.",
  hasDescription: "له وصف",
  hasDescription2: "له وصف",
  moveDown: "تحريك لأسفل",
  moveLeft: "انقل يسارًا",
  moveRight: "انقل يمينًا",
  moveUp: "تحريك لأعلى",
  newColumn: "عمود جديد",
  newestFirst: "الأحدث أولًا",
  noCardsMatchCurrent: "لا توجد بطاقات تطابق التصفية الحالية",
  noSubtasksYet: "لا مهام فرعية بعد — قسّم هذه إلى خطوات أدناه.",
  prHigh: "عالية",
  prLow: "منخفضة",
  prMedium: "متوسطة",
  prUrgent: "عاجلة",
  priority: "الأولوية",
  renameColumn: "أعد تسمية العمود",
  searchCards: "ابحث في البطاقات…",
  seedBacklog: "قائمة الانتظار",
  seedBoardName: "لوحة المشروع",
  seedDone: "منجز",
  seedInProgress: "قيد التنفيذ",
  seedInReview: "قيد المراجعة",
  sortCards: "رتّب البطاقات",
  subtasks: "المهام الفرعية",
  tags: "الوسوم",
  taskOptions: "خيارات المهمة",
  taskOptions2: "خيارات المهمة",
  taskTitle: "عنوان المهمة",
  untitledBoard: "لوحة بلا اسم",
  untitledTask: "مهمة بلا عنوان",
  whatNeedsHappenHow: "ما الذي يجب أن يحدث، وكيف سنعرف أنه اكتمل؟",
};

const board = { en, ar };

export function boardDict(locale: string): Strings {
  return board[locale as Locale] || board[defaultLocale];
}

// A VOCABULARY ENTRY ARRIVES AS A KEY. Status, priority, zoom and the rest are
// stored ids with a `labelKey` beside them, so the lookup is dynamic — and a
// dynamic index into a typed dictionary is an implicit `any`. Narrowed here, in
// one place, falling back to the key so a missing translation is visible rather
// than blank.
export function boardWord(tr: Strings, key: string): string {
  const value = (tr as Record<string, unknown>)[key];
  return typeof value === "string" ? value : key;
}
