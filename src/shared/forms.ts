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
  /** How many pages in somebody is — never how many are left; a jump makes that unknowable. */
  step: (n: number) => string;
  everyRow: string;
  file: string;
  addFile: string;
  removeFile: string;
  uploading: string;
  previewNoUpload: string;
  fileHint: (max: number, mb: number, kinds: readonly string[]) => string;
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
  step: (n) => `Page ${n}`,
  everyRow: "Please answer every row.",
  file: "File",
  addFile: "Add a file",
  removeFile: "Remove",
  uploading: "Uploading…",
  previewNoUpload: "Uploading is off in the preview",
  fileHint: (max, mb, kinds) => [
    max > 1 ? `Up to ${max} files` : "One file",
    `${mb} MB each`,
    kinds.length ? kinds.join(", ") : "",
  ].filter(Boolean).join(" · "),
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
    row: "Please answer every row.",
    time: "Please enter a valid time.",
    file: "That file could not be attached.",
    "too-many-files": "That is more files than this question takes.",
    "too-large": "That file is too big.",
    "file-kind": "That kind of file is not accepted here.",
    // WHAT IT REALLY MEANS, said plainly: the FORM is out of room, so trying
    // again with a smaller file will not help and neither will waiting.
    "form-full": "This form cannot take any more files. Please contact us directly.",
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
  step: (n) => `الصفحة ${n}`,
  everyRow: "يرجى الإجابة عن كل صف.",
  file: "ملف",
  addFile: "إضافة ملف",
  removeFile: "إزالة",
  uploading: "جار الرفع…",
  previewNoUpload: "الرفع معطل في المعاينة",
  fileHint: (max, mb, kinds) => [
    max > 1 ? `حتى ${max} ملفات` : "ملف واحد",
    `${mb} ميغابايت للملف`,
    kinds.length ? kinds.join("، ") : "",
  ].filter(Boolean).join(" · "),
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
    row: "يرجى الإجابة عن كل صف.",
    time: "يرجى إدخال وقت صحيح.",
    file: "تعذر إرفاق هذا الملف.",
    "too-many-files": "عدد الملفات أكبر مما يقبله هذا السؤال.",
    "too-large": "حجم الملف كبير جدا.",
    "file-kind": "هذا النوع من الملفات غير مقبول هنا.",
    "form-full": "لا يمكن لهذا النموذج استقبال ملفات أخرى. يرجى التواصل معنا مباشرة.",
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
