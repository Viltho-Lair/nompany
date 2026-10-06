"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { helpPayload } from "@/lib/nova/help/knowledge";
import type { HelpDecision } from "@/lib/nova/help/search";

/** One language of the knowledge base, as GET nova/help answers it. */
export type HelpPayload = ReturnType<typeof helpPayload>;
export type HelpTopicRow = HelpPayload["topics"][number];
export type HelpEntryRow = HelpPayload["entries"][number];
/** What POST nova/help answers: the move and entry ids only (see the route). */
export type HelpSearchResult = { move: HelpDecision["move"]; top: string; others: string[] };
/** GET nova/help: the whole tree, or `unchanged` when `have` was current. */
type HelpFetched = (Partial<HelpPayload> & { unchanged?: boolean }) | null;

// NOVA'S HELP DESK, in the browser — the knowledge base for one language and
// one studio, kept so every click down the tree is answered from memory.
//
// THREE LAYERS OF CACHE, cheapest first:
//   1. module memory — survives the panel closing and reopening, and moving
//      between screens, for the life of the tab. Zero requests.
//   2. localStorage, under the server's version — survives a reload. One
//      request of a few bytes (`?have=<version>`) to confirm it is current.
//   3. the route — the full tree, only when the version has moved (a deploy
//      that changed an answer, or the studio switching a section on or off).
//
// WHY NOT HTTP CACHING: the version depends on the studio's switches as well
// as the content, so a max-age would serve a section's help for a while after
// it was switched off; the version round-trip is a handful of bytes and is
// always right.
//
// Storage can throw (private window, blocked site data), so every touch is
// wrapped and a failure just means one more request.

const memory = new Map<string, HelpPayload>();   // `${slug}:${locale}` → payload

const storageKey = (slug: string, locale: string) => `nova-help:${slug}:${locale}`;

function readStored(slug: string, locale: string): HelpPayload | null {
  try {
    const raw = window.localStorage.getItem(storageKey(slug, locale));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeStored(slug: string, locale: string, payload: HelpPayload) {
  try { window.localStorage.setItem(storageKey(slug, locale), JSON.stringify(payload)); } catch { /* quota or blocked */ }
}

export function useNovaHelp(slug: string, locale: string, enabled: boolean) {
  const key = `${slug}:${locale}`;
  // STATE IS KEYED, so a language switch never shows the other language's tree
  // for a render: a held payload for another key reads as none.
  const [held, setHeld] = useState<{ key: string; payload: HelpPayload | null; failed: boolean }>(() => ({ key, payload: memory.get(key) || null, failed: false }));
  const payload = held.key === key ? held.payload : memory.get(key) || null;
  const status = payload ? "ready" : held.key === key && held.failed ? "error" : enabled ? "loading" : "idle";

  useEffect(() => {
    if (!enabled || !slug || memory.get(key)) return undefined;
    let live = true;
    const stored = readStored(slug, locale);
    // Show the stored copy AT ONCE and confirm it behind — a stale answer for
    // the second it takes to check is better than a spinner on every reload.
    if (stored?.topics) Promise.resolve().then(() => { if (live && !memory.get(key)) setHeld({ key, payload: stored, failed: false }); });
    const have = stored?.version ? `&have=${encodeURIComponent(stored.version)}` : "";
    const fail = () => { if (live && !stored?.topics) setHeld({ key, payload: null, failed: true }); };
    fetch(`/api/studios/${slug}/nova/help?locale=${locale}${have}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HelpFetched) => {
        if (!live) return;
        const fetched = d?.unchanged && stored?.topics ? stored : d;
        if (!fetched?.topics) { fail(); return; }
        // A body carrying `topics` is a whole payload — the route sends both lists.
        const next = fetched as HelpPayload;
        memory.set(key, next);
        if (!d?.unchanged) writeStored(slug, locale, next);
        setHeld({ key, payload: next, failed: false });
      })
      .catch(fail);
    return () => { live = false; };
  }, [enabled, slug, locale, key]);

  // Lookups the cards need, built once per payload.
  const kb = useMemo(() => {
    if (!payload) return null;
    const topics = new Map(payload.topics.map((t): [string, HelpTopicRow] => [t.id, t]));
    const entries = new Map(payload.entries.map((e): [string, HelpEntryRow] => [e.id, e]));
    const childTopics = new Map<string, HelpTopicRow[]>();
    for (const t of payload.topics) {
      if (!t.parent) continue;
      childTopics.set(t.parent, [...(childTopics.get(t.parent) || []), t]);
    }
    for (const list of childTopics.values()) list.sort((a, b) => a.order - b.order);
    const entriesOf = new Map<string, HelpEntryRow[]>();
    for (const e of payload.entries) entriesOf.set(e.topic, [...(entriesOf.get(e.topic) || []), e]);
    // The section a key names, by the label of its own topic — what an "Open"
    // button calls the screen.
    const sectionName = new Map(payload.topics.filter((t) => t.sectionKey).map((t): [string, string] => [t.sectionKey, t.label]));
    /** Every topic id from this one up to the root. */
    const chain = (topicId: string) => {
      const out: HelpTopicRow[] = [];
      let t: HelpTopicRow | null | undefined = topics.get(topicId);
      for (let guard = 0; t && guard < 12; guard++) { out.push(t); t = t.parent ? topics.get(t.parent) : null; }
      return out;
    };
    return { topics, entries, childTopics, entriesOf, sectionName, chain };
  }, [payload]);

  /**
   * The main questions for the opening screen: common ones about the screen
   * the person is on first, then the studio-wide ones, four in all.
   */
  const popular = useCallback((view: string): HelpEntryRow[] => {
    if (!kb || !payload) return [];
    const common = payload.entries.filter((e) => e.common);
    const here = view ? common.filter((e) => e.open === view || kb.chain(e.topic).some((t) => t.sectionKey === view)) : [];
    const general = common.filter((e) => e.topic.startsWith("start") || e.topic === "trouble" || e.topic.startsWith("trouble."));
    return [...new Set([...here.slice(0, 2), ...general, ...common])].slice(0, 4);
  }, [kb, payload]);

  const search = useCallback(async (q: string, { view = "", exclude = [] as string[] } = {}): Promise<HelpSearchResult | null> => {
    const res = await fetch(`/api/studios/${slug}/nova/help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, view, exclude }),
    });
    if (!res.ok) return null;
    return res.json();
  }, [slug]);

  const sendToSupport = useCallback(async ({ question, offered, path, view }: {
    question: string; offered?: string[]; path: string[]; view: string;
  }): Promise<{ ok: true; emailed?: boolean } | { ok: false; error: string }> => {
    const res = await fetch(`/api/studios/${slug}/nova/help/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, offered, path, view, locale }),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 429) return { ok: false, error: "rate-limited" };
    return res.ok && data?.ok ? { ok: true, emailed: data.emailed } : { ok: false, error: data?.error || "failed" };
  }, [slug, locale]);

  return { status, kb, popular, search, sendToSupport };
}
