// GEMINI (Google) adapter. Neutral tools become functionDeclarations; the loop
// reads functionCall parts and answers each with a functionResponse.
//
// Gemini's SDK types are stricter and narrower than the neutral shape (its
// parameter schema is an OpenAPI subset), so a few casts bridge the two — the
// JSON schema we hand it is a valid subset, and the response shapes are read
// through the SDK's own helpers.
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RunArgs, NovaToolResult } from "../client";

export async function run({ apiKey, model, system, messages, tools, execute, maxTurns }: RunArgs): Promise<NovaToolResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Gemini rejects an empty parameter schema, so a no-argument tool declares no
  // `parameters` at all rather than `{ type: "object", properties: {} }`.
  const functionDeclarations = tools.map((t) => {
    const props = (t.parameters as any)?.properties;
    const hasArgs = props && typeof props === "object" && Object.keys(props).length > 0;
    return hasArgs
      ? { name: t.name, description: t.description, parameters: t.parameters as any }
      : { name: t.name, description: t.description };
  });
  const gm = genAI.getGenerativeModel({
    model,
    systemInstruction: system,
    tools: functionDeclarations.length ? [{ functionDeclarations }] : undefined,
  } as any);

  // Prior turns are history; the last user turn is what we send.
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];
  const chat = gm.startChat({ history: history as any });
  const usedTools: string[] = [];

  let result = await chat.sendMessage(last ? last.content : "");
  for (let turn = 0; turn < maxTurns; turn++) {
    const calls = (result.response.functionCalls?.() || []) as { name: string; args: unknown }[];
    if (!calls.length) return { text: result.response.text() || "", usedTools };

    const parts: any[] = [];
    for (const call of calls) {
      usedTools.push(call.name);
      let out: unknown;
      try { out = await execute(call.name, call.args || {}); }
      catch (e) { out = { error: e instanceof Error ? e.message : "tool failed" }; }
      parts.push({ functionResponse: { name: call.name, response: { result: out } } });
    }
    result = await chat.sendMessage(parts);
  }
  return { text: "I couldn't finish that within a few steps — try narrowing the question.", usedTools };
}
