"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { btn, btnGhost, input, label, money } from "@/components/studio2/ui";
import { Icon } from "@/components/studio2/icons";
import Combo from "@/components/studio2/Combo";
import { MAX_TABLES, MAX_TABLE_ROWS, netUnitPrice } from "@/lib/quotations";

// The Quotation Builder: the full screen where a quotation is actually built.
//
// It takes the whole viewport rather than a dialog because building a quotation
// is the task, not a detour from the list behind it — and a table of priced
// lines needs the width.
//
// The quotation carries its OWN setup: which tables it is divided into, the
// rows in each and a quantity per row. Nothing here is a studio-wide template,
// so two quotations for the same client can be laid out differently.

const uid = () => Math.random().toString(36).slice(2, 9);
const blankRow = () => ({ id: uid(), itemId: "", description: "", image: "", unit: "", qty: 1, unitPrice: 0, discount: 0 });
const blankTable = () => ({ id: uid(), title: "", rows: [blankRow()] });

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// A cell that holds a number but is typed as text: forcing an <input
// type="number"> back to a number on every keystroke fights whoever is halfway
// through typing "1.5".
const cell = "w-full rounded-geex border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white";

export default function QuotationBuilder({ quote, catalogue = [], currency = "", canManage, onSave, onClose }) {
  const locked = Boolean(quote.locked) || !canManage;
  const [tables, setTables] = useState(() => {
    const stored = Array.isArray(quote.tables) ? quote.tables : [];
    return stored.length
      ? stored.map((t) => ({ ...t, rows: (t.rows || []).map((r) => ({ ...r })) }))
      : [blankTable()];
  });
  const [vatRate, setVatRate] = useState(num(quote.vatRate));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");

  // Opening the builder is what makes a New quotation a Draft. Reported once,
  // on arrival — the server decides whether that actually changes anything, so
  // reopening a finished quotation does not reset it.
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || locked || quote.status !== "New") return;
    announced.current = true;
    onSave({ opened: true });
  }, [locked, quote.status, onSave]);

  const setTable = (i, patch) =>
    setTables((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const setRow = (i, k, patch) =>
    setTables((ts) => ts.map((t, j) => (j === i
      ? { ...t, rows: t.rows.map((r, m) => (m === k ? { ...r, ...patch } : r)) }
      : t)));

  // Registered Items, by name — what somebody types. THIS PICKER NEVER CREATES
  // ANYTHING: an unlisted line is quoted on this document and nowhere else, so
  // the catalogue stays something Inventory owns.
  const itemNames = useMemo(() => catalogue.map((i) => i.name), [catalogue]);
  const itemByName = useMemo(
    () => Object.fromEntries(catalogue.map((i) => [i.name.toLowerCase(), i])), [catalogue]);

  // Picking a registered item brings its UNIT and PRICE across, so neither is
  // asked for. Both are COPIED onto the line rather than looked up later: a
  // quotation is a document somebody was given, and re-pricing it from today's
  // catalogue would rewrite what was quoted last month.
  const pickItem = (i, k, name) => {
    const found = itemByName[String(name).trim().toLowerCase()];
    setRow(i, k, found
      ? { description: name, itemId: found.id, unit: found.unit || "", unitPrice: found.unitPrice || 0, image: found.image || "" }
      : { description: name, itemId: "", unit: "", unitPrice: 0, image: "" });
  };

  const totals = useMemo(() => {
    const subtotal = tables.reduce((sum, t) =>
      sum + t.rows.reduce((s, r) => s + num(r.qty) * netUnitPrice(r), 0), 0);
    const vat = subtotal * (num(vatRate) / 100);
    return { subtotal, vat, total: subtotal + vat };
  }, [tables, vatRate]);

  const lines = tables.reduce((n, t) => n + t.rows.filter((r) => r.description.trim()).length, 0);

  async function commit(status) {
    setBusy(true);
    // Submit is the only thing that finishes a quotation. Save deliberately
    // sends no status, which leaves the server to keep it a Draft.
    const ok = await onSave(status ? { tables, vatRate, status } : { tables, vatRate });
    setBusy(false);
    if (ok === false) return;
    setSaved(status ? "submitted" : "saved");
    if (status) onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50 dark:bg-[#0b1020]">
      {/* ---------------------------------------------------------- header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-white/5">
        <button className="rounded-geex p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
          onClick={onClose} aria-label="Close the builder">
          <Icon name="close" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-700 text-slate-900 dark:text-white">
            {quote.title || "Quotation"}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{quote.number}</span>
            {quote.clientName ? ` · ${quote.clientName}` : ""} · {quote.status}
          </p>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {locked ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {quote.locked ? "Locked — view only" : "View only"}
            </span>
          ) : (
            <>
              <button className={btnGhost} onClick={() => commit(null)} disabled={busy}>
                {busy ? "Saving…" : saved === "saved" ? "Saved" : "Save"}
              </button>
              {/* Submitting is what marks it Completed, so it says what it does
                  rather than leaving somebody to set a status afterwards. */}
              <button className={btn} onClick={() => commit("Completed")} disabled={busy || !lines}>
                Submit
              </button>
            </>
          )}
        </div>
      </header>

      {!locked && !catalogue.length && (
        <p className="border-b border-slate-200 bg-slate-100 px-5 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Nothing in Registered Items yet — lines can still be typed, and typing one here does not register it.
        </p>
      )}

      {!locked && !lines && (
        <p className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-2 text-xs text-amber-700 dark:text-amber-300">
          Add at least one described line before submitting.
        </p>
      )}

      {/* ----------------------------------------------------------- tables */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {tables.map((table, i) => {
            const sum = table.rows.reduce((s, r) => s + num(r.qty) * netUnitPrice(r), 0);
            return (
              <section key={table.id} className="rounded-geex border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <input
                    className={`${input} font-600`}
                    value={table.title}
                    disabled={locked}
                    placeholder={`Table ${i + 1} — what this section covers`}
                    aria-label={`Table ${i + 1} title`}
                    onChange={(e) => setTable(i, { title: e.target.value })}
                  />
                  {!locked && tables.length > 1 && (
                    <button className="shrink-0 px-1.5 text-slate-400 transition-colors hover:text-rose-600"
                      aria-label={`Remove table ${i + 1}`}
                      onClick={() => setTables((ts) => ts.filter((_, j) => j !== i))}>×</button>
                  )}
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                        <th className="w-14 py-2 pe-3 text-start font-600"><span className="sr-only">Item image</span></th>
                        <th className="py-2 pe-3 text-start font-600">Item</th>
                        <th className="w-20 py-2 pe-3 text-start font-600">Unit</th>
                        <th className="w-24 py-2 pe-3 text-start font-600">Qty</th>
                        <th className="w-28 py-2 pe-3 text-end font-600">Unit price</th>
                        <th className="w-28 py-2 pe-3 text-start font-600">Discount</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, k) => (
                        <tr key={row.id} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
                          {/* The picture registered against the item, copied
                              onto the line with everything else so the document
                              still shows what was quoted if the catalogue entry
                              later changes. */}
                          <td className="py-1.5 pe-3">
                            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {row.image
                                ? <img src={row.image} alt="" className="h-full w-full object-cover" />
                                : <Icon name="services" className="h-4 w-4 text-slate-300" />}
                            </span>
                          </td>
                          <td className="py-1.5 pe-3">
                            <Combo value={row.description} options={itemNames} disabled={locked}
                              placeholder="What is being quoted"
                              inputClassName={cell}
                              onChange={(v) => pickItem(i, k, v)} />
                          </td>
                          {/* Unit and price BELONG TO THE ITEM, so they are
                              shown rather than asked for. A line typed instead
                              of picked has neither, and reads as a dash. */}
                          <td className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">
                            {row.unit || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-1.5 pe-3">
                            <input className={cell} value={row.qty} disabled={locked} inputMode="decimal"
                              aria-label={`Table ${i + 1} row ${k + 1} quantity`}
                              onChange={(e) => setRow(i, k, { qty: e.target.value })} />
                          </td>
                          <td className="py-1.5 pe-3 text-end font-mono text-xs text-slate-600 dark:text-slate-300">
                            {row.itemId || num(row.unitPrice)
                              ? <>{money(num(row.unitPrice))} <span className="text-slate-400">{currency}</span></>
                              : <span className="font-sans text-slate-400">—</span>}
                          </td>
                          <td className="py-1.5 pe-3">
                            <input className={cell} value={row.discount ?? 0} disabled={locked} inputMode="decimal"
                              aria-label={`Table ${i + 1} row ${k + 1} discount per unit`}
                              onChange={(e) => setRow(i, k, { discount: e.target.value })} />
                          </td>
                          <td className="py-1.5 text-end">
                            {!locked && table.rows.length > 1 && (
                              <button className="px-1 text-slate-400 transition-colors hover:text-rose-600"
                                aria-label={`Remove row ${k + 1} of table ${i + 1}`}
                                onClick={() => setTables((ts) => ts.map((t, j) => (j === i ? { ...t, rows: t.rows.filter((_, m) => m !== k) } : t)))}>×</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {!locked && table.rows.length < MAX_TABLE_ROWS ? (
                    <button className={btnGhost}
                      onClick={() => setTable(i, { rows: [...table.rows, blankRow()] })}>Add row</button>
                  ) : <span />}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Table total <span className="font-mono font-600 text-slate-700 dark:text-slate-200">{money(sum)}</span>
                    {currency && <span className="ms-1 text-slate-400">{currency}</span>}
                  </p>
                </div>
              </section>
            );
          })}

          {!locked && tables.length < MAX_TABLES && (
            <button className={btnGhost} onClick={() => setTables((ts) => [...ts, blankTable()])}>
              Add table
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- totals */}
      {/* Three lines, in the order the document reads: what the work comes to,
          what the tax on it is, and what the client owes. The VAT rate sits
          inside its own line because it is the one figure here that is typed
          rather than added up. */}
      <footer className="border-t border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto max-w-5xl">
          <p className="mb-1 text-xs text-slate-400">{lines} line{lines === 1 ? "" : "s"}</p>
          <dl className="ms-auto w-full max-w-sm space-y-1 text-sm">
            <div className="flex items-baseline gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Subtotal</dt>
              <dd className="ms-auto font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {money(totals.subtotal)} <span className="text-slate-400">{currency}</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <label htmlFor="qb-vat">VAT %</label>
                <input id="qb-vat" className={`${cell} w-16`} value={vatRate} disabled={locked} inputMode="decimal"
                  onChange={(e) => setVatRate(e.target.value)} />
              </dt>
              <dd className="ms-auto font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {money(totals.vat)} <span className="text-slate-400">{currency}</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-3 border-t border-slate-200 pt-1 dark:border-white/10">
              <dt className="sr-only">Total</dt>
              <dd className="ms-auto font-display text-base font-700 tabular-nums text-slate-900 dark:text-white">
                {money(totals.total)} <span className="text-sm font-600 text-slate-400">{currency}</span>
              </dd>
            </div>
          </dl>
        </div>
      </footer>
    </div>
  );
}
