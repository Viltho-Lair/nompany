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

/** Where a team of this size should land. */
export const TEAM_SIZES = ["1-9", "10-49", "50-249", "250+"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export type Enquiry = {
  name: string;
  email: string;
  company: string;
  message: string;
  teamSize: string;
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

  // AN UNKNOWN SIZE IS NOT AN ERROR. It decides which mailbox the enquiry
  // reaches and nothing else, so an absent one falls back rather than blocking
  // a person from getting in touch over a dropdown.
  if (v(input?.teamSize) && !TEAM_SIZES.includes(v(input?.teamSize) as TeamSize)) {
    e.teamSize = "teamSize";
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
    teamSize: cut(input.teamSize, 12),
  };
}

/**
 * TEN PEOPLE OR MORE IS A SALES CONVERSATION; below that is support.
 *
 * The split is the whole reason the form asks for a team size. It matches where
 * the product's own pricing turns over: one to nine is free and self-served, so
 * an enquiry from that band is somebody using the product or deciding to, and
 * ten upward is somebody who will be invoiced and wants to talk about it first.
 *
 * A MISSING OR UNRECOGNISED SIZE GOES TO SUPPORT, deliberately. Both addresses
 * reach a person, so the failure is a misfiled enquiry rather than a lost one —
 * and guessing "sales" for someone who did not say would put a support question
 * in front of the wrong reader.
 */
export function mailboxFor(teamSize: string | null | undefined): "sales" | "support" {
  const size = String(teamSize ?? "").trim();
  return size === "10-49" || size === "50-249" || size === "250+" ? "sales" : "support";
}
