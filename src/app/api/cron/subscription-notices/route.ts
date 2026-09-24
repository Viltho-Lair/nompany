import { cronJob } from "@/platform/http/cron";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { getUserById } from "@/platform/auth/users";
import { sendEmail } from "@/platform/notify/email";
import { subscriptionWarningEmail } from "@/platform/notify/emailTemplates";
import { markNoticesSent, subscriptionDocs } from "@/lib/data/subscriptions";
import { billingDay, noticesDue } from "@/shared/subscription";
import { studioLocale } from "@/shared/locale";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE WARNINGS THE TERMS PROMISE (1.4, §5): thirty, seven and one days before
// an unpaid studio shuts down, and again before it is deleted, to its owner.
// Which warning is due is shared/subscription's `noticesDue` — one per step per
// run, catching up without sending three at once after a missed day.
//
// A WARNING IS RECORDED AS SENT ONLY ONCE THE EMAIL WENT. A failed send — the
// provider down, EMAILS_ENABLED off — is tried again tomorrow rather than
// counted, and the deletion job refuses to delete a studio whose final
// warning never went out (cron/studio-deletions), so a silent email outage
// cannot turn into a silent deletion.
//
// IN THE STUDIO'S LANGUAGE, to the OWNER'S address: the owner is the one who
// can pay, and the one the Terms name.
async function run() {
  const today = billingDay();
  const studios = await readArr<Record<string, unknown>>(REG.studios);
  const docs = await subscriptionDocs(studios.map((s) => String(s.id)));
  const byId = new Map(studios.map((s) => [String(s.id), s]));

  let sent = 0;
  let failed = 0;
  for (const { studioId, doc } of docs) {
    if (!doc) continue;
    const { send, markSent } = noticesDue(doc.subscription, today, doc.sentNotices || []);
    if (!send.length) continue;
    const studio = byId.get(studioId);
    const owner = studio?.ownerUserId ? await getUserById(String(studio.ownerUserId)) : null;
    if (!studio || !owner?.email) { failed += send.length; continue; }
    const locale = studioLocale(studio);

    // EACH STEP IS MARKED ON ITS OWN, so a shut-down warning that went is not
    // sent again tomorrow because the deletion warning beside it failed.
    const went: string[] = [];
    for (const notice of send) {
      const mail = subscriptionWarningEmail({
        locale, studioName: String(studio.name || ""), kind: notice.kind,
        on: notice.on, daysLeft: notice.daysLeft, url: `${SITE_URL}/${locale}/account`,
      });
      const res = await sendEmail({ to: owner.email, ...mail });
      if (res.ok) { sent += 1; went.push(...markSent.filter((k) => k.startsWith(`${notice.kind}:`))); } else failed += 1;
    }
    await markNoticesSent(studioId, went);
  }
  return Response.json({ ok: true, today, sent, failed });
}

export const GET = cronJob("subscription-notices", run);
