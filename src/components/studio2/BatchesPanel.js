"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { batchesDict } from "@/shared/studio/batches";
import { useReload } from "@/components/studio2/useReload";

// WHICH UNITS, AND WHEN THEY STOP BEING USABLE.
//
// A studio holding sealant, adhesive, calibration gas, filters or anything
// certified could record how many it held and nothing about when they expire —
// so an expiry was discovered by picking the drum up, which is after it had
// been counted as stock, valued on a balance sheet and promised to a job.
//
// IT VALIDATES NOTHING ITSELF. `modules/inventory/batches` holds the rules and
// the server refuses on them; this shows what came back.
export default function BatchesPanel({ slug, locale = "en" }) {
  const tr = batchesDict(locale);
  const [data, setData] = useState(null);
  const [serials, setSerials] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ itemId: "", lot: "", expiresOn: "", receivedOn: "" });
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(async () => {
    const [reg, ser] = await Promise.all([
      fetch(`/api/studios/${slug}/inventory/batches`, { cache: "no-store" }),
      fetch(`/api/studios/${slug}/inventory/batches?serials=1`, { cache: "no-store" }),
    ]);
    const body = await reg.json().catch(() => ({}));
    if (!reg.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    if (ser.ok) setSerials(await ser.json().catch(() => null));
  }, [slug, setData, setSerials, setProblem]);

  useReload(load);

  const send = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/inventory/batches`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    // THE SERVER'S REASON, VERBATIM: `batchProblems` names which field and what
    // is wrong with it.
    if (!res.ok) { setProblem(body.detail || body.error || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { batches = [], alerts = [], untracked = [], items = [], canManage, asOf } = data;
  // The state a row is in decides its colour, and `empty` is deliberately not a
  // warning: a drum used up before it went out of date is nobody's problem.
  const tone = {
    expired: "text-rose-600 dark:text-rose-300",
    expiring: "text-amber-600 dark:text-amber-300",
    ok: "text-slate-500 dark:text-slate-400",
    "no-date": "text-slate-400 dark:text-slate-500",
    empty: "text-slate-400 dark:text-slate-500",
  };
  const stateWord = {
    expired: tr.expired, expiring: tr.expiring, ok: tr.inDate,
    "no-date": tr.noDate, empty: tr.usedUp,
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* WHAT TO ACT ON TODAY, above the register rather than inside it. An
          expiry nobody looks for is an expiry found by picking the drum up. */}
      {alerts.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
          <h3 className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">{tr.needsAttention}</h3>
          <ul className="mt-1 space-y-0.5">
            {alerts.map((b) => (
              <li key={b.id} className="flex justify-between text-sm text-amber-800 dark:text-amber-200">
                <span>{b.lot} · {b.itemLabel}</span>
                <span className="num">
                  {b.daysLeft < 0 ? tr.expiredDaysAgo(-b.daysLeft) : tr.daysLeft(b.daysLeft)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.registerItemsFirst}</p>
      ) : canManage && !adding && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white"
          onClick={() => { setAdding(true); setDraft({ itemId: items[0].id, lot: "", expiresOn: "", receivedOn: "" }); }}
        >
          {tr.addBatch}
        </button>
      )}

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <Field label={tr.item} as="select" required className="w-full sm:w-64"
            value={draft.itemId} onChange={(v) => setDraft({ ...draft, itemId: v })}
            options={items.map((i) => ({ value: i.id, label: i.label }))} />
          <Field label={tr.lot} required className="w-full sm:w-40"
            value={draft.lot} onChange={(v) => setDraft({ ...draft, lot: v })} />
          {/* BOTH DATES ARE OPTIONAL. Plenty of stock is batch-tracked for
              traceability and never expires; an invented expiry is worse than
              none, because everything downstream believes it. */}
          <Field label={tr.received} type="date" className="w-full sm:w-40"
            value={draft.receivedOn} onChange={(v) => setDraft({ ...draft, receivedOn: v })} />
          <Field label={tr.expires} type="date" className="w-full sm:w-40"
            value={draft.expiresOn} onChange={(v) => setDraft({ ...draft, expiresOn: v })} />
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !draft.lot.trim()}
            onClick={async () => { if (await send("POST", draft)) setAdding(false); }}
          >
            {tr.addBatch}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { setAdding(false); setProblem(""); }}
          >
            {tr.cancel}
          </button>
        </div>
      )}

      {/* ---- the register ------------------------------------------------ */}
      {batches.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noBatches}</p>
      ) : (
        <div className="space-y-1">
          {batches.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
              <span className="font-mono text-sm font-600 text-slate-900 dark:text-white">{b.lot}</span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{b.itemLabel}</span>
              <span className={`text-xs ${tone[b.state]}`}>
                {stateWord[b.state]}{b.expiresOn ? ` · ${b.expiresOn}` : ""}
              </span>
              <span className="num ms-auto text-sm text-slate-700 dark:text-slate-200">{b.qty}</span>
              {canManage && (
                <>
                  <button
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                    onClick={() => setAssigning({ to: b.id, from: "", itemId: b.itemId, qty: "" })}
                  >
                    {tr.assign}
                  </button>
                  <button
                    className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                    disabled={busy}
                    onClick={() => send("DELETE", { id: b.id })}
                  >
                    {tr.remove}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- assigning stock to a batch is the bin register's move ------- */}
      {assigning && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 p-4 dark:border-brand-400/30">
          <Field label={tr.from} as="select" className="w-full sm:w-44"
            value={assigning.from} onChange={(v) => setAssigning({ ...assigning, from: v })}
            options={[{ value: "", label: tr.untracked },
              ...batches.filter((b) => b.id !== assigning.to && b.itemId === assigning.itemId)
                .map((b) => ({ value: b.id, label: b.lot }))]} />
          <Field label={tr.quantity} type="number" className="w-full sm:w-28"
            value={assigning.qty} onChange={(v) => setAssigning({ ...assigning, qty: v })} />
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !(Number(assigning.qty) > 0)}
            onClick={async () => {
              const done = await send("POST", { action: "assign", ...assigning, qty: Number(assigning.qty) });
              if (done) setAssigning(null);
            }}
          >
            {tr.assign}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { setAssigning(null); setProblem(""); }}
          >
            {tr.cancel}
          </button>
        </div>
      )}

      {/* ---- stock carrying no batch ------------------------------------- */}
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.untracked}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.untrackedLead}</p>
        {untracked.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.everythingTracked}</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {untracked.map((u) => (
              <li key={u.itemId} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{u.itemLabel}</span>
                <span className="num">{u.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- serials, which are the same question from the other end ----- */}
      {serials?.items?.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.serials}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.serialsLead}</p>
          <div className="mt-2 space-y-2">
            {serials.items.map((i) => (
              <div key={i.id}>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span>{i.label}</span>
                  {/* THE LEDGER AND THE LIST DISAGREEING is worth saying out
                      loud: the gap is the number of units nobody can trace. */}
                  {i.gap !== 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-300">{tr.untraced(i.gap)}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {i.serials.map((s) => (
                    <span key={s.serial}
                      className={`rounded-lg px-2 py-0.5 font-mono text-xs ${
                        s.state === "allocated"
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                          : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                      }`}
                      title={s.state === "allocated" ? tr.allocated : tr.held}
                    >
                      {s.serial}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">{tr.asOf(asOf)}</p>
    </div>
  );
}
