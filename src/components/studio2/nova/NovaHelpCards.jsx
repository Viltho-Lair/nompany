"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

// NOVA'S HELP DESK, drawn — the cards that sit in Nova's transcript between the
// ordinary chat bubbles, and the flow that decides which card comes next.
//
// THE FLOW IS THE TWO-STAGE FALLBACK conversational assistants converged on,
// with the owner's three steps kept exactly:
//
//   1. a typed question is matched (lib/nova/help/search, on the server);
//      sure → the answer, with "not what I meant" under it;
//      plausible → "Did you mean …?" Yes / No;
//      nothing close → say so, and offer support or Nova's data answers.
//   2. "No" → the next two matches, from the same ranking;
//   3. "None of these" → send it to support, with what was offered attached.
//
// Clicking instead of typing reaches the same entries through the topic tree,
// and costs no request — the tree is already in memory (useNovaHelp).

let seq = 0;
const cardId = () => `hc${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * The flow's handlers. `setMessages` is Nova's own transcript setter: a card
 * is a message with a `kind`, so help and chat share one scrolling history, and
 * the chat's history sent to the model leaves cards out (NovaLauncher).
 */
export function useHelpFlow({ help, setMessages, view, askModel }) {
  // The topics clicked through, in order — support reads it as "Browsed:".
  const path = useRef([]);

  const push = useCallback((...cards) => {
    setMessages((m) => [...m, ...cards.map((c) => (c.role ? c : { role: "assistant", id: cardId(), ...c }))]);
  }, [setMessages]);

  const patch = useCallback((id, fields) => {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...fields } : x)));
  }, [setMessages]);

  const openTopic = useCallback((topicId, label) => {
    path.current = [...path.current, topicId].slice(-10);
    push({ role: "user", content: label }, { kind: "topic", topicId });
  }, [push]);

  const openEntry = useCallback((entryId, { q = "", alts = [], echo = true } = {}) => {
    const e = help.kb?.entries.get(entryId);
    if (!e) return;
    const cards = [{ kind: "answer", entryId, q, alts }];
    push(...(echo ? [{ role: "user", content: e.q }, ...cards] : cards));
  }, [help.kb, push]);

  const support = useCallback((q, offered) => {
    push({ kind: "support", q, offered: [...new Set(offered)] });
  }, [push]);

  /** A typed question. Answers false when help cannot take it (not loaded, route down). */
  const ask = useCallback(async (q) => {
    if (!help.kb) return false;
    const res = await help.search(q, { view });
    if (!res) return false;
    const { move, top, others = [] } = res;
    push({ role: "user", content: q });
    if (move === "answer") push({ kind: "answer", entryId: top, q, alts: others });
    else if (move === "confirm") push({ kind: "confirm", entryId: top, others, q });
    else push({ kind: "nomatch", q, offered: others });
    return true;
  }, [help, view, push]);

  const handlers = {
    openTopic,
    openEntry,
    confirm(card, yes) {
      patch(card.id, { settled: yes ? "yes" : "no" });
      if (yes) { openEntry(card.entryId, { q: card.q, alts: card.others, echo: false }); return; }
      if (card.others.length) push({ kind: "alts", ids: card.others, q: card.q, offered: [card.entryId, ...card.others] });
      else support(card.q, [card.entryId]);
    },
    notThis(card) {
      patch(card.id, { settled: "no" });
      if (card.alts?.length) push({ kind: "alts", ids: card.alts, q: card.q, offered: [card.entryId, ...card.alts] });
      else support(card.q, [card.entryId]);
    },
    pickAlt(card, id) {
      patch(card.id, { settled: id });
      openEntry(id, { q: card.q, echo: false });
    },
    none(card) {
      patch(card.id, { settled: "none" });
      support(card.q, card.offered || []);
    },
    support,
    sendToSupport: help.sendToSupport,
    askModel(q) { askModel(q); },
    path: () => path.current,
  };

  return { ask, handlers };
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

const chip = "rounded-full border border-slate-200 px-3 py-1.5 text-start text-xs text-slate-700 transition-colors hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-white/15 dark:text-slate-200";
const primaryBtn = "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50";
const ghostBtn = "rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5";
const shell = "w-full max-w-[92%] rounded-2xl bg-slate-100 px-3.5 py-3 text-sm text-slate-800 dark:bg-white/5 dark:text-slate-100";

export function HelpCard({ m, kb, h, tr, slug, view }) {
  if (!kb) return null;
  switch (m.kind) {
    case "topic": return <TopicCard m={m} kb={kb} h={h} tr={tr} />;
    case "answer": return <AnswerCard m={m} kb={kb} h={h} tr={tr} slug={slug} />;
    case "confirm": return <ConfirmCard m={m} kb={kb} h={h} tr={tr} />;
    case "alts": return <AltsCard m={m} kb={kb} h={h} tr={tr} />;
    case "nomatch": return <NoMatchCard m={m} kb={kb} h={h} tr={tr} />;
    case "support": return <SupportCard m={m} h={h} tr={tr} view={view} />;
    default: return null;
  }
}

/** The opening screen's help block: the top of the tree and the main questions. */
export function HelpStart({ help, h, tr, view }) {
  if (help.status === "loading" && !help.kb) return <p className="text-xs text-slate-400">{tr.loadingHelp}</p>;
  if (!help.kb) return help.status === "error" ? <p className="text-xs text-slate-400">{tr.helpUnavailable}</p> : null;
  const top = help.kb.childTopics.get("root") || [];
  const popular = help.popular(view);
  return (
    <div className="space-y-3">
      {popular.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.popular}</p>
          <div className="flex flex-col gap-1.5">
            {popular.map((e) => (
              <button key={e.id} type="button" onClick={() => h.openEntry(e.id)}
                className="rounded-xl bg-brand-50 px-3 py-2 text-start text-sm text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200">
                {e.q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.browseHelp}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {top.map((t) => (
            <button key={t.id} type="button" onClick={() => h.openTopic(t.id, t.label)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-start transition-colors hover:border-brand-500 dark:border-white/10">
              <span className="block text-sm font-500 text-slate-800 dark:text-slate-100">{t.label}</span>
              {t.blurb && <span className="block text-xs text-slate-500 dark:text-slate-400">{t.blurb}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopicCard({ m, kb, h, tr }) {
  const t = kb.topics.get(m.topicId);
  if (!t) return null;
  const children = kb.childTopics.get(t.id) || [];
  const entries = kb.entriesOf.get(t.id) || [];
  // Main questions first, then the rest in the order they were written.
  const ordered = [...entries.filter((e) => e.common), ...entries.filter((e) => !e.common)];
  const parent = t.parent ? kb.topics.get(t.parent) : null;
  return (
    <div className={shell}>
      <p className="font-600">{t.label}</p>
      {t.blurb && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.blurb}</p>}
      {ordered.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.questionsHere}</p>
          <div className="flex flex-col gap-1.5">
            {ordered.map((e) => (
              <button key={e.id} type="button" onClick={() => h.openEntry(e.id)} className={`${chip} rounded-xl`}>{e.q}</button>
            ))}
          </div>
        </>
      )}
      {children.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.moreTopics}</p>
          <div className="flex flex-wrap gap-1.5">
            {children.map((c) => (
              <button key={c.id} type="button" onClick={() => h.openTopic(c.id, c.label)} className={chip} title={c.blurb || undefined}>{c.label}</button>
            ))}
          </div>
        </>
      )}
      {parent && (
        <button type="button" onClick={() => h.openTopic(parent.id, parent.label)} className="mt-3 text-xs text-brand-600 hover:underline dark:text-brand-300">
          {tr.back(parent.label)}
        </button>
      )}
    </div>
  );
}

function AnswerCard({ m, kb, h, tr, slug }) {
  const e = kb.entries.get(m.entryId);
  if (!e) return null;
  const related = e.related.map((id) => kb.entries.get(id)).filter(Boolean);
  const openName = e.open ? kb.sectionName.get(e.open) : "";
  return (
    <div className={shell}>
      <p className="font-600">{e.q}</p>
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{e.a}</p>
      {e.fields.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.haveReady}</p>
          <ul className="mt-1 list-disc space-y-0.5 ps-5">{e.fields.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </>
      )}
      {e.steps.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.steps}</p>
          <ol className="mt-1 list-decimal space-y-0.5 ps-5">{e.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {e.open && openName && (
          <Link href={`/${slug}/${e.open}`} className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-500 text-white hover:bg-brand-700">
            {tr.open(openName)}
          </Link>
        )}
        {/* The same paragraph, in the department's manual chapter — one
            source, so reading on can never contradict what was just said. */}
        {e.doc && (
          <Link href={`/${slug}/documentation#${e.doc}`} className={chip}>{tr.readDocs}</Link>
        )}
        {!m.settled && (
          <button type="button" onClick={() => h.notThis(m)} className={chip}>{tr.notThis}</button>
        )}
      </div>
      {related.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.related}</p>
          <div className="flex flex-col gap-1.5">
            {related.map((r) => <button key={r.id} type="button" onClick={() => h.openEntry(r.id)} className={`${chip} rounded-xl`}>{r.q}</button>)}
          </div>
        </>
      )}
    </div>
  );
}

function ConfirmCard({ m, kb, h, tr }) {
  const e = kb.entries.get(m.entryId);
  if (!e) return null;
  return (
    <div className={shell}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.didYouMean}</p>
      <p className="mt-0.5 font-600">{e.q}</p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" disabled={Boolean(m.settled)} onClick={() => h.confirm(m, true)} className={primaryBtn}>{tr.yes}</button>
        <button type="button" disabled={Boolean(m.settled)} onClick={() => h.confirm(m, false)} className={ghostBtn}>{tr.no}</button>
      </div>
    </div>
  );
}

function AltsCard({ m, kb, h, tr }) {
  const alts = m.ids.map((id) => kb.entries.get(id)).filter(Boolean);
  return (
    <div className={shell}>
      <p className="font-600">{tr.maybeOneOfThese}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {alts.map((e) => (
          <button key={e.id} type="button" disabled={Boolean(m.settled)} onClick={() => h.pickAlt(m, e.id)} className={`${chip} rounded-xl`}>{e.q}</button>
        ))}
        <button type="button" disabled={Boolean(m.settled)} onClick={() => h.none(m)} className={`${chip} rounded-xl border-dashed`}>{tr.noneOfThese}</button>
      </div>
    </div>
  );
}

function NoMatchCard({ m, kb, h, tr }) {
  // Weak matches that did not clear the bar are still offered, quietly — the
  // person may recognise one the matcher could not be sure of.
  const weak = (m.offered || []).map((id) => kb.entries.get(id)).filter(Boolean);
  return (
    <div className={shell}>
      <p className="font-600">{tr.noMatch}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.noMatchHint}</p>
      {weak.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {weak.map((e) => <button key={e.id} type="button" onClick={() => h.openEntry(e.id, { q: m.q })} className={`${chip} rounded-xl`}>{e.q}</button>)}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" onClick={() => h.support(m.q, m.offered || [])} className={primaryBtn}>{tr.sendToSupport}</button>
        <button type="button" onClick={() => h.askModel(m.q)} className={ghostBtn}>{tr.askAboutData}</button>
      </div>
    </div>
  );
}

function SupportCard({ m, h, tr, view }) {
  const [text, setText] = useState(m.q || "");
  const [state, setState] = useState("idle");   // idle | sending | sent | sentNoEmail | failed | limited
  const done = state === "sent" || state === "sentNoEmail";

  async function submit() {
    if (!text.trim() || state === "sending" || done) return;
    setState("sending");
    const r = await h.sendToSupport({ question: text.trim(), offered: m.offered, path: h.path(), view });
    setState(r.ok ? (r.emailed ? "sent" : "sentNoEmail") : r.error === "rate-limited" ? "limited" : "failed");
  }

  if (done) {
    return <div className={shell}><p>{state === "sent" ? tr.sent : tr.sentNoEmail}</p></div>;
  }
  return (
    <div className="w-full rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="font-600 text-slate-800 dark:text-slate-100">{tr.sendToSupport}</p>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{tr.supportIntro}</p>
      <textarea dir="auto" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr.supportPlaceholder}
        className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white" />
      {state === "failed" && <p className="mt-1 text-xs text-rose-600">{tr.sendFailed}</p>}
      {state === "limited" && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{tr.rateLimited}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={submit} disabled={!text.trim() || state === "sending"} className={primaryBtn}>
          {state === "sending" ? tr.sending : tr.send}
        </button>
      </div>
    </div>
  );
}
