// THE NOVA SWITCHBOARD, stored. Which capabilities the assistant offers,
// platform-wide — one small object edited in /super → Application → Nova, the
// same shape and lifecycle as catalogSettings.

import { getJSON, setJSON } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { NOVA_CAPABILITY_KEYS, type NovaConfig } from "@/lib/nova/capabilities";

export async function getNovaConfig(): Promise<NovaConfig> {
  const stored = await getJSON<{ enabled?: Record<string, unknown> }>(REG.novaConfig);
  return { enabled: clean(stored?.enabled) };
}

export async function saveNovaConfig(patch: { enabled?: Record<string, unknown> } | null | undefined): Promise<NovaConfig> {
  const next: NovaConfig = { enabled: clean(patch?.enabled) };
  await setJSON(REG.novaConfig, next);
  return next;
}

// THE WRITE BOUNDARY: only real capability keys, only booleans. A key the
// registry does not know cannot be stored — so a capability removed later leaves
// no orphan toggle, and a bad body can never switch on something that does not
// exist. Absent keys fall back to each capability's built-in default at read
// time (see capabilityEnabled), so storing only the explicit overrides is enough.
function clean(enabled: Record<string, unknown> | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(enabled || {})) {
    if (NOVA_CAPABILITY_KEYS.has(k) && typeof v === "boolean") out[k] = v;
  }
  return out;
}
