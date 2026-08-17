import { cronDenied } from "@/lib/cronAuth";
import { sendEmail } from "@/lib/email";
import { readDays, readPages, daysOfYear, recordActiveUsers } from "@/lib/data/siteStats";
import { listUsersForConsole } from "@/lib/data/users";
import { listSuperAdminEmails } from "@/lib/superAuth";
import { statusOf, STATUS } from "@/lib/platformRoles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE DAILY SNAPSHOT, AND A REPORT WHEN THE YEAR TURNS.
//
// Runs EVERY DAY and does almost nothing on 364 of them. A job that only exists
// on 1 January is a job nobody notices has been broken since March; one that
// runs daily and no-ops is exercised constantly and fails loudly while there is
// still time to fix it.
//
// IT DELETES NOTHING. An earlier version mailed the closed year and then cleared
// it, which made the emailed CSV the only surviving copy of it. Traffic history
// is worth most when this spring can be read next to last spring, so every day
// stays on file for good — /api/track no longer expires them either — and the
// mail is a report rather than a rescue. `clearDays` is gone with that version.
//
// The manual export at /api/super/site-analytics/export answers the same
// question on demand, for any range, from the Analytics screen. This job exists
// for the half that cannot be done on demand: WRITING DOWN TODAY'S ACTIVE-USER
// COUNT, which nothing can reconstruct after the fact.
export async function GET(request) {
  // Fails closed when CRON_SECRET is unset — see lib/cronAuth.js.
  const denied = cronDenied(request);
  if (denied) return denied;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // EVERY day, before the new-year check.
  //
  // This is the reason the job is worth having. A user carries ONE "last seen"
  // timestamp, so anybody who has been back since has erased the evidence that
  // they were also here last Tuesday — asking today's records who was active a
  // week ago answers only with the people who never returned. The count has to
  // be written down on the day or it cannot be recovered.
  //
  // The Analytics page records it too, on load, so a day somebody opens the
  // dashboard is covered either way. hSetNX means first writer of the day wins,
  // so the two can never fight; this one covers the days nobody looks.
  let active = null;
  try {
    const users = await listUsersForConsole();
    active = users.filter((u) => statusOf(u, Date.now()) === STATUS.active).length;
    await recordActiveUsers(active);
  } catch (err) {
    // A missed snapshot costs one day of comparison, never the job.
    console.error("Active-user snapshot failed:", err.message);
  }

  // Month and day only: this is "is it 1 January", not "is it 1 January 2027".
  if (!today.endsWith("-01-01")) {
    return Response.json({ ok: true, today, active, skipped: "not new year" });
  }

  const year = now.getUTCFullYear() - 1;
  const days = daysOfYear(year);
  const [rows, pages] = await Promise.all([readDays(days), readPages(days)]);

  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const pageViews = rows.reduce((s, r) => s + r.pageViews, 0);

  // WHO GETS IT IS READ FROM THE OWNER RECORDS, not from an environment
  // variable. `g:superAdmins` is where a console owner actually exists — it is
  // what /super authenticates against — so adding one is the whole of adding a
  // recipient, and there is no second copy of the address to drift out of step
  // with it or to forget on a new deployment. Every owner is written to,
  // because a report addressed to one of two owners is a report the other one
  // does not know exists.
  const to = [...(await listSuperAdminEmails())].filter(Boolean);
  if (!to.length) {
    // Nowhere to send the summary. Worth saying out loud, but not an error: the
    // data it describes is still on file, and the export can produce it at any
    // time from the Analytics screen.
    console.error(`Year rollover: no super admins on file; no summary sent for ${year}.`);
    return Response.json({ ok: true, year, sessions, pageViews, mailed: false, kept: days.length });
  }

  // A year of days as CSV, attached rather than pasted, because 365 rows in the
  // body of an email is not something anybody reads.
  const csv = [
    "date,sessions,page views",
    ...rows.map((r) => `${r.day},${r.sessions},${r.pageViews}`),
    "",
    "page,views",
    ...pages.map((p) => `${p.page},${p.views}`),
  ].join("\r\n");

  let mailed = false;
  try {
    // sendEmail RETURNS a result rather than throwing, and returns ok:false when
    // delivery is disabled or unconfigured — both of which mean nobody got it.
    const sent = await sendEmail({
      to,
      subject: `Website traffic for ${year}`,
      text: [
        `${year} is closed. Every day of it is still on file; this is the summary.`,
        "",
        `Sessions (main page visits): ${sessions.toLocaleString("en-US")}`,
        `Page views (all pages):      ${pageViews.toLocaleString("en-US")}`,
        `Days recorded:               ${rows.filter((r) => r.pageViews > 0).length} of ${days.length}`,
        "",
        "The full day-by-day breakdown is attached. Any other range is available",
        "from Analytics → Real-time Analytics → Export.",
      ].join("\n"),
      attachments: [{ filename: `traffic-${year}.csv`, content: Buffer.from(csv, "utf8").toString("base64") }],
    });
    if (!sent?.ok) throw new Error(sent?.error || "send failed");
    mailed = true;
  } catch (err) {
    // A failed send used to be fatal, because the data was about to be destroyed
    // and this mail was its only copy. Nothing is destroyed now, so an
    // undelivered summary is worth logging and nothing more.
    console.error("Year rollover email failed:", err.message);
  }

  return Response.json({ ok: true, year, sessions, pageViews, mailed, kept: days.length });
}
