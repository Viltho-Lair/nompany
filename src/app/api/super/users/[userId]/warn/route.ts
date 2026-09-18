import { route } from "@/platform/http/route";
import { getUserById, getProfile, markWarned } from "@/platform/auth/users";
import { sendEmail } from "@/platform/notify/email";
import { sharingWarningEmail } from "@/platform/notify/emailTemplates";

export const runtime = "nodejs";

// SEND THE SHARED-LOGIN WARNING to one person (the owner, 18/09/2026: a flag, a
// filter, and a button that emails the user). The route wrapper writes the
// audit line — which console admin sent it, to whom, and when — so a later
// suspension has the warning on record behind it. The date is also kept on the
// person, so the console can show it was sent.
export const POST = route(
  // The mail provider refusing is not the caller's fault: 502.
  { auth: "super", name: "super/users/[userId]/warn", status: { "email-failed": 502 } },
  async ({ params }) => {
    const user = await getUserById(params.userId);
    if (!user) return { error: "notfound" };
    const profile = await getProfile(user.id);
    const msg = sharingWarningEmail({ name: profile?.fullName || "" });
    const sent = await sendEmail({ to: user.email, subject: msg.subject, html: msg.html, text: msg.text });
    // Recorded only once it went: a warning nobody received is not one to cite.
    if (!sent?.ok) return { error: "email-failed" };
    return { ok: true, warnedAt: await markWarned(user.id) };
  },
);
