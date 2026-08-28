"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { technicalDict } from "@/shared/studio/technical";
import { btn, btnGhost, input, label, money } from "@/components/studio2/ui";
import { Icon } from "@/components/studio2/icons";
import Combo from "@/components/studio2/Combo";
import { MAX_TABLES, MAX_TABLE_ROWS, netUnitPrice } from "@/modules/technical/quotations";
import { fmtRate } from "@/shared/currencies";

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
  const tr = technicalDict(useStudioLocale());
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
  // Which table just refused a repeat, and of what — so the message sits on
  // that table rather than floating at the top of a long document.
  const [duplicate, setDuplicate] = useState(null);

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
  // WHERE A ROW'S PRICE CAME FROM, looked up by the id the row already stores.
  // The provenance is NOT copied onto the row: a quotation line holds what was
  // quoted, and the rate that produced it is the catalogue's business, shown
  // here so somebody can check the figure rather than stored here so somebody
  // has to keep it in step.
  const itemById = useMemo(
    () => Object.fromEntries(catalogue.map((i) => [i.id, i])), [catalogue]);
  // Lines priced at nothing because a rate was missing, not because they are
  // free. Said once at the top, because a long document hides a small note.
  const unpriced = tables.flatMap((t) => t.rows)
    .filter((r) => r.itemId && itemById[r.itemId] && !itemById[r.itemId].priced);

  // Picking a registered item brings its UNIT and PRICE across, so neither is
  // asked for. Both are COPIED onto the line rather than looked up later: a
  // quotation is a document somebody was given, and re-pricing it from today's
  // catalogue would rewrite what was quoted last month.
  //
  // ONE ROW PER REGISTERED ITEM, PER TABLE. The same catalogue entry twice in
  // one table is two lines quoting the same thing, and it is nearly always a
  // mistake rather than an intention: the quantity column is how you ask for
  // more of something. Left alone it also breaks the sheet that is drawn from
  // the quotation later, where two lines for one item mean two competing
  // answers to "how many were sold".
  //
  // PER TABLE, not per document, because tables are the divisions of the
  // quotation — the same item may legitimately appear under "Ground floor" and
  // again under "First floor", and those are different lines about different
  // work.
  //
  // An UNLISTED line is not restricted: it has no itemId, it is quoted on this
  // document and nowhere else, and two of them are two descriptions somebody
  // deliberately typed.
  const pickItem = (i, k, name) => {
    const found = itemByName[String(name).trim().toLowerCase()];
    if (found && tables[i]?.rows.some((r, m) => m !== k && r.itemId === found.id)) {
      setDuplicate({ table: i, name });
      // The text is still written, so the field shows what was typed rather
      // than silently snapping back — but the item is NOT attached, so the row
      // stays an unlisted line until it is changed to something else.
      setRow(i, k, { description: name, itemId: "", unit: "", unitPrice: 0, image: "" });
      return;
    }
    setDuplicate(null);
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
        <button className="rounded-geex p-1.5 text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/10"
          onClick={onClose} aria-label={tr.closeBuilder}>
          <Icon name="close" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-700 text-slate-900 dark:text-white">
            {quote.title || tr.quotationFallback}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{quote.number}</span>
            {quote.clientName ? ` · ${quote.clientName}` : ""} · {quote.status}
          </p>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {locked ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {quote.locked ? tr.lockedViewOnly : tr.viewOnly}
            </span>
          ) : (
            <>
              <button className={btnGhost} onClick={() => commit(null)} disabled={busy}>
                {busy ? tr.saving : saved === "saved" ? tr.saved : tr.save}
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

      {/* PRICED AT NOTHING BECAUSE NOBODY COULD CONVERT IT, which on a client
          document looks exactly like priced at nothing because it is free. Said
          at the top and not only on the row: a quotation runs to several tables
          and a small grey note inside one of them is a note nobody reads.

          Not a block on Submit. The remedy is in another module (Settings, or
          waiting for tomorrow's rates), and holding a whole quotation hostage to
          one line would strand the rest of the work — so this says exactly what
          is wrong and leaves the call to whoever is building the document. */}
      {!locked && unpriced.length > 0 && (
        <p className="border-b border-rose-500/20 bg-rose-500/10 px-5 py-2 text-xs text-rose-700 dark:text-rose-300">
          {unpriced.length} line{unpriced.length === 1 ? " is" : "s are"} priced at zero: {
            unpriced.some((r) => itemById[r.itemId]?.reason === "no-studio-currency")
              ? tr.studioNotSetCurrency
              : tr.todayRatesNotQuote
          }
        </p>
      )}

      {/* ----------------------------------------------------------- tables */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {tables.map((table, i) => {
            const sum = table.rows.reduce((s, r) => s + num(r.qty) * netUnitPrice(r), 0);
            return (
              <section key={table.id} className="rounded-geex border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                {/* Said on the table it happened to, naming the item, because a
                    long document has several tables and "already added" at the
                    top of the page answers nothing. */}
                {duplicate?.table === i && (
                  <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <span className="font-700">{duplicate.name}</span> is already a line in this table — change its quantity
                    instead of adding it twice. Add it under another table if it is genuinely separate work.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <input
                    className={`${input} font-600`}
                    value={table.title}
                    disabled={locked}
                    placeholder={tr.tableCovers(i + 1)}
                    aria-label={tr.tableTitle(i + 1)}
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
                        <th className="w-14 py-2 pe-3 text-start font-600"><span className="sr-only">{tr.itemImage}</span></th>
                        <th className="py-2 pe-3 text-start font-600">{tr.item}</th>
                        <th className="w-20 py-2 pe-3 text-start font-600">{tr.unit}</th>
                        <th className="w-24 py-2 pe-3 text-start font-600">{tr.qty}</th>
                        <th className="w-28 py-2 pe-3 text-end font-600">{tr.unitPrice}</th>
                        {/* PER CENT, said in the heading. Labelled just
                            "Discount" beside a column of money, it read as an
                            amount off — which is what it used to be, and what a
                            studio typing 10 into it meant either way. */}
                        <th className="w-28 py-2 pe-3 text-start font-600">{tr.disc}</th>
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
                              placeholder={tr.whatBeingQuoted}
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
                              aria-label={tr.tableRowQuantity(i + 1, k + 1)}
                              onChange={(e) => setRow(i, k, { qty: e.target.value })} />
                          </td>
                          {/* THE PRICE THIS DOCUMENT IS WRITTEN IN, always —
                              a registered item bought abroad is converted before
                              it ever reaches a line, so nothing below this cell
                              has to know a second currency exists.

                              With the working underneath when there was any: what
                              it cost where it was bought, and the rate that
                              brought it here. A converted figure nobody can check
                              is a figure nobody can defend in front of a client,
                              and Registered Items will show a different number
                              from this screen for the rest of the item's life. */}
                          <td className="py-1.5 pe-3 text-end font-mono text-xs text-slate-600 dark:text-slate-300">
                            {row.itemId || num(row.unitPrice)
                              ? <>{money(num(row.unitPrice))} <span className="text-slate-400">{currency}</span></>
                              : <span className="font-sans text-slate-400">—</span>}
                            <Conversion src={itemById[row.itemId]} />
                          </td>
                          {/* The % sits beside the field rather than inside the
                              value, so what is typed stays a plain number and
                              what it means is still on the screen. Beneath it,
                              what the line is actually priced at once the
                              discount is off — the figure the client sees, which
                              is otherwise arithmetic somebody has to do in their
                              head to check a document before it goes out. */}
                          <td className="py-1.5 pe-3">
                            <div className="flex items-center gap-1.5">
                              <input className={`${cell} w-16`} value={row.discount ?? 0} disabled={locked} inputMode="decimal"
                                aria-label={tr.tableRowDiscount(i + 1, k + 1)}
                                onChange={(e) => setRow(i, k, { discount: e.target.value })} />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                            {num(row.discount) > 0 && num(row.unitPrice) > 0 && (
                              <p className="mt-1 font-mono text-[11px] text-slate-400">
                                net {money(netUnitPrice(row))}
                              </p>
                            )}
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
                      onClick={() => setTable(i, { rows: [...table.rows, blankRow()] })}>{tr.addRow}</button>
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
              <dt className="text-slate-500 dark:text-slate-400">{tr.subtotal}</dt>
              <dd className="ms-auto font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {money(totals.subtotal)} <span className="text-slate-400">{currency}</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <label htmlFor="qb-vat">{tr.vat}</label>
                <input id="qb-vat" className={`${cell} w-16`} value={vatRate} disabled={locked} inputMode="decimal"
                  onChange={(e) => setVatRate(e.target.value)} />
              </dt>
              <dd className="ms-auto font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {money(totals.vat)} <span className="text-slate-400">{currency}</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-3 border-t border-slate-200 pt-1 dark:border-white/10">
              <dt className="sr-only">{tr.total}</dt>
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

// THE WORKING BEHIND A CONVERTED PRICE, in one line under the figure it made.
//
// Shown only where there was a conversion: an item bought in the studio's own
// money has nothing to explain, and a note under every row would be noise around
// the few that need it.
//
// The full sum is on the hover title rather than in the row, because the cell is
// a narrow column in a wide table — the line says WHAT was converted and at what
// rate, and the title says how that figure was reached.
function Conversion({ src }) {
  if (!src?.converted) return null;

  if (!src.priced) {
    return (
      <p className="mt-0.5 font-sans text-[11px] font-600 text-rose-600 dark:text-rose-400">
        no {src.currency} rate
      </p>
    );
  }

  const parts = [`${money(src.cost)} cost`];
  if (src.shipping) parts.push(`${money(src.shipping)} shipping`);
  if (src.customs) parts.push(`${money(src.customs)} customs`);

  return (
    <p className="mt-0.5 font-sans text-[11px] text-slate-400"
      title={`${parts.join(" + ")} = ${money(src.landedCost)} ${src.currency}, converted at ${fmtRate(src.rate)} per ${src.currency}`}>
      {money(src.landedCost)} {src.currency} × {fmtRate(src.rate)}
    </p>
  );
}
