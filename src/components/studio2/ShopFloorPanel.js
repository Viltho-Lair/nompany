"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { shopFloorDict } from "@/shared/studio/shopfloor";
import { useReload } from "@/components/studio2/useReload";

// THE SHOP-FLOOR TERMINAL — an operator at a station.
//
// MOBILE-SHAPED for the reason the field view is: this is tapped standing up,
// beside a machine, so the buttons are full-width and finger-sized rather than
// a toolbar that happens to wrap.
//
// A work order could be moved through its statuses and nothing recorded how
// long it took, and a production batch had no verdict at all — so a factory
// could trace a batch to a job and could not say whether the batch was any
// good. Both are recorded here because both are the same person's job.
export default function ShopFloorPanel({ slug, locale = "en" }) {
  const tr = shopFloorDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(null);
  const [verdict, setVerdict] = useState({ result: "pass", reason: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/manufacturing/shopfloor`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setProblem]);

  useReload(load);

  const send = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/manufacturing/shopfloor`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { orders = [], myRun = null, otherRuns = [], batches = [], awaitingCheck = [], canLog, canCheck } = data;
  const busyElsewhere = (id) => otherRuns.some((r) => r.workOrderId === id);

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

      {/* ONE OPEN RUN PER PERSON, which is why this sits above everything: the
          operator has to close it before they can start anything else, and the
          screen should not make them hunt for it. */}
      {myRun && (
        <div className="rounded-geex border border-brand-300 bg-brand-50 p-4 dark:border-brand-400/30 dark:bg-brand-500/10">
          <p className="text-sm font-600 text-slate-900 dark:text-white">
            {tr.running(orders.find((o) => o.id === myRun.workOrderId)?.title || myRun.workOrderId)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {tr.since(String(myRun.startedAt).slice(11, 16))}
          </p>
          <button
            className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => send({ action: "end" })}
          >
            {tr.clockOff}
          </button>
        </div>
      )}

      {/* ---- the orders ---------------------------------------------------- */}
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noOrders}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-700 text-slate-900 dark:text-white">{o.title}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{o.product}</span>
                {o.station && <span className="text-xs text-slate-400 dark:text-slate-500">{o.station}</span>}
                {/* CLOSED RUNS ONLY, with the open ones counted separately:
                    folding a guess for a run in progress into the total would
                    make the number move when nobody has done anything. */}
                <span className="num ms-auto text-xs text-slate-500 dark:text-slate-400">
                  {tr.effort(o.hours, o.runs)}{o.openRuns > 0 ? ` · ${tr.running2(o.openRuns)}` : ""}
                </span>
              </div>
              {canLog && !myRun && (
                <button
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
                  disabled={busy}
                  onClick={() => send({ action: "start", workOrderId: o.id, station: o.station })}
                >
                  {busyElsewhere(o.id) ? tr.joinRun : tr.clockOn}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- made and not releasable --------------------------------------- */}
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.quality}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.qualityLead}</p>

        {awaitingCheck.length > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tr.awaiting(awaitingCheck.length)}
          </p>
        )}

        {batches.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noBatches}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <span className="font-mono text-slate-900 dark:text-white">{b.reference}</span>
                <span className="text-slate-600 dark:text-slate-300">{b.product}</span>
                {/* NULL IS NOT A PASS. "Not checked" and "checked and fine" are
                    opposite facts about a batch about to be shipped. */}
                <span className={`ms-auto text-xs ${
                  !b.verdict ? "text-amber-600 dark:text-amber-300"
                    : b.verdict.result === "pass" ? "text-emerald-600 dark:text-emerald-300"
                      : b.verdict.result === "concession" ? "text-amber-600 dark:text-amber-300"
                        : "text-rose-600 dark:text-rose-300"}`}>
                  {b.verdict ? tr.result(b.verdict.result) : tr.notChecked}
                </span>
                {canCheck && (
                  <button
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                    onClick={() => { setChecking(b); setVerdict({ result: "pass", reason: "" }); }}
                  >
                    {tr.check}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {checking && (
        <div className="rounded-geex border border-brand-200 p-4 dark:border-brand-400/30">
          <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.checkFor(checking.reference)}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label={tr.resultLabel} as="select" className="w-full sm:w-44"
              value={verdict.result} onChange={(v) => setVerdict({ ...verdict, result: v })}
              options={["pass", "fail", "concession"].map((r) => ({ value: r, label: tr.result(r) }))} />
            {/* A FAIL THAT DOES NOT SAY WHY cannot be acted on, argued with, or
                counted; a concession needs one more, because accepting material
                that missed the spec is a decision somebody has to defend. */}
            <Field label={verdict.result === "concession" ? tr.conceded : tr.why}
              className="w-full sm:w-72" as={verdict.result === "pass" ? undefined : "textarea"}
              value={verdict.reason} onChange={(v) => setVerdict({ ...verdict, reason: v })} />
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy || (verdict.result !== "pass" && !verdict.reason.trim())}
              onClick={async () => {
                const done = await send({ action: "check", batchId: checking.id, ...verdict });
                if (done) setChecking(null);
              }}
            >
              {tr.record}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => { setChecking(null); setProblem(""); }}
            >
              {tr.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
