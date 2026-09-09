import { route } from "@/platform/http/route";
import { getGreetingConfig, saveGreetingConfig, resolveGreeting } from "@/lib/data/greeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The greeting the studios see, edited platform-wide. Same shape and lifecycle
// as super/nova-config beside it: one small object, GET hands back the stored
// config AND today's resolved message so the console can show what a studio is
// actually reading right now rather than only what was typed.
const spec = { auth: "super", name: "super/greeting" };

export const GET = route(spec, async () => {
  const config = await getGreetingConfig();
  return { config, preview: resolveGreeting(config) };
});

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  const config = await saveGreetingConfig(body);
  return { ok: true, config, preview: resolveGreeting(config) };
});
