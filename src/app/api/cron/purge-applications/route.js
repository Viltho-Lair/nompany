import { purgeExpiredApplications } from "@/lib/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily cleanup of applications past their 7-day retention. Scheduled in
// vercel.json. The operation only removes already-expired rejected records, so
// it is safe and idempotent; an optional CRON_SECRET can gate it if set.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const removed = await purgeExpiredApplications();
  return Response.json({ ok: true, removed });
}
