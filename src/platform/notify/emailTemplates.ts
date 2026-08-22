// Reusable email templates for nompany.
//
// Templates return a plain `{ subject, html, text }` object that can be spread
// straight into `sendEmail()`. Each one is built on the shared `layout()`
// wrapper so every message shares the same branded shell — add new templates
// here rather than hand-rolling HTML at the call site.

const BRAND = {
  name: "nompany",
  color: "#2563eb", // nompany royal blue — header bar / buttons
  muted: "#6b7280",
  text: "#111827",
  border: "#e5e7eb",
  bg: "#f4f5f7",
};

// Escape a value for safe interpolation into HTML text nodes / attributes.
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared responsive shell. `bodyHtml` is trusted, already-escaped markup.
function layout({ title, bodyHtml, preheader = "" }: { title: string; bodyHtml: string; preheader?: string }) {
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
function detailRow(label: string, value: unknown): string {
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
export function loginNotificationEmail({ name, userId, time, ip, userAgent }: { name?: string; userId?: string; time?: string; ip?: string; userAgent?: string } = {}) {
  const greetingName = name || userId || "there";
  const subject = "New sign-in to your nompany account";

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

// A primary call-to-action button.
function ctaButton(label: string, url: string | undefined): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td style="border-radius:8px;background:${BRAND.color};">
      <a href="${esc(url)}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

// Email-verification message. Verifying unlocks Studio access; the link expires
// in 24 hours (a fresh one can be requested from the account page).
export function verifyEmailEmail({ name, url }: { name?: string; url?: string } = {}) {
  const greetingName = name || "there";
  const subject = "Confirm your nompany email";
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">Confirm your email</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      Hi ${esc(greetingName)}, welcome to nompany. Confirm this email address to unlock your Studio workspace.
    </p>
    ${ctaButton("Confirm email", url)}
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      This link expires in 24 hours. If it lapses, you can request a new one from your account page. If you didn't create a nompany account, you can ignore this message.
    </p>`;
  const text = `Confirm your nompany email\n\nHi ${greetingName}, welcome to nompany.\nConfirm your email to unlock your Studio workspace: ${url}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this message.`;
  return { subject, html: layout({ title: subject, bodyHtml, preheader: "Confirm your nompany email address." }), text };
}

// A large, selectable one-time code block.
function codeBlock(code: string | undefined) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td style="border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;padding:16px 28px;">
      <span style="font-family:ui-monospace,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:${BRAND.text};">${esc(code)}</span>
    </td></tr>
  </table>`;
}

// RESTRUCTURED IDENTITY: email verification is a CODE the person types (their
// own unique code tied to their email), not a link. See [[nompany-db-restructure]].
export function verificationCodeEmail({ name, code }: { name?: string; code?: string } = {}) {
  const greetingName = name || "there";
  const subject = "Your nompany verification code";
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">Confirm your email</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      Hi ${esc(greetingName)}, welcome to nompany. Enter this code to confirm your email address.
    </p>
    ${codeBlock(code)}
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      This code expires in 24 hours. If you didn't create a nompany account, you can ignore this message.
    </p>`;
  const text = `Your nompany verification code\n\nHi ${greetingName},\nEnter this code to confirm your email: ${code}\n\nIt expires in 24 hours. If you didn't create an account, ignore this message.`;
  return { subject, html: layout({ title: subject, bodyHtml, preheader: `Your code is ${code}` }), text };
}

// Password reset — also a typed code (same model as verification).
export function passwordResetCodeEmail({ name, code }: { name?: string; code?: string } = {}) {
  const greetingName = name || "there";
  const subject = "Your nompany password reset code";
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">Reset your password</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      Hi ${esc(greetingName)}, enter this code to choose a new password.
    </p>
    ${codeBlock(code)}
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      This code expires in 1 hour. If you didn't request a reset, you can safely ignore this message — your password stays unchanged.
    </p>`;
  const text = `Your nompany password reset code\n\nHi ${greetingName},\nEnter this code to set a new password: ${code}\n\nIt expires in 1 hour. If you didn't request it, ignore this message.`;
  return { subject, html: layout({ title: subject, bodyHtml, preheader: `Your reset code is ${code}` }), text };
}

// Studio invitation — a manager invited this address to join their studio.
// Names the person who invited them (and their email) per the studio's request.
export function studioInviteEmail({ companyName, url, invitedByName, invitedByEmail }: { companyName?: string; url?: string; invitedByName?: string; invitedByEmail?: string } = {}) {
  const studio = companyName || "a nompany studio";
  const inviter = invitedByName || "A studio manager";
  const subject = `You're invited to join ${studio} on nompany`;
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">Join ${esc(studio)}</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      <strong>${esc(inviter)}</strong>${invitedByEmail ? ` (${esc(invitedByEmail)})` : ""} has invited you to join
      <strong>${esc(studio)}</strong>'s Studio on nompany. Click below to confirm and become a member.
    </p>
    ${ctaButton("Approve & join", url)}
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      This invitation link expires in 7 days. If you weren't expecting it, you can ignore this message.
    </p>`;
  const text = `You're invited to join ${studio} on nompany\n\n${inviter}${invitedByEmail ? ` (${invitedByEmail})` : ""} invited you to join ${studio}'s Studio.\nApprove & join: ${url}\n\nThis link expires in 7 days. If you weren't expecting it, ignore this message.`;
  return { subject, html: layout({ title: subject, bodyHtml, preheader: `${inviter} invited you to ${studio}.` }), text };
}

// Password-reset message.
export function passwordResetEmail({ name, url }: { name?: string; url?: string } = {}) {
  const greetingName = name || "there";
  const subject = "Reset your nompany password";
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND.text};">Reset your password</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.text};">
      Hi ${esc(greetingName)}, we received a request to reset your nompany password. This link expires in 1 hour.
    </p>
    ${ctaButton("Reset password", url)}
    <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.muted};">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>`;
  const text = `Reset your nompany password\n\nHi ${greetingName}, reset your password (expires in 1 hour): ${url}\n\nIf you didn't request this, ignore this email.`;
  return { subject, html: layout({ title: subject, bodyHtml, preheader: "Reset your nompany password." }), text };
}
