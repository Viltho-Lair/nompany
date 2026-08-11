import { receiveMessage } from "@/lib/website";
import { incrWithTTL } from "@/lib/data/store";
import { RL } from "@/lib/data/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE ONLY UNAUTHENTICATED WRITE IN THE PRODUCT.
//
// It accepts a contact message for a PUBLISHED profile and nothing else: no
// session, no studio internals, and a 404 for an unpublished or unknown slug, so
// this can't be used to probe which studios exist. Rate-limited per IP, because
// a public form with no limit is a spam endpoint.
const MAX_PER_WINDOW = 5;
const WINDOW_SEC = 600;

export async function POST(request, ctx) {
  const { slug } = await ctx.params;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-real-ip") || "unknown";
  const hits = await incrWithTTL(RL.contactIp(ip), WINDOW_SEC);
  if (hits > MAX_PER_WINDOW) return Response.json({ error: "rate" }, { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await receiveMessage(slug, body);
  if (result.error) {
    // "notfound" covers both "no such studio" and "not published" on purpose.
    const status = result.error === "notfound" ? 404 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true }, { status: 201 });
}
