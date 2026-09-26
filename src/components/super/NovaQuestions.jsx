"use client";

import { useCallback, useMemo, useState } from "react";
import { useReload } from "@/components/studio2/useReload";
import { Badge, Card, CardBody, CardHead } from "@/app/super/_components/ui";
import { fmtDateTime } from "@/lib/format";

// /super → NOVA → QUESTIONS. Everything the help desk could not answer, and
// support's three moves on each: reply (email + the asker's bell), teach (this
// wording means that answer — the next asker is answered by Nova), close.
//
// WHAT NOVA OFFERED IS SHOWN ON EVERY CARD, because it is the half of a ticket
// that fixes the product rather than one person's afternoon: "it offered the
// leave balance entry and they meant leave carry-over" says the knowledge base
// is missing an entry, not that the person asked badly.

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "answered", label: "Answered" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];
const TONE = { open: "warning", answered: "success", closed: "muted" };

export default function NovaQuestions() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState(null);   // the teach picker's list, loaded on first use

  const load = useCallback(async () => {
    const res = await fetch("/api/super/nova-questions", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the questions."); setRows([]); return; }
    setError("");
    setRows((await res.json()).questions || []);
  }, []);
  useReload(load);

  const loadEntries = useCallback(async () => {
    if (entries) return;
    const res = await fetch("/api/super/nova-questions?entries=1", { cache: "no-store" });
    setEntries(res.ok ? (await res.json()).entries || [] : []);
  }, [entries]);

  const act = useCallback(async (payload) => {
    const res = await fetch("/api/super/nova-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { ok: false, error: data?.error || "failed" };
    setRows((cur) => (cur || []).map((r) => (r.id === payload.id && data.question ? data.question : r)));
    return { ok: true, emailed: data.emailed };
  }, []);

  const counts = useMemo(() => {
    const c = { open: 0, answered: 0, closed: 0, all: 0 };
    for (const r of rows || []) { c[r.status] = (c[r.status] || 0) + 1; c.all += 1; }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => (filter === "all" || r.status === filter) && (!q || [
      r.question, r.studio?.name, r.studio?.slug, r.asker?.name, r.asker?.email,
    ].some((v) => String(v || "").toLowerCase().includes(q))));
  }, [rows, filter, query]);

  return (
    <Card>
      <CardHead
        title="Questions"
        sub="What people asked Nova that the help desk could not answer. Each one was also emailed to support."
        action={(
          <>
            <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-500 ${filter === f.id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500"}`}>
                  {f.label} <span className="num opacity-70">{counts[f.id] || 0}</span>
                </button>
              ))}
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions, studios, people"
              className="w-56 max-w-full rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm dark:border-white/10" />
          </>
        )}
      />
      <CardBody>
        {rows === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : !shown.length ? (
          <p className="text-sm text-slate-500">{filter === "open" ? "No open questions. Nova is answering everything it is asked." : "Nothing here."}</p>
        ) : (
          <ul className="space-y-4">
            {shown.map((r) => (
              <QuestionCard key={r.id} row={r} act={act} entries={entries} loadEntries={loadEntries} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function QuestionCard({ row, act, entries, loadEntries }) {
  const [reply, setReply] = useState("");
  const [teaching, setTeaching] = useState(false);
  const [pick, setPick] = useState("");
  const [find, setFind] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async (payload, done) => {
    setBusy(true); setNote("");
    const res = await act({ id: row.id, ...payload });
    setBusy(false);
    setNote(res.ok ? done(res) : `That didn't go through (${res.error}).`);
  };

  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (!entries) return [];
    return entries.filter((e) => !q || e.q.toLowerCase().includes(q) || e.id.includes(q)).slice(0, 12);
  }, [entries, find]);

  return (
    <li className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone={TONE[row.status] || "muted"}>{row.status}</Badge>
        {!row.emailed && <Badge tone="danger">email not sent</Badge>}
        {row.taughtEntryId && <Badge tone="info">taught → {row.taughtEntryId}</Badge>}
        <span className="font-600 text-slate-700 dark:text-slate-200">{row.studio?.name || row.studio?.slug}</span>
        <span>·</span>
        <span>{row.asker?.name} {row.asker?.email ? `<${row.asker.email}>` : ""}</span>
        <span>·</span>
        <time className="num">{fmtDateTime(row.askedAt)}</time>
        {row.view && <><span>·</span><span>on {row.view}</span></>}
        <span>·</span>
        <span>{row.locale === "ar" ? "Arabic" : "English"}</span>
      </div>

      <p dir="auto" className="mt-2 whitespace-pre-wrap text-sm text-slate-900 dark:text-white">{row.question}</p>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/5">
        <p className="font-600 text-slate-600 dark:text-slate-300">Nova offered</p>
        {row.offered?.length ? (
          <ol className="mt-1 list-decimal space-y-0.5 ps-4 text-slate-600 dark:text-slate-300">
            {row.offered.map((o) => <li key={o.id}>{o.q} <span className="text-slate-400">({o.id})</span></li>)}
          </ol>
        ) : <p className="mt-1 text-slate-500">Nothing — no match was found.</p>}
        {row.path?.length > 0 && <p className="mt-1 text-slate-400">Browsed: {row.path.join(" › ")}</p>}
      </div>

      {row.reply && (
        <div className="mt-3 rounded-lg border-s-4 border-emerald-400 bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10">
          <p dir="auto" className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">{row.reply}</p>
          <p className="mt-1 text-xs text-slate-500">{row.repliedBy} · <span className="num">{fmtDateTime(row.repliedAt)}</span></p>
        </div>
      )}

      {row.status !== "closed" && (
        <div className="mt-3 space-y-2">
          {row.status === "open" && (
            <>
              <textarea dir="auto" rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to ${row.asker?.name || "them"} — sent by email and to their notifications`}
                className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-white/10" />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {row.status === "open" && (
              <button type="button" disabled={busy || !reply.trim()}
                onClick={() => run({ action: "reply", reply }, (r) => (r.emailed ? "Sent." : "Recorded and on their bell — the email did not go."))}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">Send reply</button>
            )}
            <button type="button" disabled={busy}
              onClick={() => { setTeaching((v) => !v); loadEntries(); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-white/10">
              {teaching ? "Cancel" : "Teach Nova…"}
            </button>
            {row.status === "open" && (
              <button type="button" disabled={busy}
                onClick={() => run({ action: "close" }, () => "Closed.")}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Close</button>
            )}
          </div>

          {teaching && (
            <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-white/15">
              <p className="text-xs text-slate-500">Which existing answer does this question mean? Nova will match this wording to it from now on.</p>
              <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search the help entries"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-1.5 text-sm dark:border-white/10" />
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {entries === null && <li className="text-xs text-slate-400">Loading…</li>}
                {matches.map((e) => (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                      <input type="radio" name={`teach-${row.id}`} checked={pick === e.id} onChange={() => setPick(e.id)} className="mt-1" />
                      <span>{e.q} <span className="text-xs text-slate-400">({e.id})</span></span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" disabled={busy || !pick}
                onClick={() => run({ action: "teach", entryId: pick }, () => { setTeaching(false); return "Taught. The next person asking this way gets that answer."; })}
                className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Link this wording</button>
            </div>
          )}
          {note && <p className="text-xs text-slate-500">{note}</p>}
        </div>
      )}
    </li>
  );
}
