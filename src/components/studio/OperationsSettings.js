"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { DAYS, DEFAULT_LEGEND, normalizeSchedule, normalizeLegend } from "@/lib/operations";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white";

// Operations → Settings. Manages Working Hours (the work schedule + "show only
// working hours" default) and the Work-Calendar legend. The main Operations
// calendar reads both from settings.
export default function OperationsSettings() {
  const [schedule, setSchedule] = useState(normalizeSchedule(null));
  const [workingOnly, setWorkingOnly] = useState(false);
  const [showOvertimes, setShowOvertimes] = useState(false);
  const [legend, setLegend] = useState(DEFAULT_LEGEND);
  const [rosterPrefix, setRosterPrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings", { cache: "no-store" });
      if (!r.ok) throw new Error("Could not load settings.");
      const s = await r.json();
      setSchedule(normalizeSchedule(s.workSchedule));
      setShowOvertimes(!!s.operationsShowOvertimes);
      setWorkingOnly(!s.operationsShowOvertimes && !!s.operationsShowWorkingHoursOnly);
      setLegend(normalizeLegend(s.operationsLegend));
      setRosterPrefix(s.operationsRosterPrefix || "");
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = () => setSaved(false);
  const setLegendItem = (i, patch) => { setLegend((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x))); dirty(); };

  async function save() {
    setSaving(true); setError("");
    try {
      const body = {
        workSchedule: schedule,
        operationsShowWorkingHoursOnly: showOvertimes ? false : workingOnly,
        operationsShowOvertimes: showOvertimes,
        operationsLegend: legend.map((t) => ({ ...t, label: t.label.trim() })).filter((t) => t.label),
        operationsRosterPrefix: rosterPrefix,
      };
      const res = await fetch("/api/operations/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Operations Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure the options used across the Operations calendar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Working Hours */}
          <div className={card}>
            <div className="mb-1 flex items-center gap-2">
              <Icon name="gear" className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Working Hours</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">The weekly work schedule and whether the calendar shows only working hours.</p>

            <div className="space-y-2">
              <label className={`flex items-center gap-2 text-sm ${showOvertimes ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                <input type="checkbox" checked={workingOnly} disabled={showOvertimes} onChange={(e) => { setWorkingOnly(e.target.checked); dirty(); }} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50 dark:border-white/20" />
                Show only Working Hours
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={showOvertimes} onChange={(e) => { const on = e.target.checked; setShowOvertimes(on); if (on) setWorkingOnly(false); dirty(); }} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20" />
                Show overtimes <span className="text-xs text-slate-400">(overrides &quot;only working hours&quot;)</span>
              </label>
            </div>

            <p className="mt-4 mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Work Schedule</p>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-[10px] font-600 uppercase tracking-wide text-slate-400">
                <span /><span className="text-center">From</span><span className="text-center">To</span>
              </div>
              {DAYS.map((d) => {
                const s = schedule[d];
                return (
                  <div key={d} className={`grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded px-1 py-0.5 text-xs ${s.on ? "" : "bg-slate-100 dark:bg-white/10"}`}>
                    <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <input type="checkbox" checked={s.on} onChange={(e) => { setSchedule((sc) => ({ ...sc, [d]: { ...sc[d], on: e.target.checked } })); dirty(); }} className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-600 dark:border-white/20" />
                      {d.slice(0, 3)}
                    </label>
                    <input type="time" value={s.from} onChange={(e) => { setSchedule((sc) => ({ ...sc, [d]: { ...sc[d], from: e.target.value } })); dirty(); }} className={`${input} px-1.5 text-[11px]`} />
                    <input type="time" value={s.to} onChange={(e) => { setSchedule((sc) => ({ ...sc, [d]: { ...sc[d], to: e.target.value } })); dirty(); }} className={`${input} px-1.5 text-[11px]`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className={card}>
            <div className="mb-1 flex items-center gap-2">
              <Icon name="gear" className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Work Calendar legend</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">The colours the Work Calendar uses for task bars (and the <span className="font-600">Overtime</span> bar). These types are fixed — you can recolour or rename them, but not add or remove them.</p>
            <div className="space-y-2">
              {legend.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  <input type="color" value={t.color} onChange={(e) => setLegendItem(i, { color: e.target.value })} className="h-9 w-11 shrink-0 cursor-pointer rounded border border-slate-200 dark:border-white/15" />
                  <input value={t.label} onChange={(e) => setLegendItem(i, { label: e.target.value })} className={`${input} flex-1`} />
                </div>
              ))}
            </div>
          </div>

          {/* Day roster copy prefix */}
          <div className={`${card} lg:col-span-2`}>
            <div className="mb-1 flex items-center gap-2">
              <Icon name="gear" className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Day roster prefix</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Optional text added to the top of the <span className="font-600">Copy this day&apos;s task roster</span> output (e.g. a greeting or header). Leave blank for none.</p>
            <textarea value={rosterPrefix} onChange={(e) => { setRosterPrefix(e.target.value); dirty(); }} rows={3} placeholder="e.g. Good morning team, here is today's schedule:" className={`${input} resize-y`} />
          </div>
        </div>
      )}
    </div>
  );
}
