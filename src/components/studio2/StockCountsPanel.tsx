"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useMemo, useState } from "react";
import { Field } from "@/components/fields/Field";
import { stockCountsDict } from "@/shared/studio/stockCounts";
import { useReload } from "@/components/studio2/useReload";
import { btn, btnGhost, btnRowDanger, fmtDate } from "@/components/studio2/ui";
import { countDifferences, countedLines } from "@/modules/inventory/stockCounts";
import type { CountLine } from "@/modules/inventory/stockCounts";
import type { Locale } from "@/shared/i18n";
import type { listCounts } from "@/modules/inventory/stockCountService";

type CountsBody = Exclude<Awaited<ReturnType<typeof listCounts>>, { error: string }>;
type CountRow = CountsBody["counts"][number];

// A COUNT OF THE SHELVES, POSTED AS ADJUSTMENTS.
//
// The difference shown beside each line is the one posting will write: the
// same pure function (`countDifferences`) runs here and on the server, against
// the same live book figure, so the screen never promises an adjustment the
// server would not make.
export default function StockCountsPanel({ slug, locale = "en" }: { slug: string; locale?: Locale }) {
  const tr = stockCountsDict(locale);
  const [data, setData] = useState<CountsBody | null>(null);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [openId, setOpenId] = useState("");
  // WHAT HAS BEEN TYPED INTO THE OPEN COUNT and not saved yet, by item. A
  // count is walked over hours, so typing never waits on the server.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory/counts`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.refusal(String(body.error || ""))); return; }
    setData(body);
  }, [slug, tr]);

  useReload(load);

  const send = useCallback(async (method: string, payload: Record<string, unknown>) => {
    setBusy(true); setProblem(""); setNotice("");
    const res = await fetch(`/api/studios/${slug}/inventory/counts`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.refusal(String(body.error || ""))); return null; }
    await load();
    return body as { count?: CountRow; results?: unknown[] };
  }, [slug, tr, load]);

  const open = useMemo(() => data?.counts.find((c) => c.id === openId) || null, [data, openId]);
  const byItem = useMemo(() => new Map((data?.items || []).map((i) => [i.id, i])), [data]);

  // THE LINES AS THEY STAND ON SCREEN: the saved count, with what has been
  // typed since laid over it.
  const lines: CountLine[] = useMemo(() => (open?.lines || []).map((l) => {
    if (!(l.itemId in typed)) return l;
    const raw = typed[l.itemId].trim();
    const n = Number(raw);
    return { itemId: l.itemId, counted: raw === "" || !Number.isFinite(n) || n < 0 ? "" : n };
  }), [open, typed]);
  const onHand = useMemo(() => Object.fromEntries((data?.items || []).map((i) => [i.id, i.onHand])), [data]);
  const differences = useMemo(() => countDifferences(lines, onHand), [lines, onHand]);
  const diffOf = useMemo(() => new Map(differences.map((d) => [d.itemId, d.difference])), [differences]);

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <ScreenSkeleton />;
  const { counts, canCount } = data;

  const save = async () => {
    if (!open) return;
    const done = await send("PUT", { id: open.id, lines: lines.map((l) => ({ itemId: l.itemId, counted: l.counted })) });
    if (done) { setTyped({}); setNotice(tr.saved); }
  };
  const post = async () => {
    if (!open) return;
    // SAVED FIRST, so what is posted is what is on screen — posting reads the
    // stored lines, never the browser's.
    const saved = await send("PUT", { id: open.id, lines: lines.map((l) => ({ itemId: l.itemId, counted: l.counted })) });
    if (!saved) return;
    setTyped({});
    if (!window.confirm(tr.postConfirm(differences.length))) return;
    const done = await send("PUT", { id: open.id, action: "post" });
    if (done && !(done.results || []).length) setNotice(tr.noDifferences);
  };

  const q = query.trim().toLowerCase();
  const shown = lines.filter((l) => {
    if (!q) return true;
    const i = byItem.get(l.itemId);
    return `${i?.name || ""} ${i?.sku || ""}`.toLowerCase().includes(q);
  });
  const num = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString();

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{tr.stocktakeNote}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>
      )}

      {canCount && !open && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={tr.notePlaceholder} value={note} onChange={setNote} className="min-w-[260px] flex-1" />
          <button type="button" className={btn} disabled={busy}
            onClick={async () => {
              const done = await send("POST", { note });
              if (done?.count) { setNote(""); setOpenId(done.count.id); }
            }}>{tr.newCount}</button>
        </div>
      )}

      {!open && (counts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-white/10">
          <p className="font-600 text-slate-700 dark:text-slate-200">{tr.noCounts}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noCountsBody}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
          {counts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white">
                  <span className="font-mono text-xs text-slate-500">{c.reference}</span>
                  <span className="ms-2 font-600">{tr.status(c.status)}</span>
                  {c.note && <span className="ms-2 text-slate-500 dark:text-slate-400">{c.note}</span>}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {c.status === "Posted" && c.postedAt
                    ? tr.postedBy(c.postedByAlias, fmtDate(c.postedAt))
                    : tr.startedBy(c.createdByAlias, fmtDate(c.createdAt))}
                  {" · "}{tr.progress(countedLines(c.lines || []), (c.lines || []).length)}
                </p>
              </div>
              <button type="button" className={btnGhost} onClick={() => { setTyped({}); setOpenId(c.id); }}>{tr.open}</button>
            </li>
          ))}
        </ul>
      ))}

      {open && (() => {
        const editable = canCount && open.status === "Counting";
        const results = new Map((open.results || []).map((r) => [r.itemId, r]));
        return (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-900 dark:text-white">
                <span className="font-mono text-xs text-slate-500">{open.reference}</span>
                <span className="ms-2 font-600">{tr.status(open.status)}</span>
                <span className="ms-2 text-xs text-slate-400">{tr.progress(countedLines(lines), lines.length)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {editable && <button type="button" className={btnGhost} disabled={busy} onClick={save}>{tr.save}</button>}
                {editable && (
                  <button type="button" className={btn} disabled={busy || !countedLines(lines)} onClick={post}>{tr.post}</button>
                )}
                {editable && (
                  <button type="button" className={btnRowDanger} disabled={busy}
                    onClick={async () => { if (await send("PUT", { id: open.id, action: "cancel" })) setOpenId(""); }}>
                    {tr.cancelCount}
                  </button>
                )}
                <button type="button" className={btnGhost} onClick={() => { setTyped({}); setOpenId(""); }}>{tr.close}</button>
              </div>
            </div>
            {editable && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.blankHint}</p>}
            <Field label={tr.search} type="search" value={query} onChange={setQuery} className="sm:max-w-xs" />
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-start text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 text-start font-600">{tr.colItem}</th>
                    <th className="px-3 py-2 text-end font-600">{tr.colBooks}</th>
                    <th className="px-3 py-2 text-end font-600">{tr.colCounted}</th>
                    <th className="px-3 py-2 text-end font-600">{tr.colDifference}</th>
                    {open.status === "Posted" && <th className="px-3 py-2 text-start font-600">{tr.colOutcome}</th>}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((l) => {
                    const item = byItem.get(l.itemId);
                    const posted = results.get(l.itemId);
                    // AFTER POSTING, the figures the adjustment was written from;
                    // before, the live ones posting would use.
                    const books = posted ? posted.onHand : Number(onHand[l.itemId]) || 0;
                    const diff = posted ? posted.difference : diffOf.get(l.itemId) || 0;
                    return (
                      <tr key={l.itemId} className="border-t border-slate-100 dark:border-white/5">
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                          {item?.name || l.itemId}
                          {item?.sku && <span className="ms-2 font-mono text-xs text-slate-400">{item.sku}</span>}
                        </td>
                        <td className="num px-3 py-2 text-end text-slate-600 dark:text-slate-300">{num(books)} {item?.unit || ""}</td>
                        <td className="px-3 py-1.5 text-end">
                          {editable ? (
                            <input type="number" min={0} step="any" inputMode="decimal" aria-label={`${tr.colCounted} — ${item?.name || ""}`}
                              value={l.itemId in typed ? typed[l.itemId] : l.counted === "" ? "" : String(l.counted)}
                              onChange={(e) => setTyped((t) => ({ ...t, [l.itemId]: e.target.value }))}
                              className="num w-24 rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-end dark:border-white/15" />
                          ) : (
                            <span className="num">{l.counted === "" ? "—" : num(l.counted)}</span>
                          )}
                        </td>
                        <td className={`num px-3 py-2 text-end font-600 ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-400"}`}>
                          {l.counted === "" ? "" : diff > 0 ? `+${num(diff)}` : num(diff)}
                        </td>
                        {open.status === "Posted" && (
                          <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{posted ? tr.outcome(posted.outcome) : ""}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
