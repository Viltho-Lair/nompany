import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE REST OF THE STUDIO — the manual, chat, Nova, the rating prompt and the grid.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessSalesStudio: string;
  addComment: string;
  askNova: string;
  askNova2: string;
  back: string;
  backSales: string;
  backStudio: string;
  cancel: string;
  chatEnded: string;
  city: string;
  clientBudget: string;
  close: string;
  closeNova: string;
  commentDidnSave: string;
  comments: string;
  confirm: string;
  contactPerson: string;
  country: string;
  deadline: string;
  description: string;
  didnSave: string;
  didnSendTryAgain: string;
  edit: string;
  email: string;
  fieldsMarkedRequired: string;
  industry: string;
  lastUpdated: string;
  latest: string;
  loading: string;
  loadingTicket: string;
  map: string;
  message: string;
  minimiseChat: string;
  noTicketsYet: string;
  notNow: string;
  nothingHereYet: string;
  nothingSaidYet: string;
  nova: string;
  novaThinking: string;
  number: string;
  openMap: string;
  owner: string;
  poNumberValueAnything: string;
  quotationApproved: string;
  quotations: string;
  rateNompany: string;
  reference: string;
  salesLiveView: string;
  send: string;
  sendLatestQuotationAppointed: string;
  site: string;
  status: string;
  studioAssistant: string;
  submitPoFinance: string;
  technicalTicketCanRequest: string;
  thankNoted: string;
  ticketCreated: string;
  ticketInfo: string;
  ticketNoLongerExists: string;
  ticketTimeline: string;
  typeMessage: string;
  urgency: string;
  valueQuoted: string;
  whatClientSentFinance: string;
};

const en: Strings = {
  ...commonEn,
  accessSalesStudio: "You don't have access to Sales in this studio.",
  addComment: "Add a comment",
  askNova: "Ask Nova",
  askNova2: "Ask Nova…",
  back: "Back",
  backSales: "Back to Sales",
  backStudio: "Back to the studio",
  cancel: "Cancel",
  chatEnded: "This chat has ended.",
  city: "City",
  clientBudget: "Client budget",
  close: "Close",
  closeNova: "Close Nova",
  commentDidnSave: "That comment didn't save.",
  comments: "Comments",
  confirm: "Confirm",
  contactPerson: "Contact person",
  country: "Country",
  deadline: "Deadline",
  description: "Description",
  didnSave: "That didn't save.",
  didnSendTryAgain: "That didn't send. Try again.",
  edit: "Edit",
  email: "Email",
  fieldsMarkedRequired: "Fields marked * are required.",
  industry: "Industry",
  lastUpdated: "Last updated",
  latest: "Latest",
  loading: "Loading…",
  loadingTicket: "Loading ticket…",
  map: "Map",
  message: "Message",
  minimiseChat: "Minimise chat",
  noTicketsYet: "No tickets yet.",
  notNow: "Not now",
  nothingHereYet: "Nothing here yet",
  nothingSaidYet: "Nothing said yet.",
  nova: "Nova",
  novaThinking: "Nova is thinking…",
  number: "Number",
  openMap: "Open map",
  owner: "Owner",
  poNumberValueAnything: "PO number, value, anything Finance needs to authorise it",
  quotationApproved: "Quotation approved",
  quotations: "Quotations",
  rateNompany: "Rate nompany",
  reference: "Reference",
  salesLiveView: "Sales — Live view",
  send: "Send",
  sendLatestQuotationAppointed: "Send the latest quotation to the appointed Sales and Management approvers",
  site: "Site",
  status: "Status",
  studioAssistant: "Your studio assistant",
  submitPoFinance: "Submit PO to Finance",
  technicalTicketCanRequest: "Technical has this ticket. You can request another RFQ once the quotation comes back.",
  thankNoted: "Thank you — noted.",
  ticketCreated: "Ticket created",
  ticketInfo: "Ticket info",
  ticketNoLongerExists: "That ticket no longer exists.",
  ticketTimeline: "Ticket timeline",
  typeMessage: "Type a message…",
  urgency: "Urgency",
  valueQuoted: "Value Quoted",
  whatClientSentFinance: "What the client sent. Finance authorise it and issue the project number the work is billed under.",
};

const ar: Strings = {
  ...commonAr,
  accessSalesStudio: "لا تملك صلاحية الوصول إلى المبيعات في هذا الاستوديو.",
  addComment: "إضافة تعليق",
  askNova: "اسأل نوفا",
  askNova2: "اسأل نوفا…",
  back: "رجوع",
  backSales: "العودة إلى المبيعات",
  backStudio: "العودة إلى الاستوديو",
  cancel: "إلغاء",
  chatEnded: "انتهت هذه المحادثة.",
  city: "المدينة",
  clientBudget: "ميزانية العميل",
  close: "إغلاق",
  closeNova: "إغلاق نوفا",
  commentDidnSave: "لم يُحفظ ذلك التعليق.",
  comments: "التعليقات",
  confirm: "تأكيد",
  contactPerson: "جهة الاتصال",
  country: "الدولة",
  deadline: "الموعد النهائي",
  description: "الوصف",
  didnSave: "لم يُحفظ ذلك.",
  didnSendTryAgain: "لم يُرسَل ذلك. حاول مرة أخرى.",
  edit: "تعديل",
  email: "البريد الإلكتروني",
  fieldsMarkedRequired: "الحقول المعلَّمة بـ * مطلوبة.",
  industry: "النشاط",
  lastUpdated: "آخر تحديث",
  latest: "الأحدث",
  loading: "جارٍ التحميل…",
  loadingTicket: "جارٍ تحميل التذكرة…",
  map: "الخريطة",
  message: "الرسالة",
  minimiseChat: "تصغير المحادثة",
  noTicketsYet: "لا توجد تذاكر بعد.",
  notNow: "ليس الآن",
  nothingHereYet: "لا شيء هنا بعد",
  nothingSaidYet: "لم يُقَل شيء بعد.",
  nova: "نوفا",
  novaThinking: "نوفا تفكّر…",
  number: "الرقم",
  openMap: "فتح الخريطة",
  owner: "المسؤول",
  poNumberValueAnything: "رقم أمر الشراء، القيمة، وأي شيء تحتاجه المالية لاعتماده",
  quotationApproved: "اعتُمد عرض السعر",
  quotations: "عروض الأسعار",
  rateNompany: "قيّم nompany",
  reference: "المرجع",
  salesLiveView: "المبيعات — العرض المباشر",
  send: "إرسال",
  sendLatestQuotationAppointed: "أرسل أحدث عرض سعر إلى معتمدي المبيعات والإدارة المعيّنين",
  site: "الموقع",
  status: "الحالة",
  studioAssistant: "مساعد الاستوديو الخاص بك",
  submitPoFinance: "إرسال أمر الشراء إلى المالية",
  technicalTicketCanRequest: "التذكرة لدى القسم الفني. يمكنك طلب عرض سعر آخر بعد عودة العرض الحالي.",
  thankNoted: "شكرًا لك — سُجّل ذلك.",
  ticketCreated: "أُنشئت التذكرة",
  ticketInfo: "معلومات التذكرة",
  ticketNoLongerExists: "لم تعد هذه التذكرة موجودة.",
  ticketTimeline: "المسار الزمني للتذكرة",
  typeMessage: "اكتب رسالة…",
  urgency: "الاستعجال",
  valueQuoted: "القيمة المعروضة",
  whatClientSentFinance: "ما أرسله العميل. تعتمده المالية وتُصدر رقم المشروع الذي يُحاسَب عليه العمل.",
};

const misc = { en, ar };

export function miscDict(locale: string): Strings {
  return misc[locale as Locale] || misc[defaultLocale];
}
