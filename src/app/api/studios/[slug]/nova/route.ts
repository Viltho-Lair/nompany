import { route } from "@/platform/http/route";
import { studioHasNova } from "@/lib/plans";
import { getNovaConfig } from "@/lib/data/novaConfig";
import { runNova, type NeutralMessage } from "@/platform/nova/client";
import { buildToolset } from "@/platform/nova/tools";
import { getProfile } from "@/platform/auth/users";
import { decryptField } from "@/platform/auth/fieldCrypto";
import { cleanProvider, providerMeta } from "@/lib/nova/providers";

// How a person gets a key, shown when they have not set one. Names the provider
// they chose so the instructions point at the right place.
const keyHelp = (providerId: string) => {
  const m = providerMeta(providerId);
  return `Nova uses your own ${m.label} key. Create one at ${m.docs}, then paste it into your account settings under “Nova / AI key”.`;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ASK NOVA. The assistant answers from the studio's data — but only through the
// tools it is given, and every tool runs as the ASKING user (auth: "studio"
// resolved their membership and access before this handler ran). Two gates come
// first: the package must include Nova, and a provider must be configured. The
// transcript is client-held (session-only memory), so it arrives in the body and
// is sanitised before it reaches the model.
const spec = { auth: "studio", body: true, name: "nova" } as const;

export const POST = route(spec, async (g) => {
  const { studio, collaborator, access, user, params, body } = g;

  // Availability: the studio's package must include Nova at all.
  if (!(await studioHasNova(studio))) return { status: 403, body: { error: "nova-off" } };

  // THE PROVIDER AND KEY ARE THE USER'S OWN, read from their account settings —
  // whichever AI they subscribe to (Claude, ChatGPT, Gemini) and their key for
  // it, encrypted at rest and decrypted here to call as them. No global key: if
  // they have not set one, say how to get one for THEIR provider.
  const profile = ((await getProfile(user.id)) || {}) as Record<string, unknown>;
  const provider = cleanProvider(profile.novaProvider);
  const apiKey = decryptField(profile.novaKey)
    || (provider === "anthropic" ? String(process.env.ANTHROPIC_API_KEY || "") : "");
  if (!apiKey) return { status: 503, body: { error: "no-key", help: keyHelp(provider) } };

  const message = typeof body?.message === "string" ? body.message.slice(0, 4000) : "";
  const history = sanitiseHistory(body?.messages);
  if (!message.trim() && !history.length) return { error: "empty" };

  // ENABLED ∩ MAPPED ∩ PERMITTED — the model is only ever shown tools this user
  // may actually use, so it cannot ask for anything they are not allowed.
  const config = await getNovaConfig();
  const { tools, execute, count } = buildToolset(config, access);

  const messages: NeutralMessage[] = [...history];
  if (message.trim()) messages.push({ role: "user", content: message });

  const slug = String(params.slug);
  const result = await runNova({
    provider,
    apiKey,
    system: novaSystem(String(studio.name || "this studio"), String(collaborator.alias || "there"), count),
    messages,
    tools,
    execute: (name) => execute(user, slug, name),
  });

  return { answer: result.text, usedTools: result.usedTools };
});

// The session transcript is client-held and therefore untrusted: keep only clean
// alternating-ish user/assistant text turns, bounded, so a crafted body cannot
// smuggle tool blocks or a giant payload into the model.
function sanitiseHistory(raw: unknown): NeutralMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: NeutralMessage[] = [];
  for (const m of raw.slice(-20)) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      out.push({ role, content: content.slice(0, 4000) });
    }
  }
  return out;
}

function novaSystem(studioName: string, alias: string, toolCount: number): string {
  return [
    `You are Nova, the assistant inside the ${studioName} workspace on nompany, an ERP.`,
    `You are helping ${alias}.`,
    "",
    "Rules:",
    `- Answer only from the ${toolCount} tools you have been given. Never invent figures, names, dates or statuses — if a tool did not return it, say you don't have it.`,
    "- If no tool covers the question, say so plainly and suggest where in the app they'd find it, rather than guessing.",
    "- The tools already return only what this person is allowed to see. Do not ask them to widen access or mention other studios.",
    "- Be concise and specific. Money is in SAR; write dates as dd/mm/yyyy. Prefer a short answer with the key numbers to a long one.",
    "- When you name a record, include its reference so they can find it.",
  ].join("\n");
}
