// WHO MAY BE CONTACTED, AND WHAT THEY ACTUALLY AGREED TO — pure, so the screen
// and the server answer the question identically, and so the answer can be
// asked without a database when a sending layer finally exists.
//
// THE GAP THIS CLOSES. A Marketing form REFUSES to open while it collects
// contact details without a required consent question (`openProblems`), so
// every studio already puts the tick in front of the public — and nothing has
// ever recorded the answer. The response row holds it, sealed, one form at a
// time; "may we email this person" was a question the product could not be
// asked. nompany sends nothing today (the owner, 19/09/2026), so this is the
// record rather than the gate — but the record has to exist BEFORE the first
// send, not after it, because consent nobody wrote down at the time cannot be
// reconstructed afterwards.
//
// APPEND-ONLY, LATEST WINS. A consent is an event with a date, not a flag: a
// person may agree in March, withdraw in June and agree again in September, and
// a studio asked to prove what it was entitled to do in July needs all three.
// Nothing here ever edits a row — a withdrawal is a new row — which is also why
// `state` reads the ledger rather than being stored on a subject.

/**
 * THE CHANNELS A STUDIO CAN RECORD TODAY, and there are two rather than five
 * for an honest reason: the consent question on a form is ONE tick, so it can
 * only ever mean "the addresses this form collected". An email address earns
 * `email`; a phone number earns `phone`, which covers calling, SMS and
 * WhatsApp together. Splitting those three would be recording a permission
 * nobody was asked for — the form has to ask per channel first, and it cannot
 * yet (docs/functionality/audiences.md, "Not built yet").
 */
export const CONSENT_CHANNELS = ["email", "phone"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export const CONSENT_STATES = ["given", "withdrawn"] as const;
export type ConsentState = (typeof CONSENT_STATES)[number];

/** Where a row came from. `form` is the public tick; the rest are somebody in the studio. */
export const CONSENT_SOURCES = ["form", "manual", "import"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/** Only what this file needs off a stored row. */
export type ConsentRow = {
  id?: unknown;
  kind?: unknown;            // "email" | "phone"
  value?: unknown;           // the address, normalised on the way in
  channel?: unknown;
  state?: unknown;
  at?: unknown;
  source?: unknown;
  evidence?: unknown;
};

const text = (v: unknown) => String(v ?? "").trim();

/**
 * ONE PERSON IS ONE ADDRESS, normalised — an email lowercased, a phone reduced
 * to its digits and a leading `+`. `Ali@Firm.com` and `ali@firm.com` are the
 * same inbox, and a studio that recorded a withdrawal against one spelling
 * while sending to the other has not honoured anything.
 *
 * NOT a person: two addresses belonging to one human being are two subjects
 * here, because that is all the evidence supports. Merging them would be a
 * guess with somebody's rights attached.
 */
export function subjectKey(kind: unknown, value: unknown): string {
  const k = text(kind).toLowerCase();
  const raw = text(value);
  if (!raw) return "";
  if (k === "email") {
    const email = raw.toLowerCase();
    return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) ? `email:${email}` : "";
  }
  if (k === "phone") {
    const kept = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    // Seven digits is the shortest real subscriber number anywhere; below that
    // it is a typo or an extension, and recording consent against it would
    // suppress or permit somebody who was never asked.
    return kept.replace(/\D/g, "").length >= 7 ? `phone:${kept}` : "";
  }
  return "";
}

/** Which channel an address earns when one tick covers whatever was collected. */
export const channelFor = (kind: unknown): ConsentChannel | "" =>
  (text(kind).toLowerCase() === "email" ? "email" : text(kind).toLowerCase() === "phone" ? "phone" : "");

const sortByTime = (a: ConsentRow, b: ConsentRow) => text(a.at).localeCompare(text(b.at));

/**
 * WHAT THE LEDGER SAYS ABOUT ONE ADDRESS ON ONE CHANNEL: the LATEST row wins,
 * and "unknown" is its own answer rather than a no. Nobody has been asked is
 * not the same as somebody said no, and the two send a studio to different
 * places — one to an opt-in, the other to an apology.
 */
export function consentState(
  rows: readonly ConsentRow[],
  subject: string,
  channel: ConsentChannel,
): ConsentState | "unknown" {
  const mine = (Array.isArray(rows) ? rows : [])
    .filter((r) => subjectKey(r.kind, r.value) === subject && text(r.channel) === channel)
    .sort(sortByTime);
  const last = mine[mine.length - 1];
  const state = text(last?.state);
  return state === "given" || state === "withdrawn" ? state : "unknown";
}

/**
 * MAY THIS STUDIO CONTACT THIS ADDRESS ON THIS CHANNEL — the one question the
 * sending layer will ask, and the answer is TRUE only where consent was given
 * and not since withdrawn. Unknown is false: the default is not to send.
 */
export const mayContact = (rows: readonly ConsentRow[], kind: unknown, value: unknown, channel: ConsentChannel) => {
  const subject = subjectKey(kind, value);
  return Boolean(subject) && consentState(rows, subject, channel) === "given";
};

export type LedgerEntry = {
  subject: string;
  kind: string;
  value: string;
  /** Per channel: the state now, when it was last decided, and on what evidence. */
  channels: Record<string, { state: ConsentState | "unknown"; at: string; source: string; evidence: string }>;
  /** Every row for this address, newest first — the proof, which is the point. */
  history: { channel: string; state: string; at: string; source: string; evidence: string }[];
  lastAt: string;
};

/**
 * THE LEDGER AS A SCREEN READS IT: one row per address, its state on each
 * channel, and the whole history beneath it. Rows whose address cannot be
 * normalised are dropped rather than shown — they can never be matched by a
 * send, so displaying them would promise a suppression that does not work.
 */
export function ledger(rows: readonly ConsentRow[]): LedgerEntry[] {
  const bySubject = new Map<string, ConsentRow[]>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const subject = subjectKey(row.kind, row.value);
    if (!subject) continue;
    bySubject.set(subject, [...(bySubject.get(subject) || []), row]);
  }
  return [...bySubject.entries()]
    .map(([subject, mine]) => {
      const sorted = [...mine].sort(sortByTime);
      const channels: LedgerEntry["channels"] = {};
      for (const channel of CONSENT_CHANNELS) {
        const last = [...sorted].reverse().find((r) => text(r.channel) === channel);
        if (!last) continue;
        channels[channel] = {
          state: consentState(sorted, subject, channel),
          at: text(last.at),
          source: text(last.source),
          evidence: text(last.evidence),
        };
      }
      const newest = sorted[sorted.length - 1];
      return {
        subject,
        kind: subject.slice(0, subject.indexOf(":")),
        value: subject.slice(subject.indexOf(":") + 1),
        channels,
        history: [...sorted].reverse().map((r) => ({
          channel: text(r.channel), state: text(r.state), at: text(r.at),
          source: text(r.source), evidence: text(r.evidence),
        })),
        lastAt: text(newest?.at),
      };
    })
    // THE MOST RECENTLY DECIDED FIRST: a ledger is read to see what just
    // changed, not to browse an address book.
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt) || a.value.localeCompare(b.value));
}

/** How many addresses this studio may contact, and how many have said no. */
export function consentTotals(entries: readonly LedgerEntry[]) {
  const count = (channel: ConsentChannel, state: ConsentState) =>
    entries.filter((e) => e.channels[channel]?.state === state).length;
  return {
    subjects: entries.length,
    emailGiven: count("email", "given"),
    emailWithdrawn: count("email", "withdrawn"),
    phoneGiven: count("phone", "given"),
    phoneWithdrawn: count("phone", "withdrawn"),
  };
}

/**
 * WHY A ROW MAY NOT BE WRITTEN, as a token the screen turns into a sentence.
 * The address is checked because an unmatchable one is a suppression that will
 * not fire, which is worse than a refusal a person can see and correct.
 */
export function consentProblem(input: { kind?: unknown; value?: unknown; channel?: unknown; state?: unknown }): string {
  if (!subjectKey(input.kind, input.value)) return "consent-subject";
  if (!(CONSENT_CHANNELS as readonly string[]).includes(text(input.channel))) return "consent-channel";
  if (!(CONSENT_STATES as readonly string[]).includes(text(input.state))) return "consent-state";
  return "";
}
