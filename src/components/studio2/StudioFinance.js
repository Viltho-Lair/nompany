"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/lib/studioLinks";
import {
  inputRO, stripeOn, stripeOff, Dialog, ColumnPicker, prefKey, loadPref, savePref,
} from "@/components/studio2/ui";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const th = "pb-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "py-3 pe-3 align-middle";

const INV_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Sent: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const fmt = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "—");
const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

// FINANCE. Every number here is derived — invoice totals from their lines, the
// amount paid from the payments recorded against them, project cost from
// purchase orders plus booked expenses.
// `view` is the ACTIVE SUB-SECTION key: the parent renders a dashboard and each
// sub-section selects its screen. The remaining tabs are tabs of one screen.
export default function StudioFinance({ slug, view = "finance" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("invoices");
  useEffect(() => { if (view === "finance-cash") setTab("invoices"); }, [view]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Finance in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Invoices and expenses land from elsewhere — reflect them live.
  useLiveUpdates(slug, "finance", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/finance/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Finance…</p>;

  const { canManage: canManageParent, invoices, expenses, projects, profitability, summary, vocabulary, nav } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;


  const tabs = [
    ["invoices", `Invoices (${invoices.length})`],
    ["expenses", `Expenses (${expenses.length})`],
    ["projects", `Profitability (${profitability.length})`],
  ];

  if (view === "finance") {
    return (
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Summary summary={summary} />
        <FinanceProjects rows={profitability} slug={slug} nav={nav} canManage={canManage} busy={busy}
          onSave={(payload) => send("projects", "PUT", payload)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <Summary summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {tabs.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>

      {tab === "invoices" && (
        <Invoices rows={invoices} projects={projects} vocab={vocabulary} slug={slug} nav={nav}
          canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "expenses" && (
        <Expenses rows={expenses} projects={projects} categories={vocabulary.expenseCategories}
          slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "projects" && <Profitability rows={profitability} slug={slug} nav={nav} />}
    </div>
  );
}

function message(out) {
  if (out.error === "read-only") return "You have view-only access to Finance.";
  if (out.error === "issued") return "This invoice has been issued — cancel it rather than changing it.";
  if (out.error === "has-payments") return "Payments have been recorded against this invoice.";
  if (out.error === "overpayment") return `That's more than the ${money(out.outstanding)} still outstanding.`;
  if (out.error === "derived-status") return "Paid follows the payments — record the payment instead.";
  if (out.error === "not-issued") return "Send the invoice before recording a payment.";
  if (out.error === "cancelled") return "That invoice was cancelled.";
  if (out.error === "lines") return "Add at least one line with a description and quantity.";
  if (out.error === "client") return "Pick a project, or name the client.";
  if (out.error === "amount") return "Enter an amount.";
  return "That didn't save.";
}

// ---- summary ---------------------------------------------------------------
function Summary({ summary }) {
  const cells = [
    ["Invoiced", money(summary.invoiced), ""],
    ["Collected", money(summary.collected), "text-emerald-600 dark:text-emerald-400"],
    ["Outstanding", money(summary.outstanding), ""],
    ["Overdue", money(summary.overdue), summary.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
    ["Expenses", money(summary.expenses), ""],
  ];
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        {cells.map(([name, value, tone]) => (
          <div key={name}>
            <p className={`font-display text-2xl font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- invoices --------------------------------------------------------------
function Invoices({ rows, projects, vocab, slug, nav, canManage, busy, send }) {
  const [drafting, setDrafting] = useState(false);
  const [paying, setPaying] = useState(null);
  const [open, setOpen] = useState(null);

  return (
    <>
      {canManage && !drafting && !paying && <button className={btn} onClick={() => setDrafting(true)}>New invoice</button>}

      {drafting && (
        <InvoiceForm projects={projects} defaultVat={vocab.defaultVatRate} busy={busy}
          onCancel={() => setDrafting(false)}
          onSave={async (v) => { if (await send("invoices", "POST", v)) setDrafting(false); }} />
      )}

      {paying && (
        <PaymentForm invoice={paying} methods={vocab.paymentMethods} busy={busy}
          onCancel={() => setPaying(null)}
          onSave={async (p) => { if (await send("invoices", "PUT", { id: paying.id, payment: p })) setPaying(null); }} />
      )}

      {rows.length === 0 ? <Empty title="No invoices yet" body="An invoice bills a client for a project. Recording payments against it is what marks it paid." /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Invoice", "Client", "Project", "Due", "Total", "Paid", "Status", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i >= 4 && i <= 5 ? "text-end" : i === 7 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <Fragment key={inv.id}>
                    <tr className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className={td}>
                        <button type="button" className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300"
                          onClick={() => setOpen(open === inv.id ? null : inv.id)}>
                          {inv.reference}
                        </button>
                      </td>
                      <td className={`${td} text-slate-900 dark:text-white`}>{inv.clientName}</td>
                      <td className={td}>
                        {inv.projectNumber
                          ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, inv.projectId))} title="Open the project">{inv.projectNumber}</RecordLink>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={`${td} ${inv.overdue ? "font-600 text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                        {fmt(inv.dueDate)}{inv.overdue && " · overdue"}
                      </td>
                      <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>{money(inv.total)}</td>
                      <td className={`${td} text-end text-slate-600 dark:text-slate-300`}>{money(inv.paid)}</td>
                      <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-600 ${INV_TONE[inv.status]}`}>{inv.status}</span></td>
                      <td className={`${td} text-end`}>
                        {canManage && (
                          <span className="flex flex-wrap justify-end gap-2">
                            {inv.status === "Draft" && <button className={btn} disabled={busy} onClick={() => send("invoices", "PUT", { id: inv.id, status: "Sent" })}>Send</button>}
                            {inv.status === "Sent" && <button className={btn} onClick={() => setPaying(inv)}>Record payment</button>}
                            {inv.status !== "Cancelled" && inv.status !== "Paid" && inv.paid === 0 && (
                              <button className={btnGhost} disabled={busy} onClick={() => send("invoices", "PUT", { id: inv.id, status: "Cancelled" })}>Cancel</button>
                            )}
                            {inv.status === "Draft" && <button className={btnDanger} disabled={busy} onClick={() => send("invoices", "DELETE", { id: inv.id })}>Delete</button>}
                          </span>
                        )}
                      </td>
                    </tr>
                    {open === inv.id && (
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <td colSpan={8} className="py-4">
                          <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                              {inv.lines.map((l, i) => (
                                <li key={i} className="flex justify-between gap-4">
                                  <span>{l.description} × {l.qty}</span>
                                  <span className="font-mono">{money(l.qty * l.unitPrice)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 space-y-0.5 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                              <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>Subtotal</span><span className="font-mono">{money(inv.subtotal)}</span></p>
                              <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>VAT {inv.vatRate}%</span><span className="font-mono">{money(inv.vat)}</span></p>
                              <p className="flex justify-between gap-4 font-700 text-slate-900 dark:text-white"><span>Total</span><span className="font-mono">{money(inv.total)}</span></p>
                              {inv.outstanding > 0 && inv.status !== "Draft" && (
                                <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>Outstanding</span><span className="font-mono">{money(inv.outstanding)}</span></p>
                              )}
                            </div>
                            {(inv.payments || []).length > 0 && (
                              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                                <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Payments</p>
                                <ul className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                                  {inv.payments.map((p) => (
                                    <li key={p.id} className="flex justify-between gap-4">
                                      <span>{fmt(p.date)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                                      <span className="font-mono">{money(p.amount)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function InvoiceForm({ projects, defaultVat, busy, onCancel, onSave }) {
  const [head, setHead] = useState({ projectId: "", clientName: "", vatRate: String(defaultVat), issueDate: "", dueDate: "" });
  const [lines, setLines] = useState([{ description: "", qty: "1", unitPrice: "" }]);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, [k]: v } : l)));

  const filled = lines.filter((l) => l.description.trim() && Number(l.qty) > 0);
  const project = projects.find((p) => p.id === head.projectId);
  const ready = filled.length > 0 && (head.projectId || head.clientName.trim());
  const subtotal = filled.reduce((s, l) => s + Number(l.qty) * (Number(l.unitPrice) || 0), 0);
  const total = subtotal * (1 + (Number(head.vatRate) || 0) / 100);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">New invoice</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={label}>Project</label>
          <select className={input} value={head.projectId} onChange={(e) => setHead((h) => ({ ...h, projectId: e.target.value }))}>
            <option value="">— none —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.number} · {p.clientName}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Client</label>
          <input className={input} value={head.clientName} placeholder={project?.clientName || "Client name"}
            onChange={(e) => setHead((h) => ({ ...h, clientName: e.target.value }))} />
        </div>
        <div>
          <label className={label}>VAT %</label>
          <input type="number" className={input} value={head.vatRate} onChange={(e) => setHead((h) => ({ ...h, vatRate: e.target.value }))} />
        </div>
        <div>
          <label className={label}>Due date</label>
          <input type="date" className={input} value={head.dueDate} onChange={(e) => setHead((h) => ({ ...h, dueDate: e.target.value }))} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className={label}>Description</label>
              <input className={input} value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} />
            </div>
            <div className="w-24">
              <label className={label}>Qty</label>
              <input type="number" className={input} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
            </div>
            <div className="w-32">
              <label className={label}>Unit price</label>
              <input type="number" className={input} value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", e.target.value)} />
            </div>
            {lines.length > 1 && <button className={btnGhost} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>Remove</button>}
          </div>
        ))}
        <button className={btnGhost} onClick={() => setLines((ls) => [...ls, { description: "", qty: "1", unitPrice: "" }])}>Add line</button>
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Total <span className="font-mono font-700 text-slate-900 dark:text-white">{money(total)}</span>
        <span className="text-xs"> — recalculated on the server when you save.</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready}
          onClick={() => onSave({ ...head, vatRate: Number(head.vatRate) || 0, lines: filled })}>
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function PaymentForm({ invoice, methods, busy, onCancel, onSave }) {
  const [form, setForm] = useState({ amount: String(invoice.outstanding), date: "", method: methods[0], reference: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Record payment — {invoice.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{money(invoice.outstanding)} outstanding of {money(invoice.total)}.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={label}>Amount</label>
          <input type="number" className={input} value={form.amount} onChange={set("amount")} />
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" className={input} value={form.date} onChange={set("date")} />
        </div>
        <div>
          <label className={label}>Method</label>
          <select className={input} value={form.method} onChange={set("method")}>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Reference</label>
          <input className={input} value={form.reference} onChange={set("reference")} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !(Number(form.amount) > 0)} onClick={() => onSave({ ...form, amount: Number(form.amount) })}>
          {busy ? "Recording…" : "Record"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// ---- expenses --------------------------------------------------------------
function Expenses({ rows, projects, categories, slug, nav, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = (row) => [
    { key: "description", label: "Description", required: true, value: row?.description || "" },
    { key: "amount", label: "Amount", type: "number", required: true, value: row?.amount || "" },
    { key: "category", label: "Category", value: row?.category || categories[0], options: categories.map((c) => ({ value: c, text: c })) },
    { key: "date", label: "Date", type: "date", value: row?.date || "" },
    { key: "projectId", label: "Project", value: row?.projectId || "",
      options: [{ value: "", text: "— general —" }, ...projects.map((p) => ({ value: p.id, text: p.number }))] },
    { key: "notes", label: "Notes", area: true, value: row?.notes || "" },
  ];

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add expense</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit expense" : "New expense"} busy={busy} fields={fields(editing)}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("expenses", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title="No expenses yet" body="Expenses are what the work cost. Booking one to a project feeds its margin." /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Date", "Description", "Category", "Project", "Paid by", "Amount", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i >= 5 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{fmt(e.date)}</td>
                    <td className={td}>
                      <span className="font-mono text-xs text-slate-400">{e.reference}</span>
                      <span className="ms-2 font-600 text-slate-900 dark:text-white">{e.description || "—"}</span>
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{e.category}</td>
                    <td className={td}>
                      {e.projectNumber
                        ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, e.projectId))} title="Open the project">{e.projectNumber}</RecordLink>
                        : <span className="text-slate-400">General</span>}
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{e.paidByAlias || "—"}</td>
                    <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>{money(e.amount)}</td>
                    <td className={`${td} text-end`}>
                      {canManage && (
                        <span className="flex flex-wrap justify-end gap-2">
                          <button className={btnGhost} onClick={() => setEditing(e)}>Edit</button>
                          <button className={btnDanger} disabled={busy} onClick={() => send("expenses", "DELETE", { id: e.id })}>Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

// ---- profitability ---------------------------------------------------------
function Profitability({ rows, slug, nav }) {
  if (rows.length === 0) return <Empty title="No projects to measure yet" body="Once a quotation becomes a project, its value, cost and margin appear here." />;
  return (
    <section className={panel}>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Value comes from the project's quotation, cost from its purchase orders plus booked expenses. Both are recomputed on every read.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {["Project", "Value", "Invoiced", "Collected", "Materials", "Expenses", "Margin"].map((h, i) => (
                <th key={h} className={`${th} ${i >= 1 ? "text-end" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className={td}>
                  <RecordLink href={linkIf(nav?.projects, linkToProject(slug, p.id))} title="Open the project">{p.number}</RecordLink>
                  <span className="ms-2 text-slate-600 dark:text-slate-300">{p.clientName}</span>
                </td>
                <td className={`${td} text-end text-slate-900 dark:text-white`}>{money(p.value)}</td>
                <td className={`${td} text-end text-slate-600 dark:text-slate-300`}>
                  {money(p.invoiced)}
                  {p.uninvoiced > 0 && <span className="block text-xs text-amber-600 dark:text-amber-400">{money(p.uninvoiced)} unbilled</span>}
                </td>
                <td className={`${td} text-end text-slate-600 dark:text-slate-300`}>{money(p.collected)}</td>
                <td className={`${td} text-end text-slate-600 dark:text-slate-300`}>{money(p.materials)}</td>
                <td className={`${td} text-end text-slate-600 dark:text-slate-300`}>{money(p.expenses)}</td>
                <td className={`${td} text-end font-700 ${p.margin < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {money(p.margin)}
                  <span className="block text-xs font-400 text-slate-400">{p.marginPct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- shared bits -----------------------------------------------------------
function SimpleForm({ title, fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.options ? (
              <select className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            ) : f.area ? (
              <textarea rows={2} className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <input type={f.type || "text"} className={input} value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}


// Deliberately empty of analytics for now — the parent section is a place.
// The Old System's Finance view of the work: every project as a commercial
// record — what it is worth, what has been invoiced against it, and the two
// numbers Finance itself issues. Columns beyond the core set are opt-in, because
// the core ones are what somebody chasing money actually reads.
const FINANCE_COLUMNS = [
  { key: "poNumber", label: "PO number", core: true },
  { key: "quotationNumber", label: "Quotation", core: true },
  { key: "title", label: "Project", core: true },
  { key: "clientName", label: "Client", core: true },
  { key: "value", label: "Value", core: true, money: true, end: true },
  { key: "projectNumber", label: "Project number", core: true },
  { key: "managerAlias", label: "Manager", core: true },
  { key: "number", label: "Ref", core: false },
  { key: "stage", label: "Stage", core: false },
  { key: "location", label: "Location", core: false },
  { key: "endDate", label: "Target end", core: false, date: true },
  { key: "invoiced", label: "Invoiced", core: false, money: true, end: true },
  { key: "collected", label: "Collected", core: false, money: true, end: true },
  { key: "uninvoiced", label: "Uninvoiced", core: false, money: true, end: true },
  { key: "cost", label: "Cost", core: false, money: true, end: true },
  { key: "margin", label: "Margin", core: false, money: true, end: true },
];
const DEFAULT_FINANCE_COLUMNS = FINANCE_COLUMNS.filter((c) => c.core).map((c) => c.key);

function FinanceProjects({ rows, slug, nav, canManage, busy, onSave }) {
  const [query, setQuery] = useState("");
  const [poFilter, setPoFilter] = useState("all");
  const [columns, setColumns] = useState(DEFAULT_FINANCE_COLUMNS);
  const [showColumns, setShowColumns] = useState(false);
  const [editing, setEditing] = useState(null);
  const closeEditing = useCallback(() => setEditing(null), []);

  const colsKey = prefKey("finance", slug, "cols");
  useEffect(() => {
    const saved = loadPref(colsKey, null);
    setColumns(Array.isArray(saved) && saved.length
      ? saved.filter((k) => FINANCE_COLUMNS.some((c) => c.key === k))
      : DEFAULT_FINANCE_COLUMNS);
  }, [colsKey]);
  const toggleCol = (key) => setColumns((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    savePref(colsKey, next);
    return next;
  });
  const resetCols = () => { setColumns(DEFAULT_FINANCE_COLUMNS); savePref(colsKey, DEFAULT_FINANCE_COLUMNS); };

  // Keep the open editor on the freshly loaded row after a save.
  useEffect(() => {
    setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null));
  }, [rows]);

  const shown = rows.filter((r) => {
    if (poFilter === "issued" && !r.poNumber) return false;
    if (poFilter === "awaiting" && r.poNumber) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.title} ${r.clientName} ${r.number} ${r.poNumber} ${r.projectNumber} ${r.quotationNumber}`.toLowerCase().includes(q);
  });

  const cell = (r, c) => {
    const v = r[c.key];
    if (c.money) return money(v);
    if (c.date) return fmt(v);
    return v || "—";
  };
  const visible = FINANCE_COLUMNS.filter((c) => columns.includes(c.key));

  if (rows.length === 0) {
    return <Empty title="Nothing to account for yet" body="Projects open from an approved quotation. Once one exists it shows up here as a commercial record." />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search project, client, PO or quotation…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["all", "All"], ["issued", "PO issued"], ["awaiting", "Awaiting PO"]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setPoFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-600 transition-colors ${poFilter === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {text}
            </button>
          ))}
        </div>
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>Columns</button>
      </div>

      {showColumns && (
        <ColumnPicker title="Finance columns" columns={FINANCE_COLUMNS} selected={columns}
          onToggle={toggleCol} onReset={resetCols} onClose={() => setShowColumns(false)} />
      )}

      {editing && (
        <Dialog title={editing.title} description={`${editing.clientName || "—"} · ${money(editing.value)}`}
          onClose={closeEditing} width="max-w-[560px]">
          <Commercials row={editing} busy={busy} canManage={canManage} onCancel={closeEditing}
            onSave={async (patch) => { if (await onSave({ id: editing.id, ...patch })) setEditing(null); }} />
        </Dialog>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{shown.length} of {rows.length} project{rows.length === 1 ? "" : "s"}.</p>

      <section className={panel}>
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nothing matches that.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {visible.map((c) => (
                    <th key={c.key} className={`${th} ps-2 ${c.end ? "text-end" : "text-start"}`}>{c.label}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  // A project with no PO number yet is the one Finance is
                  // waiting on, so it carries the stripe.
                  <tr key={r.id} className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${r.poNumber ? stripeOff : stripeOn}`}>
                    {visible.map((c) => (
                      <td key={c.key} className={`${td} ps-2 ${c.end ? "text-end tabular-nums" : ""} ${c.key === "title" ? "font-600 text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                        {c.key === "number"
                          ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, r.id))} title="Open the project">{r.number}</RecordLink>
                          : cell(r, c)}
                      </td>
                    ))}
                    <td className={`${td} text-end`}>
                      <button className={btnGhost} onClick={() => setEditing(r)}>{canManage ? "Edit" : "View"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// The two numbers Finance issues. Everything else about the project belongs to
// Projects and is shown here read-only, so this dialog cannot become a back door
// into editing somebody else's record.
function Commercials({ row, busy, canManage, onSave, onCancel }) {
  const [poNumber, setPoNumber] = useState(row.poNumber || "");
  const [projectNumber, setProjectNumber] = useState(row.projectNumber || "");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Quotation</label><input className={inputRO} readOnly value={row.quotationNumber || "—"} /></div>
        <div><label className={label}>Manager</label><input className={inputRO} readOnly value={row.managerAlias || "—"} /></div>
        <div>
          <label className={label}>PO number</label>
          <input className={input} value={poNumber} disabled={!canManage} onChange={(e) => setPoNumber(e.target.value)} placeholder="Issued on approval" />
        </div>
        <div>
          <label className={label}>Project number</label>
          <input className={input} value={projectNumber} disabled={!canManage} onChange={(e) => setProjectNumber(e.target.value)} placeholder="Entered by Finance" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[["Value", row.value], ["Invoiced", row.invoiced], ["Collected", row.collected], ["Margin", row.margin]].map(([name, v]) => (
          <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
            <p className={label}>{name}</p>
            <p className="font-display text-base font-800 tabular-nums text-slate-900 dark:text-white">{money(v)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        {canManage && (
          <button className={btn} disabled={busy} onClick={() => onSave({ poNumber, projectNumber })}>
            {busy ? "Saving…" : "Save"}
          </button>
        )}
        <button className={btnGhost} onClick={onCancel}>Close</button>
      </div>
    </>
  );
}
