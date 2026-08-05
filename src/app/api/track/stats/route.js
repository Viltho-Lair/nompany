import { getRedisClient } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dayStr(d) { return d.toISOString().slice(0, 10); }
function midnightUTC() { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; }
function minus(d, days) { const x = new Date(d); x.setUTCDate(x.getUTCDate() - days); return x; }
const dm = (s) => { const p = String(s).split("-"); return `${p[2]}/${p[1]}`; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Read one day's counters + distinct visitor count.
async function readDay(client, day) {
  const [h, v] = await Promise.all([
    client.hGetAll(`stat:day:${day}`).catch(() => ({})),
    client.sCard(`stat:vis:${day}`).catch(() => 0),
  ]);
  return { h: h || {}, visitors: Number(v) || 0 };
}

// Fold a day's hash into a per-bucket accumulator + range-wide breakdowns.
function fold(bucket, breakdown, day) {
  bucket.visitors += day.visitors;
  for (const [k, raw] of Object.entries(day.h)) {
    const n = Number(raw) || 0;
    if (k === "pv:__total") bucket.pageViews += n;
    else if (k.startsWith("pv:")) breakdown.pages[k.slice(3)] = (breakdown.pages[k.slice(3)] || 0) + n;
    else if (k.startsWith("sec:")) { bucket.sectionClicks += n; breakdown.sections[k.slice(4)] = (breakdown.sections[k.slice(4)] || 0) + n; }
    else if (k === "chat:opens") bucket.chatOpens += n;
    else if (k === "chat:sales") { bucket.chatSales += n; breakdown.chat.sales += n; }
    else if (k === "chat:support") { bucket.chatSupport += n; breakdown.chat.support += n; }
  }
}

const blankBucket = (label) => ({ label, visitors: 0, pageViews: 0, sectionClicks: 0, chatOpens: 0, chatSales: 0, chatSupport: 0 });

export async function GET(request) {
  const actor = await requireSection("content-statistics");
  if (!actor) return forbidden();
  const { searchParams } = new URL(request.url);
  const client = await getRedisClient();

  // Full CSV report of every retained day (long format: date,category,key,value).
  if (searchParams.get("export") === "1") {
    let keys = [];
    try { keys = await client.keys("stat:day:*"); } catch { keys = []; }
    const days = keys.map((k) => k.replace("stat:day:", "")).sort();
    const rows = [["date", "category", "key", "value"]];
    for (const day of days) {
      const d = await readDay(client, day);
      if (d.visitors) rows.push([day, "visitors", "unique", d.visitors]);
      for (const [k, raw] of Object.entries(d.h)) {
        const n = Number(raw) || 0;
        if (k === "pv:__total") rows.push([day, "pageViews", "total", n]);
        else if (k.startsWith("pv:")) rows.push([day, "page", k.slice(3), n]);
        else if (k.startsWith("sec:")) rows.push([day, "section", k.slice(4), n]);
        else if (k.startsWith("chat:")) rows.push([day, "chat", k.slice(5), n]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="website-traffic-${dayStr(new Date())}.csv"` } });
  }

  const range = searchParams.get("range") || "7d";
  const base = midnightUTC();
  const breakdown = { pages: {}, sections: {}, chat: { opens: 0, sales: 0, support: 0 } };
  const buckets = [];

  // Build 7 buckets, each a list of day strings, oldest → newest.
  const specs = [];
  if (range === "7w") {
    for (let w = 6; w >= 0; w--) {
      const end = minus(base, 7 * w);
      const days = Array.from({ length: 7 }, (_, i) => dayStr(minus(end, 6 - i)));
      specs.push({ label: dm(dayStr(end)), days });
    }
  } else if (range === "7m") {
    for (let m = 6; m >= 0; m--) {
      const ref = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - m, 1));
      const y = ref.getUTCFullYear(), mo = ref.getUTCMonth();
      const last = m === 0 ? base.getUTCDate() : new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      const days = Array.from({ length: last }, (_, i) => dayStr(new Date(Date.UTC(y, mo, i + 1))));
      specs.push({ label: `${MONTHS[mo]} ${String(y).slice(2)}`, days });
    }
  } else { // 7d
    for (let d = 6; d >= 0; d--) { const day = dayStr(minus(base, d)); specs.push({ label: dm(day), days: [day] }); }
  }

  // Read every needed day once.
  const needed = [...new Set(specs.flatMap((s) => s.days))];
  const cache = {};
  await Promise.all(needed.map(async (day) => { cache[day] = await readDay(client, day); }));

  for (const spec of specs) {
    const b = blankBucket(spec.label);
    for (const day of spec.days) fold(b, breakdown, cache[day] || { h: {}, visitors: 0 });
    breakdown.chat.opens += b.chatOpens;
    buckets.push(b);
  }

  const totals = buckets.reduce((a, b) => ({ visitors: a.visitors + b.visitors, pageViews: a.pageViews + b.pageViews, sectionClicks: a.sectionClicks + b.sectionClicks, chatOpens: a.chatOpens + b.chatOpens }), { visitors: 0, pageViews: 0, sectionClicks: 0, chatOpens: 0 });
  const toList = (obj) => Object.entries(obj).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return Response.json({
    range,
    buckets,
    totals,
    pages: toList(breakdown.pages),
    sections: toList(breakdown.sections),
    chat: breakdown.chat,
  });
}
