import { cronJob } from "@/platform/http/cron";
import { log } from "@/platform/http/observability";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listCollaborators } from "@/platform/auth/collaborators";
import { getUserById } from "@/platform/auth/users";
import { listForCollaborator } from "@/platform/notify/notifications";
import { readPrefsMany, markDigestSent } from "@/platform/notify/prefs";
import { sendEmail } from "@/platform/notify/email";
import { digestEmail } from "@/platform/notify/emailTemplates";
import { noticeUrl, settingsUrl } from "@/platform/notify/deliver";
import { renderNotice } from "@/modules/administration/notices";
import { kindOf } from "@/shared/notificationKinds";
import { wantsInDigest, type NotificationPrefs } from "@/shared/notificationPrefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE DAILY SUMMARY (29/09/2026) — one email to each person who chose "Daily
// summary" on /account, listing what they have not read since the last one,
// across every studio they belong to. An hour after `daily-notices`, so the
// day's reminders are in it.
//
// NOTHING NEW, NOTHING SENT: a day with no unread notice is a day with no
// email. The window starts where the last summary stopped (`lastDigestAt`), or
// a day back for the first one, so a notice is summarised once.
//
// A STUDIO AT A TIME for the reading, a person at a time for the sending:
// somebody in three studios gets ONE email with three headings, not three.
export const GET = cronJob("notice-digest", run);

const PER_PERSON = 20;
type StudioRow = { id: string; slug?: string; name?: string; noticeTemplates?: unknown };
type Line = { title: string; body: string; url: string; studio: string };

async function run() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const studios = await readArr<StudioRow>(REG.studios);

  const lines = new Map<string, { prefs: NotificationPrefs; items: Line[]; total: number }>();

  for (const studio of studios) {
    try {
      const people = await listCollaborators(studio.id);
      const userOf = new Map(people.map((c) => [String(c.id), String((c as { userId?: unknown }).userId || "")]));
      const prefs = await readPrefsMany([...userOf.values()]);
      for (const [collaboratorId, userId] of userOf) {
        const p = prefs.get(userId);
        if (!p || p.email !== "digest") continue;
        const since = p.lastDigestAt || dayAgo;
        const { rows } = await listForCollaborator(studio.id, collaboratorId, { unread: true, limit: 100 });
        const fresh = rows.filter((n) => String(n.at || "") > since && wantsInDigest(p, kindOf(n.type).category));
        if (!fresh.length) continue;
        const entry = lines.get(userId) || { prefs: p, items: [], total: 0 };
        for (const n of fresh) {
          entry.total += 1;
          if (entry.items.length >= PER_PERSON) continue;
          const words = renderNotice(n as never, p.locale, studio.noticeTemplates);
          entry.items.push({ title: words.title, body: words.body, url: noticeUrl(studio, n.href), studio: String(studio.name || "") });
        }
        lines.set(userId, entry);
      }
    } catch (e) {
      // One studio that cannot be read costs its people that studio's lines
      // today, never the run.
      log.error("notice-digest: studio read failed", { studioId: studio.id, error: (e as Error).message });
    }
  }

  let sent = 0;
  const at = now.toISOString();
  for (const [userId, { prefs, items, total }] of lines) {
    try {
      const user = await getUserById(userId);
      const to = String((user as { email?: unknown } | null)?.email || "");
      if (!to) continue;
      const mail = digestEmail({ locale: prefs.locale, lines: items, total, settingsUrl: settingsUrl(prefs.locale) });
      const out = await sendEmail({ to, ...mail });
      // THE WINDOW MOVES ONLY WHEN THE EMAIL WENT — a suppressed or failed
      // send leaves it where it was, so tomorrow's summary still carries today's.
      if (out.ok) {
        await markDigestSent(userId, at);
        sent += 1;
      }
    } catch (e) {
      log.error("notice-digest: send failed", { userId, error: (e as Error).message });
    }
  }
  return Response.json({ ok: true, studios: studios.length, people: lines.size, sent });
}
