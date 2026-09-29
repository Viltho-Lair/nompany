// BEYOND THE BELL — a notice that has just been stored also goes by email and
// push to whoever asked for that (29/09/2026). The bell never depends on this:
// it is written first, and everything here is a courtesy on top of it.
//
// WHAT EACH PERSON ASKED FOR is `shared/notificationPrefs`: email off, every
// notice, or a daily summary (the summary is the daily-digest cron's, not
// this file's); per category, whether email and push carry it; quiet hours,
// which hold push and never email.
//
// AFTER THE RESPONSE, NEVER BEFORE IT. An email is a network call to Resend and
// a push is one to each of a person's devices; making the request that caused
// the notice wait for them would put a third party's latency on every approval,
// assignment and payment in the product. `later` hands the work to Next's
// `after()`, which runs once the response has gone; outside a request (a
// script, a test) it runs in line.

import { REG } from "@/platform/db/keys";
import { readArr } from "@/platform/db/store";
import { getUserById } from "@/platform/auth/users";
import { log } from "@/platform/http/observability";
import { readPrefsMany } from "./prefs";
import { pushToUser } from "./push";
import { sendEmail } from "./email";
import { noticeEmail } from "./emailTemplates";
import { renderNotice, cleanTemplates } from "@/modules/administration/notices";
import { kindOf } from "@/shared/notificationKinds";
import { wantsInstantEmail, wantsPush } from "@/shared/notificationPrefs";
import { SITE_URL } from "@/lib/seo";

type Row = { id: string; type?: unknown; recipientId?: unknown; href?: unknown; [k: string]: unknown };
type StudioRow = { id: string; slug?: string; name?: string; noticeTemplates?: unknown };

/** Run after the response when there is one, in line when there is not. */
export async function later(work: () => Promise<unknown>) {
  const run = () => work().catch((e) => log.error(`[deliver] ${(e as Error).message}`));
  try {
    const { after } = await import("next/server");
    after(run);
  } catch {
    // No request scope (a script, a test, the cron's own loop outside Next):
    // there is no response to wait for, so do it now.
    await run();
  }
}

/** Where the account page's notification settings are — every email links there. */
export const settingsUrl = (locale: string) => `${SITE_URL}/${locale === "ar" ? "ar" : "en"}/account?view=notifications`;

/** A studio-relative link, made absolute for a message that leaves the product. */
export const noticeUrl = (studio: StudioRow | undefined, href: unknown) =>
  studio?.slug ? `${SITE_URL}/${studio.slug}${href ? `/${String(href)}` : ""}` : SITE_URL;

/**
 * THE NOTICES JUST WRITTEN, TO EACH RECIPIENT'S OTHER CHANNELS. `userIdOf` is
 * the same mapping the doorbell uses; a recipient it cannot map is somebody
 * this call cannot reach beyond the bell.
 */
export async function deliverBeyondBell(
  studioId: string, rows: readonly Row[], userIdOf?: (collaboratorId: string) => string | undefined,
) {
  if (!rows.length || !userIdOf) return;
  const byUser = new Map<string, Row>();
  for (const r of rows) {
    const userId = userIdOf(String(r.recipientId || ""));
    if (userId) byUser.set(userId, r);
  }
  if (!byUser.size) return;

  const prefs = await readPrefsMany([...byUser.keys()]);
  const now = new Date();
  let studio: StudioRow | undefined;
  const studioOnce = async () => (studio ??= (await readArr<StudioRow>(REG.studios)).find((s) => s.id === studioId));

  await Promise.all([...byUser].map(async ([userId, row]) => {
    const p = prefs.get(userId);
    if (!p) return;
    const category = kindOf(row.type).category;

    if (wantsPush(p, category, now)) await pushToUser(userId);

    if (wantsInstantEmail(p, category)) {
      const [user, s] = await Promise.all([getUserById(userId), studioOnce()]);
      const to = String((user as { email?: unknown } | null)?.email || "");
      if (!to) return;
      const words = renderNotice(row as never, p.locale, cleanTemplates(s?.noticeTemplates));
      const mail = noticeEmail({
        locale: p.locale,
        notice: { title: words.title, body: words.body, studio: s?.name || "", url: noticeUrl(s, row.href) },
        settingsUrl: settingsUrl(p.locale),
      });
      const sent = await sendEmail({ to, ...mail });
      if (!sent.ok && !sent.skipped) log.warn(`[deliver] email to ${userId} failed: ${sent.error}`);
    }
  }));
}
