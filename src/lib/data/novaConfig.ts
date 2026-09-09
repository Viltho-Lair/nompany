// THE NOVA SWITCHBOARD, stored. Which capabilities the assistant offers,
// platform-wide — one small object edited in /super → Application → Nova, the
// same shape and lifecycle as catalogSettings.

import { getJSON, setJSON } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { NOVA_CAPABILITY_KEYS, type NovaConfig } from "@/lib/nova/capabilities";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import { cleanProvider, providerMeta } from "@/lib/nova/providers";

/* THE KEY IS THE PLATFORM'S NOW, NOT EACH PERSON'S.
   ------------------------------------------------------------------
   It used to live on the USER: every individual pasted their own Anthropic or
   OpenAI key into /account, and Nova ran on whichever subscription the reader
   happened to be paying for. That put a developer credential in front of every
   member of every studio — most of whom have no such key, no way to get one
   without a card, and no reason to know what a model id is — and it made the
   assistant's availability a property of the person rather than of the product.

   One key, set once in /super, is what makes Nova a feature of the plan.

   IT IS STORED ENCRYPTED AND NEVER RETURNED. `getNovaConfig` hands back
   `keySet` — a boolean — and the model, and nothing else; the plaintext is
   reachable only through `novaApiKey()`, which the server-side adapter calls.
   A GET that returned the key would put it in a browser, which is the whole
   thing this move exists to stop. */

type StoredNovaConfig = {
  enabled?: Record<string, unknown>;
  provider?: string;
  model?: string;
  apiKey?: string;
};

export async function getNovaConfig(): Promise<NovaConfig> {
  const stored = await getJSON<StoredNovaConfig>(REG.novaConfig);
  const provider = cleanProvider(stored?.provider);
  return {
    enabled: clean(stored?.enabled),
    provider,
    // THE MODEL FALLS BACK TO THE PROVIDER'S DEFAULT rather than to empty, so a
    // key saved without one still runs — and the screen shows what it will
    // actually use rather than a blank box implying nothing is set.
    model: String(stored?.model || "").trim() || providerMeta(provider).defaultModel,
    keySet: Boolean(stored?.apiKey),
  };
}

/** The plaintext key, for the server-side adapter alone. Never sent to a client. */
export async function novaApiKey(): Promise<string> {
  const stored = await getJSON<StoredNovaConfig>(REG.novaConfig);
  return stored?.apiKey ? decryptField(stored.apiKey) : "";
}

export async function saveNovaConfig(
  patch: { enabled?: Record<string, unknown>; provider?: unknown; model?: unknown; apiKey?: unknown } | null | undefined,
): Promise<NovaConfig> {
  const prior = await getJSON<StoredNovaConfig>(REG.novaConfig);
  const provider = patch?.provider === undefined ? cleanProvider(prior?.provider) : cleanProvider(patch.provider);

  // AN ABSENT KEY LEAVES THE STORED ONE ALONE; AN EMPTY STRING CLEARS IT.
  // The screen never receives the key, so it cannot send it back — without this
  // distinction every save of a capability toggle would wipe the credential.
  let apiKey = prior?.apiKey || "";
  if (patch?.apiKey !== undefined) {
    const raw = String(patch.apiKey || "").trim();
    apiKey = raw ? encryptField(raw) : "";
  }

  // SAME RULE AS THE KEY: absent means unchanged. The switchboard saves
  // `{enabled}` and the credential form saves `{provider, model, apiKey}`, so a
  // patch that replaced the whole object would have each form silently undoing
  // the other's work.
  const next: StoredNovaConfig = {
    enabled: patch?.enabled === undefined ? clean(prior?.enabled) : clean(patch.enabled),
    provider,
    model: String(patch?.model ?? prior?.model ?? "").trim(),
    apiKey,
  };
  await setJSON(REG.novaConfig, next);
  return getNovaConfig();
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
