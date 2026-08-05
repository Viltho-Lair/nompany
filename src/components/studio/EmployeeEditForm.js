"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import EmployeeDocField from "@/components/studio/EmployeeDocField";
import DateInput from "@/components/studio/DateInput";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const EMPTY = {
  fullName: "", employeeCode: "", departmentId: "", positionId: "", dateOfJoin: "",
  email: "", mobile: "", photo: "", username: "", isAdmin: false, codes: [], certificationIds: [],
  idNumber: "", passportNumber: "", idImage: "", passportImage: "",
  idExpiry: "", passportExpiry: "",
};

// Circular photo control — uploads to the public /api/media store (any signed-in
// user), 512 KB cap, matching the mockup's round avatar with a "+".
function CircularPhoto({ value, onChange, canEdit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > 512 * 1024) { setErr(`Image is ${Math.round(file.size / 1024)} KB — limit 512 KB.`); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file);
      const res = await fetch("/api/media?kind=image", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-[#191921]">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="plus" className="h-7 w-7 text-slate-400" />
        )}
        {canEdit && (
          <label className="absolute inset-0 cursor-pointer" title="Upload photo">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={pick} disabled={busy} className="hidden" />
          </label>
        )}
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Max 512 KB · PNG, JPG, WEBP, SVG or GIF.</p>
      {canEdit && value && <button type="button" onClick={() => onChange("")} className="text-xs font-600 text-red-600 hover:underline">Remove</button>}
      {busy && <p className="text-xs text-brand-600">Uploading…</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function EmployeeEditForm({ employee, options, canEditAll = false, saving = false, error = "", onSave, onCancel, onResetPassword, resetting = false, showAdminToggle = true }) {
  const { departments = [], positions = [], certifications = [] } = options || {};
  const [form, setForm] = useState({ ...EMPTY, ...(employee || {}), codes: employee?.codes || [], certificationIds: employee?.certificationIds || [] });
  const [editId, setEditId] = useState(false);
  const [editPassport, setEditPassport] = useState(false);

  const set = (patch) => setForm((s) => ({ ...s, ...patch }));
  const isNew = !employee?.id;
  const hasAccount = Boolean(employee?.username);

  // The pool of access codes = every department's code (deduped). "Leader" is
  // just another code here.
  const codePool = useMemo(
    () => [...new Set(departments.map((d) => d.code).filter(Boolean))],
    [departments]
  );
  const toggleCode = (code) => set({ codes: form.codes.includes(code) ? form.codes.filter((c) => c !== code) : [...form.codes, code] });

  function setCert(idx, id) {
    const next = [...form.certificationIds];
    next[idx] = id;
    set({ certificationIds: next });
  }

  function submit() {
    onSave({
      ...form,
      certificationIds: (form.certificationIds || []).filter(Boolean).slice(0, 3),
    });
  }

  const Cert = ({ idx }) => (
    <select value={form.certificationIds[idx] || ""} disabled={!canEditAll} onChange={(e) => setCert(idx, e.target.value)} className={input}>
      <option value="">—</option>
      {certifications.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
    </select>
  );

  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">{employee?.id ? "Edit employee" : "Add employee"}</h2>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <CircularPhoto value={form.photo} onChange={(url) => set({ photo: url })} canEdit />
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Full Name</label>
            <input className={input} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </div>
          <div>
            <label className={label}>Employee Code</label>
            <input className={input} value={form.employeeCode} disabled={!canEditAll} onChange={(e) => set({ employeeCode: e.target.value })} />
          </div>
          <div>
            <label className={label}>Department</label>
            <select className={input} value={form.departmentId} disabled={!canEditAll} onChange={(e) => set({ departmentId: e.target.value })}>
              <option value="">—</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div>
            <label className={label}>Date of Join</label>
            <DateInput className={input} value={form.dateOfJoin} disabled={!canEditAll} onChange={(v) => set({ dateOfJoin: v })} />
          </div>
          <div>
            <label className={label}>Position</label>
            <select className={input} value={form.positionId} disabled={!canEditAll} onChange={(e) => set({ positionId: e.target.value })}>
              <option value="">—</option>
              {positions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className={label}>Email Address</label>
            <input type="email" className={input} value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label className={label}>Mobile Number</label>
            <input type="tel" className={input} value={form.mobile} onChange={(e) => set({ mobile: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Login account + access — admin/HR only. */}
      <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-white/10">
        <p className="mb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Login &amp; access</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Username</label>
            {isNew ? (
              <>
                <input className={input} value={form.username} disabled={!canEditAll} placeholder="e.g. moosa (blank = no login)" onChange={(e) => set({ username: e.target.value })} />
                <p className="mt-1 text-[11px] text-slate-400">A random password is generated and shown once on save.</p>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input className={input} value={form.username || "— no login —"} disabled readOnly />
                {hasAccount && onResetPassword && (
                  <button type="button" onClick={onResetPassword} disabled={resetting} className="shrink-0 rounded-lg border border-amber-500/40 px-3 py-2.5 text-xs font-600 text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-400 dark:hover:bg-amber-500/10">
                    {resetting ? "…" : "Reset password"}
                  </button>
                )}
              </div>
            )}
          </div>
          {showAdminToggle && (
            <div className="flex items-end">
              <label className={`flex items-center gap-2.5 text-sm font-600 text-slate-700 dark:text-slate-200 ${canEditAll ? "" : "opacity-60"}`}>
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  disabled={!canEditAll}
                  onChange={(e) => set({ isAdmin: e.target.checked })}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600 disabled:cursor-not-allowed dark:border-white/20"
                />
                Administrator
              </label>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className={label}>Access tags <span className="font-400 normal-case text-slate-400">(extra department codes, on top of the home department)</span></label>
          {codePool.length === 0 ? (
            <p className="text-xs text-slate-400">No department codes yet — create departments above.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {codePool.map((code) => {
                const on = form.codes.includes(code);
                return (
                  <button key={code} type="button" disabled={!canEditAll} onClick={() => toggleCode(code)}
                    className={`rounded-full px-3 py-1 text-xs font-600 transition-colors ${on ? "bg-brand-500/15 text-brand-700 ring-1 ring-brand-500/40 dark:text-brand-300" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"} ${canEditAll ? "" : "cursor-default opacity-70"}`}>
                    {code}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">Section access, task approvals and quotation visibility are driven by this employee&apos;s department.</p>
        </div>
      </div>

      {/* Certifications — up to 3. */}
      <div className="mt-4">
        <label className={label}>Certifications</label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Cert idx={0} /><Cert idx={1} /><Cert idx={2} />
        </div>
      </div>

      {/* Sensitive numbers — greyed unless HR clicks edit. */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">ID Number</label>
            {canEditAll && <button type="button" onClick={() => setEditId((v) => !v)} className="rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">{editId ? "lock" : "edit"}</button>}
          </div>
          <input className={input} value={form.idNumber} disabled={!canEditAll || !editId} onChange={(e) => set({ idNumber: e.target.value })} />
          <label className="mt-2 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">ID Expiry</label>
          <DateInput className={input} value={form.idExpiry || ""} disabled={!canEditAll} onChange={(v) => set({ idExpiry: v })} />
          <div className="mt-2"><EmployeeDocField label="ID Image" employeeId={employee?.id} value={form.idImage} onChange={(url) => set({ idImage: url })} /></div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Passport Number</label>
            {canEditAll && <button type="button" onClick={() => setEditPassport((v) => !v)} className="rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">{editPassport ? "lock" : "edit"}</button>}
          </div>
          <input className={input} value={form.passportNumber} disabled={!canEditAll || !editPassport} onChange={(e) => set({ passportNumber: e.target.value })} />
          <label className="mt-2 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Passport Expiry</label>
          <DateInput className={input} value={form.passportExpiry || ""} disabled={!canEditAll} onChange={(v) => set({ passportExpiry: v })} />
          <div className="mt-2"><EmployeeDocField label="Passport Image" employeeId={employee?.id} value={form.passportImage} onChange={(url) => set({ passportImage: url })} /></div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className={btnGhost}>Cancel</button>
        <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
