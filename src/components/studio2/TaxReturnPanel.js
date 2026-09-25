"use client";

import { useCallback, useState } from "react";
import { ledgerDict } from "@/shared/studio/ledger";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { useReload } from "@/components/studio2/useReload";
import { moneyText } from "@/shared/money";
import { taxDict } from "@/shared/studio/tax";
import { financeDict } from "@/shared/studio/finance";

// THE TAX RETURN TAB (vat.md) — one period's VAT, read from the documents.
//
// The period starts as whatever the server chose (the previous month) and the
// reader moves either end; each move is a fresh read, because the return is a
// question about a period rather than a list to filter on the screen.

// Through shared/money, which shows a currency's own decimals: this was fixed
// at two places and hid the third decimal of every dinar amount.
const money = (n) => moneyText(n);

export default function TaxReturnPanel({ slug, locale }) {
  const tr = ledgerDict(locale);
  const tax = taxDict(locale);
  const [asked, setAsked] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (asked.from) q.set("from", asked.from);
    if (asked.to) q.set("to", asked.to);
    const res = await fetch(`/api/studios/${slug}/finance/tax?${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug, asked]);

  useReload(load);

  const from = asked.from || data?.from || "";
  const to = asked.to || data?.to || "";
  const move = (patch) => setAsked({ from, to, ...patch });

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;
  // NO VAT, NO RETURN — and the withheld tax to claim is still said, because
  // withholding does not depend on being registered for VAT.
  if (!data.enabled) return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{financeDict(locale).taxNoVat}</p>
      <EInvoicing data={data} slug={slug} locale={locale} onDone={load} />
      <ToClaim rows={data.unclaimedWithholding} locale={locale} slug={slug} canRecord={data.canRecordClaimed} onDone={load} />
      <ToClaim rows={data.unissuedWithholding} locale={locale} slug={slug} canRecord={data.canRecordIssued} onDone={load} side="issue" />
    </div>
  );

  const box = "rounded-geex border border-slate-200 p-4 dark:border-white/10";
  const figures = [
    [tr.output, data.output, 1],
    [tr.credits, data.credits, -1],
    [tr.input, data.input, -1],
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.taxLead}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <Field label={tr.from} filled={!!from}>
          <StudioDate value={from} onChange={(iso) => move({ from: iso })} />
        </Field>
        <Field label={tr.to} filled={!!to}>
          <StudioDate value={to} onChange={(iso) => move({ to: iso })} />
        </Field>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {figures.map(([label, b, sign]) => (
          <div key={label} className={box}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="num mt-1 font-display text-lg font-800 text-slate-900 dark:text-white">
              {sign < 0 && b.vat ? "−" : ""}{money(b.vat)} <span className="text-xs text-slate-400">{data.currency}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tr.taxable} <span className="num">{money(b.net)}</span> · {tr.count(b.count)}
            </p>
            {/* WHAT OF THAT CARRIED NO TAX, by why — a return lists them apart. */}
            {(b.zero > 0 || b.exempt > 0) && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {b.zero > 0 && <>{tax.zero} <span className="num">{money(b.zero)}</span></>}
                {b.zero > 0 && b.exempt > 0 && " · "}
                {b.exempt > 0 && <>{tax.exempt} <span className="num">{money(b.exempt)}</span></>}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={`${box} flex items-baseline justify-between gap-4`}>
        <p className="font-display text-sm font-700 text-slate-900 dark:text-white">
          {data.payable < 0 ? tr.reclaimable : tr.payable}
        </p>
        <p className="num font-display text-xl font-800 text-slate-900 dark:text-white">
          {money(Math.abs(data.payable))} <span className="text-xs text-slate-400">{data.currency}</span>
        </p>
      </div>

      <DocumentTable title={tr.documents} rows={data.rows} tr={tr} empty={tr.noDocuments} />

      {data.foreign.length > 0 && (
        <div>
          <DocumentTable title={tr.foreign} rows={data.foreign} tr={tr} showCurrency />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.foreignLead}</p>
        </div>
      )}
      <EInvoicing data={data} slug={slug} locale={locale} onDone={load} />
      <FileReturn data={data} from={from} to={to} slug={slug} locale={locale} onDone={load} />
      <FiledReturns data={data} slug={slug} locale={locale} onDone={load} />
      <ToClaim rows={data.unclaimedWithholding} locale={locale} slug={slug} canRecord={data.canRecordClaimed} onDone={load} />
      <ToClaim rows={data.unissuedWithholding} locale={locale} slug={slug} canRecord={data.canRecordIssued} onDone={load} side="issue" />
    </div>
  );
}

async function post(slug, body) {
  const res = await fetch(`/api/studios/${slug}/finance/tax`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  // THE DETAIL TOO: an e-invoice that cannot be prepared names the setting to fix.
  return res.ok ? { ok: true, out } : { ok: false, error: String(out.error || "failed"), detail: out.detail ? String(out.detail) : "" };
}

// FILING THE PERIOD ON SCREEN. The ledger's figure is shown beside the
// documents' one, and when they differ the screen says so before anybody files
// — the settlement moves what the LEDGER holds, and a difference means a
// document the books never saw.
function FileReturn({ data, from, to, slug, locale, onDone }) {
  const tr = financeDict(locale);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  if (!data.canFile) return null;
  // A PERIOD ALREADY IN A FILED RETURN IS NOT OFFERED AGAIN — the server
  // refuses the overlap, and a button that can only be refused is noise.
  if ((data.filed || []).some((r) => r.from <= to && from <= r.to)) return null;
  const ledger = data.ledger?.due ?? null;
  const differs = ledger !== null && Math.abs(ledger - data.payable) > 0.0005;
  return (
    <section className="space-y-2 rounded-geex border border-brand-500/40 p-4">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.fileTitle}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.fileLead}</p>
      {ledger !== null && (
        <p className={`text-sm ${differs ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
          {differs ? tr.ledgerDiffers(money(ledger), money(data.payable)) : tr.ledgerSays(money(ledger))}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <span className="w-72"><Field label={tr.authorityRef} value={ref} onChange={setRef} /></span>
        <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50" disabled={busy}
          onClick={async () => {
            setBusy(true); setProblem("");
            const r = await post(slug, { action: "file", from, to, authorityReference: ref });
            setBusy(false);
            if (!r.ok) { setProblem(tr.fileProblem(r.error)); return; }
            setRef(""); await onDone();
          }}>{tr.fileReturn}</button>
      </div>
      {problem && <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p>}
    </section>
  );
}

function FiledReturns({ data, slug, locale, onDone }) {
  const tr = financeDict(locale);
  const rows = data.filed || [];
  const accounts = data.moneyAccounts || [];
  const [accountId, setAccountId] = useState("");
  const [problem, setProblem] = useState("");
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.filedTitle}</h3>
      {rows.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{tr.filedNone}</p> : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-slate-900 dark:text-white">
                {tr.filedRow(r.from, r.to)}
                {r.authorityReference && <span className="ms-2 font-mono text-xs text-slate-500">{r.authorityReference}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">{tr.dueLabel} <span className="num">{money(r.due)}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                  {r.status === "paid" ? tr.statusPaid : tr.statusFiled}
                </span>
                {data.canFile && r.status === "filed" && r.due !== 0 && (
                  <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white" onClick={async () => {
                    setProblem("");
                    const res = await post(slug, { action: "pay", id: r.id, accountId });
                    if (!res.ok) { setProblem(tr.fileProblem(res.error)); return; }
                    await onDone();
                  }}>{tr.payReturn}</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.canFile && accounts.length > 1 && rows.some((r) => r.status === "filed") && (
        <div className="w-72">
          <Field label={tr.throughAccount} as="select" value={accountId} onChange={setAccountId}
            options={accounts.map((a) => ({ value: a.code === "1010" ? "" : a.id, label: `${a.code} ${a.name}` }))} />
        </div>
      )}
      {problem && <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p>}
    </section>
  );
}

function DocumentTable({ title, rows, tr, empty = "", showCurrency = false }) {
  return (
    <section>
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2 pe-4 text-start font-600">{tr.date}</th>
                <th className="py-2 pe-4 text-start font-600">{tr.reference}</th>
                <th className="py-2 pe-4 text-start font-600" />
                <th className="py-2 pe-4 text-end font-600">{tr.taxable}</th>
                <th className="py-2 text-end font-600">{tr.vat}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-slate-100 dark:border-white/5">
                  <td className="num py-2 pe-4">{r.date}</td>
                  <td className="py-2 pe-4 font-mono text-xs">{r.reference}</td>
                  <td className="py-2 pe-4 text-slate-500 dark:text-slate-400">{tr.kind[r.kind]}</td>
                  <td className="num py-2 pe-4 text-end">{money(r.net)}{showCurrency ? ` ${r.currency}` : ""}</td>
                  <td className="num py-2 text-end">{r.kind === "sale" ? "" : "−"}{money(r.vat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// WHAT THE STUDIO CAN RECLAIM — computed since withholding shipped and shown
// nowhere until Tax had a screen (18/09/2026). A list to CHASE: a withheld
// amount is only worth anything once its certificate proves it was paid over.
//
// BOTH SIDES, ONE LIST SHAPE (18/09/2026): the certificates a studio must CHASE
// from clients who withheld (invoices), and the ones it must ISSUE to suppliers
// it withheld from (bills). Recording the number closes the line; it answers to
// the right over the document it is written on.
function ToClaim({ rows = [], locale, slug, canRecord, onDone, side = "claim" }) {
  const tr = financeDict(locale);
  const issue = side === "issue";
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{issue ? tr.toIssueTitle : tr.toClaimTitle}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{issue ? tr.toIssueLead : tr.toClaimLead}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">{issue ? tr.toIssueNone : tr.toClaimNone}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {rows.map((r) => <CertificateRow key={r.id} row={r} tr={tr} slug={slug} kind={issue ? "bills" : "invoices"} canRecord={canRecord} onDone={onDone} />)}
        </ul>
      )}
    </section>
  );
}

function CertificateRow({ row, tr, slug, kind, canRecord, onDone }) {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="font-mono text-slate-900 dark:text-white">{row.reference}</span>
      <span className="flex items-center gap-2">
        <span className="num text-slate-700 dark:text-slate-200">{money(row.amount)}</span>
        {canRecord && (
          <>
            <input className="w-40 rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm dark:border-white/10"
              placeholder={tr.certificateNo} value={ref} onChange={(e) => setRef(e.target.value)} />
            <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white disabled:opacity-50" disabled={busy || !ref.trim()}
              onClick={async () => {
                setBusy(true);
                const res = await fetch(`/api/studios/${slug}/finance/${kind}`, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: row.id, certificateRef: ref.trim() }),
                });
                setBusy(false);
                if (res.ok) await onDone?.();
              }}>{tr.recordCertificate}</button>
          </>
        )}
      </span>
    </li>
  );
}

// E-INVOICING — what the studio's country requires, and the issued invoices it
// still owes the authority. NOMPANY NEVER SUBMITS (the owner's rule,
// 26/09/2026): each row offers the invoice's official FILE to download, which
// the studio submits through the authority's own channel, and a place to
// RECORD what the authority answered — its reference, and its QR where the
// authority issues one (Jordan's), which then prints on the invoice.
function EInvoicing({ data, slug, locale, onDone }) {
  const tr = financeDict(locale);
  const e = data.einvoice;
  const [problem, setProblem] = useState("");
  const [recording, setRecording] = useState(null);
  if (!e || !e.required) return null;

  const download = async (row) => {
    setProblem("");
    const r = await post(slug, { action: "einvoice-prepare", id: row.id });
    if (!r.ok) { setProblem(tr.einvProblem(r.detail || r.error)); return; }
    const doc = r.out.document;
    const url = URL.createObjectURL(new Blob([doc.xml], { type: "application/xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename || `${row.reference}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    await onDone();
  };

  return (
    <section className="space-y-2 rounded-geex border border-slate-200 p-4 dark:border-white/10">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.einvTitle}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.einvRequired(e.system, e.authority, e.mode, e.inForce)}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{e.prepares ? tr.einvHowTo(e.system) : tr.einvNoAdapter(e.system)}</p>
      {e.queue.length === 0 ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">{tr.einvQueueNone}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {e.queue.map((q) => (
            <li key={q.id} className="space-y-2 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-mono text-slate-900 dark:text-white">{q.reference}</span>
                  <span className="ms-2 text-slate-500 dark:text-slate-400">{q.clientName}</span>
                  <span className="ms-2 text-xs text-slate-400">{q.issueDate}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{tr.einvState(q.state)}{q.message ? ` — ${q.message}` : ""}</span>
                  {e.canAct && e.prepares && (
                    <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white" onClick={() => download(q)}>{tr.einvDownload}</button>
                  )}
                  {e.canAct && recording !== q.id && (
                    <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
                      onClick={() => { setProblem(""); setRecording(q.id); }}>{tr.einvRecord}</button>
                  )}
                </span>
              </div>
              {recording === q.id && (
                <RecordAnswer slug={slug} locale={locale} row={q}
                  onCancel={() => setRecording(null)}
                  onDone={async () => { setRecording(null); await onDone(); }}
                  onProblem={(p) => setProblem(tr.einvProblem(p))} />
              )}
            </li>
          ))}
        </ul>
      )}
      {problem && <p className="text-sm text-rose-600 dark:text-rose-300" role="alert">{problem}</p>}
    </section>
  );
}

// WHAT THE AUTHORITY ANSWERED, typed in by the studio. The reference is
// required for an acceptance — it is what somebody quotes back to the tax
// office; the QR is pasted as the authority issued it, and prints from then on.
function RecordAnswer({ slug, locale, row, onCancel, onDone, onProblem }) {
  const tr = financeDict(locale);
  const [form, setForm] = useState({ outcome: "accepted", reference: row.authorityReference || "", qr: "", message: "" });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 dark:bg-white/5">
      <Field label={tr.einvOutcome} as="select" value={form.outcome}
        options={[{ value: "accepted", label: tr.einvState("accepted") }, { value: "rejected", label: tr.einvState("rejected") }]}
        onChange={(v) => set({ outcome: v })} />
      <Field label={tr.einvReference} value={form.reference} onChange={(v) => set({ reference: v })} />
      <Field label={tr.einvQr} hint={tr.einvQrHint} value={form.qr} onChange={(v) => set({ qr: v })} />
      <Field label={tr.einvMessage} value={form.message} onChange={(v) => set({ message: v })} />
      <div className="flex gap-2 sm:col-span-2">
        <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-600 text-white" disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await post(slug, { action: "einvoice-record", id: row.id, ...form });
          setBusy(false);
          if (!r.ok) { onProblem(r.detail || r.error); return; }
          await onDone();
        }}>{tr.einvSave}</button>
        <button className="rounded-lg px-3 py-1.5 text-xs font-600 text-slate-600 dark:text-slate-300" onClick={onCancel}>{tr.einvCancel}</button>
      </div>
    </div>
  );
}
