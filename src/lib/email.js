import { log } from "@/lib/observability";
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
//                        "nompany <no-reply@nompany.com>".
//                        Falls back to Resend's shared testing sender, which can
//                        only deliver to the Resend account owner's own address.
//   • RESEND_REPLY_TO  — optional default Reply-To for every message.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// ---- delivery resilience ---------------------------------------------------
// Every message this app sends is a ONE-TIME CODE with someone sitting in front
// of it waiting. That shapes the whole policy:
//
//  • A send is RETRIED, because a transient 429 or 503 used to mean a person
//    was permanently locked out of their own signup.
//  • A send is TIMED OUT, because a single un-aborted fetch could hold the
//    request open until Vercel killed it minutes later.
//  • The whole call is BUDGETED, because the caller cannot be left waiting
//    indefinitely no matter how the failures stack up.
//
// This is deliberately NOT a background queue: deferring the send would not
// shorten the user's wait (they are waiting on the email, not on us) and would
// throw away the `emailSent:false` signal the signup and login forms show.
const ATTEMPT_TIMEOUT_MS = 4000;   // one attempt may hang this long, no longer
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [300, 900];     // waited BETWEEN attempts, not before the first
const TOTAL_BUDGET_MS = 10000;     // hard ceiling on the entire call

// A 4xx means Resend understood us and said no — a malformed address will still
// be malformed in a second, so retrying only wastes the caller's time. 429 and
// 5xx are the transient ones, as are network errors and our own timeout.
function isRetryable(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

// Resend's shared sandbox sender. Works with any API key WITHOUT verifying a
// domain, but only delivers to the email that owns the Resend account — good
// enough to smoke-test the integration before a domain is set up.
const DEFAULT_FROM = "nompany <onboarding@resend.dev>";

export function getApiKey() {
  return process.env.RESEND_API_KEY || "";
}

// GLOBAL KILL-SWITCH. All outbound email is suppressed unless EMAILS_ENABLED is
// explicitly "true". Lets us stand up the platform (migration, logins, signups)
// WITHOUT sending anything until the owner approves. Set EMAILS_ENABLED=true in
// Vercel to resume delivery. See [[nompany-super-studio-split]].
export function emailsEnabled() {
  return String(process.env.EMAILS_ENABLED || "").trim().toLowerCase() === "true";
}

// True when a real API key is present AND sending is enabled. Feature code can
// branch on this to avoid building a payload it can't/shouldn't send.
export function isEmailConfigured() {
  return Boolean(getApiKey()) && emailsEnabled();
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
// @returns {Promise<{ ok: boolean, skipped?: boolean, id?: string, error?: string, attempts?: number }>}
//          Never throws — inspect `ok` / `error` if you care about the result.
//          `attempts` is how many tries it took (or took before giving up).
//          Retries, timeout and the overall budget are described above.
export async function sendEmail(opts = {}) {
  const { to, subject, html, text, from, replyTo, cc, bcc, attachments, headers } = opts;

  const recipients = toRecipients(to);
  if (!recipients.length) return { ok: false, error: "No recipient address provided." };
  if (!subject) return { ok: false, error: "No subject provided." };
  if (!html && !text) return { ok: false, error: "Email has neither html nor text body." };

  // Global kill-switch — suppress ALL delivery until explicitly enabled.
  if (!emailsEnabled()) {
    log.warn(`[email] EMAILS_ENABLED is not "true" — suppressing email "${subject}" to ${recipients.join(", ")}`);
    return { ok: false, skipped: true, error: "Email sending disabled (EMAILS_ENABLED)" };
  }

  if (!getApiKey()) {
    // Soft no-op so local dev and misconfigured environments never crash.
    log.warn(`[email] RESEND_API_KEY not set — skipping email "${subject}" to ${recipients.join(", ")}`);
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

  const body = JSON.stringify(payload);
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = "Unknown error sending email";
  let made = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const budgetLeft = deadline - Date.now();
    if (budgetLeft <= 0) break;
    made = attempt;

    // How long to wait before the NEXT attempt; Resend may override it below.
    let waitMs = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];

    // An attempt gets its own timeout, capped by whatever budget remains — so
    // the last attempt can never run past the ceiling.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(ATTEMPT_TIMEOUT_MS, budgetLeft));

    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body,
        signal: controller.signal,
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok) return { ok: true, id: data?.id, attempts: attempt };

      lastError = data?.message || data?.error || `Resend responded with ${res.status}`;

      // Refused, not failed — trying again cannot change the answer.
      if (!isRetryable(res.status)) {
        log.error(`[email] refused (${res.status}) for "${subject}": ${lastError}`);
        return { ok: false, error: lastError, attempts: attempt };
      }

      // If Resend told us how long to wait, believe it over our own guess.
      const after = Number(res.headers.get("retry-after"));
      if (Number.isFinite(after) && after > 0) waitMs = after * 1000;
      log.warn(`[email] attempt ${attempt}/${MAX_ATTEMPTS} failed (${res.status}) for "${subject}": ${lastError}`);
    } catch (err) {
      lastError = err?.name === "AbortError"
        ? `no response within ${ATTEMPT_TIMEOUT_MS}ms`
        : err?.message || "network error";
      log.warn(`[email] attempt ${attempt}/${MAX_ATTEMPTS} errored for "${subject}": ${lastError}`);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS) {
      // Never sleep past the budget — a wait we cannot afford is a wait that
      // buys the caller nothing.
      const sleep = Math.min(waitMs, deadline - Date.now());
      if (sleep <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, sleep));
    }
  }

  log.error(`[email] gave up on "${subject}" after ${made} attempt(s): ${lastError}`);
  return { ok: false, error: lastError, attempts: made };
}
