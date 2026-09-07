import { defaultLocale, type Locale } from "@/shared/locale";

// THE CONTACT FORM'S COPY.
//
// WHAT IT REPLACES, because every line of it was a promise nobody could keep.
// On "success" the form said a solutions engineer would email within one
// business day with three slots, and that Nova had already drafted a migration
// outline for the visitor's company. There is no solutions engineer, there are
// no slots, and nothing drafts a migration outline. The submit button said
// "Request demo" — there is no demo, and the free tier is the demo. And none of
// it was sent anyway: the form called setSent(true) and discarded the message.
//
// A FAILURE HAS WORDS NOW, which the old form had no need for because it never
// admitted one. If the mail does not leave, the person is told and given the
// address directly — a message they can still send beats a tick that meant
// nothing.

type ContactStrings = {
  eyebrow: string;
  title: string;
  lead: string;
  teamSizeLabel: string;
  /** Shown against each `TEAM_SIZES` value, in order. */
  teamSizeOptions: string[];
  send: string;
  sending: string;
  /** Replaces the invented "a solutions engineer will email you" promise. */
  sentTitle: string;
  sentBody: string;
  sendAnother: string;
  failedTitle: string;
  /** Followed by the address, so the enquiry is not lost to a failed send. */
  failedBody: string;
};

const en: ContactStrings = {
  eyebrow: "Contact",
  title: "Ask us something",
  // WHAT THIS REPLACES: "Book a demo with a solutions engineer" over "45
  // minutes, your data model on screen, no slide deck. We'll tell you honestly
  // if Nompany isn't the right fit." There is no demo and no solutions
  // engineer, and the brand was capitalised in the middle of it.
  lead: "There is no demo to book — the free tier is the whole product, so the fastest way to see it is to open it. If you would rather ask first, this reaches a person.",
  teamSizeLabel: "How many people are you?",
  teamSizeOptions: ["1–9", "10–49", "50–249", "250 or more"],
  send: "Send",
  sending: "Sending…",
  sentTitle: "That reached us",
  sentBody:
    "Your message is in our inbox and a reply will come to the address you gave. No automated sequence, no call scheduled without asking you first.",
  sendAnother: "Send another",
  failedTitle: "That did not send",
  failedBody:
    "Something went wrong on our side and your message did not leave. Nothing was saved, so please send it directly to",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: ContactStrings = {
  eyebrow: "تواصل معنا",
  title: "اسألنا",
  lead: "لا يوجد عرض توضيحي تحجزه — الخطة المجانية هي المنتج كاملا، واسرع طريقة لرؤيته ان تفتحه. وان اردت السؤال اولا، هذه الرسالة تصل الى شخص.",
  teamSizeLabel: "كم عددكم؟",
  teamSizeOptions: ["1–9", "10–49", "50–249", "250 او اكثر"],
  send: "ارسال",
  sending: "جار الارسال…",
  sentTitle: "وصلتنا رسالتك",
  sentBody:
    "رسالتك في صندوق بريدنا، والرد سيصل الى العنوان الذي كتبته. بلا سلسلة رسائل تلقائية، وبلا موعد مكالمة يحجز دون ان نسألك.",
  sendAnother: "ارسال رسالة اخرى",
  failedTitle: "لم ترسل الرسالة",
  failedBody:
    "حدث خطأ لدينا ولم تغادر رسالتك. لم يحفظ منها شيء، فارجو ارسالها مباشرة الى",
};

const contact = { en, ar };

export function contactCopy(locale: string): ContactStrings {
  return contact[locale as Locale] || contact[defaultLocale];
}

export type { ContactStrings };
