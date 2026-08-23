// THE TOOL LOOP, PROVIDER-NEUTRAL. Nova runs on whichever AI the person brought
// a key for — Claude, ChatGPT or Gemini — so the loop is described once in a
// neutral shape and each provider has a small adapter that speaks its own
// dialect. The dialects differ (Anthropic's tool_use blocks, OpenAI's
// tool_calls, Gemini's functionCall), but the shape is the same: call the model,
// run any tool it asks for in THIS user's context, feed the result back, repeat
// until it answers or the turn cap is hit.
//
// The chosen adapter is dynamic-imported, so a request only ever loads the one
// SDK it needs rather than all three.

import { providerMeta } from "@/lib/nova/providers";

export const NOVA_MAX_TURNS = Math.max(1, Number(process.env.NOVA_MAX_TURNS || 6));

// The neutral tool a capability becomes: a name, a description, and a JSON-schema
// for its input. Every provider accepts JSON schema for tool parameters, so this
// crosses all three unchanged.
export type NeutralTool = { name: string; description: string; parameters: Record<string, unknown> };
export type NeutralMessage = { role: "user" | "assistant"; content: string };

export type RunArgs = {
  apiKey: string;
  model: string;
  system: string;
  messages: NeutralMessage[];
  tools: NeutralTool[];
  execute: (name: string, input: unknown) => Promise<unknown>;
  maxTurns: number;
};

export type NovaToolResult = { text: string; usedTools: string[] };
export type ProviderRunner = (args: RunArgs) => Promise<NovaToolResult>;

/**
 * Run Nova with a person's own provider and key. `model` defaults to the
 * provider's default when not given. `execute(name, input)` runs one tool in the
 * user's context; a throw inside a tool becomes an error the model can read,
 * never a crash.
 */
export async function runNova(opts: {
  provider: string;
  apiKey: string;
  model?: string;
  system: string;
  messages: NeutralMessage[];
  tools: NeutralTool[];
  execute: (name: string, input: unknown) => Promise<unknown>;
}): Promise<NovaToolResult> {
  const meta = providerMeta(opts.provider);
  const args: RunArgs = {
    apiKey: opts.apiKey,
    model: opts.model || meta.defaultModel,
    system: opts.system,
    messages: opts.messages,
    tools: opts.tools,
    execute: opts.execute,
    maxTurns: NOVA_MAX_TURNS,
  };

  // Only the chosen provider's SDK is loaded.
  let run: ProviderRunner;
  if (meta.id === "openai") run = (await import("./providers/openai")).run;
  else if (meta.id === "google") run = (await import("./providers/google")).run;
  else run = (await import("./providers/anthropic")).run;

  return run(args);
}
