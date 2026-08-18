"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import {
  Dialog, Empty, btn, btnGhost, input, label, th, fmtDate,
} from "@/components/studio2/ui";
import { STATUS_LABELS } from "@/lib/qualityDocuments";

// THE DOCUMENT REGISTER — Quality → Documents, full screen.
//
// It renders OUTSIDE StudioFrame, so a register of several hundred controlled
// documents gets the whole viewport rather than the column left over beside a
// sidebar. The way back goes to Quality, because with the sidebar gone that is
// otherwise only reachable through the browser's own back button.
//
// This is the register, not the editor. It answers the questions an auditor
// asks — what documents exist, what each is called, who owns it, which revision
// is current and when it is next due for review — and the authoring screen
// hangs off it.

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "in-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  effective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  obsolete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const blankDraft = () => ({
  title: "", typeId: "", departmentId: "", ownerCollaboratorId: "", language: "en", nextReviewDate: "",
});

// The register's own words for the refusals the service can return, so a
// message says what happened rather than printing a slug at somebody.
const MESSAGES = {
  title: "Give the document a title.",
  type: "Choose a document type.",
  department: "Choose the department that owns it.",
  owner: "That person is not in this studio.",
  controlled: "This document has been issued, so it is kept rather than deleted. Withdraw it instead.",
  forbidden: "You don't have permission to do that.",
  "read-only": "You don't have permission to do that.",
};
const say = (error) => MESSAGES[error] || "That didn't work. Try again.";

export default function StudioQualityDocuments({ studio }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ typeId: "", departmentId: "", status: "" });
  const [draft, setDraft] = useState(null);      // the New / Edit dialog
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/quality`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 403 ? "You don't have access to Quality documents in this studio." : "Couldn't load the register.");
      return;
    }
    setData(await res.json());
    setError("");
  }, [studio.slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(studio.slug, "quality-documents", load);

  const send = async (method, body, path = "documents") => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/studios/${studio.slug}/quality/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(say(payload.error)); return null; }
      await load();
      return payload;
    } finally {
      setBusy(false);
    }
  };

  const documents = data?.documents || [];
  const types = data?.types || [];

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (filters.typeId && d.typeId !== filters.typeId) return false;
      if (filters.departmentId && d.departmentId !== filters.departmentId) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (!q) return true;
      return `${d.code} ${d.title} ${d.typeName} ${d.departmentName} ${d.ownerAlias}`.toLowerCase().includes(q);
    });
  }, [documents, search, filters]);

  const filtering = Boolean(search.trim() || filters.typeId || filters.departmentId || filters.status);

  const save = async () => {
    const body = { ...draft };
    const result = draft.id ? await send("PUT", body) : await send("POST", body);
    if (result) setDraft(null);
  };

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/quality`}
            title="Back to Quality"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">Documents</h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {studio.name} · Quality
              {data && ` · ${documents.length} document${documents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            {data?.canSetup && (
              <Link href={`/${studio.slug}/quality-documents/settings`} className={btnGhost}>Setup</Link>
            )}
            {data?.canCreate && types.length > 0 && (
              <button type="button" className={btn} onClick={() => setDraft(blankDraft())}>New document</button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {notice && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{notice}</p>
        )}

        {/* NO TAXONOMY YET. A register cannot mint a code without a type, so
            this comes before the documents empty state rather than after it —
            there is a step to take, and it is not "add a document". */}
        {data && types.length === 0 && (
          <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
            <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">No document types yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Every document is numbered from its type, so the register needs at least one before it can hold anything.
              Most quality systems use the same five — you can install them and edit them afterwards, or define your own.
            </p>
            {data.canSetup && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button type="button" className={btn} disabled={busy}
                  onClick={() => send("POST", { starter: true }, "types")}>
                  Install the ISO 9001 starter set
                </button>
                <Link href={`/${studio.slug}/quality-documents/settings`} className={btnGhost}>Define my own</Link>
              </div>
            )}
            {!data.canSetup && (
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">An admin of this studio can set them up.</p>
            )}
          </div>
        )}

        {data && types.length > 0 && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, title, owner…"
                className={`${input} max-w-xs`}
                aria-label="Search documents"
              />
              <select value={filters.typeId} onChange={(e) => setFilters((f) => ({ ...f, typeId: e.target.value }))}
                className={`${input} max-w-[190px]`} aria-label="Filter by type">
                <option value="">All types</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={filters.departmentId} onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
                className={`${input} max-w-[190px]`} aria-label="Filter by department">
                <option value="">All departments</option>
                {(data.departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className={`${input} max-w-[170px]`} aria-label="Filter by status">
                <option value="">Any status</option>
                {(data.vocabulary?.statuses || []).map((s) => (
                  <option key={s} value={s}>{data.vocabulary.statusLabels?.[s] || s}</option>
                ))}
              </select>
              {filtering && (
                <button type="button"
                  onClick={() => { setSearch(""); setFilters({ typeId: "", departmentId: "", status: "" }); }}
                  className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
                  Clear
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <Empty
                title="No documents yet"
                body="A controlled document is numbered the moment it is created, and keeps that number for good. Create the first one to start the register."
              />
            ) : shown.length === 0 ? (
              <Empty title="Nothing matches" body="No document in the register matches what you're looking for." />
            ) : (
              <div className="overflow-x-auto rounded-geex border border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
                      <th className={`${th} ps-4 pt-3 text-start`}>Code</th>
                      <th className={`${th} pt-3 text-start`}>Title</th>
                      <th className={`${th} pt-3 text-start`}>Type</th>
                      <th className={`${th} pt-3 text-start`}>Department</th>
                      <th className={`${th} pt-3 text-start`}>Rev</th>
                      <th className={`${th} pt-3 text-start`}>Status</th>
                      <th className={`${th} pt-3 text-start`}>Owner</th>
                      <th className={`${th} pt-3 text-start`}>Next review</th>
                      <th className={`${th} pe-4 pt-3 text-end`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                        <td className="whitespace-nowrap ps-4 py-3 font-mono text-xs font-700 text-slate-900 dark:text-white">{d.code}</td>
                        <td className="py-3 pe-3">
                          {/* The title is the way in. A register row's job is to
                              lead to the document, so the whole row would be a
                              link if the Actions column did not also live on it. */}
                          <Link href={`/${studio.slug}/quality-documents/${d.id}`}
                            className={`text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300 ${d.status === "obsolete" ? "line-through opacity-70" : ""}`}
                            dir={d.direction}>{d.title}</Link>
                        </td>
                        <td className="whitespace-nowrap py-3 pe-3 text-slate-600 dark:text-slate-300">{d.typeName || "—"}</td>
                        <td className="whitespace-nowrap py-3 pe-3 text-slate-600 dark:text-slate-300">{d.departmentName || "—"}</td>
                        <td className="whitespace-nowrap py-3 pe-3 text-slate-600 dark:text-slate-300">
                          {/* Revision 0 is not a revision anybody holds — it is a
                              document that has never been issued. Saying so beats
                              printing a zero that looks like a number. */}
                          {d.revision > 0 ? d.revision : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap py-3 pe-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_BADGE[d.status] || STATUS_BADGE.draft}`}>
                            {data.vocabulary?.statusLabels?.[d.status] || STATUS_LABELS[d.status] || d.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pe-3 text-slate-600 dark:text-slate-300">{d.ownerAlias || "—"}</td>
                        <td className="whitespace-nowrap py-3 pe-3">
                          <span className={d.reviewOverdue ? "font-600 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}>
                            {fmtDate(d.nextReviewDate)}
                            {d.reviewOverdue && " · overdue"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap pe-4 py-3 text-end">
                          <Link href={`/${studio.slug}/quality-documents/${d.id}`}
                            className="text-xs font-600 text-brand-700 hover:text-brand-950 dark:text-brand-300">
                            Open
                          </Link>
                          {/* Details edits the REGISTER ENTRY — title, owner,
                              review date. The text of the document itself is
                              written in the builder, behind Open. */}
                          {data.canEdit && (
                            <button type="button" onClick={() => setDraft({ ...d })}
                              className="ms-3 text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
                              Details
                            </button>
                          )}
                          {/* Only offered where it can succeed. An issued
                              document is retained, so the button is absent
                              rather than present and refusing. */}
                          {data.canDelete && !d.controlled && (
                            <button type="button" onClick={() => setConfirming(d)}
                              className="ms-3 text-xs font-600 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400">
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {draft && (
        <Dialog
          title={draft.id ? `Edit ${draft.code}` : "New document"}
          description={draft.id
            ? "The code was issued when the document was created and stays with it, whatever else changes."
            : "The code is minted from the type and department, and cannot be changed afterwards."}
          onClose={() => setDraft(null)}
          width="max-w-[640px]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="q-title">Title</label>
              <input id="q-title" className={input} value={draft.title}
                dir={draft.language === "ar" ? "rtl" : "ltr"}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </div>
            <div>
              <label className={label} htmlFor="q-type">Type</label>
              <select id="q-type" className={input} value={draft.typeId}
                onChange={(e) => setDraft((d) => ({ ...d, typeId: e.target.value }))}>
                <option value="">Choose…</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.prefix})</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="q-dept">Department</label>
              <select id="q-dept" className={input} value={draft.departmentId}
                onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value }))}>
                <option value="">Choose…</option>
                {(data?.departments || []).map((x) => (
                  <option key={x.id} value={x.id}>{x.name} ({data.departmentCodes?.[x.id]})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="q-lang">Language</label>
              <select id="q-lang" className={input} value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}>
                {(data?.vocabulary?.languages || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="q-review">Next review</label>
              <input id="q-review" type="date" className={input} value={draft.nextReviewDate || ""}
                onChange={(e) => setDraft((d) => ({ ...d, nextReviewDate: e.target.value }))} />
            </div>
            {!draft.id && draft.typeId && draft.departmentId && (
              <p className="sm:col-span-2 text-xs text-slate-400 dark:text-slate-500">
                This document will be numbered{" "}
                <span className="font-mono font-700 text-slate-600 dark:text-slate-300">
                  {types.find((t) => t.id === draft.typeId)?.prefix}-{data?.departmentCodes?.[draft.departmentId]}-…
                </span>
              </p>
            )}
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className={btn} disabled={busy} onClick={save}>
              {busy ? "Saving…" : draft.id ? "Save" : "Create"}
            </button>
          </div>
        </Dialog>
      )}

      {confirming && (
        <Dialog title={`Delete ${confirming.code}?`} onClose={() => setConfirming(null)} width="max-w-[480px]">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-600 text-slate-900 dark:text-white">{confirming.title}</span> has never been issued,
            so deleting it removes it outright. Its number stays spent — a document code is never handed out twice.
          </p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(null)}>Cancel</button>
            <button type="button" disabled={busy}
              className="rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              onClick={async () => { const r = await send("DELETE", { id: confirming.id }); if (r) setConfirming(null); }}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
