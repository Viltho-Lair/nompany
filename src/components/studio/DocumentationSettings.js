"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import ImageField from "@/components/studio/ImageField";
import { imageSlots } from "@/lib/documentation";
import { confirmDialog } from "@/lib/appDialog";

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function DocumentationSettings() {
  const slots = useMemo(() => imageSlots(), []);
  const slotLabel = useMemo(() => Object.fromEntries(slots.map((s) => [s.slot, s])), [slots]);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ slot: "", description: "", url: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/docImages", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load images.");
      setImages(await res.json());
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.slot) return setError("Choose a location.");
    if (!form.url) return setError("Upload an image first.");
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/docImages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: form.slot, description: form.description.trim(), url: form.url, createdAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed.");
      setForm({ slot: "", description: "", url: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(img) {
    if (!(await confirmDialog({ title: "Remove image", message: "Delete this documentation image?", confirmLabel: "Delete" }))) return;
    try {
      const res = await fetch(`/api/docImages/${img.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      await load();
    } catch (e) { setError(e.message); }
  }

  const bySlot = useMemo(() => {
    const map = {};
    for (const img of images) (map[img.slot] ||= []).push(img);
    return map;
  }, [images]);

  return (
    <div className="max-w-3xl">
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Add screenshots to the guide. Pick the <span className="font-600">location</span> (a slot in the Documentation pages), write a short <span className="font-600">description</span> of what the image shows, and upload it. The image then appears at that spot in Documentation.
      </p>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Add form */}
      <div className="mb-8 rounded-geex border border-slate-200/70 bg-white p-5 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        <h2 className="mb-4 font-display text-base font-700 text-slate-900 dark:text-white">Add an image</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Location</label>
            <select className={input} value={form.slot} onChange={(e) => setForm((s) => ({ ...s, slot: e.target.value }))}>
              <option value="">Select where this image goes…</option>
              {slots.map((s) => (
                <option key={s.slot} value={s.slot}>{s.section} — {s.label}</option>
              ))}
            </select>
            {form.slot && slotLabel[form.slot] && (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">In “{slotLabel[form.slot].section} → {slotLabel[form.slot].article}”.</p>
            )}
          </div>
          <div>
            <label className={label}>Description <span className="font-400 normal-case text-slate-400">(what the image is about)</span></label>
            <input className={input} value={form.description} placeholder="e.g. The Create ticket popup with required fields" onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Image</label>
            <ImageField field={{ maxKB: 1024 }} value={form.url} onChange={(url) => setForm((s) => ({ ...s, url }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={add} disabled={saving} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> {saving ? "Adding…" : "Add image"}</button>
        </div>
      </div>

      {/* Existing images, grouped by slot */}
      <h2 className="mb-3 font-display text-base font-700 text-slate-900 dark:text-white">Added images</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : images.length === 0 ? (
        <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">No images added yet.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySlot).map(([slot, imgs]) => (
            <div key={slot} className="rounded-geex border border-slate-200/70 bg-white p-4 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
              <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {slotLabel[slot] ? `${slotLabel[slot].section} — ${slotLabel[slot].label}` : slot}
                {!slotLabel[slot] && <span className="ms-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-600 text-amber-700 dark:text-amber-400">unused location</span>}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {imgs.map((img) => (
                  <div key={img.id} className="flex gap-3 rounded-xl border border-slate-100 p-2.5 dark:border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 bg-[#eef1f6] object-contain p-1 dark:border-white/15" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700 dark:text-slate-200">{img.description || <span className="text-slate-400">No description</span>}</p>
                      <button onClick={() => remove(img)} className="mt-1 text-xs font-600 text-red-600 hover:underline dark:text-red-400">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
