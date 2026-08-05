"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ACCESS_TREE } from "@/lib/accessControl";
import { confirmDialog } from "@/lib/appDialog";

const Chevron = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const ACTION_LABEL = {
  view: "View",
  manage: "Manage",
  "see-all": "See all records",
  "see-cost": "See cost",
  "submit-po": "Submit PO",
  "issue-project-number": "Issue project #",
  "receive-sales": "Receive Sales chats",
  "receive-support": "Receive Support chats",
};

// The Access Control tree. Admin picks a subject (a department OR an individual
// user), then walks the permission tree granting/denying each action. Grants
// are stored under settings.accessControl and resolved by can(); admins are
// always all-access (no toggles for them). "Deny" wins over "Allow" — useful to
// carve an exception out of a department grant for one user.
export default function AccessControlManager() {
  const [grants, setGrants] = useState({ departments: {}, users: {} });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [scope, setScope] = useState("departments"); // "departments" | "users"
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(ACCESS_TREE.map((n) => n.key)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, dRes, uRes] = await Promise.all([
        fetch("/api/section-access", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      const aJson = await aRes.json();
      const dJson = await dRes.json();
      const uJson = await uRes.json();
      const g = aJson.access || {};
      setGrants({ departments: g.departments || {}, users: g.users || {} });
      const depts = (Array.isArray(dJson) ? dJson : []).filter((d) => d.code);
      setDepartments(depts);
      setUsers(Array.isArray(uJson) ? uJson : []);
      setError("");
    } catch (e) {
      setError("Could not load access control.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Subjects for the current scope — departments keyed by CODE, users by id.
  const subjects = useMemo(() => {
    if (scope === "departments") {
      return [...new Map(departments.map((d) => [d.code, d.name])).entries()].map(([id, label]) => ({ id, label: `${label} (${id})` }));
    }
    return users
      .filter((u) => !(Array.isArray(u.tags) && u.tags.includes("admin")))
      .map((u) => ({ id: u.id, label: u.fullName ? `${u.fullName} (${u.userId})` : u.userId }));
  }, [scope, departments, users]);

  // Keep a valid selection whenever the scope or subject list changes.
  useEffect(() => {
    if (subjects.length === 0) { setSelectedId(""); return; }
    if (!subjects.some((s) => s.id === selectedId)) setSelectedId(subjects[0].id);
  }, [subjects, selectedId]);

  const cellOf = (nodeKey, action) => grants?.[scope]?.[selectedId]?.[nodeKey]?.[action] || "";

  function setCell(nodeKey, action, value) {
    if (!selectedId) return;
    setGrants((prev) => {
      const next = { departments: { ...prev.departments }, users: { ...prev.users } };
      const bucket = { ...(next[scope] || {}) };
      const forSubject = { ...(bucket[selectedId] || {}) };
      const forNode = { ...(forSubject[nodeKey] || {}) };
      if (value) forNode[action] = value; else delete forNode[action];
      if (Object.keys(forNode).length) forSubject[nodeKey] = forNode; else delete forSubject[nodeKey];
      if (Object.keys(forSubject).length) bucket[selectedId] = forSubject; else delete bucket[selectedId];
      next[scope] = bucket;
      return next;
    });
    setSaved(false);
  }

  function toggleExpand(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/section-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access: grants }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      const g = data.access || {};
      setGrants({ departments: g.departments || {}, users: g.users || {} });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!(await confirmDialog({ title: "Clear all access", message: "Remove every grant for every department and user? Admins keep full access; everyone else will be locked out until you grant access again.", confirmLabel: "Clear all", tone: "danger" }))) return;
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/section-access", { method: "DELETE" });
      if (!res.ok) throw new Error("Reset failed");
      const data = await res.json();
      const g = data.access || {};
      setGrants({ departments: g.departments || {}, users: g.users || {} });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const selectedLabel = subjects.find((s) => s.id === selectedId)?.label || "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-slate-700 dark:text-slate-300">
        Grant access to a <span className="font-600">department</span> (everyone in it inherits it) or to an <span className="font-600">individual user</span>.
        <span className="font-600"> View</span> lets someone open a section; <span className="font-600">Manage</span> adds create/edit/delete (and implies View).
        Named actions (See cost, Submit PO, …) unlock specific abilities. <span className="font-600">Deny</span> always beats Allow — use it to carve one user out of a department grant.
        Admins always have full access and don&apos;t appear here. Sections are independent: granting a section&apos;s dashboard does <span className="font-600">not</span> unlock its sub-sections.
      </div>

      {/* Subject picker */}
      <div className="rounded-geex border border-slate-200/70 bg-white p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/15">
            {[["departments", "Departments"], ["users", "Individual users"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setScope(val)}
                className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${scope === val ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex min-w-[240px] flex-1 items-center gap-3">
            <label className="shrink-0 text-[11px] font-600 uppercase tracking-wide text-slate-400">
              {scope === "departments" ? "Department" : "User"}
            </label>
            {subjects.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {scope === "departments" ? "No departments yet — create some in Human Resources → Employees." : "No non-admin users yet."}
              </p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-white/15 dark:bg-[#191921] dark:text-slate-100"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Permission tree for the selected subject */}
      {selectedId && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Editing access for <span className="font-700 text-slate-800 dark:text-slate-100">{selectedLabel}</span>
          </p>
          <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
            {ACCESS_TREE.map((node) => (
              <TreeNode
                key={node.key}
                node={node}
                depth={0}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                cellOf={cellOf}
                setCell={setCell}
              />
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {/* Sticky action bar — stays on screen no matter how far the permission
          tree is scrolled, so Save / Clear are always reachable. */}
      <div className="sticky bottom-0 z-20 -mx-5 flex items-center gap-4 border-t border-slate-200/70 bg-[var(--geex-page)]/95 px-5 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8 dark:border-white/10">
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save changes"}</button>
        <button onClick={resetAll} disabled={resetting} className={btnGhost}>{resetting ? "Clearing…" : "Clear all grants"}</button>
        {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}

function TreeNode({ node, depth, expanded, onToggleExpand, cellOf, setCell }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isOpen = expanded.has(node.key);
  const hasActions = Array.isArray(node.actions) && node.actions.length > 0;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-white/5"
        style={{ paddingInlineStart: 16 + depth * 20 }}
      >
        <div className="flex min-w-[180px] items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(node.key)}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <Chevron open={isOpen} />
            </button>
          ) : (
            <span className="inline-block h-5 w-5" />
          )}
          <span className={`font-600 ${depth === 0 ? "text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
            {node.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasActions
            ? node.actions.map((action) => (
                <ActionControl
                  key={action}
                  label={ACTION_LABEL[action] || action}
                  value={cellOf(node.key, action)}
                  onChange={(v) => setCell(node.key, action, v)}
                />
              ))
            : <span className="text-xs text-slate-400 dark:text-slate-500">Group — see sub-sections</span>}
        </div>
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <TreeNode
          key={child.key}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          cellOf={cellOf}
          setCell={setCell}
        />
      ))}
    </div>
  );
}

// A three-state control for one action: —(inherit/none) / Allow / Deny.
function ActionControl({ label, value, onChange }) {
  const opt = (val, text, activeCls) => (
    <button
      onClick={() => onChange(value === val ? "" : val)}
      className={`px-2 py-1 text-xs font-600 transition-colors ${value === val ? activeCls : "text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-white/5"}`}
      aria-pressed={value === val}
    >
      {text}
    </button>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-white/15">
        {opt("", "—", "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200")}
        {opt("allow", "Allow", "bg-emerald-500 text-white")}
        {opt("deny", "Deny", "bg-red-500 text-white")}
      </div>
    </div>
  );
}
