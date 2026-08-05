"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white";

// Finance → Settings. Manages the Cash "Category" dropdown options.
export default function FinanceSettings() {
  const [categories, setCategories] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/finance-settings", { cache: "no-store" });
      if (!r.ok) throw new Error("Could not load settings.");
      setCategories((await r.json())?.categories || []);
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = () => {
    const v = draft.trim();
    if (!v || categories.some((c) => c.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    setCategories((c) => [...c, v]); setDraft(""); setSaved(false);
  };
  const remove = (i) => { setCategories((c) => c.filter((_, j) => j !== i)); setSaved(false); };
  const edit = (i, v) => { setCategories((c) => c.map((x, j) => (j === i ? v : x))); setSaved(false); };

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/finance-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: categories.map((c) => c.trim()).filter(Boolean) }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setCategories((await res.json()).categories || []);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Finance Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure the options used across the Cash section.</p>
      </div>

      <div className={`${card} max-w-xl`}>
        <div className="mb-1 flex items-center gap-2">
          <Icon name="gear" className="h-4 w-4 text-slate-400" />
          <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Cash categories</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">These appear in the Category dropdown on every Cash sheet.</p>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-slate-400">No categories yet — add one below.</p>
              ) : categories.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={input} value={c} onChange={(e) => edit(i, e.target.value)} />
                  <button onClick={() => remove(i)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Remove"><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input className={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="New category…" />
              <button onClick={add} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"><Icon name="plus" className="h-4 w-4" /> Add</button>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={save} disabled={saving} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
              {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
