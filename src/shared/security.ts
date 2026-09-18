import { defaultLocale, type Locale } from "./locale";
import type { DeviceType } from "./deviceClass";

// THE SECURITY SURFACES' WORDS — device types, the session limit, the lock
// screen, the PIN, two-factor sign-in and the till's cashier switch. One module
// for the lot because they are read together: the account's Security page, the
// sign-in steps and the lock overlay all speak about the same few things, and
// a phrase that differs between them reads as two different features.
//
// Both locales are keys of one typed object, so a string missing from Arabic
// is a compile error rather than an English word in an Arabic session.

const en = {
  deviceType: {
    Computer: "Computer",
    Phone: "Phone",
    "Portable Device": "Portable Device",
  } as Record<DeviceType, string>,

  // ---- the session limit ----------------------------------------------------
  limitRule: "Your account can be signed in on 2 computers and 1 phone or portable device at a time.",
  chooseTitle: "You're signed in on too many devices",
  chooseBody: "Choose a session to sign out, so this device can sign in.",
  chooseOne: "Sign it out and continue",
  chooseCancel: "Cancel",
  chooseExpired: "That sign-in took too long. Sign in again.",
  signedInOn: (when: string) => `Signed in ${when}`,
  lastActive: (when: string) => `Last active ${when}`,
  endedElsewhere: (where: string) => where
    ? `You were signed out because this account signed in on another device (${where}).`
    : "You were signed out because this account signed in on another device.",
  endedByYou: "This session was signed out from another of your devices.",
  endedGeneric: "This session was signed out.",

  // ---- the Security page's session list --------------------------------------
  sessionsTitle: "Where you're signed in",
  thisSession: "This session",
  tillSession: "Till",
  signOutSession: "Sign out",
  signingOut: "Signing out…",
  unknownDevice: "Unknown device",

  // ---- the trusted-device cap ------------------------------------------------
  trustLimit: "Up to 3 devices can be trusted at once.",
  trustFullTitle: "This device wasn't trusted",
  trustFullBody: "You already trust 3 devices, so this one will ask for a code next time. To trust it, remove one on your account's Security page.",
  continueLabel: "Continue",
};

const ar: typeof en = {
  deviceType: {
    Computer: "حاسوب",
    Phone: "هاتف",
    "Portable Device": "جهاز محمول",
  },

  limitRule: "يمكن أن يكون حسابك مسجلا الدخول على حاسوبين وهاتف أو جهاز محمول واحد في الوقت نفسه.",
  chooseTitle: "أنت مسجل الدخول على أجهزة كثيرة",
  chooseBody: "اختر جلسة لتسجيل الخروج منها، حتى يتمكن هذا الجهاز من تسجيل الدخول.",
  chooseOne: "سجّل خروجها وتابع",
  chooseCancel: "إلغاء",
  chooseExpired: "استغرق تسجيل الدخول وقتا طويلا. سجّل الدخول مرة أخرى.",
  signedInOn: (when: string) => `سُجّل الدخول ${when}`,
  lastActive: (when: string) => `آخر نشاط ${when}`,
  endedElsewhere: (where: string) => where
    ? `تم تسجيل خروجك لأن هذا الحساب سجّل الدخول على جهاز آخر (${where}).`
    : "تم تسجيل خروجك لأن هذا الحساب سجّل الدخول على جهاز آخر.",
  endedByYou: "تم تسجيل خروج هذه الجلسة من جهاز آخر من أجهزتك.",
  endedGeneric: "تم تسجيل خروج هذه الجلسة.",

  sessionsTitle: "أين أنت مسجل الدخول",
  thisSession: "هذه الجلسة",
  tillSession: "نقطة بيع",
  signOutSession: "تسجيل الخروج",
  signingOut: "جارٍ تسجيل الخروج…",
  unknownDevice: "جهاز غير معروف",

  trustLimit: "يمكن الوثوق بثلاثة أجهزة كحد أقصى في الوقت نفسه.",
  trustFullTitle: "لم يتم الوثوق بهذا الجهاز",
  trustFullBody: "أنت تثق بثلاثة أجهزة بالفعل، لذا سيطلب هذا الجهاز رمزا في المرة القادمة. لتثق به، أزل جهازا من صفحة الأمان في حسابك.",
  continueLabel: "متابعة",
};

const dict = { en, ar } as const;

export type SecurityStrings = typeof en;

export function securityDict(locale: string): SecurityStrings {
  return dict[locale as Locale] || dict[defaultLocale];
}

/** What the sign-in page says about a session that was ended. */
export function endedMessage(t: SecurityStrings, ended: { reason?: string; byLabel?: string } | null | undefined) {
  if (!ended) return "";
  if (ended.reason === "signed-in-elsewhere") return t.endedElsewhere(ended.byLabel || "");
  if (ended.reason === "ended-by-you") return t.endedByYou;
  return t.endedGeneric;
}
