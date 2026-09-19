// THE PUBLIC FORM PAGE'S OWN WORDS — Next, Back, Send, and what goes wrong —
// in the form's language (19/09/2026, modules/marketing/formsModel). Its own
// module: the public page is not the studio, and must not pull a studio
// dictionary into a stranger's download. What the studio TYPED — the form's
// title, its questions, its choices, its thank-you — is data, shown as typed.

type Strings = {
  next: string;
  back: string;
  send: string;
  sending: string;
  required: string;
  pageOf: (n: number, of: number) => string;
  closed: string;
  closedBody: string;
  thanks: string;
  again: string;
  preview: string;
  other: string;
  pick: string;
  errors: Record<string, string>;
};

const en: Strings = {
  next: "Next",
  back: "Back",
  send: "Send",
  sending: "Sending…",
  required: "Required",
  pageOf: (n, of) => `Page ${n} of ${of}`,
  closed: "This form is closed",
  closedBody: "It is no longer taking answers.",
  thanks: "Thank you — your answers were sent.",
  again: "Send another answer",
  preview: "Preview — nothing you send here is saved.",
  other: "Other",
  pick: "Choose…",
  errors: {
    required: "Please answer this question.",
    consent: "Please agree to continue.",
    email: "Please enter a valid email address.",
    number: "Please enter a number.",
    choice: "Please choose one of the options.",
    closed: "This form is no longer taking answers.",
    "rate-limited": "Too many answers from this connection. Please try again in a few minutes.",
    notfound: "This form is no longer available.",
    failed: "That did not send. Please try again.",
  },
};

const ar: Strings = {
  next: "التالي",
  back: "السابق",
  send: "إرسال",
  sending: "جار الإرسال…",
  required: "مطلوب",
  pageOf: (n, of) => `الصفحة ${n} من ${of}`,
  closed: "هذا النموذج مغلق",
  closedBody: "لم يعد يستقبل إجابات.",
  thanks: "شكرا لك — تم إرسال إجاباتك.",
  again: "إرسال إجابة أخرى",
  preview: "معاينة — لا يحفظ شيء مما ترسله هنا.",
  other: "أخرى",
  pick: "اختر…",
  errors: {
    required: "يرجى الإجابة عن هذا السؤال.",
    consent: "يرجى الموافقة للمتابعة.",
    email: "يرجى إدخال بريد إلكتروني صحيح.",
    number: "يرجى إدخال رقم.",
    choice: "يرجى اختيار أحد الخيارات.",
    closed: "لم يعد هذا النموذج يستقبل إجابات.",
    "rate-limited": "إجابات كثيرة من هذا الاتصال. يرجى المحاولة بعد دقائق.",
    notfound: "هذا النموذج لم يعد متاحا.",
    failed: "لم يتم الإرسال. يرجى المحاولة مرة أخرى.",
  },
};

export function publicFormDict(locale: string): Strings {
  return locale === "ar" ? ar : en;
}

export type { Strings as PublicFormStrings };
