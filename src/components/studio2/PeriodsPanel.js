"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { periodsDict } from "@/shared/studio/periods";
import { useReload } from "@/components/studio2/useReload";

// A MONTH THAT IS FINISHED WITH.
//
// Every entry in this ledger has always been postable into any month, so a
// studio could report September, send the figures out, and then post a bill
// dated the 3rd of September in November — and the September it had reported
// would quietly stop being the September in the system.
//
// A CLOSE IS A LOCK, NOT A CHECKLIST. It does not require everything to be
// posted first: a studio that cannot close until everything is perfect never
// closes, and a lock that is never applied protects nothing. What the screen
// does is say what is still unposted, so the decision is made with the list in
// front of somebody.
export default function PeriodsPanel({ slug, locale = "en" }) {
  const tr = periodsDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState("");
  const [reopening, setReopening] = useState(null);

  const load = useCallback(async () => {
    const qs = chosen ? `?period=${encodeURIComponent(chosen)}` : "";
    const res = await fetch(`/api/studios/${slug}/finance/periods${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, chosen, setData, setProblem]);

  useReload(load);

  const send = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/periods`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { periods: rows = [], preview, canClose } = data;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      <ul className="space-y-1">
        {rows.map((p) => (
          <li key={p.period}
            className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              chosen === p.period
                ? "border-brand-300 dark:border-brand-400/40"
                : "border-slate-200 dark:border-white/10"}`}>
            <button className="font-mono text-slate-900 dark:text-white"
              onClick={() => setChosen(p.period === chosen ? "" : p.period)}>
              {p.period}
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-500">{tr.entries(p.entries)}</span>
            {p.closed && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {p.closedByAlias ? tr.closedBy(p.closedByAlias) : tr.closed}
              </span>
            )}
            {/* A REOPENED MONTH KEEPS ITS ROW and says so: deleting it would
                erase the fact that it was ever closed and reopened, which is
                precisely what an auditor wants to see. */}
            {p.reopened && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-600 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                title={p.reason}>
                {tr.reopened}
              </span>
            )}
            {canClose && (
              <span className="ms-auto flex gap-2">
                {p.closed ? (
                  <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                    onClick={() => setReopening({ period: p.period, reason: "" })}>
                    {tr.reopen}
                  </button>
                ) : (
                  <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white"
                    disabled={busy}
                    onClick={() => send({ action: "close", period: p.period })}>
                    {tr.close}
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* ---- what a close would lock -------------------------------------- */}
      {chosen && preview && (
        <div className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">
            {tr.wouldLock(chosen)}
          </h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tr.entriesIn(preview.entries)}</p>
          {/* THE LIST IS THE POINT. A close that only counted entries is a
              button; one that names what is dated in the month and not yet in
              the books is a decision. */}
          {preview.unposted.length > 0 ? (
            <>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {tr.notPosted(preview.unposted.length)}
              </p>
              <ul className="mt-1 space-y-0.5">
                {preview.unposted.map((u) => (
                  <li key={`${u.kind}-${u.id}`} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>{tr.kind(u.kind)}</span>
                    <span className="num">{u.date}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{tr.allPosted}</p>
          )}
        </div>
      )}

      {/* ---- reopening needs a reason ------------------------------------- */}
      {reopening && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-amber-200 p-4 dark:border-amber-400/30">
          <p className="w-full text-sm text-slate-600 dark:text-slate-300">{tr.reopenLead(reopening.period)}</p>
          <Field label={tr.reason} required className="w-full sm:w-80"
            value={reopening.reason} onChange={(v) => setReopening({ ...reopening, reason: v })} />
          <button
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !reopening.reason.trim()}
            onClick={async () => {
              const done = await send({ action: "reopen", ...reopening });
              if (done) setReopening(null);
            }}
          >
            {tr.reopen}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { setReopening(null); setProblem(""); }}
          >
            {tr.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
