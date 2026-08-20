import { STAT, RL } from "@/lib/data/keys";
import { hIncrBounded, pfAdd, incrWithTTL } from "@/lib/data/store";
import { continentOf, CONTINENT_KEYS } from "@/lib/continents";
import { deviceOf, DEVICE_KEYS } from "@/lib/devices";
import { isCrossSite } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public website traffic ingest. Fire-and-forget: never errors the visitor.
// Stores atomic per-day counters in `stat:day:<YYYY-MM-DD>` plus a per-day
// distinct-visitor estimate in `stat:vis:<YYYY-MM-DD>`.
//
// NOTHING HERE EXPIRES, and that is deliberate. Both keys used to carry a
// 400-day TTL and the new-year job deleted the closed year on top of that — so
// the record of how the website performed was designed to disappear about
// thirteen months after it was made, whether or not anybody had looked at it.
// Traffic history is the one thing that only gets more useful with age.
//
// THE PRICE OF KEEPING IT FOREVER IS THAT EVERY SHAPE MUST BE BOUNDED, and
// until now neither was. This is the one endpoint in the product an
// unauthenticated caller can make WRITE, with no session, no rate limit and no
// origin check — and Redis is the only storage the product has, so a full
// instance fails every write in it: sign-ups, invoices, quotations, sessions.
// Three things were unbounded and now are not:
//
//   1. HOW OFTEN. A per-IP window, below. Not a complete answer on its own — a
//      distributed caller has many addresses — but it is what turns "one curl
//      loop" back into "a botnet", and the two shapes below cap what even that
//      can achieve.
//   2. HOW MANY DISTINCT VISITORS. `vid` is chosen by the caller, so the SET
//      this used to write was an unbounded structure fed by strangers. A
//      HyperLogLog answers the same question in a constant ~12 KB.
//   3. HOW MANY DISTINCT PAGES. `page` is chosen by the caller too, so the hash
//      could grow a field per request forever. hIncrBounded caps the field
//      count per day and folds the rest into one overflow bucket.
//
// Nothing about what is COLLECTED has changed, and it is still deliberately
// coarse: a country header reduced to a continent and discarded, a user-agent
// reduced to one of three words and discarded. No IP, no city, nothing tied to
// the visitor id.

// Generous for a real marketing site, and low enough that abuse is bounded.
const RATE_MAX = 120;
const RATE_WINDOW_SEC = 60;

const slug = (s, max = 40) => String(s || "").toLowerCase().replace(/[^a-z0-9\-_/]/g, "").slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const bounded = { max: STAT.MAX_FIELDS_PER_DAY, overflow: STAT.OVERFLOW_FIELD };

// Caller IP, as the edge reports it.
const ipOf = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || request.headers.get("x-real-ip")
  || "";

export async function POST(request) {
  try {
    if (isCrossSite(request)) return Response.json({ ok: false }, { status: 200 });

    const ip = ipOf(request);
    if ((await incrWithTTL(RL.trackIp(ip), RATE_WINDOW_SEC)) > RATE_MAX) {
      // 200, not 429: this is telemetry, the caller is a page that has already
      // rendered, and there is nothing useful it could do with the difference.
      return Response.json({ ok: false }, { status: 200 });
    }

    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "");
    const vid = String(body.vid || "").slice(0, 64);
    const day = today();
    const hkey = STAT.day(day);
    const inc = (field) => hIncrBounded(hkey, field, bounded);

    if (type === "page_view") {
      const page = slug(body.page || "home") || "home";
      await inc(`pv:${page}`);
      await inc("pv:__total");
      // WHERE FROM, at continent granularity. The edge hands us a country code
      // on the request; it is mapped to a continent here and thrown away, so
      // what lands in Redis is coarser and less identifying than what arrived.
      const continent = continentOf(request.headers.get("x-vercel-ip-country"));
      await inc(`geo:${CONTINENT_KEYS[continent] || "other"}`);
      // WHAT KIND OF MACHINE, the same way: the user-agent is reduced to one of
      // three words and discarded. A full UA string is a fingerprint; "mobile"
      // is not, and is all the dashboard asks for.
      const device = deviceOf(request.headers.get("user-agent"));
      await inc(`dev:${DEVICE_KEYS[device] || "desktop"}`);
      if (vid) await pfAdd(STAT.visitors(day), vid);
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
