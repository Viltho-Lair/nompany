"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDict } from "@/shared/studio/pos";
import { taxDict } from "@/shared/studio/tax";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { Field } from "@/components/fields/Field";
import TaxTag from "@/components/studio2/TaxTag";
import { btn, btnGhost, btnRow, btnRowDanger, Dialog, money, fmtDateTime, loadPref, savePref, prefKey } from "@/components/studio2/ui";
import { findByBarcode } from "@/modules/inventory/barcodes";
import { posTotals, settle, PAYMENT_METHODS } from "@/modules/sales/posModel";

// THE TILL — a full-screen page (shared/studioRoute), because a cashier works a
// basket, not a sidebar. `docs/functionality/pos.md` is the file.
//
// EVERYTHING THE SCREEN TOTALS, THE SERVER TOTALS AGAIN with the same pure
// function (modules/sales/posModel), and the server prices the basket from the
// items rather than from this screen — so what is shown is what will be charged,
// and nothing typed here can make it otherwise.
//
// ONLINE ONLY. A sale that cannot reach the server is not a sale.

const card = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] dark:border-white/10";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// A saved preference does not change under a page, so there is nothing to subscribe to.
const noSubscription = () => () => {};

// PRINTING ONLY THE SLIP. Mounted only while a receipt or a report is on screen,
// so no other page's printing is touched by an 80 mm page size.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .pos-print, .pos-print * { visibility: visible !important; }
  .pos-print { position: absolute; inset-inline-start: 0; top: 0; width: 72mm; }
  @page { size: 80mm auto; margin: 4mm; }
}`;

export default function StudioPos({ slug }) {
  const locale = useStudioLocale();
  const tr = posDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState("");
  const [basket, setBasket] = useState([]);
  const [payments, setPayments] = useState([{ method: "cash", amount: "", reference: "" }]);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState(null);
  const [managing, setManaging] = useState(false);

  // THE TILL THIS DEVICE LAST USED, remembered per browser — a counter's
  // computer is that counter's till. Read after hydration (the server has no
  // storage to ask), so the two renders agree.
  const pref = prefKey("pos", slug, "terminal");
  const saved = useSyncExternalStore(noSubscription, () => loadPref(pref, ""), () => "");
  const terminalId = picked || saved;

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) { setError(tr.refusal(out?.error || "", out)); return; }
    setError("");
    setData(out);
  }, [slug, tr]);
  useReload(reload);
  // The till's records are filed under the till's own section.
  useLiveUpdates(slug, "crm-sales-pos", reload);

  const call = useCallback(async (path, method, body) => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/pos${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out?.ok) { setError(tr.refusal(out?.error || "", out)); return null; }
    setError("");
    return out;
  }, [slug, tr]);

  const terminals = data?.terminals || [];
  const active = terminals.filter((t) => t.active !== false);
  const terminal = active.find((t) => t.id === terminalId) || (active.length === 1 ? active[0] : null);
  const shift = terminal ? (data?.openShifts || []).find((s) => s.terminalId === terminal.id) : null;
  const terms = data?.terms;

  const lines = useMemo(() => basket.map((b) => ({
    itemId: b.itemId, description: b.description, packName: b.packName, packQty: b.packQty,
    count: num(b.count), price: num(b.price), taxCategory: b.taxCategory,
  })), [basket]);
  const totals = useMemo(() => (terms ? posTotals(lines, terms) : null), [lines, terms]);

  // ONE CASH ROW FOLLOWS THE TOTAL until somebody types in it, so the common
  // sale — cash, exact or with change — is one key press.
  const paying = payments.map((p, i) => ({
    method: p.method,
    amount: p.amount === "" && i === 0 && payments.length === 1 ? num(totals?.total) : num(p.amount),
    ...(p.reference ? { reference: p.reference } : {}),
  }));
  const settled = totals ? settle(totals.total, paying, terms.currency) : null;
  const paidSoFar = paying.reduce((s, p) => s + p.amount, 0);

  if (!data) {
    return error
      ? <div className="p-8 text-sm text-rose-600 dark:text-rose-300">{error}</div>
      : <ScreenSkeleton />;
  }

  const addHit = (hit, item) => {
    setBasket((rows) => {
      const key = `${hit.itemId}|${hit.pack?.name || ""}`;
      const at = rows.findIndex((r) => r.key === key);
      if (at >= 0) return rows.map((r, i) => (i === at ? { ...r, count: num(r.count) + 1 } : r));
      return [...rows, {
        key, itemId: hit.itemId,
        description: hit.pack ? `${item.name} — ${hit.pack.name}` : item.name,
        packName: hit.pack?.name || "", packQty: hit.qty, count: 1,
        price: hit.price ?? 0, unpriced: hit.price === null,
        taxCategory: item.taxCategory,
      }];
    });
  };

  const choose = (id) => { setPicked(id); savePref(pref, id); };

  async function completeSale() {
    const out = await call("/receipts", "POST", {
      shiftId: shift.id,
      lines: basket.map((b) => ({ itemId: b.itemId, packName: b.packName, count: num(b.count), price: num(b.price) })),
      payments: paying,
    });
    if (!out) return;
    setReceipt(out.receipt);
    setBasket([]);
    setPayments([{ method: "cash", amount: "", reference: "" }]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--geex-bg,transparent)]">
      {(receipt || report) && <style>{PRINT_CSS}</style>}

      {/* THE BAR: which till, which shift, and the way out. */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        <Link href={`/${slug}`} className="text-sm font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400">← {tr.back}</Link>
        <h1 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.title}</h1>
        {active.length > 0 && (
          <div className="w-48">
            <Field label={tr.till} as="select" value={terminal?.id || ""} onChange={choose}
              options={active.map((t) => ({ value: t.id, label: t.name }))} />
          </div>
        )}
        {shift && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tr.shiftOpenedBy(shift.number, fmtDateTime(shift.openedAt))}
          </span>
        )}
        <div className="ms-auto flex flex-wrap gap-2">
          {data.can.manage && <button type="button" className={btnGhost} onClick={() => setManaging(true)}>{tr.settings}</button>}
          {shift && data.can.closeShift && <button type="button" className={btnGhost} onClick={() => setClosing(true)}>{tr.closeShift}</button>}
        </div>
      </header>

      {error && <p className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <main className="flex-1 p-4">
        {!data.hasInventory ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noInventory}</p>
        ) : active.length === 0 ? (
          <NoTills tr={tr} canManage={data.can.manage} busy={busy} onAdd={async (name) => {
            const out = await call("/terminals", "POST", { name });
            if (out) { choose(out.terminal.id); reload(); }
          }} />
        ) : !terminal ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.pickTill}</p>
        ) : !shift ? (
          <OpenShift tr={tr} canSell={data.can.sell} busy={busy} onOpen={async (openingFloat) => {
            const out = await call("/shifts", "POST", { terminalId: terminal.id, openingFloat });
            if (out) reload();
          }} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <section className={`${card} p-4`}>
              <ScanBox tr={tr} items={data.items} onHit={addHit} disabled={!data.can.sell} />
              <Basket tr={tr} rows={basket} currency={terms.currency} canReprice={data.can.discount}
                onChange={(key, patch) => setBasket((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))}
                onRemove={(key) => setBasket((rows) => rows.filter((r) => r.key !== key))} />
              {basket.length > 0 && (
                <button type="button" className={`${btnGhost} mt-3`} onClick={() => setBasket([])}>{tr.clear}</button>
              )}
            </section>

            <aside className={`${card} flex flex-col gap-3 p-4`}>
              <Totals tr={tr} totals={totals} terms={terms} />
              <div>
                <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.pay}</p>
                {payments.map((p, i) => (
                  <div key={i} className="mb-2 space-y-2">
                    <div className="flex gap-1">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m} type="button"
                          className={`${btnRow} ${p.method === m ? "!border-brand-600 !text-brand-700 dark:!text-brand-300" : ""}`}
                          onClick={() => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, method: m } : x)))}>
                          {tr[m]}
                        </button>
                      ))}
                      {payments.length > 1 && (
                        <button type="button" className={`${btnRowDanger} ms-auto`}
                          onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}>{tr.remove}</button>
                      )}
                    </div>
                    <Field label={tr.tendered} type="number" min="0" inputProps={{ step: "0.001" }}
                      value={p.amount === "" && i === 0 && payments.length === 1 ? String(num(totals?.total)) : p.amount}
                      onChange={(v) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
                    {p.method !== "cash" && (
                      <Field label={tr.reference} value={p.reference}
                        onChange={(v) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, reference: v } : x)))} />
                    )}
                  </div>
                ))}
                <button type="button" className={btnGhost}
                  onClick={() => setPayments((ps) => [...ps, { method: "card", amount: String(Math.max(0, num(totals?.total) - paidSoFar)), reference: "" }])}>
                  {tr.addPayment}
                </button>
              </div>
              {settled && (
                <p className="flex justify-between text-sm font-700 text-[var(--geex-ink)]">
                  <span>{settled.problem === "underpaid" ? tr.due : tr.change}</span>
                  <span className="num">
                    {money(settled.problem === "underpaid" ? num(totals.total) - settled.paid : settled.change, terms.currency)} {terms.currency}
                  </span>
                </p>
              )}
              <button type="button" className={`${btn} mt-auto py-3 text-base`}
                disabled={busy || !basket.length || !data.can.sell || !settled || Boolean(settled.problem)}
                onClick={completeSale}>
                {busy ? tr.selling : tr.complete}
              </button>
              {!data.can.sell && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.noSell}</p>}
            </aside>
          </div>
        )}
      </main>

      {receipt && (
        <Dialog title={`${tr.receipt} ${receipt.number}`} onClose={() => setReceipt(null)} width="max-w-[420px]">
          <Receipt tr={tr} receipt={receipt} studio={data.studio} terms={terms}
            tillName={terminals.find((t) => t.id === receipt.terminalId)?.name || ""} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.printReceipt}</button>
            <button type="button" className={btnGhost} onClick={() => setReceipt(null)}>{tr.newSale}</button>
          </div>
        </Dialog>
      )}

      {closing && shift && (
        <CloseShift tr={tr} busy={busy} currency={terms.currency} onCancel={() => setClosing(false)}
          onClose={async (countedCash, notes) => {
            const out = await call("/shifts", "PUT", { id: shift.id, countedCash, notes });
            if (!out) return;
            setClosing(false);
            setReport({ shift: out.shift, report: out.report });
            reload();
          }} />
      )}

      {report && (
        <Dialog title={`${tr.report} ${report.shift.number}`} onClose={() => setReport(null)} width="max-w-[420px]">
          <ShiftReport tr={tr} shift={report.shift} report={report.report} studio={data.studio}
            currency={terms.currency} tillName={terminals.find((t) => t.id === report.shift.terminalId)?.name || ""} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.printReport}</button>
            <button type="button" className={btnGhost} onClick={() => setReport(null)}>{tr.done}</button>
          </div>
        </Dialog>
      )}

      {managing && (
        <Manage tr={tr} data={data} busy={busy} onCancel={() => setManaging(false)}
          onSaveTill={async (t) => { const out = await call("/terminals", t.id ? "PUT" : "POST", t); if (out) reload(); }}
          onSaveSettings={async (s) => { const out = await call("", "PUT", s); if (out) { setManaging(false); reload(); } }} />
      )}
    </div>
  );
}

function NoTills({ tr, canManage, busy, onAdd }) {
  const [name, setName] = useState("");
  return (
    <div className={`${card} mx-auto max-w-md p-6`}>
      <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.noTills}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noTillsLead}</p>
      {canManage && (
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1"><Field label={tr.tillName} value={name} onChange={setName} /></div>
          <button type="button" className={btn} disabled={busy || !name.trim()} onClick={() => onAdd(name.trim())}>{tr.addTill}</button>
        </div>
      )}
    </div>
  );
}

function OpenShift({ tr, canSell, busy, onOpen }) {
  const [float, setFloat] = useState("0");
  return (
    <div className={`${card} mx-auto max-w-md p-6`}>
      <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.noShift}</h2>
      {canSell ? (
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1"><Field label={tr.openingFloat} type="number" min="0" value={float} onChange={setFloat} inputProps={{ step: "0.001" }} /></div>
          <button type="button" className={btn} disabled={busy || float === ""} onClick={() => onOpen(Number(float))}>{tr.openShift}</button>
        </div>
      ) : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noSell}</p>}
    </div>
  );
}

// A SCANNER TYPES AND PRESSES ENTER, so the scan box is an input that keeps the
// focus. A code the studio carries goes straight into the basket; anything else
// is searched by name and SKU, and a single match is added the same way.
function ScanBox({ tr, items, onHit, disabled }) {
  const [code, setCode] = useState("");
  const [matches, setMatches] = useState([]);
  const [miss, setMiss] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const addItem = (item) => {
    onHit({ itemId: item.id, pack: null, qty: 1, price: item.sellPrice > 0 ? item.sellPrice : null }, item);
    setMatches([]); setCode(""); setMiss("");
    ref.current?.focus();
  };

  function submit() {
    const text = code.trim();
    if (!text) return;
    const hit = findByBarcode(items, text);
    if (hit) {
      onHit(hit, items.find((i) => i.id === hit.itemId));
      setCode(""); setMatches([]); setMiss("");
      return;
    }
    const q = text.toLowerCase();
    const found = items.filter((i) => i.name.toLowerCase().includes(q) || String(i.sku || "").toLowerCase().includes(q)).slice(0, 8);
    if (found.length === 1) { addItem(found[0]); return; }
    setMatches(found);
    setMiss(found.length ? "" : tr.notFound(text));
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="pos-scan">{tr.scan}</label>
      <input id="pos-scan" ref={ref} value={code} disabled={disabled} autoComplete="off"
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-lg outline-none focus:border-brand-500 dark:border-white/15" />
      <p className="mt-1 text-xs text-slate-400">{tr.scanHint}</p>
      {miss && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{miss}</p>}
      {matches.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
          {matches.map((i) => (
            <li key={i.id}>
              <button type="button" className="flex w-full justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => addItem(i)}>
                <span>{i.name} <span className="text-xs text-slate-400">{i.sku}</span></span>
                <span className="num">{i.sellPrice > 0 ? money(i.sellPrice) : "—"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Basket({ tr, rows, currency, canReprice, onChange, onRemove }) {
  if (!rows.length) {
    return (
      <div className="py-10 text-center">
        <p className="font-display font-700 text-[var(--geex-ink)]">{tr.basketEmpty}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.basketEmptyLead}</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
          <th className="py-2 text-start">{tr.item}</th>
          <th className="w-28 py-2 text-center">{tr.qty}</th>
          <th className="w-28 py-2 text-end">{tr.price}</th>
          <th className="w-28 py-2 text-end">{tr.amount}</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-slate-100 dark:border-white/5">
            <td className="py-2">{r.description}<TaxTag category={r.taxCategory} /></td>
            <td className="py-2">
              <div className="flex items-center justify-center gap-1">
                <button type="button" className={btnRow} onClick={() => onChange(r.key, { count: Math.max(1, num(r.count) - 1) })}>−</button>
                <input value={r.count} inputMode="decimal" aria-label={tr.qty}
                  onChange={(e) => onChange(r.key, { count: e.target.value })}
                  className="w-12 rounded border border-slate-200 bg-transparent px-1 text-center dark:border-white/15" />
                <button type="button" className={btnRow} onClick={() => onChange(r.key, { count: num(r.count) + 1 })}>+</button>
              </div>
            </td>
            <td className="py-2 text-end">
              {/* A PRICE IS CHANGED ONLY BY WHOEVER MAY — the server ignores a
                  typed price from anybody else and charges the item's. */}
              {canReprice
                ? <input value={r.price} inputMode="decimal" aria-label={tr.price}
                    onChange={(e) => onChange(r.key, { price: e.target.value, unpriced: false })}
                    className="w-24 rounded border border-slate-200 bg-transparent px-1 text-end dark:border-white/15" />
                : r.unpriced
                  ? <span className="text-xs text-amber-700 dark:text-amber-300">{tr.unpriced}</span>
                  : <span className="num">{money(r.price, currency)}</span>}
            </td>
            <td className="num py-2 text-end">{money(num(r.price) * num(r.count), currency)}</td>
            <td className="py-2 text-end">
              <button type="button" className={btnRowDanger} aria-label={tr.remove} onClick={() => onRemove(r.key)}>×</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ tr, totals, terms }) {
  const locale = useStudioLocale();
  const tax = taxDict(locale);
  if (!totals) return null;
  const row = "flex justify-between gap-4 text-sm text-slate-500 dark:text-slate-400";
  return (
    <div className="space-y-1">
      <p className={row}><span>{tr.subtotal}</span><span className="num">{money(totals.subtotal, terms.currency)}</span></p>
      {totals.breakdown.filter((b) => b.rate > 0).map((b) => (
        <p key={`${b.category}:${b.rate}`} className={row}>
          <span>{tr.tax(terms.taxName, b.rate)}</span><span className="num">{money(b.tax, terms.currency)}</span>
        </p>
      ))}
      {totals.breakdown.filter((b) => b.rate === 0 && b.taxable > 0).map((b) => (
        <p key={`${b.category}:0`} className={`${row} text-xs`}>
          <span>{tax.breakdownRow(b.category, 0)}</span><span className="num">{money(b.taxable, terms.currency)}</span>
        </p>
      ))}
      <p className="flex justify-between gap-4 border-t border-slate-200 pt-2 font-display text-2xl font-800 text-[var(--geex-ink)] dark:border-white/10">
        <span>{tr.total}</span>
        <span className="num">{money(totals.total, terms.currency)} <span className="text-sm text-slate-400">{terms.currency}</span></span>
      </p>
      {terms.pricesIncludeTax && <p className="text-xs text-slate-400">{tr.taxIncluded}</p>}
    </div>
  );
}

// THE SLIP, laid out for an 80 mm printer. It prints what the server stored —
// never the basket — so a reprint reads exactly as the first.
function Receipt({ tr, receipt, studio, terms, tillName }) {
  const cur = receipt.currency;
  const line = "flex justify-between gap-2";
  return (
    <div className="pos-print mx-auto max-w-[300px] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[14px] font-bold">{studio.name}</p>
        {studio.legal.map((r) => <p key={r.key}>{r.key}: {r.value}</p>)}
        <p className="mt-1">{tr.receipt} {receipt.number}</p>
        <p>{fmtDateTime(receipt.at)}</p>
        {tillName && <p>{tr.till}: {tillName}</p>}
      </div>
      <hr className="my-2 border-dashed border-black" />
      {receipt.lines.map((l, i) => (
        <div key={i} className="mb-1">
          <p>{l.description}{l.taxCategory ? ` (${taxDictShort(l.taxCategory)})` : ""}</p>
          <p className={line}><span>{l.count} × {money(l.price, cur)}</span><span>{money(l.count * l.price, cur)}</span></p>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.subtotal}</span><span>{money(receipt.subtotal, cur)}</span></p>
      {(receipt.breakdown || []).filter((b) => b.rate > 0).map((b) => (
        <p key={b.rate} className={line}><span>{tr.tax(terms.taxName, b.rate)}</span><span>{money(b.tax, cur)}</span></p>
      ))}
      <p className={`${line} text-[14px] font-bold`}><span>{tr.total}</span><span>{money(receipt.total, cur)} {cur}</span></p>
      {receipt.pricesIncludeTax && <p>{tr.taxIncluded}</p>}
      <hr className="my-2 border-dashed border-black" />
      {receipt.payments.map((p, i) => (
        <p key={i} className={line}><span>{tr.paidBy(p.method)}{p.reference ? ` ${p.reference}` : ""}</span><span>{money(p.amount, cur)}</span></p>
      ))}
      {receipt.change > 0 && <p className={line}><span>{tr.change}</span><span>{money(receipt.change, cur)}</span></p>}
      <p className="mt-3 text-center">{terms.footer || tr.thankYou}</p>
    </div>
  );
}

// The short tag a zero-rated or exempt line carries on a slip, where a chip
// cannot be drawn.
const taxDictShort = (c) => (c === "zero" ? "0%" : c === "exempt" ? "E" : "");

function CloseShift({ tr, busy, currency, onCancel, onClose }) {
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog title={tr.closeShift} onClose={onCancel} width="max-w-[420px]">
      <Field label={`${tr.countedCash} (${currency})`} type="number" min="0" value={counted} onChange={setCounted} inputProps={{ step: "0.001" }} />
      <div className="mt-3"><Field label={tr.closeNotes} as="textarea" value={notes} onChange={setNotes} inputProps={{ rows: 2 }} /></div>
      <div className="mt-4 flex gap-2">
        <button type="button" className={btn} disabled={busy || counted === ""} onClick={() => onClose(Number(counted), notes)}>{tr.closeShift}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </Dialog>
  );
}

function ShiftReport({ tr, shift, report, studio, currency, tillName }) {
  const line = "flex justify-between gap-2";
  const diff = report.difference;
  return (
    <div className="pos-print mx-auto max-w-[300px] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[14px] font-bold">{studio.name}</p>
        <p>{tr.report} {shift.number}</p>
        {tillName && <p>{tr.till}: {tillName}</p>}
        <p>{fmtDateTime(shift.openedAt)} → {fmtDateTime(shift.closedAt)}</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.sales(report.sales)}</span><span>{money(report.total, currency)}</span></p>
      <p className={line}><span>{tr.subtotal}</span><span>{money(report.subtotal, currency)}</span></p>
      {report.byTax.filter((b) => b.rate > 0).map((b) => (
        <p key={b.rate} className={line}><span>{b.rate}%</span><span>{money(b.tax, currency)}</span></p>
      ))}
      <hr className="my-2 border-dashed border-black" />
      {report.byMethod.map((m) => (
        <p key={m.method} className={line}><span>{tr.paidBy(m.method)}</span><span>{money(m.amount, currency)}</span></p>
      ))}
      <p className={line}><span>{tr.changeGiven}</span><span>{money(report.change, currency)}</span></p>
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.openingFloat}</span><span>{money(report.openingFloat, currency)}</span></p>
      <p className={line}><span>{tr.cashTaken}</span><span>{money(report.cashTaken, currency)}</span></p>
      <p className={`${line} font-bold`}><span>{tr.expectedCash}</span><span>{money(report.expectedCash, currency)}</span></p>
      {report.countedCash !== null && (
        <>
          <p className={line}><span>{tr.countedCash}</span><span>{money(report.countedCash, currency)}</span></p>
          <p className={`${line} font-bold`}><span>{tr.difference}</span><span>{money(diff, currency)}</span></p>
          <p className="mt-1 text-center">{diff > 0 ? tr.drawerOver : diff < 0 ? tr.drawerShort : tr.drawerExact}</p>
        </>
      )}
    </div>
  );
}

function Manage({ tr, data, busy, onCancel, onSaveTill, onSaveSettings }) {
  const [name, setName] = useState("");
  const [inclusive, setInclusive] = useState(Boolean(data.terms.pricesIncludeTax));
  const [footer, setFooter] = useState(data.terms.footer || "");
  return (
    <Dialog title={tr.settings} onClose={onCancel} width="max-w-[520px]">
      <ul className="mb-3 space-y-2">
        {data.terminals.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
            <span className={t.active === false ? "text-slate-400 line-through" : ""}>{t.name}</span>
            {t.active !== false && (
              <button type="button" className={btnRowDanger} disabled={busy}
                onClick={() => onSaveTill({ id: t.id, name: t.name, active: false })}>{tr.retire}</button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2">
        <div className="flex-1"><Field label={tr.tillName} value={name} onChange={setName} /></div>
        <button type="button" className={btnGhost} disabled={busy || !name.trim()}
          onClick={() => { onSaveTill({ name: name.trim() }); setName(""); }}>{tr.addTill}</button>
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-600" />
        <span>
          <span className="font-600 text-[var(--geex-ink)]">{tr.pricesIncludeTax}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{tr.pricesIncludeTaxHint}</span>
        </span>
      </label>
      <div className="mt-4"><Field label={tr.footer} value={footer} onChange={setFooter} hint={tr.footerHint} /></div>
      <div className="mt-5 flex gap-2">
        <button type="button" className={btn} disabled={busy} onClick={() => onSaveSettings({ pricesIncludeTax: inclusive, footer })}>{tr.save}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </Dialog>
  );
}
