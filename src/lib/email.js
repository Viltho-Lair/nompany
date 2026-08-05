// Generic, reusable Resend email integration.
//
// This module is the ONLY place that talks to Resend. Everything else calls
// `sendEmail(...)` with a plain payload — no feature code imports the SDK or the
// API key directly, so swapping providers later means editing only this file.
//
// It uses Resend's REST API via `fetch` (no extra dependency) and is designed to
// FAIL SOFT: if the API key is missing or the send fails, it logs and returns a
// result object instead of throwing. Callers that send transactional mail as a
// side-effect (e.g. a login notification) can therefore fire-and-forget without
// risking the primary flow.
//
// Configuration (all via environment variables):
//   • RESEND_API_KEY   — required to actually send. When absent, sends are
//                        skipped (logged as a no-op) so local dev still works.
//   • RESEND_FROM      — default "From" address, e.g.
//                        "MegaTech Arabia <no-reply@yourdomain.com>".
//                        Falls back to Resend's shared testing sender, which can
//                        only deliver to the Resend account owner's own address.
//   • RESEND_REPLY_TO  — optional default Reply-To for every message.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend's shared sandbox sender. Works with any API key WITHOUT verifying a
// domain, but only delivers to the email that owns the Resend account — good
// enough to smoke-test the integration before a domain is set up.
const DEFAULT_FROM = "MegaTech Arabia <onboarding@resend.dev>";

export function getApiKey() {
  return process.env.RESEND_API_KEY || "";
}

// True when a real API key is present. Feature code can branch on this to avoid
// building a payload it can't send.
export function isEmailConfigured() {
  return Boolean(getApiKey());
}

function defaultFrom() {
  return process.env.RESEND_FROM || DEFAULT_FROM;
}

// Normalise a recipient value into the array-of-strings Resend expects. Accepts
// a single address or an array; drops blanks and de-dupes.
function toRecipients(to) {
  const list = Array.isArray(to) ? to : [to];
  return [...new Set(list.map((v) => String(v || "").trim()).filter(Boolean))];
}

// Send an email through Resend.
//
// @param {object}   opts
// @param {string|string[]} opts.to        Recipient address(es). Required.
// @param {string}   opts.subject          Subject line. Required.
// @param {string}  [opts.html]            HTML body (recommended).
// @param {string}  [opts.text]            Plain-text body / fallback.
// @param {string}  [opts.from]            Override the default From address.
// @param {string|string[]} [opts.replyTo] Override the default Reply-To.
// @param {string|string[]} [opts.cc]
// @param {string|string[]} [opts.bcc]
// @param {Array}   [opts.attachments]     Resend attachment objects.
// @param {object}  [opts.headers]         Extra headers.
// @param {string[]}[opts.tags]            Ignored placeholder for future tagging.
//
// @returns {Promise<{ ok: boolean, skipped?: boolean, id?: string, error?: string }>}
//          Never throws — inspect `ok` / `error` if you care about the result.
export async function sendEmail(opts = {}) {
  const { to, subject, html, text, from, replyTo, cc, bcc, attachments, headers } = opts;

  const recipients = toRecipients(to);
  if (!recipients.length) return { ok: false, error: "No recipient address provided." };
  if (!subject) return { ok: false, error: "No subject provided." };
  if (!html && !text) return { ok: false, error: "Email has neither html nor text body." };

  if (!isEmailConfigured()) {
    // Soft no-op so local dev and misconfigured environments never crash.
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${subject}" to ${recipients.join(", ")}`);
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const payload = {
    from: from || defaultFrom(),
    to: recipients,
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  const reply = replyTo ?? process.env.RESEND_REPLY_TO;
  if (reply) payload.reply_to = Array.isArray(reply) ? reply : [reply];
  if (cc) payload.cc = toRecipients(cc);
  if (bcc) payload.bcc = toRecipients(bcc);
  if (Array.isArray(attachments) && attachments.length) payload.attachments = attachments;
  if (headers && typeof headers === "object") payload.headers = headers;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const error = data?.message || data?.error || `Resend responded with ${res.status}`;
      console.error(`[email] send failed (${res.status}) for "${subject}": ${error}`);
      return { ok: false, error };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error(`[email] send threw for "${subject}":`, err?.message || err);
    return { ok: false, error: err?.message || "Unknown error sending email" };
  }
}
