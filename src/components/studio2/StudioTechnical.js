"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Technical: RFQs raised by Sales, and the quotations they become.
// Two different grants are in play — raising an RFQ needs Sales:manage, working
// it needs Technical:manage — so the buttons appear independently.

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const RFQ_TONE = {
  New: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "In-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Converted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const Q_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Sent: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function StudioTechnical({ slug }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("rfqs");
  const [error, setError] = useState("");
  const [raising, setRaising] = useState(false);
  const [converting, setConverting] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/technical`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Technical in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  async function send(kind, method, payload) {
    setError("");
    const res = await fetch(`/api/studios/${slug}/technical/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "sales-required" ? "Raising an RFQ needs Manage access to Sales."
        : out.error === "read-only" ? "You have view-only access to Technical."
        : out.error === "already" ? "That's already been done."
        : out.error === "ticket" ? "Pick a ticket."
        : "That didn't save."
      );
      return false;
    }
    setRaising(false); setConverting(null); setEditingQuote(null);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Technical…</p>;

  const { canManage, canRequestRfq, rfqs, quotations, openTickets, people, vocabulary } = data;
  const aliasOf = Object.fromEntries(people.map((p) => [p.id, p.alias]));

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {[["rfqs", `RFQs (${rfqs.length})`], ["quotations", `Quotations (${quotations.length})`]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab === "rfqs" && canRequestRfq && (
            <button className={btn} onClick={() => setRaising(true)} disabled={openTickets.length === 0}>Raise RFQ</button>
          )}
          {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
        </div>
      </div>

      {raising && <RaiseRfq tickets={openTickets} onCancel={() => setRaising(false)} onSave={(p) => send("rfqs", "POST", p)} />}
      {converting && <ConvertRfq rfq={converting} vat={vocabulary.defaultVatRate} onCancel={() => setConverting(null)} onSave={(p) => send("quotations", "POST", { ...p, rfqId: converting.id })} />}
      {editingQuote && <QuoteEditor quote={editingQuote} statuses={vocabulary.quotationStatuses} onCancel={() => setEditingQuote(null)} onSave={(p) => send("quotations", "PUT", { ...p, id: editingQuote.id })} />}

      {tab === "rfqs" ? (
        rfqs.length === 0 ? <Empty title="No RFQs yet" body="Sales raises an RFQ from a ticket when they need pricing. It arrives here for Technical to work." />
        : <section className={panel}>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {rfqs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{r.reference}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${RFQ_TONE[r.status] || RFQ_TONE.New}`}>{r.status}</span>
                      {r.urgency && r.urgency !== "Normal" && <span className="text-xs font-600 text-amber-600 dark:text-amber-400">{r.urgency}</span>}
                    </div>
                    <p className="mt-1 font-600 text-slate-900 dark:text-white">{r.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {r.clientName || "—"}{r.handledByCollaboratorId ? ` · ${aliasOf[r.handledByCollaboratorId] || "someone"}` : ""}
                    </p>
                  </div>
                  {canManage && r.status !== "Converted" && (
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} onClick={() => setConverting(r)}>Convert to quotation</button>
                      {r.status !== "Rejected" && <button className={btnGhost} onClick={() => send("rfqs", "PUT", { id: r.id, status: "Rejected" })}>Reject</button>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
      ) : (
        quotations.length === 0 ? <Empty title="No quotations yet" body="Convert an RFQ to produce a priced quotation." />
        : <section className={panel}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {["Number", "Title", "Client", "Status", "Total", ""].map((h, i) => (
                      <th key={h} className={`pb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400 ${i >= 4 ? "text-end" : "text-start"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="py-3 pe-3 font-mono text-xs text-slate-500 dark:text-slate-400">{q.number}</td>
                      <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{q.title}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{q.clientName || "—"}</td>
                      <td className="py-3 pe-3"><span className={`rounded-full px-2.5 py-1 text-xs font-600 ${Q_TONE[q.status] || Q_TONE.Draft}`}>{q.status}</span></td>
                      <td className="py-3 pe-3 text-end font-600 tabular-nums text-slate-900 dark:text-white">{money(q.total)}</td>
                      <td className="py-3 text-end">{canManage && <button className={btnGhost} onClick={() => setEditingQuote(q)}>Open</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
      )}
    </div>
  );
}

function Empty({ title, body }) {
  return (
    <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

function RaiseRfq({ tickets, onSave, onCancel }) {
  const [ticketId, setTicketId] = useState(tickets[0]?.id || "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className={`${panel} border-brand-500/40`}>
      <h2 className={h2}>Raise an RFQ</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick the ticket that needs pricing. Its details are copied across for Technical.</p>
      <div className="mt-4 grid gap-4">
        <div>
          <label className={label}>Ticket</label>
          <select className={input} value={ticketId} onChange={(e) => setTicketId(e.target.value)}>
            {tickets.map((t) => <option key={t.id} value={t.id}>{t.ref} — {t.title}</option>)}
          </select>
        </div>
        <div><label className={label}>What's needed</label><textarea rows={3} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ticketId} onClick={async () => { setBusy(true); await onSave({ ticketId, description }); setBusy(false); }}>
          {busy ? "Raising…" : "Raise RFQ"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function ConvertRfq({ rfq, vat, onSave, onCancel }) {
  const [items, setItems] = useState([{ description: "", qty: 1, unitPrice: 0 }]);
  const [vatRate, setVatRate] = useState(vat);
  const [busy, setBusy] = useState(false);
  return (
    <section className={`${panel} border-brand-500/40`}>
      <h2 className={h2}>Quote {rfq.reference}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rfq.title} · {rfq.clientName}</p>
      <LineItems items={items} setItems={setItems} vatRate={vatRate} setVatRate={setVatRate} />
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy} onClick={async () => { setBusy(true); await onSave({ items, vatRate }); setBusy(false); }}>
          {busy ? "Creating…" : "Create quotation"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function QuoteEditor({ quote, statuses, onSave, onCancel }) {
  const [items, setItems] = useState(quote.items?.length ? quote.items : [{ description: "", qty: 1, unitPrice: 0 }]);
  const [vatRate, setVatRate] = useState(quote.vatRate ?? 15);
  const [status, setStatus] = useState(quote.status);
  const [busy, setBusy] = useState(false);
  return (
    <section className={`${panel} border-brand-500/40`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2}>{quote.number} · {quote.title}</h2>
        <select className={`${input} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <LineItems items={items} setItems={setItems} vatRate={vatRate} setVatRate={setVatRate} />
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy} onClick={async () => { setBusy(true); await onSave({ items, vatRate, status }); setBusy(false); }}>
          {busy ? "Saving…" : "Save quotation"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Close</button>
      </div>
    </section>
  );
}

// Shared line-item editor. Totals shown here are a preview — the server always
// recomputes them, so a tampered client can't change what's stored.
function LineItems({ items, setItems, vatRate, setVatRate }) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
    const vat = subtotal * ((Number(vatRate) || 0) / 100);
    return { subtotal, vat, total: subtotal + vat };
  }, [items, vatRate]);
  const set = (idx, key, value) => setItems(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  return (
    <>
      <div className="mt-5 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_90px_120px_40px]">
            <input className={input} placeholder="Description" value={it.description} onChange={(e) => set(idx, "description", e.target.value)} />
            <input className={input} type="number" min="0" placeholder="Qty" value={it.qty} onChange={(e) => set(idx, "qty", e.target.value)} />
            <input className={input} type="number" min="0" step="0.01" placeholder="Unit price" value={it.unitPrice} onChange={(e) => set(idx, "unitPrice", e.target.value)} />
            <button type="button" className="rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 dark:border-white/15"
              onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove line">×</button>
          </div>
        ))}
      </div>
      <button type="button" className={`${btnGhost} mt-3`} onClick={() => setItems([...items, { description: "", qty: 1, unitPrice: 0 }])}>
        Add line
      </button>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4 dark:border-white/5">
        <div className="w-32">
          <label className={label}>VAT %</label>
          <input className={input} type="number" min="0" max="100" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
        </div>
        <dl className="text-sm tabular-nums">
          <div className="flex justify-between gap-8"><dt className="text-slate-500 dark:text-slate-400">Subtotal</dt><dd className="text-slate-700 dark:text-slate-200">{money(totals.subtotal)}</dd></div>
          <div className="flex justify-between gap-8"><dt className="text-slate-500 dark:text-slate-400">VAT</dt><dd className="text-slate-700 dark:text-slate-200">{money(totals.vat)}</dd></div>
          <div className="mt-1 flex justify-between gap-8 border-t border-slate-100 pt-1 dark:border-white/5">
            <dt className="font-700 text-slate-900 dark:text-white">Total</dt>
            <dd className="font-700 text-slate-900 dark:text-white">{money(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}
