import { defaultLocale, type Locale } from "./locale";
import type { NoticeCategory } from "./notificationKinds";

// THE /account NOTIFICATIONS SCREEN'S OWN WORDS — email, push, quiet hours and
// devices. One module per surface; see ./studio/shell for why nothing may
// enumerate them.

type Strings = {
  nav: string;
  title: string;
  lead: string;
  bellAlways: string;
  emailTitle: string;
  emailModes: { off: string; instant: string; digest: string };
  emailHints: { off: string; instant: string; digest: string };
  channelsTitle: string;
  channelsLead: string;
  email: string;
  push: string;
  categories: Record<NoticeCategory, string>;
  quietTitle: string;
  quietLead: string;
  quietOn: string;
  from: string;
  to: string;
  timezone: (tz: string) => string;
  languageTitle: string;
  save: string;
  saving: string;
  saved: string;
  failed: string;
  // Push and devices.
  pushTitle: string;
  pushLead: string;
  pushEnable: string;
  pushEnabling: string;
  pushThisDevice: string;
  pushUnsupported: string;
  pushDenied: string;
  pushNotConfigured: string;
  pushIosHint: string;
  devicesTitle: string;
  devicesNone: string;
  deviceAdded: (when: string) => string;
  remove: string;
  testPush: string;
  testSent: string;
};

const en: Strings = {
  nav: "Notifications",
  title: "Notifications",
  lead: "Choose what reaches you outside the studio. These settings apply in every studio you belong to.",
  bellAlways: "Everything always appears in each studio's bell and notification centre.",
  emailTitle: "Email",
  emailModes: { off: "Off", instant: "Every notification", digest: "Daily summary" },
  emailHints: {
    off: "No email. You see everything in the bell.",
    instant: "An email as each notification arrives.",
    digest: "One email a day listing what you have not read yet. None on a day with nothing new.",
  },
  channelsTitle: "What to send",
  channelsLead: "Turn off a kind of notification for email or push. It still appears in the bell.",
  email: "Email",
  push: "Push",
  categories: {
    approvals: "Approvals",
    work: "Assigned to me",
    deals: "Sales",
    money: "Money",
    deadlines: "Deadlines",
    people: "People",
    system: "System",
  },
  quietTitle: "Quiet hours",
  quietLead: "No push notifications between these times. Email is not held back.",
  quietOn: "Use quiet hours",
  from: "From",
  to: "To",
  timezone: (tz) => `Your time zone: ${tz || "UTC"}`,
  languageTitle: "Language for email and push",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  failed: "Could not save. Try again.",
  pushTitle: "Push on this device",
  pushLead: "Get notifications on this phone or computer, even when nompany is closed.",
  pushEnable: "Turn on push for this device",
  pushEnabling: "Turning on…",
  pushThisDevice: "Push is on for this device.",
  pushUnsupported: "This browser cannot receive push notifications.",
  pushDenied: "Notifications are blocked for nompany in this browser's settings. Allow them there, then try again.",
  pushNotConfigured: "Push is not available yet.",
  pushIosHint: "On iPhone and iPad, add nompany to your Home Screen first: tap Share, then Add to Home Screen, and open it from there.",
  devicesTitle: "Your devices",
  devicesNone: "No device has push turned on.",
  deviceAdded: (when) => `Added ${when}`,
  remove: "Remove",
  testPush: "Send a test",
  testSent: "Test sent. It should arrive in a few seconds.",
};

const ar: Strings = {
  nav: "الإشعارات",
  title: "الإشعارات",
  lead: "اختر ما يصلك خارج الاستوديو. تنطبق هذه الإعدادات على كل استوديو تنتمي إليه.",
  bellAlways: "يظهر كل شيء دائمًا في جرس الإشعارات ومركز الإشعارات في كل استوديو.",
  emailTitle: "البريد الإلكتروني",
  emailModes: { off: "إيقاف", instant: "كل إشعار", digest: "ملخص يومي" },
  emailHints: {
    off: "لا بريد. ترى كل شيء في جرس الإشعارات.",
    instant: "رسالة بريد مع وصول كل إشعار.",
    digest: "رسالة واحدة يوميًا بما لم تقرأه بعد. لا شيء في يوم لا جديد فيه.",
  },
  channelsTitle: "ما يُرسل",
  channelsLead: "أوقف نوعًا من الإشعارات للبريد أو الإشعارات الفورية. سيظل ظاهرًا في الجرس.",
  email: "البريد",
  push: "فوري",
  categories: {
    approvals: "الموافقات",
    work: "المُسند إليّ",
    deals: "المبيعات",
    money: "المال",
    deadlines: "المواعيد النهائية",
    people: "الأشخاص",
    system: "النظام",
  },
  quietTitle: "ساعات الهدوء",
  quietLead: "لا إشعارات فورية بين هذين الوقتين. البريد لا يتأخر.",
  quietOn: "استخدم ساعات الهدوء",
  from: "من",
  to: "إلى",
  timezone: (tz) => `منطقتك الزمنية: ${tz || "UTC"}`,
  languageTitle: "لغة البريد والإشعارات الفورية",
  save: "حفظ",
  saving: "جار الحفظ…",
  saved: "حُفظ",
  failed: "تعذّر الحفظ. حاول مرة أخرى.",
  pushTitle: "الإشعارات الفورية على هذا الجهاز",
  pushLead: "تلقَّ الإشعارات على هذا الهاتف أو الحاسوب حتى عندما يكون nompany مغلقًا.",
  pushEnable: "فعّل الإشعارات الفورية لهذا الجهاز",
  pushEnabling: "جار التفعيل…",
  pushThisDevice: "الإشعارات الفورية مفعّلة لهذا الجهاز.",
  pushUnsupported: "لا يستطيع هذا المتصفح استقبال الإشعارات الفورية.",
  pushDenied: "الإشعارات محظورة لـ nompany في إعدادات هذا المتصفح. اسمح بها هناك ثم حاول مجددًا.",
  pushNotConfigured: "الإشعارات الفورية غير متاحة بعد.",
  pushIosHint: "على iPhone وiPad، أضف nompany إلى الشاشة الرئيسية أولًا: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتحه من هناك.",
  devicesTitle: "أجهزتك",
  devicesNone: "لا يوجد جهاز مفعّلة عليه الإشعارات الفورية.",
  deviceAdded: (when) => `أُضيف ${when}`,
  remove: "إزالة",
  testPush: "أرسل تجربة",
  testSent: "أُرسلت التجربة. يجب أن تصل خلال ثوانٍ.",
};

const dict = { en, ar };

export const notificationSettingsDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
