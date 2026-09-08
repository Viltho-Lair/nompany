import { NextResponse } from "next/server";
import { sendEmail } from "@/platform/notify/email";
import { RL } from "@/platform/db/keys";
import { CONTACT } from "@/lib/site";
import { addSiteRow, updateSiteRow } from "@/lib/data/site";
import { refusePublicForm, callerIp } from "@/platform/http/publicForm";
import {
  validateEnquiry,
  normaliseEnquiry,
  mailboxFor,
  type Enquiry,
} from "@/shared/marketing/enquiry";

/* THE CONTACT FORM ACTUALLY SENDS SOMETHING NOW.
   ------------------------------------------------------------------
   WHAT THIS REPLACES. `ContactView` validated the fields, called
   `setSent(true)`, and played a success animation. No request was made,
   nothing was stored, nothing was logged. Every enquiry ever submitted
   was discarded while the sender watched a tick appear. A broken form
   gets reported; a form that lies does not.

   IT STORES THE ENQUIRY FIRST, THEN SENDS IT. This comment used to
   argue for mail alone — "an enquiry sitting in a table nobody opens is
   the same failure wearing a database" — and that argument was for the
   wrong choice. Mail is still the channel a person actually reads; the
   row is the copy that survives the provider being down, the API key
   being rotated, or the kill-switch being off. `messages` already
   existed as a public-form site collection and nothing had ever written
   to it.

   THE ORDER IS LOAD-BEARING. Store, then send: a stored enquiry whose
   mail failed is recoverable, and a sent enquiry whose store failed is
   already in somebody's inbox. Doing it the other way round makes the
   failure that loses data the more likely one.

   AND A FAILED SEND IS NO LONGER A FAILED SUBMISSION. Once the row is
   down, the sender's message is not lost, so answering 502 would tell
   them it had not arrived when it had. The row carries `notified:
   false` instead, which is what somebody looking for enquiries nobody
   was told about would search on. A failed STORE is still a 502,
   because then there really is nothing.

   AND IT ONLY CLAIMS SUCCESS WHEN THE MAIL WENT. `sendEmail` never
   throws and answers `{ ok }`; if it is false — no API key, the
   kill-switch off, the provider refusing — this answers 502 and the
   form says so. Replacing a silent failure with a different silent
   failure would have been the worse outcome, because it would look
   fixed.

   THE SENDER'S ADDRESS IS THE REPLY-TO, never the From. Sending as the
   visitor would fail SPF/DKIM against a domain we do not control and
   land the enquiry in spam — which is a silent failure again. It goes
   out from the site's own address, and hitting reply reaches them.
*/

// A person contacting a company does it once, twice if they realise they
// mistyped something. Five in ten minutes is already somebody testing the form.
const RATE_MAX = 5;
const RATE_WINDOW_SEC = 10 * 60;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request: Request) {
  const refused = await refusePublicForm(request, {
    rateKey: RL.contactIp,
    max: RATE_MAX,
    windowSec: RATE_WINDOW_SEC,
  });
  if (refused) return refused;

  const body = (await request.json().catch(() => ({}))) as Partial<Enquiry>;

  // VALIDATED AGAIN HERE. The browser validates so a person is told about a
  // missing field without a round trip; that answer is a courtesy and never a
  // control, and this is the same pure function so the two cannot disagree.
  const errors = validateEnquiry(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const enquiry = normaliseEnquiry(body);
  const mailbox = mailboxFor(enquiry.topic);
  const to = mailbox === "newBusiness" ? CONTACT.sales : CONTACT.support;

  // STORED BEFORE ANYTHING IS SENT. The IP is kept because it is the only thing
  // that distinguishes one person submitting twice from two people, which is
  // what somebody triaging a burst of enquiries needs; nothing else about the
  // request is recorded.
  let stored;
  try {
    stored = await addSiteRow("messages", {
      ...enquiry,
      mailbox,
      ip: callerIp(request),
      notified: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "not-stored" }, { status: 502 });
  }

  // THE EMAIL SAYS WHICH DESK IT IS FOR. Both addresses are aliases onto one
  // mailbox, so a reader opening it cannot otherwise tell whether they are
  // looking at a sales enquiry or a support question — the To: line is the
  // same either way. Naming it in the subject and in the body is what makes
  // the dropdown worth asking for at all.
  const desk = mailbox === "newBusiness" ? "Sales" : "Support";
  const lines: [string, string][] = [
    ["About", desk],
    ["From", `${enquiry.name} <${enquiry.email}>`],
    ["Company", enquiry.company],
  ];

  const result = await sendEmail({
    to,
    // The subject carries the company so a full inbox is still sortable, and
    // the team size so a sales enquiry is recognisable before it is opened.
    // The desk comes FIRST so a full inbox sorts and filters on it, and the
    // company follows so an enquiry is recognisable before it is opened.
    subject: `${desk}: ${enquiry.company}`,
    replyTo: enquiry.email,
    text: [
      ...lines.map(([k, v]) => `${k}: ${v}`),
      "",
      enquiry.message,
    ].join("\n"),
    html: [
      "<table>",
      ...lines.map(
        ([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`,
      ),
      "</table>",
      `<p style="white-space:pre-wrap">${esc(enquiry.message)}</p>`,
    ].join(""),
  });

  // THE ROW IS MARKED ONLY WHEN THE MAIL WENT, and a failure to mark it is not
  // a failure of the submission — the enquiry is already down either way. This
  // is why `notified` is written false at insert and flipped here rather than
  // being written once at the end: a crash between the two leaves a row that
  // reads "nobody was told", which is the safe direction to be wrong in.
  if (result.ok) {
    await updateSiteRow("messages", String(stored.id), (r) => ({ ...r, notified: true }))
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, mailbox, notified: Boolean(result.ok) });
}
