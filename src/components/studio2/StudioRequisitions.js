// PURCHASE REQUISITIONS — what somebody needs, and who said yes.
//
// THE GAP THIS SCREEN CLOSES. A purchase order appears in this product with
// nobody having asked for it: the order records a vendor, lines and a cost code
// and nothing about who needed the goods or who authorised the money. So the
// only control over what a studio bought was who held the right to raise an
// order — a right that cannot express a limit.
//
// THE ONE THING THIS SCREEN MUST NEVER DO is call the total of a part-estimated
// request its value. `requisitionTotals` returns `complete`, and it travels with
// every total; an unestimated line shows a dash rather than 0.00, because
// nought is a price and that line has none. The same rule the BOQ grid follows,
// for the same reason: a signature given against a provisional figure
// authorises a number that is going to change.
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
    case "not-draft": return tr.refuseNotDraft;
    case "no-lines": return tr.refuseNoLines;
    case "decided": return tr.refuseDecided;
    case "not-submitted": return tr.refuseNotSubmitted;
    case "same-signer": return tr.refuseSameSigner;
    case "already-approved": return tr.refuseAlreadyApproved;
    case "not-approved":
    case "requisition-not-approved": return tr.refuseNotApproved;
    case "no-studio-currency": return tr.refuseNoStudioCurrency;
    case "requisition-no-items": return tr.refuseNoItems;
    case "requisition-ordered": return tr.refuseAlreadyOrdered;
    case "not-answerable": return tr.refuseNotAnswerable;
    default: return token;
  }
}

const emptyLine = () => ({ description: "", unit: "", qty: "", estUnitCost: "", itemId: "" });

export default function StudioRequisitions({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/requisitions`, { cache: "no-store" });
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
  // The requests are this section's own rows. `Ordered` is not: it is DERIVED
  // from a purchase order naming the request, and an order is written under
  // Inventory's Project sheets — so a colleague converting a request has to move
  // this list, and only the second watch can tell it.
  useLiveUpdates(slug, "procurement-requisitions", reload);
  useLiveUpdates(slug, "inventory-sheets", reload);

  const send = useCallback(async (method, payload, path = "procurement/requisitions") => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingRequisitions} />;

  const { requisitions, canCreate, canEdit, canDelete, canOrder } = data;

  const openForm = (row) => setForm(row
    ? { ...row, lines: [...(row.lines || []), emptyLine()] }
    : {
      title: "", justification: "", neededBy: "", projectId: "", vendorId: "",
      notes: "", lines: [emptyLine()],
    });

  const saveForm = async () => {
    const payload = {
      title: form.title,
      justification: form.justification,
      neededBy: form.neededBy || "",
      projectId: form.projectId || "",
      vendorId: form.vendorId || "",
      notes: form.notes || "",
      lines: (form.lines || []).map((l) => ({
        description: l.description,
        unit: l.unit,
        qty: Number(l.qty) || 0,
        // SENT AS A BLANK WHERE IT IS BLANK, never coerced to 0 on the way out:
        // the server distinguishes "expected to cost nothing" from "nobody has
        // said", and a screen that sent 0 for both would make every request
        // look fully estimated.
        estUnitCost: String(l.estUnitCost ?? "").trim() === "" ? "" : Number(l.estUnitCost),
        itemId: l.itemId || "",
      })),
    };
    const done = form.id
      ? await send("PUT", { ...payload, id: form.id })
      : await send("POST", payload);
    if (done) setForm(null);
  };

  const setLine = (i, patch) => setForm((f) => {
    const lines = f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    // The grid always keeps one empty row at the bottom, so adding a line is
    // typing rather than clicking. A line with no description is dropped on
    // save rather than refused.
    if (i === lines.length - 1 && String(patch.description ?? "").trim()) lines.push(emptyLine());
    return { ...f, lines };
  });

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.requisitions}</h2>
          <p className={sub}>{tr.requisitionsSub}</p>
        </div>
        {canCreate && (
          <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newRequisition}</button>
        )}
      </div>

      {!requisitions.length ? (
        <Empty title={tr.noRequisitions} body={tr.noRequisitionsBody} />
      ) : (
        <div className="space-y-3">
          {requisitions.map((r) => {
            const rv = r.review || {};
            return (
              <section key={r.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</span>
                      <span className="ms-2 font-600">{r.title}</span>
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                        {tr.status(r.status)}
                      </span>
                    </p>
                    {r.justification && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.justification}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {/* THE NAME, FALLING BACK TO THE ID rather than to a
                          dash: a collaborator who has since been removed still
                          raised this, and an id is a worse answer than a name
                          but a far better one than nothing. */}
                      {tr.raisedBy}: {r.createdByAlias || r.createdByCollaboratorId || "—"}
                      {r.neededBy ? ` · ${tr.neededBy} ${fmtDate(r.neededBy)}` : ""}
                      {r.ordered ? ` · ${tr.orderedAs} ${r.orderReference}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    {/* A DASH, NOT 0.00, while any line is unestimated. */}
                    <p className="num text-slate-900 dark:text-white">
                      {r.totals?.complete ? money(r.totals.estimated) : "—"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.totals?.complete
                        ? tr.estimatedValue
                        : tr.partEstimated}
                    </p>
                    {rv.required > 0 && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {tr.awaitingSignatures(rv.signed || 0, rv.required)}
                      </p>
                    )}
                  </div>
                </div>

                {!r.totals?.complete && r.status === "Draft" && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{tr.partEstimatedHint}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {canEdit && r.status === "Draft" && (
                    <>
                      <button type="button" className={btnRow} disabled={busy}
                        onClick={() => openForm(r)}>{tr.edit}</button>
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => send("PUT", { id: r.id, action: "submit" })}>
                        {tr.submit}
                      </button>
                    </>
                  )}
                  {canEdit && (r.status === "Draft" || r.status === "Submitted" || r.status === "Approved") && (
                    <button type="button" className={btnGhost} disabled={busy}
                      onClick={() => send("PUT", { id: r.id, action: "cancel" })}>
                      {tr.cancelRequest}
                    </button>
                  )}
                  {/* OFFERED ONLY WHERE THE SERVER WOULD ACCEPT IT. `review.next`
                      is the step THIS reader could sign — it already accounts
                      for having raised the request and for having signed an
                      earlier step. */}
                  {rv.next && (
                    <>
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => send("PUT", { id: r.id, action: "approve" })}>
                        {tr.approve}
                      </button>
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => setRejecting({ id: r.id, reason: "" })}>
                        {tr.reject}
                      </button>
                    </>
                  )}
                  {canOrder && r.status === "Approved" && !r.ordered && (
                    <button type="button" className={btn} disabled={busy}
                      onClick={() => send("POST", {
                        requisitionId: r.id, vendorId: r.vendorId, projectId: r.projectId,
                      }, "inventory/orders")}>
                      {tr.createOrder}
                    </button>
                  )}
                  {canDelete && r.status === "Draft" && (
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("DELETE", { id: r.id })}>{tr.remove}</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Dialog
          title={form.id ? tr.editRequisition : tr.newRequisition}
          onClose={() => setForm(null)}
          width="max-w-[820px]"
        >
          <div className="space-y-4">
            <Field label={tr.title} required value={form.title || ""}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <div>
              <Field label={tr.justification} as="textarea" value={form.justification || ""}
                onChange={(v) => setForm((f) => ({ ...f, justification: v }))}
                inputProps={{ maxLength: 4000 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.justificationHint}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.neededBy} type="date" value={form.neededBy || ""}
                onChange={(v) => setForm((f) => ({ ...f, neededBy: v }))} />
              <Field label={tr.expectedSupplier} value={form.vendorId || ""}
                onChange={(v) => setForm((f) => ({ ...f, vendorId: v }))} inputProps={{ maxLength: 60 }} />
            </div>

            <div>
              <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.lines}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-start dark:border-white/5">
                      <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineDescription}</th>
                      <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineUnit}</th>
                      <th className="px-2 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineQty}</th>
                      <th className="px-2 py-2 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineEstCost}</th>
                      <th className="px-2 py-2 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.lineItem}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.lines || []).map((l, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2">
                          <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                            value={l.description} maxLength={400} aria-label={tr.lineDescription}
                            onChange={(e) => setLine(i, { description: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                            value={l.unit} maxLength={40} aria-label={tr.lineUnit}
                            onChange={(e) => setLine(i, { unit: e.target.value })} />
                        </td>
                        <td className="px-2 py-2 text-end">
                          <input type="number" className="num w-24 rounded-lg border border-slate-200 px-2 py-1 text-end text-sm dark:border-white/10 dark:bg-transparent"
                            value={l.qty} aria-label={tr.lineQty}
                            onChange={(e) => setLine(i, { qty: e.target.value })} />
                        </td>
                        <td className="px-2 py-2 text-end">
                          <input type="number" step="0.01" className="num w-28 rounded-lg border border-slate-200 px-2 py-1 text-end text-sm dark:border-white/10 dark:bg-transparent"
                            value={l.estUnitCost} aria-label={tr.lineEstCost}
                            onChange={(e) => setLine(i, { estUnitCost: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                            value={l.itemId} maxLength={60} aria-label={tr.lineItem}
                            onChange={(e) => setLine(i, { itemId: e.target.value })} />
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

      {rejecting && (
        <Dialog title={tr.reject} onClose={() => setRejecting(null)} width="max-w-[520px]">
          <div className="space-y-4">
            {/* A REFUSAL WITH NO REASON TEACHES THE REQUESTER NOTHING, which is
                why the field is here even though the server accepts a blank. */}
            <Field label={tr.rejectReason} as="textarea" value={rejecting.reason}
              onChange={(v) => setRejecting((f) => ({ ...f, reason: v }))}
              inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setRejecting(null)}>{tr.cancel}</button>
              <button type="button" className={btnRowDanger} disabled={busy}
                onClick={async () => {
                  const done = await send("PUT", {
                    id: rejecting.id, action: "reject", reason: rejecting.reason,
                  });
                  if (done) setRejecting(null);
                }}>
                {tr.reject}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
