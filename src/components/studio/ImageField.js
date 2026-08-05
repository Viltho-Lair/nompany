"use client";

import { useState } from "react";

// Upload control for image / logo fields. Validates size client-side, uploads
// to /api/media, and stores the returned URL as the field value. Shared by
// StudioCollectionManager and StudioSettingsManager.
export default function ImageField({ field, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const maxKB = field.maxKB || 1024;
  const kind = maxKB <= 200 ? "logo" : "image";

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > maxKB * 1024) {
      setErr(`Image is ${Math.round(file.size / 1024)} KB — the limit is ${maxKB} KB.`);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/media?kind=${kind}`, { method: "POST", body });
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
      {value ? (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="h-14 w-14 rounded-xl border border-slate-200 bg-[#eef1f6] object-contain p-1 dark:border-white/15" />
          <button type="button" onClick={() => onChange("")} className="rounded-md px-2 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            Remove
          </button>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={onPick}
        disabled={busy}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-2 file:text-sm file:font-600 file:text-brand-700 hover:file:bg-brand-500/20 dark:text-slate-300 dark:file:bg-brand-500/20 dark:file:text-brand-400"
      />
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Max {maxKB} KB · PNG, JPG, WEBP, SVG or GIF.</p>
      {busy && <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">Uploading…</p>}
      {err && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}
