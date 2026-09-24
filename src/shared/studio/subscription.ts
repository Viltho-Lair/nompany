import { defaultLocale } from "../locale";

// WHAT A STUDIO IS TOLD ABOUT ITS OWN SUBSCRIPTION — the banner above every
// screen while payment is due, the studio is closed or Standard's free months
// are ending, and the screen that replaces the studio once it is shut down (the
// owner's ladder, 24/09/2026: closed at 20 days unpaid, shut down at 90,
// deleted at 365). One module per surface, like every studio dictionary.
//
// DATES ARRIVE ALREADY FORMATTED, so the words never guess at a calendar.

type Strings = {
  trialEnding: (end: string) => string;
  due: (closes: string) => string;
  closed: (shutsDown: string) => string;
  cancelled: (shutsDown: string) => string;
  pay: string;
  shutDownTitle: string;
  shutDownOwner: (deleted: string) => string;
  shutDownMember: string;
  backToAccount: string;
};

const en: Strings = {
  trialEnding: (end) => `Standard's free period ends on ${end}. Choose a paid package to keep working after that — until you do, the studio closes that day.`,
  due: (closes) => `Payment for this studio is due. It keeps working as normal until ${closes}; if it is still unpaid then, it closes — you can view and export everything, but not create or change anything.`,
  closed: (shutsDown) => `This studio is closed because payment is overdue. Everything is still here to view and export, but nothing can be created or changed until it is paid. If it stays unpaid, it shuts down on ${shutsDown}.`,
  cancelled: (shutsDown) => `This studio's subscription has ended. Everything is still here to view and export, but nothing can be created or changed. Renew to reopen it; otherwise it shuts down on ${shutsDown}.`,
  pay: "Contact nompany to pay",
  shutDownTitle: "This studio is shut down",
  shutDownOwner: (deleted) => `Payment has been overdue for 90 days, so members can no longer open this studio. Everything in it is kept until ${deleted} and is restored the moment it is paid; after that date it is deleted for good.`,
  shutDownMember: "This studio is shut down because its subscription is unpaid. Only its owner can reopen it.",
  backToAccount: "Back to your account",
};

const ar: Strings = {
  trialEnding: (end) => `تنتهي الفترة المجانية لباقة Standard في ${end}. اختر باقة مدفوعة لتواصل العمل بعدها — وإلا تُغلق المنشأة في ذلك اليوم.`,
  due: (closes) => `حان موعد الدفع لهذه المنشأة. تبقى تعمل كالمعتاد حتى ${closes}؛ وإن بقيت غير مدفوعة حينها تُغلق — فيمكنك عرض كل شيء وتصديره، دون إنشاء أو تعديل أي شيء.`,
  closed: (shutsDown) => `هذه المنشأة مغلقة لتأخر الدفع. كل شيء ما زال هنا للعرض والتصدير، لكن لا يمكن إنشاء أو تعديل أي شيء حتى يتم الدفع. وإن بقيت غير مدفوعة تتوقف في ${shutsDown}.`,
  cancelled: (shutsDown) => `انتهى اشتراك هذه المنشأة. كل شيء ما زال هنا للعرض والتصدير، لكن لا يمكن إنشاء أو تعديل أي شيء. جدد الاشتراك لإعادة فتحها؛ وإلا تتوقف في ${shutsDown}.`,
  pay: "تواصل مع nompany للدفع",
  shutDownTitle: "هذه المنشأة متوقفة",
  shutDownOwner: (deleted) => `تأخر الدفع 90 يوما، فلم يعد بإمكان الأعضاء فتح هذه المنشأة. كل ما فيها محفوظ حتى ${deleted} ويُستعاد فور الدفع؛ وبعد ذلك التاريخ يُحذف نهائيا.`,
  shutDownMember: "هذه المنشأة متوقفة لأن اشتراكها غير مدفوع. مالكها وحده يستطيع إعادة فتحها.",
  backToAccount: "العودة إلى حسابك",
};

export function subscriptionDict(locale: string): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
