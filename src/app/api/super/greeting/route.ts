import { route } from "@/platform/http/route";
import {
  getGreetingConfig, saveGreetingConfig, getDailyBand, regenerateToday,
  broadcastMessage, withdrawMessage,
} from "@/lib/data/greeting";
import { getNovaConfig } from "@/lib/data/novaConfig";
import { DAYPARTS } from "@/shared/greeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The band the studios see, edited platform-wide. GET hands back the stored
// messages AND today's resolved band, so the console shows what a studio is
// actually reading right now rather than only what was typed — and for an
// automated message those are different things.
//
// IT REPORTS THE KEY'S STATE AND NEVER THE KEY. `keySet` comes from the Nova
// config, which is where the credential is set; this screen only needs to say
// whether the automated messages have anything to run on, and to point at the
// tab that fixes it when they do not.
const spec = { auth: "super", name: "super/greeting" };

/* THE CONSOLE PREVIEWS EVERY PART OF THE DAY, not the one whoever is looking
   happens to be in. Three bands come back keyed by daypart, so a person can see
   that the evening message exists and what it says — which is the only way to
   notice that one of the three failed to generate. */
async function payload() {
  const [config, nova] = await Promise.all([getGreetingConfig(), getNovaConfig()]);
  const bands = {} as Record<string, Awaited<ReturnType<typeof getDailyBand>>>;
  for (const daypart of DAYPARTS) bands[daypart] = await getDailyBand(daypart);
  return { config, bands, ai: { keySet: nova.keySet, provider: nova.provider, model: nova.model } };
}

export const GET = route(spec, async () => payload());

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  await saveGreetingConfig(body);
  return { ok: true, ...(await payload()) };
});

/* THE ACTS, SEPARATE FROM THE EDIT — the RFQ shape. PUT saves what somebody
   typed and changes nothing anybody reads; POST performs one of three
   transitions, each of which does.

   `broadcast` is the send (and the re-send: the same call, a fresh stamp),
   `withdraw` stops serving one, `regenerate` replaces today's generated words.
   None of them touches a draft's text, so a person cannot lose an edit by
   pressing a button. */
export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const b = (body || {}) as { action?: unknown; id?: unknown };
  const id = String(b.id || "");
  if (b.action === "broadcast") await broadcastMessage(id);
  else if (b.action === "withdraw") await withdrawMessage(id);
  else await regenerateToday();
  return { ok: true, ...(await payload()) };
});
