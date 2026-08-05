"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";

// Admin configures, per task type, WHO acts on it. Tasks can span several
// authorities at once (e.g. Quotation approval goes to Sales + Finance +
// Management), so each authority gets its OWN people picker. Stored as:
//   settings.taskAssignees = { [taskType]: { [authorityCode]: [userId, …] } }  (structured — drives this UI)
//   settings.taskManagers  = { [taskType]: [userId, …] }                       (flat union — read by the task flow)
// The flat `taskManagers` is derived (union of every authority) on save so the
// existing task flow (snapshots it onto task.assigneeIds) keeps working unchanged.
// Adding a future task type is another entry in TASK_TYPES (+ its authorities).
const TASK_TYPES = [
  { key: "approval", label: "Quotation approval", desc: "Signs off approval tasks and sends approved quotations to Projects (added alongside the Sales/Management leaders)." },
  { key: "po", label: "PO approval", desc: "Two-party: Management approves the client PO and enters the PO number; Finance enters the project number." },
  { key: "material-po", label: "Vendor PO approval", desc: "Two-party: Finance and Management both approve a material order before a purchase order is issued to the vendor." },
  { key: "delivery", label: "Delivery request", desc: "Releases requested material and issues delivery notes." },
  { key: "delivery-return", label: "Material return", desc: "Confirms returned material and reassigns it to stock." },
  { key: "id-update", label: "Information update", desc: "Updates an employee's ID expiry date when they request an information update after changing their ID image." },
  { key: "permit-request", label: "Permit request", desc: "Issues a new permit when raised from a project's Client → Permits box (permit expiring or missing for the project's city)." },
];

// Which authorities (department groups) each task type is assigned to. Each entry
// resolves to a department by `code` (falling back to `label` as the name), and
// its picker lists the staff of that department. Keys are stable authority codes.
const TASK_AUTHORITIES = {
  approval: [{ code: "sales", label: "Sales" }, { code: "mng", label: "Management" }],
  po: [{ code: "mng", label: "Management" }, { code: "fin", label: "Finance" }],
  "material-po": [{ code: "fin", label: "Finance" }, { code: "mng", label: "Management" }],
  delivery: [{ code: "log", label: "Logistics" }],
  "delivery-return": [{ code: "log", label: "Logistics" }],
  "id-update": [{ code: "hr", label: "HR" }],
  "permit-request": [{ code: "permit", label: "Permit" }],
};

// Resolve an authority to its department row (by code first, then by name).
function resolveDept(authority, departments) {
  return (
    departments.find((d) => (d.code || "").trim().toLowerCase() === authority.code) ||
    departments.find((d) => (d.name || "").trim().toLowerCase() === authority.label.toLowerCase()) ||
    null
  );
}

// Flatten the structured per-authority assignments into the legacy flat list
// (unique userIds per task type) that the task flow consumes.
function flattenManagers(assignees) {
  const tm = {};
  for (const [type, groups] of Object.entries(assignees || {})) {
    const set = new Set();
    for (const arr of Object.values(groups || {})) for (const id of arr || []) if (id) set.add(id);
    tm[type] = [...set];
  }
  return tm;
}

// Build the initial structured assignments — reuse settings.taskAssignees when
// present, otherwise migrate the legacy flat taskManagers (+ logisticsUserIds)
// by routing each existing user to the authority whose department they belong to
// (unknown users fall to the task's first authority so nothing is lost).
function seedAssignees(s, staff, departments) {
  const existing = s.taskAssignees || {};
  const result = {};
  for (const tt of TASK_TYPES) {
    const auths = TASK_AUTHORITIES[tt.key] || [];
    const bucket = {};
    for (const a of auths) bucket[a.code] = [];

    const cur = existing[tt.key];
    if (cur && typeof cur === "object" && !Array.isArray(cur)) {
      for (const a of auths) bucket[a.code] = Array.isArray(cur[a.code]) ? [...cur[a.code]] : [];
      result[tt.key] = bucket;
      continue;
    }

    // Migrate legacy flat assignments.
    let legacy = Array.isArray(s.taskManagers?.[tt.key]) ? s.taskManagers[tt.key] : [];
    if (!legacy.length && (tt.key === "delivery" || tt.key === "delivery-return") && Array.isArray(s.logisticsUserIds)) {
      legacy = s.logisticsUserIds;
    }
    for (const uid of legacy) {
      const emp = staff.find((e) => e.userId === uid);
      let placed = false;
      if (emp) {
        for (const a of auths) {
          const dept = resolveDept(a, departments);
          if (dept && emp.departmentId === dept.id) { bucket[a.code].push(uid); placed = true; break; }
        }
      }
      if (!placed && auths[0]) bucket[auths[0].code].push(uid);
    }
    result[tt.key] = bucket;
  }
  return result;
}

export default function TaskSettingsModal({ onClose }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignees, setAssignees] = useState({}); // { type: { authorityCode: [userId] } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [eRes, dRes, sRes] = await Promise.all([
          fetch("/api/employees", { cache: "no-store" }),
          fetch("/api/departments", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        const emps = eRes.ok ? await eRes.json() : [];
        const depts = dRes.ok ? await dRes.json() : [];
        const s = sRes.ok ? await sRes.json() : {};
        // Only staff with a login account can act on a task.
        const staff = emps.filter((e) => e.userId && e.fullName);
        setEmployees(emps);
        setDepartments(depts);
        setAssignees(seedAssignees(s, staff, depts));
      } catch { setError("Could not load."); }
      finally { setLoading(false); }
    })();
  }, []);

  const staff = useMemo(() => employees.filter((e) => e.userId && e.fullName), [employees]);

  const toggle = (type, code, userId) => {
    setAssignees((m) => {
      const forType = { ...(m[type] || {}) };
      const cur = Array.isArray(forType[code]) ? forType[code] : [];
      forType[code] = cur.includes(userId) ? cur.filter((x) => x !== userId) : [...cur, userId];
      return { ...m, [type]: forType };
    });
    setSaved(false);
  };

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskAssignees: assignees, taskManagers: flattenManagers(assignees) }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Task management</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">For each task type, assign the specific people who act on it. Tasks that span several authorities have a separate picker per group.</p>

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="space-y-5">
            {TASK_TYPES.map((tt) => {
              const auths = TASK_AUTHORITIES[tt.key] || [];
              return (
                <div key={tt.key} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="mb-3">
                    <p className="font-600 text-slate-800 dark:text-slate-100">{tt.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tt.desc}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {auths.map((a) => {
                      const dept = resolveDept(a, departments);
                      const pool = dept ? staff.filter((e) => e.departmentId === dept.id) : staff;
                      const selected = assignees[tt.key]?.[a.code] || [];
                      return (
                        <AuthorityPicker
                          key={a.code}
                          label={a.label}
                          pool={pool}
                          selected={selected}
                          onToggle={(uid) => toggle(tt.key, a.code, uid)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
        </div>
      </div>
    </div>
  );
}

// Per-authority multi-select dropdown: shows the picked names, opens a checklist
// of that department's staff. Closes on outside click.
function AuthorityPicker({ label, pool, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const byId = useMemo(() => Object.fromEntries(pool.map((p) => [p.userId, p])), [pool]);
  const names = selected.map((id) => byId[id]?.fullName).filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921]"
      >
        <span className={`truncate ${names.length ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>
          {names.length ? names.join(", ") : "Select people…"}
        </span>
        <Icon name="chevronDown" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
          {pool.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">No {label} staff with a login account.</p>
          ) : pool.map((e) => (
            <label key={e.userId} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={selected.includes(e.userId)}
                onChange={() => onToggle(e.userId)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 dark:border-white/20 dark:bg-[#191921]"
              />
              <span className="truncate text-slate-700 dark:text-slate-200">{e.fullName}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
