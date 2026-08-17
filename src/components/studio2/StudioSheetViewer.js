"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // EVERY HOOK RUNS BEFORE ANY RETURN, and every value is derived before the
  // return that uses it. Both rules were broken here: useMemo sat below three
  // early returns, so the hook order changed between "loading" and "loaded" and
  // React tore the screen down; and the empty-state return read projectTabs
  // twenty lines above its own declaration. Neither is a build error — both are
  // a blank page with "This page couldn't load".
  const sheets = useMemo(() => data?.sheets || [], [data]);

  // WHAT THE SEARCH LOOKS THROUGH, and it is not the rows — it is the SHEETS.
  // Somebody typing a serial, a project number or a quotation number is asking
  // "which project is that on", and the answer is a button to press.
  const q = query.trim().toLowerCase();

  // ONE BUTTON PER PROJECT, not per sheet. A project signed today puts one
  // button in the bar; Main and Bulk are what is behind it, because they are
  // two ways of reading that project rather than two projects.
  const projectTabs = useMemo(() => {
    const matches = (sh) => !q || [
      sh.projectNumber, sh.quotationNumber, sh.projectTitle, sh.clientName, sh.poNumber,
      ...(sh.serials || []),
    ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));

    const by = new Map();
    for (const sh of sheets.filter(matches)) {
      if (!by.has(sh.projectId)) {
        by.set(sh.projectId, {
          projectId: sh.projectId,
          label: sh.projectNumber || sh.projectTitle || "Unnumbered",
          title: sh.projectTitle || "",
          sheets: [],
        });
      }
      by.get(sh.projectId).sheets.push(sh);
    }
    return [...by.values()];
  }, [sheets, q]);

  // Inventory arrives at ONE sheet by id. Projects arrives at a PROJECT and
  // reads its Main sheet — the quotation as it was sold, which is the list a
  // project manager works to. Bulk is a procurement view and stays Inventory's.
  const sheet = useMemo(() => (isInventory
    ? sheets.find((x) => x.id === sheetId) || null
    : sheets.find((x) => x.projectId === projectId && x.kind === "main")
      || sheets.find((x) => x.projectId === projectId) || null), [sheets, isInventory, sheetId, projectId]);

  const backHref = isInventory ? `/${slug}/inventory-sheets` : `/${slug}/projects-list/${projectId}`;
  const backLabel = isInventory ? "← Project sheets" : "← Project";

  // ---- returns, all of them below every hook -------------------------------
  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading sheet…</p>;

  // THE WORK PORTION IS EMPTY UNTIL A SHEET IS CHOSEN. The bar stays, because
  // the bar is how one is chosen — an inventory person opens this screen to get
  // to a project, not to be shown one.
  if (!sheet) {
    return (
      // pb clears the fixed bar, which is out of flow and would otherwise
      // sit over the last of the content.
      <div className="flex min-h-[60vh] flex-col gap-4 pb-16">
        <div className="flex flex-1 items-center justify-center">
          {isInventory ? (
            <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
              Pick a project from the bar below, then Main or Bulk.
              {sheets.length === 0 && " No projects have been signed yet — a project's sheets are drawn up when it is opened from an approved quotation."}
            </p>
          ) : (
            <p className={`${panel} text-sm text-slate-500`}>This project has no sheet yet.</p>
          )}
        </div>
        {isInventory && (
          <ProjectBar projects={projectTabs} activeProjectId="" activeSheetId=""
            query={query} onQuery={setQuery} onGo={(sh) => router.push(`/${slug}/inventory-sheets/${sh.id}`)} />
        )}
      </div>
    );
  }

  // WHAT THIS PERSPECTIVE OFFERS TO WRITE. Assigning serials is Inventory's;
  // installation and programming are Projects'. Holding the other department's
  // right is not enough on its own — you have to be looking at their screen,
  // which is what keeps each department's work on its own screen instead of
  // every column being editable from everywhere.
  const canWrite = (owner) => owner === perspective
    && (owner === "inventory" ? data.canWriteInventoryColumns : data.canManageList);

  return (
    // TWO PORTIONS. The work portion takes everything between the top bar and
    // the bar; the bar is always at the bottom. min-h keeps the bar down there
    // even on a short sheet, rather than floating it up under the last row.
    <div className={isInventory ? "pb-16" : ""}>
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

      </div>

      {/* THE BAR IS INVENTORY'S. A project manager is looking at one project; a
          storeman is working along every project in the studio. */}
      {isInventory && (
        <ProjectBar projects={projectTabs} activeProjectId={sheet.projectId} activeSheetId={sheet.id}
          query={query} onQuery={setQuery} onGo={(sh) => router.push(`/${slug}/inventory-sheets/${sh.id}`)} />
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
// THE BAR. Always along the bottom of the working section, never over the
// sidebar, and it does not scroll away with the rows — it is how somebody gets
// from one project to the next, so it has to be there whatever they are looking
// at, including at nothing.
//
// The search takes a FIFTH of the bar and the projects take the rest, scrolling
// horizontally when there are more than fit. The search sits outside that strip
// so it never scrolls out of reach — scrolling to find the thing that does the
// finding is the fault it exists to avoid.
//
// ONE BUTTON PER PROJECT. Signing a project puts its number in the bar; Main
// and Bulk are behind it in a small window, because they are two readings of
// that project rather than two projects.
function ProjectBar({ projects, activeProjectId, activeSheetId, query, onQuery, onGo }) {
  const [open, setOpen] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(""); };
    const esc = (e) => { if (e.key === "Escape") setOpen(""); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    // FIXED POSITIONING — pinned to the viewport, so it stays where it is
    // however far the work portion scrolls. Sticky was the wrong tool: it only
    // pins within its own container, so it drifted with the page.
    //
    // Offset past the sidebar rather than spanning the window: the sidebar is
    // w-64 at start-4 and the content sits at lg:ps-72, so the bar starts there
    // too and the sidebar keeps its own space.
    <div ref={box}
      className="fixed bottom-0 end-0 start-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:start-72 dark:border-white/10 dark:bg-[#20202c]/95">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-2 sm:px-8">
        {/* A FIFTH OF THE BAR, and it has to be a WRAPPER: the shared `input`
            class carries w-full, and two width utilities on one element are
            settled by stylesheet order rather than by which was written last —
            so w-1/5 on the input itself lost. */}
        <div className="w-1/5 shrink-0">
          <input type="search" className={`${input} py-1.5 text-xs`}
            placeholder="Project, quotation, PO, serial…"
            value={query} onChange={(e) => onQuery(e.target.value)} />
        </div>

        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {projects.length === 0 ? (
            <span className="whitespace-nowrap py-1.5 text-xs text-slate-400">
              {query ? "No project matches that." : "No projects signed yet."}
            </span>
          ) : projects.map((p) => (
            <div key={p.projectId} className="relative shrink-0">
              <button type="button" title={p.title || p.label}
                onClick={() => setOpen((cur) => (cur === p.projectId ? "" : p.projectId))}
                className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-600 transition-colors ${
                  p.projectId === activeProjectId
                    ? "border-brand-600 text-brand-700 dark:text-brand-300"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                {p.label}
              </button>

              {/* THE SMALL WINDOW. Two buttons, because a project has two
                  sheets and neither is a default — Main is what was sold, Bulk
                  is what has to be bought. */}
              {open === p.projectId && (
                <div className="absolute bottom-full end-0 mb-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
                  {["main", "bulk"].map((kind) => {
                    const sh = p.sheets.find((x) => x.kind === kind);
                    if (!sh) return null;
                    return (
                      <button key={kind} type="button"
                        onClick={() => { setOpen(""); onGo(sh); }}
                        className={`flex w-full flex-col rounded-lg px-3 py-2 text-start hover:bg-slate-50 dark:hover:bg-white/5 ${
                          sh.id === activeSheetId ? "bg-brand-500/10" : ""}`}>
                        <span className="text-sm font-600 text-slate-800 dark:text-slate-100">
                          {kind === "main" ? "Main" : "Bulk"}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {kind === "main" ? "As quoted" : "Summed, by vendor"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
