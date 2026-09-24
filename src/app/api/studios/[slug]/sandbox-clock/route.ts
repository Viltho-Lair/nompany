import { route } from "@/platform/http/route";
import { isSandbox } from "@/lib/sandbox";
import { sandboxSetClock, studioBilling } from "@/lib/data/subscriptions";
import { subscriptionWarningEmail } from "@/platform/notify/emailTemplates";
import { studioLocale } from "@/shared/locale";
import { daysBetween, billingDay } from "@/shared/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE SANDBOX CLOCK, for rehearsing the unpaid ladder (lib/data/subscriptions'
// sandboxSetClock says what each setting does). 404 OUTSIDE THE SANDBOX — this
// door does not exist in production, and saying "forbidden" would confirm it is
// there to be found. Owner only inside it.
//
// ON THE SUBSCRIPTION GATE'S ALWAYS-OPEN LIST, because the clock has to be able
// to move a shut-down studio back again.
//
// GET ?preview=shut-down|deletion answers the warning email this studio would be
// sent for that step, as HTML — the email can be read without sending one (the
// sandbox sends none: EMAILS_ENABLED is off there).
const spec = { auth: "studio", name: "studio/sandbox-clock", keys: false } as const;
type Ctx = { studio: Record<string, unknown> & { id: string }; collaborator: { role?: unknown }; request: Request; body?: Record<string, unknown> };

const refuse = (c: Ctx) => (!isSandbox() ? { error: "notfound" } : c.collaborator?.role !== "owner" ? { error: "owner-only" } : null);

export const GET = route(spec, async (raw) => {
  const c = raw as unknown as Ctx;
  const no = refuse(c);
  if (no) return no;
  const billing = await studioBilling(c.studio.id);
  const preview = new URL(c.request.url).searchParams.get("preview");
  if (preview === "shut-down" || preview === "deletion") {
    const on = preview === "deletion" ? billing.dates?.deletedOn || "" : billing.dates?.shutsDownOn || "";
    const mail = subscriptionWarningEmail({
      locale: studioLocale(c.studio), studioName: String(c.studio.name || ""), kind: preview,
      on, daysLeft: Math.max(1, daysBetween(billingDay(), on)), url: "/",
    });
    return new Response(mail.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return { sandbox: true, ...billing };
});

export const POST = route({ ...spec, body: true }, async (raw) => {
  const c = raw as unknown as Ctx;
  const no = refuse(c);
  if (no) return no;
  const to = c.body?.to;
  const value = to === "reset" || to === "free-ended" ? to : Number(to);
  if (typeof value === "number" && !(Number.isFinite(value) && value >= -30 && value <= 400)) return { error: "bad-day" };
  const out = await sandboxSetClock(c.studio.id, value);
  if ("error" in out) return out;
  return { ok: true, ...(await studioBilling(c.studio.id)) };
});
