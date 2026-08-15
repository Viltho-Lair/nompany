import { getRedisClient } from "@/lib/data/redis";
import { continentOf, CONTINENT_KEYS } from "@/lib/continents";
import { deviceOf, DEVICE_KEYS } from "@/lib/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public website traffic ingest. Fire-and-forget: never errors the visitor.
// Stores atomic per-day counters in a Redis hash `stat:day:<YYYY-MM-DD>` plus a
// per-day visitor set `stat:vis:<YYYY-MM-DD>`. Both keys carry a ~8-month TTL,
// so old data auto-expires (retention) without a cron.
// LONGER THAN A CALENDAR YEAR, deliberately. Retention is now the new-year
// rollover's job (/api/cron/year-rollover mails the closed year to the super
// admin, then clears it); this TTL is only a backstop so nothing lingers for
// ever if that job is removed. At 8 months it was expiring January before
// December could report it.
const RETENTION_SEC = 400 * 24 * 60 * 60;

const slug = (s, max = 40) => String(s || "").toLowerCase().replace(/[^a-z0-9\-_/]/g, "").slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "");
    const vid = String(body.vid || "").slice(0, 64);
    const client = await getRedisClient();
    const day = today();
    const hkey = `stat:day:${day}`;
    const inc = (field) => client.hIncrBy(hkey, field, 1);

    if (type === "page_view") {
      const page = slug(body.page || "home") || "home";
      await inc(`pv:${page}`);
      await inc("pv:__total");
      // WHERE FROM, at continent granularity. The edge hands us a country code
      // on the request; it is mapped to a continent here and thrown away, so
      // what lands in Redis is coarser and less identifying than what arrived.
      // No IP, no city, nothing tied to the visitor id.
      const continent = continentOf(request.headers.get("x-vercel-ip-country"));
      await inc(`geo:${CONTINENT_KEYS[continent] || "other"}`);
      // WHAT KIND OF MACHINE, the same way: the user-agent is reduced to one of
      // three words and discarded. A full UA string is a fingerprint; "mobile"
      // is not, and is all the dashboard asks for.
      const device = deviceOf(request.headers.get("user-agent"));
      await inc(`dev:${DEVICE_KEYS[device] || "desktop"}`);
      if (vid) {
        const vkey = `stat:vis:${day}`;
        await client.sAdd(vkey, vid);
        await client.expire(vkey, RETENTION_SEC);
      }
    } else if (type === "section_open") {
      const sec = slug(body.section);
      if (!sec) return Response.json({ ok: false }, { status: 200 });
      await inc(`sec:${sec}`);
    } else if (type === "chat_open") {
      await inc("chat:opens");
    } else if (type === "chat_topic") {
      const topic = body.topic === "sales" ? "sales" : body.topic === "support" ? "support" : "";
      if (!topic) return Response.json({ ok: false }, { status: 200 });
      await inc(`chat:${topic}`);
    } else {
      return Response.json({ ok: false }, { status: 200 });
    }
    await client.expire(hkey, RETENTION_SEC);
    return Response.json({ ok: true });
  } catch {
    // Telemetry must never surface an error to a website visitor.
    return Response.json({ ok: false }, { status: 200 });
  }
}
