// THE PROVIDER, AND THE TOOL LOOP. Nova is Claude with a set of tools; this is
// the thin layer over @anthropic-ai/sdk that runs the loop — call the model,
// run any tool it asks for, feed the result back, repeat until it answers or the
// turn cap is hit.
//
// CONFIGURED-OR-NOT is a first-class state. With no ANTHROPIC_API_KEY the app
// still builds and runs; `novaConfigured()` is false and the endpoint says so
// cleanly rather than throwing. Live activation is the one env var — nothing
// here fails a build or a test that has no key.
//
// Every tool runs in the ASKING user's context (the executor is supplied by the
// caller), so this file never touches studio data itself; it only shuttles tool
// calls and results between the model and that executor.

import Anthropic from "@anthropic-ai/sdk";

export const NOVA_MODEL = process.env.NOVA_MODEL || "claude-sonnet-5";
export const NOVA_MAX_TURNS = Math.max(1, Number(process.env.NOVA_MAX_TURNS || 6));
const MAX_TOKENS = 1024;

export function novaConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type NovaToolResult = { text: string; usedTools: string[] };

/**
 * Run the assistant loop. `execute(name, input)` runs one tool in the user's
 * context and returns a JSON-able result; a throw becomes a tool error the model
 * can read and recover from, never a crash. Bounded by NOVA_MAX_TURNS so a model
 * that keeps calling tools cannot loop forever.
 */
export async function runNova(opts: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  execute: (name: string, input: unknown) => Promise<unknown>;
}): Promise<NovaToolResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const convo: Anthropic.MessageParam[] = [...opts.messages];
  const usedTools: string[] = [];

  for (let turn = 0; turn < NOVA_MAX_TURNS; turn++) {
    const res = await client.messages.create({
      model: NOVA_MODEL,
      max_tokens: MAX_TOKENS,
      system: opts.system,
      tools: opts.tools,
      messages: convo,
    });

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) {
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { text, usedTools };
    }

    // Record the model's turn, then answer every tool it asked for.
    convo.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      usedTools.push(tu.name);
      let content: string;
      try {
        content = JSON.stringify(await opts.execute(tu.name, tu.input)) || "null";
      } catch (e) {
        content = JSON.stringify({ error: e instanceof Error ? e.message : "tool failed" });
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content });
    }
    convo.push({ role: "user", content: results });
  }

  return { text: "I couldn't finish that within a few steps — try narrowing the question.", usedTools };
}
