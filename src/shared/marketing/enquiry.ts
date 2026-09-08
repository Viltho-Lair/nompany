// A CONTACT ENQUIRY, VALIDATED AND ROUTED — purely.
//
// WHAT THIS REPLACES. `ContactView` validated the fields, called
// `setSent(true)`, and played a success animation. Nothing was sent, nothing
// was stored, and nothing was logged: every enquiry ever submitted was
// discarded while the sender was told it had arrived. That is worse than a
// broken form, because a broken form gets reported.
//
// PURE ON PURPOSE, and shared by both ends. The browser validates so a person
// is told about a missing field before a round trip; the server validates
// because the browser's answer is a courtesy and never a control. Two copies of
// "a message must be at least twelve characters" would be two rules free to
// disagree, and the one that matters is the one the sender never sees.

/** The largest a field may be. Not taste — an unbounded body is an open relay. */
export const LIMITS = {
  name: 120,
  email: 200,
  company: 160,
  message: 4000,
} as const;

/* WHAT THE ENQUIRY IS ABOUT, which is what decides where it lands.
   ------------------------------------------------------------------
   THIS ASKED FOR A TEAM SIZE AND INFERRED THE REST. Four bands — 1-9, 10-49,
   50-249, 250+ — and ten people or more was routed to sales. The inference was
   reasonable and it was still a guess: a forty-person company with a broken
   import is a support question, and a six-person one asking about invoicing is
   a sales question. It also asked a visitor for a number they may not want to
   give before they have decided to talk to us at all.

   ASKING DIRECTLY IS BOTH SHORTER AND MORE ACCURATE. The sender knows which
   conversation they are starting; nothing else on the form does.

   TOKENS, NOT LABELS. "sales" and "support" are stored and travel to the
   server; the words a visitor reads are chosen at DISPLAY time from the
   locale's own copy — the same rule statuses and stages follow everywhere in
   this product, and the reason an Arabic enquiry does not arrive carrying an
   Arabic string the router would have to understand. */
export const TOPICS = ["sales", "support"] as const;
export type Topic = (typeof TOPICS)[number];

export type Enquiry = {
  name: string;
  email: string;
  company: string;
  message: string;
  topic: string;
};

export type EnquiryErrors = Partial<Record<keyof Enquiry, string>>;

// DELIBERATELY PERMISSIVE. This is a contact form, not an authentication
// boundary: the cost of rejecting a real address that happens to look odd is a
// lost enquiry, and the cost of accepting a fake one is an email nobody
// answers. A stricter pattern trades the expensive mistake for the cheap one.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What is wrong with this enquiry, by field.
 *
 * Returns an object keyed by field so a caller can show each message where it
 * belongs; an empty object means the enquiry is sendable. Messages are KEYS the
 * caller resolves into its own language rather than English sentences, because
 * this module is shared by an Arabic page and an English one.
 */
export function validateEnquiry(input: Partial<Enquiry> | null | undefined): EnquiryErrors {
  const e: EnquiryErrors = {};
  const v = (s: unknown) => String(s ?? "").trim();

  if (v(input?.name).length < 2) e.name = "name";
  const email = v(input?.email);
  if (!EMAIL.test(email) || email.length > LIMITS.email) e.email = "email";
  if (v(input?.company).length < 2) e.company = "company";
  if (v(input?.message).length < 12) e.message = "message";

  // AN UNKNOWN TOPIC IS NOT AN ERROR. It decides which mailbox the enquiry
  // reaches and nothing else, so an absent one falls back rather than blocking
  // a person from getting in touch over a dropdown. The form always sends one;
  // this is about what happens when something else posts here.
  if (v(input?.topic) && !TOPICS.includes(v(input?.topic) as Topic)) {
    e.topic = "topic";
  }
  return e;
}

/** Trim every field to its limit. Applied on the server, after validation. */
export function normaliseEnquiry(input: Partial<Enquiry>): Enquiry {
  const cut = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
  return {
    name: cut(input.name, LIMITS.name),
    email: cut(input.email, LIMITS.email),
    company: cut(input.company, LIMITS.company),
    message: cut(input.message, LIMITS.message),
    topic: cut(input.topic, 12),
  };
}

/**
 * WHICH MAILBOX, FROM WHAT THE SENDER SAID IT WAS ABOUT.
 *
 * This used to infer it from a team size — ten people or more meant sales —
 * and the inference was the reason the form asked for a headcount at all. A
 * visitor now says which conversation they are starting, so there is nothing
 * left to infer.
 *
 * ANYTHING UNRECOGNISED GOES TO SUPPORT, deliberately. Both addresses reach a
 * person, so the failure is a misfiled enquiry rather than a lost one — and
 * guessing new business for somebody who did not say would put a support
 * question in front of the wrong reader.
 */
// THE ROLE IS NOT NAMED AFTER THE DEPARTMENT, and that is a guard rather than
// taste. The old section key for CRM is retired — the section is `crm-sales`
// now — and an architectural assertion greps the source for any string literal
// starting with that word, because a survivor guards on a key nobody holds and
// fails as a 403 with nothing pointing at the cause. The codebase's own note on
// three earlier collisions says to rename the value rather than add a fourth
// exemption.
//
// SO THE TOPIC TOKEN AND THE MAILBOX NAME ARE DELIBERATELY DIFFERENT WORDS.
// The topic is what the visitor chose; the mailbox is where it goes. They map
// one to one today and there is no reason they must forever.
export function mailboxFor(topic: string | null | undefined): "newBusiness" | "support" {
  return String(topic ?? "").trim() === "sales" ? "newBusiness" : "support";
}
