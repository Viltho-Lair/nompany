import { defaultLocale } from "../locale";

// THE UPGRADE DIALOG'S WORDS — shared by the studio header and the account
// page's studio list, which open the same dialog (the owner, 24/09/2026). One
// module per surface, like every dictionary here; this surface is the dialog.
//
// Package, band and tier NAMES are not here: they are the catalogue's, typed in
// /super, and shown as stored.
//
// THE OWNER CHOOSES A SEAT COUNT (12/10/2026), so the band pills became a seat
// field, and the price is shown band by band.

type Strings = {
  button: string;
  title: (studio: string) => string;
  lead: string;
  current: (pkg: string) => string;
  noPackages: string;
  seatsLabel: string;
  seatsHint: (min: number, max: number, members: number) => string;
  seatLine: (label: string, n: number) => string;
  tierLine: string;
  refusal: Record<string, string>;
  tier: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  seats: (n: number) => string;
  subtotal: string;
  tax: (pct: number) => string;
  total: string;
  send: string;
  sending: string;
  pending: (when: string) => string;
  pendingNote: string;
  change: string;
  withdraw: string;
  close: string;
  failed: string;
  retry: string;
  asked: string;
  /** The account page's link to the studio's full export. */
  download: string;
};

const en: Strings = {
  button: "Upgrade",
  title: (studio) => `Upgrade ${studio}`,
  lead: "Choose the package and how many people need access. You pay for those seats only, by bank transfer; the plan applies as soon as the payment arrives.",
  current: (pkg) => `Now on ${pkg}.`,
  noPackages: "No packages are on sale in your region yet. Contact Sitta to upgrade.",
  seatsLabel: "Seats",
  seatsHint: (min, max, members) => `${max ? `${min} to ${max} seats` : `${min} seats or more`}. You have ${members} ${members === 1 ? "person" : "people"} in the studio now. You can add seats later, or lower them from the next renewal.`,
  seatLine: (label, n) => `Seats ${label} · ${n}`,
  tierLine: "Tier",
  refusal: {
    "below-minimum": "That is fewer seats than this package sells.",
    "above-maximum": "That is more seats than this package sells. Contact Sitta for a larger plan.",
    "fewer-than-members": "You have more people in the studio than that. Remove people first, or choose more seats.",
    "claim-open": "You told us about a transfer we haven't checked yet. Wait for our answer before changing the plan.",
    "renewal-open": "Your renewal is waiting to be paid. Pay it first; you can change seats from your billing page.",
  },
  tier: "Tier",
  monthly: "Monthly",
  yearly: "Yearly",
  perMonth: "per month",
  perYear: "per year",
  seats: (n) => `${n} ${n === 1 ? "seat" : "seats"}`,
  subtotal: "Price",
  tax: (pct) => `Sales tax (${pct}%)`,
  total: "Total",
  send: "Request this plan",
  sending: "Sending…",
  pending: (when) => `You asked for this on ${when}.`,
  pendingNote: "The package applies as soon as your payment arrives.",
  change: "Change it",
  withdraw: "Withdraw the request",
  close: "Close",
  failed: "That didn't go through. Try again.",
  retry: "Try again",
  asked: "The package you picked when you signed up is selected.",
  download: "Download everything",
};

const ar: Strings = {
  button: "ترقية",
  title: (studio) => `ترقية ${studio}`,
  lead: "اختر الباقة وعدد الأشخاص الذين يحتاجون إلى الدخول. تدفع مقابل هذه المقاعد فقط، بحوالة بنكية، وتُطبق الخطة فور وصول الدفعة.",
  current: (pkg) => `الباقة الحالية: ${pkg}.`,
  noPackages: "لا توجد باقات معروضة في منطقتك بعد. تواصل مع ستة للترقية.",
  seatsLabel: "المقاعد",
  seatsHint: (min, max, members) => `${max ? `من ${min} إلى ${max} مقعدًا` : `${min} مقعدًا أو أكثر`}. لديك الآن ${members} ${members === 1 ? "شخص" : "أشخاص"} في الاستوديو. يمكنك إضافة مقاعد لاحقًا، أو تقليلها ابتداءً من التجديد التالي.`,
  seatLine: (label, n) => `المقاعد ${label} · ${n}`,
  tierLine: "المستوى",
  refusal: {
    "below-minimum": "هذا أقل من عدد المقاعد الذي تبيعه هذه الباقة.",
    "above-maximum": "هذا أكثر من عدد المقاعد الذي تبيعه هذه الباقة. تواصل مع ستة لخطة أكبر.",
    "fewer-than-members": "لديك أشخاص في الاستوديو أكثر من هذا العدد. أزل بعضهم أولًا، أو اختر مقاعد أكثر.",
    "claim-open": "أخبرتنا بحوالة لم نتحقق منها بعد. انتظر ردنا قبل تغيير الخطة.",
    "renewal-open": "تجديدك بانتظار الدفع. ادفعه أولًا، ويمكنك تغيير المقاعد من صفحة الفوترة.",
  },
  tier: "المستوى",
  monthly: "شهري",
  yearly: "سنوي",
  perMonth: "شهريا",
  perYear: "سنويا",
  seats: (n) => `${n} ${n === 1 ? "مقعد" : "مقاعد"}`,
  subtotal: "السعر",
  tax: (pct) => `ضريبة المبيعات (${pct}%)`,
  total: "الإجمالي",
  send: "اطلب هذه الخطة",
  sending: "جار الإرسال…",
  pending: (when) => `طلبت هذه الترقية في ${when}.`,
  pendingNote: "تُطبق الباقة فور وصول دفعتك.",
  change: "غيّرها",
  withdraw: "اسحب الطلب",
  close: "إغلاق",
  failed: "لم يتم ذلك. حاول مرة أخرى.",
  retry: "حاول مرة أخرى",
  asked: "تم اختيار الباقة التي اخترتها عند التسجيل.",
  download: "تنزيل كل البيانات",
};

export function upgradeDict(locale: string): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
