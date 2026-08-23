// CHATGPT (OpenAI) adapter. Neutral tools become function tools; the loop reads
// `tool_calls` and answers each with a `role: "tool"` message.
import OpenAI from "openai";
import type { RunArgs, NovaToolResult } from "../client";

export async function run({ apiKey, model, system, messages, tools, execute, maxTurns }: RunArgs): Promise<NovaToolResult> {
  const client = new OpenAI({ apiKey });
  const otools = tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
  // OpenAI carries the system prompt as the first message rather than a field.
  const convo: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const usedTools: string[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await client.chat.completions.create({ model, messages: convo, tools: otools });
    const msg = res.choices[0]?.message;
    const calls = msg?.tool_calls || [];
    if (!msg || !calls.length) return { text: msg?.content || "", usedTools };

    convo.push(msg);
    for (const tc of calls) {
      // Only function tool calls carry a name/arguments; ignore any other kind.
      if (tc.type !== "function") continue;
      usedTools.push(tc.function.name);
      let content: string;
      try {
        const input = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        content = JSON.stringify(await execute(tc.function.name, input)) || "null";
      } catch (e) {
        content = JSON.stringify({ error: e instanceof Error ? e.message : "tool failed" });
      }
      convo.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }
  return { text: "I couldn't finish that within a few steps — try narrowing the question.", usedTools };
}
