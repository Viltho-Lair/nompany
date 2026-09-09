// THE AI PROVIDERS Nova can run on. A person brings their OWN subscription, so
// they pick which provider their key is for and Nova talks to that one. This
// file is client-safe (no SDK imports) — the account settings render the choice
// from it; the server-side adapters that actually call each provider live in
// platform/nova/providers.

/* A DEFAULT MODEL ID GOES STALE, AND ONE DID — measured 09/09/2026.
   ------------------------------------------------------------------
   `gemini-2.0-flash` was retired by Google and every call returned
   "404 … This model is no longer available. Please update your code to use
   models/gemini-3.6-flash". Nothing in this repository could have caught that:
   a model id is a string we hand to somebody else's API, and the only thing
   that knows it is dead is the API.

   The file already argued that a hard-coded model DROPDOWN goes stale (see
   `defaultModel` below) — and then hard-coded the default, which is the same
   claim one layer down. It is still the right shape: the model is a FIELD, so a
   studio can type whatever their key serves without waiting for a deploy. What
   this costs is that a stale default sends the first-time user straight into a
   404, so the value below is a measurement with a date, not a fact.

   AND CHANGING IT DOES NOT REPAIR A SAVED ONE. `getNovaConfig` reads
   `stored.model || defaultModel`, so anybody who has already saved a model keeps
   it — deliberately, because guessing a replacement is choosing what the
   platform runs on. The console prints the provider's own error, which names the
   model to use. */
export type ProviderMeta = {
  id: string;
  label: string;        // what the account screen shows
  keyHint: string;      // the shape of a key, as a placeholder
  docs: string;         // where to get one
  defaultModel: string; // the model used unless overridden
};

export const NOVA_PROVIDERS: ProviderMeta[] = [
  { id: "anthropic", label: "Claude (Anthropic)", keyHint: "sk-ant-…", docs: "console.anthropic.com → API Keys", defaultModel: "claude-sonnet-5" },
  { id: "openai", label: "ChatGPT (OpenAI)", keyHint: "sk-…", docs: "platform.openai.com → API keys", defaultModel: "gpt-4o" },
  { id: "google", label: "Gemini (Google)", keyHint: "AIza…", docs: "aistudio.google.com → Get API key", defaultModel: "gemini-3.6-flash" },
];

export const PROVIDER_IDS: ReadonlySet<string> = new Set(NOVA_PROVIDERS.map((p) => p.id));
export const DEFAULT_PROVIDER = "anthropic";

/** The chosen provider's metadata, falling back to the default rather than null. */
export function providerMeta(id: string | null | undefined): ProviderMeta {
  return NOVA_PROVIDERS.find((p) => p.id === id) || NOVA_PROVIDERS[0];
}

/** Validate a stored/submitted provider id to a real one. */
export function cleanProvider(id: unknown): string {
  const s = String(id || "").trim();
  return PROVIDER_IDS.has(s) ? s : DEFAULT_PROVIDER;
}
