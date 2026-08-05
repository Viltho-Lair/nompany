import { getRedisClient } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public website traffic ingest. Fire-and-forget: never errors the visitor.
// Stores atomic per-day counters in a Redis hash `stat:day:<YYYY-MM-DD>` plus a
// per-day visitor set `stat:vis:<YYYY-MM-DD>`. Both keys carry a ~8-month TTL,
// so old data auto-expires (retention) without a cron.
const RETENTION_SEC = 240 * 24 * 60 * 60; // ~8 months

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
