import { sendEmail } from "@/lib/email";
import { readDays, readPages, daysOfYear, clearDays } from "@/lib/data/siteStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The turn of the year for the website's traffic counters.
//
// Runs EVERY DAY and does nothing on 364 of them. A job that only exists on
// 1 January is a job nobody notices has been broken since March; one that runs
// daily and no-ops is exercised constantly and fails loudly while there is
// still time to fix it.
//
// On the first day of a new year it mails the year just ended to the super
// admin, then clears it, leaving a fresh table for the new year.
export async function GET(request) {
  // Vercel signs its cron calls. Anything else has to carry the secret.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const fromVercel = request.headers.get("x-vercel-cron");
  if (!fromVercel && secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Month and day only: this is "is it 1 January", not "is it 1 January 2027".
  if (!today.endsWith("-01-01")) {
    return Response.json({ ok: true, skipped: "not new year", today });
  }

  const year = now.getUTCFullYear() - 1;
  const days = daysOfYear(year);
  const [rows, pages] = await Promise.all([readDays(days), readPages(days)]);

  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const pageViews = rows.reduce((s, r) => s + r.pageViews, 0);

  // A year of days as CSV, attached rather than pasted, because 365 rows in the
  // body of an email is not something anybody reads.
  const csv = [
    "date,sessions,page views",
    ...rows.map((r) => `${r.day},${r.sessions},${r.pageViews}`),
    "",
    "page,views",
    ...pages.map((p) => `${p.page},${p.views}`),
  ].join("\n");

  const to = process.env.SUPER_ADMIN_EMAIL;
  if (!to) {
    // Nowhere to send it means nowhere to send it — keep the year rather than
    // silently destroying it, and say so loudly enough to be fixed.
    console.error("Year rollover: SUPER_ADMIN_EMAIL is not set; keeping", year);
    return Response.json({ ok: false, year, mailed: false, cleared: 0, error: "no-recipient" }, { status: 500 });
  }

  let mailed = false;
  {
    try {
      // sendEmail RETURNS a result rather than throwing, and returns ok:false
      // when delivery is disabled or unconfigured — both of which mean nobody
      // received the year.
      const sent = await sendEmail({
        to,
        subject: `Website traffic for ${year}`,
        text: [
          `${year} is closed. The counters have been archived and cleared, and ${year + 1} starts from zero.`,
          "",
          `Sessions (main page visits): ${sessions.toLocaleString("en-US")}`,
          `Page views (all pages):      ${pageViews.toLocaleString("en-US")}`,
          `Days recorded:               ${rows.filter((r) => r.pageViews > 0).length} of ${days.length}`,
          "",
          "The full day-by-day breakdown is attached.",
        ].join("\n"),
        attachments: [{ filename: `traffic-${year}.csv`, content: Buffer.from(csv, "utf8").toString("base64") }],
      });
      if (!sent?.ok) throw new Error(sent?.error || "send failed");
      mailed = true;
    } catch (err) {
      // A failed send must NOT clear the data — that would destroy the only
      // copy of a year nobody received. Better to keep it and retry tomorrow.
      console.error("Year rollover email failed:", err.message);
      return Response.json({ ok: false, year, mailed: false, cleared: 0, error: "email" }, { status: 500 });
    }
  }

  const cleared = await clearDays(days);
  return Response.json({ ok: true, year, sessions, pageViews, mailed, cleared });
}
