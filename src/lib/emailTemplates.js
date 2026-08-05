// Reusable email templates for MegaTech Arabia.
//
// Templates return a plain `{ subject, html, text }` object that can be spread
// straight into `sendEmail()`. Each one is built on the shared `layout()`
// wrapper so every message shares the same branded shell — add new templates
// here rather than hand-rolling HTML at the call site.

const BRAND = {
  name: "MegaTech Arabia",
  color: "#0b5cff", // primary accent used for the header bar / buttons
  muted: "#6b7280",
  text: "#111827",
  border: "#e5e7eb",
  bg: "#f4f5f7",
};

// Escape a value for safe interpolation into HTML text nodes / attributes.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared responsive shell. `bodyHtml` is trusted, already-escaped markup.
function layout({ title, bodyHtml, preheader = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND.color};padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">${esc(BRAND.name)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${BRAND.border};">
                <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.5;">
                  This is an automated security message from ${esc(BRAND.name)}. If this wasn't you, change your password right away.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Render a small "label: value" detail row, omitted entirely when value is blank.
function detailRow(label, value) {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:${BRAND.muted};white-space:nowrap;">${esc(label)}</td>
    <td style="padding:6px 0 6px 16px;font-size:13px;color:${BRAND.text};font-weight:600;">${esc(value)}</td>
  </tr>`;
}

// Login-notification email.
//
// @param {object}  opts
// @param {string} [opts.name]      Recipient's display name.
// @param {string} [opts.userId]    Login id used.
// @param {string} [opts.time]      Human-readable sign-in time.
// @param {string} [opts.ip]        Originating IP address.
// @param {string} [opts.userAgent] Browser / device string.
// @returns {{ subject: string, html: string, text: string }}
export function loginNotificationEmail({ name, userId, time, ip, userAgent } = {}) {
  const greetingName = name || userId || "there";
  const subject = "New sign-in to your MegaTech Arabia account";

  const details = [
    detailRow("Account", userId),
    detailRow("Time", time),
    detailRow("IP address", ip),
    detailRow("Device", userAgent),
  ].join("");

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">New sign-in detected</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      Hi ${esc(greetingName)}, we noticed a new sign-in to your ${esc(BRAND.name)} account.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.bg};border-radius:8px;padding:8px 16px;margin:0 0 16px;">
      ${details || detailRow("Account", greetingName)}
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.text};">
      If this was you, no action is needed. If you don't recognise this activity, please change your password immediately and contact your administrator.
    </p>`;

  const text = [
    `New sign-in to your ${BRAND.name} account`,
    ``,
    `Hi ${greetingName}, we noticed a new sign-in to your account.`,
    ``,
    userId ? `Account: ${userId}` : null,
    time ? `Time: ${time}` : null,
    ip ? `IP address: ${ip}` : null,
    userAgent ? `Device: ${userAgent}` : null,
    ``,
    `If this was you, no action is needed. If you don't recognise this activity, change your password immediately and contact your administrator.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject, html: layout({ title: subject, bodyHtml, preheader: "A new sign-in to your account was detected." }), text };
}
