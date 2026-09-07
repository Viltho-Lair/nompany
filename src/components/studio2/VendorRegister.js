// THE VENDOR REGISTER — who the studio buys from, what they supply, and how
// long each kind takes to arrive.
//
// EXTRACTED FROM StudioInventory RATHER THAN COPIED. This was Inventory's
// Vendors view and is now rendered by the supplier screen, which owns the
// section; leaving a second copy behind would be two registers over one
// collection, free to disagree about what a supplier is the first time either
// changed. The CRUD still posts to Inventory's own `vendors` endpoint, because
// the record is still Inventory's `inventoryVendors` and a second create path
// is a second shape of the same row.
"use client";
import { useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { inventoryDict } from "@/shared/studio/inventory";
import { microLabel, btn, btnGhost, input } from "@/components/studio2/ui";
import { Icon } from "@/components/studio2/icons";
import { Field } from "@/components/fields/Field";
import { readVendorCsv } from "@/modules/inventory/vendorCsv";

// ---- vendors ---------------------------------------------------------------

// IMPORTING A LIST somebody was handed, rather than typing it in one vendor at
// a time. Three things happen in here, and they are deliberately separate:
//
//   1. THE FILE IS READ IN THE BROWSER. It is already here; sending it to be
//      parsed elsewhere would add a round trip and a multipart body for no
//      answer we cannot work out locally. What goes up is JSON the route
//      re-validates from scratch, so nothing is trusted for having been parsed.
//   2. WHAT IT SAYS IS SHOWN BEFORE IT IS COMMITTED. Attaching tells you how
//      many vendors are in there and how many lines have no name; nobody
//      imports two hundred rows blind.
//   3. THE PROMPT IS THE ANSWER TO "I DON'T HAVE A FILE". Most people asked for
//      a CSV have no idea how to produce one, so the dialog carries the exact
//      words to hand an AI along with whatever list they do have.
export function VendorImport({ busy, onCancel, send }) {
  const tr = inventoryDict(useStudioLocale());
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [read, setRead] = useState(null);   // what the attached file turned out to hold
  const [result, setResult] = useState(null); // what the server did with it
  const [copied, setCopied] = useState(false);
  // Set only when the clipboard refuses (an insecure origin, a browser policy).
  // The prompt is then shown to be selected by hand — a Copy button that fails
  // silently is a button that teaches people the feature is broken.
  const [showPrompt, setShowPrompt] = useState(false);

  async function pick(file) {
    setResult(null);
    if (!file) { setFileName(""); setRead(null); return; }
    setFileName(file.name);
    setRead(readVendorCsv(await file.text()));
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(tr.importAiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowPrompt(true); // blocked — let them take it by hand instead
    }
  }

  async function run() {
    const out = await send("vendors/import", "POST", { rows: read.rows });
    // `false` is a refusal, and the banner on the screen behind already says
    // why. Anything else is the tally.
    if (out) setResult(out);
  }

  // `read.rows` carries the nameless ones too — they are sent so the server can
  // report them by line (see readVendorCsv) — so what is READY is what is left
  // after them.
  const nameless = read?.nameless.length || 0;
  const ready = (read?.rows.length || 0) - nameless;

  return (
    <>
      {/* The prompt comes FIRST, because not having a file is the state most
          people open this dialog in. */}
      <div className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-4 dark:border-white/15">
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr.importPromptHint}</p>
        <button type="button" className={`${btnGhost} mt-3`} onClick={copyPrompt}>
          {copied ? tr.copied : tr.copy}
        </button>
        {showPrompt && (
          <textarea readOnly rows={8} value={tr.importAiPrompt}
            className={`${input} mt-3 font-mono text-xs`} onFocus={(e) => e.target.select()} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>{tr.attachFile}</button>
        <span className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">{fileName || tr.noFileChosen}</span>
      </div>

      {/* What the file turned out to hold, before anything is sent. */}
      {read && !result && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {read.noNameColumn || read.rows.length === 0
            ? tr.mEmptyFile
            : <>{tr.importReady(ready)}{nameless > 0 && <span className="text-amber-600 dark:text-amber-400"> · {tr.importSkipping(nameless)}</span>}</>}
        </p>
      )}

      {/* What the server actually did. A row can be refused for a reason the
          file alone could not know — the name is already on the list — so this
          is not the same list as the one above and never stands in for it. */}
      {result && (
        <div className="mt-3">
          <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.importDone(result.created || 0)}</p>
          {(result.skipped || []).length > 0 && (
            <>
              <p className={`${microLabel} mt-3`}>{tr.importNotImported}</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {result.skipped.map((s) => (
                  <li key={s.line}>
                    {tr.importLine(s.line)} — {s.name ? `${s.name}: ` : ""}
                    {s.reason === "duplicate" ? tr.importTaken : tr.importNoName}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {/* Once it has run, Import is spent: pressing it again would re-send the
            same rows, and every one of them would come back a duplicate. */}
        {!result && (
          <button className={btn} disabled={busy || !ready} onClick={run}>
            {busy ? tr.importing : tr.importLabel}
          </button>
        )}
        <button className={btnGhost} onClick={onCancel}>{result ? tr.close : tr.cancel}</button>
      </div>
    </>
  );
}

export function VendorForm({ row, busy, onSave, onCancel }) {
  const tr = inventoryDict(useStudioLocale());
  const [f, setF] = useState({
    name: row?.name || "", contactName: row?.contactName || "", email: row?.email || "",
    phone: row?.phone || "", notes: row?.notes || "",
  });
  const [types, setTypes] = useState(row?.itemTypes || []);
  const setType = (i, k, v) => setTypes((cur) => cur.map((t, n) => (n === i ? { ...t, [k]: v } : t)));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} required value={f.name} onChange={(v) => setF((s) => ({ ...s, name: v }))} />
        <Field label={tr.contact} value={f.contactName} onChange={(v) => setF((s) => ({ ...s, contactName: v }))} />
        <Field label={tr.email} type="email" value={f.email} onChange={(v) => setF((s) => ({ ...s, email: v }))} />
        <Field label={tr.phone} value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={microLabel}>{tr.itemTypes}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.whatVendorSuppliesHow}</p>
          </div>
          <button type="button" className={btnGhost} onClick={() => setTypes((cur) => [...cur, { type: "", weeks: "" }])}>{tr.addType}</button>
        </div>
        {types.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">{tr.noneYet}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {types.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
                <Field label={tr.type} value={t.type} onChange={(v) => setType(i, "type", v)} className="flex-1" />
                <Field label={tr.weeks} type="number" min="0" value={t.weeks} onChange={(v) => setType(i, "weeks", v)} className="w-32" />
                <button type="button" aria-label={tr.remove} title={tr.remove}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                  onClick={() => setTypes((cur) => cur.filter((_, n) => n !== i))}>
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4"><Field label={tr.notes} as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} inputProps={{ rows: 2 }} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={() => onSave({ ...f, itemTypes: types })}>{busy ? tr.saving : tr.saveVendor}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

