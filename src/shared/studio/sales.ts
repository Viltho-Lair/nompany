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
  changeColumns: string;
  colCity: string;
  // CUSTOMER 360 — one client, whole. The blocks it can draw are gated one by
  // one, so these are the words for a page that may legitimately show four
  // sections to one reader and one to another.
  loadingCustomer: string;
  customerNotFound: string;
  customerSince: string;
  clientCode: string;
  wonValue: string;
  contractValue: string;
  openDeals: string;
  decidedDeals: string;
  noDealsForCustomer: string;
  noDecidedYet: string;
  quotationsHeading: string;
  noQuotationsForCustomer: string;
  projectsHeading: string;
  noProjectsForCustomer: string;
  contactsHeading: string;
  noContactsYet: string;
  sitesHeading: string;
  noSitesYet: string;
  noContractsForCustomer: string;
  openCustomer: string;
  // AGREED RATES — what this customer pays, whatever the list says.
  agreedRates: string;
  agreedRatesSub: string;
  noRatesYet: string;
  editRates: string;
  addRate: string;
  rateItem: string;
  ratePrice: string;
  rateNote: string;
  listPriceIs: (v: string) => string;
  itemNoLongerExists: string;
  save: string;
  // The page a member with `crmSales.clients.view` and no commercial right
  // sees: the company and its people, and deliberately nothing else. Said in
  // words, because a page that simply stops looks broken.
  onlyTheCompany: string;
  onlyTheCompanyBody: string;

  // THE PIPELINE BOARD. `pipeline` is the section's own name and the heading.
  //
  // The STAGE NAMES are not here and must not be: they come from the pill's
  // vocabulary in ./statuses, keyed by the stored token, because the board and
  // the ticket list have to call the same stage the same thing. What is here is
  // everything the board says ABOUT a stage.
  pipeline: string;
  pipelineSub: string;
  loadingPipeline: string;
  noDealsYet: string;
  // What to DO, not the heading repeated. A deal starts as a ticket today —
  // there is no lead capture yet, and saying so is better than implying the
  // board fills itself.
  noDealsYetBody: string;
  noDealsHere: string;
  weighted: string;
  notForecast: string;
  openValue: string;
  winRate: string;
  nDecided: (n: number) => string;
  nDaysHere: (n: number) => string;
  moveTo: string;
  moveDeal: string;
  cancel: string;
  whyLost: string;
  whyLostHint: string;
  // The dialog ASKS ("why was this deal lost?") and its field is LABELLED
  // ("reason lost"). The ticket profile states the same fact, and states it
  // from misc.ts — that screen reads miscDict, not this one. Two surfaces, two
  // dictionaries, deliberately: nothing may enumerate them.
  lostReasonLabel: string;
  // A stage refusal, one sentence each. The route hands back the token and the
  // screen chooses the sentence, so the same refusal reads correctly in both
  // languages rather than arriving pre-written in one of them.
  refuseAlreadyClosed: string;
  refuseNoQuotation: string;
  refuseReasonRequired: string;
  overdue: string;
  // The contracts register. `contracts` is the section's own name and the
  // heading; the rest are the register's words.
  contracts: string;
  contractsWhatWasAgreed: string;
  loadingContracts: string;
  noContractsYet: string;
  contractsAppearWhenQuotationWon: string;
  signedOn: string;
  variations: string;
  noVariationsYet: string;
  nVariationsWaiting: (n: number) => string;
  cannotAnswerYourOwn: string;
  raiseVariation: string;
  editVariation: string;
  submitVariation: string;
  variationTitle: string;
  variationScope: string;
  variationValueDelta: string;
  variationValueDeltaHint: string;
  variationTimeDelta: string;
  variationTimeDeltaHint: string;
  nDaysDelta: (n: number) => string;
  variationDraft: string;
  submittedByOn: (who: string, when: string) => string;
  answeredByOn: (who: string, when: string) => string;
  awaitingAnAnswer: string;
  refuseNotSubmittedVariation: string;
  refuseAlreadyAnswered: string;
  onlyApprovedCount: string;
  approve: string;
  reject: string;
  colClientBudget: string;
  colContact: string;
  colIndustry: string;
  colPhone: string;
  noColumnsSelectedSales: string;
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
  changeColumns: "Change columns",
  colCity: "City",
  loadingCustomer: "Loading the customer…",
  customerNotFound: "This customer no longer exists.",
  customerSince: "Customer since",
  clientCode: "Code",
  wonValue: "Won",
  contractValue: "Under contract",
  openDeals: "Open deals",
  decidedDeals: "Decided",
  noDealsForCustomer: "No deals have been raised for this customer.",
  noDecidedYet: "Nothing has been won or lost yet.",
  quotationsHeading: "Quotations",
  noQuotationsForCustomer: "No quotations have been raised for this customer.",
  projectsHeading: "Projects",
  noProjectsForCustomer: "No projects have been opened for this customer.",
  contactsHeading: "Contacts",
  noContactsYet: "No contacts recorded.",
  sitesHeading: "Sites",
  noSitesYet: "No sites recorded.",
  noContractsForCustomer: "No contracts have been signed with this customer.",
  openCustomer: "Open this customer",
  agreedRates: "Agreed rates",
  agreedRatesSub: "What this customer pays, whatever the list says. A rate here beats the item's sell price on every quotation raised for them.",
  noRatesYet: "No rates agreed with this customer.",
  editRates: "Edit rates",
  addRate: "Add a rate",
  rateItem: "Item",
  ratePrice: "Agreed price",
  rateNote: "Note",
  listPriceIs: (v) => `List ${v}`,
  // A rate whose item has since been deleted. Shown rather than hidden: it is a
  // promise the studio made, and the next save is what clears it.
  itemNoLongerExists: "This item no longer exists",
  save: "Save",
  onlyTheCompany: "The company, and no commercial history",
  onlyTheCompanyBody: "Deals, quotations, contracts and projects each need their own access. Ask an administrator if you should be seeing them here.",
  pipeline: "Pipeline",
  pipelineSub: "Where every open deal stands, and what the funnel is worth.",
  loadingPipeline: "Loading the pipeline…",
  noDealsYet: "No open deals",
  noDealsYetBody: "A deal starts as a ticket. Raise one and it appears here, at the stage it has reached.",
  noDealsHere: "Nothing at this stage.",
  weighted: "Weighted",
  // Said in place of a number on the held column, because zero would be a
  // claim about those deals rather than a refusal to guess at them.
  notForecast: "Not forecast",
  openValue: "Open value",
  winRate: "Win rate",
  nDecided: (n) => `${n} decided`,
  nDaysHere: (n) => (n === 1 ? "1 day here" : `${n} days here`),
  moveTo: "Move to",
  moveDeal: "Move",
  cancel: "Cancel",
  whyLost: "Why was this deal lost?",
  whyLostHint: "Required. It is the only record of why — and the only way the studio can ever answer the question across deals.",
  lostReasonLabel: "Reason lost",
  refuseAlreadyClosed: "This deal has already closed. A closed deal is history, not a stage it can be moved out of.",
  refuseNoQuotation: "There is no quotation on this deal yet, and this stage means the client has one.",
  refuseReasonRequired: "Say why it was lost before closing it.",
  overdue: "Overdue",
  contracts: "Contracts",
  contractsWhatWasAgreed: "What was agreed, and what has moved since.",
  loadingContracts: "Loading contracts…",
  noContractsYet: "No contracts yet",
  contractsAppearWhenQuotationWon: "A contract is what a won quotation becomes. Sign one against a deal and it appears here.",
  signedOn: "Signed",
  variations: "Variations",
  noVariationsYet: "No variations against this contract.",
  nVariationsWaiting: (n) => `${n} waiting`,
  // INVARIANT 7, in words somebody can act on. The route refuses the person who
  // submitted a variation, however much they hold, so the message says who
  // rather than what.
  cannotAnswerYourOwn: "You submitted this variation, so somebody else has to answer it.",
  raiseVariation: "Raise a variation",
  editVariation: "Edit variation",
  submitVariation: "Submit for an answer",
  variationTitle: "What is changing",
  variationScope: "Scope",
  variationValueDelta: "Change in value",
  variationValueDeltaHint: "Signed: negative for an omission. Never the new total — two variations approved out of order would each claim to know it.",
  variationTimeDelta: "Change in time (days)",
  variationTimeDeltaHint: "Signed, in days. The contract keeps its own end date; this is what the variation grants.",
  nDaysDelta: (n) => (n > 0 ? `+${n} days` : `${n} days`),
  variationDraft: "Not submitted yet — nobody has been asked.",
  submittedByOn: (who, when) => `Submitted by ${who} · ${when}`,
  answeredByOn: (who, when) => `Answered by ${who} · ${when}`,
  awaitingAnAnswer: "Waiting for an answer",
  refuseNotSubmittedVariation: "That variation has not been submitted, so there is nothing to answer.",
  refuseAlreadyAnswered: "That variation has already been answered.",
  onlyApprovedCount: "Only approved variations move the contract value. A submitted one is a claim.",
  approve: "Approve",
  reject: "Reject",
  colClientBudget: "Client budget",
  colContact: "Contact",
  colIndustry: "Industry",
  colPhone: "Phone",
  noColumnsSelectedSales: "No columns are selected. Choose them in Sales → Settings.",
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
    "No service actions yet. Add them in Studio Settings → Service Actions before raising a ticket.",
  withoutInstallation: "Without installation",
  withoutProgramming: "Without programming",
  saveTicket: "Save ticket",

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
  changeColumns: "غير الأعمدة",
  colCity: "المدينة",
  loadingCustomer: "جار تحميل العميل…",
  customerNotFound: "هذا العميل لم يعد موجودا.",
  customerSince: "عميل منذ",
  clientCode: "الرمز",
  wonValue: "المربوح",
  contractValue: "قيمة العقود",
  openDeals: "الصفقات المفتوحة",
  decidedDeals: "المحسومة",
  noDealsForCustomer: "لم ترفع أي صفقة لهذا العميل.",
  noDecidedYet: "لم يحسم ربح أو خسارة بعد.",
  quotationsHeading: "عروض الأسعار",
  noQuotationsForCustomer: "لم يرفع أي عرض سعر لهذا العميل.",
  projectsHeading: "المشاريع",
  noProjectsForCustomer: "لم يفتح أي مشروع لهذا العميل.",
  contactsHeading: "جهات الاتصال",
  noContactsYet: "لا توجد جهات اتصال مسجلة.",
  sitesHeading: "المواقع",
  noSitesYet: "لا توجد مواقع مسجلة.",
  noContractsForCustomer: "لم يوقع أي عقد مع هذا العميل.",
  openCustomer: "فتح ملف العميل",
  agreedRates: "الأسعار المتفق عليها",
  agreedRatesSub: "ما يدفعه هذا العميل، مهما كان سعر القائمة. السعر هنا يسبق سعر بيع الصنف في كل عرض سعر يرفع له.",
  noRatesYet: "لا توجد أسعار متفق عليها مع هذا العميل.",
  editRates: "تعديل الأسعار",
  addRate: "إضافة سعر",
  rateItem: "الصنف",
  ratePrice: "السعر المتفق عليه",
  rateNote: "ملاحظة",
  listPriceIs: (v) => `سعر القائمة ${v}`,
  itemNoLongerExists: "لم يعد هذا الصنف موجودا",
  save: "حفظ",
  onlyTheCompany: "بيانات الشركة فقط، دون السجل التجاري",
  onlyTheCompanyBody: "الصفقات وعروض الأسعار والعقود والمشاريع يحتاج كل منها إلى صلاحية خاصة به. راجع المسؤول إن كان ينبغي أن تراها هنا.",
  pipeline: "مسار الصفقات",
  pipelineSub: "أين تقف كل صفقة مفتوحة، وكم يساوي المسار.",
  loadingPipeline: "جار تحميل مسار الصفقات…",
  noDealsYet: "لا توجد صفقات مفتوحة",
  noDealsYetBody: "تبدأ الصفقة بتذكرة. أنشئ واحدة وستظهر هنا في المرحلة التي بلغتها.",
  noDealsHere: "لا شيء في هذه المرحلة.",
  weighted: "القيمة المرجحة",
  notForecast: "خارج التوقع",
  openValue: "قيمة المفتوح",
  winRate: "نسبة الفوز",
  nDecided: (n) => `${n} محسومة`,
  nDaysHere: (n) => (n === 1 ? "يوم واحد هنا" : `${n} يوما هنا`),
  moveTo: "نقل إلى",
  moveDeal: "نقل",
  cancel: "إلغاء",
  whyLost: "لماذا خسرنا هذه الصفقة؟",
  whyLostHint: "مطلوب. هذا هو السجل الوحيد للسبب — والطريقة الوحيدة لمعرفة الأسباب عبر الصفقات لاحقا.",
  lostReasonLabel: "سبب الخسارة",
  refuseAlreadyClosed: "هذه الصفقة مغلقة بالفعل. الصفقة المغلقة سجل، وليست مرحلة يمكن نقلها منها.",
  refuseNoQuotation: "لا يوجد عرض سعر على هذه الصفقة بعد، وهذه المرحلة تعني أن لدى العميل عرضا.",
  refuseReasonRequired: "اذكر سبب الخسارة قبل الإغلاق.",
  overdue: "متأخرة",
  contracts: "العقود",
  contractsWhatWasAgreed: "ما تم الاتفاق عليه، وما تغير منذ ذلك.",
  loadingContracts: "جار تحميل العقود…",
  noContractsYet: "لا توجد عقود بعد",
  contractsAppearWhenQuotationWon: "العقد هو ما يصير إليه عرض السعر المربوح. وقع عقدا على صفقة وسيظهر هنا.",
  signedOn: "تاريخ التوقيع",
  variations: "التغييرات",
  noVariationsYet: "لا توجد تغييرات على هذا العقد.",
  nVariationsWaiting: (n) => `${n} بانتظار الرد`,
  cannotAnswerYourOwn: "أنت من قدم هذا التغيير، فيجيب عليه شخص آخر.",
  raiseVariation: "إضافة تغيير",
  editVariation: "تعديل التغيير",
  submitVariation: "إرسال للرد",
  variationTitle: "ما الذي يتغير",
  variationScope: "النطاق",
  variationValueDelta: "التغير في القيمة",
  variationValueDeltaHint: "بإشارة: سالب للحذف. وليس الإجمالي الجديد — تغييران يعتمدان بغير ترتيب يدعي كل منهما معرفته.",
  variationTimeDelta: "التغير في المدة (أيام)",
  variationTimeDeltaHint: "بإشارة، بالأيام. يحتفظ العقد بتاريخ نهايته؛ هذا ما يمنحه التغيير.",
  nDaysDelta: (n) => (n > 0 ? `+${n} يوم` : `${n} يوم`),
  variationDraft: "لم يرسل بعد — لم يسأل أحد.",
  submittedByOn: (who, when) => `قدمه ${who} · ${when}`,
  answeredByOn: (who, when) => `أجاب ${who} · ${when}`,
  awaitingAnAnswer: "بانتظار الرد",
  refuseNotSubmittedVariation: "لم يرسل هذا التغيير، فلا شيء يجاب عليه.",
  refuseAlreadyAnswered: "أجيب عن هذا التغيير بالفعل.",
  onlyApprovedCount: "لا تحرك قيمة العقد إلا التغييرات المعتمدة. المرسل مجرد مطالبة.",
  approve: "اعتماد",
  reject: "رفض",
  colClientBudget: "ميزانية العميل",
  colContact: "جهة الاتصال",
  colIndustry: "القطاع",
  colPhone: "الهاتف",
  noColumnsSelectedSales: "لم تختر أي أعمدة. اخترها في المبيعات ← الإعدادات.",
  salesDepartment: "المبيعات",
  loadingSales: "جار تحميل المبيعات…",
  errDuplicate: "يوجد عميل بهذا الاسم بالفعل.",
  errInUse: (n) => {
    const what =
      n === 1 ? "تذكرة واحدة"
      : n === 2 ? "تذكرتان"
      : n <= 10 ? `${n} تذاكر`
      : `${n} تذكرة`;
    return `لا يزال لدى هذا العميل ${what} — أعد إسنادها أو احذفها أولا.`;
  },
  errReadOnly: "لديك صلاحية عرض فقط على المبيعات.",
  errName: "أعطه اسما.",
  errClient: "حدد اسم العميل.",
  errDeadline: "الموعد النهائي مطلوب.",
  errIndustry: "نوع النشاط مطلوب.",
  errServices: "اختر خدمة واحدة على الأقل. أضفها من المبيعات ← الإعدادات.",
  errBudget: "يجب أن تكون ميزانية العميل رقما غير سالب.",
  errAlready: "هذه التذكرة مع القسم الفني بالفعل — يمكنك إرسالها مجددا بعد عودة عرض السعر.",
  errNoTechnical: "لا يوجد قسم فني في هذا الاستوديو لإرسال طلب عرض سعر إليه.",
  errRfqForbidden: "لا يسمح لك برفع طلب عرض سعر.",
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
  clientFormHint: "العميل شركة تبيع لها. الحقول المعلمة بـ * مطلوبة.",
  newTicket: "تذكرة جديدة",
  ticketFormHint: "الحقول المعلمة بـ * مطلوبة.",

  liveView: "العرض المباشر",
  liveViewLeadBefore: "جدول تذاكر بملء الشاشة يحدث نفسه. تضبط أعمدته من ",
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
  loadingTickets: "جار تحميل التذاكر",
  noTicketsMatch: "لا توجد تذاكر تطابق عوامل التصفية هذه.",
  openAction: "فتح",
  rfqRaisedCount: (n) => `${n} مرفوعة`,
  openNamed: (what) => `فتح ${what}`,

  clientsEmptyTitle: "لا يوجد عملاء بعد",
  clientsEmptyBody: "أضف الشركات التي تبيع لها. التذاكر، ثم عروض الأسعار والمشاريع، تتفرع منها.",
  searchClients: "ابحث بالاسم أو جهة الاتصال أو المدينة…",
  clientsLead: (shown, total) =>
    `عملاء أضيفوا هنا أو بتسمية عميل جديد في تذكرة. ${shown} من ${total}.`,
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
  uploadFailed: "تعذر رفع ذلك الشعار.",
  contactsTitle: "جهات الاتصال",
  contactsHelp: "الأشخاص الذين تتعامل معهم هناك. تضاف جهة اتصال التذكرة هنا تلقائيا.",
  addContact: "إضافة جهة اتصال",
  position: "المنصب",
  locationsTitle: "المواقع",
  locationsHelp: "المواقع التي يملكها هذا العميل. يضاف موقع التذكرة هنا أيضا.",
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
    return `عميل قائم — ${what} مسجلة.`;
  },
  clientHintNew: "الاسم غير المدرج في القائمة ينشئ عميلا جديدا.",
  valueQuotedHintBefore: "تضبط ",
  valueQuotedHintTerm: "القيمة المعروضة",
  valueQuotedHintAfter: " للتذكرة تلقائيا من أحدث عرض سعر لها.",
  probabilityOf: (pct) => `الاحتمال — ${pct}٪`,
  contactHeading: "جهة الاتصال",
  locationHeading: "الموقع",
  servicesHeading: "نوع الخدمات *",
  noServicesForTicket:
    "لا توجد إجراءات خدمة بعد. أضفها من إعدادات الاستوديو ← إجراءات الخدمة قبل رفع تذكرة.",
  withoutInstallation: "بدون تركيب",
  withoutProgramming: "بدون برمجة",
  saveTicket: "حفظ التذكرة",

  vocabularyTitle: "المفردات",
  vocabularyLead:
    "اقتراحات تعرض في نموذج التذكرة. هي تلميحات وليست قائمة مغلقة — يمكن كتابة أي شيء آخر.",
  citiesTitle: "المدن",
  citiesHelp: "تعرض ضمن موقع التذكرة.",
  positionsTitle: "مناصب جهات الاتصال",
  positionsHelp: "تعرض كمنصب لجهة الاتصال.",
  liveViewLead:
    "اختر أعمدة التذاكر التي يعرضها العرض المباشر. هذا إعداد مشترك — ينطبق على الجميع. ويبقى عمود واحد على الأقل.",
  saveColumns: "حفظ الأعمدة",
  settingsReadOnly: "لديك صلاحية عرض فقط على إعدادات المبيعات.",
  addAndEnter: "اكتب ثم اضغط Enter",
  removeNamed: (what) => `إزالة ${what}`,
};

const sales = { en, ar };

export function salesDict(locale: string): Strings {
  return sales[locale as Locale] || sales[defaultLocale];
}

// THE LIVE VIEW'S COLUMN NAMES, keyed by the column key the sub-section stores.
// The option list itself comes down from the API with its English labels; this
// is what turns one into words, and an unknown key keeps the label it arrived
// with so a new column shows before it is translated.
const LIVE_COLUMNS: Record<string, keyof Strings> = {
  ref: "colRef",
  title: "title",
  clientName: "client",
  status: "status",
  urgency: "urgency",
  industry: "colIndustry",
  deadline: "deadline",
  value: "colValueQuoted",
  clientBudget: "colClientBudget",
  contactName: "colContact",
  contactPhone: "colPhone",
  locationCity: "colCity",
  owner: "colOwner",
  probability: "colProbability",
  rfq: "colRfq",
  createdAt: "colCreated",
  updatedAt: "colUpdated",
};

export function liveColumnLabel(tr: Strings, key: string, stored: string): string {
  const k = LIVE_COLUMNS[key];
  const value = k ? tr[k] : undefined;
  return typeof value === "string" ? value : stored;
}
