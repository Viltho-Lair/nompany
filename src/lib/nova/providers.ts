// THE AI PROVIDERS Nova can run on. A person brings their OWN subscription, so
// they pick which provider their key is for and Nova talks to that one. This
// file is client-safe (no SDK imports) — the account settings render the choice
// from it; the server-side adapters that actually call each provider live in
// platform/nova/providers.

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
  { id: "google", label: "Gemini (Google)", keyHint: "AIza…", docs: "aistudio.google.com → Get API key", defaultModel: "gemini-2.0-flash" },
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
