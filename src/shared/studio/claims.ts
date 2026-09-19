import { defaultLocale, type Locale } from "../locale";

// PAYABLES → CLAIMS: expense claims and staff advances. Its own dictionary, per
// ./shell. A status is a stored token translated on display; people's names and
// what they typed are data.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  newClaim: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  addLine: string;
  note: string;
  save: string;
  edit: string;
  cancel: string;
  submit: string;
  withdraw: string;
  remove: string;
  approvalStepsOf: (granted: number, required: number) => string;
  openApprovals: string;
  pay: string;
  from: string;
  defaultBank: string;
  reference: string;
  claimant: string;
  total: string;
  payable: string;
  fromAdvance: string;
  status: (s: string) => string;
  noClaims: string;
  advancesTitle: string;
  advancesLead: string;
  giveAdvance: string;
  person: string;
  holds: string;
  returned: string;
  takeBack: string;
  noAdvances: string;
  mine: string;
  problem: (code: string) => string;
};

const EN_STATUS: Record<string, string> = { Draft: "Draft", Submitted: "Submitted", Approved: "Approved", Rejected: "Rejected", Paid: "Paid" };
const AR_STATUS: Record<string, string> = { Draft: "مسودة", Submitted: "مقدمة", Approved: "معتمدة", Rejected: "مرفوضة", Paid: "مدفوعة" };

const EN_PROBLEM: Record<string, string> = {
  "not-configured": "Nobody has been named to approve expense claims. The owner or an Admin names them in Approvals settings.",
  "no-approver": "You are the only person who approves expense claims, so you cannot submit one yourself. Ask the owner to name somebody else in Approvals settings.",
  "own-advance": "You cannot hand yourself an advance.",
  "not-yours": "Only the person who raised this claim can do that.",
  status: "The claim has moved on since you opened it.",
  amount: "Enter an amount above nought.",
  person: "Choose who receives it.",
  "more-than-held": "That is more than the person still holds of this advance.",
  "bank-account": "That is not a money account.",
  forbidden: "You do not have access to expense claims.",
};
const AR_PROBLEM: Record<string, string> = {
  "not-configured": "لم يحدد أحد لاعتماد مطالبات المصروفات. يحددهم المالك أو المشرف في إعدادات الموافقات.",
  "no-approver": "أنتم الوحيدون الذين يعتمدون مطالبات المصروفات، فلا يمكنكم تقديم مطالبة بأنفسكم. اطلبوا من المالك تحديد شخص آخر في إعدادات الموافقات.",
  "own-advance": "لا يمكنكم صرف سلفة لأنفسكم.",
  "not-yours": "وحده من أنشأ المطالبة يستطيع ذلك.",
  status: "تغيرت حالة المطالبة منذ فتحتموها.",
  amount: "أدخلوا مبلغا أكبر من الصفر.",
  person: "اختاروا المستلم.",
  "more-than-held": "هذا أكثر مما تبقى لدى الشخص من هذه السلفة.",
  "bank-account": "هذا ليس حسابا نقديا.",
  forbidden: "لا تملكون صلاحية على مطالبات المصروفات.",
};

const en: Strings = {
  tab: "Claims",
  title: "Expense claims",
  lead: "Money someone spent for the studio and wants back. Raise it, submit it, and someone else approves it — nobody approves their own. An approved claim first uses up what the person still holds of an advance; the rest is paid from a money account.",
  newClaim: "New claim",
  date: "Date",
  category: "Category",
  description: "What for",
  amount: "Amount",
  addLine: "Add a line",
  note: "Note",
  save: "Save",
  edit: "Edit",
  cancel: "Cancel",
  submit: "Submit",
  withdraw: "Withdraw",
  remove: "Delete",
  approvalStepsOf: (g, r) => `${g} of ${r} approval step${r === 1 ? "" : "s"}`,
  openApprovals: "Open in Approvals",
  pay: "Pay",
  from: "From",
  defaultBank: "Bank (1010)",
  reference: "Claim",
  claimant: "By",
  total: "Total",
  payable: "To pay",
  fromAdvance: "From advance",
  status: (s) => EN_STATUS[s] || s,
  noClaims: "No claims yet.",
  advancesTitle: "Staff advances",
  advancesLead: "Money handed to someone before they spend it. Their approved claims draw it down; what they do not spend they hand back.",
  giveAdvance: "Hand over an advance",
  person: "Person",
  holds: "Still holds",
  returned: "Handed back",
  takeBack: "Take back",
  noAdvances: "No advances.",
  mine: "Mine",
  problem: (c) => EN_PROBLEM[c] || c || "",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "المطالبات",
  title: "مطالبات المصروفات",
  lead: "مال أنفقه أحدهم نيابة عن الاستوديو ويريد استرداده. أنشئوها وقدموها، ويعتمدها شخص آخر — لا يعتمد أحد مطالبته بنفسه. المطالبة المعتمدة تستهلك أولا ما تبقى لدى الشخص من سلفة، والباقي يدفع من حساب نقدي.",
  newClaim: "مطالبة جديدة",
  date: "التاريخ",
  category: "الفئة",
  description: "البيان",
  amount: "المبلغ",
  addLine: "اضافة سطر",
  note: "ملاحظة",
  save: "حفظ",
  edit: "تعديل",
  cancel: "الغاء",
  submit: "تقديم",
  withdraw: "سحب",
  remove: "حذف",
  approvalStepsOf: (g, r) => `${g} من ${r} مراحل اعتماد`,
  openApprovals: "فتح في الموافقات",
  pay: "دفع",
  from: "من حساب",
  defaultBank: "البنك (1010)",
  reference: "المطالبة",
  claimant: "مقدمها",
  total: "الاجمالي",
  payable: "للدفع",
  fromAdvance: "من السلفة",
  status: (s) => AR_STATUS[s] || s,
  noClaims: "لا توجد مطالبات بعد.",
  advancesTitle: "سلف الموظفين",
  advancesLead: "مال يسلم لشخص قبل أن ينفقه. تخصم منه مطالباته المعتمدة، وما لا ينفقه يعيده.",
  giveAdvance: "صرف سلفة",
  person: "الشخص",
  holds: "المتبقي لديه",
  returned: "المعاد",
  takeBack: "استرداد",
  noAdvances: "لا توجد سلف.",
  mine: "مطالباتي",
  problem: (c) => AR_PROBLEM[c] || c || "",
};

const dict = { en, ar };

export function claimsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
