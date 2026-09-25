import { defaultLocale } from "../locale";

// THE OWNER'S BILLING WORDS — the Billing page on /account and the payment
// step of the upgrade dialog, which show the same transfer panel (26/09/2026).
// One module per surface, like every dictionary here. Package, band and tier
// names are the catalogue's and are shown as stored; bank details are
// nompany's and are never translated.

type Strings = {
  nav: string;
  title: string;
  lead: string;
  pickStudio: string;
  noStudios: string;
  loading: string;
  failed: string;
  // status
  statusTitle: string;
  status: Record<string, string>;
  paidUntil: (d: string) => string;
  freeUntil: (d: string) => string;
  closesOn: (d: string) => string;
  shutsDownOn: (d: string) => string;
  onPlan: (pkg: string) => string;
  held: (until: string) => string;
  // paying
  payTitle: string;
  toPay: string;
  forPlan: (plan: string, cycle: string) => string;
  monthly: string;
  yearly: string;
  noRequest: string;
  bankTitle: string;
  accountName: string;
  bankName: string;
  iban: string;
  swift: string;
  bankAddress: string;
  currency: (c: string) => string;
  anyCurrency: string;
  reference: string;
  referenceHint: string;
  copy: string;
  copied: string;
  noMethods: string;
  cardLater: string;
  // claiming
  claimTitle: string;
  claimLead: (hours: number) => string;
  amount: string;
  sentOn: string;
  bankReference: string;
  bankReferenceHint: string;
  payerName: string;
  note: string;
  claimSend: string;
  sending: string;
  pendingTitle: string;
  pendingBody: (amount: string, sentOn: string, hours: number) => string;
  withdraw: string;
  refusal: Record<string, string>;
  // history
  claimsTitle: string;
  claimKind: { transfer: string; refund: (no: string) => string };
  claimStatus: Record<string, string>;
  noClaims: string;
  // documents
  docsTitle: string;
  invoice: string;
  creditNote: string;
  open: string;
  noDocs: string;
  askRefund: string;
  refundReason: string;
  refundSend: string;
  cancel: string;
  // profile
  profileTitle: string;
  profileLead: string;
  profileName: string;
  profileAddress: string;
  profileCountry: string;
  profileTax: string;
  profileEmail: string;
  save: string;
  saved: string;
  // the studio's banner
  checking: string;
};

const en: Strings = {
  nav: "Billing",
  title: "Billing",
  lead: "What each of your studios is on, how to pay for it, and your invoices from nompany.",
  pickStudio: "Studio",
  noStudios: "You don't own a studio yet.",
  loading: "Loading…",
  failed: "That didn't go through. Try again.",
  statusTitle: "Subscription",
  status: {
    trial: "Standard, free period", active: "Paid", complimentary: "Complimentary",
    due: "Payment due", closed: "Closed", cancelled: "Cancelled", shut_down: "Shut down", expired: "Due for deletion",
  },
  paidUntil: (d) => `Paid until ${d}.`,
  freeUntil: (d) => `The free period ends on ${d}.`,
  closesOn: (d) => `If it isn't paid, it closes on ${d}.`,
  shutsDownOn: (d) => `If it isn't paid, it shuts down on ${d}.`,
  onPlan: (pkg) => `Package: ${pkg}`,
  held: (until) => `We're checking your transfer. The studio keeps working as normal until ${until} while we do.`,
  payTitle: "Pay by bank transfer",
  toPay: "Amount to pay",
  forPlan: (plan, cycle) => `For ${plan}, ${cycle}, tax included.`,
  monthly: "monthly",
  yearly: "yearly",
  noRequest: "Choose a package with the Upgrade button to see the exact amount. To renew what you're on, pay the amount on your last invoice.",
  bankTitle: "Send the transfer to",
  accountName: "Account name",
  bankName: "Bank",
  iban: "IBAN",
  swift: "SWIFT / BIC",
  bankAddress: "Bank address",
  currency: (c) => `For payments in ${c}`,
  anyCurrency: "For payments in any currency",
  reference: "Transfer reference",
  referenceHint: "Write this in the transfer's reference or message so we can find it.",
  copy: "Copy",
  copied: "Copied",
  noMethods: "Payment details aren't available yet. Contact nompany to pay.",
  cardLater: "Card payments are coming later.",
  claimTitle: "I've sent the transfer",
  claimLead: (hours) => `Tell us once the transfer has gone. Transfers usually take 1–24 hours to arrive; while we check, your studio keeps working for up to ${hours} hours.`,
  amount: "Amount sent",
  sentOn: "Date sent",
  bankReference: "Bank reference",
  bankReferenceHint: "The reference or transaction number your bank gave you.",
  payerName: "Sent from (account holder)",
  note: "Anything we should know (optional)",
  claimSend: "Tell nompany",
  sending: "Sending…",
  pendingTitle: "We're checking your transfer",
  pendingBody: (amount, sentOn, hours) => `You told us you sent ${amount} on ${sentOn}. We'll email you as soon as it's matched. Your studio keeps working for up to ${hours} hours from when you told us.`,
  withdraw: "I made a mistake — withdraw this",
  refusal: {
    "bad-amount": "Enter the amount you sent.",
    "bad-currency": "Enter the currency as a three-letter code, like USD.",
    "bad-date": "Enter the day you sent it — not in the future, and within the last 60 days.",
    "missing-reference": "Enter your bank's reference for the transfer.",
    "claim-open": "You already told us about a transfer. We'll answer that one first.",
    "missing-reason": "Tell us why, in a few words.",
    "already-refunded": "This invoice has already been refunded.",
    "unknown-invoice": "That invoice isn't on this studio.",
    answered: "nompany has already answered this.",
  },
  claimsTitle: "Payments and requests",
  claimKind: { transfer: "Bank transfer", refund: (no) => `Refund of ${no}` },
  claimStatus: {
    pending: "Being checked", confirmed: "Received", rejected: "Not matched", withdrawn: "Withdrawn",
    refunded: "Refunded", declined: "Declined",
  },
  noClaims: "Nothing yet.",
  docsTitle: "Invoices and credit notes",
  invoice: "Invoice",
  creditNote: "Credit note",
  open: "Open",
  noDocs: "No invoices yet. nompany issues one when your payment arrives.",
  askRefund: "Ask for a refund",
  refundReason: "Why do you want a refund?",
  refundSend: "Send the request",
  cancel: "Cancel",
  profileTitle: "Billing details",
  profileLead: "Printed on invoices issued from now on. Leave blank to use the studio's name.",
  profileName: "Company name",
  profileAddress: "Address",
  profileCountry: "Country code",
  profileTax: "Tax number",
  profileEmail: "Invoice email",
  save: "Save",
  saved: "Saved.",
  checking: "We're checking your transfer. Everything keeps working while we do; we'll email you once it's matched.",
};

const ar: Strings = {
  nav: "الفوترة",
  title: "الفوترة",
  lead: "باقة كل منشأة تملكها، وطريقة الدفع، وفواتيرك من nompany.",
  pickStudio: "المنشأة",
  noStudios: "لا تملك منشأة بعد.",
  loading: "جار التحميل…",
  failed: "لم يتم ذلك. حاول مرة أخرى.",
  statusTitle: "الاشتراك",
  status: {
    trial: "Standard، الفترة المجانية", active: "مدفوع", complimentary: "مجاني من nompany",
    due: "الدفع مستحق", closed: "مغلقة", cancelled: "ملغاة", shut_down: "متوقفة", expired: "مستحقة للحذف",
  },
  paidUntil: (d) => `مدفوعة حتى ${d}.`,
  freeUntil: (d) => `تنتهي الفترة المجانية في ${d}.`,
  closesOn: (d) => `إن لم تُدفع تُغلق في ${d}.`,
  shutsDownOn: (d) => `إن لم تُدفع تتوقف في ${d}.`,
  onPlan: (pkg) => `الباقة: ${pkg}`,
  held: (until) => `نراجع حوالتك الآن. تبقى المنشأة تعمل كالمعتاد حتى ${until} أثناء المراجعة.`,
  payTitle: "الدفع بحوالة بنكية",
  toPay: "المبلغ المطلوب",
  forPlan: (plan, cycle) => `مقابل ${plan}، ${cycle}، شامل الضريبة.`,
  monthly: "شهري",
  yearly: "سنوي",
  noRequest: "اختر باقة من زر الترقية لترى المبلغ بالضبط. لتجديد باقتك الحالية، ادفع المبلغ الوارد في آخر فاتورة.",
  bankTitle: "أرسل الحوالة إلى",
  accountName: "اسم الحساب",
  bankName: "البنك",
  iban: "IBAN",
  swift: "SWIFT / BIC",
  bankAddress: "عنوان البنك",
  currency: (c) => `للدفعات بعملة ${c}`,
  anyCurrency: "للدفعات بأي عملة",
  reference: "مرجع الحوالة",
  referenceHint: "اكتبه في مرجع الحوالة أو رسالتها لنتمكن من إيجادها.",
  copy: "نسخ",
  copied: "تم النسخ",
  noMethods: "تفاصيل الدفع غير متاحة بعد. تواصل مع nompany للدفع.",
  cardLater: "الدفع بالبطاقة قادم لاحقا.",
  claimTitle: "أرسلت الحوالة",
  claimLead: (hours) => `أخبرنا بعد إرسال الحوالة. تصل الحوالات عادة خلال 1–24 ساعة؛ وأثناء مراجعتنا تبقى منشأتك تعمل لمدة أقصاها ${hours} ساعة.`,
  amount: "المبلغ المرسل",
  sentOn: "تاريخ الإرسال",
  bankReference: "مرجع البنك",
  bankReferenceHint: "رقم المرجع أو العملية الذي أعطاك إياه البنك.",
  payerName: "أُرسلت من (صاحب الحساب)",
  note: "أي شيء نحتاج معرفته (اختياري)",
  claimSend: "أبلغ nompany",
  sending: "جار الإرسال…",
  pendingTitle: "نراجع حوالتك",
  pendingBody: (amount, sentOn, hours) => `أخبرتنا أنك أرسلت ${amount} في ${sentOn}. سنراسلك فور مطابقتها. تبقى منشأتك تعمل لمدة أقصاها ${hours} ساعة من وقت إبلاغنا.`,
  withdraw: "أخطأت — اسحب هذا البلاغ",
  refusal: {
    "bad-amount": "أدخل المبلغ الذي أرسلته.",
    "bad-currency": "أدخل العملة برمز من ثلاثة أحرف، مثل USD.",
    "bad-date": "أدخل يوم الإرسال — ليس في المستقبل، وخلال آخر 60 يوما.",
    "missing-reference": "أدخل مرجع البنك للحوالة.",
    "claim-open": "أبلغتنا بحوالة من قبل. سنجيب عنها أولا.",
    "missing-reason": "أخبرنا بالسبب في بضع كلمات.",
    "already-refunded": "تم استرداد هذه الفاتورة من قبل.",
    "unknown-invoice": "هذه الفاتورة ليست لهذه المنشأة.",
    answered: "أجابت nompany عن هذا من قبل.",
  },
  claimsTitle: "الدفعات والطلبات",
  claimKind: { transfer: "حوالة بنكية", refund: (no) => `استرداد ${no}` },
  claimStatus: {
    pending: "قيد المراجعة", confirmed: "تم الاستلام", rejected: "لم تتم المطابقة", withdrawn: "مسحوب",
    refunded: "تم الاسترداد", declined: "مرفوض",
  },
  noClaims: "لا شيء بعد.",
  docsTitle: "الفواتير وإشعارات الدائن",
  invoice: "فاتورة",
  creditNote: "إشعار دائن",
  open: "فتح",
  noDocs: "لا توجد فواتير بعد. تصدر nompany الفاتورة عند وصول دفعتك.",
  askRefund: "اطلب استردادا",
  refundReason: "لماذا تريد الاسترداد؟",
  refundSend: "أرسل الطلب",
  cancel: "إلغاء",
  profileTitle: "بيانات الفوترة",
  profileLead: "تُطبع على الفواتير الصادرة من الآن. اتركها فارغة لاستخدام اسم المنشأة.",
  profileName: "اسم الشركة",
  profileAddress: "العنوان",
  profileCountry: "رمز الدولة",
  profileTax: "الرقم الضريبي",
  profileEmail: "بريد الفواتير",
  save: "حفظ",
  saved: "تم الحفظ.",
  checking: "نراجع حوالتك الآن. يبقى كل شيء يعمل أثناء المراجعة، وسنراسلك فور مطابقتها.",
};

export function billingDict(locale: string): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
