import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// SALES — clients, the tickets raised against them, and the department's own
// settings.
//
// WHAT IS NOT HERE: the ticket STATUSES and URGENCIES. Those come out of
// `vocabulary`, which is a studio setting a tenant edits in Sales → Settings, so
// they are data in the strictest sense — the filter compares the typed value
// against the stored one, and translating either side would stop them matching.
// Service names are the same. The one status vocabulary that IS translated is
// the pill's, and that lives in ./statuses because the tokens are the code's.

type Strings = CommonStrings & {
  // The department's own name, for the shared no-access sentence.
  salesDepartment: string;
  loadingSales: string;
  errDuplicate: string;
  errInUse: (tickets: number) => string;
  errReadOnly: string;
  errName: string;
  errClient: string;
  errDeadline: string;
  errIndustry: string;
  errServices: string;
  errBudget: string;
  errAlready: string;
  errNoTechnical: string;
  errRfqForbidden: string;
  errTicketGone: string;

  colCreated: string;
  colRef: string;
  colOwner: string;
  colValueQuoted: string;
  colRfq: string;
  colProbability: string;
  colUpdated: string;

  editNamed: (what: string) => string;
  addClient: string;
  clientFormHint: string;
  newTicket: string;
  ticketFormHint: string;

  liveView: string;
  liveViewLeadBefore: string;
  salesSettingsPath: string;
  openLiveView: string;
  allTickets: string;
  openTicketsLink: string;
  noTicketsYet: string;

  ticketsEmptyTitle: string;
  ticketsEmptyBody: string;
  searchTickets: string;
  columnsButton: string;
  probabilityPct: string;
  min: string;
  max: string;
  ticketColumns: string;
  ticketCount: (shown: number, total: number) => string;
  ticketsAria: string;
  loadingTickets: string;
  noTicketsMatch: string;
  openAction: string;
  rfqRaisedCount: (n: number) => string;
  openNamed: (what: string) => string;

  clientsEmptyTitle: string;
  clientsEmptyBody: string;
  searchClients: string;
  clientsLead: (shown: number, total: number) => string;
  noClientsMatch: string;
  colDateAdded: string;
  colAddedBy: string;
  colTickets: string;
  openLocation: string;

  companyName: string;
  website: string;
  logo: string;
  // "Change" as in replace the picture — distinct from common.change, which is
  // the generic verb, because the button reads better as a noun-phrase here.
  changeLogo: string;
  pickImage: string;
  imageTooBig: string;
  uploadFailed: string;
  contactsTitle: string;
  contactsHelp: string;
  addContact: string;
  position: string;
  locationsTitle: string;
  locationsHelp: string;
  addLocation: string;
  siteName: string;
  country: string;
  city: string;
  mapLink: string;
  saveClient: string;

  typeOfIndustry: string;
  clientBudget: string;
  clientHintExisting: (contacts: number) => string;
  clientHintNew: string;
  valueQuotedHintBefore: string;
  valueQuotedHintTerm: string;
  valueQuotedHintAfter: string;
  probabilityOf: (pct: number) => string;
  contactHeading: string;
  locationHeading: string;
  servicesHeading: string;
  noServicesForTicket: string;
  withoutInstallation: string;
  withoutProgramming: string;
  saveTicket: string;

  servicesTitle: string;
  servicesLead: string;
  noServicesYet: string;
  serviceNamePlaceholder: string;
  addService: string;
  vocabularyTitle: string;
  vocabularyLead: string;
  citiesTitle: string;
  citiesHelp: string;
  positionsTitle: string;
  positionsHelp: string;
  liveViewLead: string;
  saveColumns: string;
  settingsReadOnly: string;
  addAndEnter: string;
  removeNamed: (what: string) => string;
};

const en: Strings = {
  ...commonEn,
  salesDepartment: "Sales",
  loadingSales: "Loading Sales…",
  errDuplicate: "A client with that name already exists.",
  errInUse: (n) =>
    `That client still has ${n} ticket${n === 1 ? "" : "s"} — reassign or delete them first.`,
  errReadOnly: "You have view-only access to Sales.",
  errName: "Give it a name.",
  errClient: "Name the client.",
  errDeadline: "Deadline is required.",
  errIndustry: "Type of industry is required.",
  errServices: "Pick at least one service. Add them in Sales → Settings.",
  errBudget: "Client budget must be a non-negative number.",
  errAlready: "That ticket is already with Technical — you can send it again once the quotation comes back.",
  errNoTechnical: "This studio has no Technical section to send an RFQ to.",
  errRfqForbidden: "You're not allowed to raise an RFQ.",
  errTicketGone: "That ticket no longer exists — reload the page.",

  colCreated: "Created",
  colRef: "Ref",
  colOwner: "Owner",
  colValueQuoted: "Value Quoted",
  colRfq: "RFQ",
  colProbability: "Prob.",
  colUpdated: "Updated",

  editNamed: (what) => `Edit ${what}`,
  addClient: "Add client",
  clientFormHint: "A client is a company you sell to. Fields marked * are required.",
  newTicket: "New ticket",
  ticketFormHint: "Fields marked * are required.",

  liveView: "Live view",
  liveViewLeadBefore: "A full-screen tickets table that refreshes on its own. Columns are configured in ",
  salesSettingsPath: "Sales → Settings",
  openLiveView: "Open live view →",
  allTickets: "All tickets",
  openTicketsLink: "Open tickets →",
  noTicketsYet: "No tickets yet.",

  ticketsEmptyTitle: "No tickets yet",
  ticketsEmptyBody:
    "A ticket is a piece of work you're chasing for a client — a lead, an enquiry, an opportunity.",
  searchTickets: "Search title, client, ref or description…",
  columnsButton: "Columns",
  probabilityPct: "Probability (%)",
  min: "Min",
  max: "Max",
  ticketColumns: "Ticket columns",
  ticketCount: (shown, total) => `${shown} of ${total} ticket${total === 1 ? "" : "s"}.`,
  ticketsAria: "Tickets",
  loadingTickets: "Loading tickets",
  noTicketsMatch: "No tickets match those filters.",
  openAction: "Open",
  rfqRaisedCount: (n) => `${n} raised`,
  openNamed: (what) => `Open ${what}`,

  clientsEmptyTitle: "No clients yet",
  clientsEmptyBody:
    "Add the companies you sell to. Tickets, and later quotations and projects, hang off them.",
  searchClients: "Search name, contact or city…",
  clientsLead: (shown, total) =>
    `Clients added here or by naming a new one on a ticket. ${shown} of ${total}.`,
  noClientsMatch: "No clients match that search.",
  colDateAdded: "Date added",
  colAddedBy: "Added by",
  colTickets: "Tickets",
  openLocation: "Open location",

  companyName: "Company name",
  website: "Website",
  logo: "Logo",
  changeLogo: "Change",
  pickImage: "Choose an image file.",
  imageTooBig: "Images must be 2 MB or smaller.",
  uploadFailed: "We couldn't upload that logo.",
  contactsTitle: "Contacts",
  contactsHelp: "The people you deal with there. A ticket folds its contact in here automatically.",
  addContact: "Add contact",
  position: "Position",
  locationsTitle: "Locations",
  locationsHelp: "Sites this client has. A ticket's location is folded in here too.",
  addLocation: "Add location",
  siteName: "Site name",
  country: "Country",
  city: "City",
  mapLink: "Map link",
  saveClient: "Save client",

  typeOfIndustry: "Type of industry",
  clientBudget: "Client budget",
  clientHintExisting: (n) => `Existing client — ${n} contact${n === 1 ? "" : "s"} on file.`,
  clientHintNew: "A name that isn't on the list creates a new client.",
  valueQuotedHintBefore: "The ticket's ",
  valueQuotedHintTerm: "Value Quoted",
  valueQuotedHintAfter: " is set automatically from its most recent quotation.",
  probabilityOf: (pct) => `Probability — ${pct}%`,
  contactHeading: "Contact",
  locationHeading: "Location",
  servicesHeading: "Type of services *",
  noServicesForTicket:
    "No services in the catalogue yet. Add them in Sales → Settings before raising a ticket.",
  withoutInstallation: "Without installation",
  withoutProgramming: "Without programming",
  saveTicket: "Save ticket",

  servicesTitle: "Services",
  servicesLead:
    "The catalogue a ticket picks from. Each service gets its own serviceId, and one that a ticket still references cannot be deleted.",
  noServicesYet: "No services yet — a ticket needs at least one, so add them here first.",
  serviceNamePlaceholder: "Service name",
  addService: "Add service",
  vocabularyTitle: "Vocabulary",
  vocabularyLead:
    "Suggestions offered on the ticket form. They are hints, not a closed list — anything can still be typed.",
  citiesTitle: "Cities",
  citiesHelp: "Offered under a ticket's location.",
  positionsTitle: "Contact positions",
  positionsHelp: "Offered as a contact's position.",
  liveViewLead:
    "Choose the ticket columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.",
  saveColumns: "Save columns",
  settingsReadOnly: "You have view-only access to Sales settings.",
  addAndEnter: "Add and press Enter",
  removeNamed: (what) => `Remove ${what}`,
};

const ar: Strings = {
  ...commonAr,
  salesDepartment: "المبيعات",
  loadingSales: "جارٍ تحميل المبيعات…",
  errDuplicate: "يوجد عميل بهذا الاسم بالفعل.",
  errInUse: (n) => {
    const what =
      n === 1 ? "تذكرة واحدة"
      : n === 2 ? "تذكرتان"
      : n <= 10 ? `${n} تذاكر`
      : `${n} تذكرة`;
    return `لا يزال لدى هذا العميل ${what} — أعِد إسنادها أو احذفها أولًا.`;
  },
  errReadOnly: "لديك صلاحية عرض فقط على المبيعات.",
  errName: "أعطِه اسمًا.",
  errClient: "حدّد اسم العميل.",
  errDeadline: "الموعد النهائي مطلوب.",
  errIndustry: "نوع النشاط مطلوب.",
  errServices: "اختر خدمة واحدة على الأقل. أضِفها من المبيعات ← الإعدادات.",
  errBudget: "يجب أن تكون ميزانية العميل رقمًا غير سالب.",
  errAlready: "هذه التذكرة مع القسم الفني بالفعل — يمكنك إرسالها مجددًا بعد عودة عرض السعر.",
  errNoTechnical: "لا يوجد قسم فني في هذا الاستوديو لإرسال طلب عرض سعر إليه.",
  errRfqForbidden: "لا يُسمح لك برفع طلب عرض سعر.",
  errTicketGone: "لم تعد هذه التذكرة موجودة — أعد تحميل الصفحة.",

  colCreated: "تاريخ الإنشاء",
  colRef: "المرجع",
  colOwner: "المسؤول",
  // "القيمة المعروضة" and not "القيمة": the figure is the latest quotation's
  // total, never typed — the English label makes that distinction and so must
  // this one.
  colValueQuoted: "القيمة المعروضة",
  colRfq: "طلب عرض السعر",
  colProbability: "الاحتمال",
  colUpdated: "آخر تحديث",

  editNamed: (what) => `تعديل ${what}`,
  addClient: "إضافة عميل",
  clientFormHint: "العميل شركة تبيع لها. الحقول المعلَّمة بـ * مطلوبة.",
  newTicket: "تذكرة جديدة",
  ticketFormHint: "الحقول المعلَّمة بـ * مطلوبة.",

  liveView: "العرض المباشر",
  liveViewLeadBefore: "جدول تذاكر بملء الشاشة يُحدِّث نفسه. تُضبط أعمدته من ",
  salesSettingsPath: "المبيعات ← الإعدادات",
  openLiveView: "فتح العرض المباشر ←",
  allTickets: "كل التذاكر",
  openTicketsLink: "فتح التذاكر ←",
  noTicketsYet: "لا توجد تذاكر بعد.",

  ticketsEmptyTitle: "لا توجد تذاكر بعد",
  ticketsEmptyBody: "التذكرة عمل تسعى إليه لعميل — مبادرة أو استفسار أو فرصة.",
  searchTickets: "ابحث في العنوان أو العميل أو المرجع أو الوصف…",
  columnsButton: "الأعمدة",
  probabilityPct: "الاحتمال (٪)",
  min: "الأدنى",
  max: "الأعلى",
  ticketColumns: "أعمدة التذاكر",
  ticketCount: (shown, total) => {
    const what =
      total === 1 ? "تذكرة واحدة"
      : total === 2 ? "تذكرتين"
      : total <= 10 ? "تذاكر"
      : "تذكرة";
    return `${shown} من ${total} ${what}.`;
  },
  ticketsAria: "التذاكر",
  loadingTickets: "جارٍ تحميل التذاكر",
  noTicketsMatch: "لا توجد تذاكر تطابق عوامل التصفية هذه.",
  openAction: "فتح",
  rfqRaisedCount: (n) => `${n} مرفوعة`,
  openNamed: (what) => `فتح ${what}`,

  clientsEmptyTitle: "لا يوجد عملاء بعد",
  clientsEmptyBody: "أضِف الشركات التي تبيع لها. التذاكر، ثم عروض الأسعار والمشاريع، تتفرع منها.",
  searchClients: "ابحث بالاسم أو جهة الاتصال أو المدينة…",
  clientsLead: (shown, total) =>
    `عملاء أُضيفوا هنا أو بتسمية عميل جديد في تذكرة. ${shown} من ${total}.`,
  noClientsMatch: "لا يوجد عملاء يطابقون هذا البحث.",
  colDateAdded: "تاريخ الإضافة",
  colAddedBy: "أضافه",
  colTickets: "التذاكر",
  openLocation: "فتح الموقع",

  companyName: "اسم الشركة",
  website: "الموقع الإلكتروني",
  logo: "الشعار",
  changeLogo: "تغيير",
  pickImage: "اختر ملف صورة.",
  imageTooBig: "يجب ألا تتجاوز الصور 2 ميجابايت.",
  uploadFailed: "تعذّر رفع ذلك الشعار.",
  contactsTitle: "جهات الاتصال",
  contactsHelp: "الأشخاص الذين تتعامل معهم هناك. تُضاف جهة اتصال التذكرة هنا تلقائيًا.",
  addContact: "إضافة جهة اتصال",
  position: "المنصب",
  locationsTitle: "المواقع",
  locationsHelp: "المواقع التي يملكها هذا العميل. يُضاف موقع التذكرة هنا أيضًا.",
  addLocation: "إضافة موقع",
  siteName: "اسم الموقع",
  country: "الدولة",
  city: "المدينة",
  mapLink: "رابط الخريطة",
  saveClient: "حفظ العميل",

  typeOfIndustry: "نوع النشاط",
  clientBudget: "ميزانية العميل",
  clientHintExisting: (n) => {
    const what =
      n === 1 ? "جهة اتصال واحدة"
      : n === 2 ? "جهتا اتصال"
      : n <= 10 ? `${n} جهات اتصال`
      : `${n} جهة اتصال`;
    return `عميل قائم — ${what} مسجّلة.`;
  },
  clientHintNew: "الاسم غير المدرج في القائمة يُنشئ عميلًا جديدًا.",
  valueQuotedHintBefore: "تُضبط ",
  valueQuotedHintTerm: "القيمة المعروضة",
  valueQuotedHintAfter: " للتذكرة تلقائيًا من أحدث عرض سعر لها.",
  probabilityOf: (pct) => `الاحتمال — ${pct}٪`,
  contactHeading: "جهة الاتصال",
  locationHeading: "الموقع",
  servicesHeading: "نوع الخدمات *",
  noServicesForTicket:
    "لا توجد خدمات في الكتالوج بعد. أضِفها من المبيعات ← الإعدادات قبل رفع تذكرة.",
  withoutInstallation: "بدون تركيب",
  withoutProgramming: "بدون برمجة",
  saveTicket: "حفظ التذكرة",

  servicesTitle: "الخدمات",
  servicesLead:
    "الكتالوج الذي تختار منه التذكرة. لكل خدمة معرّف خاص بها، والخدمة التي لا تزال تذكرة تشير إليها لا يمكن حذفها.",
  noServicesYet: "لا توجد خدمات بعد — التذكرة تحتاج إلى واحدة على الأقل، فأضِفها هنا أولًا.",
  serviceNamePlaceholder: "اسم الخدمة",
  addService: "إضافة خدمة",
  vocabularyTitle: "المفردات",
  vocabularyLead:
    "اقتراحات تُعرض في نموذج التذكرة. هي تلميحات وليست قائمة مغلقة — يمكن كتابة أي شيء آخر.",
  citiesTitle: "المدن",
  citiesHelp: "تُعرض ضمن موقع التذكرة.",
  positionsTitle: "مناصب جهات الاتصال",
  positionsHelp: "تُعرض كمنصب لجهة الاتصال.",
  liveViewLead:
    "اختر أعمدة التذاكر التي يعرضها العرض المباشر. هذا إعداد مشترك — ينطبق على الجميع. ويُبقى عمود واحد على الأقل.",
  saveColumns: "حفظ الأعمدة",
  settingsReadOnly: "لديك صلاحية عرض فقط على إعدادات المبيعات.",
  addAndEnter: "اكتب ثم اضغط Enter",
  removeNamed: (what) => `إزالة ${what}`,
};

const sales = { en, ar };

export function salesDict(locale: string): Strings {
  return sales[locale as Locale] || sales[defaultLocale];
}
