"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { financeDict } from "@/shared/studio/finance";
import nextDynamic from "next/dynamic";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { StudioDataGridSkeleton } from "@/components/studio2/StudioDataGrid.skeleton";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import FinanceDashboard from "@/components/studio2/FinanceDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { assetRegister } from "@/modules/finance/analytics";
import {
  stripeOn, stripeOff, Dialog, ColumnPicker, prefKey, loadPref, savePref, fmtDate,
} from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";

const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const th = "pb-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "py-3 pe-3 align-middle";

// Invoice / bill / asset status colours now live in the shared StatusPill map
// (kinds "invoice", "bill", "asset"). A bill's Approved wears the brand accent to
// read as "authorised"; Disputed is amber, a warning rather than the rose of
// Cancelled — see StatusPill.jsx.

// The tenant's locale and dd/mm/yyyy, via the one formatter. `fmtDate` already
// treats a date-only string as local midnight, so the `T00:00:00` guard moved
// into it — see companySettings.
const fmt = fmtDate;
const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

// The dense-table grid, loaded in its own async chunk (never folded into this
// department's initial bundle) — see StudioDataGrid's header. The skeleton
// reserves the exact box for eight columns while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={8} pageSize={10} />,
});

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
  const tr = financeDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("invoices");
  useEffect(() => { if (view === "finance-cash") setTab("invoices"); }, [view]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const level = useAnalyticsLevel();

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessFinanceStudio); return; }
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
    if (!res.ok) { setError(message(out, tr)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingFinance}</p>;

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
        {data.canViewDashboard === false ? <Empty title={tr.dashboardIsnYoursSee} body={tr.studioKeepsModuleDashboards} /> : (
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
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-[var(--geex-surface)] text-brand-950 shadow-sm dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
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

// THE DICTIONARY COMES IN AS AN ARGUMENT. This is module scope — there is no
// component here to read the locale from — and every caller already has it.
function message(out, tr) {
  if (out.error === "read-only") return tr.mReadOnly;
  if (out.error === "issued") return tr.mIssued;
  if (out.error === "has-payments") return tr.mHasPayments;
  if (out.error === "overpayment") return tr.mOverpayment(money(out.outstanding));
  if (out.error === "derived-status") return tr.mDerivedStatus;
  if (out.error === "not-issued") return tr.mNotIssued;
  if (out.error === "cancelled") return tr.mCancelled;
  if (out.error === "lines") return tr.mLines;
  if (out.error === "client") return tr.mClient;
  if (out.error === "amount") return tr.mAmount;
  // ---- accounts payable ----------------------------------------------------
  if (out.error === "vendor") return tr.mVendor;
  if (out.error === "same-signer") return tr.mSameSigner;
  if (out.error === "locked") return tr.mLocked;
  if (out.error === "already") return tr.mAlready;
  if (out.error === "not-approved") return tr.mNotApproved;
  if (out.error === "has-history") return tr.mHasHistory;
  if (out.error === "status") return tr.mStatus;
  // ---- fixed assets --------------------------------------------------------
  if (out.error === "name") return tr.mName;
  if (out.error === "cost") return tr.mCost;
  if (out.error === "life") return tr.mLife;
  if (out.error === "disposed") return tr.mDisposed;
  if (out.error === "already-disposed") return tr.mAlreadyDisposed(fmt(out.on));
  if (out.error === "before-acquired") return tr.mBeforeAcquired;
  return tr.mDidntSave;
}

// ---- summary ---------------------------------------------------------------
function Summary({ summary }) {
  const tr = financeDict(useStudioLocale());
  const cells = [
    [tr.sumInvoiced, money(summary.invoiced), ""],
    [tr.sumCollected, money(summary.collected), "text-emerald-600 dark:text-emerald-400"],
    [tr.sumOutstanding, money(summary.outstanding), ""],
    [tr.sumOverdue, money(summary.overdue), summary.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
    [tr.sumExpenses, money(summary.expenses), ""],
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
  const tr = financeDict(useStudioLocale());
  const [drafting, setDrafting] = useState(false);
  const [paying, setPaying] = useState(null);
  const [open, setOpen] = useState(null);

  return (
    <>
      {canManage && !drafting && !paying && <button className={btn} onClick={() => setDrafting(true)}>{tr.newInvoice}</button>}

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

      {rows.length === 0 ? <Empty title={tr.noInvoicesYet} body={tr.invoiceBillsClientProject} /> : (
        <section className={panel}>
          {/* The dense list is a Data Grid now — sortable columns, client-side
              paging — but every cell reproduces the hand-rolled table it
              replaced: the reference toggles the same detail panel (below the
              grid, because the community Data Grid has no master-detail row),
              money stays tabular via `.num`, dates go through `fmt`, the status
              is the shared StatusPill, and the same four row actions gate on
              `canManage`. No column and no action was dropped. */}
          <StudioDataGrid
            rows={rows}
            getRowId={(r) => r.id}
            ariaLabel={tr.invoices}
            emptyLabel={tr.noInvoicesMatch}
            emptyIcon="invoice"
            columns={[
              {
                field: "reference", headerName: tr.invoice, minWidth: 130, flex: 0.9,
                renderCell: ({ row }) => (
                  <button type="button" className="num text-xs text-brand-700 hover:underline dark:text-brand-300"
                    onClick={() => setOpen(open === row.id ? null : row.id)}>
                    {row.reference}
                  </button>
                ),
              },
              {
                field: "clientName", headerName: tr.client, minWidth: 140, flex: 1,
                renderCell: ({ row }) => <span className="text-slate-900 dark:text-white">{row.clientName}</span>,
              },
              {
                field: "projectNumber", headerName: tr.project, minWidth: 120, flex: 0.8,
                renderCell: ({ row }) => (row.projectNumber
                  ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, row.projectId))} title={tr.openProject}>{row.projectNumber}</RecordLink>
                  : <span className="text-slate-400">—</span>),
              },
              {
                field: "dueDate", headerName: tr.due, minWidth: 150, flex: 0.9,
                renderCell: ({ row }) => (
                  <span className={row.overdue ? "font-600 text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}>
                    {fmt(row.dueDate)}{row.overdue && tr.overdueSuffix2}
                  </span>
                ),
              },
              {
                field: "total", headerName: tr.total, type: "number", minWidth: 120, flex: 0.7,
                align: "right", headerAlign: "right",
                renderCell: ({ row }) => <span className="num font-600 text-slate-900 dark:text-white">{money(row.total)}</span>,
              },
              {
                field: "paid", headerName: tr.paid, type: "number", minWidth: 110, flex: 0.7,
                align: "right", headerAlign: "right",
                renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.paid)}</span>,
              },
              {
                field: "status", headerName: tr.status, minWidth: 110, flex: 0.6,
                renderCell: ({ row }) => <StatusPill kind="invoice" status={row.status} />,
              },
              {
                field: "actions", headerName: "", minWidth: 280, flex: 1.2, sortable: false,
                align: "right", headerAlign: "right",
                renderCell: ({ row }) => (canManage ? (
                  <span className="flex items-center justify-end gap-2">
                    {row.status === "Draft" && <button className={btn} disabled={busy} onClick={() => send("invoices", "PUT", { id: row.id, status: "Sent" })}>{tr.send}</button>}
                    {row.status === "Sent" && <button className={btn} onClick={() => setPaying(row)}>{tr.recordPayment}</button>}
                    {row.status !== "Cancelled" && row.status !== "Paid" && row.paid === 0 && (
                      <button className={btnGhost} disabled={busy} onClick={() => send("invoices", "PUT", { id: row.id, status: "Cancelled" })}>{tr.cancel}</button>
                    )}
                    {row.status === "Draft" && <button className={btnDanger} disabled={busy} onClick={() => send("invoices", "DELETE", { id: row.id })}>{tr.delete}</button>}
                  </span>
                ) : null),
              },
            ]}
          />
          {/* The invoice detail — line items, totals and payments — the reference
              button expands. Rendered under the grid rather than as an inline
              row, which the community Data Grid cannot do. */}
          {open != null && (() => {
            const inv = rows.find((r) => r.id === open);
            if (!inv) return null;
            return (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="num text-xs text-slate-500 dark:text-slate-400">{inv.reference}</p>
                  <button type="button" className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300" onClick={() => setOpen(null)}>{tr.close}</button>
                </div>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {inv.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{l.description} × {l.qty}</span>
                      <span className="num">{money(l.qty * l.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-0.5 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
                  <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>{tr.subtotal}</span><span className="num">{money(inv.subtotal)}</span></p>
                  <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>VAT {inv.vatRate}%</span><span className="num">{money(inv.vat)}</span></p>
                  <p className="flex justify-between gap-4 font-700 text-slate-900 dark:text-white"><span>{tr.total}</span><span className="num">{money(inv.total)}</span></p>
                  {inv.outstanding > 0 && inv.status !== "Draft" && (
                    <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>{tr.outstanding}</span><span className="num">{money(inv.outstanding)}</span></p>
                  )}
                </div>
                {(inv.payments || []).length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                    <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.payments}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {inv.payments.map((p) => (
                        <li key={p.id} className="flex justify-between gap-4">
                          <span>{fmt(p.date)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                          <span className="num">{money(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
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
  const tr = financeDict(useStudioLocale());
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, [k]: v } : l)));
  return (
    <div className="mt-5 space-y-3">
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label={tr.description} value={l.description} onChange={(v) => setLine(i, "description", v)} />
          </div>
          <div className="w-24">
            <Field label={tr.qty} type="number" value={l.qty} onChange={(v) => setLine(i, "qty", v)} />
          </div>
          <div className="w-32">
            <Field label={tr.unitPrice} type="number" value={l.unitPrice} onChange={(v) => setLine(i, "unitPrice", v)} />
          </div>
          {lines.length > 1 && <button className={btnGhost} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>{tr.remove}</button>}
        </div>
      ))}
      <button className={btnGhost} onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}>{tr.addLine}</button>
    </div>
  );
}

function InvoiceForm({ projects, defaultVat, busy, onCancel, onSave }) {
  const tr = financeDict(useStudioLocale());
  const [head, setHead] = useState({ projectId: "", clientName: "", vatRate: String(defaultVat), issueDate: "", dueDate: "" });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const filled = filledLines(lines);
  const project = projects.find((p) => p.id === head.projectId);
  const ready = filled.length > 0 && (head.projectId || head.clientName.trim());
  const subtotal = linesSubtotal(lines);
  const total = subtotal * (1 + (Number(head.vatRate) || 0) / 100);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.newInvoice}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tr.project} as="select" value={head.projectId}
          onChange={(v) => setHead((h) => ({ ...h, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} · ${p.clientName}` }))} />
        <Field label={tr.client} value={head.clientName} hint={project?.clientName || undefined}
          onChange={(v) => setHead((h) => ({ ...h, clientName: v }))} />
        <Field label={tr.vat} type="number" value={head.vatRate} onChange={(v) => setHead((h) => ({ ...h, vatRate: v }))} />
        <Field label={tr.dueDate} filled={!!head.dueDate}>
          <StudioDate value={head.dueDate} onChange={(iso) => setHead((h) => ({ ...h, dueDate: iso }))} />
        </Field>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {tr.total} <span className="font-mono font-700 text-slate-900 dark:text-white">{money(total)}</span>
        <span className="text-xs"> {tr.recalculatedServerWhenSave}</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready}
          onClick={() => onSave({ ...head, vatRate: Number(head.vatRate) || 0, lines: filled })}>
          {busy ? tr.saving : tr.saveDraft2}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

function PaymentForm({ invoice, methods, busy, onCancel, onSave }) {
  const tr = financeDict(useStudioLocale());
  const [form, setForm] = useState({ amount: String(invoice.outstanding), date: "", method: methods[0], reference: "" });

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Record payment — {invoice.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{money(invoice.outstanding)} outstanding of {money(invoice.total)}.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tr.amount} type="number" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
        <Field label={tr.date} filled={!!form.date}>
          <StudioDate value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} />
        </Field>
        <Field label={tr.method} as="select" value={form.method} onChange={(v) => setForm((f) => ({ ...f, method: v }))} options={methods} />
        <Field label={tr.reference} value={form.reference} onChange={(v) => setForm((f) => ({ ...f, reference: v }))} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !(Number(form.amount) > 0)} onClick={() => onSave({ ...form, amount: Number(form.amount) })}>
          {busy ? tr.recording : tr.record}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

// ---- expenses --------------------------------------------------------------
function Expenses({ rows, projects, categories, slug, nav, canManage, busy, send }) {
  const tr = financeDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = (row) => [
    { key: "description", label: tr.description, required: true, value: row?.description || "" },
    { key: "amount", label: tr.amount, type: "number", required: true, value: row?.amount || "" },
    { key: "category", label: tr.category, value: row?.category || categories[0], options: categories.map((c) => ({ value: c, text: c })) },
    { key: "date", label: tr.date, type: "date", value: row?.date || "" },
    { key: "projectId", label: tr.project, value: row?.projectId || "",
      options: [{ value: "", text: "— general —" }, ...projects.map((p) => ({ value: p.id, text: p.number }))] },
    { key: "notes", label: tr.notes, area: true, value: row?.notes || "" },
  ];

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>{tr.addExpense}</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? tr.editExpense : tr.newExpense} busy={busy} fields={fields(editing)}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("expenses", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title={tr.noExpensesYet} body={tr.expensesWhatWorkCost} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {[tr.colDate, tr.colDescription, tr.colCategory, tr.colProject, tr.colPaidBy, tr.colAmount, ""].map((h, i) => (
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
                        ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, e.projectId))} title={tr.openProject}>{e.projectNumber}</RecordLink>
                        : <span className="text-slate-400">{tr.general}</span>}
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{e.paidByAlias || "—"}</td>
                    <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>{money(e.amount)}</td>
                    <td className={`${td} text-end`}>
                      {canManage && (
                        <span className="flex flex-wrap justify-end gap-2">
                          <button className={btnGhost} onClick={() => setEditing(e)}>{tr.edit}</button>
                          <button className={btnDanger} disabled={busy} onClick={() => send("expenses", "DELETE", { id: e.id })}>{tr.delete}</button>
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
  const tr = financeDict(useStudioLocale());
  if (rows.length === 0) return <Empty title={tr.noProjectsMeasureYet} body={tr.onceQuotationBecomesProject} />;
  return (
    <section className={panel}>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {tr.valueFromQuotationCost}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {[tr.project, tr.value, tr.sumInvoiced, tr.sumCollected, tr.materials, tr.sumExpenses, tr.margin].map((h, i) => (
                <th key={h} className={`${th} ${i >= 1 ? "text-end" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className={td}>
                  <RecordLink href={linkIf(nav?.projects, linkToProject(slug, p.id))} title={tr.openProject}>{p.number}</RecordLink>
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
  const tr = financeDict(useStudioLocale());
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
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? tr.saving : tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
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
    if (!res.ok) { setError(tr.noAccessThis); return; }
    setData(await res.json()); setError("");
  }, [slug, kind, tr]);
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
    if (!res.ok) { setError(message(out, tr)); return false; }
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
// A FUNCTION OF THE DICTIONARY — module scope cannot read a hook. The keys are
// the stored terms; only what they are CALLED changes.
const termLabel = (tr) => ({
  "on-receipt": tr.termOnReceipt2, "net-0": tr.termNet02, "net-15": tr.termNet152,
  "net-30": tr.termNet302, "net-60": tr.termNet602,
});

function Payables({ slug }) {
  const tr = financeDict(useStudioLocale());
  const { data, error, busy, send } = useFinanceResource(slug, "bills");

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingAccountsPayable}</p>;

  const canManage = data.manage?.["finance-payables"] ?? data.canManage;
  const { bills = [], vocabulary = {}, nav } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <PayablesSummary bills={bills} />
      <div className="flex items-center justify-end">
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
      </div>
      <Bills rows={bills} vocab={vocabulary} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
    </div>
  );
}

function PayablesSummary({ bills }) {
  const tr = financeDict(useStudioLocale());
  const live = bills.filter((b) => b.status !== "Cancelled" && b.status !== "Draft");
  const billed = live.reduce((s, b) => s + (b.total || 0), 0);
  const outstanding = live.reduce((s, b) => s + (b.outstanding || 0), 0);
  const overdue = bills.filter((b) => b.overdue).reduce((s, b) => s + (b.outstanding || 0), 0);
  const awaiting = bills.filter((b) => b.status === "Received").length;
  const cells = [
    [tr.apBilled, money(billed), ""],
    [tr.apOutstanding, money(outstanding), ""],
    [tr.apOverdue, money(overdue), overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
    [tr.apAwaitingApproval, String(awaiting), awaiting > 0 ? "text-amber-600 dark:text-amber-400" : ""],
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
  const tr = financeDict(useStudioLocale());
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [open, setOpen] = useState(null);
  const terms = vocab.billTerms || Object.keys(termLabel(tr));
  const methods = vocab.paymentMethods || [tr.bankTransfer];

  // Keep an open form on the freshly loaded row after a save.
  useEffect(() => { setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);
  useEffect(() => { setPaying((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);

  const form = drafting || editing;

  return (
    <>
      {canManage && !form && !paying && <button className={btn} onClick={() => setDrafting(true)}>{tr.newBill}</button>}

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

      {rows.length === 0 ? <Empty title={tr.noBillsYet} body={tr.billWhatOweVendor} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {[tr.colBill, tr.colVendor, tr.colDue, tr.total, tr.colOutstanding, tr.colStatus, ""].map((h, i) => (
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
                        <td className={td}><StatusPill kind="bill" status={b.status} /></td>
                        <td className={`${td} text-end`}>
                          {canManage && (
                            <span className="flex flex-wrap justify-end gap-2">
                              {b.status === "Draft" && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Received" })}>{tr.markReceived}</button>}
                              {approvable && <button className={btn} disabled={busy} onClick={() => send("PUT", { id: b.id, approve: true })}>{tr.approve}</button>}
                              {payable && <button className={btn} onClick={() => setPaying(b)}>{tr.recordPayment}</button>}
                              {editable && <button className={btnGhost} onClick={() => setEditing(b)}>{tr.edit}</button>}
                              {b.status === "Received" && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Disputed" })}>{tr.dispute}</button>}
                              {["Received", "Disputed"].includes(b.status) && noHistory && <button className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: b.id, status: "Cancelled" })}>{tr.cancel}</button>}
                              {editable && <button className={btnDanger} disabled={busy} onClick={() => send("DELETE", { id: b.id })}>{tr.delete}</button>}
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
                                <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>{tr.subtotal}</span><span className="num">{money(b.subtotal)}</span></p>
                                <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>VAT {b.vatRate}%</span><span className="num">{money(b.vat)}</span></p>
                                <p className="flex justify-between gap-4 font-700 text-slate-900 dark:text-white"><span>{tr.total}</span><span className="num">{money(b.total)}</span></p>
                                {b.outstanding > 0 && b.status !== "Draft" && (
                                  <p className="flex justify-between gap-4 text-slate-500 dark:text-slate-400"><span>{tr.outstanding}</span><span className="num">{money(b.outstanding)}</span></p>
                                )}
                              </div>
                              <p className="mt-3 text-xs text-slate-400">
                                {tr.billedOn} {b.billDate ? fmt(b.billDate) : "—"} · {tr.termsLabel} {termLabel(tr)[b.terms] || b.terms || "—"}
                              </p>
                              {b.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{b.notes}</p>}
                              {(b.payments || []).length > 0 && (
                                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                                  <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.payments}</p>
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
  const tr = financeDict(useStudioLocale());
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
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{editing ? `Edit bill — ${bill.reference}` : tr.newBill}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tr.vendor} required value={head.vendorName} onChange={(v) => setHead((h) => ({ ...h, vendorName: v }))} />
        <Field label={tr.terms} as="select" value={head.terms} onChange={(v) => setHead((h) => ({ ...h, terms: v }))}
          options={terms.map((term) => ({ value: term, label: termLabel(tr)[term] || term }))} />
        <Field label={tr.vat} type="number" value={head.vatRate} onChange={(v) => setHead((h) => ({ ...h, vatRate: v }))} />
        <Field label={tr.billDate} filled={!!head.billDate}>
          <StudioDate value={head.billDate} onChange={(iso) => setHead((h) => ({ ...h, billDate: iso }))} />
        </Field>
        <Field label={tr.dueDate} filled={!!head.dueDate}>
          <StudioDate value={head.dueDate} onChange={(iso) => setHead((h) => ({ ...h, dueDate: iso }))} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={tr.notes} as="textarea" value={head.notes} onChange={(v) => setHead((h) => ({ ...h, notes: v }))} />
        </div>
      </div>

      <LineItemsEditor lines={lines} setLines={setLines} />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {tr.total} <span className="num font-700 text-slate-900 dark:text-white">{money(total)}</span>
        <span className="text-xs"> {tr.recalculatedServerWhenSave}</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(body(editing ? undefined : tr.received))}>
          {busy ? tr.saving : editing ? tr.save : tr.recordBill}
        </button>
        {!editing && (
          <button className={btnGhost} disabled={busy || !ready} onClick={() => onSave(body("Draft"))}>{tr.saveDraft}</button>
        )}
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

function BillPaymentForm({ bill, methods, busy, onCancel, onSave }) {
  const tr = financeDict(useStudioLocale());
  const [form, setForm] = useState({ amount: String(bill.outstanding), date: "", method: methods[0], note: "" });
  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Record payment — {bill.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{money(bill.outstanding)} outstanding of {money(bill.total)} to {bill.vendorName}.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tr.amount} type="number" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
        <Field label={tr.date} filled={!!form.date}>
          <StudioDate value={form.date} onChange={(iso) => setForm((f) => ({ ...f, date: iso }))} />
        </Field>
        <Field label={tr.method} as="select" value={form.method} onChange={(v) => setForm((f) => ({ ...f, method: v }))} options={methods} />
        <Field label={tr.note} value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !(Number(form.amount) > 0)} onClick={() => onSave({ ...form, amount: Number(form.amount) })}>
          {busy ? tr.recording : tr.record}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

// ============================================================================
// FIXED ASSETS (FINANCE 1b) — the PPE register. Depreciation is DERIVED on the
// server (never stored), so every number a row shows — book value, accumulated,
// monthly charge — arrives ready; the screen only lays it out.
// ============================================================================
// The STORED value is the hyphenated key; the words beside it are display.
const assetMethodLabel = (tr) => ({ "straight-line": tr.straightLine, "reducing-balance": tr.reducingBalance });

function Assets({ slug }) {
  const tr = financeDict(useStudioLocale());
  const { data, error, busy, send } = useFinanceResource(slug, "assets");

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingFixedAssets}</p>;

  const canManage = data.manage?.["finance-assets"] ?? data.canManage;
  const { assets = [], vocabulary = {}, nav } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <AssetsSummary assets={assets} />
      <div className="flex items-center justify-end">
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
      </div>
      <AssetRegister rows={assets} vocab={vocabulary} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
    </div>
  );
}

function AssetsSummary({ assets }) {
  const tr = financeDict(useStudioLocale());
  const reg = assetRegister(assets);
  const cells = [
    [tr.cost, money(reg.totalCost), ""],
    [tr.depreciation, money(reg.totalAccumulated), ""],
    [tr.netBookValue, money(reg.netBookValue), "text-emerald-600 dark:text-emerald-400"],
    [tr.inService, String(reg.count), ""],
    [tr.disposed, String(reg.disposedCount), reg.disposedCount > 0 ? "text-slate-400" : ""],
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
  const tr = financeDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [disposing, setDisposing] = useState(null);
  const [open, setOpen] = useState(null);
  const methods = vocab.assetMethods || Object.keys(assetMethodLabel(tr));

  useEffect(() => { setEditing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);
  useEffect(() => { setDisposing((cur) => (cur ? rows.find((r) => r.id === cur.id) || null : null)); }, [rows]);

  const form = adding || editing;

  return (
    <>
      {canManage && !form && !disposing && <button className={btn} onClick={() => setAdding(true)}>{tr.newAsset}</button>}

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

      {rows.length === 0 ? <Empty title={tr.noAssetsYet} body={tr.fixedAssetSomethingBought} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {[tr.colAsset, tr.colCategory, tr.cost, tr.colBookValue, tr.colMonthly, tr.colStatus, ""].map((h, i) => (
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
                        <StatusPill kind="asset" status={a.disposed ? "disposed" : "service"}
                          label={a.disposed ? tr.disposed2 : a.fullyDepreciated ? tr.fullyDepreciated : tr.service} />
                      </td>
                      <td className={`${td} text-end`}>
                        {canManage && (
                          <span className="flex flex-wrap justify-end gap-2">
                            {!a.disposed && <button className={btnGhost} onClick={() => setEditing(a)}>{tr.edit}</button>}
                            {!a.disposed && <button className={btnGhost} onClick={() => setDisposing(a)}>{tr.dispose}</button>}
                          </span>
                        )}
                      </td>
                    </tr>
                    {open === a.id && (
                      <tr className="border-b border-slate-100 dark:border-white/5">
                        <td colSpan={7} className="py-4">
                          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5 sm:grid-cols-3 lg:grid-cols-4">
                            <Detail label={tr.acquired} value={a.acquiredOn ? fmt(a.acquiredOn) : "—"} />
                            <Detail label={tr.method} value={assetMethodLabel(tr)[a.method] || a.method || "—"} />
                            <Detail label={tr.usefulLife} value={`${a.usefulLifeMonths} months`} />
                            <Detail label={tr.monthsElapsed} value={String(a.monthsElapsed)} />
                            <Detail label={tr.salvageValue} value={money(a.salvageValue || 0)} num />
                            <Detail label={tr.accumulated} value={money(a.accumulated)} num />
                            <Detail label={tr.bookValue} value={money(a.bookValue)} num />
                            <Detail label={tr.monthlyCharge} value={a.disposed ? "—" : money(a.monthlyDepreciation)} num />
                            {a.disposed && <Detail label={tr.disposed} value={a.disposedOn ? fmt(a.disposedOn) : "—"} />}
                            {a.disposed && <Detail label={tr.proceeds} value={money(a.disposalProceeds || 0)} num />}
                            {a.disposed && a.gainOnDisposal != null && (
                              <Detail label={a.gainOnDisposal >= 0 ? tr.gainDisposal : tr.lossDisposal}
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
  const tr = financeDict(useStudioLocale());
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
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{editing ? `Edit asset — ${asset.reference}` : tr.newAsset}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.name} required value={f.name} onChange={(v) => set("name", v)} />
        <Field label={tr.category} value={f.category} onChange={(v) => set("category", v)} />
        <Field label={tr.method} as="select" value={f.method} onChange={(v) => set("method", v)}
          options={methods.map((m) => ({ value: m, label: assetMethodLabel(tr)[m] || m }))} />
        <Field label={tr.cost} required type="number" value={f.cost} onChange={(v) => set("cost", v)} />
        <Field label={tr.salvageValue} type="number" value={f.salvageValue} hint={tr.whatWorthEndLife} onChange={(v) => set("salvageValue", v)} />
        <Field label={tr.usefulLifeMonths} required type="number" value={f.usefulLifeMonths} onChange={(v) => set("usefulLifeMonths", v)} />
        <Field label={tr.acquired2} filled={!!f.acquiredOn}>
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
          {busy ? tr.saving : tr.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}

function DisposeForm({ asset, busy, onCancel, onSave }) {
  const tr = financeDict(useStudioLocale());
  const [f, setF] = useState({ disposedOn: "", disposalProceeds: "" });
  const proceeds = Number(f.disposalProceeds) || 0;
  // A live ESTIMATE against today's book value; the server recomputes the book
  // value at the disposal date and returns the exact gain/loss on the row.
  const estimate = proceeds - (asset.bookValue || 0);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.dispose} — {asset.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {tr.currentBookValue} <span className="num font-600 text-slate-900 dark:text-white">{money(asset.bookValue)}</span>{tr.disposalStopsDepreciation}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.disposalDate} filled={!!f.disposedOn}>
          <StudioDate value={f.disposedOn} onChange={(iso) => setF((p) => ({ ...p, disposedOn: iso }))} />
        </Field>
        <Field label={tr.proceeds} type="number" value={f.disposalProceeds} onChange={(v) => setF((p) => ({ ...p, disposalProceeds: v }))} />
      </div>
      <p className={`mt-4 text-sm font-600 ${estimate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        Estimated {estimate >= 0 ? "gain" : "loss"} <span className="num">{money(Math.abs(estimate))}</span>
        <span className="text-xs font-400 text-slate-400"> {tr.exactFigureComputedDisposal}</span>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !f.disposedOn}
          onClick={() => onSave({ disposedOn: f.disposedOn, disposalProceeds: proceeds })}>
          {busy ? tr.disposing : tr.dispose}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
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
  { key: "poNumber", labelKey: "colPoNumber", core: true },
  { key: "quotationNumber", labelKey: "colQuotation", core: true },
  { key: "title", labelKey: "colProject", core: true },
  { key: "clientName", labelKey: "colClient", core: true },
  { key: "value", labelKey: "colValue", core: true, money: true, end: true },
  { key: "projectNumber", labelKey: "colProjectNumber", core: true },
  { key: "managerAlias", labelKey: "colManager", core: true },
  { key: "number", labelKey: "colRef", core: false },
  { key: "stage", labelKey: "colStage", core: false },
  { key: "location", labelKey: "colLocation", core: false },
  { key: "endDate", labelKey: "colTargetEnd", core: false, date: true },
  { key: "invoiced", labelKey: "colInvoiced", core: false, money: true, end: true },
  { key: "collected", labelKey: "colCollected", core: false, money: true, end: true },
  { key: "uninvoiced", labelKey: "colUninvoiced", core: false, money: true, end: true },
  { key: "cost", labelKey: "colCost", core: false, money: true, end: true },
  { key: "margin", labelKey: "colMargin", core: false, money: true, end: true },
];
// KEY AND FLAGS ARE LANGUAGE-INDEPENDENT, the label is not — which is why the
// list stores a dictionary key and the label is attached at render. A saved
// column preference is a list of `key`, so it survives a language switch.
const withLabels = (tr) => FINANCE_COLUMNS.map((c) => ({ ...c, label: tr[c.labelKey] }));

const DEFAULT_FINANCE_COLUMNS = FINANCE_COLUMNS.filter((c) => c.core).map((c) => c.key);

function FinanceProjects({ rows, slug, nav, canManage, busy, onSave }) {
  const tr = financeDict(useStudioLocale());
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
  const visible = withLabels(tr).filter((c) => columns.includes(c.key));

  if (rows.length === 0) {
    return <Empty title={tr.nothingAccountYet} body={tr.projectsOpenApprovedQuotation} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Field label={tr.searchProjectClientPo} type="search" className="w-full sm:max-w-xs"
          value={query} onChange={setQuery} />
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["all", tr.all], ["issued", tr.poIssued], ["awaiting", tr.awaitingPo]].map(([k, text]) => (
            <button key={k} type="button" onClick={() => setPoFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-600 transition-colors ${poFilter === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {text}
            </button>
          ))}
        </div>
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>{tr.columns}</button>
      </div>

      {showColumns && (
        <ColumnPicker title={tr.financeColumns} columns={withLabels(tr)} selected={columns}
          onToggle={toggleCol} onReset={resetCols} onClose={() => setShowColumns(false)} />
      )}

      {editing && (
        <Dialog title={editing.title} description={`${editing.clientName || "—"} · ${money(editing.value)}`}
          onClose={closeEditing} width="max-w-[560px]">
          <Commercials row={editing} busy={busy} canManage={canManage} onCancel={closeEditing}
            onSave={async (patch) => { if (await onSave({ id: editing.id, ...patch })) setEditing(null); }} />
        </Dialog>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nProjectsOf(shown.length, rows.length)}</p>

      <section className={panel}>
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{tr.nothingMatches}</p>
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
                          ? <RecordLink href={linkIf(nav?.projects, linkToProject(slug, r.id))} title={tr.openProject}>{r.number}</RecordLink>
                          : cell(r, c)}
                      </td>
                    ))}
                    <td className={`${td} text-end`}>
                      <button className={btnGhost} onClick={() => setEditing(r)}>{canManage ? tr.edit : tr.view}</button>
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
  const tr = financeDict(useStudioLocale());
  const [poNumber, setPoNumber] = useState(row.poNumber || "");
  const [projectNumber, setProjectNumber] = useState(row.projectNumber || "");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.quotation} value={row.quotationNumber || "—"} disabled inputProps={{ readOnly: true }} />
        <Field label={tr.manager} value={row.managerAlias || "—"} disabled inputProps={{ readOnly: true }} />
        <Field label={tr.poNumber} value={poNumber} disabled={!canManage} hint={tr.issuedApproval}
          onChange={(v) => setPoNumber(v)} />
        <Field label={tr.projectNumber} value={projectNumber} disabled={!canManage} hint={tr.enteredFinance}
          onChange={(v) => setProjectNumber(v)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[[tr.colValue, row.value], [tr.colInvoiced, row.invoiced], [tr.colCollected, row.collected], [tr.colMargin, row.margin]].map(([name, v]) => (
          <div key={name} className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
            <p className={label}>{name}</p>
            <p className="font-display text-base font-800 tabular-nums text-slate-900 dark:text-white">{money(v)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        {canManage && (
          <button className={btn} disabled={busy} onClick={() => onSave({ poNumber, projectNumber })}>
            {busy ? tr.saving : tr.save}
          </button>
        )}
        <button className={btnGhost} onClick={onCancel}>{tr.close}</button>
      </div>
    </>
  );
}
