"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmployeeEditForm from "@/components/studio/EmployeeEditForm";
import { Icon } from "@/components/studio/icons";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";

// Change-password card: current / new / confirm. Verifies the current password
// server-side before setting the new one.
function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const set = (p) => setForm((s) => ({ ...s, ...p }));

  async function submit() {
    setErr(""); setOk("");
    if (!form.current || !form.next) { setErr("Fill in every field."); return; }
    if (form.next.length < 8) { setErr("New password must be at least 8 characters."); return; }
    if (form.next !== form.confirm) { setErr("New password and confirmation don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/users/me/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: form.current, next: form.next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not change password.");
      setForm({ current: "", next: "", confirm: "" });
      setOk("Password changed.");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">Change password</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Enter your current password, then a new one.</p>
      {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
      {ok && <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{ok}</p>}
      <div className="grid max-w-md gap-3">
        <div>
          <label className={label}>Current password</label>
          <input type="password" autoComplete="current-password" className={input} value={form.current} onChange={(e) => set({ current: e.target.value })} />
        </div>
        <div>
          <label className={label}>New password</label>
          <input type="password" autoComplete="new-password" className={input} value={form.next} onChange={(e) => set({ next: e.target.value })} />
        </div>
        <div>
          <label className={label}>Confirm new password</label>
          <div className="relative">
            <input type="password" autoComplete="new-password" className={`${input} pr-9`} value={form.confirm} onChange={(e) => set({ confirm: e.target.value })} />
            {form.confirm && form.next === form.confirm && (
              <Icon name="checkDouble" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          {form.confirm && (
            form.next === form.confirm ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-600 text-emerald-600 dark:text-emerald-400"><Icon name="check" className="h-3.5 w-3.5" /> Passwords match</p>
            ) : (
              <p className="mt-1 text-xs font-600 text-red-600 dark:text-red-400">Passwords don&apos;t match</p>
            )
          )}
        </div>
        <div><button onClick={submit} disabled={busy || (form.confirm && form.next !== form.confirm)} className={btnPrimary}>{busy ? "Saving…" : "Change password"}</button></div>
      </div>
    </div>
  );
}

// The profile at /studio/profile. A linked employee edits their own
// name/contact/photo/ID scans (other fields read-only — HR manages them); the
// bootstrap admin (no employee) gets a minimal account card. Everyone gets the
// Change-password card. The Administrator toggle is hidden here.
export default function EmployeeSelfProfile() {
  const [employee, setEmployee] = useState(undefined); // undefined=loading, null=not linked
  const [me, setMe] = useState(null);
  const [options, setOptions] = useState({ departments: [], positions: [], certifications: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  // ID-image baseline (captured on first load) so "Request update information"
  // only activates once the employee actually replaces their ID image.
  const initialIdImageRef = useRef(undefined);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqOk, setReqOk] = useState("");
  const [requested, setRequested] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meRes, empRes, d, p, c] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/employees/me", { cache: "no-store" }),
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/positions", { cache: "no-store" }),
        fetch("/api/certifications", { cache: "no-store" }),
      ]);
      setMe((await meRes.json().catch(() => ({})))?.user || null);
      const emp = empRes.ok ? await empRes.json() : null;
      if (initialIdImageRef.current === undefined) initialIdImageRef.current = emp?.idImage || "";
      setEmployee(emp);
      setOptions({
        departments: d.ok ? await d.json() : [],
        positions: p.ok ? await p.json() : [],
        certifications: c.ok ? await c.json() : [],
      });
    } catch { setEmployee(null); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(payload) {
    setSaving(true); setError(""); setOk("");
    try {
      const res = await fetch("/api/employees/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEmployee(data);
      setOk("Profile updated.");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function requestUpdate() {
    setReqBusy(true); setReqErr(""); setReqOk("");
    try {
      const res = await fetch("/api/employees/me/request-update", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send the request.");
      setReqOk("Request sent. The assigned team will update your ID expiry date.");
      setRequested(true);
    } catch (e) { setReqErr(e.message); }
    finally { setReqBusy(false); }
  }

  const isAdmin = Array.isArray(me?.tags) && me.tags.includes("admin");
  const idImageChanged = !!(employee && (employee.idImage || "") && (employee.idImage || "") !== (initialIdImageRef.current || ""));

  if (employee === undefined) return <div className="text-sm text-slate-400">Loading…</div>;

  // Not linked to an employee — minimal account card + change password.
  if (employee === null) {
    return (
      <div className="space-y-5">
        <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">My account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Username <span className="font-600 text-slate-700 dark:text-slate-200">{me?.userId || "—"}</span></p>
        </div>
        <ChangePassword />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">My profile</h2>
        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">You can update your name, contact details, photo and ID scans. Other fields are managed by HR.</p>
        {ok && <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">{ok}</p>}
        <EmployeeEditForm
          employee={employee}
          options={options}
          canEditAll={false}
          saving={saving}
          error={error}
          onSave={save}
          onCancel={load}
          showAdminToggle={false}
        />
        {!isAdmin && (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
            <h3 className="mb-1 font-display text-sm font-700 text-slate-900 dark:text-white">Request update information</h3>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              After replacing your ID image above and saving, send a request so the assigned team can update your ID expiry date.
            </p>
            {reqErr && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{reqErr}</p>}
            {reqOk && <p className="mb-2 text-sm text-emerald-600 dark:text-emerald-400">{reqOk}</p>}
            <button
              onClick={requestUpdate}
              disabled={!idImageChanged || requested || reqBusy}
              title={!idImageChanged ? "Change and save your ID image first" : "Send an information update request"}
              className={btnPrimary + " disabled:cursor-not-allowed"}
            >
              {reqBusy ? "Sending…" : requested ? "Request sent" : "Request update information"}
            </button>
          </div>
        )}
      </div>
      <ChangePassword />
    </div>
  );
}
