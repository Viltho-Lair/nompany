"use client";

import { useCallback, useEffect, useState } from "react";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";

const WEIGHTS = [
  { key: "req_delivery", label: "Delivery %" },
  { key: "req_installation", label: "Installation %" },
  { key: "req_programming", label: "Programming %" },
  { key: "req_handover", label: "Handover %" },
];

// Projects → Settings. Houses the Project Requirement Weights (moved here from
// Company Info). Read/written through the shared /api/settings store; the
// completion model (lib/projectKpis.js) reads the same keys.
export default function ProjectsSettings() {
  const [values, setValues] = useState({});
  const [departments, setDepartments] = useState([]);
  const [otDept, setOtDept] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, dRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
      ]);
      const s = res.ok ? await res.json() : {};
      setValues(Object.fromEntries(WEIGHTS.map((w) => [w.key, s[w.key] ?? ""])));
      setOtDept(s.overtimeDefaultDept || "");
      setDepartments(dRes.ok ? await dRes.json() : []);
      setError("");
    } catch { setError("Could not load settings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setSaved(false); };

  async function save() {
    setSaving(true); setError("");
    try {
      const patch = Object.fromEntries(WEIGHTS.map((w) => [w.key, values[w.key] === "" ? "" : Number(values[w.key])]));
      patch.overtimeDefaultDept = otDept;
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error("Save failed.");
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Projects Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configuration for the Projects module.</p>
      </div>

      <div className={`${card} max-w-xl`}>
        <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">Requirement weights</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          How a project&apos;s completion % (after the service KPIs) is split across its requirements. Only the requirements assigned to a project count, and their shares are re-scaled to fill the remaining percentage.
        </p>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {WEIGHTS.map((w) => (
                <div key={w.key}>
                  <label className={label}>{w.label}</label>
                  <input type="number" min="0" className={input} value={values[w.key] ?? ""} onChange={(e) => set(w.key, e.target.value)} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`${card} max-w-xl`}>
        <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">Overtime</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">The department pre-selected in <span className="font-600">Add overtime</span> (the user list filters to it by default).</p>
        {!loading && (
          <div className="max-w-xs">
            <label className={label}>Default overtime department</label>
            <select className={input} value={otDept} onChange={(e) => { setOtDept(e.target.value); setSaved(false); }}>
              <option value="">— none —</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving || loading} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}
