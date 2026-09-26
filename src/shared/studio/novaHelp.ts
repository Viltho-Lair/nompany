import { defaultLocale, type Locale } from "../locale";

// NOVA'S HELP DESK — the words around the answers (26/09/2026). The answers
// themselves are the knowledge base's (lib/nova/help), which arrives already in
// the reader's language; this is only the frame: the buttons, the "did you
// mean", the hand-off to support. One dictionary per surface, nothing
// enumerates them.

type Strings = {
  browseHelp: string;
  popular: string;
  forThisScreen: string;
  askAboutData: string;
  loadingHelp: string;
  helpUnavailable: string;
  back: (to: string) => string;
  questionsHere: string;
  moreTopics: string;
  didYouMean: string;
  yes: string;
  no: string;
  notThis: string;
  maybeOneOfThese: string;
  noneOfThese: string;
  noMatch: string;
  noMatchHint: string;
  haveReady: string;
  steps: string;
  open: (name: string) => string;
  related: string;
  readDocs: string;
  helpful: string;
  sendToSupport: string;
  supportIntro: string;
  supportPlaceholder: string;
  send: string;
  sending: string;
  cancel: string;
  sent: string;
  sentNoEmail: string;
  sendFailed: string;
  rateLimited: string;
  askSupportInstead: string;
};

const en: Strings = {
  browseHelp: "Browse help",
  popular: "Common questions",
  forThisScreen: "About this screen",
  askAboutData: "Ask Nova about my data instead",
  loadingHelp: "Loading help…",
  helpUnavailable: "Help could not be loaded. You can still type a question.",
  back: (to) => `Back to ${to}`,
  questionsHere: "Questions",
  moreTopics: "Topics",
  didYouMean: "Did you mean:",
  yes: "Yes",
  no: "No",
  notThis: "Not what I meant",
  maybeOneOfThese: "Is it one of these?",
  noneOfThese: "None of these",
  noMatch: "I couldn't find that in the help.",
  noMatchHint: "Try other words, browse the topics, or send the question to our support team.",
  haveReady: "Have this ready",
  steps: "Steps",
  open: (name) => `Open ${name}`,
  related: "Related",
  readDocs: "Read in documentation",
  helpful: "Was this what you needed?",
  sendToSupport: "Send to support",
  supportIntro: "Our support team will read this and answer you by email and in your notifications. Nova includes the studio, the screen you're on and what it already suggested, so you don't have to.",
  supportPlaceholder: "Describe what you're trying to do",
  send: "Send",
  sending: "Sending…",
  cancel: "Cancel",
  sent: "Sent to support. You'll get the answer by email and in your notifications.",
  sentNoEmail: "Sent to support. You'll get the answer in your notifications.",
  sendFailed: "That didn't send. Please try again in a moment.",
  rateLimited: "You've sent several questions in the last hour. Please wait a little before sending another.",
  askSupportInstead: "Ask support",
};

const ar: Strings = {
  browseHelp: "تصفح المساعدة",
  popular: "أسئلة شائعة",
  forThisScreen: "عن هذه الشاشة",
  askAboutData: "اسأل Nova عن بياناتي بدلا من ذلك",
  loadingHelp: "جارٍ تحميل المساعدة…",
  helpUnavailable: "تعذر تحميل المساعدة. ما زال بإمكانك كتابة سؤالك.",
  back: (to) => `العودة إلى ${to}`,
  questionsHere: "الأسئلة",
  moreTopics: "المواضيع",
  didYouMean: "هل تقصد:",
  yes: "نعم",
  no: "لا",
  notThis: "ليس هذا ما قصدته",
  maybeOneOfThese: "هل هو أحد هذه؟",
  noneOfThese: "لا شيء منها",
  noMatch: "لم أجد ذلك في المساعدة.",
  noMatchHint: "جرّب كلمات أخرى، أو تصفح المواضيع، أو أرسل سؤالك إلى فريق الدعم.",
  haveReady: "جهّز ما يلي",
  steps: "الخطوات",
  open: (name) => `افتح ${name}`,
  related: "ذو صلة",
  readDocs: "اقرأ في التوثيق",
  helpful: "هل هذا ما كنت تحتاجه؟",
  sendToSupport: "أرسل إلى الدعم",
  supportIntro: "سيقرأ فريق الدعم سؤالك ويرد عليك بالبريد الإلكتروني وفي إشعاراتك. يرفق Nova اسم الاستوديو والشاشة التي أنت فيها وما اقترحه عليك، فلا حاجة لكتابتها.",
  supportPlaceholder: "صف ما تحاول القيام به",
  send: "إرسال",
  sending: "جارٍ الإرسال…",
  cancel: "إلغاء",
  sent: "أُرسل سؤالك إلى الدعم. ستصلك الإجابة بالبريد الإلكتروني وفي إشعاراتك.",
  sentNoEmail: "أُرسل سؤالك إلى الدعم. ستصلك الإجابة في إشعاراتك.",
  sendFailed: "لم يُرسل السؤال. حاول مرة أخرى بعد قليل.",
  rateLimited: "أرسلت عدة أسئلة خلال الساعة الأخيرة. انتظر قليلا قبل إرسال سؤال آخر.",
  askSupportInstead: "اسأل الدعم",
};

const dict: Record<Locale, Strings> = { en, ar };

export function novaHelpDict(locale: string): Strings {
  return dict[(locale as Locale)] || dict[defaultLocale];
}

export type { Strings as NovaHelpStrings };
