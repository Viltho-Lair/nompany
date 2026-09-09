import { route } from "@/platform/http/route";
import { getGreetingConfig, saveGreetingConfig, getDailyBand, regenerateToday } from "@/lib/data/greeting";
import { getNovaConfig } from "@/lib/data/novaConfig";

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

async function payload() {
  const [config, band, nova] = await Promise.all([getGreetingConfig(), getDailyBand(), getNovaConfig()]);
  return { config, preview: band, ai: { keySet: nova.keySet, provider: nova.provider, model: nova.model } };
}

export const GET = route(spec, async () => payload());

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  await saveGreetingConfig(body);
  return { ok: true, ...(await payload()) };
});

// Regenerate today's automated messages — see `regenerateToday`. A POST rather
// than a PUT because it changes nothing a person typed: it replaces derived
// output, and running it twice is running it twice rather than an error.
export const POST = route(spec, async () => {
  await regenerateToday();
  return { ok: true, ...(await payload()) };
});
