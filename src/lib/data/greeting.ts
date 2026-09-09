import { getJSON, setJSON } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { getNovaConfig, novaApiKey } from "./novaConfig";
import { runNova } from "@/platform/nova/client";
import {
  cleanConfig,
  dayKey,
  resolveBand,
  type DailyBand,
  type Generation,
  type GreetingConfig,
} from "@/shared/greeting";

/* THE DAILY BAND, stored — the config a person edits and the words the model
   wrote today.
   ------------------------------------------------------------------
   NO CRON, AND THAT IS STILL DELIBERATE. "Every day at 00:00" describes when the
   message CHANGES, not when work has to happen. The date decides which
   generation is current, so the turnover is a comparison rather than a job: it
   happens for every reader at once, the instant the server's clock rolls over,
   with nothing scheduled and nothing that can fail to run.

   A cron would have bought a job that fails silently, a document that is stale
   until it runs, and a sixth entry in `vercel.json` — on a plan where a schedule
   the host will not accept rejects THE WHOLE DEPLOYMENT rather than just the
   job. That has already cost this project eight pushes.

   THE FIRST READER OF THE DAY PAYS FOR THE GENERATION, and every reader after
   them reads it back. That is one model call per day for the whole platform, not
   one per studio and not one per person. The cost is that one person's header
   arrives a second or two late; the band renders nothing until it has an answer,
   so what they see is the header without a band rather than a band that changes
   under them. `regenerateToday()` behind the console's button is the way to pay
   that second yourself before anybody else does.

   THE DATE IS THE SERVER'S, not the reader's. Everyone sees the same message on
   the same day whatever timezone they are in, which is what makes it a message
   from the product rather than a clock. */

type TodayDoc = {
  day: string;
  byId: Record<string, Generation>;
  /** Message ids whose generation failed TODAY — see `failed` below. */
  failed?: string[];
};

export async function getGreetingConfig(): Promise<GreetingConfig> {
  return cleanConfig(await getJSON(REG.greetingConfig));
}

/**
 * Save the whole message list.
 *
 * WHOLE-LIST RATHER THAN THE PATCH RULE THE CONFIGS BESIDE THIS ONE FOLLOW, and
 * it is the removal that forces it: "absent means unchanged" cannot express
 * "this message is gone", so a merge would make deletion impossible. The editor
 * holds every message on screen and sends all of them, which is the shape that
 * makes the whole list a safe thing to receive.
 */
export async function saveGreetingConfig(patch: unknown): Promise<GreetingConfig> {
  const next = cleanConfig(patch);
  await setJSON(REG.greetingConfig, next);
  return next;
}

async function readToday(day: string): Promise<TodayDoc> {
  const doc = await getJSON<TodayDoc>(REG.greetingToday);
  // A DOCUMENT FROM ANOTHER DAY IS NOT STALE DATA TO REPAIR, it is yesterday's
  // answer to a question nobody is asking. It is replaced wholesale rather than
  // merged, which is also what stops the failure list outliving the day it names.
  return doc?.day === day ? { day, byId: doc.byId || {}, failed: doc.failed || [] } : { day, byId: {}, failed: [] };
}

/* WHAT THE MODEL IS ASKED FOR, and every line of it is a rule that a general
   "write a greeting" prompt gets wrong for this product.

   GENERIC BECAUSE THE AUDIENCE IS. One band is read by every studio in the
   platform at once — a contractor in Amman, whoever signs up tomorrow — so a
   greeting that names an industry, a country, a season or a holiday is wrong for
   most of the people reading it and cannot be made right by picking a better
   industry.

   ATTRIBUTION IS THE PART A MODEL IS WORST AT. Quotations are confidently
   misattributed more often than they are invented, and this one is printed under
   nompany's name in somebody else's workplace. The instruction to choose a
   different quotation rather than guess an author is the cheap half of the fix;
   the honest half is that these are still not verified, which is why the console
   shows what was generated and lets a person overwrite it. */
const SYSTEM = [
  "You write the welcome line at the top of a business management system, and one quotation to sit beneath it.",
  "",
  "The greeting: one sentence, under ninety characters, starting with \"Good morning.\" — calm and plain, the way a colleague says it. No exclamation marks, no emoji, no motivational-poster phrasing, no questions.",
  "It is read by companies in every country and every line of work, so name no industry, country, city, holiday, season or weather.",
  "",
  "The quotation: short, real, and widely attributed to the person you name. If you are not certain who said it, choose a different quotation rather than guessing the author. No quotation about mornings.",
  "",
  "Answer with JSON and nothing else: {\"greeting\": \"...\", \"quote\": \"...\", \"author\": \"...\"}",
].join("\n");

function parseGeneration(text: string): Generation | null {
  // A MODEL THAT WAS TOLD "JSON AND NOTHING ELSE" STILL FENCES IT SOMETIMES, so
  // the outermost braces are taken rather than the whole answer trusted.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  const r = (parsed || {}) as Record<string, unknown>;
  const greeting = String(r.greeting ?? "").trim().slice(0, 200);
  const quote = String(r.quote ?? "").trim().slice(0, 300);
  const author = String(r.author ?? "").trim().slice(0, 120);
  // AN ANSWER WITH NO GREETING IS A FAILURE, not an empty message: the fallback
  // rotation is a better band than a blank one.
  if (!greeting) return null;
  return { greeting, quote, author };
}

async function generateOne(
  provider: string,
  apiKey: string,
  model: string,
  day: string,
  seed: number,
): Promise<Generation | null> {
  try {
    const { text } = await runNova({
      provider,
      apiKey,
      model,
      system: SYSTEM,
      // THE DATE AND THE SEED ARE IN THE PROMPT so a band of two automated
      // messages does not generate the same pair twice on the same day, and so
      // yesterday's answer is not the obvious completion of today's question.
      messages: [{ role: "user", content: `Today is ${day}. Write pair number ${seed + 1} for today.` }],
      tools: [],
      execute: async () => null,
    });
    return parseGeneration(text || "");
  } catch {
    // A PROVIDER OUTAGE IS NOT THIS PRODUCT'S OUTAGE. The caller records the
    // failure for the day and every reader gets the fallback rotation; the
    // studio header cannot break because somebody else's API is down.
    return null;
  }
}

/**
 * Today's generated words, generating what is missing.
 *
 * FAILURES ARE REMEMBERED FOR THE DAY, and that is the difference between a
 * broken key costing one call and costing one call per page view. A key that is
 * absent is NOT a failure — nothing is recorded, so adding one in /super works
 * on the next page load rather than tomorrow. `regenerateToday()` clears the
 * list, which is what the console's button is for after a key is fixed.
 */
async function ensureGenerations(config: GreetingConfig, day: string): Promise<Record<string, Generation>> {
  const doc = await readToday(day);
  const failed = new Set(doc.failed || []);

  const wanted = config.messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.active && m.source === "ai" && !doc.byId[m.id] && !failed.has(m.id));
  if (!wanted.length) return doc.byId;

  const nova = await getNovaConfig();
  if (!nova.keySet) return doc.byId;   // no key: the rotation answers, nothing is recorded
  const apiKey = await novaApiKey();
  if (!apiKey) return doc.byId;

  const fresh: Record<string, Generation> = {};
  const broke: string[] = [];
  for (const { m, i } of wanted) {
    const gen = await generateOne(nova.provider, apiKey, nova.model, day, i);
    if (gen) fresh[m.id] = gen;
    else broke.push(m.id);
  }

  // RE-READ BEFORE WRITING, because two first-readers can arrive at once and
  // both generate. Whoever stored a message's words first keeps them: the
  // alternative is two people seeing two different "today"s, which is the one
  // thing a platform-wide daily message must not do. The loser's call is wasted
  // and nothing else.
  const current = await readToday(day);
  const byId: Record<string, Generation> = { ...fresh, ...current.byId };
  const nextFailed = [...new Set([...(current.failed || []), ...broke])].filter((id) => !byId[id]);
  await setJSON(REG.greetingToday, { day, byId, failed: nextFailed } satisfies TodayDoc);
  return byId;
}

/** Today's band as a studio reads it — the config, resolved against today's words. */
export async function getDailyBand(now: Date = new Date()): Promise<DailyBand> {
  const day = dayKey(now);
  const config = await getGreetingConfig();
  const generations = await ensureGenerations(config, day);
  return resolveBand(config, generations, now);
}

/**
 * Throw today's generations away and write them again.
 *
 * The console's button. It exists because the two states a person cannot
 * otherwise leave are "the key was wrong when the day's first reader arrived"
 * (failures are remembered until midnight) and "that is not a line I want under
 * our name" — and waiting until tomorrow is not an answer to either.
 */
export async function regenerateToday(now: Date = new Date()): Promise<DailyBand> {
  const day = dayKey(now);
  await setJSON(REG.greetingToday, { day, byId: {}, failed: [] } satisfies TodayDoc);
  const config = await getGreetingConfig();
  const generations = await ensureGenerations(config, day);
  return resolveBand(config, generations, now);
}
