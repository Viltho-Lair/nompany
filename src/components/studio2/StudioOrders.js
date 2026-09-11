// THE SALES ORDER REGISTER — what a customer actually asked for.
//
// WHY THE RECORD EXISTS, because the register only makes sense with it. A
// quotation holds lines and a contract holds a value, so an order raised from
// an accepted quotation looked covered by the two of them. A CALL-OFF AGAINST A
// FRAMEWORK CONTRACT is not: there is no new quotation, the contract's value
// does not move, and before this the only place to put one was a new project —
// which is a job, not an order.
//
// THE RULES ARE IN `modules/sales/orderStatus`, WHICH IS PURE, and this screen
// imports it rather than restating it. Every move offered below comes from
// `movesFrom`, and the server refuses through the same table — so a button that
// appears is a button the route accepts. Two copies of "a confirmed order
// cannot go back to draft" would be two copies free to disagree.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesOrdersDict } from "@/shared/studio/salesOrders";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
// `money` and `fmtDate` come from ui.js rather than being written here: Gate A
// refuses a raw toLocaleString in a studio screen, and a per-screen formatter is
// how two screens end up disagreeing about what a number looks like.
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, th, fmtDate, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { StatusPill } from "@/components/studio2/StatusPill";
import { movesFrom, orderDeletable, orderLinesEditable } from "@/modules/sales/orderStatus";

const BLANK_LINE = { description: "", qty: 1, unitPrice: 0 };

/** A refusal name becomes a sentence here, in whichever language is being read. */
function refusal(tr, token) {
  switch (token) {
    case "no-lines": return tr.refuseNoLines;
    case "not-allowed": return tr.refuseNotAllowed;
    case "status": return tr.refuseStatus;
    case "read-only": return tr.refuseReadOnly;
    case "wrong-state": return tr.refuseWrongState;
    case "deal": return tr.refuseDeal;
    default: return token;
  }
}

export default function StudioOrders({ slug }) {
  const tr = salesOrdersDict(useStudioLocale());
  const [orders, setOrders] = useState(null);
  const [rights, setRights] = useState({});
  const [pickers, setPickers] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  // WHETHER ORDERS CARRY TAX, and what a new one starts at — the studio's rate
  // (shared/vat). A studio with none gets no VAT field at all.
  const [vat, setVat] = useState({ on: false, rate: 0 });

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/orders`);
    return res.ok ? res.json() : { ok: false };
  }, [slug]);

  const apply = useCallback((data) => {
    setOrders(data?.ok ? data.orders : []);
    setPickers(data?.pickers || {});
    setVat({ on: !!data?.vatEnabled, rate: Number(data?.defaultVatRate) || 0 });
    setRights({
      canCreate: !!data?.canCreate, canEdit: !!data?.canEdit, canDelete: !!data?.canDelete,
    });
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const data = await read();
      if (current) apply(data);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  // THE SECTION THE ROWS ARE WRITTEN UNDER, which is not the section this screen
  // is reached through: orders live with the quotations (keys.ts), so that is the
  // key a change event carries. Watching `crm-sales-orders` would compile,
  // render, and silently never fire.
  useLiveUpdates(slug, "crm-sales-quotations", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/sales/orders`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data?.ok) { setError(refusal(tr, data?.error || "")); return false; }
    await reload();
    return true;
  }, [slug, tr, reload]);

  const totals = useMemo(() => {
    const lines = form?.lines || [];
    const subtotal = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);
    const vat = subtotal * (Number(form?.vatRate || 0) / 100);
    return { subtotal, vat, total: subtotal + vat };
  }, [form]);

  if (orders === null) return <ScreenSkeleton />;

  const editable = !form?.id || orderLinesEditable(form?.status);

  // THE FOUR LINKS, PICKED. Deal, customer, quotation and contract were internal
  // ids typed into text boxes — the deal one required, and a deal's id is shown
  // on no screen. They are set when the order is raised and never after
  // (`updateOrder` writes none of them), so an edit shows them and cannot move
  // them. Each list narrows to the one before it: a deal's own customer, that
  // deal's quotations, that customer's contracts.
  const deal = (pickers.deals || []).find((d) => d.id === form?.dealId);
  const linkOptions = {
    deals: (pickers.deals || []).map((d) => ({
      value: d.id, label: [d.ref, d.title, d.clientName].filter(Boolean).join(" · "),
    })),
    clients: (pickers.clients || []).map((c) => ({ value: c.id, label: c.name })),
    quotations: (pickers.quotations || [])
      .filter((q) => form?.id || !deal || q.ticketId === deal.ticketId)
      .map((q) => ({ value: q.id, label: q.revision > 1 ? `${q.number} Rev ${q.revision}` : q.number })),
    contracts: (pickers.contracts || [])
      .filter((c) => form?.id || !form?.clientId || c.clientId === form.clientId)
      .map((c) => ({ value: c.id, label: [c.number, c.title].filter(Boolean).join(" · ") })),
  };

  return (
    <div className={panel}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={h2}>{tr.title}</h2>
          <p className={sub}>{tr.lead}</p>
        </div>
        {rights.canCreate && (
          <button type="button" className={btn}
            onClick={() => setForm({ lines: [{ ...BLANK_LINE }], vatRate: vat.rate, status: "Draft" })}>
            {tr.newOrder}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--geex-danger)]">{error}</p>}

      {!orders.length ? <Empty>{tr.empty}</Empty> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr.colNumber}</th>
                <th className={th}>{tr.colTitle}</th>
                <th className={th}>{tr.colStatus}</th>
                <th className={th}>{tr.colTotal}</th>
                <th className={th}>{tr.colOrdered}</th>
                <th className={th}>{tr.colRequired}</th>
                <th className={th}><span className="sr-only">{tr.actions}</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[var(--geex-line)]">
                  <td className="py-3 pe-4 num">{o.number}</td>
                  <td className="py-3 pe-4 text-[var(--geex-ink)]">{o.title}</td>
                  <td className="py-3 pe-4">
                    <StatusPill kind="salesOrder" status={o.status} />
                  </td>
                  <td className="py-3 pe-4 num">{money(o.total, o.currency)}</td>
                  <td className="py-3 pe-4">{o.orderedOn ? fmtDate(o.orderedOn) : "—"}</td>
                  <td className="py-3 pe-4">{o.requiredBy ? fmtDate(o.requiredBy) : "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {rights.canEdit && movesFrom(o.status).map((to) => (
                        <button key={to} type="button" className={btnRow} disabled={busy}
                          onClick={() => send("PUT", { id: o.id, action: "move", to })}>
                          {tr.moveTo(to)}
                        </button>
                      ))}
                      {rights.canEdit && (
                        <button type="button" className={btnRow}
                          onClick={() => setForm({ ...o, lines: [...(o.lines || [])] })}>
                          {tr.editOrder}
                        </button>
                      )}
                      {/* THE DOOR AND THE RULE ARE TWO QUESTIONS. `canDelete` is
                          whether this reader holds the right; `orderDeletable`
                          is whether THIS order is still a draft. Both, or the
                          screen offers something the service refuses. */}
                      {rights.canDelete && orderDeletable(o.status) && (
                        <button type="button" className={btnRowDanger} disabled={busy}
                          onClick={() => {
                            if (window.confirm(tr.confirmDelete(o.number))) {
                              send("DELETE", { id: o.id });
                            }
                          }}>
                          {tr.deleteOrder}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editOrder : tr.newOrder} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr.fldTitle} value={form.title || ""}
              onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
            {/* THE DEAL IS CHOSEN ONLY WHEN THE ORDER IS RAISED. It is stored as
                the deal that exists, not the ticket's derived id, so an edit
                could not name it back — and it never changes anyway. */}
            {!form.id && (
              <Field label={tr.fldDeal} as="select" required value={form.dealId || ""}
                onChange={(v) => {
                  const d = (pickers.deals || []).find((x) => x.id === v);
                  setForm((p) => ({ ...p, dealId: v, clientId: d?.clientId || p.clientId || "", quotationId: "" }));
                }}
                options={linkOptions.deals} />
            )}
            <Field label={tr.fldClient} as="select" value={form.clientId || ""} disabled={!!form.id}
              onChange={(v) => setForm((p) => ({ ...p, clientId: v, contractId: "" }))}
              options={linkOptions.clients} />
            <Field label={tr.fldQuotation} as="select" value={form.quotationId || ""} disabled={!!form.id}
              onChange={(v) => setForm((p) => ({ ...p, quotationId: v }))}
              options={linkOptions.quotations} />
            <Field label={tr.fldContract} as="select" value={form.contractId || ""} disabled={!!form.id}
              onChange={(v) => setForm((p) => ({ ...p, contractId: v }))}
              options={linkOptions.contracts} />
            <Field label={tr.fldOrderedOn} value={form.orderedOn || ""}
              onChange={(v) => setForm((p) => ({ ...p, orderedOn: v }))} />
            <Field label={tr.fldRequiredBy} value={form.requiredBy || ""}
              onChange={(v) => setForm((p) => ({ ...p, requiredBy: v }))} />
            {vat.on && (
              <Field label={tr.fldVatRate} value={String(form.vatRate ?? 0)}
                onChange={(v) => setForm((p) => ({ ...p, vatRate: Number(v) || 0 }))} />
            )}
          </div>

          <h3 className="mt-5 font-medium text-[var(--geex-ink)]">{tr.linesTitle}</h3>
          {!editable && <p className={sub}>{tr.linesClosed}</p>}
          {!(form.lines || []).length && <p className={sub}>{tr.noLines}</p>}

          {(form.lines || []).map((l, i) => (
            <div key={i} className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <Field label={tr.fldDescription} value={l.description || ""} disabled={!editable}
                onChange={(v) => setForm((p) => ({
                  ...p, lines: p.lines.map((x, j) => (j === i ? { ...x, description: v } : x)),
                }))} />
              <Field label={tr.fldQty} value={String(l.qty ?? 0)} disabled={!editable}
                onChange={(v) => setForm((p) => ({
                  ...p, lines: p.lines.map((x, j) => (j === i ? { ...x, qty: Number(v) || 0 } : x)),
                }))} />
              <Field label={tr.fldUnitPrice} value={String(l.unitPrice ?? 0)} disabled={!editable}
                onChange={(v) => setForm((p) => ({
                  ...p, lines: p.lines.map((x, j) => (j === i ? { ...x, unitPrice: Number(v) || 0 } : x)),
                }))} />
              {editable && (
                <button type="button" className={btnRowDanger}
                  onClick={() => setForm((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))}>
                  {tr.removeLine}
                </button>
              )}
            </div>
          ))}

          {editable && (
            <button type="button" className={`${btnGhost} mt-3`}
              onClick={() => setForm((p) => ({ ...p, lines: [...(p.lines || []), { ...BLANK_LINE }] }))}>
              {tr.addLine}
            </button>
          )}

          <div className="mt-4 grid gap-1 text-sm">
            <div className="flex justify-between"><span>{tr.subtotal}</span>
              <span className="num">{money(totals.subtotal, form.currency)}</span></div>
            <div className="flex justify-between"><span>{tr.vat}</span>
              <span className="num">{money(totals.vat, form.currency)}</span></div>
            <div className="flex justify-between font-medium"><span>{tr.total}</span>
              <span className="num">{money(totals.total, form.currency)}</span></div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy}
              onClick={async () => {
                const body = {
                  title: form.title || "", dealId: form.dealId || "",
                  clientId: form.clientId || "", quotationId: form.quotationId || "",
                  contractId: form.contractId || "", orderedOn: form.orderedOn || "",
                  requiredBy: form.requiredBy || "", vatRate: Number(form.vatRate) || 0,
                  notes: form.notes || "",
                  // THE LINES ARE SENT ONLY WHEN THEY MAY CHANGE. Sending them on
                  // a confirmed order would be refused `read-only` by the service
                  // for a field the reader never touched.
                  ...(editable ? { lines: form.lines || [] } : {}),
                };
                const ok = form.id
                  ? await send("PUT", { id: form.id, ...body })
                  : await send("POST", body);
                if (ok) setForm(null);
              }}>
              {tr.save}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
