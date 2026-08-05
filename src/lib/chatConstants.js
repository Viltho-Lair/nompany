// Client-safe chat constants — shared by the public widget, the studio Live
// Chat, and the server helpers. No server imports.

export const CHAT_TOPICS = [
  {
    key: "sales",
    label: "Contact Sales",
    action: "receive-sales",
    // Preset opening message seeded as the visitor's first line.
    preset: "Hi, I'd like to talk to your sales team about a project.",
    blurb: "Discuss a new project, pricing, or a quotation.",
  },
  {
    key: "support",
    label: "Contact Support",
    action: "receive-support",
    preset: "Hi, I need support with an existing system or service.",
    blurb: "Get help with an existing installation or service.",
  },
];

export const TOPIC_LABEL = Object.fromEntries(CHAT_TOPICS.map((t) => [t.key, t.label]));
export const TOPIC_ACTION = Object.fromEntries(CHAT_TOPICS.map((t) => [t.key, t.action]));

export function isTopic(t) {
  return CHAT_TOPICS.some((x) => x.key === t);
}

// Localized strings for the PUBLIC chat widget (en/ar). The studio + PDF keep
// using the English label/preset on CHAT_TOPICS above; this is widget-only.
export const CHAT_I18N = {
  en: {
    title: "MegaTech Arabia",
    help: "How can we help?",
    detailsIntro: (t) => `${t} — please share your details so we can help.`,
    fields: { name: "Full name *", company: "Company *", email: "Email *", phone: "Phone *" },
    start: "Start chat", starting: "Starting…", back: "← Back",
    allRequired: "All fields are required.", invalidEmail: "Enter a valid email.",
    waiting: "Waiting for a representative to connect…",
    joined: (n) => `${n} has joined the chat`,
    connecting: "Connecting you to our team…", connected: (n) => `Connected · ${n}`,
    ended: "This chat has ended.", chatEnded: "Chat ended",
    typeMsg: "Type a message…", endDownload: "End chat & download transcript", downloadClose: "Download transcript & close",
    outsideHours: "You've reached us outside working hours — your request has been received and we'll reply as soon as we're back.",
    topics: {
      sales: { label: "Contact Sales", blurb: "Discuss a new project, pricing, or a quotation.", preset: "Hi, I'd like to talk to your sales team about a project." },
      support: { label: "Contact Support", blurb: "Get help with an existing installation or service.", preset: "Hi, I need support with an existing system or service." },
    },
  },
  ar: {
    title: "ميجاتك العربية",
    help: "كيف يمكننا مساعدتك؟",
    detailsIntro: (t) => `${t} — يرجى مشاركة بياناتك لنتمكن من مساعدتك.`,
    fields: { name: "الاسم الكامل *", company: "الشركة *", email: "البريد الإلكتروني *", phone: "رقم الهاتف *" },
    start: "بدء المحادثة", starting: "جارٍ البدء…", back: "→ رجوع",
    allRequired: "جميع الحقول مطلوبة.", invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    waiting: "بانتظار انضمام أحد ممثلينا…",
    joined: (n) => `${n} انضم إلى المحادثة`,
    connecting: "جارٍ توصيلك بفريقنا…", connected: (n) => `متصل · ${n}`,
    ended: "انتهت هذه المحادثة.", chatEnded: "انتهت المحادثة",
    typeMsg: "اكتب رسالة…", endDownload: "إنهاء المحادثة وتنزيل النسخة", downloadClose: "تنزيل النسخة والإغلاق",
    outsideHours: "لقد تواصلت معنا خارج ساعات العمل — تم استلام طلبك وسنرد عليك فور عودتنا.",
    topics: {
      sales: { label: "تواصل مع المبيعات", blurb: "ناقش مشروعًا جديدًا أو الأسعار أو عرض سعر.", preset: "مرحبًا، أود التحدث مع فريق المبيعات بخصوص مشروع." },
      support: { label: "تواصل مع الدعم", blurb: "احصل على مساعدة بخصوص نظام أو خدمة قائمة.", preset: "مرحبًا، أحتاج دعمًا بخصوص نظام أو خدمة قائمة." },
    },
  },
};

export function chatText(locale) { return CHAT_I18N[locale] || CHAT_I18N.en; }
