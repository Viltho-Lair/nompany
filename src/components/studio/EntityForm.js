"use client";

import { useEffect, useState } from "react";
import ImageField from "@/components/studio/ImageField";
import RichTextField from "@/components/studio/RichTextField";
import DateInput from "@/components/studio/DateInput";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function blank(f) {
  if (f.type === "badge-multi") return [];
  if (f.default !== undefined) return f.default;
  return "";
}

function Control({ field, value, onChange, dynRows }) {
  const rtl = field.name.endsWith("_ar");
  if (field.type === "image") return <ImageField field={field} value={value} onChange={onChange} />;
  if (field.type === "richtext") return <RichTextField field={field} value={value} onChange={onChange} />;
  if (field.type === "textarea") {
    return <textarea rows={3} dir={rtl ? "rtl" : undefined} className={`${input} resize-y`} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "date") {
    return <DateInput className={input} value={value || ""} onChange={onChange} />;
  }
  if (field.type === "number") {
    return <input type="number" min={field.min ?? 0} className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "ref-select") {
    const rows = (dynRows && dynRows[field.optionsFrom]) || [];
    return (
      <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r[field.labelEn] || r[field.labelAr] || "—"}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "badge-multi") {
    const rows = (dynRows && dynRows[field.optionsFrom]) || [];
    const selected = Array.isArray(value) ? value : [];
    const max = field.max || Infinity;
    const toggle = (id) => {
      if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
      else if (selected.length < max) onChange([...selected, id]);
    };
    if (rows.length === 0) return <p className="text-sm text-slate-400 dark:text-slate-500">No options yet.</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              type="button"
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-500 transition-colors ${
                on
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              {r[field.labelEn] || r[field.labelAr] || "—"}
            </button>
          );
        })}
      </div>
    );
  }
  if (field.type === "select" || field.type === "select-dynamic") {
    let options = field.type === "select-dynamic"
      ? ((dynRows && dynRows[field.optionsFrom]) || []).map((r) => r[field.optionLabel] || r.title_en || r.id)
      : (field.options || []);
    if (value && !options.includes(value)) options = [value, ...options];
    return (
      <select className={input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
      </select>
    );
  }
  return <input type="text" dir={rtl ? "rtl" : "ltr"} className={input} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

// Modal create/edit form for a collection, driven by its schema. `fields` lets a
// caller show a subset (defaults to all schema fields). `hidden` fields still
// render via the normal type controls unless excluded here.
export default function EntityForm({ title, collection, schema, initial, fields, onClose, onSaved }) {
  const shownFields = (fields || schema.fields).map((f) => (typeof f === "string" ? schema.fields.find((x) => x.name === f) : f)).filter(Boolean);
  const [values, setValues] = useState(() => {
    const v = {};
    shownFields.forEach((f) => (v[f.name] = initial?.[f.name] ?? blank(f)));
    return v;
  });
  const [dynRows, setDynRows] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const refs = shownFields.filter((f) => f.type === "ref-select" || f.type === "badge-multi" || f.type === "select-dynamic");
    if (refs.length === 0) return;
    let alive = true;
    (async () => {
      const result = {};
      for (const f of refs) {
        if (result[f.optionsFrom]) continue;
        try {
          const rows = await fetch(`/api/${f.optionsFrom}`, { cache: "no-store" }).then((r) => r.json());
          result[f.optionsFrom] = Array.isArray(rows) ? rows : [];
        } catch {
          result[f.optionsFrom] = [];
        }
      }
      if (alive) setDynRows(result);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/${collection}/${initial.id}` : `/api/${collection}`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error();
      onSaved && (await onSaved());
      onClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {shownFields.map((f) => (
            <div key={f.name} className={f.type === "textarea" || f.type === "richtext" || f.type === "badge-multi" || f.type === "image" ? "sm:col-span-2" : ""}>
              <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{f.label}</label>
              <Control field={f} value={values[f.name]} dynRows={dynRows} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
            </div>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          <button onClick={save} className={btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
