"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { SALES_LIVE_COLUMNS, SALES_DEFAULT_LIVE_COLUMNS } from "@/lib/liveColumns";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";

// A simple add/remove chip list editor.
function ListEditor({ title, hint, items, onChange, placeholder, locked = [] }) {
  const [text, setText] = useState("");
  const add = () => { const v = text.trim(); if (!v || items.includes(v)) { setText(""); return; } onChange([...items, v]); setText(""); };
  return (
    <div className={card}>
      <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
      {hint && <p className="mt-1 mb-3 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        {items.length === 0 && <span className="text-sm text-slate-400">None yet.</span>}
        {items.map((it) => {
          const fixed = locked.includes(it);
          return (
            <span key={it} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">
              {it}
              {!fixed && <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${it}`}>×</button>}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"><Icon name="plus" className="h-4 w-4" /> Add</button>
      </div>
    </div>
  );
}

export default function SalesSettings() {
  const [cols, setCols] = useState(SALES_DEFAULT_LIVE_COLUMNS);
  const [positions, setPositions] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sales-settings", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.salesLiveColumns) && data.salesLiveColumns.length) setCols(data.salesLiveColumns);
          setPositions(Array.isArray(data.salesContactPositions) ? data.salesContactPositions : []);
          setCities(Array.isArray(data.salesCities) ? data.salesCities : []);
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = (key) => { setSaved(false); setCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])); };
  const reset = () => { setSaved(false); setCols(SALES_DEFAULT_LIVE_COLUMNS); };

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/sales-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesLiveColumns: cols, salesContactPositions: positions, salesCities: cities }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      const data = await res.json();
      setPositions(Array.isArray(data.salesContactPositions) ? data.salesContactPositions : positions);
      setCities(Array.isArray(data.salesCities) ? data.salesCities : cities);
      setSaved(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">Sales Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure options for the Sales section.</p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={card}>
        <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Live view columns</p>
        <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">Choose which columns appear on the full-screen Sales Live view. This is a <span className="font-600">shared</span> setting — it applies to everyone.</p>
        <div className="flex flex-wrap gap-2">
          {SALES_LIVE_COLUMNS.map((c) => {
            const on = cols.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.key)}
                className={`rounded-xl border px-3 py-2 text-xs font-500 transition-colors ${
                  on
                    ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <button onClick={reset} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Reset columns to default</button>
          <span className="ms-3 text-xs text-slate-400 dark:text-slate-500">{cols.length} selected</span>
        </div>
      </div>

      <ListEditor
        title="Contact positions"
        hint="The positions a client contact can be tagged with on a sales ticket. “For Permits” is reserved for the project permit contact."
        items={positions}
        onChange={(v) => { setSaved(false); setPositions(v); }}
        placeholder="e.g. Procurement Manager"
        locked={["For Permits"]}
      />

      <ListEditor
        title="Cities"
        hint="The cities a client location can be assigned to."
        items={cities}
        onChange={(v) => { setSaved(false); setCities(v); }}
        placeholder="e.g. Riyadh"
      />

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={btnPrimary}>
          <Icon name="check" className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs font-600 text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>
    </div>
  );
}
