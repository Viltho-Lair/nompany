import { defaultLocale, type Locale } from "../locale";

// CUSTOMER INSIGHTS' WORDS (19/09/2026) — the screen, its CSV and the leads it
// raises. The rules are modules/sales/insightsModel. Pattern and level tokens
// are what the server returns; the words are chosen here, on display. One
// dictionary per surface, and nothing may enumerate them.

type Strings = {
  title: string;
  sub: string;
  unit: string;
  units: Record<string, string>;
  unitWord: (u: string) => string;
  measure: string;
  measures: Record<string, string>;
  current: string;
  currentOn: string;
  currentOff: string;
  periodLabel: (key: string) => string;
  blocks: [string, string, string];
  level: (n: number) => string;
  bandLine: (low: string, high: string, customers: number) => string;
  bandsTitle: string;
  bandsHint: string;
  pattern: (p: string) => string;
  patternHint: (p: string) => string;
  tilesTitle: string;
  nCustomers: (n: number) => string;
  all: string;
  search: string;
  movedOnly: string;
  colCustomer: string;
  colPattern: string;
  colSignature: string;
  colWas: string;
  colTotalValue: string;
  colTotalCount: string;
  colLastSale: string;
  colContact: string;
  colPhone: string;
  colEmail: string;
  openDeal: string;
  noCustomers: string;
  scatterTitle: string;
  scatterHint: string;
  by: Record<string, string>;
  direct: string;
  nobody: string;
  salesAxis: string;
  valueAxis: string;
  pointLine: (label: string, count: number, value: string) => string;
  noScatter: string;
  customersTitle: string;
  customersHint: string;
  selected: (n: number) => string;
  selectAll: string;
  clear: string;
  send: (n: number) => string;
  sendTitle: string;
  sendSub: string;
  campaign: string;
  campaignNone: string;
  note: string;
  notePlaceholder: string;
  sendGo: string;
  cancel: string;
  sentLine: (raised: number, skipped: number) => string;
  download: string;
  sources: (list: string[]) => string;
  sourceNames: Record<string, string>;
  noSources: string;
  unconverted: (n: number) => string;
  loading: string;
  failed: string;
  more: (n: number) => string;
  leadTitle: (pattern: string, customer: string) => string;
  leadWhy: (pattern: string, signature: string, unit: string) => string;
  leadFigures: (count: number, value: number, currency: string, last: string) => string;
  refuse: Record<string, string>;
};

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** 2026-07 → "Jul 2026"; 2026-Q3 → "Q3 2026"; 2026-H2 → "H2 2026"; 2026 → "2026". */
function periodWith(months: string[], q: string, h: string) {
  return (key: string) => {
    const m = /^(\d{4})(?:-(\d{2})|-Q(\d)|-H(\d))?$/.exec(String(key || ""));
    if (!m) return String(key || "");
    if (m[2]) return `${months[Number(m[2]) - 1]} ${m[1]}`;
    if (m[3]) return `${q}${m[3]} ${m[1]}`;
    if (m[4]) return `${h}${m[4]} ${m[1]}`;
    return m[1];
  };
}

const PATTERNS_EN: Record<string, [string, string]> = {
  loyal: ["Loyal", "Buying well in every block. Keep them close."],
  growing: ["Growing", "Buying more now than at the start. Offer the next step up."],
  steady: ["Steady", "Buying every block, at a low level. Room to grow."],
  fading: ["Fading", "Still buying, but less than at the start. Ask why."],
  slipping: ["Slipping", "Bought in both earlier blocks, nothing now. Call before they go."],
  returning: ["Returning", "Came back after a gap. Welcome them back."],
  lapsed: ["Lapsed", "Only bought at the start. A win-back offer."],
  new: ["New", "First purchases in this window. Make the second one easy."],
  stopped: ["Stopped", "Bought in the middle only, and not since."],
  dormant: ["Dormant", "Bought before this window, nothing in it."],
};
const PATTERNS_AR: Record<string, [string, string]> = {
  loyal: ["وفيّ", "يشتري جيداً في كل فترة. حافظوا عليه."],
  growing: ["متنامٍ", "يشتري الآن أكثر من البداية. اعرضوا عليه الخطوة التالية."],
  steady: ["مستقر", "يشتري في كل فترة بمستوى منخفض. هناك مجال للنمو."],
  fading: ["متراجع", "ما زال يشتري لكن أقل من البداية. اسألوا عن السبب."],
  slipping: ["متباعد", "اشترى في الفترتين السابقتين ولا شيء الآن. تواصلوا قبل أن يغادر."],
  returning: ["عائد", "عاد بعد انقطاع. رحبوا بعودته."],
  lapsed: ["منقطع", "اشترى في البداية فقط. عرض لاستعادته."],
  new: ["جديد", "أول مشترياته في هذه الفترة. سهّلوا عليه الشراء الثاني."],
  stopped: ["متوقف", "اشترى في الفترة الوسطى فقط ولم يشترِ بعدها."],
  dormant: ["خامل", "اشترى قبل هذه الفترة ولا شيء فيها."],
};

const en: Strings = {
  title: "Customer insights",
  sub: "Every customer's buying over seven periods, read as three blocks: the first three, the next three, and now. Each block is zero, low, medium or high against the studio's own customers.",
  unit: "Period",
  units: { month: "Months", quarter: "Quarters", half: "Half-years", year: "Years" },
  unitWord: (u) => ({ month: "months", quarter: "quarters", half: "half-years", year: "years" })[u] || u,
  measure: "Judge by",
  measures: { value: "Value", count: "Number of sales" },
  current: "Last period",
  currentOn: "This period so far",
  currentOff: "Last complete period",
  periodLabel: periodWith(MONTHS_EN, "Q", "H"),
  blocks: ["First three", "Next three", "Now"],
  level: (n) => ["Zero", "Low", "Medium", "High"][n] || "",
  bandLine: (low, high, customers) => `Low under ${low} · Medium ${low} to ${high} · High from ${high} · ${customers} buying`,
  bandsTitle: "What each level means",
  bandsHint: "Thirds of the customers who bought in that block, so the levels move with the studio.",
  pattern: (p) => PATTERNS_EN[p]?.[0] || p,
  patternHint: (p) => PATTERNS_EN[p]?.[1] || "",
  tilesTitle: "Customers by pattern",
  nCustomers: (n) => (n === 1 ? "1 customer" : `${n} customers`),
  all: "All patterns",
  search: "Search customers",
  movedOnly: "Changed pattern since the period before",
  colCustomer: "Customer",
  colPattern: "Pattern",
  colSignature: "Signature",
  colWas: "Was",
  colTotalValue: "Value in window",
  colTotalCount: "Sales in window",
  colLastSale: "Last sale",
  colContact: "Contact",
  colPhone: "Phone",
  colEmail: "Email",
  openDeal: "Deal open",
  noCustomers: "No customer bought anything in this window yet.",
  scatterTitle: "Who is selling",
  scatterHint: "Sales against value across the same seven periods. Won deals and till sales.",
  by: { person: "By person", team: "By team", channel: "By channel" },
  direct: "Direct sales",
  nobody: "Nobody",
  salesAxis: "Sales",
  valueAxis: "Value",
  pointLine: (label, count, value) => `${label}: ${count} sales, ${value}`,
  noScatter: "No sales credited to anybody in this window.",
  customersTitle: "Customers",
  customersHint: "Choose customers to send to Sales as leads, or download the list.",
  selected: (n) => (n === 1 ? "1 chosen" : `${n} chosen`),
  selectAll: "Choose all shown",
  clear: "Clear",
  send: (n) => (n === 1 ? "Send 1 to Sales" : `Send ${n} to Sales`),
  sendTitle: "Send customers to Sales",
  sendSub: "Each becomes a lead waiting to be assigned to a sales executive, saying why it was sent. Customers with a deal already open are skipped.",
  campaign: "Campaign (optional)",
  campaignNone: "— No campaign —",
  note: "What should Sales do?",
  notePlaceholder: "For example: offer 10% on their next order",
  sendGo: "Send",
  cancel: "Cancel",
  sentLine: (raised, skipped) => `${raised === 1 ? "1 lead" : `${raised} leads`} sent to Sales${skipped ? `, ${skipped} skipped` : ""}.`,
  download: "Download CSV",
  sources: (list) => `Built from ${list.join(", ")}.`,
  sourceNames: { invoices: "issued invoices less credit notes", receipts: "till receipts that name a customer", deals: "won deals (who is selling only)" },
  noSources: "Nothing to read: invoicing, the till and Sales tickets are all switched off.",
  unconverted: (n) => `${n} ${n === 1 ? "document is" : "documents are"} left out: today's rates cannot convert their currency.`,
  loading: "Reading the studio's sales…",
  failed: "The analysis could not be loaded.",
  more: (n) => `Show ${n} more`,
  leadTitle: (pattern, customer) => `${customer} — ${pattern}`,
  leadWhy: (pattern, signature, unit) => `Customer insights: ${pattern} (${signature}) over the last seven ${unit}.`,
  leadFigures: (count, value, currency, last) => `${count} sales worth ${value}${currency ? ` ${currency}` : ""}${last ? `, last on ${last}` : ""}.`,
  refuse: {
    "insights-none": "Choose at least one customer.",
    "insights-too-many": "Send at most 100 customers at a time.",
    "no-sales": "Sales tickets are switched off.",
    campaign: "That campaign is no longer open.",
    forbidden: "You do not have access to do this.",
  },
};

const ar: Strings = {
  title: "تحليلات العملاء",
  sub: "مشتريات كل عميل على سبع فترات، مقسمة إلى ثلاث كتل: الثلاث الأولى، والثلاث التالية، والآن. تقاس كل كتلة بصفر أو منخفض أو متوسط أو مرتفع مقارنة بعملاء المنشأة أنفسهم.",
  unit: "الفترة",
  units: { month: "أشهر", quarter: "أرباع سنة", half: "أنصاف سنة", year: "سنوات" },
  unitWord: (u) => ({ month: "أشهر", quarter: "أرباع سنة", half: "أنصاف سنة", year: "سنوات" })[u] || u,
  measure: "القياس حسب",
  measures: { value: "القيمة", count: "عدد المبيعات" },
  current: "آخر فترة",
  currentOn: "الفترة الحالية حتى الآن",
  currentOff: "آخر فترة مكتملة",
  periodLabel: periodWith(MONTHS_AR, "ر", "ن"),
  blocks: ["الثلاث الأولى", "الثلاث التالية", "الآن"],
  level: (n) => ["صفر", "منخفض", "متوسط", "مرتفع"][n] || "",
  bandLine: (low, high, customers) => `منخفض أقل من ${low} · متوسط من ${low} إلى ${high} · مرتفع من ${high} · ${customers} يشترون`,
  bandsTitle: "معنى كل مستوى",
  bandsHint: "أثلاث العملاء الذين اشتروا في تلك الكتلة، فتتحرك المستويات مع المنشأة.",
  pattern: (p) => PATTERNS_AR[p]?.[0] || p,
  patternHint: (p) => PATTERNS_AR[p]?.[1] || "",
  tilesTitle: "العملاء حسب النمط",
  nCustomers: (n) => `${n} عميل`,
  all: "كل الأنماط",
  search: "ابحث عن عميل",
  movedOnly: "تغير نمطه منذ الفترة السابقة",
  colCustomer: "العميل",
  colPattern: "النمط",
  colSignature: "التوقيع",
  colWas: "كان",
  colTotalValue: "القيمة في الفترة",
  colTotalCount: "المبيعات في الفترة",
  colLastSale: "آخر عملية بيع",
  colContact: "جهة الاتصال",
  colPhone: "الهاتف",
  colEmail: "البريد الإلكتروني",
  openDeal: "صفقة مفتوحة",
  noCustomers: "لم يشترِ أي عميل شيئاً في هذه الفترة بعد.",
  scatterTitle: "من يبيع",
  scatterHint: "عدد المبيعات مقابل قيمتها على الفترات السبع نفسها. الصفقات الرابحة ومبيعات نقاط البيع.",
  by: { person: "حسب الشخص", team: "حسب الفريق", channel: "حسب القناة" },
  direct: "مبيعات مباشرة",
  nobody: "لا أحد",
  salesAxis: "المبيعات",
  valueAxis: "القيمة",
  pointLine: (label, count, value) => `${label}: ${count} عملية بيع، ${value}`,
  noScatter: "لا مبيعات منسوبة لأحد في هذه الفترة.",
  customersTitle: "العملاء",
  customersHint: "اختاروا عملاء لإرسالهم إلى المبيعات كعملاء محتملين، أو نزّلوا القائمة.",
  selected: (n) => `تم اختيار ${n}`,
  selectAll: "اختيار كل المعروض",
  clear: "مسح",
  send: (n) => `إرسال ${n} إلى المبيعات`,
  sendTitle: "إرسال العملاء إلى المبيعات",
  sendSub: "يصبح كل عميل عميلاً محتملاً بانتظار إسناده إلى مندوب مبيعات، مع سبب إرساله. يتم تخطي العملاء الذين لديهم صفقة مفتوحة.",
  campaign: "الحملة (اختياري)",
  campaignNone: "— بلا حملة —",
  note: "ما المطلوب من المبيعات؟",
  notePlaceholder: "مثلاً: خصم 10% على طلبهم التالي",
  sendGo: "إرسال",
  cancel: "إلغاء",
  sentLine: (raised, skipped) => `تم إرسال ${raised} إلى المبيعات${skipped ? `، وتخطي ${skipped}` : ""}.`,
  download: "تنزيل CSV",
  sources: (list) => `مبني على ${list.join("، ")}.`,
  sourceNames: { invoices: "الفواتير الصادرة بعد خصم الإشعارات الدائنة", receipts: "إيصالات نقاط البيع التي تحمل اسم عميل", deals: "الصفقات الرابحة (لمن يبيع فقط)" },
  noSources: "لا شيء للقراءة: الفوترة ونقاط البيع وتذاكر المبيعات كلها معطلة.",
  unconverted: (n) => `تم استبعاد ${n} من المستندات: لا يمكن تحويل عملتها بأسعار اليوم.`,
  loading: "جارٍ قراءة مبيعات المنشأة…",
  failed: "تعذر تحميل التحليل.",
  more: (n) => `عرض ${n} أخرى`,
  leadTitle: (pattern, customer) => `${customer} — ${pattern}`,
  leadWhy: (pattern, signature, unit) => `تحليلات العملاء: ${pattern} (${signature}) خلال آخر سبع ${unit}.`,
  leadFigures: (count, value, currency, last) => `${count} عملية بيع بقيمة ${value}${currency ? ` ${currency}` : ""}${last ? `، آخرها في ${last}` : ""}.`,
  refuse: {
    "insights-none": "اختاروا عميلاً واحداً على الأقل.",
    "insights-too-many": "أرسلوا 100 عميل كحد أقصى في كل مرة.",
    "no-sales": "تذاكر المبيعات معطلة.",
    campaign: "هذه الحملة لم تعد مفتوحة.",
    forbidden: "لا تملكون صلاحية القيام بذلك.",
  },
};

export function insightsDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
