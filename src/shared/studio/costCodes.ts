import { defaultLocale, type Locale } from "../locale";

// THE COST CODE LIBRARY'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// THE CODES AND THEIR GROUPS ARE NOT TRANSLATED. A code is a handle the studio
// typed and a group is the studio's own vocabulary — the same rule that leaves
// client names, section names and units alone.

type Strings = {
  tab: string;
  lead: string;
  add: string;
  newCode: string;
  editCode: string;
  code: string;
  name: string;
  group: string;
  groupHint: string;
  notes: string;
  retired: string;
  retire: string;
  restore: string;
  edit: string;
  delete: string;
  empty: string;
  emptyBody: string;
  ungrouped: string;
  /** The refusal, with the number of projects that would lose the meaning. */
  inUse: (projects: number) => string;
  driftTitle: string;
  driftLead: string;
  driftNone: string;
  offStandard: (code: string, projects: number) => string;
  unusedTitle: string;
  unusedLead: string;
  inUseCount: (n: number) => string;
  /** Projects' own button, offering the library as a starting breakdown. */
  seedFromLibrary: string;
  seedFromLibraryHint: string;
  noLibrary: string;
};

const en: Strings = {
  tab: "Cost codes",
  // WHAT IT IS FOR, said before somebody types the first one. A library nobody
  // understands the purpose of becomes a second list of the same codes.
  lead: "The breakdown every project starts from. Projects copy these codes, so renaming one here changes what the next project is offered and leaves running jobs exactly as they are.",
  add: "Add cost code",
  newCode: "New cost code",
  editCode: "Edit cost code",
  code: "Code",
  name: "Name",
  group: "Group",
  groupHint: "Your own top level — whatever you already sort costs by.",
  notes: "Notes",
  retired: "retired",
  retire: "Retire",
  restore: "Restore",
  edit: "Edit",
  delete: "Delete",
  empty: "No cost codes yet",
  emptyBody: "Add the codes your projects should share, and every new budget can start from them.",
  ungrouped: "Not grouped",
  // THE VERB AGREES TOO, not only the noun. "1 project already use this code"
  // is what a bare `s` produces, and it was on screen before anybody read it.
  inUse: (projects) => projects === 1
    ? "1 project already uses this code. Retire it instead — it stays readable on that job and disappears from new ones."
    : `${projects} projects already use this code. Retire it instead — it stays readable on those jobs and disappears from new ones.`,
  driftTitle: "Where the projects have drifted",
  driftLead: "Codes the projects use that this library has never heard of. Nothing is wrong with them — a job meets costs nobody anticipated — but a code several projects reached for is one worth adopting.",
  driftNone: "Every code the projects use is in this library.",
  offStandard: (code, projects) =>
    `${code} — on ${projects} project${projects === 1 ? "" : "s"}`,
  unusedTitle: "Not used by any project",
  unusedLead: "Candidates to retire, not a fault.",
  inUseCount: (n) => `${n} code${n === 1 ? "" : "s"} in use across the projects`,
  seedFromLibrary: "Use the studio's cost codes",
  seedFromLibraryHint: "Copies the standard list in with no budgets set.",
  noLibrary: "The studio has no cost code library yet.",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "بنود التكلفة",
  lead: "التقسيم الذي يبدأ منه كل مشروع. المشاريع تنسخ هذه البنود، لذا تغيير اسم بند هنا يغير ما يُعرض على المشروع التالي ولا يمس المشاريع الجارية.",
  add: "إضافة بند تكلفة",
  newCode: "بند تكلفة جديد",
  editCode: "تعديل بند التكلفة",
  code: "الرمز",
  name: "الاسم",
  group: "المجموعة",
  groupHint: "التصنيف الأعلى لديكم — كما تصنفون التكاليف أصلا.",
  notes: "ملاحظات",
  retired: "متوقف",
  retire: "إيقاف",
  restore: "إعادة",
  edit: "تعديل",
  delete: "حذف",
  empty: "لا توجد بنود تكلفة بعد",
  emptyBody: "أضيفوا البنود التي تشترك فيها مشاريعكم، ليبدأ منها كل تقدير جديد.",
  ungrouped: "بلا مجموعة",
  inUse: (projects) =>
    `${projects} مشروع يستخدم هذا البند بالفعل. أوقفوه بدل حذفه — يبقى ظاهرا في تلك المشاريع ويختفي عن الجديدة.`,
  driftTitle: "أين ابتعدت المشاريع",
  driftLead: "بنود تستخدمها المشاريع ولا توجد في هذه القائمة. لا خطأ فيها — كل مشروع يواجه تكاليف لم تكن متوقعة — لكن بندا لجأت إليه عدة مشاريع يستحق الاعتماد.",
  driftNone: "كل بند تستخدمه المشاريع موجود في هذه القائمة.",
  offStandard: (code, projects) => `${code} — في ${projects} مشروع`,
  unusedTitle: "لا يستخدمه أي مشروع",
  unusedLead: "مرشح للإيقاف، وليس خطأ.",
  inUseCount: (n) => `${n} بند مستخدم في المشاريع`,
  seedFromLibrary: "استخدام بنود الشركة",
  seedFromLibraryHint: "ينسخ القائمة المعتمدة بدون مبالغ.",
  noLibrary: "لا توجد قائمة بنود تكلفة لدى الشركة بعد.",
};

const dict = { en, ar };

export const costCodesDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
