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
  accessSalesStudio: /* TR */ "You don't have access to Sales in this studio.",
  addComment: /* TR */ "Add a comment",
  askNova: /* TR */ "Ask Nova",
  askNova2: /* TR */ "Ask Nova…",
  back: /* TR */ "Back",
  backSales: /* TR */ "Back to Sales",
  backStudio: /* TR */ "Back to the studio",
  cancel: /* TR */ "Cancel",
  chatEnded: /* TR */ "This chat has ended.",
  city: /* TR */ "City",
  clientBudget: /* TR */ "Client budget",
  close: /* TR */ "Close",
  closeNova: /* TR */ "Close Nova",
  commentDidnSave: /* TR */ "That comment didn't save.",
  comments: /* TR */ "Comments",
  confirm: /* TR */ "Confirm",
  contactPerson: /* TR */ "Contact person",
  country: /* TR */ "Country",
  deadline: /* TR */ "Deadline",
  description: /* TR */ "Description",
  didnSave: /* TR */ "That didn't save.",
  didnSendTryAgain: /* TR */ "That didn't send. Try again.",
  edit: /* TR */ "Edit",
  email: /* TR */ "Email",
  fieldsMarkedRequired: /* TR */ "Fields marked * are required.",
  industry: /* TR */ "Industry",
  lastUpdated: /* TR */ "Last updated",
  latest: /* TR */ "Latest",
  loading: /* TR */ "Loading…",
  loadingTicket: /* TR */ "Loading ticket…",
  map: /* TR */ "Map",
  message: /* TR */ "Message",
  minimiseChat: /* TR */ "Minimise chat",
  noTicketsYet: /* TR */ "No tickets yet.",
  notNow: /* TR */ "Not now",
  nothingHereYet: /* TR */ "Nothing here yet",
  nothingSaidYet: /* TR */ "Nothing said yet.",
  nova: /* TR */ "Nova",
  novaThinking: /* TR */ "Nova is thinking…",
  number: /* TR */ "Number",
  openMap: /* TR */ "Open map",
  owner: /* TR */ "Owner",
  poNumberValueAnything: /* TR */ "PO number, value, anything Finance needs to authorise it",
  quotationApproved: /* TR */ "Quotation approved",
  quotations: /* TR */ "Quotations",
  rateNompany: /* TR */ "Rate nompany",
  reference: /* TR */ "Reference",
  salesLiveView: /* TR */ "Sales — Live view",
  send: /* TR */ "Send",
  sendLatestQuotationAppointed: /* TR */ "Send the latest quotation to the appointed Sales and Management approvers",
  site: /* TR */ "Site",
  status: /* TR */ "Status",
  studioAssistant: /* TR */ "Your studio assistant",
  submitPoFinance: /* TR */ "Submit PO to Finance",
  technicalTicketCanRequest: /* TR */ "Technical has this ticket. You can request another RFQ once the quotation comes back.",
  thankNoted: /* TR */ "Thank you — noted.",
  ticketCreated: /* TR */ "Ticket created",
  ticketInfo: /* TR */ "Ticket info",
  ticketNoLongerExists: /* TR */ "That ticket no longer exists.",
  ticketTimeline: /* TR */ "Ticket timeline",
  typeMessage: /* TR */ "Type a message…",
  urgency: /* TR */ "Urgency",
  valueQuoted: /* TR */ "Value Quoted",
  whatClientSentFinance: /* TR */ "What the client sent. Finance authorise it and issue the project number the work is billed under.",
};

const misc = { en, ar };

export function miscDict(locale: string): Strings {
  return misc[locale as Locale] || misc[defaultLocale];
}
