"use client";

import { useState } from "react";

// Uploader + viewer for a sensitive document scan (ID / passport). Uploads
// to the gated /api/employees/doc route (private + owner-scoped media) and
// stores the returned URL. The file is only viewable by admin, HR, or the
// linked employee — enforced server-side in /api/media/[id].
export default function EmployeeDocField({ label, employeeId, value, onChange, canEdit = true }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isImage = value && !/\.pdf($|\?)/i.test(value);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
      const res = await fetch(`/api/employees/doc${qs}`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (e2) {
      setErr(e2.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-[#191921]">
        {value ? (
          isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">Document uploaded (PDF)</span>
          )
        ) : (
          <span className="text-sm text-slate-400">{label} +</span>
        )}

        {canEdit && (
          <label className="absolute right-2 top-2 cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-600 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-[#20202c] dark:text-slate-300">
            {value ? "replace" : "upload"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={onPick} disabled={busy} className="hidden" />
          </label>
        )}
        {value && (
          <a href={value} target="_blank" rel="noopener noreferrer" download className="absolute bottom-2 right-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-600 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-[#20202c] dark:text-slate-300">
            Download
          </a>
        )}
      </div>
      {busy && <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">Uploading…</p>}
      {err && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}
