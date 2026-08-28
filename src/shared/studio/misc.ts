import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE REST OF THE STUDIO — the manual, chat, Nova, the rating prompt and the grid.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  chatUnread: (n: number) => string;
  connectedTo: (who: string) => string;
  accessSalesStudio: string;
  addComment: string;
  askNova: string;
  askNova2: string;
  attachPoDescribeBoth: string;
  attachPoDescribeFinance: string;
  back: string;
  backSales: string;
  backStudio: string;
  cancel: string;
  changeFile: string;
  chatEnded: string;
  chatEnded2: string;
  chatNompany: string;
  chooseFile: string;
  city: string;
  clientBudget: string;
  close: string;
  closeNova: string;
  commentDidnSave: string;
  comments: string;
  confirm: string;
  consumedAllTickets: string;
  contactPerson: string;
  couldNotStartChat: string;
  couldntReachServer: string;
  couldntReachServerNoChange: string;
  country: string;
  deadline: string;
  description: string;
  didnGoThrough: string;
  didnSave: string;
  didnSendTryAgain: string;
  edit: string;
  email: string;
  exInvoicesOverdue: string;
  exRemainingLeave: string;
  exSummariseFinances: string;
  exTaskBoard: string;
  fieldsMarkedRequired: string;
  fileDidnUpload: string;
  fileTooLarge5: string;
  goesWhoeverHoldsManagement: string;
  handTicketTechnicalPricing: string;
  howWouldYouRate: string;
  industry: string;
  lastUpdated: string;
  latest: string;
  leftSuffix: string;
  liveChatNotPart: string;
  loading: string;
  loadingGrid: string;
  loadingTicket: string;
  map: string;
  message: string;
  minimiseChat: string;
  newRfqOutstandingWait: string;
  noFinishedQuotationTicket: string;
  noQuotationRaisedAgainst: string;
  noQuotationTicketYet: string;
  noTicketsYet: string;
  notNow: string;
  nothingHereYet: string;
  nothingSaidYet: string;
  nova: string;
  novaNotInPlan: string;
  novaNotSetUp: string;
  novaScope: string;
  novaThinking: string;
  number: string;
  openMap: string;
  owner: string;
  pause: string;
  poAlreadySubmittedQuotation: string;
  poNumberValueAnything: string;
  post: string;
  quotation: string;
  quotationAlreadySentApproval: string;
  quotationApproved: string;
  quotationApprovedBeforePo: string;
  quotations: string;
  rateNompany: string;
  reference: string;
  requestRfq: string;
  resume: string;
  salesLiveView: string;
  saving: string;
  send: string;
  sendApproval: string;
  sendLatestQuotationAppointed: string;
  sendTicketBackTechnical: string;
  sending: string;
  shownToUsAs: string;
  site: string;
  somethingWentWrong: string;
  startChat: string;
  starting: string;
  status: string;
  studioAssistant: string;
  studioNoTasksSection: string;
  studioNoTasksSection2: string;
  studioNoTechnicalSection: string;
  submitPoFinance: string;
  technicalTicketCanRequest: string;
  technicalTicketQuotationWill: string;
  thankNoted: string;
  ticketAlreadyTechnicalCan: string;
  ticketCreated: string;
  ticketInfo: string;
  ticketNoLongerExists: string;
  ticketNoLongerExists2: string;
  ticketQuotationApprovedNothing: string;
  ticketTimeline: string;
  typeMessage: string;
  urgency: string;
  usuallyReplyFewMinutes: string;
  valueQuoted: string;
  viewOnlyAccessSales: string;
  waitingSomeoneJoin: string;
  whatClientSentFinance: string;
  whatNeedsMyAttention: string;
};

const en: Strings = {
  ...commonEn,
  chatUnread: (n) => `Chat with nompany, ${n} new message${n === 1 ? "" : "s"}`,
  connectedTo: (who) => `Connected · ${who}`,
  accessSalesStudio: "You don't have access to Sales in this studio.",
  addComment: "Add a comment",
  askNova: "Ask Nova",
  askNova2: "Ask Nova…",
  attachPoDescribeBoth: "Attach the PO, describe it, or both — one of the two is needed.",
  attachPoDescribeFinance: "Attach the PO or describe it — Finance can't authorise nothing.",
  back: "Back",
  backSales: "Back to Sales",
  backStudio: "Back to the studio",
  cancel: "Cancel",
  changeFile: "Change file",
  chatEnded: "This chat has ended.",
  chatEnded2: "Chat ended",
  chatNompany: "Chat with nompany",
  chooseFile: "Choose file",
  city: "City",
  clientBudget: "Client budget",
  close: "Close",
  closeNova: "Close Nova",
  commentDidnSave: "That comment didn't save.",
  comments: "Comments",
  confirm: "Confirm",
  consumedAllTickets: "You have consumed all tickets for this month.",
  contactPerson: "Contact person",
  couldNotStartChat: "Could not start the chat.",
  couldntReachServer: "I couldn't reach the server. Try again.",
  couldntReachServerNoChange: "I couldn't reach the server, so nothing was changed.",
  country: "Country",
  deadline: "Deadline",
  description: "Description",
  didnGoThrough: "That didn't go through.",
  didnSave: "That didn't save.",
  didnSendTryAgain: "That didn't send. Try again.",
  edit: "Edit",
  email: "Email",
  exInvoicesOverdue: "Which invoices are overdue?",
  exRemainingLeave: "What's my remaining leave?",
  exSummariseFinances: "Summarise our finances",
  exTaskBoard: "What's on my task board?",
  fieldsMarkedRequired: "Fields marked * are required.",
  fileDidnUpload: "That file didn't upload.",
  fileTooLarge5: "That file is too large — 5 MB is the limit.",
  goesWhoeverHoldsManagement: "Goes to whoever holds Management and Finance in Task settings. Finance issues the project number.",
  handTicketTechnicalPricing: "Hand this ticket to Technical for pricing",
  howWouldYouRate: "How would you rate nompany?",
  industry: "Industry",
  lastUpdated: "Last updated",
  latest: "Latest",
  leftSuffix: "left",
  liveChatNotPart: "Live chat is not part of this studio's package.",
  loading: "Loading…",
  loadingGrid: "Loading",
  loadingTicket: "Loading ticket…",
  map: "Map",
  message: "Message",
  minimiseChat: "Minimise chat",
  newRfqOutstandingWait: "A new RFQ is outstanding — wait for the revised quotation before sending it up.",
  noFinishedQuotationTicket: "There is no finished quotation on this ticket to approve yet.",
  noQuotationRaisedAgainst: "No quotation has been raised against this ticket yet.",
  noQuotationTicketYet: "There is no quotation on this ticket yet.",
  noTicketsYet: "No tickets yet.",
  notNow: "Not now",
  nothingHereYet: "Nothing here yet.",
  nothingSaidYet: "Nothing said yet.",
  nova: "Nova",
  novaNotInPlan: "Nova isn't part of this studio's plan.",
  novaNotSetUp: "Nova isn't set up yet.",
  novaScope: "Ask about your studio's data. Nova only sees what you can.",
  novaThinking: "Nova is thinking…",
  number: "Number",
  openMap: "Open map",
  owner: "Owner",
  pause: "Pause",
  poAlreadySubmittedQuotation: "A PO has already been submitted for this quotation.",
  poNumberValueAnything: "PO number, value, anything Finance needs to authorise it",
  post: "Post",
  quotation: "Quotation",
  quotationAlreadySentApproval: "This quotation has already been sent for approval.",
  quotationApproved: "Quotation approved",
  quotationApprovedBeforePo: "The quotation has to be approved before a PO can be booked against it.",
  quotations: "Quotations",
  rateNompany: "Rate nompany",
  reference: "Reference",
  requestRfq: "Request RFQ",
  resume: "Resume",
  salesLiveView: "Sales — Live view",
  saving: "Saving…",
  send: "Send",
  sendApproval: "Send for Approval",
  sendLatestQuotationAppointed: "Send the latest quotation to the appointed Sales and Management approvers",
  sendTicketBackTechnical: "Send this ticket back to Technical to have the last quotation revised",
  sending: "Sending…",
  shownToUsAs: "You'll be shown to us as",
  site: "Site",
  somethingWentWrong: "Something went wrong — try again.",
  startChat: "Start chat",
  starting: "Starting…",
  status: "Status",
  studioAssistant: "Your studio assistant",
  studioNoTasksSection: "This studio has no Tasks section to send the approval to.",
  studioNoTasksSection2: "This studio has no Tasks section to send the PO to.",
  studioNoTechnicalSection: "This studio has no Technical section to send an RFQ to.",
  submitPoFinance: "Submit PO to Finance",
  technicalTicketCanRequest: "Technical has this ticket. You can request another RFQ once the quotation comes back.",
  technicalTicketQuotationWill: "Technical has this ticket — the quotation will appear here once it is raised.",
  thankNoted: "Thank you — noted.",
  ticketAlreadyTechnicalCan: "That ticket is already with Technical — you can send it again once the quotation comes back.",
  ticketCreated: "Ticket created",
  ticketInfo: "Ticket info",
  ticketNoLongerExists: "That ticket no longer exists.",
  ticketNoLongerExists2: "That ticket no longer exists — reload the page.",
  ticketQuotationApprovedNothing: "This ticket's quotation has been approved — there is nothing left to revise. A change after approval is a new ticket.",
  ticketTimeline: "Ticket timeline",
  typeMessage: "Type a message…",
  urgency: "Urgency",
  usuallyReplyFewMinutes: "We usually reply in a few minutes",
  valueQuoted: "Value Quoted",
  viewOnlyAccessSales: "You have view-only access to Sales.",
  waitingSomeoneJoin: "Waiting for someone to join…",
  whatClientSentFinance: "What the client sent. Finance authorise it and issue the project number the work is billed under.",
  whatNeedsMyAttention: "What needs my attention?",
};

const ar: Strings = {
  ...commonAr,
  chatUnread: (n) => `محادثة مع nompany، ${n === 1 ? "رسالة جديدة واحدة" : n === 2 ? "رسالتان جديدتان" : n <= 10 ? `${n} رسائل جديدة` : `${n} رسالة جديدة`}`,
  connectedTo: (who) => `متصل · ${who}`,
  accessSalesStudio: "لا تملك صلاحية الوصول إلى المبيعات في هذا الاستوديو.",
  addComment: "إضافة تعليق",
  askNova: "اسأل نوفا",
  askNova2: "اسأل نوفا…",
  attachPoDescribeBoth: "أرفق أمر الشراء أو صِفه أو كليهما — أحد الاثنين مطلوب.",
  attachPoDescribeFinance: "أرفق أمر الشراء أو صِفه — لا تستطيع المالية اعتماد لا شيء.",
  back: "رجوع",
  backSales: "العودة إلى المبيعات",
  backStudio: "العودة إلى الاستوديو",
  cancel: "إلغاء",
  changeFile: "تغيير الملف",
  chatEnded: "انتهت هذه المحادثة.",
  chatEnded2: "انتهت المحادثة",
  chatNompany: "تحدّث مع nompany",
  chooseFile: "اختر ملفًا",
  city: "المدينة",
  clientBudget: "ميزانية العميل",
  close: "إغلاق",
  closeNova: "إغلاق نوفا",
  commentDidnSave: "لم يُحفظ ذلك التعليق.",
  comments: "التعليقات",
  confirm: "تأكيد",
  consumedAllTickets: "استهلكت كل تذاكر هذا الشهر.",
  contactPerson: "جهة الاتصال",
  couldNotStartChat: "تعذّر بدء المحادثة.",
  couldntReachServer: "تعذّر الوصول إلى الخادم. حاول مرة أخرى.",
  couldntReachServerNoChange: "تعذّر الوصول إلى الخادم، فلم يتغير شيء.",
  country: "الدولة",
  deadline: "الموعد النهائي",
  description: "الوصف",
  didnGoThrough: "لم تتم العملية.",
  didnSave: "لم يُحفظ ذلك.",
  didnSendTryAgain: "لم يُرسَل ذلك. حاول مرة أخرى.",
  edit: "تعديل",
  email: "البريد الإلكتروني",
  exInvoicesOverdue: "أي الفواتير متأخرة؟",
  exRemainingLeave: "كم تبقّى من إجازتي؟",
  exSummariseFinances: "لخّص وضعنا المالي",
  exTaskBoard: "ما الموجود في لوحة مهامي؟",
  fieldsMarkedRequired: "الحقول المعلَّمة بـ * مطلوبة.",
  fileDidnUpload: "لم يُرفع ذلك الملف.",
  fileTooLarge5: "هذا الملف كبير جدًا — الحد 5 ميجابايت.",
  goesWhoeverHoldsManagement: "يذهب إلى من يحمل صلاحيتي الإدارة والمالية في إعدادات المهام. وتُصدر المالية رقم المشروع.",
  handTicketTechnicalPricing: "سلّم هذه التذكرة إلى القسم الفني للتسعير",
  howWouldYouRate: "كيف تقيّم nompany؟",
  industry: "النشاط",
  lastUpdated: "آخر تحديث",
  latest: "الأحدث",
  leftSuffix: "متبقٍ",
  liveChatNotPart: "المحادثة المباشرة ليست ضمن باقة هذا الاستوديو.",
  loading: "جارٍ التحميل…",
  loadingGrid: "جارٍ التحميل",
  loadingTicket: "جارٍ تحميل التذكرة…",
  map: "الخريطة",
  message: "الرسالة",
  minimiseChat: "تصغير المحادثة",
  newRfqOutstandingWait: "هناك طلب عرض سعر جديد معلّق — انتظر عرض السعر المُعدَّل قبل رفعه.",
  noFinishedQuotationTicket: "لا يوجد عرض سعر مكتمل على هذه التذكرة لاعتماده بعد.",
  noQuotationRaisedAgainst: "لم يُرفع أي عرض سعر على هذه التذكرة بعد.",
  noQuotationTicketYet: "لا يوجد عرض سعر على هذه التذكرة بعد.",
  noTicketsYet: "لا توجد تذاكر بعد.",
  notNow: "ليس الآن",
  nothingHereYet: "لا شيء هنا بعد.",
  nothingSaidYet: "لم يُقَل شيء بعد.",
  nova: "نوفا",
  novaNotInPlan: "نوفا ليست ضمن باقة هذا الاستوديو.",
  novaNotSetUp: "لم تُهيّأ نوفا بعد.",
  novaScope: "اسأل عن بيانات استوديوك. لا ترى نوفا إلا ما يمكنك رؤيته.",
  novaThinking: "نوفا تفكّر…",
  number: "الرقم",
  openMap: "فتح الخريطة",
  owner: "المسؤول",
  pause: "إيقاف مؤقت",
  poAlreadySubmittedQuotation: "سبق تقديم أمر شراء لعرض السعر هذا.",
  poNumberValueAnything: "رقم أمر الشراء، القيمة، وأي شيء تحتاجه المالية لاعتماده",
  post: "نشر",
  quotation: "عرض السعر",
  quotationAlreadySentApproval: "سبق إرسال عرض السعر هذا للاعتماد.",
  quotationApproved: "اعتُمد عرض السعر",
  quotationApprovedBeforePo: "يجب اعتماد عرض السعر قبل أن يُقيَّد عليه أمر شراء.",
  quotations: "عروض الأسعار",
  rateNompany: "قيّم nompany",
  reference: "المرجع",
  requestRfq: "طلب عرض سعر",
  resume: "استئناف",
  salesLiveView: "المبيعات — العرض المباشر",
  saving: "جارٍ الحفظ…",
  send: "إرسال",
  sendApproval: "إرسال للاعتماد",
  sendLatestQuotationAppointed: "أرسل أحدث عرض سعر إلى معتمدي المبيعات والإدارة المعيّنين",
  sendTicketBackTechnical: "أعِد هذه التذكرة إلى القسم الفني لمراجعة آخر عرض سعر",
  sending: "جارٍ الإرسال…",
  shownToUsAs: "ستظهر لنا باسم",
  site: "الموقع",
  somethingWentWrong: "حدث خطأ ما — حاول مرة أخرى.",
  startChat: "بدء المحادثة",
  starting: "جارٍ البدء…",
  status: "الحالة",
  studioAssistant: "مساعد الاستوديو الخاص بك",
  studioNoTasksSection: "لا يوجد قسم مهام في هذا الاستوديو لإرسال الاعتماد إليه.",
  studioNoTasksSection2: "لا يوجد قسم مهام في هذا الاستوديو لإرسال أمر الشراء إليه.",
  studioNoTechnicalSection: "لا يوجد قسم فني في هذا الاستوديو لإرسال طلب عرض سعر إليه.",
  submitPoFinance: "إرسال أمر الشراء إلى المالية",
  technicalTicketCanRequest: "التذكرة لدى القسم الفني. يمكنك طلب عرض سعر آخر بعد عودة العرض الحالي.",
  technicalTicketQuotationWill: "التذكرة لدى القسم الفني — سيظهر عرض السعر هنا بمجرد رفعه.",
  thankNoted: "شكرًا لك — سُجّل ذلك.",
  ticketAlreadyTechnicalCan: "هذه التذكرة مع القسم الفني بالفعل — يمكنك إرسالها مجددًا بعد عودة عرض السعر.",
  ticketCreated: "أُنشئت التذكرة",
  ticketInfo: "معلومات التذكرة",
  ticketNoLongerExists: "لم تعد هذه التذكرة موجودة.",
  ticketNoLongerExists2: "لم تعد هذه التذكرة موجودة — أعد تحميل الصفحة.",
  ticketQuotationApprovedNothing: "اعتُمد عرض سعر هذه التذكرة — لم يبقَ ما يُراجَع. وأي تغيير بعد الاعتماد يعني تذكرة جديدة.",
  ticketTimeline: "المسار الزمني للتذكرة",
  typeMessage: "اكتب رسالة…",
  urgency: "الاستعجال",
  usuallyReplyFewMinutes: "نردّ عادةً خلال دقائق",
  valueQuoted: "القيمة المعروضة",
  viewOnlyAccessSales: "لديك صلاحية عرض فقط على المبيعات.",
  waitingSomeoneJoin: "بانتظار انضمام أحدهم…",
  whatClientSentFinance: "ما أرسله العميل. تعتمده المالية وتُصدر رقم المشروع الذي يُحاسَب عليه العمل.",
  whatNeedsMyAttention: "ما الذي يحتاج إلى انتباهي؟",
};

const misc = { en, ar };

export function miscDict(locale: string): Strings {
  return misc[locale as Locale] || misc[defaultLocale];
}
