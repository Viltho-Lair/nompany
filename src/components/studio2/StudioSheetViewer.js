"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, input, btn, btnGhost, th } from "@/components/studio2/ui";
import { SHEET_COLUMNS, SHEET_OWNERS } from "@/lib/sheetColumns";

// THE QUOTATION VIEWER, WITHOUT PRICES — in two perspectives.
//
// PROJECT SHEETS ARE INVENTORY'S. They are a sub-section of Inventory, worked by
// inventory people, and that is where they live: /<slug>/inventory-sheets/<id>.
// That is the INVENTORY version, and it is the one with the sheet tabs, because
// the sheets are theirs to move between.
//
// PROJECTS HAS ITS OWN, at /<slug>/projects-list/<id>/quotation. Same quotation,
// same rows, same shared per-row record — a different set of controls and no
// sheet tabs, because a project manager is looking at ONE project rather than
// working along a rack of sheets.
//
// So `perspective` decides which columns this viewer offers to write and
// whether the tab bar is drawn. It does NOT decide what is shown: both show
// every column, because a project manager needs to know the cameras have not
// arrived and a storeman needs to know the floor is not ready for them.
//
// The rows are the QUOTATION'S — read back through quotationId every time, never
// copied — and what each department adds sits beside them on one shared record
// per row.
//
// TABS ALONG THE BOTTOM of the working section, like a spreadsheet's: the rack
// of sheets, scrolling horizontally when there are more than fit, with a small
// search pinned to their left so it never scrolls out of reach.

const td = "py-2 pe-3 align-middle";

export default function StudioSheetViewer({ slug, projectId, sheetId, perspective = "inventory" }) {
  const isInventory = perspective === "inventory";
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Projects in this studio."); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "projects", load);
  // The other department writing its column is the whole point of a shared row,
  // so this screen picks that up without a reload.
  useLiveUpdates(slug, "inventory", load);

  // NOTHING SAVES UNTIL SAVE IS PRESSED. Edits collect in `draft`, keyed by row,
  // and the screen says how many rows are waiting. A sheet is worked down a
  // column — twenty serials, then the statuses — and writing on every keystroke
  // or every blur would be twenty requests, twenty chances to half-succeed, and
  // no moment where somebody decides they are finished.
  //
  // The draft is cleared when the save lands, so what is on screen after a save
  // is what the server actually holds rather than what was typed at it.
  const [draft, setDraft] = useState({});
  const dirtyRows = Object.keys(draft).length;

  const edit = useCallback((rowId, key, value) => {
    setDraft((d) => ({ ...d, [rowId]: { ...(d[rowId] || {}), [key]: value } }));
  }, []);

  // Once nothing saves by itself, closing the tab is a way to lose work — so
  // the browser asks. Only while something is actually pending: a prompt on
  // every exit is one people learn to dismiss without reading.
  useEffect(() => {
    if (!dirtyRows) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyRows]);

  // Writes go to INVENTORY's route, because that is where the shared record
  // lives — whichever department's column is being written.
  //
  // The sheet id comes from the RESOLVED sheet, not from the prop: Projects
  // arrives at a project rather than at a sheet, so the prop is undefined on
  // that path and every write would have gone to nowhere.
  const saveAll = useCallback(async (id, owner) => {
    const rows = Object.entries(draft);
    if (!rows.length) return;
    setBusy("saving"); setError("");
    // One request per changed ROW, not per cell — the server applies a row's
    // columns in one atomic write, so a row cannot land half-changed.
    for (const [rowId, values] of rows) {
      const res = await fetch(`/api/studios/${slug}/inventory/sheets`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: id, rowId, owner, values }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        setBusy("");
        setError(out.error === "forbidden"
          ? `That column belongs to ${SHEET_OWNERS[owner]?.label || owner}, and you don't hold their right to write it.`
          : "Some changes didn't save — nothing after the failed row was sent.");
        await load();
        return;
      }
    }
    setBusy("");
    setDraft({});
    await load();
  }, [slug, draft, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading sheet…</p>;

  const sheets = data.sheets || [];
  // Declared before the not-found return below, which uses them.
  const backHref = isInventory ? `/${slug}/inventory-sheets` : `/${slug}/projects-list/${projectId}`;
  const backLabel = isInventory ? "← Project sheets" : "← Project";

  // Inventory arrives at ONE sheet by id. Projects arrives at a PROJECT and
  // reads its Main sheet — the quotation as it was sold, which is the list a
  // project manager works to. Bulk is a procurement view and stays Inventory's.
  const sheet = isInventory
    ? sheets.find((s) => s.id === sheetId) || null
    : sheets.find((s) => s.projectId === projectId && s.kind === "main")
      || sheets.find((s) => s.projectId === projectId) || null;
  if (!sheet) {
    return (
      <div className="space-y-4">
        <Link href={backHref} className={btnGhost}>{backLabel}</Link>
        <p className={`${panel} text-sm text-slate-500`}>
          {isInventory ? "That sheet no longer exists." : "This project has no sheet yet."}
        </p>
      </div>
    );
  }

  // WHAT THE SEARCH LOOKS THROUGH, and it is not the rows — it is the SHEETS.
  // Somebody typing a serial, a project number or a quotation number is asking
  // "which sheet is that on", and the answer is a tab to jump to.
  const q = query.trim().toLowerCase();
  const matches = (s) => !q || [
    s.projectNumber, s.quotationNumber, s.projectTitle, s.clientName, s.poNumber,
    ...(s.serials || []),
  ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  const shownTabs = sheets.filter(matches);

  // WHAT THIS PERSPECTIVE OFFERS TO WRITE. Assigning serials is Inventory's;
  // installation and programming are Projects'. Holding the other department's
  // right is not enough on its own — you have to be looking at their screen,
  // which is what keeps each department's work on its own screen instead of
  // every column being editable from everywhere.
  const canWrite = (owner) => owner === perspective
    && (owner === "inventory" ? data.canWriteInventoryColumns : data.canManageList);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className={btnGhost}>{backLabel}</Link>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">
            {sheet.projectTitle || "Untitled"}
            <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 align-middle text-[11px] font-700 text-brand-700 dark:text-brand-300">
              {sheet.kind === "bulk" ? "Bulk" : "Main"}
            </span>
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {sheet.projectNumber || "No project number yet"}
            {sheet.quotationNumber ? ` · ${sheet.quotationNumber}` : ""}
            {sheet.clientName ? ` · ${sheet.clientName}` : ""}
          </p>
        </div>

        {/* NOTHING IS WRITTEN UNTIL THIS IS PRESSED, and it says how much is
            waiting. Disabled with nothing pending rather than hidden, so the
            screen always shows that saving is a thing you do here. */}
        <div className="ms-auto flex items-center gap-3">
          {dirtyRows > 0 && (
            <span className="text-xs font-600 text-amber-700 dark:text-amber-300">
              {dirtyRows} {dirtyRows === 1 ? "row" : "rows"} unsaved
            </span>
          )}
          <button type="button" className={btn} disabled={!dirtyRows || Boolean(busy)}
            onClick={() => saveAll(sheet.id, perspective)}>
            {busy ? "Saving…" : "Save"}
          </button>
          {dirtyRows > 0 && !busy && (
            <button type="button" className={btnGhost} onClick={() => setDraft({})}>Discard</button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {sheet.tables.length === 0 ? (
        <p className={`${panel} text-sm text-slate-500`}>
          The quotation behind this sheet has no priced lines yet. Add them in the builder and they appear here.
        </p>
      ) : sheet.tables.map((table) => (
        <section key={table.id} className={panel}>
          {table.title && (
            <p className="mb-2 font-display text-sm font-700 text-slate-900 dark:text-white">{table.title}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={`${th} ps-2 text-start`}>Item</th>
                  <th className={`${th} text-start`}>Qty</th>
                  {/* EVERY column, whoever owns it — seeing the other
                      department's answer is the reason the row is shared. */}
                  {SHEET_COLUMNS.map((c) => (
                    <th key={c.key} className={`${th} text-start`} title={c.hint}>
                      {c.label}
                      <span className="ms-1 font-400 normal-case text-slate-400">{SHEET_OWNERS[c.owner].label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.rowId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className={`${td} ps-2 text-slate-800 dark:text-slate-100`}>{row.description}</td>
                    <td className={`${td} tabular-nums text-slate-600 dark:text-slate-300`}>
                      {row.qty}{row.unit ? ` ${row.unit}` : ""}
                    </td>
                    {SHEET_COLUMNS.map((c) => (
                      <td key={c.key} className={td}>
                        <Cell column={c} row={row} draft={draft[row.rowId]}
                          disabled={Boolean(busy) || !canWrite(c.owner)}
                          onEdit={(v) => edit(row.rowId, c.key, v)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* THE TABS ARE INVENTORY'S. A project manager is looking at one project;
          a storeman is working along every sheet in the studio. */}
      {isInventory && (
        <SheetTabs tabs={shownTabs} activeId={sheet.id} total={sheets.length}
          query={query} onQuery={setQuery} onGo={(s) => router.push(`/${slug}/inventory-sheets/${s.id}`)} />
      )}
    </div>
  );
}

// One cell. A column nobody may write renders as text rather than as a disabled
// control — a greyed-out dropdown on every row teaches people to stop reading
// them, and most people will hold one department's rights and not the other's.
function Cell({ column, row, draft, disabled, onEdit }) {
  // What is on screen is the DRAFT where there is one, and what the server holds
  // where there is not — so an unsaved edit survives a live update landing
  // underneath it rather than being wiped by somebody else's save.
  const value = draft && column.key in draft ? draft[column.key] : row[column.key];
  const changed = Boolean(draft && column.key in draft);
  const mark = changed ? "ring-1 ring-amber-400/70" : "";

  if (disabled) {
    const shown = column.kind === "list" ? (value || []).join(", ") : value;
    return <span className="text-xs text-slate-500 dark:text-slate-400">{shown || "—"}</span>;
  }

  if (column.kind === "choice") {
    return (
      <select className={`${input} ${mark} w-auto py-1 text-xs`} value={value || ""} aria-label={column.label}
        onChange={(e) => onEdit(e.target.value)}>
        <option value="">—</option>
        {column.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (column.kind === "number") {
    return (
      <input type="number" min="0" className={`${input} ${mark} w-20 py-1 text-xs`} value={value ?? ""}
        aria-label={column.label} onChange={(e) => onEdit(e.target.value)} />
    );
  }
  if (column.kind === "list") {
    return (
      <input className={`${input} ${mark} w-40 py-1 text-xs`}
        value={Array.isArray(value) ? value.join(", ") : (value || "")}
        aria-label={column.label} placeholder="one per comma"
        onChange={(e) => onEdit(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
    );
  }
  return (
    <input className={`${input} ${mark} w-40 py-1 text-xs`} value={value ?? ""} aria-label={column.label}
      onChange={(e) => onEdit(e.target.value)} />
  );
}

// THE TAB BAR. Floating, because a spreadsheet's tabs do not scroll away with
// the rows — you are always one click from another sheet however far down you
// are. The SEARCH IS FIXED TO ITS LEFT and outside the scrolling strip, so it
// stays reachable no matter how many tabs there are; putting it inside the
// strip would mean scrolling to find the thing that does the finding.
function SheetTabs({ tabs, activeId, total, query, onQuery, onGo }) {
  return (
    // STICKY, NOT FIXED. Fixed spanned the whole viewport — under the sidebar
    // and out to both edges of the screen — which is not where this belongs.
    // Sticky keeps it inside the working section, so it is as wide as the
    // content is and the sidebar keeps its own space.
    <div className="sticky bottom-0 z-20 rounded-t-geex border border-b-0 border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95">
      <div className="flex items-center gap-3 px-3 py-2">
        {/* A SMALL FIELD, not a full-width one. It sits beside the tabs rather
            than above them, and its job is to narrow a long rack down. */}
        <input type="search" className={`${input} w-44 shrink-0 py-1.5 text-xs`}
          placeholder="Project, quotation, PO or serial…"
          value={query} onChange={(e) => onQuery(e.target.value)} />

        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {tabs.length === 0 ? (
            <span className="whitespace-nowrap py-1.5 text-xs text-slate-400">
              Nothing matches — {total} {total === 1 ? "sheet" : "sheets"} in this studio.
            </span>
          ) : tabs.map((s) => (
            <button key={s.id} type="button" onClick={() => onGo(s)}
              title={`${s.projectTitle || "Untitled"}${s.quotationNumber ? ` · ${s.quotationNumber}` : ""}`}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-600 transition-colors ${
                s.id === activeId
                  ? "border-brand-600 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              {s.projectNumber || s.projectTitle || "Untitled"}
              <span className="ms-1.5 font-400 text-slate-400">{s.kind === "bulk" ? "Bulk" : "Main"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
