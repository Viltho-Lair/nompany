/* THE STUDIO BAND — what it is made of, with nothing that touches a database.
   ------------------------------------------------------------------
   A band is a LIST of messages now rather than one message. The studio shows one
   at a time and cycles them; this file decides what each one says and what
   colour it is, and it is pure so that three places compute it identically: the
   studio's band, the console's preview, and the model test.

   IT LIVES IN `shared/` FOR ONE REASON — the /super editor is a client component
   and must be able to draw a true preview as colours are typed. `lib/data/greeting`
   imports the store, so a client importing that would drag Postgres into a
   browser bundle. Pure values here, the stored half there. */

export const MAX_MESSAGES = 6;
export const MAX_STOPS = 6;

/** The logo's ramp, left to right, and the band's default in both layers. */
export const BRAND_STOPS = ["#48caed", "#fe9e04", "#ff3333"];

/* HOW MUCH OF THE COLOUR REACHES THE FILL. The border is the ramp at full
   strength; the fill is the same ramp at 14% over the page, or the band reads as
   a saturated slab rather than a tinted card. See the `.greeting-band` rule in
   globals.css, which paid for this number once already. */
export const TINT_PERCENT = 14;

export type BandTheme = {
  /** `default` is the logo ramp in both layers; `custom` is exactly what was picked. */
  mode: "default" | "custom";
  background: string[];
  border: string[];
};

/** `ai` is written by the model each day; `manual` is typed once and stays. */
export type MessageSource = "ai" | "manual";

/* THE LADDER, AND IT IS AN RFQ'S RATHER THAN A CHECKBOX.
   ------------------------------------------------------------------
   A message was `active: true|false`, which made showing it a PROPERTY somebody
   edits rather than an ACT somebody performs — and a property has no moment, so
   there was nothing for a reader's browser to notice. Sending is a transition
   now: `Draft` is nobody's business but the author's, `Sent` is out there, and
   `sentAt` stamps WHEN.

   RE-SENDING RE-STAMPS, and that is what makes a correction reach the people who
   already closed the first version: dismissal is keyed on the stamp, so a new
   `sentAt` is a message nobody has dismissed yet. Editing does NOT re-stamp, or
   every save would resurrect a message on every screen in the platform. */
export const BROADCAST_STATUSES = ["Draft", "Sent"] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export type BandMessage = {
  id: string;
  /* THE AUTHOR'S OWN LABEL, and no studio ever reads it. The register needs
     something to list a message BY, and an automated one has no words of its
     own to list — its text is generated, three times a day, and would make the
     list rewrite itself. */
  title: string;
  createdAt: string;
  source: MessageSource;
  status: BroadcastStatus;
  /** ISO stamp of the last send. Empty while it has never been sent. */
  sentAt: string;
  greeting: string;
  quote: string;
  author: string;
  theme: BandTheme;
};

export type GreetingConfig = { messages: BandMessage[] };

/** One day's generated words for one `ai` message. */
export type Generation = { greeting: string; quote: string; author: string };

export type BandCss = { background: string; border: string; glow: string };

export type ResolvedMessage = {
  id: string;
  /* WHAT A DISMISSAL IS REMEMBERED AGAINST — the message AND the send it belongs
     to, never the day. Keying on the day was the defect: closing the band hid
     every message for the rest of it, including ones sent afterwards, which is
     the opposite of broadcasting. */
  key: string;
  sentAt: string;
  source: MessageSource;
  greeting: string;
  quote: string;
  author: string;
  /** True when an `ai` message is showing the model's words rather than the fallback. */
  generated: boolean;
  css: BandCss;
};

export type DailyBand = { day: string; daypart: Daypart; messages: ResolvedMessage[] };

/* THERE IS NO BUILT-IN TEXT ANY MORE, and its absence is the feature.
   ------------------------------------------------------------------
   This file used to carry seven greetings and eight quotations, hand-written,
   picked by the date. They were the whole product before the key existed and
   then the FALLBACK after it — which meant a studio with no key set read words
   somebody had typed into a source file months earlier, and nothing on any
   screen said so. Asked where the greeting came from, the honest answer was
   "from an array", three times running.

   So an automated message with nothing generated for the reader's part of the
   day SHOWS NOTHING. That is a worse-looking product and a truer one: a band
   that is empty is a key that is not set, and the console says exactly that.
   Never re-introduce a default string here — the next person's instinct will be
   to add "just one" for the empty case, and that is the bug. */

/* MORNING IS NOT A FACT ABOUT THE SERVER, and this was wrong from the first
   version: one message generated per day said "Good morning." to somebody
   opening their studio at nine in the evening. A daily message and a greeting
   are different things, and the product was shipping one as the other.

   THREE PARTS, AND THE READER'S OWN CLOCK CHOOSES. The band asks for the daypart
   its browser is in, so a studio in Amman and one in Casablanca each get the
   right words at the right hour — and everybody inside one daypart still reads
   the same thing, which is what keeps it a message from the product. At most
   three generations per message per day for the whole platform. */
export const DAYPARTS = ["morning", "afternoon", "evening"] as const;
export type Daypart = (typeof DAYPARTS)[number];

/** 05:00-11:59 morning, 12:00-17:59 afternoon, the rest evening. */
export function daypartFor(hour: number): Daypart {
  const h = Number.isFinite(hour) ? Math.floor(hour) : 0;
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

/** A daypart off the wire, validated. An unknown one is not a reason to fail. */
export function cleanDaypart(v: unknown): Daypart {
  const s = String(v || "").trim().toLowerCase();
  return (DAYPARTS as readonly string[]).includes(s) ? (s as Daypart) : "morning";
}

/** What the day's generations are stored and looked up under. */
export function generationKey(id: string, daypart: Daypart): string {
  return `${id}:${daypart}`;
}

/** Days since the epoch — the index every rotation below turns on. */
export function dayNumber(now: Date = new Date()): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

/** The server's date as `YYYY-MM-DD` — the key a dismissal is remembered under. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/* A COLOUR IS A HEX LITERAL AND NOTHING ELSE, and this is a security boundary
   rather than tidiness. These strings are substituted into a `linear-gradient()`
   through a custom property, so anything accepted here is CSS that renders in
   every studio in the product. `rgb(0,0,0)` and `red` would both be harmless;
   the point is that allowing any of them means parsing CSS to decide what else
   got in. Only /super can write these, which lowers the odds and not the cost. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value: unknown): boolean {
  return typeof value === "string" && HEX.test(value.trim());
}

/** Valid stops only, capped, falling back rather than returning nothing. */
export function cleanStops(raw: unknown, fallback: string[] = BRAND_STOPS): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const kept = list.filter(isHexColor).map((c) => String(c).trim().toLowerCase()).slice(0, MAX_STOPS);
  return kept.length ? kept : [...fallback];
}

/* A GRADIENT NEEDS TWO STOPS. `linear-gradient(90deg, #fff)` is not merely flat,
   it is INVALID — the declaration is dropped and the layer disappears, taking the
   opaque fill with it and letting the border ramp show through the whole box.
   One picked colour is a solid, so it is doubled here rather than special-cased
   at every call site. */
function stopList(stops: string[]): string {
  const s = stops.length ? stops : BRAND_STOPS;
  return (s.length === 1 ? [s[0], s[0]] : s).join(", ");
}

/**
 * The two custom-property values a message paints with, plus the shadow's tint.
 *
 * `default` mixes the ramp into `--geex-page` so the fill stays OPAQUE and
 * follows the theme. `custom` takes the picked colours literally: somebody who
 * chose a background chose a background, and tinting it to 14% of itself would
 * silently ignore them.
 */
export function bandCss(theme: BandTheme | null | undefined): BandCss {
  const custom = theme?.mode === "custom";
  const border = custom ? cleanStops(theme?.border) : [...BRAND_STOPS];
  const background = custom
    ? cleanStops(theme?.background)
    : BRAND_STOPS.map((c) => `color-mix(in oklab, ${c} ${TINT_PERCENT}%, var(--geex-page))`);
  return { background: stopList(background), border: stopList(border), glow: border[0] };
}

export function defaultTheme(): BandTheme {
  return { mode: "default", background: [...BRAND_STOPS], border: [...BRAND_STOPS] };
}

/** A new message: automated, unsent, on the house colours. */
export function newMessage(id: string, now: Date = new Date()): BandMessage {
  return {
    id, title: "", createdAt: now.toISOString(), source: "ai", status: "Draft", sentAt: "",
    greeting: "", quote: "", author: "", theme: defaultTheme(),
  };
}

/** The dismissal key for one send of one message. */
export function messageKey(m: { id: string; sentAt: string }): string {
  return `${m.id}:${m.sentAt}`;
}

function str(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

function cleanMessage(raw: unknown, index: number): BandMessage {
  const r = (raw || {}) as Record<string, unknown>;
  const id = str(r.id, 40).replace(/[^a-zA-Z0-9_-]/g, "") || `m${index + 1}`;
  const theme = (r.theme || {}) as Record<string, unknown>;
  // MIGRATED FROM `active`: a message that was showing has been sent, one that
  // was switched off is a draft. No stamp to recover, so it keeps an empty one —
  // which changes every dismissal key once, and shows every live message one
  // more time. That is the correct outcome rather than a cost: the old keys
  // recorded "the reader closed the band today", which is not a fact about any
  // of these messages.
  const status: BroadcastStatus = r.status === "Draft" || r.status === "Sent"
    ? r.status
    : (r.active === false ? "Draft" : "Sent");

  return {
    id,
    title: str(r.title, 80),
    createdAt: str(r.createdAt, 40),
    source: r.source === "manual" ? "manual" : "ai",
    status,
    sentAt: status === "Sent" ? str(r.sentAt, 40) : "",
    greeting: str(r.greeting, 200),
    quote: str(r.quote, 300),
    author: str(r.author, 120),
    theme: {
      mode: theme.mode === "custom" ? "custom" : "default",
      background: cleanStops(theme.background),
      border: cleanStops(theme.border),
    },
  };
}

/**
 * A stored document, whatever shape it is in, as a config this code can use.
 *
 * IT MIGRATES THE ONE-MESSAGE SHAPE IN PLACE. The first version stored
 * `{ mode, greeting, quote, author }` — `default` meaning the built-in rotation
 * and `custom` meaning typed words. `default` becomes ONE AUTOMATED message and
 * `custom` becomes ONE MANUAL message, which is the same thing each of them did:
 * a studio with no key set still reads the rotation, so nothing a tenant sees
 * changes until somebody adds a key or a second message. No backfill, no script,
 * no window where the header is empty.
 */
export function cleanConfig(raw: unknown): GreetingConfig {
  const r = (raw || {}) as Record<string, unknown>;

  if (!Array.isArray(r.messages)) {
    const legacyCustom = r.mode === "custom";
    const one = cleanMessage(
      {
        id: "m1",
        source: legacyCustom ? "manual" : "ai",
        status: "Sent",
        greeting: r.greeting,
        quote: r.quote,
        author: r.author,
      },
      0,
    );
    return { messages: [one] };
  }

  const seen = new Set<string>();
  const messages: BandMessage[] = [];
  for (const [i, m] of r.messages.slice(0, MAX_MESSAGES).entries()) {
    const cleaned = cleanMessage(m, i);
    // IDS ADDRESS THE DAY'S GENERATIONS, so a duplicate would make two messages
    // share one set of generated words and the second overwrite the first.
    if (seen.has(cleaned.id)) cleaned.id = `${cleaned.id}-${i}`;
    seen.add(cleaned.id);
    messages.push(cleaned);
  }
  return { messages: messages.length ? messages : [newMessage("m1")] };
}

/**
 * Today's band for one part of the day: which messages show, in what words, in
 * what colours.
 *
 * `generations` is what the model wrote, keyed `<message id>:<daypart>`. An
 * automated message with nothing there DOES NOT SHOW — there is no built-in text
 * to fall back to, on purpose. An empty band means no key or a failed call, and
 * that is a state a person can see and fix rather than one the product papers
 * over with words nobody chose.
 */
export function resolveBand(
  config: GreetingConfig,
  generations: Record<string, Generation> | null | undefined,
  daypart: Daypart = "morning",
  now: Date = new Date(),
): DailyBand {
  const day = dayKey(now);
  const messages: ResolvedMessage[] = [];

  config.messages.forEach((m) => {
    if (m.status !== "Sent") return;
    let words: Generation = { greeting: m.greeting, quote: m.quote, author: m.author };
    let generated = false;

    if (m.source === "ai") {
      const g = generations?.[generationKey(m.id, daypart)];
      // NOTHING WRITTEN FOR THIS PART OF THE DAY MEANS NOTHING SHOWN. Falling
      // back to the other dayparts would put "Good morning." on an evening
      // screen, which is the fault this daypart split exists to fix.
      if (!g || !(g.greeting || g.quote)) return;
      words = g;
      generated = true;
    }

    // A MANUAL MESSAGE LEFT BLANK IS NOT A BAND WITH NOTHING IN IT. It is
    // somebody part-way through writing one, so it does not show at all.
    if (!words.greeting && !words.quote) return;

    messages.push({
      id: m.id,
      key: messageKey(m),
      sentAt: m.sentAt,
      source: m.source,
      greeting: words.greeting,
      quote: words.quote,
      author: words.author,
      generated,
      css: bandCss(m.theme),
    });
  });

  return { day, daypart, messages };
}
