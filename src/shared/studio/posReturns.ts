import { defaultLocale, type Locale } from "../locale";

// THE RETURNS SCREEN'S WORDS (Point of Sale → Returns, 18/09/2026). Its own
// module, for the reason ./shell's header gives: one dictionary per surface.
// Item names and reasons somebody typed are data and are shown as typed.

type Strings = {
  loading: string;
  refused: string;
  take: string;
  takeLead: string;
  find: string;
  findLabel: string;
  notFound: (n: string) => string;
  sale: (n: string, at: string) => string;
  item: string;
  sold: string;
  returned: string;
  back: string;
  refund: string;
  nothingLeft: string;
  reason: string;
  reasonHint: string;
  method: string;
  cash: string;
  card: string;
  transfer: string;
  credit: string;
  creditHint: string;
  invoiceSale: (n: string, client: string, paid: string) => string;
  noShelf: string;
  reference: string;
  till: string;
  total: string;
  ask: string;
  asking: string;
  asked: (n: string) => string;
  pending: string;
  pendingEmpty: string;
  waiting: string;
  progress: (granted: number, required: number) => string;
  openApprovals: string;
  wentThrough: (n: string) => string;
  recent: string;
  recentEmpty: string;
  against: (n: string) => string;
  askedBy: (who: string) => string;
  decidedBy: (who: string) => string;
  status: (s: string) => string;
  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  loading: "Loading returns…",
  refused: "You do not have the right to see returns.",
  take: "Take a return",
  takeLead: "Scan the barcode on the receipt or the invoice, or type its number. A return waits for its approval before anything is refunded or goes back on the shelf; it is answered on the Approvals page.",
  find: "Find",
  findLabel: "Receipt or invoice number",
  notFound: (n) => `No sale or issued invoice with the number "${n}".`,
  sale: (n, at) => `${n} · ${at}`,
  item: "Item",
  sold: "Sold",
  returned: "Already returned",
  back: "Coming back",
  refund: "Refund",
  nothingLeft: "Everything on this receipt has already been returned or is waiting for approval.",
  reason: "Why is it coming back?",
  reasonHint: "Damaged, wrong item, changed mind… Kept on the return.",
  method: "Refund by",
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
  credit: "Credit the account",
  creditHint: "No money changes hands: a credit note reduces what the client owes. Finance issues it.",
  invoiceSale: (n, client, paid) => `Invoice ${n}${client ? ` · ${client}` : ""} · paid ${paid}`,
  noShelf: "service — refunded only",
  reference: "Reference",
  till: "Paid from the till",
  total: "To refund",
  ask: "Request approval",
  asking: "Sending…",
  asked: (n) => `${n} is waiting for approval.`,
  pending: "Waiting for approval",
  pendingEmpty: "No return is waiting.",
  waiting: "Waiting for approval",
  progress: (g, r) => `${g} of ${r} step${r === 1 ? "" : "s"} approved`,
  openApprovals: "Open in Approvals",
  wentThrough: (n) => `${n} was under every approval limit and went straight through.`,
  recent: "Returns",
  recentEmpty: "No return has been decided yet.",
  against: (n) => `against ${n}`,
  askedBy: (who) => `asked by ${who || "—"}`,
  decidedBy: (who) => `decided by ${who || "—"}`,
  status: (s) => (s === "Approved" ? "Refunded" : s === "Rejected" ? "Turned down" : "Waiting"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "notfound": return "That sale or return no longer exists.";
      case "too-many": return `More than is left to return on that line (${x.remaining ?? 0} left).`;
      case "lines": return "Choose how many of at least one item are coming back.";
      case "reason": return "Say why it is coming back.";
      case "method": return "Choose how the money goes back.";
      case "inactive": return "That till is retired. Choose another.";
      case "no-shift": return "A cash refund comes out of a drawer: open a shift on that till first, or refund by card or transfer.";
      case "not-configured": return "Nobody has been named to approve returns yet. The owner or an Admin names them in Approvals settings.";
      case "no-approver": return "You are the only person who approves returns, so you cannot ask for one yourself. Ask the owner to name somebody else in Approvals settings.";
      case "no-studio-currency": return "Returns have an approval limit, and this studio has not set its own currency to judge it by. The owner sets it in Studio settings.";
      case "unquoted": return "Today's exchange rates do not quote this sale's currency, so it cannot be judged against the approval limit.";
      case "over-paid": return `Only ${x.paid ?? 0} of this invoice was paid, so no more than that can go back as money. Credit the account instead.`;
      case "over-credit": return `The invoice has only ${x.remaining ?? 0} left to credit.`;
      case "already-decided": return "Somebody has already decided that return.";
      case "forbidden": return "You do not have the right to do that.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  loading: "جار تحميل المرتجعات…",
  refused: "لا تملك صلاحية الاطلاع على المرتجعات.",
  take: "استلام مرتجع",
  takeLead: "امسح الباركود على الإيصال أو الفاتورة أو اكتب رقمها. ينتظر المرتجع اعتماده قبل صرف أي مبلغ أو إعادة أي صنف إلى الرف، ويجاب عليه في صفحة الموافقات.",
  find: "بحث",
  findLabel: "رقم الإيصال أو الفاتورة",
  notFound: (n) => `لا توجد عملية بيع أو فاتورة صادرة بالرقم "${n}".`,
  sale: (n, at) => `${n} · ${at}`,
  item: "الصنف",
  sold: "المباع",
  returned: "أرجع سابقا",
  back: "العائد",
  refund: "المبلغ المسترد",
  nothingLeft: "كل ما في هذا الإيصال أرجع أو ينتظر الاعتماد.",
  reason: "سبب الإرجاع",
  reasonHint: "تالف، صنف خاطئ، غير رأيه… يحفظ مع المرتجع.",
  method: "طريقة الاسترداد",
  cash: "نقدا",
  card: "بطاقة",
  transfer: "تحويل",
  credit: "قيد في حساب العميل",
  creditHint: "لا يدفع أي مبلغ: إشعار دائن يخفض ما على العميل. تصدره المالية.",
  invoiceSale: (n, client, paid) => `فاتورة ${n}${client ? ` · ${client}` : ""} · المدفوع ${paid}`,
  noShelf: "خدمة — تسترد قيمتها فقط",
  reference: "المرجع",
  till: "يصرف من الصندوق",
  total: "المبلغ المسترد",
  ask: "طلب الاعتماد",
  asking: "جار الإرسال…",
  asked: (n) => `${n} بانتظار الاعتماد.`,
  pending: "بانتظار الاعتماد",
  pendingEmpty: "لا يوجد مرتجع بانتظار الاعتماد.",
  waiting: "بانتظار الاعتماد",
  progress: (g, r) => `اعتمدت ${g} من ${r} مراحل`,
  openApprovals: "فتح في الموافقات",
  wentThrough: (n) => `${n} دون كل حدود الاعتماد فنفذ مباشرة.`,
  recent: "المرتجعات",
  recentEmpty: "لم يبت في أي مرتجع بعد.",
  against: (n) => `على ${n}`,
  askedBy: (who) => `طلبه ${who || "—"}`,
  decidedBy: (who) => `بت فيه ${who || "—"}`,
  status: (s) => (s === "Approved" ? "مسترد" : s === "Rejected" ? "مرفوض" : "بالانتظار"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "notfound": return "عملية البيع أو المرتجع لم يعد موجودا.";
      case "too-many": return `أكثر مما تبقى للإرجاع في هذا السطر (المتبقي ${x.remaining ?? 0}).`;
      case "lines": return "اختر كمية صنف واحد على الأقل.";
      case "reason": return "اذكر سبب الإرجاع.";
      case "method": return "اختر طريقة الاسترداد.";
      case "inactive": return "هذا الصندوق موقوف. اختر غيره.";
      case "no-shift": return "الاسترداد النقدي يخرج من درج: افتح وردية على هذا الصندوق أولا، أو استرد بالبطاقة أو التحويل.";
      case "not-configured": return "لم يحدد أحد لاعتماد المرتجعات بعد. يحددهم المالك أو المشرف في إعدادات الموافقات.";
      case "no-approver": return "أنت الوحيد الذي يعتمد المرتجعات، فلا يمكنك طلب مرتجع بنفسك. اطلب من المالك تحديد شخص آخر في إعدادات الموافقات.";
      case "no-studio-currency": return "للمرتجعات حد اعتماد، ولم تحدد هذه المنشأة عملتها لتقاس به. يحددها المالك في إعدادات المنشأة.";
      case "unquoted": return "أسعار الصرف اليوم لا تشمل عملة هذا البيع، فلا يمكن قياسه بحد الاعتماد.";
      case "over-paid": return `لم يدفع من هذه الفاتورة إلا ${x.paid ?? 0}، فلا يعاد نقدا أكثر من ذلك. قيده في حساب العميل بدلا من ذلك.`;
      case "over-credit": return `لم يتبق للفاتورة إلا ${x.remaining ?? 0} يمكن قيده دائنا.`;
      case "already-decided": return "بت أحدهم في هذا المرتجع بالفعل.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function posReturnsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
