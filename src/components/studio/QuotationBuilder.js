"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { canEditFields, canSeeCost } from "@/lib/quotations";
import { computeSheet } from "@/lib/quotationSheet";
import { fmtSAR } from "@/lib/format";
import { PreviewDocument, exportSheet, ExportButtons } from "@/components/studio/QuotationPreview";
import { confirmDialog } from "@/lib/appDialog";

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const card = "rounded-2xl border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function emptySheet() {
  return { itc: "", discount: "", tables: [{ id: uid(), title: "", rows: [] }] };
}

export default function QuotationBuilder({ quotation, cover }) {
  const id = quotation.id;
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [sheet, setSheet] = useState(() => {
    const s = quotation.sheet;
    if (s && Array.isArray(s.tables) && s.tables.length) {
      const itc = s.itc === "" || s.itc == null ? "" : (Number.isFinite(Number(s.itc)) ? Number(s.itc) : "");
      const discount = s.discount === "" || s.discount == null ? "" : (Number.isFinite(Number(s.discount)) ? Number(s.discount) : "");
      return { itc, discount, tables: s.tables.map((t) => ({ ...t })) };
    }
    return emptySheet();
  });
  const [saveState, setSaveState] = useState("saved"); // idle | saving | saved | error
  const [finishing, setFinishing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // right-hand preview drawer
  const [openRow, setOpenRow] = useState(null); // `${tableId}:${rowId}` whose item dropdown is open
  const firstRender = useRef(true);
  const router = useRouter();

  // A locked quotation is permanently view-only, regardless of role.
  const canEdit = canEditFields(me) && !quotation.locked;
  const costView = canSeeCost(me); // upper box + Free/Margin/Unit/Total columns

  useEffect(() => {
    document.documentElement.classList.add("studio-chrome");
    return () => document.documentElement.classList.remove("studio-chrome");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, iRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/inventoryItems", { cache: "no-store" }),
        ]);
        const meJson = await meRes.json().catch(() => ({}));
        setMe(meJson?.user || null);
        setItems(iRes.ok ? await iRes.json() : []);
      } catch {
        /* ignore */
      } finally {
        setItemsLoaded(true);
      }
    })();
  }, []);

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const computed = useMemo(() => computeSheet(sheet, itemsById), [sheet, itemsById]);

  // --- Save (autosave + explicit Save/Done) -------------------------------
  // The sheet we persist is deliberately lean: for now it's the items picked
  // and their quantities (plus the manual margin) — image/model/price are
  // resolved live from the catalogue and never stored.
  const saveTimer = useRef(null);
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;

  const persistSheet = useCallback(async () => {
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet: sheetRef.current }),
    });
    return res.ok;
  }, [id]);

  const saveNow = useCallback(async () => {
    if (!canEdit) return false;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setSaveState("saving");
    try {
      const ok = await persistSheet();
      setSaveState(ok ? "saved" : "error");
      return ok;
    } catch {
      setSaveState("error");
      return false;
    }
  }, [canEdit, persistSheet]);

  // Debounced autosave on every edit.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!canEdit) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const ok = await persistSheet();
        setSaveState(ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [sheet, canEdit, persistSheet]);

  const markDone = useCallback(async () => {
    if (!canEdit || finishing) return;
    if (!(await confirmDialog({ title: "Finalize quotation", message: "Mark this quotation as Completed? This finalizes it and it will show as Completed in the quotations list.", confirmLabel: "Mark completed" }))) return;
    setFinishing(true);
    try {
      const ok = await saveNow();
      if (!ok) throw new Error();
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (!res.ok) throw new Error();
      router.push("/studio/technical/quotations");
    } catch {
      setSaveState("error");
      setFinishing(false);
    }
  }, [canEdit, finishing, saveNow, id, router]);

  // --- Mutators -----------------------------------------------------------
  const setItc = (v) => setSheet((s) => ({ ...s, itc: v === "" ? "" : Number(v) }));
  const setDiscount = (v) => setSheet((s) => ({ ...s, discount: v === "" ? "" : Number(v) }));
  const patchTable = (tid, patch) => setSheet((s) => ({ ...s, tables: s.tables.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
  const addTable = () => setSheet((s) => ({ ...s, tables: [...s.tables, { id: uid(), title: "", rows: [] }] }));
  const removeTable = (tid) => setSheet((s) => ({ ...s, tables: s.tables.filter((t) => t.id !== tid) }));
  const addRow = (tid) => setSheet((s) => ({ ...s, tables: s.tables.map((t) => (t.id === tid ? { ...t, rows: [...t.rows, { id: uid(), itemId: "", qty: 1, margin: 0, q: "" }] } : t)) }));
  const removeRow = (tid, rid) => setSheet((s) => ({ ...s, tables: s.tables.map((t) => (t.id === tid ? { ...t, rows: t.rows.filter((r) => r.id !== rid) } : t)) }));
  const patchRow = (tid, rid, patch) =>
    setSheet((s) => ({ ...s, tables: s.tables.map((t) => (t.id === tid ? { ...t, rows: t.rows.map((r) => (r.id === rid ? { ...r, ...patch } : r)) } : t)) }));

  // --- Export -------------------------------------------------------------
  const doExport = useCallback((kind) => exportSheet(kind, computed, quotation, cover), [computed, quotation, cover]);

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed — retrying on next change" : "All changes saved";

  return (
    <div className="flex h-screen flex-col bg-[var(--geex-page)] text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-[var(--geex-surface)] px-4 py-2.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/studio"))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back" aria-label="Back">
            <Icon name="arrowLeft" className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-700 text-slate-900 dark:text-white">
              {quotation.approved && (
                <span className="me-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[11px] font-700 text-emerald-700 dark:text-emerald-300">
                  <Icon name="checkDouble" className="h-3 w-3" /> Approved
                </span>
              )}
              {quotation.locked && (
                <span className="me-1.5 inline-flex items-center gap-1 rounded-full bg-slate-800 px-1.5 py-0.5 align-middle text-[11px] font-700 text-white dark:bg-white/80 dark:text-slate-900">
                  <Icon name="lock" className="h-3 w-3" /> Locked
                </span>
              )}
              {quotation.number}
              {Number(quotation.revision) > 1 && <span className="ms-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-700 text-amber-700 dark:text-amber-300">Rev {quotation.revision}</span>}
              <span className="ms-1 font-500 text-slate-400">· Quotation builder</span>
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{quotation.title || quotation.clientName || quotation.description || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`hidden items-center gap-1.5 sm:inline-flex ${saveState === "error" ? "text-red-500" : "text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${saveState === "saving" ? "bg-amber-400" : saveState === "error" ? "bg-red-500" : "bg-emerald-500"}`} />
            {canEdit ? saveLabel : "Read-only"}
          </span>
          {canEdit && (
            <>
              <button
                onClick={saveNow}
                disabled={saveState === "saving" || finishing}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-[#20202c] dark:text-slate-200 dark:hover:bg-white/5"
              >
                Save
              </button>
              <button
                onClick={markDone}
                disabled={finishing}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                title="Save and mark this quotation as Completed"
              >
                <Icon name="checkDouble" className="h-4 w-4" /> {finishing ? "Finishing…" : "Done"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Full-screen editor + right-hand preview drawer. overflow-hidden keeps
          the (off-screen, closed) drawer from creating a horizontal scrollbar. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* EDITOR (full width, centred content) */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-3xl">
          {!canEdit && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {quotation.locked ? "This quotation is locked — it is view-only and can no longer be modified." : "You can view this quotation but only admin or Technical users can edit it."}
            </div>
          )}

          {/* Information box + fields — cost figures only for cost-view tags */}
          {costView && (
          <div className={`${card} mb-4 p-4`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Legend label="Total quantity" value={computed.totals.qty.toLocaleString("en-US")} />
              <Legend label="Total cost" value={fmtSAR(computed.totals.cost)} />
              <Legend label="Total selling" value={fmtSAR(computed.totals.selling)} />
              <Legend label="Profit" value={fmtSAR(computed.totals.profit)} tone={computed.totals.profit >= 0 ? "pos" : "neg"} />
            </div>
            <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 dark:border-white/10 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">IT&amp;C %</label>
                  <span className="text-xs text-slate-400">{computed.itcProvided ? `= ${fmtSAR(computed.itcCost)}` : "—"}</span>
                </div>
                <input type="number" min="0" step="0.5" disabled={!canEdit} value={sheet.itc} onChange={(e) => setItc(e.target.value)} className={input} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Discount %</label>
                  <span className="text-xs text-slate-400">{computed.discountProvided ? `→ ${fmtSAR(computed.discountedTotal)}` : "—"}</span>
                </div>
                <input type="number" min="0" max="100" step="0.5" disabled={!canEdit} value={sheet.discount} onChange={(e) => setDiscount(e.target.value)} className={input} />
              </div>
            </div>
          </div>
          )}

          {/* Tables */}
          {sheet.tables.map((t, ti) => {
            const ct = computed.tables[ti];
            return (
              <div key={t.id} className={`${card} mb-4 overflow-hidden`}>
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-[#191921]">
                  <input
                    disabled={!canEdit}
                    value={t.title}
                    onChange={(e) => patchTable(t.id, { title: e.target.value })}
                    placeholder={`Table ${ti + 1} name (e.g. CCTV System)`}
                    className={`${input} flex-1 font-600`}
                  />
                  {canEdit && (
                    <button onClick={() => removeTable(t.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete table" aria-label="Delete table">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <th className="px-3 py-2 text-start font-600">Item</th>
                        <th className="px-2 py-2 text-start font-600">Model</th>
                        {costView && <th className="w-12 px-2 py-2 text-center font-600">Free</th>}
                        <th className="w-16 px-2 py-2 text-end font-600">Qty</th>
                        {costView && <th className="w-20 px-2 py-2 text-end font-600">Margin %</th>}
                        {costView && <th className="w-20 px-2 py-2 text-end font-600">Disc %</th>}
                        {costView && <th className="px-2 py-2 text-end font-600">Unit (SAR)</th>}
                        {costView && <th className="px-2 py-2 text-end font-600">Total (SAR)</th>}
                        {canEdit && <th className="w-8 px-1 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ct.rows.length === 0 ? (
                        <tr><td colSpan={12} className="px-3 py-4 text-center text-xs text-slate-400">No items yet.</td></tr>
                      ) : ct.rows.map((r) => (
                        <ItemRow
                          key={r.id}
                          row={r}
                          items={items}
                          canEdit={canEdit}
                          costView={costView}
                          usedIds={new Set(ct.rows.filter((rr) => rr.id !== r.id && rr.itemId).map((rr) => rr.itemId))}
                          isOpen={openRow === `${t.id}:${r.id}`}
                          setOpen={(v) => setOpenRow(v ? `${t.id}:${r.id}` : null)}
                          onPick={(item) => { patchRow(t.id, r.id, { itemId: item.id, q: item.name }); setOpenRow(null); }}
                          onQuery={(q) => patchRow(t.id, r.id, { q, itemId: "" })}
                          onQty={(v) => patchRow(t.id, r.id, { qty: v === "" ? "" : Number(v) })}
                          onMargin={(v) => patchRow(t.id, r.id, { margin: v === "" ? "" : Number(v) })}
                          onDiscount={(v) => patchRow(t.id, r.id, { discount: v === "" ? "" : Number(v) })}
                          onFree={(v) => patchRow(t.id, r.id, { free: v })}
                          onRemove={() => removeRow(t.id, r.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 dark:border-white/10">
                  {canEdit ? (
                    <button onClick={() => addRow(t.id)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                      <Icon name="plus" className="h-3.5 w-3.5" /> Add item
                    </button>
                  ) : <span />}
                  {costView && <span className="text-xs text-slate-500 dark:text-slate-400">Subtotal: <b className="text-slate-700 dark:text-slate-200">{fmtSAR(ct.totals.selling)}</b></span>}
                </div>
              </div>
            );
          })}

          {canEdit && (
            <button onClick={addTable} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-600 text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-slate-400 dark:hover:border-brand-500/50 dark:hover:text-brand-300">
              <Icon name="plus" className="h-4 w-4" /> Add another table
            </button>
          )}
          </div>
        </div>

        {/* Preview toggle — a tab pinned to the right-centre of the window */}
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          style={{ right: drawerOpen ? "70%" : 0 }}
          className="absolute top-1/2 z-40 flex -translate-y-1/2 items-center gap-1 rounded-l-xl bg-brand-700 px-2 py-4 text-[11px] font-700 uppercase tracking-wide text-white shadow-lg transition-all duration-300 hover:bg-brand-950"
          title={drawerOpen ? "Hide preview" : "Show preview"}
          aria-label="Toggle preview"
        >
          <Icon name={drawerOpen ? "close" : "eye"} className="h-4 w-4" />
          <span className="[writing-mode:vertical-rl]">{drawerOpen ? "Close" : "Preview"}</span>
        </button>

        {/* Preview drawer — 40% of the window, slides in from the right */}
        <aside
          className={`absolute inset-y-0 right-0 z-30 flex w-[70%] flex-col border-l border-slate-200 bg-slate-100 shadow-2xl transition-transform duration-300 dark:border-white/10 dark:bg-[#14141c] ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
          aria-hidden={!drawerOpen}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-[var(--geex-surface)] px-4 py-2.5 dark:border-white/10">
            <p className="font-display text-sm font-700 text-slate-900 dark:text-white">Preview</p>
            <button onClick={() => setDrawerOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5" aria-label="Close preview">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
            {/* Only build the preview once the drawer has been opened — keeps it
                off the initial render (and out of the layout) entirely. */}
            {drawerOpen && (
              <>
                <PreviewDocument computed={computed} quotation={quotation} loaded={itemsLoaded} cover={cover} />
                <ExportButtons onExport={doExport} />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Legend({ label, value, tone }) {
  return (
    <div>
      <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-0.5 font-display text-sm font-800 ${tone === "neg" ? "text-red-600 dark:text-red-400" : tone === "pos" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function ItemRow({ row, items, canEdit, costView, usedIds, isOpen, setOpen, onPick, onQuery, onQty, onMargin, onDiscount, onFree, onRemove }) {
  const item = row.item;
  const free = !!row.free;
  const display = row.q !== undefined ? row.q : (item?.name || "");
  const inputRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Only items not already used elsewhere in this table are selectable
  // (an item can't appear twice in the same table).
  const matches = useMemo(() => {
    const q = (display || "").trim().toLowerCase();
    const avail = items.filter((i) => !usedIds.has(i.id));
    const list = q ? avail.filter((i) => `${i.name || ""} ${i.modelNumber || ""}`.toLowerCase().includes(q)) : avail;
    return list.slice(0, 8);
  }, [display, items, usedIds]);

  // Anchor the dropdown with position:fixed measured from the input, opening
  // ABOVE it. This escapes the table wrapper's overflow clipping (which would
  // otherwise trap the list and add scrollbars under the cell).
  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, width: Math.max(r.width, 240), bottom: window.innerHeight - r.top + 6 });
  };

  return (
    <tr className="border-t border-slate-50 align-middle dark:border-white/5">
      <td className="px-3 py-1.5">
        <input
          ref={inputRef}
          disabled={!canEdit}
          value={display}
          placeholder="Search item…"
          onChange={(e) => { place(); onQuery(e.target.value); setOpen(true); }}
          onFocus={() => { place(); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          className={input}
        />
        {isOpen && pos && matches.length > 0 && (
          <ul
            style={{ position: "fixed", left: pos.left, width: pos.width, bottom: pos.bottom, zIndex: 60 }}
            className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/15 dark:bg-[#191921]"
          >
            {matches.map((i) => (
              <li key={i.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(i)} className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="h-6 w-6 shrink-0 rounded border border-slate-200 object-contain dark:border-white/10" />
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate font-600">{i.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{i.modelNumber} · {fmtSAR(i.price)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!item && row.itemId && <p className="mt-0.5 text-[11px] text-red-400">Item no longer exists.</p>}
      </td>
      <td className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">{item?.modelNumber || "—"}</td>
      {costView && (
        <td className="px-2 py-1.5 text-center">
          <input type="checkbox" disabled={!canEdit} checked={free} onChange={(e) => onFree(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-[#191921]" title="Mark this item as free (shown as “Included”)" />
        </td>
      )}
      {/* Qty — editable only for cost editors; read-only for project users. */}
      <td className="px-2 py-1.5 text-end">
        {canEdit ? (
          <input disabled={!canEdit} type="number" min="0" value={row.qty} onChange={(e) => onQty(e.target.value)} className={`${input} w-14 text-end`} />
        ) : (
          <span className="text-slate-700 dark:text-slate-200">{row.calc.qty}</span>
        )}
      </td>
      {costView && (
        <td className="px-2 py-1.5 text-end">
          <input disabled={!canEdit || free} type="number" min="0" step="0.5" value={free ? "" : row.margin} onChange={(e) => onMargin(e.target.value)} className={`${input} w-16 text-end disabled:opacity-50`} />
        </td>
      )}
      {costView && (
        <td className="px-2 py-1.5 text-end">
          <input disabled={!canEdit || free} type="number" min="0" max="100" step="0.5" value={free ? "" : (row.discount ?? "")} onChange={(e) => onDiscount(e.target.value)} className={`${input} w-16 text-end disabled:opacity-50`} title="Per-item discount %" />
        </td>
      )}
      {costView && <td className="whitespace-nowrap px-2 py-1.5 text-end text-slate-600 dark:text-slate-300">{free ? <span className="text-emerald-600 dark:text-emerald-400">Included</span> : fmtSAR(row.calc.single)}</td>}
      {costView && <td className="whitespace-nowrap px-2 py-1.5 text-end font-600 text-slate-800 dark:text-slate-100">{free ? <span className="text-emerald-600 dark:text-emerald-400">Included</span> : fmtSAR(row.calc.total)}</td>}
      {canEdit && (
        <td className="px-1 py-1.5 text-center">
          <button onClick={onRemove} className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:text-red-500" title="Remove item" aria-label="Remove item">×</button>
        </td>
      )}
    </tr>
  );
}
