import { getRedisClient } from "@/lib/data/redis";
import { continentOf, CONTINENT_KEYS } from "@/lib/continents";
import { deviceOf, DEVICE_KEYS } from "@/lib/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public website traffic ingest. Fire-and-forget: never errors the visitor.
// Stores atomic per-day counters in a Redis hash `stat:day:<YYYY-MM-DD>` plus a
// per-day visitor set `stat:vis:<YYYY-MM-DD>`.
//
// NOTHING HERE EXPIRES. Both keys used to carry a 400-day TTL, and the new-year
// job deleted the closed year on top of that — so the record of how the website
// performed was designed to disappear about thirteen months after it was made,
// whether or not anybody had looked at it. Traffic history is the one thing that
// only gets more useful with age: this year is only interesting next to last
// year. A day is one small hash and there are 365 of them a year, so keeping
// every one of them costs almost nothing and answers "how are we doing compared
// to last spring" for as long as the product exists.

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
      if (vid) await client.sAdd(`stat:vis:${day}`, vid);
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
    return Response.json({ ok: true });
  } catch {
    // Telemetry must never surface an error to a website visitor.
    return Response.json({ ok: false }, { status: 200 });
  }
}
