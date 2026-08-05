"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionSchemas } from "@/lib/adminSchemas";
import EntityForm from "@/components/studio/EntityForm";
import DateInput from "@/components/studio/DateInput";
import { confirmDialog } from "@/lib/appDialog";
import { slaVisits, nextVisit, emergencyVisits, contractEndDate, fmtDate, daysUntil } from "@/lib/sla";

const card = "rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950";

export default function SlaManager() {
  const [slas, setSlas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // { initial } | null
  const [detail, setDetail] = useState(null); // sla being viewed
  const [emergencyDate, setEmergencyDate] = useState("");
  const [emergencyError, setEmergencyError] = useState("");
  const closeDetail = () => { setDetail(null); setEmergencyDate(""); setEmergencyError(""); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetch("/api/slas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setSlas(Array.isArray(s) ? s : []);
      setProjects(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);

  // Ordered by signing date, most recent first.
  const ordered = useMemo(
    () => [...slas].sort((a, b) => String(b.signingDate || "").localeCompare(String(a.signingDate || ""))),
    [slas]
  );

  async function remove(id) {
    if (!(await confirmDialog({ title: "Delete SLA contract", message: "Delete this SLA contract? This cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`/api/slas/${id}`, { method: "DELETE" });
    await load();
  }

  // Toggle a single visit's completion flag on an SLA.
  async function toggleVisitCompleted(sla, visitIndex) {
    const set = new Set(Array.isArray(sla.completedVisits) ? sla.completedVisits : []);
    if (set.has(visitIndex)) set.delete(visitIndex);
    else set.add(visitIndex);
    const completedVisits = [...set].sort((a, b) => a - b);
    const res = await fetch(`/api/slas/${sla.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completedVisits }) });
    if (!res.ok) return;
    const updated = { ...sla, completedVisits };
    setSlas((prev) => prev.map((s) => (s.id === sla.id ? updated : s)));
    if (detail && detail.id === sla.id) setDetail(updated);
  }

  // Persist the emergency-visits list on an SLA.
  async function saveEmergencyList(sla, emergencyVisitsList) {
    const res = await fetch(`/api/slas/${sla.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergencyVisitsList }),
    });
    if (!res.ok) return false;
    const updated = { ...sla, emergencyVisitsList };
    setSlas((prev) => prev.map((s) => (s.id === sla.id ? updated : s)));
    if (detail && detail.id === sla.id) setDetail(updated);
    return true;
  }

  // Register a new emergency visit. Validates: cap + contract end.
  async function addEmergencyVisit(sla) {
    setEmergencyError("");
    if (!emergencyDate) {
      setEmergencyError("Pick a date first.");
      return;
    }
    const current = Array.isArray(sla.emergencyVisitsList) ? sla.emergencyVisitsList : [];
    const cap = Number(sla.emergencyVisits) || 0;
    if (current.length >= cap) {
      setEmergencyError(`This contract allows ${cap} emergency visit${cap === 1 ? "" : "s"}.`);
      return;
    }
    const end = contractEndDate(sla);
    if (end && new Date(emergencyDate) > end) {
      setEmergencyError(`Date must be on or before the contract end (${fmtDate(end)}).`);
      return;
    }
    if (sla.startDate && new Date(emergencyDate) < new Date(sla.startDate)) {
      setEmergencyError(`Date must be on or after the contract start (${fmtDate(sla.startDate)}).`);
      return;
    }
    const next = [...current, { id: `ev_${Date.now().toString(36)}`, date: emergencyDate, completed: false }];
    const ok = await saveEmergencyList(sla, next);
    if (ok) setEmergencyDate("");
  }

  async function toggleEmergencyCompleted(sla, id) {
    const list = (Array.isArray(sla.emergencyVisitsList) ? sla.emergencyVisitsList : []).map((e) =>
      e.id === id ? { ...e, completed: !e.completed } : e
    );
    await saveEmergencyList(sla, list);
  }

  async function removeEmergencyVisit(sla, id) {
    const list = (Array.isArray(sla.emergencyVisitsList) ? sla.emergencyVisitsList : []).filter((e) => e.id !== id);
    await saveEmergencyList(sla, list);
  }

  const projName = (sla) => {
    const p = projectsById[sla.projectId];
    return p ? p.title_en || p.title_ar || "—" : "—";
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {slas.length} SLA {slas.length === 1 ? "contract" : "contracts"} · ordered by signing date
        </p>
        <button onClick={() => setForm({ initial: null })} className={btnPrimary}>+ Add SLA</button>
      </div>

      <div className={`overflow-hidden ${card}`}>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : ordered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No SLA contracts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Contract</th>
                  <th className="px-5 py-3.5 text-start font-600">Project</th>
                  <th className="px-5 py-3.5 text-start font-600">Signed</th>
                  <th className="px-5 py-3.5 text-start font-600">Visits</th>
                  <th className="px-5 py-3.5 text-start font-600">Closest visit</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((sla) => {
                  const next = nextVisit(sla);
                  return (
                  <tr key={sla.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">{sla.title || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{projName(sla)}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(sla.signingDate)}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{sla.visits || 0}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {next ? (
                        <span>
                          {fmtDate(next.date)} <span className="ms-1 text-xs font-600 text-brand-700 dark:text-brand-300">({next.daysRemaining}d)</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setDetail(sla)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                          View visits
                        </button>
                        <button onClick={() => setForm({ initial: sla })} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                          Edit
                        </button>
                        <button onClick={() => remove(sla.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                          Delete
                        </button>
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

      {/* Create / edit form */}
      {form && (
        <EntityForm
          title={form.initial ? "Edit SLA contract" : "Add SLA contract"}
          collection="slas"
          schema={collectionSchemas.slas}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={load}
        />
      )}

      {/* Visit detail popup */}
      {detail && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={() => closeDetail()}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">{detail.title || "SLA contract"}</h2>
              <span className="shrink-0 text-sm text-slate-400">{projName(detail)}</span>
            </div>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Signed {fmtDate(detail.signingDate)} · starts {fmtDate(detail.startDate)} · {detail.durationDays || 365} days · {detail.visits || 0} visits
            </p>
            <ul className="space-y-2">
              {slaVisits(detail).map((v) => (
                <li key={v.index} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${v.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-100 dark:border-white/10"}`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={v.completed}
                      onChange={() => toggleVisitCompleted(detail, v.index)}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                    />
                    <span className={`min-w-0 ${v.completed ? "text-emerald-700 line-through dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
                      Visit {v.index} · {fmtDate(v.date)}
                    </span>
                  </label>
                  <span className={`shrink-0 font-600 ${v.completed ? "text-emerald-700 dark:text-emerald-300" : v.daysRemaining < 0 ? "text-slate-400" : "text-brand-700 dark:text-brand-300"}`}>
                    {v.completed ? "completed" : v.daysRemaining < 0 ? "past" : `${v.daysRemaining}d left`}
                  </span>
                </li>
              ))}
              {slaVisits(detail).length === 0 && <li className="text-sm text-slate-400">Set a start date, duration and visit count to generate visits.</li>}
            </ul>

            {/* Emergency visits — ad-hoc, off-schedule. Bounded by count + contract end. */}
            {(() => {
              const cap = Number(detail.emergencyVisits) || 0;
              const list = emergencyVisits(detail);
              const end = contractEndDate(detail);
              const maxAttr = end ? end.toISOString().slice(0, 10) : undefined;
              const minAttr = detail.startDate || undefined;
              return (
                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">Emergency visits</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{list.length}/{cap} used</span>
                  </div>
                  {cap === 0 ? (
                    <p className="text-sm text-slate-400">This contract has no emergency visits.</p>
                  ) : (
                    <>
                      <ul className="space-y-2">
                        {list.map((e) => (
                          <li key={e.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${e.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!e.completed}
                                onChange={() => toggleEmergencyCompleted(detail, e.id)}
                                className="h-4 w-4 cursor-pointer accent-emerald-600"
                              />
                              <span className={`min-w-0 ${e.completed ? "text-emerald-700 line-through dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
                                Emergency · {fmtDate(e.date)}
                              </span>
                            </label>
                            <span className={`shrink-0 font-600 ${e.completed ? "text-emerald-700 dark:text-emerald-300" : e.daysRemaining < 0 ? "text-slate-400" : "text-amber-700 dark:text-amber-300"}`}>
                              {e.completed ? "completed" : e.daysRemaining < 0 ? "past" : `${e.daysRemaining}d left`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEmergencyVisit(detail, e.id)}
                              className="rounded-md px-2 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                        {list.length === 0 && <li className="text-sm text-slate-400">No emergency visits registered yet.</li>}
                      </ul>
                      {list.length < cap && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <DateInput
                            value={emergencyDate}
                            min={minAttr}
                            max={maxAttr}
                            onChange={(v) => setEmergencyDate(v)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => addEmergencyVisit(detail)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-amber-700"
                          >
                            + Register emergency visit
                          </button>
                        </div>
                      )}
                      {emergencyError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{emergencyError}</p>}
                    </>
                  )}
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end">
              <button onClick={() => closeDetail()} className={btnPrimary}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
