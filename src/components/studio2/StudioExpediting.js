// EXPEDITING — what is late, by how long, and who has already been chased.
//
// THE GAP THIS CLOSES. A purchase order has carried `expectedAt` since it was
// built and nothing has ever compared it to today. An order three weeks late
// looked exactly like one placed this morning, so "what is overdue" was a
// question a studio answered by opening every order in turn.
//
// THE NUMBER THIS SCREEN EXISTS TO MAKE ZERO is `unchased` — late and never
// rung about. Everything else here is the supplier's problem; that one is the
// studio's, which is why it is a tile of its own rather than a column.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, Dialog, StatTile, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "not-outstanding": return tr.refuseNotOutstanding;
    case "empty": return tr.refuseEmptyChase;
    case "no-inventory": return tr.refuseNoInventory;
    default: return token;
  }
}

export default function StudioExpediting({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chasing, setChasing] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/expediting`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  const send = useCallback(async (payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/procurement/expediting`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingExpediting} />;

  const { view, chaseLog = {}, chasers = {}, canChase } = data;
  const orders = view?.orders || [];

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <h2 className={h2}>{tr.expediting}</h2>
        <p className={sub}>{tr.expeditingSub}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className={panel}>
          <StatTile label={tr.lateCount} value={<span className="num">{view.late}</span>}
            tone={view.late > 0 ? "text-rose-600 dark:text-rose-300" : ""} />
        </div>
        <div className={panel}>
          <StatTile label={tr.dueSoonCount} value={<span className="num">{view.dueSoon}</span>}
            accent="rgb(var(--chart-2))" />
        </div>
        <div className={panel}>
          {/* NOBODY PROMISED ANYTHING is a different problem from a promise
              being kept, so it gets its own figure rather than hiding in the
              healthy column. */}
          <StatTile label={tr.undatedCount} value={<span className="num">{view.undated}</span>}
            tone={view.undated > 0 ? "text-amber-700 dark:text-amber-300" : ""} />
        </div>
        <div className={panel}>
          {/* THE STUDIO'S OWN FAILURE rather than a supplier's, which is why it
              is a tile and not a column. */}
          <StatTile label={tr.unchasedCount} value={<span className="num">{view.unchased}</span>}
            sub={tr.unchasedHint}
            tone={view.unchased > 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-400"}
            accent="rgb(var(--chart-3))" />
        </div>
      </div>

      {!orders.length ? (
        <Empty title={tr.nothingOutstanding} body={tr.nothingOutstandingBody} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const log = chaseLog[o.id] || [];
            const pct = o.outstandingFraction === null
              ? null
              : Math.round(o.outstandingFraction * 100);
            return (
              <section key={o.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{o.reference}</span>
                      <span className="ms-2">{tr.supplier}: {o.vendorId || "—"}</span>
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{o.status}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {/* WHAT IT IS DUE AGAINST NOW, and — where it moved — what
                          was promised originally. Showing only the current date
                          would hide the slip, which is the whole record. */}
                      {o.dueAt ? `${tr.dueNow}: ${fmtDate(o.dueAt)}` : tr.noDatePromised}
                      {o.slippedDays !== null && o.expectedAt ? (
                        <span className="ms-2 text-amber-700 dark:text-amber-300">
                          {tr.originallyDue} {fmtDate(o.expectedAt)} · {tr.slippedBy(o.slippedDays)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {o.chases === 0 ? tr.neverChased : `${tr.chasedTimes(o.chases)} · ${tr.lastChased} ${fmtDate(o.lastChasedAt)}`}
                      {/* PARTLY DELIVERED AND LATE is a conversation about the
                          remainder; untouched and late is a conversation about
                          whether it is coming at all. */}
                      {o.partly && pct !== null ? ` · ${tr.partlyReceived(pct)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`num text-sm ${o.bucket === "late" ? "text-rose-600 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}`}>
                      {o.lateDays === null
                        ? "—"
                        : o.lateDays > 0
                          ? tr.daysLate(o.lateDays)
                          : tr.daysUntil(-o.lateDays)}
                    </span>
                    {canChase && (
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => setChasing({ orderId: o.id, reference: o.reference, note: "", promisedAt: "" })}>
                        {tr.chase}
                      </button>
                    )}
                  </div>
                </div>

                {log.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.chaseHistory}</p>
                    <ul className="mt-2 space-y-1">
                      {log.map((c, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-300">
                          {fmtDate(c.at)} · {chasers[c.byCollaboratorId] || c.byCollaboratorId || "—"}
                          {c.note ? ` — ${c.note}` : ""}
                          {c.promisedAt ? ` (${tr.newPromisedDate}: ${fmtDate(c.promisedAt)})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {chasing && (
        <Dialog title={`${tr.chase} — ${chasing.reference}`} onClose={() => setChasing(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <div>
              <Field label={tr.chaseNote} as="textarea" value={chasing.note}
                onChange={(v) => setChasing((f) => ({ ...f, note: v }))} inputProps={{ maxLength: 1000 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.chaseNoteHint}</p>
            </div>
            <div>
              <Field label={tr.newPromisedDate} type="date" value={chasing.promisedAt}
                onChange={(v) => setChasing((f) => ({ ...f, promisedAt: v }))} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.newPromisedDateHint}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setChasing(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || (!chasing.note.trim() && !chasing.promisedAt)}
                onClick={async () => {
                  const done = await send({
                    orderId: chasing.orderId, note: chasing.note, promisedAt: chasing.promisedAt,
                  });
                  if (done) setChasing(null);
                }}>
                {tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
