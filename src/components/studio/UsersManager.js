"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import CopyButton from "@/components/studio/CopyButton";
import { confirmDialog } from "@/lib/appDialog";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

// Users management — admin-only. Handles create (returns plaintext password
// once), edit (userId/fullName/administrator flag), delete, and reset-password
// (returns plaintext once). Password is never round-tripped otherwise.
// Department / Leader access is no longer assigned here — it's derived from
// the user's linked Employee record (User Management → Employees). The only
// thing this page still stores directly is the "admin" super-flag.
export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(null); // { id?, userId, fullName, isAdmin }
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(null); // { userId, password }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const uRes = await fetch("/api/users", { cache: "no-store" });
      if (uRes.status === 403) throw new Error("You need the admin tag to see this page.");
      const uJson = await uRes.json();
      setUsers(Array.isArray(uJson) ? uJson : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ userId: "", isAdmin: false });
  }
  function openEdit(u) {
    setForm({ id: u.id, userId: u.userId || "", isAdmin: (u.tags || []).includes("admin") });
  }

  async function save() {
    if (!form.userId.trim()) {
      setError("Please fill in the User ID.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = form.id ? `/api/users/${form.id}` : "/api/users";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: form.userId.trim(), tags: form.isAdmin ? ["admin"] : [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setForm(null);
      await load();
      // POST returns the generated plaintext password once — surface it in a
      // dedicated dialog so admin can copy it before it's gone forever.
      if (!method || method === "POST") {
        if (data.password) setShowPassword({ userId: data.user?.userId, password: data.password, label: "New user" });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(u) {
    if (!(await confirmDialog({ title: "Reset password", message: `Generate a new password for ${u.userId}? The old one will stop working.`, confirmLabel: "Generate" }))) return;
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setShowPassword({ userId: u.userId, password: data.password, label: "Password reset" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(u) {
    if (!(await confirmDialog({ title: "Delete user", message: `Delete user ${u.userId}? This cannot be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {users.length} {users.length === 1 ? "user" : "users"} in total
        </p>
        <button onClick={openAdd} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Add user
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">User ID</th>
                  <th className="px-5 py-3.5 text-start font-600">Full name</th>
                  <th className="px-5 py-3.5 text-start font-600">Department</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">{u.userId}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{u.fullName || "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(u.tags || []).includes("admin") && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-600 text-white">admin</span>}
                        {(u.tags || []).filter((t) => t !== "admin").map((t) => (
                          <span key={t} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{t}</span>
                        ))}
                        {(u.tags || []).length === 0 && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">Edit</button>
                        <button onClick={() => resetPassword(u)} className="rounded-md px-2.5 py-1 text-xs font-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10">Reset password</button>
                        <button onClick={() => remove(u)} className="rounded-md px-2.5 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={() => setForm(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">
              {form.id ? "Edit user" : "Add user"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input className={input} value={form.userId} onChange={(e) => setForm((s) => ({ ...s, userId: e.target.value }))} placeholder="moosa" />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Most accounts are created from User Management → Employees. Use this only for logins with no employee record.</p>
              </div>
              <div>
                <label className="flex items-center gap-2.5 text-sm font-600 text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.isAdmin}
                    onChange={(e) => setForm((s) => ({ ...s, isAdmin: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600 dark:border-white/20"
                  />
                  Administrator
                </label>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Admins see every section. Everyone else's section access comes from their linked Employee's department — see User Management → Employees.
                </p>
              </div>
              {!form.id && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A random password will be generated and shown once on save. Copy it now — it can&apos;t be recovered later.
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Password-shown-once modal */}
      {showPassword && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={() => setShowPassword(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">{showPassword.label}</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Password for <span className="font-600 text-slate-800 dark:text-slate-100">{showPassword.userId}</span>. Copy it now — after this dialog closes it can&apos;t be retrieved.
            </p>
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
              <code className="block break-all font-mono text-sm text-slate-900 dark:text-white">{showPassword.password}</code>
            </div>
            <div className="flex justify-end gap-3">
              <CopyButton value={showPassword.password} className={btnGhost} />
              <button onClick={() => setShowPassword(null)} className={btnPrimary}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
