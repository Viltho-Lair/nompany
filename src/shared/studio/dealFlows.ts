import { defaultLocale, type Locale } from "../locale";

// THE DEAL FLOWS BOARD (05/10/2026) — the studio's own flows, the deals at each
// step and each step's target, on the Deals screen. See the header of ./shell
// for why every surface's dictionary is its own module.

type Strings = {
  tabDeals: string;
  tabFlows: string;
  lead: string;
  loading: string;
  noAccess: string;
  isDefault: string;
  makeDefault: string;
  dealsSummary: (open: number, done: number, cancelled: number) => string;
  step: string;
  atStep: (n: number) => string;
  late: (n: number) => string;
  onTime: (met: number, judged: number) => string;
  hidden: string;
  target: string;
  notMeasured: string;
  within: string;
  daysOf: string;
  opening: string;
  suggestion: (average: number, from: number, suggested: number) => string;
  use: string;
  moveUp: string;
  moveDown: string;
  removeStep: string;
  addStep: string;
  name: string;
  save: string;
  saving: string;
  discard: string;
  addFlow: string;
  addFlowFrom: string;
  newFlowName: string;
  create: string;
  cancel: string;
  removeFlow: string;
  removeFlowConfirm: (name: string) => string;
  scanned: (n: number, capped: boolean) => string;
  unread: (n: number) => string;
  starter: string;
  yours: string;
  refusal: (detail: string) => string;
};

const REFUSALS_EN: Record<string, string> = {
  "in-use": "Deals are walking this flow, so it cannot be removed. Move them to another flow first.",
  "last-flow": "A studio keeps at least one flow — every new deal needs one to start on.",
  "no-steps": "A flow needs at least one step.",
  "repeated-step": "A step appears twice. Each step can be in a flow once.",
  "no-flow": "That flow no longer exists. Reload the page.",
  days: "A target is a whole number of days, from 1 to 3650.",
  from: "A step's clock can start at the deal opening or at an EARLIER step of the same flow.",
  step: "That step is not in this flow.",
};
const REFUSALS_AR: Record<string, string> = {
  "in-use": "هناك صفقات تسير على هذا المسار، فلا يمكن حذفه. انقلها إلى مسار آخر أولًا.",
  "last-flow": "يحتفظ الاستوديو بمسار واحد على الأقل — كل صفقة جديدة تحتاج مسارًا تبدأ عليه.",
  "no-steps": "يحتاج المسار خطوة واحدة على الأقل.",
  "repeated-step": "خطوة مكررة. كل خطوة تظهر في المسار مرة واحدة.",
  "no-flow": "لم يعد هذا المسار موجودًا. أعد تحميل الصفحة.",
  days: "الهدف عدد أيام صحيح من 1 إلى 3650.",
  from: "يبدأ احتساب الخطوة من فتح الصفقة أو من خطوة سابقة في المسار نفسه.",
  step: "هذه الخطوة ليست في هذا المسار.",
};
const refusalOf = (table: Record<string, string>, fallback: string) => (detail: string) => {
  const code = String(detail || "").split(":")[0];
  return table[code] || (detail ? `${fallback} (${detail})` : fallback);
};

const en: Strings = {
  tabDeals: "Deals",
  tabFlows: "Flows",
  lead: "How your deals move, step by step. Change the steps, and give any step a target — your own deals' history suggests one.",
  loading: "Loading…",
  noAccess: "You do not have access to this studio's flows.",
  isDefault: "New deals start here",
  makeDefault: "Start new deals here",
  dealsSummary: (open, done, cancelled) => `${open} open · ${done} done · ${cancelled} called off`,
  step: "Step",
  atStep: (n) => `${n} here`,
  late: (n) => `${n} late`,
  onTime: (met, judged) => `${met} of ${judged} on time`,
  hidden: "Not yours to see",
  target: "Target",
  notMeasured: "Not measured",
  within: "Within",
  daysOf: "days of",
  opening: "the deal opening",
  suggestion: (average, from, suggested) => `Your last ${from} deals took ${average} days on average — set ${suggested}?`,
  use: "Use",
  moveUp: "Move up",
  moveDown: "Move down",
  removeStep: "Remove step",
  addStep: "Add a step",
  name: "Name",
  save: "Save",
  saving: "Saving…",
  discard: "Discard changes",
  addFlow: "Add a flow",
  addFlowFrom: "Start from",
  newFlowName: "Name of the new flow",
  create: "Create",
  cancel: "Cancel",
  removeFlow: "Remove flow",
  removeFlowConfirm: (name) => `Remove “${name}”? Deals cannot be walking it.`,
  scanned: (n, capped) => (capped ? `From your newest ${n} deals.` : `From ${n} deals.`),
  unread: (n) => `${n} not yet counted — they are counted the next time each is opened, or overnight.`,
  starter: "Starter",
  yours: "Your flows",
  refusal: refusalOf(REFUSALS_EN, "That did not go through."),
};

const ar: Strings = {
  tabDeals: "الصفقات",
  tabFlows: "المسارات",
  lead: "كيف تتقدم صفقاتك خطوة بخطوة. غيّر الخطوات، وضع لأي خطوة هدفًا — يقترحه سجل صفقاتك.",
  loading: "جار التحميل…",
  noAccess: "لا تملك صلاحية الوصول إلى مسارات هذا الاستوديو.",
  isDefault: "تبدأ الصفقات الجديدة هنا",
  makeDefault: "ابدأ الصفقات الجديدة هنا",
  dealsSummary: (open, done, cancelled) => `${open} مفتوحة · ${done} منجزة · ${cancelled} ملغاة`,
  step: "الخطوة",
  atStep: (n) => `${n} هنا`,
  late: (n) => `${n} متأخرة`,
  onTime: (met, judged) => `${met} من ${judged} في الوقت`,
  hidden: "ليست ضمن صلاحياتك",
  target: "الهدف",
  notMeasured: "غير مقيسة",
  within: "خلال",
  daysOf: "يومًا من",
  opening: "فتح الصفقة",
  suggestion: (average, from, suggested) => `استغرقت آخر ${from} صفقات ${average} يومًا في المتوسط — هل تضع ${suggested}؟`,
  use: "استخدم",
  moveUp: "إلى الأعلى",
  moveDown: "إلى الأسفل",
  removeStep: "احذف الخطوة",
  addStep: "أضف خطوة",
  name: "الاسم",
  save: "حفظ",
  saving: "جار الحفظ…",
  discard: "تجاهل التغييرات",
  addFlow: "أضف مسارًا",
  addFlowFrom: "ابدأ من",
  newFlowName: "اسم المسار الجديد",
  create: "إنشاء",
  cancel: "إلغاء",
  removeFlow: "احذف المسار",
  removeFlowConfirm: (name) => `حذف «${name}»؟ يجب ألا تسير عليه أي صفقة.`,
  scanned: (n, capped) => (capped ? `من أحدث ${n} صفقة.` : `من ${n} صفقة.`),
  unread: (n) => `${n} لم تُحتسب بعد — تُحتسب عند فتح كل منها، أو خلال الليل.`,
  starter: "قالب",
  yours: "مساراتك",
  refusal: refusalOf(REFUSALS_AR, "لم تتم العملية."),
};

const dealFlows = { en, ar };

export function dealFlowsDict(locale: string): Strings {
  return dealFlows[locale as Locale] || dealFlows[defaultLocale];
}
