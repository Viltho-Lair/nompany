"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { LinesSkeleton } from "@/components/studio2/RecordSkeleton";
import { projectsDict } from "@/shared/studio/projects";
// Status reads Technical's words — "Fulfilled" is a quotation line's
// condition, not a project's, and it is already written there.
import { technicalDict } from "@/shared/studio/technical";
import Link from "next/link";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, input, btn, btnGhost, th } from "@/components/studio2/ui";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { SHEET_COLUMNS, SHEET_OWNERS, rowStatus } from "@/modules/inventory/sheetColumns";

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
  const tr = projectsDict(useStudioLocale());
  const isInventory = perspective === "inventory";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  // WHICH SHEET IS OPEN, held HERE rather than in the route.
  //
  // Picking Main or Bulk used to be router.push, and a route change remounts
  // the screen and refetches everything — a whole reload to show data already
  // in hand, because every sheet in the studio arrives in the same payload.
  //
  // So switching is a setState, and the URL is rewritten with history's own
  // replaceState: the address stays correct and shareable, and React never
  // learns the route moved, so nothing remounts.
  // A PROJECT and a KIND, not a sheet id — because that is how it is chosen
  // now: a project from the bar, then Main or Bulk from the tabs at the top of
  // the work portion. The sheet is what those two resolve to.
  const [chosenProjectId, setChosenProjectId] = useState("");
  const [kind, setKind] = useState("main");

  // HIDDEN PROJECTS. A studio accumulates finished work and the rack fills with
  // jobs nobody is touching, so a project can be taken out of the bar without
  // being deleted or closed — this says nothing about the project, only about
  // whether this person wants it underfoot.
  //
  // So it is a PREFERENCE, kept per studio on this machine, exactly as the
  // column pickers are. Storing it on the project would make one person's tidy
  // rack everybody's missing project.
  const hiddenKey = `nompany:${slug}:sheets:hidden`;
  const [hidden, setHidden] = useState([]);
  useEffect(() => {
    try { setHidden(JSON.parse(window.localStorage.getItem(hiddenKey) || "[]")); } catch { setHidden([]); }
  }, [hiddenKey]);
  const setHiddenSaved = useCallback((next) => {
    setHidden(next);
    try { window.localStorage.setItem(hiddenKey, JSON.stringify(next)); } catch { /* private mode */ }
  }, [hiddenKey]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessProjectsStudio); return; }
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

  // `setDraft` is listed even though useState guarantees it is stable: React
  // Compiler infers it as a dependency, and an inferred dependency missing from
  // the source array makes it skip optimizing the component. A stable value
  // never changes, so this callback is still built exactly once.
  const edit = useCallback((rowId, key, value) => {
    setDraft((d) => ({ ...d, [rowId]: { ...(d[rowId] || {}), [key]: value } }));
  }, [setDraft]);

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
          : tr.someChangesDidnSave);
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
          label: sh.projectNumber || sh.projectTitle || tr.unnumbered,
          title: sh.projectTitle || "",
          sheets: [],
        });
      }
      by.get(sh.projectId).sheets.push(sh);
    }
    return [...by.values()];
  }, [sheets, q]);

  // NOT MEMOIZED, DELIBERATELY. These were `useMemo`, and React Compiler
  // refused to keep that ("memoized in source but not in compilation output"):
  // it judges a filter over the tab list too cheap to be worth a cache, and one
  // memo it will not preserve costs the WHOLE component its optimization. A
  // plain filter is what the compiler wanted, and it re-memoizes if that ever
  // stops being true.
  const shownTabs = projectTabs.filter((p) => !hidden.includes(p.projectId));
  const hiddenTabs = projectTabs.filter((p) => hidden.includes(p.projectId));

  // Inventory arrives at ONE sheet by id. Projects arrives at a PROJECT and
  // reads its Main sheet — the quotation as it was sold, which is the list a
  // project manager works to. Bulk is a procurement view and stays Inventory's.
  const sheet = useMemo(() => {
    if (!isInventory) {
      return sheets.find((x) => x.projectId === projectId && x.kind === "main")
        || sheets.find((x) => x.projectId === projectId) || null;
    }
    if (!chosenProjectId) return null;
    return sheets.find((x) => x.projectId === chosenProjectId && x.kind === kind)
      || sheets.find((x) => x.projectId === chosenProjectId) || null;
  }, [sheets, isInventory, chosenProjectId, kind, projectId]);

  // Opened at a sheet's own address — pick that project and kind up once, so a
  // shared link lands where it says it does.
  useEffect(() => {
    if (!isInventory || !sheetId) return;
    const at = sheets.find((x) => x.id === sheetId);
    if (at) { setChosenProjectId(at.projectId); setKind(at.kind); }
  }, [isInventory, sheetId, sheets]);

  // The address follows the selection WITHOUT navigating.
  useEffect(() => {
    if (!isInventory || !sheet) return;
    window.history.replaceState(null, "", `/${slug}/inventory-sheets/${sheet.id}`);
  }, [isInventory, sheet, slug]);

  // WHAT IS ALREADY SPOKEN FOR ON THIS SHEET, RIGHT NOW — including allocations
  // that have not been saved yet.
  //
  // The server excludes serials held by SAVED lines anywhere in the studio, but
  // it computes that once per read: allocate a unit to a row in Ground floor and
  // the dropdown on First floor still offered it, because nothing had been
  // written yet. A reserved unit is shortlisted the moment it is chosen, not the
  // moment it is saved, so the draft has to count.
  //
  // Keyed by row, so a row never excludes its own units — it would be unable to
  // show what it holds, or to release it.
  const takenByRow = useMemo(() => {
    const out = new Map();
    for (const t of sheet?.tables || []) {
      for (const r of t.rows) {
        const d = draft[r.rowId];
        out.set(r.rowId, (d && "serials" in d ? d.serials : r.serials) || []);
      }
    }
    return out;
  }, [sheet, draft]);

  const poolFor = useCallback((row) => {
    const mine = new Set(takenByRow.get(row.rowId) || []);
    const elsewhere = new Set();
    for (const [rowId, list] of takenByRow) {
      if (rowId === row.rowId) continue;
      for (const sn of list) elsewhere.add(sn);
    }
    return (row.availableSerials || []).filter((sn) => mine.has(sn) || !elsewhere.has(sn));
  }, [takenByRow]);

  const backHref = isInventory ? `/${slug}/inventory-sheets` : `/${slug}/projects-list/${projectId}`;
  const backLabel = isInventory ? tr.projectSheets : tr.project2;

  // ---- returns, all of them below every hook -------------------------------
  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <LinesSkeleton loadingLabel={tr.loadingSheet} />;

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
              Pick a project from the bar below. Main and Bulk appear as tabs at the top.
              {sheets.length === 0 && ` ${tr.noProjectsSigned}`}
            </p>
          ) : (
            <p className={`${panel} text-sm text-slate-500`}>{tr.projectNoSheetYet}</p>
          )}
        </div>
        {isInventory && (
          <ProjectBar projects={shownTabs} hiddenProjects={hiddenTabs} activeProjectId=""
            query={query} onQuery={setQuery} onGo={setChosenProjectId}
            onUnhide={(id) => setHiddenSaved(hidden.filter((x) => x !== id))} />
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
        {/* No way back on the inventory side: the bar IS how you move between
            sheets, and a button leaving the workspace has nowhere better to go.
            The project's own page still needs one. */}
        {!isInventory && <Link href={backHref} className={btnGhost}>{backLabel}</Link>}
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">
            {sheet.projectTitle || tr.untitled}
            <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 align-middle text-[11px] font-700 text-brand-700 dark:text-brand-300">
              {sheet.kind === "bulk" ? tr.bulk : tr.main}
            </span>
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {sheet.projectNumber || tr.noProjectNumberYet}
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
            {busy ? tr.saving : tr.save}
          </button>
          {/* HIDE takes this project out of the bar. A checkbox rather than a
              button because it is a state the project is in, not an action with
              a result — and it stays ticked while you are looking at a hidden
              project, so it can be unticked from here as well as from Unhide. */}
          {isInventory && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-600 text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-[#191921]"
                checked={hidden.includes(sheet.projectId)}
                onChange={(e) => setHiddenSaved(e.target.checked
                  ? [...hidden, sheet.projectId]
                  : hidden.filter((id) => id !== sheet.projectId))} />
              {tr.hide}
            </label>
          )}
          {dirtyRows > 0 && !busy && (
            <button type="button" className={btnGhost} onClick={() => setDraft({})}>{tr.discard}</button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {/* MAIN AND BULK LIVE HERE, at the top of the work portion, rather than in
          a window over the bar. They are two readings of the project already
          chosen, so they belong with what they are reading — and a tab strip
          says "these are the views of this thing" in a way a popup never did. */}
      {isInventory && (
        <Tabs value={kind} onChange={(_, v) => setKind(v)} aria-label={tr.sheet}
          textColor="inherit"
          sx={{ minHeight: 0, borderBottom: 1, borderColor: "divider",
            "& .MuiTab-root": { minHeight: 0, py: 1.25, textTransform: "none", fontSize: 13, fontWeight: 600 },
            "& .MuiTabs-indicator": { height: 2 } }}>
          <Tab value="main" label={tr.main} />
          <Tab value="bulk" label={tr.bulk} />
        </Tabs>
      )}

      {sheet.tables.length === 0 ? (
        <p className={`${panel} text-sm text-slate-500`}>
          {/* TWO KINDS OF EMPTY, and they mean different things. A sheet with
              no quotation behind it can never fill from this screen — the
              project was raised directly — where a quotation with no priced
              lines is waiting on somebody to price it. Saying "no priced
              lines" for the first reads as a bug in a screen that is working. */}
          {sheet.quotationId ? tr.quotationNoPricedLines : tr.noQuotationBehindProject}
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
                  <th className={`${th} ps-2 text-start`}>{tr.item}</th>
                  {/* The registered item's own, read back through itemId — a
                      line quoted as free text has no model to show. */}
                  <th className={`${th} text-start`}>{tr.model}</th>
                  <th className={`${th} text-start`}>{tr.qty}</th>
                  {/* EVERY column, whoever owns it — seeing the other
                      department's answer is the reason the row is shared. */}
                  {/* No owner tag. Every column here is Inventory's, so saying
                      so on each one is a word repeated across the whole table
                      that distinguishes nothing. */}
                  {/* Fixed widths on the two cells whose contents change as the
                      sheet is worked, so nothing reflows mid-edit. */}
                  {SHEET_COLUMNS.map((c) => (
                    <th key={c.key} className={`${th} text-start ${c.kind === "serials" ? "w-28" : ""}`} title={c.hint}>{c.label}</th>
                  ))}
                  <th className={`${th} w-32 text-start`} title={tr.derivedWhatAllocatedAgainst}>{tr.status}</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.rowId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className={`${td} ps-2 text-slate-800 dark:text-slate-100`}>{row.description}</td>
                    <td className={`${td} font-mono text-xs text-slate-500 dark:text-slate-400`}>
                      {row.modelNumber || "—"}
                    </td>
                    <td className={`${td} tabular-nums text-slate-600 dark:text-slate-300`}>
                      {row.qty}{row.unit ? ` ${row.unit}` : ""}
                    </td>
                    {SHEET_COLUMNS.map((c) => (
                      <td key={c.key} className={td}>
                        <Cell column={c} row={row} draft={draft[row.rowId]} pool={poolFor(row)}
                          disabled={Boolean(busy) || !canWrite(c.owner)}
                          onEdit={(v) => edit(row.rowId, c.key, v)} />
                      </td>
                    ))}
                    <td className={td}><Status row={row} draft={draft[row.rowId]} pool={poolFor(row)} /></td>
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
        <ProjectBar projects={shownTabs} hiddenProjects={hiddenTabs} activeProjectId={sheet.projectId}
          query={query} onQuery={setQuery} onGo={setChosenProjectId}
          onUnhide={(id) => setHiddenSaved(hidden.filter((x) => x !== id))} />
      )}
    </div>
  );
}

// WHERE THE ROW STANDS. Read off the DRAFT where there is one, so the status
// answers what is on screen rather than what was last saved — allocating three
// serials should say "Fulfilled" before Save is pressed, not after.
function Status({ row, draft, pool = [] }) {
  const tr = technicalDict(useStudioLocale());
  const serials = draft && "serials" in draft ? draft.serials : (row.serials || []);
  const held = new Set(serials);
  const { fulfilled, lines } = rowStatus({
    qty: row.qty,
    assigned: serials.length,
    // WHAT THIS ROW COULD STILL TAKE, from the live pool rather than the
    // server's count — so a unit another row has just claimed stops being
    // offered here as stock, in the same keystroke.
    inStock: pool.filter((sn) => !held.has(sn)).length,
  });

  if (fulfilled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-700 text-emerald-700 dark:text-emerald-300">
        {tr.fulfilled}
      </span>
    );
  }
  if (!lines.length) return <span className="text-xs text-slate-400">—</span>;
  // A LINE EACH, stacked. One sentence would run "1 assigned, 2 in stock, 2
  // needed" and read as arithmetic that does not add up; separate lines are
  // three separate facts, which is what they are.
  return (
    <span className="flex flex-col gap-0.5">
      {lines.map((l) => (
        <span key={l.key} className={`text-[11px] ${
          l.key === "needed" ? "font-600 text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
          {l.text}
        </span>
      ))}
    </span>
  );
}

// ALLOCATING UNITS, without the table moving. The button is a fixed width and a
// single line whatever is held; the panel is fixed-positioned from the button's
// own rectangle, so no ancestor can clip it and nothing below it reflows.
function SerialCell({ row, chosen, pool, changed, onEdit }) {
  const tr = projectsDict(useStudioLocale());
  const [at, setAt] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    if (!at) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setAt(null); };
    const esc = (e) => { if (e.key === "Escape") setAt(null); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [at]);

  const full = chosen.length >= row.qty && row.qty > 0;
  const free = pool.filter((sn) => !chosen.includes(sn));

  const open = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAt({ left: Math.min(r.left, window.innerWidth - 260), top: r.bottom + 4 });
  };

  return (
    <span ref={box}>
      <button type="button" onClick={open} aria-haspopup="dialog" aria-expanded={Boolean(at)}
        title={chosen.length ? chosen.join(", ") : tr.nothingAllocated}
        className={`inline-flex w-24 items-center justify-between gap-1 rounded-lg border px-2 py-1 text-xs tabular-nums transition-colors ${
          changed ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10"
            : full ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-slate-200 hover:border-brand-500 dark:border-white/15"}`}>
        <span>{chosen.length}/{row.qty}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 shrink-0 opacity-50"
          fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {at && (
        <div style={{ left: at.left, top: at.top }}
          className="fixed z-40 w-60 overflow-hidden rounded-geex border border-slate-200 bg-[var(--geex-surface)] shadow-geex dark:border-white/15">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-700 uppercase tracking-wide text-slate-400 dark:border-white/10">
            {chosen.length} of {row.qty} allocated
          </p>
          <ul className="max-h-52 overflow-auto py-1">
            {chosen.length === 0 && free.length === 0 && (
              <li className="px-3 py-3 text-xs text-slate-400">{tr.nothingStockAllocate}</li>
            )}
            {/* Held first — releasing is the thing you come back for. */}
            {chosen.map((sn) => (
              <li key={sn}>
                <button type="button" onClick={() => onEdit(chosen.filter((x) => x !== sn))}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start font-mono text-[11px] text-slate-700 hover:bg-rose-500/10 dark:text-slate-200">
                  <span aria-hidden="true" className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-brand-600 bg-brand-600 text-[9px] font-700 text-white">✓</span>
                  {sn}
                </button>
              </li>
            ))}
            {free.map((sn) => (
              <li key={sn}>
                <button type="button" disabled={full}
                  onClick={() => onEdit([...chosen, sn])}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start font-mono text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/5">
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded border border-slate-300 dark:border-white/25" />
                  {sn}
                </button>
              </li>
            ))}
          </ul>
          {full && (
            <p className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-emerald-700 dark:border-white/10 dark:text-emerald-300">
              {tr.fullyAllocated}
            </p>
          )}
        </div>
      )}
    </span>
  );
}

// One cell. A column nobody may write renders as text rather than as a disabled
// control — a greyed-out dropdown on every row teaches people to stop reading
// them, and most people will hold one department's rights and not the other's.
function Cell({ column, row, draft, pool = [], disabled, onEdit }) {
  const tr = projectsDict(useStudioLocale());
  // What is on screen is the DRAFT where there is one, and what the server holds
  // where there is not — so an unsaved edit survives a live update landing
  // underneath it rather than being wiped by somebody else's save.
  const value = draft && column.key in draft ? draft[column.key] : row[column.key];
  const changed = Boolean(draft && column.key in draft);
  const mark = changed ? "ring-1 ring-amber-400/70" : "";

  if (disabled) {
    // A DEPARTMENT THAT MAY NOT WRITE STILL HAS TO READ IT PROPERLY. Serials
    // ran together on one line as a comma list, which for a project manager is
    // the least readable form of the one thing they are checking — which units
    // are on this line. One RESERVED TAG PER LINE instead: each is a unit, and
    // a unit is a thing, not an item in a sentence.
    if (column.kind === "serials") {
      const held = Array.isArray(value) ? value : [];
      if (!held.length) return <span className="text-xs text-slate-400">—</span>;
      return (
        <span className="flex flex-col items-start gap-1">
          {held.map((sn) => (
            <span key={sn} title={tr.reservedLine}
              className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-[10px] font-600 text-brand-700 dark:text-brand-300">
              {sn}
            </span>
          ))}
        </span>
      );
    }
    return <span className="text-xs text-slate-500 dark:text-slate-400">{value || "—"}</span>;
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
  if (column.kind === "serials") {
    // A FIXED-SIZE CONTROL. Chips and a dropdown grew the cell as units were
    // allocated, so every row changed height and every column shifted while
    // somebody worked down the sheet — the table moved under the hand doing the
    // work. This is one button of constant width that says how many of how many
    // are held; the picking happens in a panel over the table, where it can be
    // as tall as it likes without moving anything.
    return <SerialCell row={row} chosen={Array.isArray(value) ? value : []} pool={pool}
      changed={changed} onEdit={onEdit} />;
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
  if (column.kind === "serials") {
    // ALLOCATION, not typing. The list is what is actually in stock and not
    // already spoken for, so a serial cannot be invented and cannot be put on
    // two jobs. Capped at the quantity sold: allocating four units to a line
    // that sold three is not a thing to let somebody do by accident.
    const chosen = Array.isArray(value) ? value : [];
    const full = chosen.length >= row.qty;
    if (!pool.length && !chosen.length) {
      return <span className="text-xs text-slate-400">{tr.noneStock}</span>;
    }
    return (
      <span className={`flex flex-col gap-1 ${mark ? "rounded p-0.5 ring-1 ring-amber-400/70" : ""}`}>
        {chosen.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {chosen.map((sn) => (
              <button key={sn} type="button" title={tr.releaseUnit}
                onClick={() => onEdit(chosen.filter((x) => x !== sn))}
                className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 font-mono text-[10px] font-600 text-brand-700 hover:bg-rose-500/15 hover:text-rose-700 dark:text-brand-300 dark:hover:text-rose-300">
                {sn} ×
              </button>
            ))}
          </span>
        )}
        {!full && (
          <select className={`${input} w-36 py-1 text-xs`} value="" aria-label={`Allocate a unit to ${row.description}`}
            onChange={(e) => { if (e.target.value) onEdit([...chosen, e.target.value]); }}>
            <option value="">{tr.allocate}</option>
            {pool.filter((sn) => !chosen.includes(sn)).map((sn) => (
              <option key={sn} value={sn}>{sn}</option>
            ))}
          </select>
        )}
      </span>
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
function ProjectBar({ projects, hiddenProjects = [], activeProjectId, query, onQuery, onGo, onUnhide }) {
  const tr = projectsDict(useStudioLocale());
  // The three-dot menu, and the Unhide window it opens. Two levels, because
  // "settings" will grow and unhiding is only the first of them.
  const [menu, setMenu] = useState("");        // "" | "menu" | "unhide"
  const [find, setFind] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setMenu(""); };
    const esc = (e) => { if (e.key === "Escape") setMenu(""); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const f = find.trim().toLowerCase();
  const findable = hiddenProjects.filter((p) => !f || `${p.label} ${p.title}`.toLowerCase().includes(f));

  // FORCED SCROLL BUTTONS. A studio accumulates projects, and a rack that only
  // scrolls by drag or wheel hides everything past the edge with nothing to say
  // so. `scrollButtons` forces the arrows to be drawn even when they are not
  // needed yet, so the control looks the same at three projects as at thirty —
  // and allowScrollButtonsMobile keeps them on small screens, where a drag is
  // the least discoverable gesture of all.
  //
  // MUI supplies the BEHAVIOUR — the scrolling, the arrows, the keyboard — and
  // the studio's own tokens supply the look, the same division Combo makes.
  return (
    <div ref={box} className="pointer-events-none fixed bottom-0 end-0 start-0 z-30 lg:start-72">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="pointer-events-auto flex items-center gap-4 rounded-t-geex border border-b-0 border-slate-200 bg-white/95 px-4 py-2 shadow-geex backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95">
          {/* A FIFTH OF THE BAR — on a WRAPPER, because the shared input class
              carries w-full and two widths on one element are settled by
              stylesheet order rather than by which was written last. */}
          <div className="w-1/5 shrink-0">
            <input type="search"
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white"
              placeholder={tr.projectQuotationPoSerial}
              value={query} onChange={(e) => onQuery(e.target.value)} />
          </div>

          {projects.length === 0 ? (
            <span className="whitespace-nowrap text-xs text-slate-400">
              {query ? tr.noProjectMatches : tr.noProjectsSignedYet}
            </span>
          ) : (
            <Tabs
              // `false` rather than "" when nothing is chosen: MUI warns about a
              // value matching no tab, and none is a real state here.
              value={projects.some((p) => p.projectId === activeProjectId) ? activeProjectId : false}
              onChange={(_, v) => onGo(v)}
              variant="scrollable"
              scrollButtons
              allowScrollButtonsMobile
              aria-label={tr.projects}
              textColor="inherit"
              sx={{
                // Shrink to fit but never grow past what is there, so the rack
                // does not push the square off the end of the bar.
                flexShrink: 1, minWidth: 0, maxWidth: "100%", minHeight: 0,
                // Rounded and hoverable: these are buttons that happen to be a
                // tab strip, and a bare label gives nothing back when the
                // pointer is over it.
                "& .MuiTab-root": {
                  minHeight: 0, py: 0.75, px: 2, mx: 0.25, borderRadius: 9999,
                  textTransform: "none", fontSize: 12, fontWeight: 600, letterSpacing: 0,
                  transition: "background-color 120ms, color 120ms",
                  "&:hover": { backgroundColor: "rgba(100,116,139,0.14)" },
                  "&.Mui-selected": { backgroundColor: "rgba(100,116,139,0.18)" },
                },
                // The indicator would sit under a pill and read as a stray
                // underline, so the selected state IS the fill.
                "& .MuiTabs-indicator": { display: "none" },
                // The arrows stay visible but recede — they are an affordance,
                // not something to look at.
                "& .MuiTabs-scrollButtons.Mui-disabled": { opacity: 0.25 },
              }}>
              {projects.map((p) => (
                <Tab key={p.projectId} value={p.projectId} label={p.label} title={p.title || p.label} />
              ))}
            </Tabs>
          )}

          {/* THE SQUARE, PINNED TO THE FAR RIGHT — `ms-auto` rather than simply
              last in the row, so it sits at the end of the BAR whether there
              are two projects or thirty. Following the tabs would have it drift
              left on an empty rack and vanish off the end on a full one.

              Its windows sit ABOVE it: the bar is at the bottom of the screen,
              so there is nowhere below to open into. Both are children of the
              bar rather than of the scrolling rack, which is what kept the
              earlier one from ever being drawn. */}
          <div className="relative ms-auto shrink-0">
            <button type="button" aria-label={tr.sheetSettings} aria-haspopup="menu"
              aria-expanded={Boolean(menu)}
              onClick={() => setMenu((m) => (m ? "" : "menu"))}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                menu
                  ? "bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>

            {menu === "menu" && (
              <div role="menu" className="absolute bottom-full end-0 mb-2 w-44 overflow-hidden rounded-geex border border-slate-200 bg-[var(--geex-surface)] shadow-geex dark:border-white/15">
                <button type="button" role="menuitem" onClick={() => { setFind(""); setMenu("unhide"); }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-start text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                  {tr.unhide}
                  <span className="text-xs text-slate-400">{hiddenProjects.length}</span>
                </button>
              </div>
            )}

            {menu === "unhide" && (
              <div className="absolute bottom-full end-0 mb-2 w-64 overflow-hidden rounded-geex border border-slate-200 bg-[var(--geex-surface)] shadow-geex dark:border-white/15">
                <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-700 uppercase tracking-wide text-slate-400 dark:border-white/10">
                  {tr.hiddenProjects}
                </p>
                <ul className="max-h-56 overflow-auto">
                  {findable.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-slate-400">
                      {hiddenProjects.length === 0 ? tr.nothingHidden : tr.noHiddenProjectMatches}
                    </li>
                  ) : findable.map((p) => (
                    <li key={p.projectId}>
                      <button type="button" onClick={() => onUnhide?.(p.projectId)}
                        className="flex w-full flex-col rounded-none px-3 py-2 text-start hover:bg-slate-50 dark:hover:bg-white/5">
                        <span className="text-sm font-600 text-slate-800 dark:text-slate-100">{p.label}</span>
                        {p.title && <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{p.title}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {/* The search is at the BOTTOM of this window, nearest the bar
                    it opened from — the hand is already down here. */}
                <div className="border-t border-slate-100 p-2 dark:border-white/10">
                  <input type="search" autoFocus value={find} onChange={(e) => setFind(e.target.value)}
                    placeholder={tr.findHiddenProject}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
