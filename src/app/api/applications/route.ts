import { NextResponse } from "next/server";
import { sendEmail } from "@/platform/notify/email";
import { RL } from "@/platform/db/keys";
import { CONTACT } from "@/lib/site";
import { addSiteRow, updateSiteRow } from "@/lib/data/site";
import { putMedia } from "@/lib/media";
import { refusePublicForm, callerIp } from "@/platform/http/publicForm";

/* THE ROUTE THE APPLY FORM HAS BEEN POSTING TO ALL ALONG.
   ------------------------------------------------------------------
   IT DID NOT EXIST. `ApplyForm` posts a FormData to `/api/applications`
   and treats a non-OK response as failure, so every application ever
   submitted hit a 404 and the candidate was shown the error state. Not
   a silent lie like the contact form was — it said something had gone
   wrong, which is why nobody chased it — but every application was
   lost, and `addSiteRow` sat in the tree with zero callers waiting for
   this. Found while restyling the careers page onto the public chrome.

   THE CV IS STORED PRIVATELY AND SENT AS AN ATTACHMENT. `putMedia` with
   no `studioId` and no `owner` produces a record the serve route can
   hand to NOBODY — membership is checked against a studio that is not
   there — which is exactly right for a stranger's CV: it exists so the
   application survives a mail failure, not so it can be fetched from a
   link. Whoever reads the mailbox already has the file attached.

   STORE, THEN SEND, for the reason the contact route gives: a stored
   application whose mail failed is recoverable; a sent one whose store
   failed is only in an inbox. `notified` is written false and flipped
   after a successful send, so a crash between the two leaves a row that
   reads "nobody was told" — the safe direction.

   THE FILE IS CHECKED HERE, NOT ONLY IN THE BROWSER. `ApplyForm` caps
   the size before it posts; that is a courtesy to the candidate and
   never a control, because this endpoint is reachable without it. */

// Somebody applies for one job, occasionally two. Three in an hour is not a
// candidate — and unlike the contact form, each of these carries a file.
const RATE_MAX = 3;
const RATE_WINDOW_SEC = 60 * 60;

// Matches the accept list the form offers. A CV is a document; anything else
// arriving here is either a mistake or somebody using the endpoint as storage.
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_CV_BYTES = 5 * 1024 * 1024;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cut = (v: FormDataEntryValue | null, n: number) =>
  String(v ?? "").trim().slice(0, n);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request: Request) {
  const refused = await refusePublicForm(request, {
    rateKey: RL.applyIp,
    max: RATE_MAX,
    windowSec: RATE_WINDOW_SEC,
  });
  if (refused) return refused;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const application = {
    jobId: cut(form.get("jobId"), 80),
    jobTitle: cut(form.get("jobTitle"), 200),
    name: cut(form.get("name"), 120),
    email: cut(form.get("email"), 200),
    phone: cut(form.get("phone"), 60),
    linkedin: cut(form.get("linkedin"), 300),
    message: cut(form.get("message"), 4000),
  };

  const errors: Record<string, string> = {};
  if (application.name.length < 2) errors.name = "name";
  if (!EMAIL.test(application.email)) errors.email = "email";
  if (!application.jobId) errors.jobId = "jobId";

  const cv = form.get("cv");
  // `instanceof File` rather than a duck-typed check: a string field named `cv`
  // would otherwise reach `arrayBuffer()` and throw a 500 where a 400 is right.
  if (!(cv instanceof File) || cv.size === 0) errors.cv = "cv";
  else if (cv.size > MAX_CV_BYTES) errors.cv = "too-large";
  else if (!ALLOWED.has(cv.type)) errors.cv = "type";

  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const file = cv as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  const media = await putMedia({
    buffer,
    contentType: file.type,
    filename: file.name,
    // PRIVATE WITH NO STUDIO. The serve route checks membership of `studioId`;
    // with none, there is no membership that satisfies it, so the bytes are
    // reachable from no URL by anybody. That is the intent, not an oversight.
    visibility: "private",
  });
  if ("error" in media && media.error) {
    return NextResponse.json({ ok: false, error: "cv-rejected" }, { status: 400 });
  }

  let stored;
  try {
    stored = await addSiteRow("applications", {
      ...application,
      cvMediaId: "id" in media ? media.id : "",
      cvFilename: file.name,
      cvSize: buffer.length,
      ip: callerIp(request),
      notified: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "not-stored" }, { status: 502 });
  }

  const rows: [string, string][] = [
    ["Applicant", `${application.name} <${application.email}>`],
    ["Role", `${application.jobTitle} (${application.jobId})`],
    ["Phone", application.phone || "not given"],
    ["LinkedIn", application.linkedin || "not given"],
  ];

  const result = await sendEmail({
    to: CONTACT.support,
    subject: `Application: ${application.jobTitle || application.jobId} — ${application.name}`,
    replyTo: application.email,
    text: [...rows.map(([k, v]) => `${k}: ${v}`), "", application.message].join("\n"),
    html: [
      "<table>",
      ...rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`),
      "</table>",
      `<p style="white-space:pre-wrap">${esc(application.message)}</p>`,
    ].join(""),
    attachments: [{ filename: file.name, content: buffer.toString("base64") }],
  });

  if (result.ok) {
    await updateSiteRow("applications", String(stored.id), (r) => ({ ...r, notified: true }))
      .catch(() => {});
  }

  // THE APPLICATION IS DOWN EITHER WAY, so a failed send is not a failed
  // application — telling a candidate to try again would produce a second copy
  // of one we already hold.
  return NextResponse.json({ ok: true, notified: Boolean(result.ok) });
}
