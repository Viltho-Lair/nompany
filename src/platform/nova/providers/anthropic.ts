// CLAUDE (Anthropic) adapter. Neutral tools become `input_schema` tools; the loop
// reads tool_use blocks and answers each with a tool_result.
import Anthropic from "@anthropic-ai/sdk";
import type { RunArgs, NovaToolResult } from "../client";

const MAX_TOKENS = 1024;

export async function run({ apiKey, model, system, messages, tools, execute, maxTurns }: RunArgs): Promise<NovaToolResult> {
  const client = new Anthropic({ apiKey });
  const atools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
  const convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const usedTools: string[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await client.messages.create({ model, max_tokens: MAX_TOKENS, system, tools: atools, messages: convo });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      return { text, usedTools };
    }
    convo.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      usedTools.push(tu.name);
      let content: string;
      try { content = JSON.stringify(await execute(tu.name, tu.input)) || "null"; }
      catch (e) { content = JSON.stringify({ error: e instanceof Error ? e.message : "tool failed" }); }
      results.push({ type: "tool_result", tool_use_id: tu.id, content });
    }
    convo.push({ role: "user", content: results });
  }
  return { text: "I couldn't finish that within a few steps — try narrowing the question.", usedTools };
}
