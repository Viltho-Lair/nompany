"use client";

import { useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tenderingDict } from "@/shared/studio/tendering";
import { btn, btnGhost, input, microLabel } from "@/components/studio2/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import {
  BOQ_FIELDS, readGrid, guessMapping, looksLikeHeader, boqRows, MAX_IMPORT_LINES,
} from "@/modules/tendering/boqImport";

// IMPORTING A CLIENT'S BILL — tier 6. Paste it out of Excel or attach a CSV.
//
// THE VENDOR IMPORTER'S THREE RULES, kept: the text is read HERE, where it is
// (the server cleans every row again, so nothing is trusted for having been
// parsed); what the paste holds is SHOWN before it is committed; and every row
// is accounted for afterwards — imported, a heading, or skipped by its line.
//
// THE COLUMNS ARE GUESSED AND THEN THE PERSON'S. A bill's headers are whatever
// its author wrote, so the guess is only a start: every field can be pointed at
// another column, and the first row can be declared data rather than a header.

const PREVIEW = 8;

export default function BoqImport({ slug, tenderId, onDone, onCancel }) {
  const tr = tenderingDict(useStudioLocale());
  const fileRef = useRef(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  // Null until the person changes a column or the header toggle; until then the
  // guess from the paste stands, and a new paste guesses again.
  const [override, setOverride] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const grid = readGrid(text);
  const guessedHeader = grid.length > 0 && looksLikeHeader(grid[0]);
  const header = override ? override.header : guessedHeader;
  const mapping = override ? override.mapping : (guessedHeader ? guessMapping(grid[0]) : {});
  const read = boqRows(grid, mapping, { header });
  const width = grid.reduce((w, row) => Math.max(w, row.length), 0);
  const columns = Array.from({ length: width }, (_, i) => ({
    value: String(i),
    label: header && grid[0]?.[i] ? `${i + 1} · ${grid[0][i]}` : tr.importColumnN(i + 1),
  }));
  const labels = {
    group: tr.colGroup, code: tr.colCode, description: tr.colDescription, unit: tr.colUnit,
    qty: tr.colQty, rate: tr.colRate, notes: tr.importNotes,
  };

  const paste = (value) => { setText(value); setOverride(null); setResult(null); setError(""); };
  const setColumn = (field, value) => setOverride({
    header, mapping: { ...mapping, [field]: value === "" ? undefined : Number(value) },
  });

  async function pick(file) {
    if (!file) return;
    setFileName(file.name);
    paste(await file.text());
  }

  async function run() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/tendering/boq`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", tenderId, rows: read.rows }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(out.error === "handed-over" ? tr.billFrozen
        : out.error === "too-many" ? tr.importTooMany(MAX_IMPORT_LINES)
          : tr.importFailed);
      return;
    }
    setResult(out);
    onDone?.();
  }

  // AFTER THE IMPORT: the tally, the client-side skips and the server's together.
  if (result) {
    const skipped = [...read.skipped, ...(result.skipped || [])];
    return (
      <div className="space-y-4">
        <p className="text-sm font-600 text-emerald-700 dark:text-emerald-400">{tr.importDone(result.imported)}</p>
        {skipped.length > 0 && (
          <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
            {skipped.map((s) => <li key={`${s.line}-${s.reason}`}>{tr.importSkipReason(s.line, s.reason)}</li>)}
          </ul>
        )}
        <div className="flex justify-end"><button type="button" className={btn} onClick={onCancel}>{tr.importClose}</button></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.importLead}</p>

      <label className="block">
        <span className={microLabel}>{tr.importPasteLabel}</span>
        <textarea rows={6} value={text} onChange={(e) => paste(e.target.value)}
          className={`${input} mt-1 font-mono text-xs`} spellCheck={false} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>{tr.importAttach}</button>
        <span className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">{fileName || tr.importNoFile}</span>
      </div>

      {grid.length > 0 && (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={header}
              onChange={(e) => setOverride({ mapping, header: e.target.checked })} />
            {tr.importHeaderRow}
          </label>

          <div>
            <p className={microLabel}>{tr.importColumns}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BOQ_FIELDS.map((field) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-600 text-slate-500 dark:text-slate-400">{labels[field]}</span>
                  <SelectMenu className={input} aria-label={labels[field]}
                    value={mapping[field] !== undefined ? String(mapping[field]) : ""}
                    options={[{ value: "", label: tr.importNotInFile }, ...columns]}
                    onChange={(v) => setColumn(field, v)} />
                </label>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {tr.importReady(read.rows.length)} · {tr.importHeadings(read.headings)}
            {read.skipped.length > 0 && <span className="text-amber-700 dark:text-amber-300"> · {tr.importSkipped(read.skipped.length)}</span>}
          </p>
          {read.skipped.length > 0 && (
            <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
              {read.skipped.slice(0, 10).map((s) => <li key={`${s.line}-${s.reason}`}>{tr.importSkipReason(s.line, s.reason)}</li>)}
            </ul>
          )}

          {read.rows.length > 0 && (
            <div className="overflow-x-auto">
              <p className={microLabel}>{tr.importPreview}</p>
              <table className="mt-1 w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    {[tr.colGroup, tr.colCode, tr.colDescription, tr.colUnit, tr.colQty, tr.colRate].map((h, i) => (
                      <th key={h} className={`py-1 pe-2 font-600 ${i >= 4 ? "text-end" : "text-start"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {read.rows.slice(0, PREVIEW).map((r) => (
                    <tr key={r.line} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-1 pe-2 text-slate-500">{r.group || "—"}</td>
                      <td className="py-1 pe-2 font-mono text-slate-400">{r.code || "—"}</td>
                      <td className="py-1 pe-2 text-slate-800 dark:text-slate-100">{r.description}</td>
                      <td className="py-1 pe-2 text-slate-500">{r.unit || "—"}</td>
                      <td className="num py-1 pe-2 text-end">{r.qty}</td>
                      <td className="num py-1 pe-2 text-end">{r.rate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
        <button type="button" className={btn} disabled={busy || read.rows.length === 0 || read.rows.length > MAX_IMPORT_LINES}
          onClick={run}>
          {read.rows.length > MAX_IMPORT_LINES ? tr.importTooMany(MAX_IMPORT_LINES) : tr.importDo(read.rows.length)}
        </button>
      </div>
    </div>
  );
}
