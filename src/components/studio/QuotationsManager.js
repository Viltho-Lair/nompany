"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { QUOTATION_STATUSES, TECHNICAL_TAG, canChangeStatus, canEditFields } from "@/lib/quotations";
import { ADMIN_TAG } from "@/lib/authConstants";
import { useLivePoll } from "@/lib/useLivePoll";
import DateInput from "@/components/studio/DateInput";
import ColumnPickerModal from "@/components/studio/ColumnPickerModal";
import MentionTextarea from "@/components/studio/MentionTextarea";
import { loadUserPref, saveUserPref } from "@/lib/userPrefs";
import { confirmDialog } from "@/lib/appDialog";

const URGENCIES = ["Low", "Normal", "High", "Critical"];

// Toggleable columns (the Actions column is always shown and not listed here).
const QUO_COLUMNS = [
  { key: "number", label: "Number" },
  { key: "urgency", label: "Urgency" },
  { key: "description", label: "Description" },
  { key: "handledBy", label: "Handled by" },
  { key: "from", label: "From" },
  { key: "latestComment", label: "Latest comment" },
  { key: "createdAt", label: "Created" },
  { key: "status", label: "Status" },
];
const QUO_DEFAULT_COLS = QUO_COLUMNS.map((c) => c.key);
const QUO_COLS_PREF = "mta-quo-cols";
const QUO_FILTERS_PREF = "mta-quo-filters";
const QUO_EMPTY_FILTERS = { handledBy: "", project: "", status: "", urgency: "", createdFrom: "", createdTo: "" };

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const inputRO =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-[#14141c] dark:text-slate-400";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const STATUS_TEXT = {
  "In-progress": "text-brand-700 dark:text-brand-300",
  "On-hold": "text-amber-700 dark:text-amber-300",
  Completed: "text-emerald-700 dark:text-emerald-300",
  Dropped: "text-slate-500 dark:text-slate-400",
};

// Carried read-only from the Sales ticket (via the RFQ) — only a Sales Leader
// can set it, so it's display-only here.
const URGENCY_BADGE = {
  Low: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  Normal: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  High: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

function fmtDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB"); }
  catch { return String(v); }
}
function fmtDateTime(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); }
}

export default function QuotationsManager() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(QUO_EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCols, setVisibleCols] = useState(QUO_DEFAULT_COLS);
  const [showCols, setShowCols] = useState(false);

  const [form, setForm] = useState(null); // { id?, number, description, handledBy, newComment?, existing? }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [meRes, uRes, qRes, sRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/quotations", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
      ]);
      if (qRes.status === 403) throw new Error("You need the Technical or admin tag.");
      const meJson = await meRes.json();
      const uJson = await uRes.json();
      const qJson = await qRes.json();
      setMe(meJson?.user || null);
      setUsers(Array.isArray(uJson) ? uJson : []);
      setRows(Array.isArray(qJson) ? qJson : []);
      setServices(sRes.ok ? await sRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load quotations.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  // Load this user's saved column + filter presets once we know who they are.
  useEffect(() => {
    if (!me?.id) return;
    const cols = loadUserPref(QUO_COLS_PREF, me.id, QUO_DEFAULT_COLS);
    setVisibleCols(Array.isArray(cols) && cols.length ? cols : QUO_DEFAULT_COLS);
    setFilters({ ...QUO_EMPTY_FILTERS, ...loadUserPref(QUO_FILTERS_PREF, me.id, QUO_EMPTY_FILTERS) });
  }, [me?.id]);

  const toggleCol = (key) => setVisibleCols((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    saveUserPref(QUO_COLS_PREF, me?.id, next);
    return next;
  });
  const resetCols = () => { setVisibleCols(QUO_DEFAULT_COLS); saveUserPref(QUO_COLS_PREF, me?.id, QUO_DEFAULT_COLS); };
  const col = (key) => visibleCols.includes(key);
  const setFilter = (patch) => setFilters((prev) => { const next = { ...prev, ...patch }; saveUserPref(QUO_FILTERS_PREF, me?.id, next); return next; });
  const clearFilters = () => { setFilters(QUO_EMPTY_FILTERS); saveUserPref(QUO_FILTERS_PREF, me?.id, QUO_EMPTY_FILTERS); };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const serviceNameById = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s.title_en || "Untitled"])), [services]);
  const serviceNames = (ids) => (Array.isArray(ids) ? ids.map((id) => serviceNameById[id] || id) : []);
  // Technical staff eligible to be "Handled by" — admins are excluded (they're
  // super-users, not a person work is assigned to).
  const technicalUsers = useMemo(
    () => users.filter((u) => Array.isArray(u.tags) && u.tags.includes(TECHNICAL_TAG) && !u.tags.includes(ADMIN_TAG)),
    [users]
  );
  const creatorOptions = useMemo(() => {
    const ids = [...new Set(rows.map((q) => q.createdBy).filter(Boolean))];
    return ids.map((id) => ({ id, label: usersById[id]?.fullName || usersById[id]?.userId || "Removed user" }));
  }, [rows, usersById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    return rows.filter((r) => {
      if (f.status && r.status !== f.status) return false;
      if (f.handledBy && r.handledBy !== f.handledBy) return false;
      if (f.urgency && (r.urgency || "Normal") !== f.urgency) return false;
      if (f.project && !`${r.title || ""}`.toLowerCase().includes(f.project.toLowerCase())) return false;
      const created = (r.createdAt || "").slice(0, 10);
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
      if (q) {
        const hay = `${r.number || ""} ${r.description || ""} ${r.title || ""} ${r.clientName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [rows, query, filters]);

  const displayName = (userId, denormalized) => {
    if (!userId) return "—";
    const u = usersById[userId];
    if (u) return u.fullName || u.userId;
    return denormalized ? `${denormalized} (removed)` : "Handler removed";
  };

  async function updateQuotation(id, patch) {
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    return data;
  }

  async function onChangeStatus(row, next) {
    if (next === row.status) return;
    try {
      await updateQuotation(row.id, { status: next });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function lockQuotation(row) {
    if (!(await confirmDialog({ title: "Lock quotation", message: `Permanently lock ${row.number}? It becomes view-only and can never be modified again — this cannot be undone.`, confirmLabel: "Lock permanently", tone: "danger" }))) return;
    try {
      await updateQuotation(row.id, { locked: true });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function openCreate() {
    setForm({ number: "", description: "", handledBy: technicalUsers[0]?.id || "" });
  }
  function openEdit(row) {
    setForm({
      id: row.id,
      number: row.number || "",
      description: row.description || "",
      handledBy: row.handledBy || "",
      newComment: "",
      mentions: [],
      existing: row,
    });
  }

  async function save() {
    if (!form.number.trim() || !form.description.trim() || !form.handledBy) {
      setError("Number, description and Handled by are all required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (form.id) {
        const patch = { number: form.number.trim(), description: form.description.trim(), handledBy: form.handledBy };
        if (form.newComment?.trim()) { patch.newComment = form.newComment.trim(); patch.mentions = form.mentions || []; }
        await updateQuotation(form.id, patch);
      } else {
        const res = await fetch("/api/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: form.number.trim(), description: form.description.trim(), handledBy: form.handledBy }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} of {rows.length} {rows.length === 1 ? "quotation" : "quotations"}
        </p>
        <button onClick={openCreate} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Create quotation
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search by number, title or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${input} sm:max-w-xs`}
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-600 transition-colors ${activeFilterCount ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}
        >
          <Icon name="search" className="h-4 w-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          <Icon name={showFilters ? "chevronUp" : "chevronDown"} className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setShowCols(true)} className={btnGhost}>
          <Icon name="menu" className="h-4 w-4" /> Columns
        </button>
      </div>

      {showFilters && (
        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#191921] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Handled by</label>
            <select className={input} value={filters.handledBy} onChange={(e) => setFilter({ handledBy: e.target.value })}>
              <option value="">Anyone</option>
              {technicalUsers.map((u) => (<option key={u.id} value={u.id}>{u.fullName || u.userId}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Project</label>
            <input className={input} placeholder="Title contains…" value={filters.project} onChange={(e) => setFilter({ project: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select className={input} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="">Any status</option>
              {QUOTATION_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Urgency</label>
            <select className={input} value={filters.urgency} onChange={(e) => setFilter({ urgency: e.target.value })}>
              <option value="">Any urgency</option>
              {URGENCIES.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Created from</label>
            <DateInput className={input} value={filters.createdFrom} onChange={(v) => setFilter({ createdFrom: v })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Created to</label>
            <DateInput className={input} value={filters.createdTo} onChange={(v) => setFilter({ createdTo: v })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button onClick={clearFilters} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Clear all filters</button>
          </div>
        </div>
      )}

      {showCols && (
        <ColumnPickerModal
          columns={QUO_COLUMNS}
          selected={visibleCols}
          onToggle={toggleCol}
          onReset={resetCols}
          onClose={() => setShowCols(false)}
          title="Quotation columns"
        />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{rows.length === 0 ? "No quotations yet." : "No quotations match those filters."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  {col("number") && <th className="px-5 py-3.5 text-start font-600">Number</th>}
                  {col("urgency") && <th className="px-5 py-3.5 text-start font-600">Urgency</th>}
                  {col("description") && <th className="px-5 py-3.5 text-start font-600">Description</th>}
                  {col("handledBy") && <th className="px-5 py-3.5 text-start font-600">Handled by</th>}
                  {col("from") && <th className="px-5 py-3.5 text-start font-600">From</th>}
                  {col("latestComment") && <th className="px-5 py-3.5 text-start font-600">Latest comment</th>}
                  {col("createdAt") && <th className="px-5 py-3.5 text-start font-600">Created</th>}
                  {col("status") && <th className="px-5 py-3.5 text-start font-600">Status</th>}
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const mayChange = canChangeStatus(me, r);
                  // "Unresolved" = a quotation still in its initial status
                  // (matches the sidebar's red badge). Left stripe sets it apart.
                  const unresolved = r.status === QUOTATION_STATUSES[0];
                  return (
                    <tr key={r.id} className={`border-s-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03] ${unresolved ? "border-s-amber-400 bg-amber-50/40 dark:border-s-amber-500/70 dark:bg-amber-500/[0.06]" : "border-s-transparent"}`}>
                      {col("number") && (
                        <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                          {r.approved && <span className="me-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[10px] font-700 text-emerald-700 dark:text-emerald-300"><Icon name="checkDouble" className="h-3 w-3" /> Approved</span>}
                          {r.number}
                          {Number(r.revision) > 1 && <span className="ms-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">Rev {r.revision}</span>}
                        </td>
                      )}
                      {col("urgency") && (
                      <td className="px-5 py-3.5">
                        {r.urgency ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[r.urgency] || URGENCY_BADGE.Normal}`}>{r.urgency}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      )}
                      {col("description") && <td className="max-w-sm truncate px-5 py-3.5 text-slate-600 dark:text-slate-300">{r.description}</td>}
                      {col("handledBy") && <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{displayName(r.handledBy)}</td>}
                      {col("from") && (
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {/* Sales user who pushed the RFQ; "MTA" when the quotation was created directly on the Quotations page. */}
                        {r.fromUserId ? displayName(r.fromUserId, r.fromUserIdLabel) : "MTA"}
                      </td>
                      )}
                      {col("latestComment") && (
                      <td className="max-w-xs px-5 py-3.5 text-slate-600 dark:text-slate-300">{(() => {
                        // Show most recent comment truncated; tooltip shows full text + author + date.
                        const arr = Array.isArray(r.comments) ? r.comments : [];
                        if (arr.length === 0) return <span className="text-slate-400">—</span>;
                        const latest = [...arr].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
                        const text = latest.text || "";
                        const brief = text.length > 50 ? text.slice(0, 50) + "…" : text;
                        const tip = `${latest.authorUserId || "?"} · ${fmtDateTime(latest.createdAt)}\n${text}`;
                        return <span title={tip} className="block truncate">{brief}</span>;
                      })()}</td>
                      )}
                      {col("createdAt") && <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(r.createdAt)}</td>}
                      {col("status") && (
                      <td className="px-5 py-3.5">
                        <select
                          value={r.status}
                          disabled={!mayChange || r.locked}
                          onChange={(e) => onChangeStatus(r, e.target.value)}
                          title={r.locked ? "Locked — view only" : mayChange ? "Change status — “Completed” is set only via the quotation builder’s Done button" : "Only admin, Technical, or the creator can change status"}
                          className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-600 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/15 dark:bg-[#191921] ${STATUS_TEXT[r.status] || ""}`}
                        >
                          {/* "Completed" is not a manual choice — it's set only by the builder's
                              "Done" button. We still list it when a row already is Completed so
                              the current value renders. */}
                          {(r.status === "Completed" ? QUOTATION_STATUSES : QUOTATION_STATUSES.filter((s) => s !== "Completed")).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      )}
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            disabled={!canEditFields(me) || r.locked}
                            title={r.locked ? "Locked — view only" : canEditFields(me) ? "Edit / add comment" : "Only admin or Technical users can edit"}
                            aria-label="Edit quotation"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 disabled:opacity-40 dark:text-brand-300"
                          >
                            <Icon name="pencil" className="h-4 w-4" />
                          </button>
                          {r.status === "Completed" && !r.locked && canEditFields(me) && (
                            <button
                              onClick={() => lockQuotation(r)}
                              title="Lock permanently (view-only)"
                              aria-label="Lock quotation"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                            >
                              <Icon name="lock" className="h-4 w-4" />
                            </button>
                          )}
                          {r.locked && (
                            <span title="Locked — view only" aria-label="Locked" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500">
                              <Icon name="lock" className="h-4 w-4" />
                            </span>
                          )}
                          <a
                            href={`/studio/quotations/${r.id}/builder`}
                            title={r.locked ? "Open quotation (view only)" : "Open quotation builder"}
                            aria-label="Open quotation builder"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-brand-500/10 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
                          >
                            <Icon name="open" className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          {/* Backdrop click is intentionally a no-op so accidental clicks don't discard edits — use Cancel or Save to close. */}
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">
              {form.id ? "Edit quotation" : "Create quotation"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {form.id && (form.existing.clientName || form.existing.title || form.existing.industry || (form.existing.serviceIds || []).length > 0) && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</label>
                    <input className={inputRO} value={form.existing.clientName || "—"} readOnly />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</label>
                    <input className={inputRO} value={form.existing.title || "—"} readOnly />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Urgency <span className="normal-case font-500 text-slate-400">(set by Sales Leader)</span></label>
                    <div className={`${inputRO} flex items-center`}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[form.existing.urgency] || URGENCY_BADGE.Normal}`}>{form.existing.urgency || "Normal"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Industry <span className="normal-case font-500 text-slate-400">(set by Sales)</span></label>
                    <input className={inputRO} value={form.existing.industry || "—"} readOnly />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Services <span className="normal-case font-500 text-slate-400">(set by Sales)</span></label>
                    {serviceNames(form.existing.serviceIds).length === 0 ? (
                      <input className={inputRO} value="—" readOnly />
                    ) : (
                      <div className={`${inputRO} flex flex-wrap gap-1.5`}>
                        {serviceNames(form.existing.serviceIds).map((n) => (
                          <span key={n} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{n}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Number <span className="text-red-500">*</span>
                  {form.id && <span className="ms-1 normal-case font-500 text-slate-400">(locked)</span>}
                </label>
                {form.id ? (
                  <input className={inputRO} value={form.number} readOnly title="A quotation's number is locked once assigned and can't be changed." />
                ) : (
                  <input className={input} value={form.number} onChange={(e) => setForm((s) => ({ ...s, number: e.target.value }))} placeholder="Q-2026-0001" />
                )}
                {form.id && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">The number is locked to this quotation and can&apos;t be changed once assigned.</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Handled by <span className="text-red-500">*</span>
                </label>
                <select className={input} value={form.handledBy} onChange={(e) => setForm((s) => ({ ...s, handledBy: e.target.value }))}>
                  <option value="">— select —</option>
                  {technicalUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName || u.userId} ({u.userId})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea rows={3} className={`${input} resize-y`} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              </div>

              {form.id && (
                <>
                  <div className="sm:col-span-2 rounded-xl border border-black bg-slate-50 p-4 dark:border-white dark:bg-[#191921]">
                    <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Comments</p>
                    {(!form.existing.comments || form.existing.comments.length === 0) ? (
                      <p className="text-sm text-slate-400">No comments yet.</p>
                    ) : (
                      <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                        {/* Most recent first: sort a copy so we don't mutate props. */}
                        {[...form.existing.comments].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map((c) => (
                          <li key={c.id} className="rounded-lg bg-white p-2.5 text-slate-700 dark:bg-[#20202c] dark:text-slate-300">
                            <div className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                              {c.authorUserId || "?"} · {fmtDateTime(c.createdAt)}
                            </div>
                            <div className="whitespace-pre-wrap">{c.text}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Add a comment</label>
                    <MentionTextarea rows={2} className={`${input} resize-y`} value={form.newComment || ""} mentions={form.mentions || []} onChange={(t, m) => setForm((s) => ({ ...s, newComment: t, mentions: m }))} sectionKey="technical-quotations" placeholder="Notes will be appended and attributed to you. Type @ to mention." />
                  </div>
                  <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                    Created {fmtDateTime(form.existing.createdAt)}. Creation date cannot be modified.
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
