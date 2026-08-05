// Sends a "new sign-in" notification email after a successful login.
//
// This is the first consumer of the generic Resend integration (lib/email.js).
// It resolves the signed-in user's email from their linked Employee record,
// builds the login-notification template, and fires the send fire-and-forget so
// the login response is never delayed or blocked by mail delivery.

import { getCollection } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { loginNotificationEmail } from "@/lib/emailTemplates";

// A user account has no email of its own — the address lives on the linked
// Employee record (employee.userId === user.id). Returns "" when the account
// isn't linked to an employee or that employee has no email on file.
async function resolveUserEmail(user) {
  const employees = await getCollection("employees");
  const emp = employees.find((e) => e.userId === user.id) || null;
  return { email: String(emp?.email || "").trim(), fullName: emp?.fullName || user.fullName || "" };
}

// Format the sign-in moment as dd/mm/yyyy HH:mm in Riyadh time, matching the
// app-wide date convention.
function formatSignInTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// Pull the best-effort client IP + user-agent from the request headers.
function requestMeta(request) {
  const h = request?.headers;
  const fwd = h?.get?.("x-forwarded-for") || "";
  const ip = (fwd.split(",")[0] || "").trim() || h?.get?.("x-real-ip") || "";
  const userAgent = h?.get?.("user-agent") || "";
  return { ip, userAgent };
}

// Fire the login-notification email. Safe to call without awaiting — it never
// throws (all failure is swallowed and logged inside sendEmail / here).
//
// @param {object} user     The authenticated user record (needs id, userId).
// @param {Request} request The incoming login request (for IP / user-agent).
export async function notifyLogin(user, request) {
  try {
    if (!user || !isEmailConfigured()) return;

    const { email, fullName } = await resolveUserEmail(user);
    if (!email) {
      console.warn(`[loginNotify] no email on file for user ${user.userId || user.id} — skipping login email`);
      return;
    }

    const { ip, userAgent } = requestMeta(request);
    const message = loginNotificationEmail({
      name: fullName,
      userId: user.userId,
      time: formatSignInTime(),
      ip,
      userAgent,
    });

    await sendEmail({ to: email, ...message });
  } catch (err) {
    // Login must never fail because of a notification email.
    console.error("[loginNotify] failed:", err?.message || err);
  }
}
