import { defaultLocale, type Locale } from "../locale";

// THE TREASURY'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// A CHEQUE'S STATE AND A GUARANTEE'S ARE STORED TOKENS translated on display,
// the rule every status in the product follows.

type Strings = {
  tab: string;
  forecast: string;
  week: string;
  moneyIn: string;
  moneyOut: string;
  closing: string;
  cheques: string;
  noCheques: string;
  addCheque: string;
  direction: string;
  incoming: string;
  outgoing: string;
  party: string;
  number: string;
  amount: string;
  dueOn: string;
  deposit: string;
  cleared: string;
  bounced: string;
  guarantees: string;
  noGuarantees: string;
  addGuarantee: string;
  reference: string;
  beneficiary: string;
  margin: string;
  expiresOn: string;
  release: string;
  save: string;
  cancel: string;
  forecastLead: (opening: string) => string;
  goesUnder: (day: string, amount: string) => string;
  staysAbove: (weeks: number) => string;
  locked: (margin: string, amount: string, count: number) => string;
  status: (token: string) => string;
  state: (token: string) => string;
  problem: (code: string) => string;
};

const EN_CHEQUE: Record<string, string> = {
  held: "Held", deposited: "Deposited", cleared: "Cleared", bounced: "Bounced", returned: "Returned",
};
const EN_STATE: Record<string, string> = {
  live: "Live", expiring: "Expiring", expired: "Expired", released: "Released",
};

const en: Strings = {
  tab: "Treasury",
  forecast: "Where the bank balance is going",
  week: "Week of",
  moneyIn: "In",
  moneyOut: "Out",
  closing: "Balance",
  cheques: "Post-dated cheques",
  noCheques: "No cheques recorded.",
  addCheque: "Add a cheque",
  direction: "Direction",
  incoming: "Coming in",
  outgoing: "Going out",
  party: "From or to",
  number: "Cheque number",
  amount: "Amount",
  dueOn: "Dated",
  deposit: "Deposit",
  cleared: "Cleared",
  bounced: "Bounced",
  guarantees: "Letters of guarantee",
  noGuarantees: "No guarantees recorded.",
  addGuarantee: "Add a guarantee",
  reference: "Reference",
  beneficiary: "In favour of",
  margin: "Cash margin",
  expiresOn: "Expires",
  release: "Mark released",
  save: "Save",
  cancel: "Cancel",
  forecastLead: (opening) => `Starting from ${opening} in the bank, walked forward through what is due. Anything already overdue is in the first week.`,
  goesUnder: (day, amount) => `The account goes under in the week of ${day}, at ${amount}.`,
  // NOT "you are fine": it says only that nothing in the horizon takes the
  // account negative, which is a different statement.
  staysAbove: (weeks) => `Nothing in the next ${weeks} weeks takes the account under.`,
  locked: (margin, amount, count) =>
    (count === 0 ? "Nothing held at the bank." : `${margin} held against ${amount} of guarantees (${count}).`),
  status: (t) => EN_CHEQUE[t] || t,
  state: (t) => EN_STATE[t] || t,
  problem: (code) => (
    code === "transition" ? "A cheque cannot go there from where it is."
      : code === "already-released" ? "That guarantee is already released."
        : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_CHEQUE: Record<string, string> = {
  held: "محتفظ به", deposited: "مودع", cleared: "محصل", bounced: "مرتجع", returned: "معاد",
};
const AR_STATE: Record<string, string> = {
  live: "ساري", expiring: "يقترب من الانتهاء", expired: "منتهي", released: "محرر",
};

const ar: Strings = {
  tab: "الخزينة",
  forecast: "الى أين يتجه رصيد البنك",
  week: "أسبوع",
  moneyIn: "وارد",
  moneyOut: "صادر",
  closing: "الرصيد",
  cheques: "شيكات آجلة",
  noCheques: "لا توجد شيكات مسجلة.",
  addCheque: "إضافة شيك",
  direction: "الاتجاه",
  incoming: "وارد",
  outgoing: "صادر",
  party: "من أو الى",
  number: "رقم الشيك",
  amount: "المبلغ",
  dueOn: "التاريخ",
  deposit: "ايداع",
  cleared: "محصل",
  bounced: "مرتجع",
  guarantees: "كفالات بنكية",
  noGuarantees: "لا توجد كفالات مسجلة.",
  addGuarantee: "إضافة كفالة",
  reference: "الرقم",
  beneficiary: "لصالح",
  margin: "التأمين النقدي",
  expiresOn: "تنتهي",
  release: "تعليم كمحررة",
  save: "حفظ",
  cancel: "الغاء",
  forecastLead: (opening) => `بدءا من ${opening} في البنك، محسوبة الى الأمام وفق ما هو مستحق. وكل ما تأخر مدرج في الأسبوع الأول.`,
  goesUnder: (day, amount) => `الحساب يهبط تحت الصفر في أسبوع ${day}، عند ${amount}.`,
  staysAbove: (weeks) => `لا شيء في الأسابيع ${weeks} القادمة يهبط بالحساب تحت الصفر.`,
  locked: (margin, amount, count) =>
    (count === 0 ? "لا شيء محتجز لدى البنك." : `${margin} محتجزة مقابل ${amount} من الكفالات (${count}).`),
  status: (t) => AR_CHEQUE[t] || t,
  state: (t) => AR_STATE[t] || t,
  problem: (code) => (
    code === "transition" ? "الشيك لا ينتقل الى هناك من حالته الحالية."
      : code === "already-released" ? "هذه الكفالة محررة بالفعل."
        : code || ""),
};

const dict = { en, ar };

export function treasuryDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as TreasuryStrings };
