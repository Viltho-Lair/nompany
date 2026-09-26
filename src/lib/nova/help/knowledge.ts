// NOVA'S HELP DESK, assembled — the one place the knowledge base is read.
//
// SERVER-ONLY (see types.ts). Everything here is built ONCE PER PROCESS and
// memoised: the entries are code, so they cannot change without a deploy, and
// a deploy is a new process. The one thing that CAN change at runtime is the
// phrasings support teaches (`HelpAlias`), and the search index is rebuilt
// only when their stamp moves.

import { createHash } from "node:crypto";
import type { HelpEntry, HelpModule, HelpTopic } from "./types";
import { buildIndex, decide, search, tokens, type HelpAlias, type HelpDecision, type HelpIndex } from "./search";
import { MANUAL_FROM_HELP, composeManualArticle, manualAnchors } from "./manual";
import type { ManualArticle } from "@/shared/studio/manual";
import { root } from "./kb/root";
import { general } from "./kb/general";
import { sales } from "./kb/sales";
import { crmSales } from "./kb/crmSales";
import { quotations } from "./kb/quotations";
import { projectsSide } from "./kb/projectsSide";
import { operations } from "./kb/operations";
import { hr } from "./kb/hr";
import { finance } from "./kb/finance";

export const HELP_MODULES: HelpModule[] = [root, general, crmSales, quotations, sales, projectsSide, operations, hr, finance];

export const HELP_TOPICS: HelpTopic[] = HELP_MODULES.flatMap((m) => m.topics);
export const HELP_ENTRIES: HelpEntry[] = HELP_MODULES.flatMap((m) => m.entries);

const topicById = new Map(HELP_TOPICS.map((t) => [t.id, t]));
const entryById = new Map(HELP_ENTRIES.map((e) => [e.id, e]));

export const helpEntry = (id: string) => entryById.get(id) || null;

// WHERE EACH ANSWER SITS IN THE MANUAL, for the departments whose manual IS
// their help entries (./manual). Built once: the entries are code.
const MANUAL_ANCHOR = new Map<string, string>(
  MANUAL_FROM_HELP.flatMap((root) => [...manualAnchors(root, HELP_TOPICS, HELP_ENTRIES)]),
);
export const manualAnchorOf = (entryId: string) => MANUAL_ANCHOR.get(entryId) || "";

/** The manual chapters composed from help entries, in one language. */
export function helpManualArticles(locale: HelpLocale): ManualArticle[] {
  return MANUAL_FROM_HELP
    .map((root) => composeManualArticle(root, locale, HELP_TOPICS, HELP_ENTRIES))
    .filter((a): a is ManualArticle => Boolean(a));
}
export const helpTopic = (id: string) => topicById.get(id) || null;

// THE CONTENT'S OWN FINGERPRINT. It changes when any entry does, so a browser
// holding yesterday's copy is told to fetch again after a deploy that edited an
// answer — and is NOT told to after a deploy that did not.
export const HELP_VERSION = createHash("sha256")
  .update(JSON.stringify(HELP_MODULES))
  .digest("hex")
  .slice(0, 12);

/** Every section key a topic or any of its ancestors names. */
function sectionChain(topicId: string): string[] {
  const out: string[] = [];
  let t = topicById.get(topicId);
  for (let guard = 0; t && guard < 12; guard++) {
    if (t.sectionKey) out.push(t.sectionKey);
    t = t.parent ? topicById.get(t.parent) : undefined;
  }
  return out;
}

/**
 * Which entries a studio may be shown. A topic naming a section the studio has
 * SWITCHED OFF is hidden with everything under it — the dashboards' rule, a
 * visual goes when its section goes. A section with no row at all is NOT
 * hidden: every studio's rows are planted on read, so absence is a moment
 * rather than a choice, and hiding on it would hide help from the one studio
 * most likely to need it.
 */
export function studioFilter(sections: { key?: unknown; enabled?: unknown }[] | null | undefined) {
  const off = new Set(
    (sections || []).filter((s) => s && s.enabled === false).map((s) => String(s.key)),
  );
  const topicOk = (topicId: string) => !sectionChain(topicId).some((k) => off.has(k));
  const entryOk = (id: string) => {
    const e = entryById.get(id);
    return Boolean(e) && topicOk(e!.topic);
  };
  return { off, topicOk, entryOk, stamp: [...off].sort().join(",") };
}

export type HelpLocale = "en" | "ar";

/**
 * ONE LANGUAGE OF THE KNOWLEDGE BASE, for one studio — what the browser keeps.
 * Everything a click needs is in it, so walking the tree costs no request at
 * all after this has arrived once.
 */
export function helpPayload(locale: HelpLocale, filter: ReturnType<typeof studioFilter>) {
  const L = locale === "ar" ? "ar" : "en";
  const topics = HELP_TOPICS.filter((t) => filter.topicOk(t.id)).map((t) => ({
    id: t.id,
    parent: t.parent,
    order: t.order,
    label: t.label[L],
    blurb: t.blurb?.[L] || "",
    sectionKey: t.sectionKey || "",
  }));
  const entries = HELP_ENTRIES.filter((e) => filter.entryOk(e.id)).map((e) => ({
    id: e.id,
    topic: e.topic,
    kind: e.kind,
    q: e.q[L],
    a: e.a[L],
    steps: e.steps?.[L] || [],
    fields: e.fields?.[L] || [],
    // An "Open it" button for a section the studio switched off would lead to
    // a screen that is not there.
    open: e.open && !filter.off.has(e.open) ? e.open : "",
    related: (e.related || []).filter((r) => filter.entryOk(r)),
    common: Boolean(e.common),
    // "Read in documentation": the anchor of the paragraph this answer IS, on
    // the studio's Documentation page. Empty for a department whose manual is
    // still hand-written, where no paragraph is the same text.
    doc: manualAnchorOf(e.id),
  }));
  return { version: helpVersionFor(L, filter), topics, entries };
}

/** The version a browser caches under: the content, the language, the studio's switches. */
export const helpVersionFor = (locale: HelpLocale, filter: ReturnType<typeof studioFilter>) =>
  `${HELP_VERSION}.${locale}.${createHash("sha256").update(filter.stamp).digest("hex").slice(0, 6)}`;

/* ── Search, memoised ───────────────────────────────────────────────────── */

let memo: { stamp: string; index: HelpIndex } | null = null;

function indexFor(aliases: HelpAlias[], stamp: string): HelpIndex {
  if (memo && memo.stamp === stamp) return memo.index;
  // A TAUGHT PHRASING FOR AN ENTRY THAT NO LONGER EXISTS is dropped here rather
  // than trusted: the entry was deleted in a deploy after support linked it.
  const live = aliases.filter((a) => entryById.has(a.entryId));
  const index = buildIndex(HELP_ENTRIES, (id) => {
    const t = topicById.get(id);
    return t ? `${t.label.en} ${t.label.ar}` : "";
  }, live);
  memo = { stamp, index };
  return index;
}

/** Rank the knowledge base against a typed question, for one studio and one screen. */
export function helpSearch(
  query: string,
  opts: {
    filter: ReturnType<typeof studioFilter>;
    aliases?: HelpAlias[];
    aliasStamp?: string;
    view?: string;
    exclude?: string[];
  },
): HelpDecision {
  const index = indexFor(opts.aliases || [], opts.aliasStamp || "");
  // THE SCREEN THEY ARE ON IS EVIDENCE. "How do I add one?" asked on the
  // Suppliers screen is about suppliers; a small lift for entries under that
  // section (and its root) settles a tie without overruling a clear match.
  const view = String(opts.view || "");
  // The department the screen sits in, read off the tree rather than the key's
  // spelling — "crm-sales-pipeline" does not split into its root on a hyphen.
  const viewRoot = sectionChain(`dept.${view}`).at(-1) || view;
  // THE VAGUER THE QUESTION, THE MORE THE SCREEN COUNTS. "How do I add one?"
  // is one meaningful word, and on the Suppliers screen it means suppliers —
  // a light lift lost it to "How do I add a customer?", whose short question
  // explains "add" better (found when CRM & Sales grew, 27/09/2026). A full
  // sentence says what it is about by itself, so its lift stays small.
  const vague = tokens(query).length <= 2;
  const here = vague ? 1.8 : 1.25;
  const dept = vague ? 1.3 : 1.1;
  const boost = (id: string) => {
    if (!view) return 1;
    const e = entryById.get(id);
    if (!e) return 1;
    const chain = sectionChain(e.topic);
    if (e.open === view || chain.includes(view)) return here;
    if (chain.some((k) => k === viewRoot)) return dept;
    return 1;
  };
  return decide(search(index, query, { allow: opts.filter.entryOk, exclude: opts.exclude, boost, limit: 5 }));
}
