import { route } from "@/platform/http/route";
import { getNovaConfig, saveNovaConfig } from "@/lib/data/novaConfig";
import { NOVA_CAPABILITIES } from "@/lib/nova/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Nova switchboard: which capabilities the assistant offers, platform-wide.
// One object, like catalog-settings — GET hands back the stored overrides AND
// the catalogue itself, so the console renders the rows and their built-in
// defaults from one read rather than shipping the registry to the client twice.
const spec = { auth: "super", name: "super/nova-config" };

export const GET = route(spec, async () => ({
  config: await getNovaConfig(),
  capabilities: NOVA_CAPABILITIES,
}));

export const PUT = route({ ...spec, body: true }, async ({ body }) => ({
  ok: true,
  config: await saveNovaConfig(body),
}));
