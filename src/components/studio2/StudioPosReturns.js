"use client";

// RETURNS (18/09/2026) — Point of Sale's fifth screen. Find the sale by the
// barcode on its receipt, choose what is coming back, why, and how the money
// goes back, and ask. The ANSWER is given on the Approvals page (19/09/2026);
// this screen shows how far each return's approval has got, and nothing is
// refunded or restocked until it is approved. `docs/functionality/pos.md`.
//
// THE REFUND SHOWN IS THE REFUND PAID: the screen runs the same pure functions
// the server does (modules/sales/posReturnModel), and the server works it out
// again from the stored sale.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posReturnsDict } from "@/shared/studio/posReturns";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Field } from "@/components/fields/Field";
import Link from "next/link";
import { panel, th, btn, btnGhost, btnRow, money, fmtDateTime, loadPref, prefKey } from "@/components/studio2/ui";
import { refundFor, returnTotals } from "@/modules/sales/posReturnModel";
import { PAYMENT_METHODS } from "@/modules/sales/posModel";

const td = "py-2.5 pe-3 align-middle";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// `initial` is the /pos/returns body the studio page answered in its own render,
// so the returns list paints at once; absent, it fetches on mount as before.
export default function StudioPosReturns({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = posReturnsDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/returns`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug]);
  // The loader the page already answered for is skipped by IDENTITY, not by a
  // flag, so React's development double-effect cannot spend it (useReload says
  // why); a new slug builds a new loader and fetches as before.
  const skip = useRef(initial !== undefined ? load : null);
  useEffect(() => {
    if (load === skip.current) return;
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  // Returns are written under their own section; the sales they answer are the
  // till's; how far each approval has got is written under Approvals.
  useLiveUpdates(slug, "pos-returns", load);
  useLiveUpdates(slug, "approvals", load);

  const call = useCallback(async (method, body) => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/pos/returns`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out?.ok) { setError(tr.refusal(out?.error || "", out)); return null; }
    setError("");
    return out;
  }, [slug, tr]);

  if (error === "forbidden" && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refused}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const pending = data.returns.filter((r) => r.status === "Pending");
  const decided = data.returns.filter((r) => r.status !== "Pending");

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {note && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{note}</p>}

      {data.can.create && (
        <TakeReturn slug={slug} tr={tr} tills={data.tills} busy={busy}
          onAsk={async (body) => {
            const out = await call("POST", body);
            if (out) {
              // A return whose approval could not be asked is on file and waiting;
              // the reason is what the cashier needs to hear.
              if (out.approvalProblem) setError(tr.refusal(out.approvalProblem, out));
              setNote(out.return.status === "Approved" ? tr.wentThrough(out.return.number) : tr.asked(out.return.number));
              load();
            }
            return Boolean(out);
          }} />
      )}

      <section className={panel}>
        <h2 className="mb-3 font-display text-lg font-700 text-[var(--geex-ink)]">{tr.pending}</h2>
        {pending.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{tr.pendingEmpty}</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {pending.map((r) => <PendingRow key={r.id} slug={slug} tr={tr} row={r} />)}
          </ul>
        )}
      </section>

      <section className={panel}>
        <h2 className="mb-3 font-display text-lg font-700 text-[var(--geex-ink)]">{tr.recent}</h2>
        {decided.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{tr.recentEmpty}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className={`${td} font-mono`}>{r.number}</td>
                    <td className={td}>{tr.against(r.receiptNumber)}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{fmtDateTime(r.decidedAt || r.requestedAt)}</td>
                    <td className={td}>{tr[r.method]}</td>
                    <td className={`${td} num text-end`}>{money(r.total, r.currency)} {r.currency}</td>
                    <td className={td}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${r.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{tr.status(r.status)}</span>
                    </td>
                    <td className={`${td} text-xs text-slate-500 dark:text-slate-400`}>
                      {tr.askedBy(r.requestedBy)} · {tr.decidedBy(r.decidedBy)}
                      {r.rejectReason ? ` · ${r.rejectReason}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ONE WAITING RETURN: what, why, how much — and how far its approval has got,
// read from the approval. It is answered on the Approvals page.
function PendingRow({ slug, tr, row }) {
  const a = row.approval;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-600 text-[var(--geex-ink)]">
            <span className="font-mono">{row.number}</span> · {tr.against(row.receiptNumber)}
            <span className="ms-2 num">{money(row.total, row.currency)} {row.currency}</span>
            <span className="ms-2 text-sm font-400 text-slate-500 dark:text-slate-400">{tr[row.method]}{row.till ? ` · ${row.till}` : ""}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {row.lines.map((l) => `${l.units} × ${l.description}`).join(", ")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">“{row.reason}” · {tr.askedBy(row.requestedBy)} · {fmtDateTime(row.requestedAt)}</p>
        </div>
        <div className="shrink-0 text-end text-xs text-slate-500 dark:text-slate-400">
          <p>{a ? tr.progress(a.granted, a.required) : tr.waiting}</p>
          <Link href={`/${slug}/approvals`} className="font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.openApprovals}</Link>
        </div>
      </div>
    </li>
  );
}

// FIND THE SALE, CHOOSE WHAT COMES BACK. The box keeps focus for a scanner,
// which types the number and presses Enter.
function TakeReturn({ slug, tr, tills, busy, onAsk }) {
  const [number, setNumber] = useState("");
  const [found, setFound] = useState(null);
  const [missing, setMissing] = useState("");
  const [back, setBack] = useState({});
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [tillId, setTillId] = useState("");
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, []);

  async function find() {
    const typed = number.trim();
    if (!typed) return;
    const res = await fetch(`/api/studios/${slug}/pos/returns?number=${encodeURIComponent(typed)}`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) { setFound(null); setMissing(tr.notFound(typed)); return; }
    setMissing("");
    setFound(out);
    setBack({});
    // THE MONEY GOES BACK THE WAY IT CAME, unless the cashier says otherwise —
    // and an invoice starts on a credit to the account, which needs no drawer.
    setMethod(out.sale.methods?.[0] || "cash");
    // This counter's till, if it is one the studio still has; else the sale's.
    const mine = loadPref(prefKey("pos", slug, "terminal"), "");
    setTillId(tills.some((t) => t.id === mine) ? mine : out.sale.terminalId || tills[0]?.id || "");
  }

  const lines = useMemo(() => {
    if (!found) return [];
    return found.rows
      .map((row) => ({ row, units: Math.min(num(back[row.line]), row.remaining) }))
      .filter((x) => x.units > 0)
      .map(({ row, units }) => ({
        line: row.line, itemId: row.itemId, description: row.description, units,
        refund: refundFor(row, units, found.sale.currency),
        ...(row.taxCategory ? { taxCategory: row.taxCategory } : {}),
      }));
  }, [found, back]);
  const totals = found && lines.length ? returnTotals(lines, found.sale) : null;
  const left = found ? found.rows.some((r) => r.remaining > 0) : false;
  const isInvoice = found?.source === "invoice";
  // WHAT THIS DOCUMENT CAN BE REFUNDED BY: a receipt, the three ways to pay; an
  // invoice, a credit always and money only once some was paid (the server
  // says which).
  const methods = isInvoice ? found.sale.methods : PAYMENT_METHODS;

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-700 text-[var(--geex-ink)]">{tr.take}</h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{tr.takeLead}</p>
      <div className="flex max-w-md items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.findLabel}</span>
          <input ref={box} value={number} autoComplete="off"
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
            className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 font-mono outline-none focus:border-brand-500 dark:border-white/15" />
        </label>
        <button type="button" className={btnGhost} onClick={find}>{tr.find}</button>
      </div>
      {missing && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{missing}</p>}

      {found && (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-600 text-[var(--geex-ink)]">
            {isInvoice
              ? tr.invoiceSale(found.sale.number, found.sale.client, `${money(found.sale.paid, found.sale.currency)} ${found.sale.currency}`)
              : tr.sale(found.sale.number, fmtDateTime(found.sale.at))}
            {" · "}<span className="num">{money(found.sale.total, found.sale.currency)} {found.sale.currency}</span>
          </p>
          {!left ? <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingLeft}</p> : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start">
                    <th className={`${th} text-start`}>{tr.item}</th>
                    <th className={`${th} text-end`}>{tr.sold}</th>
                    <th className={`${th} text-end`}>{tr.returned}</th>
                    <th className={`${th} text-end`}>{tr.back}</th>
                    <th className={`${th} text-end`}>{tr.refund}</th>
                  </tr>
                </thead>
                <tbody>
                  {found.rows.map((row) => {
                    const units = Math.min(num(back[row.line]), row.remaining);
                    return (
                      <tr key={row.line} className="border-t border-slate-100 dark:border-white/5">
                        <td className={td}>
                          {row.description}
                          {isInvoice && !row.itemId && <span className="ms-2 text-xs text-slate-400">{tr.noShelf}</span>}
                        </td>
                        <td className={`${td} num text-end`}>{row.sold}</td>
                        <td className={`${td} num text-end`}>{row.returned || "—"}</td>
                        <td className={`${td} text-end`}>
                          {row.remaining > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" className={btnRow} onClick={() => setBack((b) => ({ ...b, [row.line]: Math.max(0, units - 1) }))}>−</button>
                              <input value={back[row.line] ?? 0} inputMode="decimal" aria-label={`${tr.back} ${row.description}`}
                                onChange={(e) => setBack((b) => ({ ...b, [row.line]: e.target.value }))}
                                className="w-12 rounded border border-slate-200 bg-transparent px-1 text-center dark:border-white/15" />
                              <button type="button" className={btnRow} onClick={() => setBack((b) => ({ ...b, [row.line]: Math.min(row.remaining, units + 1) }))}>+</button>
                            </div>
                          ) : "—"}
                        </td>
                        <td className={`${td} num text-end`}>{units > 0 ? money(refundFor(row, units, found.sale.currency), found.sale.currency) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={tr.reason} value={reason} hint={tr.reasonHint} onChange={setReason} />
                {method !== "credit" && (
                  <Field label={tr.till} as="select" value={tillId} onChange={setTillId}
                    options={tills.map((t) => ({ value: t.id, label: t.name }))} />
                )}
              </div>
              <div>
                <p className="mb-1 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.method}</p>
                <div className="flex flex-wrap items-end gap-2">
                  {methods.map((m) => (
                    <button key={m} type="button" onClick={() => setMethod(m)}
                      className={`${btnRow} ${method === m ? "!border-brand-600 !text-brand-700 dark:!text-brand-300" : ""}`}>{tr[m]}</button>
                  ))}
                  {method !== "cash" && method !== "credit" && <div className="w-56"><Field label={tr.reference} value={reference} onChange={setReference} /></div>}
                </div>
                {method === "credit" && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.creditHint}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/5">
                <p className="font-display text-lg font-700 text-[var(--geex-ink)]">
                  {tr.total} <span className="num">{money(totals?.total || 0, found.sale.currency)} {found.sale.currency}</span>
                </p>
                <button type="button" className={btn} disabled={busy || !lines.length || !reason.trim()}
                  onClick={async () => {
                    const ok = await onAsk({
                      source: found.source, receiptId: found.sale.id, lines: lines.map((l) => ({ line: l.line, units: l.units })),
                      reason, method, ...(reference.trim() && method !== "cash" && method !== "credit" ? { reference: reference.trim() } : {}),
                      ...(method !== "credit" ? { terminalId: tillId } : {}),
                    });
                    if (ok) { setFound(null); setNumber(""); setReason(""); setReference(""); box.current?.focus(); }
                  }}>
                  {busy ? tr.asking : tr.ask}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
