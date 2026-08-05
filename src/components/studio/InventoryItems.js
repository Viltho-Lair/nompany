"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import ImageField from "@/components/studio/ImageField";
import RichTextField from "@/components/studio/RichTextField";
import { useLivePoll } from "@/lib/useLivePoll";
import { fmtSAR } from "@/lib/format";
import { confirmDialog } from "@/lib/appDialog";

// Rich-text description → short plain-text preview for the list cell.
function plainText(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const card = "overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

export default function InventoryItems() {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState("");

  async function uploadDoc(field, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingField(field); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media?kind=file", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((s) => ({ ...s, [field]: data.url }));
    } catch (e2) { setError(e2.message); }
    finally { setUploadingField(""); }
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [iRes, vRes] = await Promise.all([
        fetch("/api/inventoryItems", { cache: "no-store" }),
        fetch("/api/inventoryVendors", { cache: "no-store" }),
      ]);
      if (iRes.status === 403) throw new Error("You need Inventory access.");
      setItems(iRes.ok ? await iRes.json() : []);
      setVendors(vRes.ok ? await vRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load items.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const vendorsById = useMemo(() => Object.fromEntries(vendors.map((v) => [v.id, v])), [vendors]);
  const vendorName = (id) => vendorsById[id]?.name || "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => `${it.name || ""} ${it.modelNumber || ""} ${vendorName(it.vendorId)} ${it.description || ""}`.toLowerCase().includes(q));
  }, [items, query, vendorsById]);

  const vendorMatches = useMemo(() => {
    if (!form) return [];
    const q = (form.vendorQuery || "").trim().toLowerCase();
    const list = q ? vendors.filter((v) => (v.name || "").toLowerCase().includes(q)) : vendors;
    return list.slice(0, 8);
  }, [form, vendors]);

  function openCreate() {
    setForm({ mode: "create", vendorId: "", vendorQuery: "", modelNumber: "", name: "", description: "", price: "", image: "", dataSheet: "", manual: "", needsInstallation: false, needsProgramming: false, itemType: "", deliveryWeeks: "" });
  }
  function openEdit(it) {
    setForm({ mode: "edit", id: it.id, vendorId: it.vendorId || "", vendorQuery: vendorName(it.vendorId), modelNumber: it.modelNumber || "", name: it.name || "", description: it.description || "", price: it.price ?? "", image: it.image || "", dataSheet: it.dataSheet || "", manual: it.manual || "", needsInstallation: !!it.needsInstallation, needsProgramming: !!it.needsProgramming, itemType: it.itemType || "", deliveryWeeks: it.deliveryWeeks ?? "" });
  }

  async function save() {
    setError("");
    if (!form.vendorId) return setError("Please select a vendor.");
    if (!form.modelNumber.trim()) return setError("Model number is required.");
    if (!form.name.trim()) return setError("Name is required.");
    const payload = {
      vendorId: form.vendorId,
      modelNumber: form.modelNumber.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price === "" ? "" : Number(form.price),
      image: form.image || "",
      dataSheet: form.dataSheet || "",
      manual: form.manual || "",
      needsInstallation: !!form.needsInstallation,
      needsProgramming: !!form.needsProgramming,
      itemType: form.itemType || "",
      deliveryWeeks: form.deliveryWeeks === "" || form.deliveryWeeks == null ? "" : Number(form.deliveryWeeks),
    };
    setSaving(true);
    try {
      const url = form.mode === "edit" ? `/api/inventoryItems/${form.id}` : "/api/inventoryItems";
      const res = await fetch(url, { method: form.mode === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed.");
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!(await confirmDialog({ title: "Delete item", message: "Delete this item? This cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/inventoryItems/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not delete.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <input type="search" placeholder="Search items, model, vendor…" value={query} onChange={(e) => setQuery(e.target.value)} className={`${input} sm:w-72`} />
        <button onClick={openCreate} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> Add item</button>
      </div>

      {error && !form && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={card}>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{items.length === 0 ? "No registered items yet." : "No items match your search."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#2c2c3a] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Name</th>
                  <th className="px-5 py-3.5 text-start font-600">Model No.</th>
                  <th className="px-5 py-3.5 text-start font-600">Vendor</th>
                  <th className="px-5 py-3.5 text-start font-600">Price</th>
                  <th className="px-5 py-3.5 text-start font-600">Description</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt="" className="h-8 w-8 shrink-0 rounded-md border border-slate-200 bg-[#eef1f6] object-contain dark:border-white/10" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-white/5"><Icon name="services" className="h-4 w-4" /></span>
                        )}
                        <span>{it.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{it.modelNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{vendorName(it.vendorId)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-200">{fmtSAR(it.price)}</td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-slate-500 dark:text-slate-400" title={plainText(it.description)}>{plainText(it.description) || "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(it)} className="rounded-md px-2.5 py-1 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-400">Edit</button>
                        <button onClick={() => remove(it.id)} className="rounded-md px-2.5 py-1 text-xs font-600 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">{form.mode === "edit" ? "Edit item" : "Add item"}</h2>
            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <label className={label}>Vendor <span className="text-red-500">*</span></label>
                <input
                  className={input}
                  placeholder="Search a vendor…"
                  value={form.vendorQuery}
                  onChange={(e) => setForm((s) => ({ ...s, vendorQuery: e.target.value, vendorId: "", itemType: "", deliveryWeeks: "" }))}
                  onFocus={() => setVendorOpen(true)}
                  onBlur={() => setTimeout(() => setVendorOpen(false), 120)}
                  autoComplete="off"
                />
                {vendorOpen && vendorMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#191921]">
                    {vendorMatches.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setForm((s) => ({ ...s, vendorId: v.id, vendorQuery: v.name, itemType: "", deliveryWeeks: "" })); setVendorOpen(false); }}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-start text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200"
                        >
                          <span className="font-600">{v.name}</span>
                          {v.tag && <span className="text-xs text-slate-400">· {v.tag}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sm:col-span-2">
                {(() => {
                  const vTypes = Array.isArray(vendorsById[form.vendorId]?.itemTypes) ? vendorsById[form.vendorId].itemTypes.filter((t) => t && t.type) : [];
                  const pickType = (type) => {
                    const match = vTypes.find((t) => t.type === type);
                    setForm((s) => ({ ...s, itemType: type, deliveryWeeks: type && match ? (match.weeks ?? "") : "" }));
                  };
                  return (
                    <>
                      <label className={label}>Type of item {form.itemType && form.deliveryWeeks !== "" && <span className="font-500 normal-case text-slate-400">· est. delivery {form.deliveryWeeks} week{Number(form.deliveryWeeks) === 1 ? "" : "s"}</span>}</label>
                      {!form.vendorId ? (
                        <p className="text-sm text-slate-400">Select a vendor first.</p>
                      ) : vTypes.length === 0 ? (
                        <p className="text-sm text-slate-400">This vendor has no item types yet — add them on the vendor.</p>
                      ) : (
                        <select className={input} value={form.itemType || ""} onChange={(e) => pickType(e.target.value)}>
                          <option value="">— select type —</option>
                          {vTypes.map((t) => (<option key={t.type} value={t.type}>{t.type}{t.weeks !== "" && t.weeks != null ? ` (${t.weeks} wk)` : ""}</option>))}
                        </select>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label className={label}>Model number <span className="text-red-500">*</span></label>
                <input className={input} value={form.modelNumber} onChange={(e) => setForm((s) => ({ ...s, modelNumber: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Name <span className="text-red-500">*</span></label>
                <input className={input} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Price value (SAR)</label>
                <input type="number" min="0" step="0.01" className={input} value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Scope <span className="text-red-500">*</span> <span className="font-400 normal-case text-slate-400">(does this item require installation / programming?)</span></label>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">
                    <input type="checkbox" checked={!!form.needsInstallation} onChange={(e) => setForm((s) => ({ ...s, needsInstallation: e.target.checked }))} className="h-4 w-4 accent-brand-600" />
                    Installation
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-600 text-slate-700 dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">
                    <input type="checkbox" checked={!!form.needsProgramming} onChange={(e) => setForm((s) => ({ ...s, needsProgramming: e.target.checked }))} className="h-4 w-4 accent-brand-600" />
                    Programming
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Description <span className="font-400 normal-case text-slate-400">(rich text — shown in quotations)</span></label>
                <RichTextField field={{ name: "description" }} value={form.description} onChange={(html) => setForm((s) => ({ ...s, description: html }))} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Product image <span className="font-400 normal-case text-slate-400">(shown in quotations)</span></label>
                <ImageField field={{ maxKB: 1024 }} value={form.image} onChange={(url) => setForm((s) => ({ ...s, image: url }))} />
              </div>
              {[{ key: "dataSheet", label: "Data Sheet" }, { key: "manual", label: "User Manual" }].map((f) => (
                <div key={f.key}>
                  <label className={label}>{f.label} <span className="font-400 normal-case text-slate-400">(PDF or image, max 5 MB)</span></label>
                  {form[f.key] ? (
                    <div className="flex items-center gap-2">
                      <a href={form[f.key]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-4 w-4" /> View {f.label.toLowerCase()}</a>
                      <button type="button" onClick={() => setForm((s) => ({ ...s, [f.key]: "" }))} className="text-xs text-red-600 hover:underline dark:text-red-400">Remove</button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-white/15">
                      <Icon name="plus" className="h-4 w-4" /> {uploadingField === f.key ? "Uploading…" : `Upload ${f.label.toLowerCase()}`}
                      <input type="file" accept="application/pdf,image/*" className="hidden" disabled={!!uploadingField} onChange={(e) => uploadDoc(f.key, e)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
