"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import Collapsible from "@/components/Collapsible";
import StudioCollectionManager from "@/components/studio/StudioCollectionManager";
import EmployeeEditForm from "@/components/studio/EmployeeEditForm";
import CopyButton from "@/components/studio/CopyButton";
import { collectionSchemas } from "@/lib/adminSchemas";
import { confirmDialog } from "@/lib/appDialog";

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";

export default function EmployeesManager() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // employee object or {} for new
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(null); // { username, password, label }

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/employees", { cache: "no-store" });
    if (res.status === 403) throw new Error("You don't have access to Employees.");
    if (!res.ok) throw new Error("Could not load employees.");
    setRows(await res.json());
  }, []);

  const loadRefs = useCallback(async () => {
    const [d, p, c] = await Promise.all([
      fetch("/api/departments", { cache: "no-store" }),
      fetch("/api/positions", { cache: "no-store" }),
      fetch("/api/certifications", { cache: "no-store" }),
    ]);
    setDepartments(d.ok ? await d.json() : []);
    setPositions(p.ok ? await p.json() : []);
    setCertifications(c.ok ? await c.json() : []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { await Promise.all([loadEmployees(), loadRefs()]); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [loadEmployees, loadRefs]);
  useEffect(() => { load(); }, [load]);

  const deptById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const posById = useMemo(() => Object.fromEntries(positions.map((p) => [p.id, p])), [positions]);
  const certById = useMemo(() => Object.fromEntries(certifications.map((c) => [c.id, c])), [certifications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || `${r.fullName} ${r.username} ${r.employeeCode} ${r.email} ${r.mobile}`.toLowerCase().includes(q))
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [rows, query]);

  async function save(payload) {
    if (!payload.fullName.trim()) { setFormError("Employee name is required."); return; }
    setSaving(true); setFormError("");
    try {
      const editingId = editing?.id;
      const res = await fetch(editingId ? `/api/employees/${editingId}` : "/api/employees", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const wasCreate = !editingId;
      setEditing(null);
      await load();
      // A freshly-created employee with a login gets a one-time password.
      if (wasCreate && data.password) setShowPassword({ username: data.username, password: data.password, label: "New login" });
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function resetPassword() {
    if (!editing?.id) return;
    setResetting(true); setFormError("");
    try {
      const res = await fetch(`/api/employees/${editing.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setEditing(null);
      setShowPassword({ username: editing.username, password: data.password, label: "Password reset" });
    } catch (e) { setFormError(e.message); }
    finally { setResetting(false); }
  }

  async function remove(row) {
    if (!(await confirmDialog({ title: "Remove employee", message: `Delete ${row.fullName}? This removes them from the public team list.`, confirmLabel: "Delete" }))) return;
    try {
      const res = await fetch(`/api/employees/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
      await load();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      {/* Reference lists — viewable above the employee list. */}
      <div className="mb-6">
        <Collapsible title="Departments, Positions & Certifications" defaultOpen={false}>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Create these first, then assign them when adding an employee. Certifications appear as badges on the employee card.
          </p>
          <div className="grid grid-cols-1 gap-6">
            <div className="min-w-0">
              <h3 className="mb-3 font-display text-sm font-700 text-slate-900 dark:text-white">Departments</h3>
              <StudioCollectionManager collection="departments" schema={collectionSchemas["departments"]} scrollHeight="20rem" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-3 font-display text-sm font-700 text-slate-900 dark:text-white">Positions</h3>
              <StudioCollectionManager collection="positions" schema={collectionSchemas["positions"]} scrollHeight="20rem" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-3 font-display text-sm font-700 text-slate-900 dark:text-white">Certifications</h3>
              <StudioCollectionManager collection="certifications" schema={collectionSchemas["certifications"]} scrollHeight="20rem" />
            </div>
          </div>
        </Collapsible>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Company employees. ID &amp; passport numbers are encrypted at rest. {filtered.length} of {rows.length}.
        </p>
        <button onClick={() => { setFormError(""); setEditing({}); }} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Add employee
        </button>
      </div>

      <div className="mb-5">
        <input type="search" placeholder="Search name, username, code, email…" value={query} onChange={(e) => setQuery(e.target.value)} className={input} />
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">
          {rows.length === 0 ? "No employees yet." : "No employees match that search."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const certs = (r.certificationIds || []).map((id) => certById[id]).filter(Boolean);
            return (
              <div key={r.id} className="flex items-center gap-5 rounded-geex border border-slate-200/70 bg-white p-5 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  {r.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-700 text-slate-400">{(r.fullName || "?").slice(0, 1)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{r.fullName}</h3>
                    {r.username && <span className="text-sm text-slate-400">({r.username})</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    {[r.employeeCode, posById[r.positionId]?.name, deptById[r.departmentId]?.name].filter(Boolean).join("  ·  ") || "—"}
                  </div>
                  {(r.departmentCode || (r.codes || []).length > 0 || r.isAdmin) && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {r.isAdmin && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-600 text-white">admin</span>}
                      {r.departmentCode && <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">{r.departmentCode}</span>}
                      {(r.codes || []).filter((c) => c !== r.departmentCode).map((c) => (
                        <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{c}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <div>Email: {r.email || "—"}</div>
                    <div>Mobile: {r.mobile || "—"}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setFormError(""); setEditing(r); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-600 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"><Icon name="pencil" className="h-3.5 w-3.5" /> edit</button>
                    <button onClick={() => remove(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => {
                      const c = certs[i];
                      return (
                        <div key={i} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-[#191921]" title={c?.name || ""}>
                          {c?.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.image} alt={c.name} className="h-full w-full object-contain p-0.5" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <EmployeeEditForm
              employee={editing.id ? editing : null}
              options={{ departments, positions, certifications }}
              canEditAll
              saving={saving}
              resetting={resetting}
              error={formError}
              onSave={save}
              onResetPassword={resetPassword}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {showPassword && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={() => setShowPassword(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">{showPassword.label}</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Password for <span className="font-600 text-slate-800 dark:text-slate-100">{showPassword.username}</span>. Copy it now — after this dialog closes it can&apos;t be retrieved.
            </p>
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <code className="block break-all font-mono text-sm text-slate-900 dark:text-white">{showPassword.password}</code>
            </div>
            <div className="flex justify-end gap-3">
              <CopyButton value={showPassword.password} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" />
              <button onClick={() => setShowPassword(null)} className={btnPrimary}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
