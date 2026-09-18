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

  // ---- the lock --------------------------------------------------------------
  lock: "Lock",
  lockTitle: "Locked",
  lockBody: "Enter your PIN to carry on where you left off.",
  lockBodyIdle: "Locked after a while with no activity. Enter your PIN to carry on.",
  pinLabel: "PIN",
  unlock: "Unlock",
  unlocking: "Checking…",
  pinWrong: (left: number) => left === 1 ? "That PIN isn't right. 1 try left before you are signed out." : `That PIN isn't right. ${left} tries left before you are signed out.`,
  pinLockedOut: "Too many wrong PINs. You have been signed out.",
  signOutInstead: "Sign out instead",
  lockNeedsPin: "Set a PIN on your account's Security page to lock your screen.",
  openSecurity: "Open Security",
  dismiss: "Close",

  // ---- the Security page's lock block -----------------------------------------
  lockSectionTitle: "Screen lock",
  lockSectionBlurb: "Lock your screen when you step away, without signing out. Your PIN unlocks it; five wrong PINs sign you out. The same PIN is asked before you sign an approval.",
  pinSet: (when: string) => `PIN set ${when}`,
  pinNotSet: "No PIN set",
  setPin: "Set PIN",
  changePin: "Change PIN",
  removePin: "Remove PIN",
  newPin: "New PIN (4 to 8 digits)",
  confirmPin: "Repeat the PIN",
  accountPassword: "Your account password",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  pinMismatch: "The two PINs don't match.",
  pinFormat: "A PIN is 4 to 8 digits.",
  pinWeak: "Choose a PIN that isn't one digit repeated or a straight run like 1234.",
  pinIsPassword: "Your PIN can't be your password.",
  passwordWrong: "That password isn't right.",
  idleLabel: "Lock after inactivity",
  idleOff: "Off",
  idleMinutes: (m: number) => m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`,
  idleNeedsPin: "Set a PIN first.",
  somethingWrong: "Something went wrong. Try again.",

  // ---- the till's cashier switch ---------------------------------------------
  tillSignInTitle: (till: string) => `${till} — who is selling?`,
  whoIsSelling: "Cashier",
  takeOver: "Take over the till",
  switchCashier: "Switch cashier",
  signInWithEmail: "Sign in with email instead",
  pinLockedFor: "Too many wrong PINs. Try again in 15 minutes.",
  pinNotSetTill: "You have no PIN yet. Set one on your account's Security page, then come back.",
  noCashiers: "Nobody here may sell at this till yet.",
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

  lock: "قفل",
  lockTitle: "مقفل",
  lockBody: "أدخل رمزك الشخصي لتتابع من حيث توقفت.",
  lockBodyIdle: "تم القفل بعد فترة دون نشاط. أدخل رمزك الشخصي لتتابع.",
  pinLabel: "الرمز الشخصي",
  unlock: "فتح",
  unlocking: "جارٍ التحقق…",
  pinWrong: (left: number) => left === 1 ? "هذا الرمز غير صحيح. بقيت محاولة واحدة قبل تسجيل خروجك." : `هذا الرمز غير صحيح. بقيت ${left} محاولات قبل تسجيل خروجك.`,
  pinLockedOut: "رموز خاطئة كثيرة. تم تسجيل خروجك.",
  signOutInstead: "تسجيل الخروج بدلا من ذلك",
  lockNeedsPin: "عيّن رمزا شخصيا في صفحة الأمان في حسابك لتقفل شاشتك.",
  openSecurity: "فتح صفحة الأمان",
  dismiss: "إغلاق",

  lockSectionTitle: "قفل الشاشة",
  lockSectionBlurb: "اقفل شاشتك عندما تبتعد دون تسجيل الخروج. يفتحها رمزك الشخصي، وخمسة رموز خاطئة تسجّل خروجك. ويُطلب الرمز نفسه قبل توقيع أي موافقة.",
  pinSet: (when: string) => `عُيّن الرمز ${when}`,
  pinNotSet: "لم يُعيّن رمز",
  setPin: "تعيين الرمز",
  changePin: "تغيير الرمز",
  removePin: "إزالة الرمز",
  newPin: "رمز جديد (من 4 إلى 8 أرقام)",
  confirmPin: "أعد كتابة الرمز",
  accountPassword: "كلمة مرور حسابك",
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  pinMismatch: "الرمزان غير متطابقين.",
  pinFormat: "الرمز الشخصي من 4 إلى 8 أرقام.",
  pinWeak: "اختر رمزا ليس رقما مكررا ولا تسلسلا مثل 1234.",
  pinIsPassword: "لا يمكن أن يكون رمزك الشخصي هو كلمة مرورك.",
  passwordWrong: "كلمة المرور هذه غير صحيحة.",
  idleLabel: "القفل بعد عدم النشاط",
  idleOff: "إيقاف",
  idleMinutes: (m: number) => m < 60 ? `${m} دقيقة` : m === 60 ? "ساعة واحدة" : `${m / 60} ساعات`,
  idleNeedsPin: "عيّن رمزا شخصيا أولا.",
  somethingWrong: "حدث خطأ. حاول مرة أخرى.",

  tillSignInTitle: (till: string) => `${till} — من يبيع؟`,
  whoIsSelling: "الكاشير",
  takeOver: "استلام الصندوق",
  switchCashier: "تبديل الكاشير",
  signInWithEmail: "تسجيل الدخول بالبريد الإلكتروني بدلا من ذلك",
  pinLockedFor: "رموز خاطئة كثيرة. حاول مرة أخرى بعد 15 دقيقة.",
  pinNotSetTill: "ليس لديك رمز شخصي بعد. عيّنه في صفحة الأمان في حسابك ثم عد.",
  noCashiers: "لا يوجد أحد هنا يملك صلاحية البيع على هذا الصندوق بعد.",
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
