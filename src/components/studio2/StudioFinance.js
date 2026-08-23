"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import FinanceDashboard from "@/components/studio2/FinanceDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { assetRegister } from "@/modules/finance/analytics";
import {
  stripeOn, stripeOff, Dialog, ColumnPicker, prefKey, loadPref, savePref, fmtDate,
} from "@/components/studio2/ui";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
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

// A bill's own status ladder (Draft|Received|Approved|Paid|Cancelled|Disputed).
// Approved wears the accent to read as "authorised"; Disputed is a warning, not a
// failure, so it borrows amber rather than the rose of Cancelled.
const BILL_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Received: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Disputed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};
const ASSET_STATUS_TONE = {
  service: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  disposed: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
};

// The tenant's locale and dd/mm/yyyy, via the one formatter. `fmtDate` already
// treats a date-only string as local midnight, so the `T00:00:00` guard moved
// into it — see companySettings.
const fmt = fmtDate;
const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

// FINANCE — the department's shell dispatches to a screen per SUB-SECTION key.
// A thin dispatcher on purpose: it calls no hooks itself, so switching between
// screens (each of which owns its own fetch and hooks) never trips the rules of
// hooks, and Payables/Assets never pay for the Cash screen's `/finance` fetch.
//   finance            → dashboard + project profitability (FinanceCash)
//   finance-cash       → invoices / expenses / profitability tabs (FinanceCash)
//   finance-payables   → Accounts Payable (bills)          [FINANCE 1b]
//   finance-assets     → Fixed Assets                      [FINANCE 1b]
export default function StudioFinance({ slug, view = "finance" }) {
  if (view === "finance-payables") return <Payables slug={slug} />;
  if (view === "finance-assets") return <Assets slug={slug} />;
  return <FinanceCash slug={slug} view={view} />;
}

// FINANCE. Every number here is derived — invoice totals from their lines, the
// amount paid from the payments recorded against them, project cost from
// purchase orders plus booked expenses.
function FinanceCash({ slug, view = "finance" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("invoices");
  useEffect(() => { if (view === "finance-cash") setTab("invoices"); }, [view]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

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
        {/* The money summary across every project — the sharpest case for a
            dashboard right of its own. */}
        {data.canViewDashboard === false ? <Empty title="The dashboard isn't yours to see" body="This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar." /> : (
          <>
            <FinanceDashboard invoices={invoices} expenses={expenses} level={level} slug={slug} />
            <FinanceProjects rows={profitability} slug={slug} nav={nav} canManage={canManage} busy={busy}
              onSave={(payload) => send("projects", "PUT", payload)} />
          </>
        )}
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
  if (out.error === "has-payments") return "Payments have been recorded against this record.";
  if (out.error === "overpayment") return `That's more than the ${money(out.outstanding)} still outstanding.`;
  if (out.error === "derived-status") return "Paid follows the payments — record the payment instead.";
  if (out.error === "not-issued") return "Send the invoice before recording a payment.";
  if (out.error === "cancelled") return "That record was cancelled.";
  if (out.error === "lines") return "Add at least one line with a description and quantity.";
  if (out.error === "client") return "Pick a project, or name the client.";
  if (out.error === "amount") return "Enter an amount.";
  // ---- accounts payable ----------------------------------------------------
  if (out.error === "vendor") return "Name the vendor this bill is from.";
  if (out.error === "same-signer") return "A bill can't be approved by the person who raised it — ask a second approver.";
  if (out.error === "locked") return "An approved or paid bill can't be edited — dispute or cancel it instead.";
  if (out.error === "already") return "That bill has already been approved.";
  if (out.error === "not-approved") return "Approve the bill before recording a payment against it.";
  if (out.error === "has-history") return "This bill has been approved or paid against — cancel it rather than deleting.";
  if (out.error === "status") return "That isn't a status a bill can hold.";
  // ---- fixed assets --------------------------------------------------------
  if (out.error === "name") return "Give the asset a name.";
  if (out.error === "cost") return "Enter what the asset cost.";
  if (out.error === "life") return "Enter the useful life in months.";
  if (out.error === "disposed") return "That asset has been disposed and is read-only.";
  if (out.error === "already-disposed") return `That asset was already disposed on ${fmt(out.on)}.`;
  if (out.error === "before-acquired") return "Disposal can't be dated before the asset was acquired.";
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

// THE ONE LINE-ITEMS EDITOR, shared by the invoice and the bill forms — a bill's
// lines are an invoice's lines (same shape, same server-side cleaning), so the
// two must not drift. Owns the row map/add/remove; the caller owns the state and
// reads `filledLines`/`linesSubtotal` off it for the total.
const EMPTY_LINE = { description: "", qty: "1", unitPrice: "" };
export const filledLines = (lines) => lines.filter((l) => l.description.trim() && Number(l.qty) > 0);
export const linesSubtotal = (lines) => filledLines(lines).reduce((s, l) => s + Number(l.qty) * (Number(l.unitPrice) || 0), 0);

function LineItemsEditor({ lines, setLines }) {
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, [k]: v } : l)));
  return (
    <div className="mt-5 space-y-3">
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Description" value={l.description} onChange={(v) => setLine(i, "description", v)} />
          </div>
          <div className="w-24">
            <Field label="Qty" type="number" value={l.qty} onChange={(v) => setLine(i, "qty", v)} />
          </div>
          <div className="w-32">
            <Field label="Unit price" type="number" value={l.unitPrice} onChange={(v) => setLine(i, "unitPrice", v)} />
          </div>
          {lines.length > 1 && <button className={btnGhost} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>Remove</button>}
        </div>
      ))}
      <button className={btnGhost} onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}>Add line</button>
    </div>
  );
}

function InvoiceForm({ projects, defaultVat, busy, onCancel, onSave }) {
  const [head, setHead] = useState({ projectId: "", clientName: "", vatRate: String(defaultVat), issueDate: "", dueDate: "" });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const filled = filledLines(lines);
  const project = projects.find((p) => p.id === head.projectId);
  const ready = filled.length > 0 && (head.projectId || head.clientName.trim());
  const subtotal = linesSubtotal(lines);
  const total = subtotal * (1 + (Number(head.vatRate) || 0) / 100);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">New invoice</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Project" as="select" value={head.projectId}
          onChange={(v) => setHead((h) => ({ ...h, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} · ${p.clientName}` }))} />
        <Field label="Client" value={head.clientName} hint={project?.clientName || undefined}
          onChange={(v) => setHead((h) => ({ ...h, clientName: v }))} />
        <Field label="VAT %" type="number" value={head.vatRate} onChange={(v) => setHead((h) => ({ ...h, vatRate: v }))} />
        <Field label="Due date" filled={!!head.dueDate}>
          <StudioDate value={head.dueDate} onChange={(iso) => setHead((h) => ({ ...h, dueDate: iso }))} />
        </Field>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} />

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

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Record payment — {invoice.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{money(invoice.outstanding)} outstanding of {money(invoice.total)}.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Amount" type="number" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
        <Field label="Date" filled={!!form.date}>
          <StudioDate value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} />
        </Field>
        <Field label="Method" as="select" value={form.method} onChange={(v) => setForm((f) => ({ ...f, method: v }))} options={methods} />
        <Field label="Reference" value={form.reference} onChange={(v) => setForm((f) => ({ ...f, reference: v }))} />
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
            {f.options ? (
              <Field label={f.label} required={f.required} as="select" value={values[f.key]}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                options={f.options.filter((o) => o.value !== "").map((o) => ({ value: o.value, label: o.text }))} />
            ) : f.area ? (
              <Field label={f.label} required={f.required} as="textarea" value={values[f.key]}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
            ) : f.type === "date" ? (
              <Field label={f.label} required={f.required} filled={!!values[f.key]}>
                <StudioDate value={values[f.key]} onChange={(iso) => setValues((s) => ({ ...s, [f.key]: iso }))} />
              </Field>
            ) : (
              <Field label={f.label} required={f.required} type={f.type || "text"} value={values[f.key]}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
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

// ONE FETCH/SEND SHAPE for the Payables and Assets screens, so the two do not
// each carry a copy of the load/subscribe/mutate dance the Cash screen already
// runs. Each screen owns its own route (`bills`/`assets`), reflects the same
// live "finance" channel, and reports errors through the shared `message()`.
function useFinanceResource(slug, kind) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/${kind}`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to this in this studio."); return; }
    setData(await res.json()); setError("");
  }, [slug, kind]);
  useEffect(() => { load(); }, [load]);
  // Bills and assets can land from elsewhere (a PO answered, a disposal) — reflect
  // them live, on the same one EventSource the tab already holds (invariant 14).
  useLiveUpdates(slug, "finance", load);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/finance/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out)); return false; }
    await load();
    return true;
  }, [slug, kind, load]);

  return { data, error, busy, send };
}

// ============================================================================
// ACCOUNTS PAYABLE (FINANCE 1b) — bills we owe vendors, the AP mirror of
// invoices. A bill's totals ARE an invoice's totals and its lines ARE an
// invoice's lines, so both forms share LineItemsEditor and both aging reports
// share agingOf — the two sides can never disagree about the arithmetic.
// ============================================================================
const TERM_LABEL = {
  "on-receipt": "On receipt", "net-0": "Net 0", "net-15": "Net 15", "net-30": "Net 30", "net-60": "Net 60",
};

function Payables({ slug }) {
  const { data, error, busy, send } = useFinanceResource(slug, "bills");

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Accounts Payable…</p>;

  const canManage = data.manage?.["finance-payables"] ?? data.canManage;
  const { bills = [], vocabulary = {}, nav } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <PayablesSummary bills={bills} />
      <div className="flex items-center justify-end">
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>
      <Bills rows={bills} vocab={vocabulary} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
    </div>
  );
}

function PayablesSummary({ bills }) {
  const live = bills.filter((b) => b.status !== "Cancelled" && b.status !== "Draft");
  const billed = live.reduce((s, b) => s + (b.total || 0), 0);
  const outstanding = live.reduce((s, b) => s + (b.outstanding || 0), 0);
  const overdue = bills.filter((b) => b.overdue).reduce((s, b) => s + (b.outstanding || 0), 0);
  const awaiting = bills.filter((b) => b.status === "Received").length;
  const cells = [
    ["Billed", money(billed), ""],
    ["Outstanding", money(outstanding), ""],
    ["Overdue", money(overdue), overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
    ["Awaiting approval", String(awaiting), awaiting > 0 ? "text-amber-600 dark:text-amber-400" : ""],
  ];
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        {cells.map(([name, value, tone]) => (
          <div key={name}>
            <p className={`font-display text-2xl font-800 tabular-nums ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bills({ rows, vocab, slug, nav, canManage, busy, send }) {
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [open, setOpen] = useState(null);
  const terms = vocab.billTerms || Object.keys(TERM_LABEL);
  const methods = vocab.paymentMethods || ["Bank transfer"];

  // Keep an open form on the freshly loaded row after a save.
  useEffect(() => { setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);
  useEffect(() => { setPaying((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);

  const form = drafting || editing;

  return (
    <>
      {canManage && !form && !paying && <button className={btn} onClick={() => setDrafting(true)}>New bill</button>}

      {form && (
        <BillForm bill={editing} terms={terms} defaultVat={vocab.defaultVatRate} busy={busy}
          onCancel={() => { setDrafting(false); setEditing(null); }}
          onSave={async (v) => {
            const ok = editing
              ? await send("PUT", { id: editing.id, ...v })
              : await send("POST", v);
            if (ok) { setDrafting(false); setEditing(null); }
          }} />
      )}

      {paying && (
        <BillPaymentForm bill={paying} methods={methods} busy={busy}
          onCancel={() => setPaying(null)}
          onSave={async (p) => { if (await send("PUT", { id: paying.id, payment: p })) setPaying(null); }} />
      )}

      {rows.length === 0 ? <Empty title="No bills yet" body="A bill is what you owe a vendor. Approving it, then recording payments against it, is what settles it." /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Bill", "Vendor", "Due", "Total", "Outstanding", "Status", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i >= 3 && i <= 4 ? "text-end" : i === 6 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const noHistory = (b.payments || []).length === 0;
                  const editable = ["Draft", "Received", "Disputed"].includes(b.status) && noHistory;
                  const approvable = ["Received", "Disputed"].includes(b.status);
                  const payable = !["Draft", "Cancelled", "Paid"].includes(b.status) && b.outstanding > 0;
                  return (
                    <Fragment key={b.id}>
                      <tr className="border-b border-slate-100 last:border-0 dark:border-white/5">
                        <td className={td}>
                          <button type="button" className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300"
                            onClick={() => setOpen(open === b.id ? null : b.id)}>
                            {b.reference}
                          </button>
                        </td>
                        <td className={`${td} text-slate-900 dark:text-white`}>{b.vendorName}</td>
                        <td className={`${td} ${b.overdue ? "font-600 text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                          {b.dueDate ? fmt(b.dueDate) : "—"}{b.overdue && " · overdue"}
                        </td>
                        <td className={`${td} text-end font-600 tabular-nums text-slate-900 dark:text-white`}>{money(b.total)}</td>
                        <td className={`${td} text-end tabular-nums text-slate-600 dark:text-slate-300`}>{money(b.outstanding)}</td>
                        <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-600 ${BILL_TONE[b.status] || BILL_TONE.Received}`}>{b.status}</span></td>
                        <td className={`${td} text-end`}>
                          {canManage && (
                            <span className="flex flex-wrap justify-end gap-2">
                              {b.status === "Draft" && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Received" })}>Mark received</button>}
                              {approvable && <button className={btn} disabled={busy} onClick={() => send("PUT", { id: b.id, approve: true })}>Approve</button>}
                              {payable && <button className={btn} onClick={() => setPaying(b)}>Record payment</button>}
                              {editable && <button className={btnGhost} onClick={() => setEditing(b)}>Edit</button>}
                              {b.status === "Received" && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Disputed" })}>Dispute</button>}
                              {["Received", "Disputed"].includes(b.status) && noHistory && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Cancelled" })}>Cancel</button>}
                              {editable && <button className={btnDanger} disabled={busy} onClick={() => send("DELETE", { id: b.id })}>Delete</button>}
                            </span>
                          )}
                        </td>
                      </tr>
                      {open === b.id && (
                        <tr className="border-b border-slate-100 dark:border-white/5">
                          <td colSpan={7} className="py-4">
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                {(b.lines || []).map((l, i) => (
                                  <li key={i} className="flex justify-between gap-4">
                                    <span>{l.description} × {l.qty}</span>
                                    <span className="num">{money(l.qty * l.unitPrice)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 space-y-0.5 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                                <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>Subtotal</span><span className="num">{money(b.subtotal)}</span></p>
                                <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>VAT {b.vatRate}%</span><span className="num">{money(b.vat)}</span></p>
                                <p className="flex justify-between gap-4 font-700 text-slate-900 dark:text-white"><span>Total</span><span className="num">{money(b.total)}</span></p>
                                {b.outstanding > 0 && b.status !== "Draft" && (
                                  <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>Outstanding</span><span className="num">{money(b.outstanding)}</span></p>
                                )}
                              </div>
                              <p className="mt-3 text-xs text-slate-400">
                                Billed {b.billDate ? fmt(b.billDate) : "—"} · terms {TERM_LABEL[b.terms] || b.terms || "—"}
                              </p>
                              {b.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{b.notes}</p>}
                              {(b.payments || []).length > 0 && (
                                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                                  <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Payments</p>
                                  <ul className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                                    {b.payments.map((p, i) => (
                                      <li key={p.id || i} className="flex justify-between gap-4">
                                        <span>{fmt(p.date)} · {p.method}{p.note ? ` · ${p.note}` : ""}</span>
                                        <span className="num">{money(p.amount)}</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function BillForm({ bill, terms, defaultVat, busy, onCancel, onSave }) {
  const editing = !!bill;
  const [head, setHead] = useState({
    vendorName: bill?.vendorName || "",
    vatRate: String(bill?.vatRate ?? defaultVat ?? 15),
    terms: bill?.terms || terms[0] || "on-receipt",
    billDate: bill?.billDate || "",
    dueDate: bill?.dueDate || "",
    notes: bill?.notes || "",
  });
  const [lines, setLines] = useState(
    bill?.lines?.length
      ? bill.lines.map((l) => ({ description: l.description || "", qty: String(l.qty ?? "1"), unitPrice: String(l.unitPrice ?? "") }))
      : [{ ...EMPTY_LINE }],
  );

  const filled = filledLines(lines);
  const ready = head.vendorName.trim() && filled.length > 0;
  const subtotal = linesSubtotal(lines);
  const total = subtotal * (1 + (Number(head.vatRate) || 0) / 100);
  const body = (status) => ({
    ...head, vatRate: Number(head.vatRate) || 0, lines: filled, ...(status ? { status } : {}),
  });

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{editing ? `Edit bill — ${bill.reference}` : "New bill"}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Vendor" required value={head.vendorName} onChange={(v) => setHead((h) => ({ ...h, vendorName: v }))} />
        <Field label="Terms" as="select" value={head.terms} onChange={(v) => setHead((h) => ({ ...h, terms: v }))}
          options={terms.map((t) => ({ value: t, label: TERM_LABEL[t] || t }))} />
        <Field label="VAT %" type="number" value={head.vatRate} onChange={(v) => setHead((h) => ({ ...h, vatRate: v }))} />
        <Field label="Bill date" filled={!!head.billDate}>
          <StudioDate value={head.billDate} onChange={(iso) => setHead((h) => ({ ...h, billDate: iso }))} />
        </Field>
        <Field label="Due date" filled={!!head.dueDate}>
          <StudioDate value={head.dueDate} onChange={(iso) => setHead((h) => ({ ...h, dueDate: iso }))} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Notes" as="textarea" value={head.notes} onChange={(v) => setHead((h) => ({ ...h, notes: v }))} />
        </div>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Total <span className="num font-700 text-slate-900 dark:text-white">{money(total)}</span>
        <span className="text-xs"> — recalculated on the server when you save.</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(body(editing ? undefined : "Received"))}>
          {busy ? "Saving…" : editing ? "Save" : "Record bill"}
        </button>
        {!editing && (
          <button className={btnGhost} disabled={busy || !ready} onClick={() => onSave(body("Draft"))}>Save as draft</button>
        )}
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function BillPaymentForm({ bill, methods, busy, onCancel, onSave }) {
  const [form, setForm] = useState({ amount: String(bill.outstanding), date: "", method: methods[0], note: "" });
  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Record payment — {bill.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{money(bill.outstanding)} outstanding of {money(bill.total)} to {bill.vendorName}.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Amount" type="number" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
        <Field label="Date" filled={!!form.date}>
          <StudioDate value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} />
        </Field>
        <Field label="Method" as="select" value={form.method} onChange={(v) => setForm((f) => ({ ...f, method: v }))} options={methods} />
        <Field label="Note" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />
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

// ============================================================================
// FIXED ASSETS (FINANCE 1b) — the PPE register. Depreciation is DERIVED on the
// server (never stored), so every number a row shows — book value, accumulated,
// monthly charge — arrives ready; the screen only lays it out.
// ============================================================================
const ASSET_METHOD_LABEL = { "straight-line": "Straight line", "reducing-balance": "Reducing balance" };

function Assets({ slug }) {
  const { data, error, busy, send } = useFinanceResource(slug, "assets");

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Fixed Assets…</p>;

  const canManage = data.manage?.["finance-assets"] ?? data.canManage;
  const { assets = [], vocabulary = {}, nav } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <AssetsSummary assets={assets} />
      <div className="flex items-center justify-end">
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>
      <AssetRegister rows={assets} vocab={vocabulary} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
    </div>
  );
}

function AssetsSummary({ assets }) {
  const reg = assetRegister(assets);
  const cells = [
    ["Cost", money(reg.totalCost), ""],
    ["Depreciation", money(reg.totalAccumulated), ""],
    ["Net book value", money(reg.netBookValue), "text-emerald-600 dark:text-emerald-400"],
    ["In service", String(reg.count), ""],
    ["Disposed", String(reg.disposedCount), reg.disposedCount > 0 ? "text-slate-400" : ""],
  ];
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        {cells.map(([name, value, tone]) => (
          <div key={name}>
            <p className={`font-display text-2xl font-800 tabular-nums ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssetRegister({ rows, vocab, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [disposing, setDisposing] = useState(null);
  const [open, setOpen] = useState(null);
  const methods = vocab.assetMethods || Object.keys(ASSET_METHOD_LABEL);

  useEffect(() => { setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);
  useEffect(() => { setDisposing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);

  const form = adding || editing;

  return (
    <>
      {canManage && !form && !disposing && <button className={btn} onClick={() => setAdding(true)}>New asset</button>}

      {form && (
        <AssetForm asset={editing} methods={methods} busy={busy}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => {
            const ok = editing ? await send("PUT", { id: editing.id, ...v }) : await send("POST", v);
            if (ok) { setAdding(false); setEditing(null); }
          }} />
      )}

      {disposing && (
        <DisposeForm asset={disposing} busy={busy}
          onCancel={() => setDisposing(null)}
          onSave={async (v) => { if (await send("PUT", { id: disposing.id, dispose: v })) setDisposing(null); }} />
      )}

      {rows.length === 0 ? <Empty title="No assets yet" body="A fixed asset is something you bought and use over years — a vehicle, a machine, a fit-out. Its value is written down month by month here." /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Asset", "Category", "Cost", "Book value", "Monthly", "Status", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i >= 2 && i <= 4 ? "text-end" : i === 6 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className={td}>
                        <button type="button" className="text-start" onClick={() => setOpen(open === a.id ? null : a.id)}>
                          <span className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300">{a.reference}</span>
                          <span className="ms-2 font-600 text-slate-900 dark:text-white">{a.name}</span>
                        </button>
                      </td>
                      <td className={`${td} text-slate-600 dark:text-slate-300`}>{a.category || "—"}</td>
                      <td className={`${td} text-end tabular-nums text-slate-900 dark:text-white`}>{money(a.cost)}</td>
                      <td className={`${td} text-end tabular-nums text-slate-600 dark:text-slate-300`}>{money(a.bookValue)}</td>
                      <td className={`${td} text-end tabular-nums text-slate-500 dark:text-slate-400`}>{a.disposed ? "—" : money(a.monthlyDepreciation)}</td>
                      <td className={td}>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${a.disposed ? ASSET_STATUS_TONE.disposed : ASSET_STATUS_TONE.service}`}>
                          {a.disposed ? "Disposed" : a.fullyDepreciated ? "Fully depreciated" : "In service"}
                        </span>
                      </td>
                      <td className={`${td} text-end`}>
                        {canManage && (
                          <span className="flex flex-wrap justify-end gap-2">
                            {!a.disposed && <button className={btnGhost} onClick={() => setEditing(a)}>Edit</button>}
                            {!a.disposed && <button className={btnGhost} onClick={() => setDisposing(a)}>Dispose</button>}
                          </span>
                        )}
                      </td>
                    </tr>
                    {open === a.id && (
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <td colSpan={7} className="py-4">
                          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5 sm:grid-cols-3 lg:grid-cols-4">
                            <Detail label="Acquired" value={a.acquiredOn ? fmt(a.acquiredOn) : "—"} />
                            <Detail label="Method" value={ASSET_METHOD_LABEL[a.method] || a.method || "—"} />
                            <Detail label="Useful life" value={`${a.usefulLifeMonths} months`} />
                            <Detail label="Months elapsed" value={String(a.monthsElapsed)} />
                            <Detail label="Salvage value" value={money(a.salvageValue || 0)} num />
                            <Detail label="Accumulated" value={money(a.accumulated)} num />
                            <Detail label="Book value" value={money(a.bookValue)} num />
                            <Detail label="Monthly charge" value={a.disposed ? "—" : money(a.monthlyDepreciation)} num />
                            {a.disposed && <Detail label="Disposed on" value={a.disposedOn ? fmt(a.disposedOn) : "—"} />}
                            {a.disposed && <Detail label="Proceeds" value={money(a.disposalProceeds || 0)} num />}
                            {a.disposed && a.gainOnDisposal != null && (
                              <Detail label={a.gainOnDisposal >= 0 ? "Gain on disposal" : "Loss on disposal"}
                                value={money(Math.abs(a.gainOnDisposal))} num
                                tone={a.gainOnDisposal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
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

function Detail({ label: name, value, num, tone }) {
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{name}</p>
      <p className={`font-600 ${num ? "tabular-nums" : ""} ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function AssetForm({ asset, methods, busy, onCancel, onSave }) {
  const editing = !!asset;
  const [f, setF] = useState({
    name: asset?.name || "",
    category: asset?.category || "",
    cost: asset?.cost != null ? String(asset.cost) : "",
    salvageValue: asset?.salvageValue != null ? String(asset.salvageValue) : "",
    usefulLifeMonths: asset?.usefulLifeMonths != null ? String(asset.usefulLifeMonths) : "",
    method: asset?.method || methods[0] || "straight-line",
    acquiredOn: asset?.acquiredOn || "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ready = f.name.trim() && Number(f.cost) > 0 && Number(f.usefulLifeMonths) > 0;

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{editing ? `Edit asset — ${asset.reference}` : "New asset"}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" required value={f.name} onChange={(v) => set("name", v)} />
        <Field label="Category" value={f.category} onChange={(v) => set("category", v)} />
        <Field label="Method" as="select" value={f.method} onChange={(v) => set("method", v)}
          options={methods.map((m) => ({ value: m, label: ASSET_METHOD_LABEL[m] || m }))} />
        <Field label="Cost" required type="number" value={f.cost} onChange={(v) => set("cost", v)} />
        <Field label="Salvage value" type="number" value={f.salvageValue} hint="What it's worth at end of life" onChange={(v) => set("salvageValue", v)} />
        <Field label="Useful life (months)" required type="number" value={f.usefulLifeMonths} onChange={(v) => set("usefulLifeMonths", v)} />
        <Field label="Acquired on" filled={!!f.acquiredOn}>
          <StudioDate value={f.acquiredOn} onChange={(iso) => set("acquiredOn", iso)} />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready}
          onClick={() => onSave({
            name: f.name, category: f.category, method: f.method, acquiredOn: f.acquiredOn,
            cost: Number(f.cost) || 0,
            salvageValue: Number(f.salvageValue) || 0,
            usefulLifeMonths: Math.max(0, Math.floor(Number(f.usefulLifeMonths) || 0)),
          })}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function DisposeForm({ asset, busy, onCancel, onSave }) {
  const [f, setF] = useState({ disposedOn: "", disposalProceeds: "" });
  const proceeds = Number(f.disposalProceeds) || 0;
  // A live ESTIMATE against today's book value; the server recomputes the book
  // value at the disposal date and returns the exact gain/loss on the row.
  const estimate = proceeds - (asset.bookValue || 0);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Dispose — {asset.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Current book value <span className="num font-600 text-slate-900 dark:text-white">{money(asset.bookValue)}</span>. Disposal stops depreciation on its date.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Disposal date" filled={!!f.disposedOn}>
          <StudioDate value={f.disposedOn} onChange={(iso) => setF((p) => ({ ...p, disposedOn: iso }))} />
        </Field>
        <Field label="Proceeds" type="number" value={f.disposalProceeds} onChange={(v) => setF((p) => ({ ...p, disposalProceeds: v }))} />
      </div>
      <p className={`mt-4 text-sm font-600 ${estimate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        Estimated {estimate >= 0 ? "gain" : "loss"} <span className="num">{money(Math.abs(estimate))}</span>
        <span className="text-xs font-400 text-slate-400"> — exact figure is computed on disposal.</span>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !f.disposedOn}
          onClick={() => onSave({ disposedOn: f.disposedOn, disposalProceeds: proceeds })}>
          {busy ? "Disposing…" : "Dispose"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
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
        <Field label="Search project, client, PO or quotation" type="search" className="w-full sm:max-w-xs"
          value={query} onChange={setQuery} />
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
        <Field label="Quotation" value={row.quotationNumber || "—"} disabled inputProps={{ readOnly: true }} />
        <Field label="Manager" value={row.managerAlias || "—"} disabled inputProps={{ readOnly: true }} />
        <Field label="PO number" value={poNumber} disabled={!canManage} hint="Issued on approval"
          onChange={(v) => setPoNumber(v)} />
        <Field label="Project number" value={projectNumber} disabled={!canManage} hint="Entered by Finance"
          onChange={(v) => setProjectNumber(v)} />
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
