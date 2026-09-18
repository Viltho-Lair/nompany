import { route } from "@/platform/http/route";
import { getUserById, getProfile } from "@/platform/auth/users";
import { resetSecurity, RESETTABLE, type Resettable } from "@/platform/auth/lock";
import { sendEmail } from "@/platform/notify/email";
import { securityResetEmail } from "@/platform/notify/emailTemplates";

export const runtime = "nodejs";

// RESET PART OF SOMEBODY'S SIGN-IN, from the console (the owner, 18/09/2026):
// their authenticator, their PIN, or their passkeys — for a person locked out
// of their own account. One part per request. The route wrapper writes the
// audit line (which console admin, whom, when), and the person is emailed
// that it happened.
export const POST = route(
  { auth: "super", body: true, name: "super/users/[userId]/reset" },
  async ({ params, body }) => {
    const what = String(body.what || "") as Resettable;
    if (!RESETTABLE.includes(what)) return { error: "what" };
    const user = await getUserById(params.userId);
    if (!user) return { error: "notfound" };
    await resetSecurity(user.id, what);
    const profile = await getProfile(user.id);
    const msg = securityResetEmail({ name: profile?.fullName || "", what });
    // Told, best-effort: the reset has happened either way, and a refused email
    // must not leave the console believing it did not.
    const sent = await sendEmail({ to: user.email, subject: msg.subject, html: msg.html, text: msg.text });
    return { ok: true, reset: what, emailSent: Boolean(sent?.ok) };
  },
);
