// NOVA'S HELP SEARCH — a typed question matched to the entries, PURELY.
//
// NOT A REGEX, deliberately. A pattern per question matches the words its
// author thought of and nothing else: "vacation" misses the leave entry,
// "invioce" misses everything, and an Arabic question with a definite article
// ("الفواتير") misses "فاتورة". What replaces it is the ordinary shape of FAQ
// retrieval — BM25 over the entries, with typo tolerance and a synonym table —
// the same ranking MiniSearch and Lucene use, written out here because the
// whole index is a few hundred entries and a dependency for it would be larger
// than the code.
//
// FIELDS ARE WEIGHTED, not pooled: a word in the QUESTION means far more than
// the same word somewhere in an answer's third sentence ("approve" appears in
// half the answers in Finance). Weights are term-frequency multipliers, the
// BM25F shortcut.
//
// AND IT SAYS HOW SURE IT IS. `decide` turns the ranking into one of three
// moves — answer, ask "did you mean", or admit it does not know — which is the
// two-stage fallback conversational assistants settled on (affirm the best
// guess, offer the next ones, then hand to a person). Guessing silently at a
// low score is the failure that makes people stop trusting the box.

import type { HelpEntry } from "./types";

/* ── Normalisation ─────────────────────────────────────────────────────── */

// ARABIC IS NORMALISED THE WAY ARABIC SEARCH ENGINES DO IT: diacritics and the
// tatweel dropped, the hamza-carrying alefs folded to a bare alef, alef maqsura
// to ya, ta marbuta to ha. People type "اجازة" for "إجازة" and "فاتوره" for
// "فاتورة" constantly, and without this each is a different word.
export function normalise(text: string): string {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    // "can't", "cant" and "cannot" are ONE word — the one every "why can't I…"
    // question turns on. Split at the apostrophe it became "can" and a stray
    // "t", and matched nothing a person typing "cant" wrote.
    .replace(/['’]/g, "")
    .replace(/\bcannot\b/g, "cant")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Words that carry no meaning in a help question. Kept SHORT on purpose: a long
// list eventually swallows a word that matters ("new", "close", "open" are all
// real actions here and are not in it).
const STOP = new Set([
  "a", "an", "the", "i", "me", "my", "we", "our", "you", "your", "it", "its", "is", "are", "was",
  "be", "to", "of", "in", "on", "for", "at", "by", "with", "and", "or", "do", "does", "did",
  "can", "could", "how", "what", "why", "where", "when", "which", "who", "this", "that", "there",
  "please", "want", "need", "should", "would", "will", "from", "into", "about", "any", "some",
  "have", "has", "get", "if", "so", "am", "not", "no",
  // Vague placeholders: "how do I add one" means "add" plus the screen you are
  // on, and "one" matching every question that says "one" is noise.
  "one", "ones", "thing", "things", "something", "its", "im",
  "someone", "somebody", "anyone", "anybody", "everyone",
  "في", "من", "على", "الى", "الي", "عن", "مع", "هل", "كيف", "ماذا", "لماذا", "ما", "متى", "اين",
  "هذا", "هذه", "ذلك", "انا", "انت", "هو", "هي", "او", "و", "ثم", "لا", "لم", "لن", "كل", "اريد",
  "يمكن", "يمكنني", "ممكن", "عند", "الذي", "التي",
]);

// A LIGHT STEMMER, not a real one. Real Arabic morphology is roots and
// patterns; what a help search needs is that "invoices"/"invoicing"/"invoice"
// and "الفواتير"/"فواتير" land near each other, and fuzzy matching covers the
// rest. Every strip keeps at least three letters, so short words survive whole.
export function stem(word: string): string {
  let w = word;
  if (/^[a-z]+$/.test(w)) {
    if (w.length > 5 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
    for (const suf of ["ing", "ed", "s"]) {
      if (w.length - suf.length >= 3 && w.endsWith(suf) && !w.endsWith("ss")) { w = w.slice(0, -suf.length); break; }
    }
    // A SILENT FINAL E GOES TOO, Porter's trick in one line: "invoice",
    // "invoices", "invoicing" and "invoiced" all reach "invoic", where
    // stripping the endings alone leaves "invoice" beside "invoic".
    if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
    return w;
  }
  // LIGHT10 (Larkey, Ballesteros & Connell), the standard light stemmer for
  // Arabic retrieval: a leading "و" (and), then the article with its attached
  // prepositions, then the common suffixes — each strip leaving at least three
  // letters. Written against the normalised form, so ة is already ه and ى ي.
  if (w.length >= 4 && w.startsWith("و")) w = w.slice(1);
  for (const pre of ["وال", "بال", "كال", "فال", "لل", "ال"]) {
    if (w.startsWith(pre) && w.length - pre.length >= 3) { w = w.slice(pre.length); break; }
  }
  // A bare attached preposition ("لإصدار" → "إصدار") when the word is long
  // enough that it cannot be the root's own first letter.
  if (w.length >= 5 && /^[لبك]/.test(w)) w = w.slice(1);
  for (let changed = true; changed;) {
    changed = false;
    for (const suf of ["ها", "ان", "ات", "ون", "ين", "يه", "ه", "ي"]) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); changed = true; break; }
    }
  }
  return w;
}

export function tokens(text: string): string[] {
  // Single Latin letters are the debris of abbreviations ("P O", "e g");
  // single Arabic letters are prepositions the stemmer did not reach.
  return normalise(text).split(" ").filter((t) => t.length > 1 && !STOP.has(t)).map(stem);
}

/* ── Synonyms ──────────────────────────────────────────────────────────── */

// WORDS PEOPLE USE THAT THE PRODUCT DOES NOT. Each group is interchangeable for
// search; an expanded term counts for less than the word actually typed, so a
// query that names the product's own word still ranks that entry first.
// Entry-specific wording belongs in the entry's `keywords`; only vocabulary
// that crosses departments belongs here.
const SYNONYM_GROUPS: string[][] = [
  ["leave", "vacation", "holiday", "absence", "time off", "اجازه", "عطله"],
  ["employee", "staff", "worker", "personnel", "موظف", "عامل"],
  ["customer", "client", "عميل", "عملاء", "زبون", "زبائن"],
  ["supplier", "vendor", "مورد"],
  ["invoice", "bill", "فاتوره", "فواتير"],
  ["salary", "pay", "wage", "payroll", "راتب", "رواتب", "اجور"],
  ["permission", "right", "access", "role", "صلاحيه", "دور"],
  ["delete", "remove", "حذف", "ازاله"],
  // The Arabic VERB forms beside the nouns: a person types "أنشئ" (I create),
  // the entries say "إنشاء" (creating), and the stems differ.
  ["create", "add", "new", "raise", "issue", "انشاء", "انشئ", "اضافه", "اضيف", "جديد", "اصدار", "اصدر"],
  ["edit", "change", "update", "modify", "set", "switch", "تعديل", "اعدل", "تغيير", "اغير", "ضبط", "اضبط", "تبديل", "ابدل"],
  ["approve", "sign", "authorise", "authorize", "اعتماد", "موافقه"],
  ["deal", "opportunity", "lead", "صفقه", "فرصه"],
  ["quote", "quotation", "offer", "عرض", "عروض", "تسعير"],
  ["stock", "inventory", "warehouse", "مخزون", "مستودع"],
  ["setting", "settings", "configure", "config", "setup", "اعدادات", "ضبط"],
  ["missing", "hidden", "disappeared", "cant see", "مفقود", "مخفي"],
  ["login", "log in", "sign in", "signin", "تسجيل الدخول", "دخول"],
  ["studio", "company", "workspace", "tenant", "شركه", "استوديو"],
  ["department", "section", "module", "قسم", "اداره"],
  ["tax", "vat", "ضريبه", "ضرائب"],
  // ARABIC BROKEN PLURALS. A plural built by changing the word's inside
  // (تقرير → تقارير, مشروع → مشاريع) is invisible to a light stemmer, which
  // only trims the ends; every Arabic search engine carries a table like this
  // for the words its users actually type.
  ["report", "تقرير", "تقارير"],
  ["project", "مشروع", "مشاريع"],
  ["order", "امر", "اوامر", "طلبيه"],
  ["item", "product", "صنف", "اصناف", "منتج", "منتجات"],
  ["document", "مستند", "مستندات", "وثيقه", "وثائق"],
  ["account", "حساب", "حسابات"],
  ["contract", "عقد", "عقود"],
  ["machine", "equipment", "asset", "اله", "معده", "اصل"],
];

export const SYNONYMS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    const stems = [...new Set(group.flatMap((w) => tokens(w)))];
    for (const s of stems) m.set(s, [...new Set([...(m.get(s) || []), ...stems.filter((x) => x !== s)])]);
  }
  return m;
})();

/* ── Fuzzy ─────────────────────────────────────────────────────────────── */

/** Optimal-string-alignment distance, bounded: gives up past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// How many typos a word of this length may carry. Short words get none: "pos"
// one letter off is "po", "pay", "per" — a guess, not a correction.
const typoBudget = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

/* ── The index ─────────────────────────────────────────────────────────── */

// Term-frequency multipliers per field (BM25F, simplified).
const WEIGHT = { q: 3, alias: 3, keywords: 2.5, topic: 1.5, a: 1, extra: 0.5 } as const;
const K1 = 1.2;
const B = 0.6;

// `q` is the question's own words, per language — what the focus bonus
// measures against.
// `strong` is the terms from the fields that say what an entry IS ABOUT — its
// question, taught phrasings, keywords and topic — as opposed to words its
// answer happens to use.
type Doc = { id: string; tf: Map<string, number>; len: number; q: Set<string>[]; strong: Set<string> };
export type HelpIndex = {
  docs: Doc[];
  byId: Map<string, Doc>;
  df: Map<string, number>;
  vocab: string[];
  avgLen: number;
  n: number;
};

/** A phrasing support taught Nova: this wording means that entry. */
export type HelpAlias = { entryId: string; phrase: string };

export function buildIndex(
  entries: HelpEntry[],
  topicLabel: (topicId: string) => string = () => "",
  aliases: HelpAlias[] = [],
): HelpIndex {
  const aliasByEntry = new Map<string, string[]>();
  for (const a of aliases) aliasByEntry.set(a.entryId, [...(aliasByEntry.get(a.entryId) || []), a.phrase]);

  const docs: Doc[] = entries.map((e) => {
    const tf = new Map<string, number>();
    const strong = new Set<string>();
    const add = (text: string, w: number) => {
      for (const t of tokens(text)) {
        tf.set(t, (tf.get(t) || 0) + w);
        if (w >= WEIGHT.topic) strong.add(t);
      }
    };
    // BOTH LANGUAGES INTO ONE DOCUMENT: an Arabic question matches the Arabic
    // text, an English one the English, and a mixed one ("كيف اضيف PO") both.
    add(`${e.q.en} ${e.q.ar}`, WEIGHT.q);
    for (const p of aliasByEntry.get(e.id) || []) add(p, WEIGHT.alias);
    add((e.keywords || []).join(" "), WEIGHT.keywords);
    add(topicLabel(e.topic), WEIGHT.topic);
    add(`${e.a.en} ${e.a.ar}`, WEIGHT.a);
    add([...(e.steps?.en || []), ...(e.steps?.ar || []), ...(e.fields?.en || []), ...(e.fields?.ar || [])].join(" "), WEIGHT.extra);
    let len = 0;
    for (const v of tf.values()) len += v;
    // A TAUGHT PHRASING IS A QUESTION TOO, so the focus bonus measures against
    // it as well — otherwise the wording support linked would reach its entry
    // and still only earn a "did you mean", which is the ticket it was taught
    // to prevent (found by sending a real one, 26/09/2026).
    const phrasings = (aliasByEntry.get(e.id) || []).map((p) => new Set(tokens(p)));
    return { id: e.id, tf, len, q: [new Set(tokens(e.q.en)), new Set(tokens(e.q.ar)), ...phrasings], strong };
  });

  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  return { docs, byId: new Map(docs.map((d) => [d.id, d])), df, vocab: [...df.keys()], avgLen, n: docs.length };
}

const idf = (ix: HelpIndex, t: string) => {
  const n = ix.df.get(t) || 0;
  return Math.log(1 + (ix.n - n + 0.5) / (n + 0.5));
};

const bm25 = (ix: HelpIndex, d: Doc, t: string) => {
  const f = d.tf.get(t) || 0;
  if (!f) return 0;
  return idf(ix, t) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / ix.avgLen)));
};

/**
 * Each query word, widened into the index terms it may stand for, with how
 * much each counts. The word itself is 1; a synonym 0.8; a typo or a prefix
 * ("reco" → "reconciliation") less, and less again the further it is.
 */
export function expand(ix: HelpIndex, word: string): Map<string, number> {
  const out = new Map<string, number>();
  const put = (t: string, w: number) => { if (w > (out.get(t) || 0)) out.set(t, w); };
  if (ix.df.has(word)) put(word, 1);
  // A SYNONYM NEVER OUTWEIGHS THE WORD TYPED. A rarer word scores higher, so
  // "issue" (in a handful of entries) standing in for "add" (in hundreds) would
  // rank "issue a revision" above "add a supplier" for a person who typed add.
  // Capping each synonym at the typed word's own rarity keeps it a stand-in.
  const own = ix.df.has(word) ? idf(ix, word) : Infinity;
  const syn = (t: string, base: number) => Math.min(1, own / Math.max(1e-9, idf(ix, t))) * base;
  for (const s of SYNONYMS.get(word) || []) if (ix.df.has(s)) put(s, syn(s, 0.8));
  // Fuzzy only when the exact word found nothing: a real word that exists in
  // the index must not be diluted by its near neighbours.
  if (!out.size) {
    const budget = typoBudget(word.length);
    for (const t of ix.vocab) {
      if (word.length >= 3 && t.length > word.length && t.startsWith(word)) { put(t, 0.6); continue; }
      if (!budget) continue;
      const d = editDistance(word, t, budget);
      if (d <= budget) put(t, d === 1 ? 0.7 : 0.45);
    }
    for (const t of [...out.keys()]) for (const s of SYNONYMS.get(t) || []) if (ix.df.has(s)) put(s, (out.get(t) || 0) * 0.8);
  }
  return out;
}

/** `focus`: the share of the entry's own question the typed words account for. */
export type HelpHit = { id: string; score: number; coverage: number; focus: number };

export type SearchOptions = {
  /** Only these entries may be returned (switched-off sections are filtered out). */
  allow?: (id: string) => boolean;
  /** Entries the person has already been offered and turned down. */
  exclude?: string[];
  /** Multiplier per entry — the screen they are on ranks its own help first. */
  boost?: (id: string) => number;
  limit?: number;
};

export function search(ix: HelpIndex, query: string, opts: SearchOptions = {}): { hits: HelpHit[]; words: number } {
  const words = [...new Set(tokens(query))];
  if (!words.length) return { hits: [], words: 0 };
  const expansions = words.map((w) => expand(ix, w));
  const exclude = new Set(opts.exclude || []);
  const hits: HelpHit[] = [];
  for (const d of ix.docs) {
    if (exclude.has(d.id) || (opts.allow && !opts.allow(d.id))) continue;
    let score = 0;
    let covered = 0;
    for (const ex of expansions) {
      let best = 0;
      let inStrong = false;
      for (const [t, w] of ex) {
        const v = w * bm25(ix, d, t);
        if (v > best) best = v;
        if (v > 0 && d.strong.has(t)) inStrong = true;
      }
      // A word found only in the answer's prose is half-explained: "customer"
      // somewhere in the tender entry's third sentence does not make it an
      // answer about customers.
      if (best > 0) { score += best; covered += inStrong ? 1 : 0.5; }
    }
    if (!score) continue;
    const coverage = covered / words.length;
    // COVERAGE IS MULTIPLIED IN, not added: an entry matching one word of four
    // very strongly should not beat an entry matching all four moderately.
    score *= 0.5 + coverage / 2;
    // QUESTION FOCUS: how much of the entry's OWN question the words typed
    // account for. "How do I raise an invoice" is fully explained by "What do
    // I need to raise an invoice?" and only a quarter of "Does a sales order
    // reserve stock, raise an invoice or open a project?" — the same two words
    // match both, and BM25 alone cannot tell a question ABOUT invoices from one
    // that mentions them. A title match, in search-engine terms.
    const typed = new Set(expansions.flatMap((ex) => [...ex.keys()]));
    const focus = Math.max(...d.q.map((set) => (set.size ? [...set].filter((t) => typed.has(t)).length / set.size : 0)));
    score *= 1 + 0.6 * focus;
    score *= opts.boost ? opts.boost(d.id) : 1;
    hits.push({ id: d.id, score, coverage, focus });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { hits: hits.slice(0, opts.limit ?? 5), words: words.length };
}

/* ── The decision ──────────────────────────────────────────────────────── */

export type HelpDecision =
  /** Sure enough to answer outright; the reply still offers "not what I meant". */
  | { move: "answer"; top: HelpHit; others: HelpHit[] }
  /** One plausible match — ask "did you mean…?" before answering. */
  | { move: "confirm"; top: HelpHit; others: HelpHit[] }
  /** Nothing close enough to put in front of anybody. */
  | { move: "none"; others: HelpHit[] };

// THRESHOLDS ARE ON COVERAGE AND ON THE GAP, not on the raw score. A BM25 score
// has no fixed scale — it moves with every entry added — so "score > 6" would
// be a threshold silently re-tuned by whoever wrote the next entry. How much of
// the question an entry explains, and how far ahead of the runner-up it is, do
// not drift that way. Tuned against tests/help-model.mjs's question set.
export const ANSWER_COVERAGE = 0.75;
export const ANSWER_LEAD = 1.3;
export const CONFIRM_COVERAGE = 0.34;
export const ANSWER_FOCUS = 0.5;
// An alternative offered after "No" must explain at least half the question.
// Below that it is a single shared word — "calendar" offering an inspection
// entry — and a list of those reads as the assistant not listening.
export const ALTERNATIVE_COVERAGE = 0.5;

export function decide(result: { hits: HelpHit[]; words: number }): HelpDecision {
  const [top, ...rest] = result.hits;
  const others = rest.filter((h) => h.coverage >= ALTERNATIVE_COVERAGE).slice(0, 2);
  if (!top) return { move: "none", others: [] };
  // One meaningful word ("invoice") is a topic, not a question: never answer
  // it outright, however well it matches — ask.
  const lead = rest[0] ? top.score / rest[0].score : Infinity;
  // And the words must explain the entry's OWN question, not only appear in it:
  // "who can see my data" matching two words of a long question about Reports
  // is a guess worth confirming, not an answer.
  if (result.words >= 2 && top.coverage >= ANSWER_COVERAGE && lead >= ANSWER_LEAD && top.focus >= ANSWER_FOCUS) {
    return { move: "answer", top, others };
  }
  if (top.coverage >= CONFIRM_COVERAGE) return { move: "confirm", top, others };
  return { move: "none", others: result.hits.filter((h) => h.coverage >= CONFIRM_COVERAGE / 2).slice(0, 3) };
}
