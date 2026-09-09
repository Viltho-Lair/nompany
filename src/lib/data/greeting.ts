import { getJSON, setJSON } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";

/* THE DAILY GREETING — one line of welcome and one quotation, changing at
   midnight, shown across the top of every studio.
   ------------------------------------------------------------------
   NO CRON, AND THAT IS DELIBERATE. "Every day at 00:00" describes when the
   message CHANGES, not when work has to happen — and the two are only the same
   thing if something has to write a row. It does not: the message is a pure
   function of the date, so it changes the instant the server's clock rolls over,
   for every reader at once, with nothing scheduled and nothing to miss.

   A cron would have bought a job that can fail silently, a document that is
   stale until it runs, and a sixth entry in `vercel.json` — on a plan where a
   schedule the host will not accept rejects THE WHOLE DEPLOYMENT rather than
   just the job. That has already cost this project eight pushes.

   THE DATE IS THE SERVER'S, not the reader's. Everyone in a studio sees the
   same greeting on the same day whatever timezone they are in, which is what
   makes it a message from the product rather than a clock. */

export type GreetingConfig = {
  /** `default` rotates the built-in set; `custom` shows exactly what was typed. */
  mode: "default" | "custom";
  greeting: string;
  quote: string;
  author: string;
};

export const EMPTY_GREETING_CONFIG: GreetingConfig = {
  mode: "default", greeting: "", quote: "", author: "",
};

/* THE BUILT-IN ROTATION. Deliberately plain: a greeting is read every morning by
   the same people, and a joke read for the fifth time is worse than a sentence
   that was never trying. Nothing here names a company, a country, an industry or
   a time of year — this is a multi-tenant product and a greeting that assumes
   any of those is wrong for most of the studios reading it. */
const DEFAULT_GREETINGS = [
  "Good morning. Here is your studio.",
  "Good morning. Everything is where you left it.",
  "Good morning. A clear desk to start from.",
  "Good morning. The day is yours to plan.",
  "Good morning. One system, one place to start.",
  "Good morning. Take the first thing first.",
  "Good morning. A steady start beats a fast one.",
];

const DEFAULT_QUOTES: { quote: string; author: string }[] = [
  { quote: "Plans are worthless, but planning is everything.", author: "Dwight D. Eisenhower" },
  { quote: "It is not the strongest that survives, but the one most responsive to change.", author: "Leon C. Megginson" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "However beautiful the strategy, you should occasionally look at the results.", author: "Winston Churchill" },
  { quote: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Proverb" },
  { quote: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { quote: "What gets measured gets managed.", author: "Peter Drucker" },
  { quote: "Perfection is achieved when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
];

/** Days since the epoch for a date — the index everything below rotates on. */
export function dayNumber(now: Date = new Date()): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

/** The server's date as `YYYY-MM-DD` — the key a dismissal is remembered under. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type DailyGreeting = {
  greeting: string;
  quote: string;
  author: string;
  /** The day this message belongs to. A dismissal is remembered against it. */
  day: string;
};

/**
 * Today's message.
 *
 * TWO INDEPENDENT ROTATIONS, so the pairing changes rather than repeating on a
 * seven-day loop: seven greetings against eight quotations only return to the
 * same pair after fifty-six days, where one shared index would repeat weekly and
 * be noticed by the second week.
 */
export function resolveGreeting(config: GreetingConfig, now: Date = new Date()): DailyGreeting {
  const day = dayKey(now);
  if (config.mode === "custom") {
    return { greeting: config.greeting, quote: config.quote, author: config.author, day };
  }
  const n = dayNumber(now);
  const q = DEFAULT_QUOTES[n % DEFAULT_QUOTES.length];
  return {
    greeting: DEFAULT_GREETINGS[n % DEFAULT_GREETINGS.length],
    quote: q.quote,
    author: q.author,
    day,
  };
}

export async function getGreetingConfig(): Promise<GreetingConfig> {
  const stored = await getJSON<Partial<GreetingConfig>>(REG.greetingConfig);
  return {
    mode: stored?.mode === "custom" ? "custom" : "default",
    greeting: String(stored?.greeting || "").slice(0, 200),
    quote: String(stored?.quote || "").slice(0, 300),
    author: String(stored?.author || "").slice(0, 120),
  };
}

export async function saveGreetingConfig(patch: Partial<GreetingConfig> | null | undefined): Promise<GreetingConfig> {
  const prior = await getGreetingConfig();
  // ABSENT MEANS UNCHANGED, the rule every config in this folder follows — so a
  // form that edits one field cannot blank the others by not sending them.
  const next: GreetingConfig = {
    mode: patch?.mode === "custom" || patch?.mode === "default" ? patch.mode : prior.mode,
    greeting: patch?.greeting === undefined ? prior.greeting : String(patch.greeting).slice(0, 200),
    quote: patch?.quote === undefined ? prior.quote : String(patch.quote).slice(0, 300),
    author: patch?.author === undefined ? prior.author : String(patch.author).slice(0, 120),
  };
  await setJSON(REG.greetingConfig, next);
  return next;
}
