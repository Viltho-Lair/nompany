import { NextResponse } from "next/server";
import { sendEmail } from "@/platform/notify/email";
import { incrWithTTL } from "@/platform/db/store";
import { RL } from "@/platform/db/keys";
import { CONTACT } from "@/lib/site";
import { isCrossSite } from "@/platform/http/origin";
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

   IT SENDS AN EMAIL AND STORES NOTHING. There is no collection, no
   record and no inbox screen to check — the enquiry goes to a mailbox a
   person already reads, because an enquiry sitting in a table nobody
   opens is the same failure wearing a database.

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

const ipOf = (request: Request) =>
  (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request: Request) {
  // A FORM POST FROM SOMEBODY ELSE'S PAGE IS NOT AN ENQUIRY. The same guard the
  // traffic endpoint uses, for the same reason: this is a public write, and the
  // only legitimate caller is a page on this site.
  if (isCrossSite(request)) {
    return NextResponse.json({ ok: false, error: "cross-site" }, { status: 403 });
  }

  const ip = ipOf(request);

  // THE ONLY UNAUTHENTICATED ENDPOINT THAT PUTS MAIL IN SOMEBODY'S INBOX, so
  // "how often" has to be enforced rather than assumed. Its own counter, not
  // the credential ones: a contact submission is not a failed login, and
  // borrowing those would let a person lock themselves out of their account by
  // filling in this form five times.
  if ((await incrWithTTL(RL.contactIp(ip), RATE_WINDOW_SEC)) > RATE_MAX) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(RATE_WINDOW_SEC) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<Enquiry>;

  // VALIDATED AGAIN HERE. The browser validates so a person is told about a
  // missing field without a round trip; that answer is a courtesy and never a
  // control, and this is the same pure function so the two cannot disagree.
  const errors = validateEnquiry(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const enquiry = normaliseEnquiry(body);
  const mailbox = mailboxFor(enquiry.teamSize);
  const to = mailbox === "sales" ? CONTACT.sales : CONTACT.support;

  const lines: [string, string][] = [
    ["From", `${enquiry.name} <${enquiry.email}>`],
    ["Company", enquiry.company],
    ["Team size", enquiry.teamSize || "not given"],
  ];

  const result = await sendEmail({
    to,
    // The subject carries the company so a full inbox is still sortable, and
    // the team size so a sales enquiry is recognisable before it is opened.
    subject: `Enquiry from ${enquiry.company}${enquiry.teamSize ? ` (${enquiry.teamSize})` : ""}`,
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

  if (!result.ok) {
    // THE SENDER IS TOLD. `skipped` (no API key, kill-switch off) and a real
    // provider failure are the same answer to the person waiting: their message
    // did not arrive. Distinguishing them here would only tempt a caller into
    // treating one as success.
    return NextResponse.json({ ok: false, error: "send-failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, mailbox });
}
