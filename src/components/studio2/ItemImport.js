"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { itemImportDict } from "@/shared/studio/itemImport";
import { btn, btnGhost, input, microLabel, fmtDate } from "@/components/studio2/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { readGrid } from "@/modules/tendering/boqImport";
import { readXlsx, isZip } from "@/shared/xlsx";
import { writeXlsx } from "@/shared/xlsxWrite";
import {
  ITEM_FIELDS, IMPORT_BATCH,
  guessItemMapping, looksLikeItemHeader, itemRows, planItemImport, refusedRowsCsv, itemTemplate, templateGuide,
} from "@/modules/inventory/itemImport";

// IMPORTING REGISTERED ITEMS — a materials list from Odoo or a spreadsheet.
// Loaded only when somebody opens it (StudioInventory), so the reader, the
// rules and these words cost the Inventory page nothing until then.
//
// FOUR STEPS, and the person sees each one:
//   1. THE FILE IS READ HERE — CSV as text, .xlsx by shared/xlsx — because it
//      is already here and a response cap would otherwise bound its size.
//   2. THE COLUMNS ARE GUESSED AND THEN THE PERSON'S, as in the BOQ importer.
//   3. WHAT WILL HAPPEN IS SHOWN BEFORE ANYTHING IS WRITTEN: the same
//      `planItemImport` every server batch runs, over the whole file — counts,
//      the rows that cannot go in and why, a likely swap of cost and price,
//      and the first rows exactly as they will be stored.
//   4. IT RUNS IN BATCHES with a progress count. A batch sent twice creates
//      nothing twice (see importItems), so a stopped import is continued,
//      never cleaned up — even after the window was closed: the import id is
//      kept in this browser against the file, and re-attaching it offers to
//      carry on.

const PREVIEW = 8;
const RESUME_KEY = "nompany:item-import";

// A file is recognised by its name and its size in rows — enough to tell
// "this same file again" from another one, without hashing it.
const fileKey = (slug, name, count) => `${slug}|${name}|${count}`;
const readResume = () => { try { return JSON.parse(localStorage.getItem(RESUME_KEY) || "null"); } catch { return null; } };
const writeResume = (v) => { try { if (v) localStorage.setItem(RESUME_KEY, JSON.stringify(v)); else localStorage.removeItem(RESUME_KEY); } catch { /* storage blocked: resuming is a convenience */ } };

// UTF-8 when the bytes are UTF-8; otherwise the Arabic Windows code page. A
// CSV saved by Excel's plain "CSV" option on an Arabic Windows machine is
// windows-1256, and read as UTF-8 every Arabic name becomes question marks.
function decodeText(bytes) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { /* not UTF-8 */ }
  try { return new TextDecoder("windows-1256").decode(bytes); } catch { return new TextDecoder().decode(bytes); }
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function download(name, body, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ItemImport({ slug, items, vendors, units, studioCurrency, onChanged, onBusy, onClose }) {
  const locale = useStudioLocale();
  const tr = itemImportDict(locale);
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState(null);
  const [sheetAt, setSheetAt] = useState(0);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState("");
  // Null until the person changes a column or the header toggle; until then the guess stands.
  const [override, setOverride] = useState(null);
  const [update, setUpdate] = useState(false);
  const [createVendors, setCreateVendors] = useState(false);
  const [swapOk, setSwapOk] = useState(false);
  const [showRefused, setShowRefused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // running | stopped | done — and the running tally.
  const [phase, setPhase] = useState("edit");
  const [run, setRun] = useState(null);
  const [resumeTaken, setResumeTaken] = useState(false);

  const grid = useMemo(() => sheets?.[sheetAt]?.rows || [], [sheets, sheetAt]);
  const guessedHeader = grid.length > 0 && looksLikeItemHeader(grid[0] || []);
  const header = override ? override.header : guessedHeader;
  const mapping = useMemo(
    () => (override ? override.mapping : (guessedHeader ? guessItemMapping(grid[0]) : {})),
    [override, guessedHeader, grid],
  );
  const read = useMemo(() => itemRows(grid, mapping, { header }), [grid, mapping, header]);
  // THE TEMPLATE IS THIS STUDIO'S: its units in the Unit dropdown, its
  // suppliers in the Supplier one, its currency named in the guide — so what a
  // client fills in is what this import will accept.
  const templateEnv = { units, studioCurrency, vendorNames: vendors.map((v) => v.name) };
  const downloadTemplate = () => download(tr.templateFile,
    writeXlsx(itemTemplate(tr.templateWords, templateEnv, { rtl: locale === "ar" })), XLSX_TYPE);
  const env = useMemo(() => ({
    units, studioCurrency, vendorNames: vendors.map((v) => v.name), items,
  }), [units, studioCurrency, vendors, items]);
  const plan = useMemo(
    () => planItemImport(read.rows, env, { update, createVendors }),
    [read.rows, env, update, createVendors],
  );
  // Asked of the file directly rather than of the plan, so the offer to add
  // them does not vanish the moment it is taken.
  const missingVendors = useMemo(() => {
    const known = new Set(vendors.map((v) => v.name.trim().toLowerCase()));
    const out = new Map();
    for (const r of read.rows) {
      const name = String(r.vendor || "").trim();
      if (name && !known.has(name.toLowerCase())) out.set(name.toLowerCase(), name);
    }
    return [...out.values()];
  }, [read.rows, vendors]);

  const refusedHard = plan.refused.filter((r) => r.reason !== "exists");
  const skipped = plan.refused.length - refusedHard.length;
  const toSend = plan.create.length + plan.update.length;
  const blocked = plan.likelySwap && !swapOk;

  // WHILE IT RUNS, LEAVING IS ASKED ABOUT. Nothing is lost if it happens —
  // continuing picks up where it stopped — but the browser should say so.
  useEffect(() => { onBusy?.(phase === "running"); }, [phase, onBusy]);
  useEffect(() => {
    if (phase !== "running") return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  async function pick(file) {
    if (!file) return;
    setFileName(file.name); setReadError(""); setSheets(null); setSheetAt(0); setOverride(null);
    setPhase("edit"); setRun(null); setSwapOk(false); setResumeTaken(false);
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Old binary Excel (.xls) starts with the OLE signature, not a ZIP's.
      if (bytes[0] === 0xd0 && bytes[1] === 0xcf) { setReadError(tr.oldXls); return; }
      const parsed = isZip(bytes)
        ? await readXlsx(bytes)
        : [{ name: file.name, rows: readGrid(decodeText(bytes)) }];
      const usable = parsed.filter((s) => s.rows.some((r) => r.some((c) => String(c).trim() !== "")));
      if (!usable.length) { setReadError(tr.empty); return; }
      setSheets(usable);
    } catch {
      setReadError(tr.unreadable);
    } finally {
      setReading(false);
    }
  }

  // OFFER TO CONTINUE an import of this same file that stopped before. Read
  // once per attached file rather than set from an effect; dismissed by
  // starting any import, which replaces what is saved.
  const saved = useMemo(() => (sheets ? readResume() : null), [sheets]);
  const resume = !resumeTaken && saved && saved.key === fileKey(slug, fileName, read.rows.length) ? saved : null;

  // The options travel as ARGUMENTS: a resumed import sets them from what was
  // saved, and state set in the same tick would not be read back until later.
  async function start(from, opts = { update, createVendors }) {
    const all = read.rows;
    const key = fileKey(slug, fileName, all.length);
    const tally = from || { importId: "", next: 0, created: 0, updated: 0, vendorsCreated: 0, refused: [] };
    setPhase("running"); setRun({ ...tally, total: all.length }); setResumeTaken(true);
    let state = tally;
    for (let at = state.next; at < all.length; at += IMPORT_BATCH) {
      let out = null;
      try {
        const res = await fetch(`/api/studios/${slug}/inventory/items/import`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importId: state.importId || undefined, ...opts, rows: all.slice(at, at + IMPORT_BATCH) }),
        });
        out = await res.json().catch(() => null);
        if (!res.ok) out = null;
      } catch { out = null; }
      if (!out) {
        // STOPPED, NOT FAILED: what landed stays, and continuing resends this
        // batch, whose landed lines the server counts rather than writes again.
        setPhase("stopped");
        if (state.importId) writeResume({ ...state, key, ...opts });
        return;
      }
      state = {
        importId: out.importId,
        next: at + IMPORT_BATCH,
        created: state.created + (out.created || 0),
        updated: state.updated + (out.updated || 0),
        vendorsCreated: state.vendorsCreated + (out.vendorsCreated || 0),
        refused: [...state.refused, ...(out.refused || [])],
      };
      writeResume({ ...state, key, ...opts });
      setRun({ ...state, total: all.length });
    }
    writeResume(null);
    setPhase("done");
    onChanged?.();
  }

  function continueSaved() {
    const from = resume;
    const opts = { update: !!from.update, createVendors: !!from.createVendors };
    setUpdate(opts.update); setCreateVendors(opts.createVendors);
    start(from, opts);
  }

  // A bad number's detail is "<field>: <value>"; the field is named in the reader's language.
  const detailText = (r) => (r.reason === "number" || r.reason === "shortened" ? String(r.detail || "").replace(/^(\w+):/, (m, f) => `${tr.fields[f] || f}:`) : r.detail);
  const reasonText = (r) => `${tr.reasons[r.reason] || r.reason}${r.detail ? `: ${detailText(r)}` : ""}`;
  const labels = tr.fields;
  const width = grid.reduce((w, row) => Math.max(w, row.length), 0);
  const columns = Array.from({ length: width }, (_, i) => ({
    value: String(i),
    label: header && grid[0]?.[i] ? `${i + 1} · ${grid[0][i]}` : tr.columnN(i + 1),
  }));
  const setColumn = (field, value) => setOverride({
    header, mapping: { ...mapping, [field]: value === "" ? undefined : Number(value) },
  });

  // ---- running, stopped, finished ------------------------------------------
  if (phase !== "edit" && run) {
    const done = Math.min(run.next, run.total);
    const pct = run.total ? Math.round((done / run.total) * 100) : 100;
    const refusedAll = run.refused;
    return (
      <div className="space-y-4">
        {phase === "done"
          ? <p className="text-sm font-600 text-emerald-700 dark:text-emerald-400">{tr.doneTitle}</p>
          : <p className="text-sm font-600 text-slate-700 dark:text-slate-200">{tr.running(done, run.total)}</p>}
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
          <li>{tr.created(run.created)}</li>
          {run.updated > 0 && <li>{tr.updated(run.updated)}</li>}
          {run.vendorsCreated > 0 && <li>{tr.vendorsCreated(run.vendorsCreated)}</li>}
          {refusedAll.length > 0 && <li className="text-amber-700 dark:text-amber-300">{tr.notImported(refusedAll.length)}</li>}
        </ul>
        {phase === "running" && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.keepOpen}</p>}
        {phase === "stopped" && <p className="text-sm text-rose-600 dark:text-rose-300">{tr.stopped}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {refusedAll.length > 0 && phase !== "running" && (
            <button type="button" className={btnGhost}
              onClick={() => download(`${fileName.replace(/\.[^.]+$/, "")}-not-imported.csv`, refusedRowsCsv(grid, header, refusedAll, reasonText))}>
              {tr.downloadRefused}
            </button>
          )}
          {phase === "stopped" && <button type="button" className={btn} onClick={() => start(run)}>{tr.resume}</button>}
          {phase !== "running" && <button type="button" className={phase === "done" ? btn : btnGhost} onClick={onClose}>{tr.close}</button>}
        </div>
      </div>
    );
  }

  // ---- choosing a file, matching its columns, checking it --------------------
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" className="hidden"
          accept=".xlsx,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>{tr.attach}</button>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
          {reading ? tr.reading : fileName || tr.noFile}
        </span>
        <button type="button" className="text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"
          onClick={downloadTemplate}>
          {tr.template}
        </button>
      </div>
      {readError && <p className="text-sm text-rose-600 dark:text-rose-300">{readError}</p>}

      {!sheets && (
        <div>
          <button type="button" className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400"
            aria-expanded={showGuide} onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? tr.guideHide : tr.guideShow}
          </button>
          {showGuide && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr.guideLead}</p>
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200/70 dark:border-white/10">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400">
                      {tr.templateWords.guideColumns.map((h) => <th key={h} className="px-3 py-1.5 text-start font-600">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {templateGuide(tr.templateWords, templateEnv).map((g) => (
                      <tr key={g.field} className="border-t border-slate-100 align-top dark:border-white/5">
                        <td className="whitespace-nowrap px-3 py-1.5 font-600 text-slate-800 dark:text-slate-100">{g.heading}</td>
                        <td className={`whitespace-nowrap px-3 py-1.5 ${g.required ? "font-600 text-brand-700 dark:text-brand-300" : "text-slate-400"}`}>
                          {g.required ? tr.templateWords.required : tr.templateWords.optional}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{g.what}</td>
                        <td dir="auto" className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-500">{g.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!sheets && <ImportHistory slug={slug} items={items} tr={tr} onChanged={onChanged} />}

      {sheets && (
        <>
          {resume && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
              <span className="flex-1">{tr.resumeOffer(Math.min(resume.next, read.rows.length), read.rows.length)}</span>
              <button type="button" className={btn} onClick={continueSaved}>{tr.resume}</button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {sheets.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{tr.sheet}</span>
                <SelectMenu className={`${input} w-48`} aria-label={tr.sheet} value={String(sheetAt)}
                  options={sheets.map((s, i) => ({ value: String(i), label: s.name }))}
                  onChange={(v) => { setSheetAt(Number(v)); setOverride(null); }} />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={header}
                onChange={(e) => setOverride({ mapping, header: e.target.checked })} />
              {tr.headerRow}
            </label>
          </div>

          <div>
            <p className={microLabel}>{tr.columns}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ITEM_FIELDS.map((field) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-600 text-slate-500 dark:text-slate-400">{labels[field]}</span>
                  <SelectMenu className={input} aria-label={labels[field]}
                    value={mapping[field] !== undefined ? String(mapping[field]) : ""}
                    options={[{ value: "", label: tr.notInFile }, ...columns]}
                    onChange={(v) => setColumn(field, v)} />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={update}
                onChange={(e) => setUpdate(e.target.checked)} />
              <span>{tr.optUpdate}<span className="block text-xs text-slate-500 dark:text-slate-400">{tr.optUpdateHint}</span></span>
            </label>
            {missingVendors.length > 0 && (
              <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={createVendors}
                  onChange={(e) => setCreateVendors(e.target.checked)} />
                <span>{tr.optVendors(missingVendors.length)}
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {tr.optVendorsHint(missingVendors.slice(0, 6).join(", ") + (missingVendors.length > 6 ? "…" : ""))}
                  </span>
                </span>
              </label>
            )}
          </div>

          <ul className="space-y-0.5 text-sm">
            <li className="font-600 text-slate-800 dark:text-slate-100">{tr.willCreate(plan.create.length)}</li>
            {plan.update.length > 0 && <li className="text-slate-700 dark:text-slate-200">{tr.willUpdate(plan.update.length)}</li>}
            {skipped > 0 && <li className="text-slate-500 dark:text-slate-400">{tr.willSkip(skipped)}</li>}
            {refusedHard.length > 0 && <li className="text-amber-700 dark:text-amber-300">{tr.cannot(refusedHard.length)}</li>}
            {plan.warnings.filter((w) => w.kind === "price-below-cost").length > 0 && (
              <li className="text-amber-700 dark:text-amber-300">{tr.belowCost(plan.warnings.filter((w) => w.kind === "price-below-cost").length)}</li>
            )}
            {read.extraVendors > 0 && <li className="text-xs text-slate-500 dark:text-slate-400">{tr.extraVendors(read.extraVendors)}</li>}
            {plan.unknownUnits.length > 0 && (
              <li className="text-xs text-amber-700 dark:text-amber-300">{tr.unknownUnits(plan.unknownUnits.slice(0, 8).join(", "))}</li>
            )}
          </ul>

          {plan.likelySwap && (
            <div className="space-y-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <p>{tr.swap}</p>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={swapOk} onChange={(e) => setSwapOk(e.target.checked)} />
                {tr.swapOk}
              </label>
            </div>
          )}

          {refusedHard.length > 0 && (
            <div>
              <button type="button" className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400"
                onClick={() => setShowRefused((v) => !v)}>
                {showRefused ? tr.hideRefused : tr.showRefused}
              </button>
              {showRefused && (
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs text-amber-700 dark:text-amber-300">
                  {refusedHard.slice(0, 200).map((r) => <li key={`${r.line}-${r.reason}`}>{tr.line(r.line)} · {reasonText(r)}</li>)}
                </ul>
              )}
            </div>
          )}

          {toSend > 0 && (
            <div className="overflow-x-auto">
              <p className={microLabel}>{tr.preview}</p>
              <table className="mt-1 w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    {[labels.sku, labels.name, labels.unit, labels.vendor, labels.itemType, labels.unitCost, labels.sellPrice].map((h, i) => (
                      <th key={h} className={`py-1 pe-2 font-600 ${i >= 5 ? "text-end" : "text-start"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...plan.update, ...plan.create].sort((a, b) => a.line - b.line).slice(0, PREVIEW).map((p) => (
                    <tr key={p.line} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-1 pe-2 font-mono text-slate-500">{p.sku || <span className="italic text-slate-400">{tr.autoSku}</span>}</td>
                      <td dir="auto" className="py-1 pe-2 text-start text-slate-800 dark:text-slate-100">{p.name}</td>
                      <td className="py-1 pe-2 text-slate-500">{p.unit}</td>
                      <td className="py-1 pe-2 text-slate-500">{p.vendorName || "—"}</td>
                      <td className="py-1 pe-2 text-slate-500">{p.itemType || "—"}</td>
                      <td className="num py-1 pe-2 text-end">{p.unitCost || "—"}</td>
                      <td className="num py-1 pe-2 text-end">{p.sellPrice || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onClose}>{tr.cancel}</button>
        {sheets && (
          <button type="button" className={btn} disabled={toSend === 0 || blocked} onClick={() => start(null)}>
            {toSend === 0 ? tr.nothing : tr.run(toSend)}
          </button>
        )}
      </div>
    </div>
  );
}

// WHAT CAME IN BY FILE, counted from the items themselves — there is no import
// record to keep true. Undo removes everything an import created, or nothing.
function ImportHistory({ slug, items, tr, onChanged }) {
  const [asking, setAsking] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const imports = useMemo(() => {
    const by = new Map();
    for (const i of items) {
      if (!i.importId) continue;
      const e = by.get(i.importId) || { id: i.importId, at: i.createdAt || "", count: 0 };
      e.count += 1;
      if (i.createdAt && i.createdAt < e.at) e.at = i.createdAt;
      by.set(i.importId, e);
    }
    return [...by.values()].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 5);
  }, [items]);

  if (!imports.length && !note) return null;

  async function undo(id) {
    setBusy(true); setNote("");
    const res = await fetch(`/api/studios/${slug}/inventory/items/import`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId: id }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false); setAsking("");
    if (res.ok) { setNote(tr.undone(out.removed || 0)); onChanged?.(); return; }
    setNote(out.error === "in-use" ? tr.undoInUse(out.count || 0, (out.names || []).join(", ")) : tr.failed);
  }

  return (
    <div>
      <p className={microLabel}>{tr.history}</p>
      <ul className="mt-1 divide-y divide-slate-100 text-sm dark:divide-white/5">
        {imports.map((imp) => (
          <li key={imp.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className="flex-1 text-slate-700 dark:text-slate-200">{tr.historyRow(fmtDate(imp.at), imp.count)}</span>
            {asking === imp.id ? (
              <>
                <span className="w-full text-xs text-slate-500 dark:text-slate-400 sm:w-auto">{tr.undoConfirm(imp.count)}</span>
                <button type="button" className={btnGhost} disabled={busy} onClick={() => setAsking("")}>{tr.cancel}</button>
                <button type="button" className={btn} disabled={busy} onClick={() => undo(imp.id)}>{tr.undoYes}</button>
              </>
            ) : (
              <button type="button" className={btnGhost} disabled={busy} onClick={() => setAsking(imp.id)}>{tr.undo}</button>
            )}
          </li>
        ))}
      </ul>
      {note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{note}</p>}
    </div>
  );
}
