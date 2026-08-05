"use client";

import { useEffect, useState, useCallback } from "react";
import { SYNC_EVENT } from "@/lib/useLivePoll";
import { Icon } from "@/components/studio/icons";
import ImageField from "@/components/studio/ImageField";
import RichTextField from "@/components/studio/RichTextField";
import DateInput from "@/components/studio/DateInput";
import { confirmDialog } from "@/lib/appDialog";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#223358] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#223358]";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function FieldControl({ field, value, onChange, dynOptions, dynRows }) {
  const rtl = field.name.endsWith("_ar");
  if (field.type === "image") return <ImageField field={field} value={value} onChange={onChange} />;
  // Single-choice dropdown sourced from another collection; stores that row's id.
  if (field.type === "ref-select") {
    const rows = (dynRows && dynRows[field.optionsFrom]) || [];
    return (
      <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r[field.labelEn] || "—"}{r[field.labelAr] ? ` — ${r[field.labelAr]}` : ""}
          </option>
        ))}
      </select>
    );
  }
  // Multi-choice badges (up to field.max) sourced from another collection;
  // stores an array of row ids. Shows each option's badge image.
  if (field.type === "badge-multi") {
    const rows = (dynRows && dynRows[field.optionsFrom]) || [];
    const selected = Array.isArray(value) ? value : [];
    const max = field.max || Infinity;
    const toggle = (id) => {
      if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
      else if (selected.length < max) onChange([...selected, id]);
    };
    if (rows.length === 0) {
      return <p className="text-sm text-slate-400 dark:text-slate-500">No options yet — add some in the list above.</p>;
    }
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => {
            const on = selected.includes(r.id);
            const disabled = !on && selected.length >= max;
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => toggle(r.id)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-500 transition-colors ${
                  on
                    ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {r[field.image] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={r[field.image]} alt="" className="h-6 w-6 rounded bg-[#eef1f6] object-contain p-0.5" />
                )}
                <span>{r[field.labelEn] || r[field.labelAr] || "—"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {field.max ? `${selected.length}/${field.max} selected` : `${selected.length} selected`}
        </p>
      </div>
    );
  }
  if (field.type === "richtext") return <RichTextField field={field} value={value} onChange={onChange} />;
  if (field.type === "date") {
    return <DateInput className={input} value={value || ""} onChange={onChange} />;
  }
  if (field.type === "number") {
    return <input type="number" min={field.min ?? 0} className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "textarea") {
    return (
      <textarea rows={3} dir={rtl ? "rtl" : undefined} className={`${input} resize-y`} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    );
  }
  if (field.type === "select" || field.type === "select-dynamic") {
    let options = field.type === "select-dynamic" ? dynOptions[field.optionsFrom] || [] : field.options;
    if (value && !options.includes(value)) options = [value, ...options];
    return (
      <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  // Repeatable "item type + delivery weeks" rows. Value = [{ type, weeks }].
  if (field.type === "item-types") {
    const rows = Array.isArray(value) ? value : [];
    const setRow = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const addRow = () => onChange([...rows, { type: "", weeks: "" }]);
    const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
        {rows.length === 0 && <p className="text-xs text-slate-400">No item types yet — add the categories this vendor supplies and their delivery time.</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={input} placeholder="Item type (e.g. Displays)" value={r.type || ""} onChange={(e) => setRow(i, { type: e.target.value })} />
            <div className="flex shrink-0 items-center gap-1">
              <input type="number" min="0" className={`${input} w-20`} placeholder="wks" value={r.weeks ?? ""} onChange={(e) => setRow(i, { weeks: e.target.value })} />
              <span className="text-xs text-slate-400">weeks</span>
            </div>
            <button type="button" onClick={() => removeRow(i)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" aria-label="Remove type">
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-600 hover:bg-white dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">
          <Icon name="plus" className="h-3.5 w-3.5" /> Add type
        </button>
      </div>
    );
  }
  return (
    <input type={field.type === "url" ? "url" : "text"} dir={rtl ? "rtl" : "ltr"} className={input} value={value || ""} onChange={(e) => onChange(e.target.value)} />
  );
}

const RED = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
const GREEN = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
const AMBER = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";

function StatusBadge({ status, kind }) {
  let cls = GREEN;
  let label = "New";
  if (kind === "reviews") {
    const approved = status === "approved";
    cls = approved ? GREEN : AMBER;
    label = approved ? "Approved" : "Pending";
  } else if (status === "rejected") {
    cls = RED;
    label = "Rejected";
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-600 ${cls}`}>{label}</span>;
}

export default function StudioCollectionManager({ collection, schema, scrollHeight }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [view, setView] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dynOptions, setDynOptions] = useState({});
  const [dynRows, setDynRows] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isApplications = schema.kind === "applications";
  const isReviews = schema.kind === "reviews";

  // `silent` skips the loading flash — used by the background Auto-Sync reload so
  // the list refreshes in place instead of flashing "Loading…" every 20s.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/${collection}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems(await res.json());
      setError("");
    } catch {
      setError("Could not load data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [collection]);

  const loadDynamic = useCallback(async () => {
    const sources = schema.fields.filter((f) => f.type === "select-dynamic");
    if (sources.length === 0) return;
    const result = {};
    for (const f of sources) {
      try {
        const rows = await fetch(`/api/${f.optionsFrom}`, { cache: "no-store" }).then((r) => r.json());
        result[f.optionsFrom] = rows.map((r) => r[f.optionLabel]).filter(Boolean);
      } catch {
        result[f.optionsFrom] = [];
      }
    }
    setDynOptions(result);
  }, [schema.fields]);

  // Load the full rows of any collection referenced by ref-select / badge-multi
  // fields (e.g. a project's client / services) so the form can list them.
  const loadRefs = useCallback(async () => {
    const refs = schema.fields.filter((f) => f.type === "ref-select" || f.type === "badge-multi");
    if (refs.length === 0) return;
    const result = {};
    for (const f of refs) {
      if (result[f.optionsFrom]) continue;
      try {
        const rows = await fetch(`/api/${f.optionsFrom}`, { cache: "no-store" }).then((r) => r.json());
        result[f.optionsFrom] = Array.isArray(rows) ? rows : [];
      } catch {
        result[f.optionsFrom] = [];
      }
    }
    setDynRows(result);
  }, [schema.fields]);

  // Initial load runs once per collection. Keyed on `collection` (not the loader
  // identities) so the periodic Auto-Sync `router.refresh()` — which re-passes a
  // fresh `schema` prop and would otherwise re-run this effect and flash the
  // "Loading…" state every 20s (the reviews-list "twitch") — no longer reloads it.
  useEffect(() => {
    load();
    loadDynamic();
    loadRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  // Background refresh on the header Auto-Sync — silent (no loading flash).
  useEffect(() => {
    const onSync = () => load(true);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [load]);

  const blankValue = (f) => (f.type === "badge-multi" || f.type === "item-types" ? [] : f.default !== undefined ? f.default : "");
  function openAdd() {
    loadRefs();
    const values = {};
    schema.fields.forEach((f) => (values[f.name] = blankValue(f)));
    setForm({ values, id: null });
  }
  function openEdit(row) {
    loadRefs();
    const values = {};
    schema.fields.forEach((f) => (values[f.name] = row[f.name] ?? blankValue(f)));
    setForm({ values, id: row.id });
  }

  async function save() {
    // Client-side check for schema-required fields — blank strings and empty
    // arrays both count as missing. Server still accepts the record if this is
    // bypassed, so it's a UX guard, not a security boundary.
    const missing = schema.fields.filter((f) => {
      if (!f.required) return false;
      const v = form.values[f.name];
      if (Array.isArray(v)) return v.length === 0;
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(", ")}.`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const url = form.id ? `/api/${collection}/${form.id}` : `/api/${collection}`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form.values) });
      if (!res.ok) throw new Error();
      setForm(null);
      await load();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!(await confirmDialog({ title: "Delete item", message: "Delete this item? This cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/${collection}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch {
      setError("Could not delete.");
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Delete every selected row. Sequential (not Promise.all) because each DELETE
  // is a full read-modify-write of the shared document — concurrent writes would
  // race and clobber one another.
  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!(await confirmDialog({ title: "Delete items", message: `Delete ${selected.size} selected item${selected.size === 1 ? "" : "s"}? This cannot be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    setBulkDeleting(true);
    try {
      for (const id of selected) {
        const res = await fetch(`/api/${collection}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }
      setSelected(new Set());
      await load();
    } catch {
      setError("Could not delete all selected items. Please reload and try again.");
      await load();
    } finally {
      setBulkDeleting(false);
    }
  }

  // Sequential PUTs (not Promise.all) — each is a full read-modify-write of the
  // shared document, so concurrent writes would clobber one another.
  async function moveItem(index, direction) {
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= sortedItems.length) return;
    const a = sortedItems[index];
    const b = sortedItems[swapWith];
    const aOrder = a.order ?? index;
    const bOrder = b.order ?? swapWith;
    try {
      await fetch(`/api/${collection}/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: bOrder }) });
      await fetch(`/api/${collection}/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: aOrder }) });
      await load();
    } catch {
      setError("Could not reorder.");
    }
  }

  // One or more per-row on/off switches. Normalise the legacy single `rowToggle`
  // into the `rowToggles` array so a collection can carry several flags.
  const rowToggles = schema.rowToggles || (schema.rowToggle ? [schema.rowToggle] : []);

  // Flip a per-row boolean flag (e.g. gallery visibility) straight from the
  // table. Absent value falls back to that toggle's default.
  async function toggleRow(row, t) {
    const current = row[t.name] ?? t.default;
    try {
      const res = await fetch(`/api/${collection}/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [t.name]: !current }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not update. Please try again.");
    }
  }

  async function reject(id) {
    if (!(await confirmDialog({ title: "Reject application", message: "Reject this application? It will be removed after 7 days.", confirmLabel: "Reject", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) });
      if (!res.ok) throw new Error();
      setView(null);
      await load();
    } catch {
      setError("Could not update the application.");
    }
  }

  async function approve(id) {
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
      if (!res.ok) throw new Error();
      setView(null);
      await load();
    } catch {
      setError("Could not approve the review.");
    }
  }

  const fmt = (name, val) => {
    if (name === "status") return <StatusBadge status={val} kind={schema.kind} />;
    if (name === "rating" && val != null && val !== "") return `${val}/5`;
    if (name === "createdAt" && val) {
      try {
        return new Date(val).toLocaleString("en-GB");
      } catch {
        return val;
      }
    }
    return val;
  };

  const sortedItems = schema.reorderable ? [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : items;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${items.length} ${items.length === 1 ? schema.singular : schema.label} in total`}
        </p>
        <div className="flex items-center gap-2.5">
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              aria-label={`Delete ${selected.size} selected`}
              title={`Delete ${selected.size} selected`}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2.5 text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          )}
          {!schema.readOnly && (
            <button onClick={openAdd} className={btnPrimary}>
              <Icon name="plus" className="h-4 w-4" />
              Add {schema.singular}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {schema.reorderable && items.length > 1 && (
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">Use the arrows to set the order shown on the website — top of the list appears first.</p>
      )}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">Nothing here yet.</div>
        ) : (
          <div className="overflow-auto" style={scrollHeight ? { maxHeight: scrollHeight } : undefined}>
            <table className="w-full text-sm">
              <thead className={scrollHeight ? "sticky top-0 z-10" : undefined}>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#2c406c] dark:text-slate-500">
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="h-4 w-4 cursor-pointer accent-brand-700"
                      checked={sortedItems.length > 0 && selected.size === sortedItems.length}
                      ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < sortedItems.length; }}
                      onChange={(e) => setSelected(e.target.checked ? new Set(sortedItems.map((r) => r.id)) : new Set())}
                    />
                  </th>
                  {schema.reorderable && <th className="w-12 px-2 py-3.5" />}
                  {schema.columns.map((c) => (
                    <th key={c.name} className="px-5 py-3.5 text-start font-600">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((row, index) => (
                  <tr key={row.id} className={`border-b border-slate-50 last:border-0 dark:border-white/5 ${selected.has(row.id) ? "bg-brand-500/[0.06] dark:bg-brand-500/10" : "hover:bg-slate-50/60 dark:hover:bg-white/[0.03]"}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        className="h-4 w-4 cursor-pointer accent-brand-700"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    {schema.reorderable && (
                      <td className="px-2 py-3.5">
                        <div className="flex flex-col items-center gap-0.5">
                          <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Move up" className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent dark:text-slate-500 dark:hover:bg-white/10">
                            <Icon name="chevronUp" className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => moveItem(index, 1)} disabled={index === sortedItems.length - 1} aria-label="Move down" className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent dark:text-slate-500 dark:hover:bg-white/10">
                            <Icon name="chevronDown" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                    {schema.columns.map((c) => (
                      <td key={c.name} className="max-w-xs truncate px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {fmt(c.name, row[c.name])}
                      </td>
                    ))}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {rowToggles.map((t) => {
                          const on = (row[t.name] ?? t.default) !== false;
                          return (
                            <button
                              key={t.name}
                              type="button"
                              role="switch"
                              aria-checked={on}
                              onClick={() => toggleRow(row, t)}
                              title={t.title || `${t.onLabel} / ${t.offLabel}`}
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-600"
                            >
                              <span className={`relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"}`}>
                                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? "left-3.5" : "left-0.5"}`} />
                              </span>
                              <span className={on ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}>
                                {on ? t.onLabel : t.offLabel}
                              </span>
                            </button>
                          );
                        })}
                        {schema.rowImageLink && row[schema.rowImageLink] && (
                          <a
                            href={row[schema.rowImageLink]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            Open ↗
                          </a>
                        )}
                        {schema.readOnly ? (
                          <button onClick={() => setView(row)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/10">
                            View
                          </button>
                        ) : (
                          <button onClick={() => openEdit(row)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/10">
                            Edit
                          </button>
                        )}
                        {isApplications && row.cvId && (
                          <a href={`/api/media/${row.cvId}`} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/10">
                            CV ↓
                          </a>
                        )}
                        {isApplications && row.status !== "rejected" && (
                          <button onClick={() => reject(row.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10">
                            Reject
                          </button>
                        )}
                        {isReviews && row.status !== "approved" && (
                          <button onClick={() => approve(row.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                            Approve
                          </button>
                        )}
                        <button onClick={() => remove(row.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">
              {form.id ? `Edit ${schema.singular}` : `Add ${schema.singular}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {schema.fields.map((f) => (
                <div key={f.name} className={f.type === "textarea" || f.type === "richtext" || f.type === "image" || f.type === "badge-multi" || f.type === "item-types" ? "sm:col-span-2" : ""}>
                  <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {f.label}
                    {f.required && <span className="ms-1 text-red-500" aria-hidden="true">*</span>}
                  </label>
                  <FieldControl field={f} value={form.values[f.name]} dynOptions={dynOptions} dynRows={dynRows} onChange={(v) => setForm((s) => ({ ...s, values: { ...s.values, [f.name]: v } }))} />
                </div>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>
                Cancel
              </button>
              <button onClick={save} className={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only detail modal */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">{schema.singular}</h2>
              {(isApplications || isReviews) && <StatusBadge status={view.status} kind={schema.kind} />}
            </div>
            <dl className="space-y-3 text-sm">
              {schema.fields.map((f) => (
                <div key={f.name}>
                  <dt className="font-600 text-slate-400 dark:text-slate-500">{f.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-slate-800 dark:text-slate-200">{view[f.name] || "—"}</dd>
                </div>
              ))}
              {view.createdAt && (
                <div>
                  <dt className="font-600 text-slate-400 dark:text-slate-500">Received</dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{new Date(view.createdAt).toLocaleString("en-GB")}</dd>
                </div>
              )}
            </dl>
            {isApplications && (
              <div className="mt-5 flex flex-wrap gap-3">
                {view.cvId && (
                  <a href={`/api/media/${view.cvId}`} className={btnGhost}>
                    Download CV
                  </a>
                )}
                {view.status !== "rejected" && (
                  <button onClick={() => reject(view.id)} className="rounded-xl border border-amber-500/40 px-5 py-2.5 font-display text-sm font-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10">
                    Reject
                  </button>
                )}
              </div>
            )}
            {isReviews && view.status !== "approved" && (
              <div className="mt-5">
                <button onClick={() => approve(view.id)} className="rounded-xl border border-emerald-500/40 px-5 py-2.5 font-display text-sm font-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                  Approve &amp; publish
                </button>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button onClick={() => setView(null)} className={btnPrimary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
