"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, input, btnGhost, th } from "@/components/studio2/ui";
import { SHEET_COLUMNS, SHEET_OWNERS } from "@/lib/sheetColumns";

// THE QUOTATION VIEWER, WITHOUT PRICES.
//
// The rows are the QUOTATION'S — read back through quotationId every time, never
// copied — and what each department adds sits beside them on one shared record
// per row. So this is one screen with two sets of controls rather than two
// screens: everybody SEES every column, because a project manager needs to know
// the cameras have not arrived and a storeman needs to know the floor is not
// ready for them. What differs is who may WRITE which, and that is decided by
// the right held, not by which door was used to get here.
//
// TABS ALONG THE BOTTOM, like a spreadsheet, because that is what this is: one
// project's sheets side by side, Main and Bulk, with every other project's
// within reach. The bar scrolls horizontally when there are more than fit, and
// the search stays pinned to its left so it never scrolls out of reach — which
// is the whole reason it is fixed rather than sitting in the bar.

const td = "py-2 pe-3 align-middle";

export default function StudioSheetViewer({ slug, projectId, sheetId }) {
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

  // Writes go to INVENTORY's route, because that is where the shared record
  // lives — whichever department's column is being written.
  const save = useCallback(async (rowId, owner, values) => {
    setBusy(rowId); setError("");
    const res = await fetch(`/api/studios/${slug}/inventory/sheets`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId, rowId, owner, values }),
    });
    setBusy("");
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      setError(out.error === "forbidden"
        ? `That column belongs to ${SHEET_OWNERS[owner]?.label || owner}, and you don't hold their right to write it.`
        : "That didn't save.");
      return;
    }
    await load();
  }, [slug, sheetId, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading sheet…</p>;

  const sheets = data.sheets || [];
  const sheet = sheets.find((s) => s.id === sheetId) || null;
  if (!sheet) {
    return (
      <div className="space-y-4">
        <Link href={`/${slug}/projects-list/${projectId}`} className={btnGhost}>← Project</Link>
        <p className={`${panel} text-sm text-slate-500`}>That sheet no longer exists.</p>
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

  const canWrite = (owner) => (owner === "inventory" ? data.canWriteInventoryColumns : data.canManageList);

  return (
    // Room at the bottom for the tab bar, which floats over the page.
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${slug}/projects-list/${projectId}`} className={btnGhost}>← Project</Link>
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
                        <Cell column={c} row={row} disabled={busy === row.rowId || !canWrite(c.owner)}
                          onSave={(v) => save(row.rowId, c.owner, { [c.key]: v })} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <SheetTabs slug={slug} tabs={shownTabs} activeId={sheetId} total={sheets.length}
        query={query} onQuery={setQuery} onGo={(s) => router.push(`/${slug}/projects-list/${s.projectId}/sheets/${s.id}`)} />
    </div>
  );
}

// One cell. A column nobody may write renders as text rather than as a disabled
// control — a greyed-out dropdown on every row teaches people to stop reading
// them, and most people will hold one department's rights and not the other's.
function Cell({ column, row, disabled, onSave }) {
  const value = row[column.key];

  if (disabled) {
    const shown = column.kind === "list" ? (value || []).join(", ") : value;
    return <span className="text-xs text-slate-500 dark:text-slate-400">{shown || "—"}</span>;
  }

  if (column.kind === "choice") {
    return (
      <select className={`${input} w-auto py-1 text-xs`} value={value || ""} aria-label={column.label}
        onChange={(e) => onSave(e.target.value)}>
        <option value="">—</option>
        {column.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (column.kind === "number") {
    return (
      <input type="number" min="0" className={`${input} w-20 py-1 text-xs`} defaultValue={value ?? ""}
        aria-label={column.label} onBlur={(e) => onSave(e.target.value)} />
    );
  }
  if (column.kind === "list") {
    return (
      <input className={`${input} w-40 py-1 text-xs`} defaultValue={(value || []).join(", ")}
        aria-label={column.label} placeholder="one per comma"
        onBlur={(e) => onSave(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
    );
  }
  return (
    <input className={`${input} w-40 py-1 text-xs`} defaultValue={value ?? ""} aria-label={column.label}
      onBlur={(e) => onSave(e.target.value)} />
  );
}

// THE TAB BAR. Floating, because a spreadsheet's tabs do not scroll away with
// the rows — you are always one click from another sheet however far down you
// are. The SEARCH IS FIXED TO ITS LEFT and outside the scrolling strip, so it
// stays reachable no matter how many tabs there are; putting it inside the
// strip would mean scrolling to find the thing that does the finding.
function SheetTabs({ slug, tabs, activeId, total, query, onQuery, onGo }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#20202c]/95">
      <div className="flex items-center gap-3 px-4 py-2">
        <input type="search" className={`${input} w-56 shrink-0 py-1.5 text-xs`}
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
