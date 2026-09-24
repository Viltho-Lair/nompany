import { defaultLocale } from "../locale";

// THE UPGRADE DIALOG'S WORDS — shared by the studio header and the account
// page's studio list, which open the same dialog (the owner, 24/09/2026). One
// module per surface, like every dictionary here; this surface is the dialog.
//
// Package, band and tier NAMES are not here: they are the catalogue's, typed in
// /super, and shown as stored.

type Strings = {
  button: string;
  title: (studio: string) => string;
  lead: string;
  current: (pkg: string) => string;
  noPackages: string;
  band: string;
  tier: string;
  noTier: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  seats: (n: number) => string;
  unlimitedSeats: string;
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
  asked: string;
};

const en: Strings = {
  button: "Upgrade",
  title: (studio) => `Upgrade ${studio}`,
  lead: "Choose the package to pay for. nompany sends you the payment details; the package applies as soon as the payment arrives.",
  current: (pkg) => `Now on ${pkg}.`,
  noPackages: "No packages are on sale in your region yet. Contact nompany to upgrade.",
  band: "Team size",
  tier: "Tier",
  noTier: "No tier",
  monthly: "Monthly",
  yearly: "Yearly",
  perMonth: "per month",
  perYear: "per year",
  seats: (n) => `Up to ${n} people`,
  unlimitedSeats: "No limit on people",
  subtotal: "Price",
  tax: (pct) => `Sales tax (${pct}%)`,
  total: "Total",
  send: "Request this upgrade",
  sending: "Sending…",
  pending: (when) => `You asked for this on ${when}.`,
  pendingNote: "nompany will send you the payment details. The package applies as soon as the payment arrives.",
  change: "Change it",
  withdraw: "Withdraw the request",
  close: "Close",
  failed: "That didn't go through. Try again.",
  asked: "The package you picked when you signed up is selected.",
};

const ar: Strings = {
  button: "ترقية",
  title: (studio) => `ترقية ${studio}`,
  lead: "اختر الباقة التي تريد الدفع مقابلها. ترسل لك nompany تفاصيل الدفع، وتُطبق الباقة فور وصول الدفعة.",
  current: (pkg) => `الباقة الحالية: ${pkg}.`,
  noPackages: "لا توجد باقات معروضة في منطقتك بعد. تواصل مع nompany للترقية.",
  band: "حجم الفريق",
  tier: "المستوى",
  noTier: "بلا مستوى",
  monthly: "شهري",
  yearly: "سنوي",
  perMonth: "شهريا",
  perYear: "سنويا",
  seats: (n) => `حتى ${n} أشخاص`,
  unlimitedSeats: "عدد غير محدود من الأشخاص",
  subtotal: "السعر",
  tax: (pct) => `ضريبة المبيعات (${pct}%)`,
  total: "الإجمالي",
  send: "اطلب هذه الترقية",
  sending: "جار الإرسال…",
  pending: (when) => `طلبت هذه الترقية في ${when}.`,
  pendingNote: "سترسل لك nompany تفاصيل الدفع، وتُطبق الباقة فور وصول الدفعة.",
  change: "غيّرها",
  withdraw: "اسحب الطلب",
  close: "إغلاق",
  failed: "لم يتم ذلك. حاول مرة أخرى.",
  asked: "تم اختيار الباقة التي اخترتها عند التسجيل.",
};

export function upgradeDict(locale: string): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
