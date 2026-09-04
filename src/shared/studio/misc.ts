import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE REST OF THE STUDIO — the manual, chat, Nova, the rating prompt and the grid.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  attachThePo: string;
  chatUnread: (n: number) => string;
  chatsArentStored: string;
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
  documentation: string;
  download: string;
  downloadTranscript: string;
  edit: string;
  email: string;
  endChatDownload: string;
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
  infinityLeft: string;
  lastUpdated: string;
  latest: string;
  leftSuffix: string;
  liveChatNotPart: string;
  loading: string;
  loadingAria: string;
  loadingGrid: string;
  loadingGrid2: string;
  loadingTicket: string;
  manualWillLive: string;
  map: string;
  message: string;
  minimiseChat: string;
  nNotificationsWaiting: (n: number) => string;
  nStars: (n: number) => string;
  nTickets: (n: number) => string;
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
  open: string;
  openMap: string;
  owner: string;
  pause: string;
  poAlreadySubmittedQuotation: string;
  poApproved: string;
  poNumberValueAnything: string;
  poSubmitted: string;
  post: string;
  quotation: string;
  quotationAlreadySentApproval: string;
  quotationApproved: string;
  quotationApprovedBeforePo: string;
  quotationSent: string;
  waitingOnApprovers: (left: number, total: number) => string;
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
  shownToUsAs2: string;
  shownToUsAs3: string;
  site: string;
  someone3: string;
  somethingWentWrong: string;
  startChat: string;
  starting: string;
  status: string;
  studioAssistant: string;
  studioNoTasksSection: string;
  studioNoTasksSection2: string;
  studioNoTechnicalSection: string;
  submitPo: string;
  submitPoFinance: string;
  technicalTicketCanRequest: string;
  technicalTicketQuotationWill: string;
  thankNoted: string;
  ticket: string;
  ticketAlreadyTechnicalCan: string;
  ticketCreated: string;
  ticketInfo: string;
  ticketNoLongerExists: string;
  ticketNoLongerExists2: string;
  ticketQuotationApprovedNothing: string;
  ticketTimeline: string;
  typeMessage: string;
  unassigned3: string;
  urgency: string;
  usuallyReplyFewMinutes: string;
  valueQuoted: string;
  // WHY A DEAL ENDED, on the record where the deal is read. `lostReason` is
  // written by the pipeline's stage transition (modules/sales/pipeline.ts); a
  // reason nobody is ever shown would be the same dead field it used to be,
  // with a value in it.
  lostReasonLabel: string;
  closedOn: string;
  // The one reason the SYSTEM writes, as a token rather than a sentence
  // (pipeline.CHAIN_LOST_REASON) — an English sentence in the database is one
  // an Arabic studio would be shown verbatim. What a person typed is data and
  // is shown exactly as typed.
  reasonRfqRejected: string;
  viewOnlyAccessSales: string;
  waitingForSomeone: string;
  waitingSomeoneJoin: string;
  whatClientSentFinance: string;
  whatNeedsMyAttention: string;
};

const en: Strings = {
  ...commonEn,
  attachThePo: "Attach the PO",
  chatUnread: (n) => `Chat with nompany, ${n} new message${n === 1 ? "" : "s"}`,
  chatsArentStored: "Chats aren't stored. When you're done you can download the transcript — after that it's gone from our side too.",
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
  documentation: "Documentation",
  download: "Download",
  downloadTranscript: "Download transcript",
  edit: "Edit",
  email: "Email",
  endChatDownload: "End chat & download",
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
  infinityLeft: "left",
  lastUpdated: "Last updated",
  latest: "Latest",
  leftSuffix: "left",
  liveChatNotPart: "Live chat is not part of this studio's package.",
  loading: "Loading…",
  loadingAria: "Loading",
  loadingGrid: "Loading",
  loadingGrid2: "Loading",
  loadingTicket: "Loading ticket…",
  manualWillLive: "The studio manual will live on this page.",
  map: "Map",
  message: "Message",
  minimiseChat: "Minimise chat",
  nNotificationsWaiting: (n: number) => `You have ${n} notification${n === 1 ? "" : "s"} waiting — ask me what needs your attention.`,
  nStars: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
  nTickets: (n: number) => `${n} ticket${n === 1 ? "" : "s"}`,
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
  open: "Open",
  openMap: "Open map",
  owner: "Owner",
  pause: "Pause",
  poAlreadySubmittedQuotation: "A PO has already been submitted for this quotation.",
  poApproved: "PO Approved",
  poNumberValueAnything: "PO number, value, anything Finance needs to authorise it",
  poSubmitted: "PO Submitted",
  post: "Post",
  quotation: "Quotation",
  quotationAlreadySentApproval: "This quotation has already been sent for approval.",
  quotationApproved: "Quotation approved",
  quotationApprovedBeforePo: "The quotation has to be approved before a PO can be booked against it.",
  quotationSent: "Quotation Sent",
  waitingOnApprovers: (left, total) => `Waiting on ${left} of ${total} approver${total === 1 ? "" : "s"}`,
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
  shownToUsAs2: "You'll be shown to us as",
  shownToUsAs3: "You'll be shown to us as",
  site: "Site",
  someone3: "Someone",
  somethingWentWrong: "Something went wrong — try again.",
  startChat: "Start chat",
  starting: "Starting…",
  status: "Status",
  studioAssistant: "Your studio assistant",
  studioNoTasksSection: "This studio has no Tasks section to send the approval to.",
  studioNoTasksSection2: "This studio has no Tasks section to send the PO to.",
  studioNoTechnicalSection: "This studio has no Technical section to send an RFQ to.",
  submitPo: "Submit PO",
  submitPoFinance: "Submit PO to Finance",
  technicalTicketCanRequest: "Technical has this ticket. You can request another RFQ once the quotation comes back.",
  technicalTicketQuotationWill: "Technical has this ticket — the quotation will appear here once it is raised.",
  thankNoted: "Thank you — noted.",
  ticket: "Ticket",
  ticketAlreadyTechnicalCan: "That ticket is already with Technical — you can send it again once the quotation comes back.",
  ticketCreated: "Ticket created",
  ticketInfo: "Ticket info",
  ticketNoLongerExists: "That ticket no longer exists.",
  ticketNoLongerExists2: "That ticket no longer exists — reload the page.",
  ticketQuotationApprovedNothing: "This ticket's quotation has been approved — there is nothing left to revise. A change after approval is a new ticket.",
  ticketTimeline: "Ticket timeline",
  typeMessage: "Type a message…",
  unassigned3: "Unassigned",
  urgency: "Urgency",
  usuallyReplyFewMinutes: "We usually reply in a few minutes",
  valueQuoted: "Value Quoted",
  lostReasonLabel: "Reason lost",
  closedOn: "Closed",
  reasonRfqRejected: "Technical turned the RFQ down.",
  viewOnlyAccessSales: "You have view-only access to Sales.",
  waitingForSomeone: "Waiting for someone from nompany to join. You can start describing the problem now.",
  waitingSomeoneJoin: "Waiting for someone to join…",
  whatClientSentFinance: "What the client sent. Finance authorise it and issue the project number the work is billed under.",
  whatNeedsMyAttention: "What needs my attention?",
};

const ar: Strings = {
  ...commonAr,
  attachThePo: "أرفق أمر الشراء",
  chatUnread: (n) => `محادثة مع nompany، ${n === 1 ? "رسالة جديدة واحدة" : n === 2 ? "رسالتان جديدتان" : n <= 10 ? `${n} رسائل جديدة` : `${n} رسالة جديدة`}`,
  chatsArentStored: "لا تُحفظ المحادثات. وحين تنتهي يمكنك تنزيل النص — وبعدها يختفي من جانبنا أيضًا.",
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
  documentation: "التوثيق",
  download: "تنزيل",
  downloadTranscript: "نزّل النص",
  edit: "تعديل",
  email: "البريد الإلكتروني",
  endChatDownload: "أنهِ المحادثة ونزّل",
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
  infinityLeft: "متبقٍ",
  lastUpdated: "آخر تحديث",
  latest: "الأحدث",
  leftSuffix: "متبقٍ",
  liveChatNotPart: "المحادثة المباشرة ليست ضمن باقة هذا الاستوديو.",
  loading: "جارٍ التحميل…",
  loadingAria: "جارٍ التحميل",
  loadingGrid: "جارٍ التحميل",
  loadingGrid2: "جارٍ التحميل",
  loadingTicket: "جارٍ تحميل التذكرة…",
  manualWillLive: "سيعيش دليل الاستوديو في هذه الصفحة.",
  map: "الخريطة",
  message: "الرسالة",
  minimiseChat: "تصغير المحادثة",
  nNotificationsWaiting: (n: number) => `لديك ${n === 1 ? "إشعار واحد" : n === 2 ? "إشعاران" : n <= 10 ? `${n} إشعارات` : `${n} إشعارًا`} بالانتظار — اسألني عمّا يحتاج انتباهك.`,
  nStars: (n: number) => n === 1 ? "نجمة واحدة" : n === 2 ? "نجمتان" : n <= 10 ? `${n} نجوم` : `${n} نجمة`,
  nTickets: (n: number) => n === 1 ? "تذكرة واحدة" : n === 2 ? "تذكرتان" : n <= 10 ? `${n} تذاكر` : `${n} تذكرة`,
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
  open: "فتح",
  openMap: "فتح الخريطة",
  owner: "المسؤول",
  pause: "إيقاف مؤقت",
  poAlreadySubmittedQuotation: "سبق تقديم أمر شراء لعرض السعر هذا.",
  poApproved: "اعتُمد أمر الشراء",
  poNumberValueAnything: "رقم أمر الشراء، القيمة، وأي شيء تحتاجه المالية لاعتماده",
  poSubmitted: "أُرسل أمر الشراء",
  post: "نشر",
  quotation: "عرض السعر",
  quotationAlreadySentApproval: "سبق إرسال عرض السعر هذا للاعتماد.",
  quotationApproved: "اعتُمد عرض السعر",
  quotationApprovedBeforePo: "يجب اعتماد عرض السعر قبل أن يُقيَّد عليه أمر شراء.",
  quotationSent: "أُرسل عرض السعر",
  waitingOnApprovers: (left, total) => {
    const who =
      total === 1 ? "معتمد واحد"
      : total === 2 ? "معتمدَين"
      : total <= 10 ? `${total} معتمدين`
      : `${total} معتمدًا`;
    return `بانتظار ${left} من ${who}`;
  },
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
  shownToUsAs2: "ستظهر لنا باسم",
  shownToUsAs3: "ستظهر لنا باسم",
  site: "الموقع",
  someone3: "أحدهم",
  somethingWentWrong: "حدث خطأ ما — حاول مرة أخرى.",
  startChat: "بدء المحادثة",
  starting: "جارٍ البدء…",
  status: "الحالة",
  studioAssistant: "مساعد الاستوديو الخاص بك",
  studioNoTasksSection: "لا يوجد قسم مهام في هذا الاستوديو لإرسال الاعتماد إليه.",
  studioNoTasksSection2: "لا يوجد قسم مهام في هذا الاستوديو لإرسال أمر الشراء إليه.",
  studioNoTechnicalSection: "لا يوجد قسم فني في هذا الاستوديو لإرسال طلب عرض سعر إليه.",
  submitPo: "أرسل أمر الشراء",
  submitPoFinance: "إرسال أمر الشراء إلى المالية",
  technicalTicketCanRequest: "التذكرة لدى القسم الفني. يمكنك طلب عرض سعر آخر بعد عودة العرض الحالي.",
  technicalTicketQuotationWill: "التذكرة لدى القسم الفني — سيظهر عرض السعر هنا بمجرد رفعه.",
  thankNoted: "شكرًا لك — سُجّل ذلك.",
  ticket: "التذكرة",
  ticketAlreadyTechnicalCan: "هذه التذكرة مع القسم الفني بالفعل — يمكنك إرسالها مجددًا بعد عودة عرض السعر.",
  ticketCreated: "أُنشئت التذكرة",
  ticketInfo: "معلومات التذكرة",
  ticketNoLongerExists: "لم تعد هذه التذكرة موجودة.",
  ticketNoLongerExists2: "لم تعد هذه التذكرة موجودة — أعد تحميل الصفحة.",
  ticketQuotationApprovedNothing: "اعتُمد عرض سعر هذه التذكرة — لم يبقَ ما يُراجَع. وأي تغيير بعد الاعتماد يعني تذكرة جديدة.",
  ticketTimeline: "المسار الزمني للتذكرة",
  typeMessage: "اكتب رسالة…",
  unassigned3: "غير مُسند",
  urgency: "الاستعجال",
  usuallyReplyFewMinutes: "نردّ عادةً خلال دقائق",
  valueQuoted: "القيمة المعروضة",
  lostReasonLabel: "سبب الخسارة",
  closedOn: "تاريخ الإغلاق",
  reasonRfqRejected: "القسم الفني رفض طلب عرض السعر.",
  viewOnlyAccessSales: "لديك صلاحية عرض فقط على المبيعات.",
  waitingForSomeone: "بانتظار انضمام أحد من nompany. يمكنك البدء بوصف المشكلة الآن.",
  waitingSomeoneJoin: "بانتظار انضمام أحدهم…",
  whatClientSentFinance: "ما أرسله العميل. تعتمده المالية وتُصدر رقم المشروع الذي يُحاسَب عليه العمل.",
  whatNeedsMyAttention: "ما الذي يحتاج إلى انتباهي؟",
};

const misc = { en, ar };

export function miscDict(locale: string): Strings {
  return misc[locale as Locale] || misc[defaultLocale];
}
