// RECEIVING — the goods received register and the three-way match.
//
// THREE LEGS ON EVERY ROW: what was ordered, what turned up, and what the
// supplier is charging for it. The middle one is the reason this screen exists
// — until goods received notes were written, receiving incremented a running
// total and the studio had no record of the events that produced it.
//
// THE INVOICE LEG MAY BE WITHHELD. A reader without `finance.payables.view`
// gets `canSeeBills: false` and the column says so, rather than drawing a blank
// that would read as "nothing invoiced" — which is a fact, and a different one.
//
// ORDERS WHOSE LEGS DISAGREE SORT FIRST. That ordering is the server's, not
// this screen's, so a second copy of "what needs looking at" cannot drift from
// the first.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, Dialog, microLabel, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "over-receive": return tr.refuseOverReceive;
    case "over-correct": return tr.refuseOverCorrect;
    case "nothing": return tr.refuseNothing;
    case "negative": return tr.refuseNegative;
    case "correction-positive": return tr.refuseCorrectionPositive;
    case "correction-target": return tr.refuseCorrectionTarget;
    case "not-ordered": return tr.refuseNotOrdered;
    default: return token;
  }
}

function flagLabel(tr, flag) {
  switch (flag) {
    case "over-billed": return tr.flagOverBilled;
    case "billed-not-received": return tr.flagBilledNotReceived;
    case "over-received": return tr.flagOverReceived;
    case "received-not-billed": return tr.flagReceivedNotBilled;
    case "part-delivered": return tr.flagPartDelivered;
    // `no-bill` is not a fault and gets no sentence — goods arrive before the
    // invoice does, every time. The Billed column already says so.
    default: return "";
  }
}

/** A flag that costs money, as opposed to one that only reports progress. */
const SERIOUS = new Set(["over-billed", "billed-not-received", "over-received"]);

/** NULL IS NOT NOUGHT. A withheld or absent figure is a dash, never a zero. */
function Figure({ value, fallback }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">{fallback || "—"}</span>;
  }
  return <span className="num">{money(value)}</span>;
}

export default function StudioReceiving({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/receiving`, { cache: "no-store" });
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
  // THE SCREEN IS IN PROCUREMENT AND ITS RECORDS ARE NOT. Goods receipts sit with
  // the orders they answer — both under `inventory-sheets`, deliberately, so a
  // receipt is not stranded the day `procurement-receiving` is planted — and the
  // third leg of the match is Payables' bills.
  useLiveUpdates(slug, "inventory-sheets", reload);
  useLiveUpdates(slug, "finance-payables", reload);

  // BOOKING IN GOES TO INVENTORY'S OWN ENDPOINT, because `receiveOrder` is the
  // one door that moves stock, updates the order line and writes the note
  // together. A receive route of Procurement's own would be a second path onto
  // the same three writes.
  const bookIn = useCallback(async (payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/inventory/orders`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingReceiving} />;

  const { orders, canSeeBills, canReceive, needsAttention } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <h2 className={h2}>{tr.receiving}</h2>
        <p className={sub}>{tr.receivingSub}</p>
      </div>

      {/* THE GREEN LINE SAYS NOTHING NEEDS LOOKING AT, and deliberately not
          that everything agrees. An order placed this morning with nothing
          delivered and nothing invoiced has no problems and no agreement
          either; the first wording claimed the second, which on a fresh
          register is a reassurance about facts that do not exist yet. Seen on
          the screen with one just-placed order. */}
      {orders.length > 0 && (
        needsAttention > 0 ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tr.needsAttention(needsAttention)}
          </p>
        ) : (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
            {tr.allMatched}
          </p>
        )
      )}

      {!orders.length ? (
        <Empty title={tr.noReceiving} body={tr.noReceivingBody} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const m = o.match || {};
            const serious = (m.flags || []).some((f) => SERIOUS.has(f));
            return (
              <section key={o.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{o.reference}</span>
                      <span className="ms-2 font-600">{o.vendorName || o.vendorId}</span>
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{o.status}</span>
                      {m.matched && (
                        <span className="ms-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {tr.matchedLabel}
                        </span>
                      )}
                    </p>
                    {o.expectedAt && (
                      <p className="mt-1 text-xs text-slate-400">{fmtDate(o.expectedAt)}</p>
                    )}
                  </div>
                  {canReceive && (
                    <button type="button" className={btn} disabled={busy}
                      onClick={() => setBooking({
                        order: o,
                        supplierRef: "",
                        receivedAt: "",
                        notes: "",
                        lines: (m.lines || []).map((l) => ({
                          itemId: l.itemId,
                          description: l.description,
                          outstandingQty: l.outstandingQty,
                          qty: "",
                          rejected: "",
                        })),
                      })}>{tr.bookIn}</button>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className={microLabel}>{tr.orderedLeg}</p>
                    <p className="num text-base font-700 text-slate-900 dark:text-white">
                      {money(m.orderedValue)}
                    </p>
                  </div>
                  <div>
                    <p className={microLabel}>{tr.receivedLeg}</p>
                    <p className="num text-base font-700 text-slate-900 dark:text-white">
                      {money(m.receivedValue)}
                    </p>
                    {m.rejectedQty > 0 && (
                      <p className="text-xs text-rose-600 dark:text-rose-300">{tr.rejectedCount(m.rejectedQty)}</p>
                    )}
                  </div>
                  <div>
                    <p className={microLabel}>{tr.billedLeg}</p>
                    <p className="text-base font-700 text-slate-900 dark:text-white">
                      {/* WITHHELD AND ABSENT ARE DIFFERENT, and the fallback says
                          which: a reader without the payables right is told the
                          figure is not shown, not that nothing was invoiced. */}
                      <Figure value={m.billedValue}
                        fallback={canSeeBills ? tr.awaitingBill : tr.billedWithheld} />
                    </p>
                  </div>
                  <div>
                    <p className={microLabel}>{tr.varianceLabel}</p>
                    <p className={`text-base font-700 ${
                      m.variance > 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"
                    }`}>
                      <Figure value={m.variance} />
                    </p>
                  </div>
                </div>

                {(m.flags || []).filter((f) => flagLabel(tr, f)).length > 0 && (
                  <ul className={`mt-3 space-y-1 text-xs ${serious ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>
                    {m.flags.filter((f) => flagLabel(tr, f)).map((f) => (
                      <li key={f}>{flagLabel(tr, f)}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                  <p className={microLabel}>{tr.receiptsHeading}</p>
                  {!(o.receipts || []).length ? (
                    <p className="text-xs text-slate-400">{tr.noReceiptsYet}</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {o.receipts.map((r) => (
                        <li key={r.id} className="flex flex-wrap gap-x-2 text-slate-500 dark:text-slate-400">
                          <span className="font-mono text-slate-600 dark:text-slate-300">{r.reference}</span>
                          <span>{fmtDate(r.receivedAt)}</span>
                          {r.supplierRef && <span>· {r.supplierRef}</span>}
                          {r.receivedByAlias && <span>· {r.receivedByAlias}</span>}
                          {r.correctionOf && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-600 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                              {tr.correctionBadge}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {booking && (
        <Dialog title={tr.bookInFor(booking.order.reference)} onClose={() => setBooking(null)}>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={tr.supplierRefLabel} value={booking.supplierRef}
                onChange={(v) => setBooking({ ...booking, supplierRef: v })} />
              <Field type="date" label={tr.arrivedOn} value={booking.receivedAt}
                hint={tr.arrivedOnHint}
                onChange={(v) => setBooking({ ...booking, receivedAt: v })} />
            </div>

            {booking.lines.map((l, i) => {
              // ONE SETTER, not a copy of the same splice per column.
              const set = (field) => (v) => {
                const next = booking.lines.slice();
                next[i] = { ...l, [field]: v };
                setBooking({ ...booking, lines: next });
              };
              return (
                <div key={l.itemId} className="grid gap-2 sm:grid-cols-3">
                  <p className="self-center text-sm text-slate-700 dark:text-slate-200">
                    {l.description || l.itemId}
                    {/* WHAT IS STILL DUE, from the server's own arithmetic, so
                        the screen offers exactly what the server will accept. */}
                    <span className="ms-2 text-xs text-slate-400">
                      {tr.outstandingQty}: <span className="num">{l.outstandingQty}</span>
                    </span>
                  </p>
                  <Field type="number" label={tr.acceptedQty} value={l.qty} onChange={set("qty")} />
                  <Field type="number" label={tr.rejectedQty} value={l.rejected} onChange={set("rejected")} />
                </div>
              );
            })}

            <Field as="textarea" label={tr.receiptNotes} value={booking.notes}
              onChange={(v) => setBooking({ ...booking, notes: v })} />

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setBooking(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await bookIn({
                    id: booking.order.id,
                    supplierRef: booking.supplierRef,
                    receivedAt: booking.receivedAt,
                    notes: booking.notes,
                    // `receive` IS the line list, which is what the route keys
                    // on to choose receiving over editing.
                    receive: booking.lines
                      .filter((l) => Number(l.qty) || Number(l.rejected))
                      .map((l) => ({ itemId: l.itemId, qty: l.qty, rejected: l.rejected })),
                  });
                  if (done) setBooking(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
