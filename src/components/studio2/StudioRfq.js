// SUPPLIER QUOTES — asking several suppliers what it costs, and choosing one.
//
// THE GAP THIS CLOSES, named in `requisitions.md`: a requisition's `vendorId`
// records who the requester EXPECTS to buy from and binds nobody. Nothing in
// this product ever asked a supplier for a price, so purchasing was one
// person's estimate followed by one person's order.
//
// THE ONE THING THIS SCREEN MUST NEVER DO is put the lowest number at the top.
// A supplier who priced one line of five has the smallest total on the page and
// has not offered what was asked for; a supplier whose price lapsed last week
// is not holding it. `compareQuotes` ranks only complete, unexpired quotes and
// says so, and the ones it will not rank are shown anyway — marked, with their
// partial total and the reason it is not a bid.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "not-sent": return tr.refuseNotSent;
    case "not-draft": return tr.refuseNotDraft;
    case "no-lines": return tr.refuseNoLinesRfq;
    case "decided": return tr.refuseDecided;
    case "quote-incomplete": return tr.refuseQuoteIncomplete;
    case "quote-expired": return tr.refuseQuoteExpired;
    case "reason-required": return tr.refuseReasonRequired;
    case "not-awardable": return tr.refuseNotAwardable;
    default: return token;
  }
}

const emptyLine = () => ({ description: "", unit: "", qty: "", itemId: "" });

export default function StudioRfq({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [quoting, setQuoting] = useState(null);
  const [awarding, setAwarding] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/rfq`, { cache: "no-store" });
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
  // The request and the answers are separate collections and share one section
  // (`supplierRfqs`, `supplierQuotes` under `procurement-rfq`) — which is what
  // makes one watch enough for a screen that shows both.
  useLiveUpdates(slug, "procurement-rfq", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/procurement/rfq`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingRfqs} />;

  const { rfqs, canCreate, canEdit, canDelete, canAward } = data;

  const openForm = (row) => setForm(row
    ? { ...row, lines: [...(row.lines || []), emptyLine()] }
    : { title: "", dueBy: "", notes: "", vendorIds: "", lines: [emptyLine()] });

  const setLine = (i, patch) => setForm((f) => {
    const lines = f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    if (i === lines.length - 1 && String(patch.description ?? "").trim()) lines.push(emptyLine());
    return { ...f, lines };
  });

  const saveForm = async () => {
    const payload = {
      title: form.title,
      dueBy: form.dueBy || "",
      notes: form.notes || "",
      vendorIds: String(form.vendorIds || "").split(",").map((v) => v.trim()).filter(Boolean),
      lines: (form.lines || []).map((l) => ({
        id: l.id, description: l.description, unit: l.unit,
        qty: Number(l.qty) || 0, itemId: l.itemId || "",
      })),
    };
    const done = form.id
      ? await send("PUT", { ...payload, id: form.id })
      : await send("POST", payload);
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.rfqs}</h2>
          <p className={sub}>{tr.rfqsSub}</p>
        </div>
        {canCreate && (
          <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newRfq}</button>
        )}
      </div>

      {!rfqs.length ? (
        <Empty title={tr.noRfqs} body={tr.noRfqsBody} />
      ) : (
        <div className="space-y-3">
          {rfqs.map((r) => {
            const cmp = r.comparison || {};
            const awarded = (r.quotes || []).find((q) => q.id === r.awardedQuoteId);
            return (
              <section key={r.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</span>
                      <span className="ms-2 font-600">{r.title}</span>
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{tr.status(r.status)}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {tr.raisedBy}: {r.createdByAlias || r.createdByCollaboratorId || "—"}
                      {r.dueBy ? ` · ${tr.quotesDueBy} ${fmtDate(r.dueBy)}` : ""}
                      {(r.vendorIds || []).length ? ` · ${tr.suppliersAsked}: ${r.vendorIds.length}` : ""}
                    </p>
                    {awarded && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {tr.awardedTo(awarded.vendorId, r.awardedByAlias || r.awardedByCollaboratorId || "—")}
                        {r.awardReason ? ` — ${r.awardReason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && r.status === "Draft" && (
                      <>
                        <button type="button" className={btnRow} disabled={busy}
                          onClick={() => openForm(r)}>{tr.edit}</button>
                        <button type="button" className={btn} disabled={busy}
                          onClick={() => send("PUT", { id: r.id, action: "send" })}>{tr.sendRfq}</button>
                      </>
                    )}
                    {canEdit && r.status === "Sent" && (
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => setQuoting({
                          rfqId: r.id, vendorId: "", validUntil: "", leadWeeks: "",
                          receivedAt: "", notes: "",
                          lines: (r.lines || []).map((l) => ({ rfqLineId: l.id, description: l.description, unitPrice: "", leadWeeks: "" })),
                        })}>
                        {tr.recordQuote}
                      </button>
                    )}
                    {canEdit && (r.status === "Draft" || r.status === "Sent") && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => send("PUT", { id: r.id, action: "cancel" })}>{tr.cancelRfq}</button>
                    )}
                    {canDelete && r.status === "Draft" && (
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => send("DELETE", { id: r.id })}>{tr.remove}</button>
                    )}
                  </div>
                </div>

                {/* ---- the comparison ------------------------------------
                    SHOWN EVEN WHERE NOTHING CAN BE RANKED, with the reason.
                    An empty panel would read as "no quotes"; "nothing that
                    came back prices every line" is a different sentence and
                    sends somebody back to a supplier. */}
                {r.status !== "Draft" && (
                  <div className="mt-4">
                    <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {tr.comparison}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{tr.comparisonSub}</p>

                    {cmp.blocked === "no-quotes" ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.noQuotesYet}</p>
                    ) : (
                      <>
                        {cmp.blocked === "none-comparable" && (
                          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{tr.noneComparable}</p>
                        )}
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[560px] text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 text-start dark:border-white/5">
                                <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.quoteFrom}</th>
                                <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.estimatedValue}</th>
                                <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.quoteLeadWeeks}</th>
                                <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.quoteValidUntil}</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {(cmp.quotes || []).map((q) => {
                                const stored = (r.quotes || []).find((x) => x.id === q.id) || {};
                                return (
                                  <tr key={q.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                      {q.vendorId}
                                      {q.id === cmp.cheapestId && (
                                        <span className="ms-2 text-xs text-emerald-600 dark:text-emerald-400">{tr.cheapest}</span>
                                      )}
                                      {q.id === cmp.fastestId && (
                                        <span className="ms-2 text-xs text-sky-600 dark:text-sky-400">{tr.fastest}</span>
                                      )}
                                      {/* MARKED, NOT HIDDEN. A quote that cannot be
                                          ranked is still information about a supplier. */}
                                      {!q.complete && (
                                        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                                          {tr.partPriced(q.priced, (r.lines || []).length)} — {tr.partPricedHint}
                                        </span>
                                      )}
                                      {q.expired && (
                                        <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{tr.quoteExpired}</span>
                                      )}
                                    </td>
                                    <td className={`num px-4 py-3 text-end ${q.complete && !q.expired ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                                      {money(q.total)}
                                    </td>
                                    <td className="num px-4 py-3 text-end text-slate-600 dark:text-slate-300">
                                      {q.leadWeeks === null ? "—" : tr.weeks(q.leadWeeks)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                      {stored.validUntil ? fmtDate(stored.validUntil) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-end">
                                      {canAward && r.status === "Sent" && q.complete && !q.expired && (
                                        <button type="button" className={btn} disabled={busy}
                                          onClick={() => setAwarding({
                                            id: r.id, quoteId: q.id, vendorId: q.vendorId,
                                            reason: "",
                                            needsReason: Boolean(cmp.cheapestId) && q.id !== cmp.cheapestId,
                                          })}>
                                          {tr.award}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editRfq : tr.newRfq} onClose={() => setForm(null)} width="max-w-[820px]">
          <div className="space-y-4">
            <Field label={tr.rfqTitle} required value={form.title || ""}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.quotesDueBy} type="date" value={form.dueBy || ""}
                onChange={(v) => setForm((f) => ({ ...f, dueBy: v }))} />
              <Field label={tr.suppliersAsked} value={form.vendorIds || ""}
                onChange={(v) => setForm((f) => ({ ...f, vendorIds: v }))} />
            </div>
            <div>
              <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.lines}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-start dark:border-white/5">
                      <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineDescription}</th>
                      <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineUnit}</th>
                      <th className="px-2 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineQty}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.lines || []).map((l, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2">
                          <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                            aria-label={tr.lineDescription} value={l.description} maxLength={400}
                            onChange={(e) => setLine(i, { description: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                            aria-label={tr.lineUnit} value={l.unit} maxLength={40}
                            onChange={(e) => setLine(i, { unit: e.target.value })} />
                        </td>
                        <td className="px-2 py-2 text-end">
                          <input type="number" className="num w-24 rounded-lg border border-slate-200 px-2 py-1 text-end text-sm dark:border-white/10 dark:bg-transparent"
                            aria-label={tr.lineQty} value={l.qty}
                            onChange={(e) => setLine(i, { qty: e.target.value })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.title?.trim()}
                onClick={saveForm}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {quoting && (
        <Dialog title={tr.recordQuote} onClose={() => setQuoting(null)} width="max-w-[720px]">
          <div className="space-y-4">
            <Field label={tr.quoteFrom} required value={quoting.vendorId}
              onChange={(v) => setQuoting((f) => ({ ...f, vendorId: v }))} inputProps={{ maxLength: 60 }} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.quoteReceivedAt} type="date" value={quoting.receivedAt}
                onChange={(v) => setQuoting((f) => ({ ...f, receivedAt: v }))} />
              <Field label={tr.quoteValidUntil} type="date" value={quoting.validUntil}
                onChange={(v) => setQuoting((f) => ({ ...f, validUntil: v }))} />
              <Field label={tr.quoteLeadWeeks} type="number" value={quoting.leadWeeks}
                onChange={(v) => setQuoting((f) => ({ ...f, leadWeeks: v }))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-start dark:border-white/5">
                    <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineDescription}</th>
                    <th className="px-2 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineEstCost}</th>
                  </tr>
                </thead>
                <tbody>
                  {quoting.lines.map((l, i) => (
                    <tr key={l.rfqLineId} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-200">{l.description}</td>
                      <td className="px-2 py-2 text-end">
                        {/* LEFT BLANK WHERE THEY DID NOT PRICE IT. A blank is a
                            silence and nought is a price, and the comparison
                            ranks on exactly that distinction. */}
                        <input type="number" step="0.01"
                          className="num w-28 rounded-lg border border-slate-200 px-2 py-1 text-end text-sm dark:border-white/10 dark:bg-transparent"
                          aria-label={`${tr.lineEstCost} — ${l.description}`}
                          value={l.unitPrice}
                          onChange={(e) => setQuoting((f) => ({
                            ...f,
                            lines: f.lines.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)),
                          }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setQuoting(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !quoting.vendorId.trim()}
                onClick={async () => {
                  const done = await send("POST", {
                    quote: true,
                    rfqId: quoting.rfqId,
                    vendorId: quoting.vendorId,
                    validUntil: quoting.validUntil,
                    leadWeeks: quoting.leadWeeks,
                    receivedAt: quoting.receivedAt,
                    notes: quoting.notes,
                    lines: quoting.lines.map((l) => ({
                      rfqLineId: l.rfqLineId,
                      unitPrice: String(l.unitPrice ?? "").trim() === "" ? "" : Number(l.unitPrice),
                      leadWeeks: "",
                    })),
                  });
                  if (done) setQuoting(null);
                }}>
                {tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {awarding && (
        <Dialog title={`${tr.awardTo} ${awarding.vendorId}`} onClose={() => setAwarding(null)} width="max-w-[520px]">
          <div className="space-y-4">
            {/* ASKED FOR ONLY WHERE THE CHOICE NEEDS ONE. Awarding the cheapest
                comparable quote explains itself; anything else is the decision
                somebody will ask about in six months, so it says why now. */}
            {awarding.needsReason && (
              <p className="text-sm text-amber-700 dark:text-amber-300">{tr.awardReasonRequired}</p>
            )}
            <Field label={tr.awardReason} as="textarea" value={awarding.reason}
              onChange={(v) => setAwarding((f) => ({ ...f, reason: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAwarding(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || (awarding.needsReason && !awarding.reason.trim())}
                onClick={async () => {
                  const done = await send("PUT", {
                    id: awarding.id, action: "award",
                    quoteId: awarding.quoteId, reason: awarding.reason,
                  });
                  if (done) setAwarding(null);
                }}>
                {tr.award}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
