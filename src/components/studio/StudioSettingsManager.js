"use client";

import { useEffect, useState } from "react";
import { settingsSchema } from "@/lib/adminSchemas";
import ImageField from "@/components/studio/ImageField";
import { Icon } from "@/components/studio/icons";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#223358] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#223358]";

export default function StudioSettingsManager() {
  const [values, setValues] = useState(null);
  const [status, setStatus] = useState("loading");
  // Which container (settings group) is open in the right pane.
  const [active, setActive] = useState(settingsSchema[0]?.group || "");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        setValues(await res.json());
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!values) return <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>;

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  const setValue = (name) => (v) => setValues((s) => ({ ...s, [name]: v }));

  const section = settingsSchema.find((s) => s.group === active) || settingsSchema[0];

  return (
    <div className="-mb-8 flex h-[calc(100vh-5rem)] min-h-[520px] flex-col gap-4">
      <div className="shrink-0">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">Main Website content</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick a container on the left to edit the content it holds on the public website.</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-5">
        {/* Section selection (left) — fixed, unaffected by the fields scroll */}
        <nav className="w-60 shrink-0 overflow-y-auto rounded-geex border border-slate-200/70 bg-white p-2 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <ul className="space-y-0.5">
            {settingsSchema.map((s) => {
              const on = s.group === section.group;
              return (
                <li key={s.group}>
                  <button
                    type="button"
                    onClick={() => setActive(s.group)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-start text-sm font-600 transition-colors ${on ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}
                  >
                    <span>{s.group}</span>
                    {on && <Icon name="arrowRight" className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Fields pane (right) — only this area scrolls; Save is pinned below */}
        <section className="flex min-h-0 flex-1 flex-col rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h2 className="mb-1 font-display text-base font-700 text-slate-900 dark:text-white">{section.group}</h2>
            {section.hint ? (
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{section.hint}</p>
            ) : <div className="mb-5" />}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((f) => {
                const rtl = f.name.endsWith("_ar");
                const inputId = `settings-${f.name}`;
                const placeholder = f.placeholder || f.label;
                return (
                  <div key={f.name} className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}>
                    <label htmlFor={inputId} className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{f.label}</label>
                    {f.type === "image" ? (
                      <ImageField field={f} value={values[f.name]} onChange={setValue(f.name)} />
                    ) : f.type === "textarea" ? (
                      <textarea id={inputId} name={f.name} placeholder={placeholder} rows={3} dir={rtl ? "rtl" : undefined} className={`${input} resize-y`} value={values[f.name] || ""} onChange={set(f.name)} />
                    ) : (
                      <input id={inputId} name={f.name} placeholder={placeholder} dir={rtl ? "rtl" : "ltr"} className={input} value={values[f.name] || ""} onChange={set(f.name)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save changes — fixed footer, always visible */}
          <div className="flex shrink-0 items-center gap-4 border-t border-slate-100 px-6 py-4 dark:border-white/10">
            <button
              onClick={save}
              disabled={status === "saving"}
              className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-3 font-display text-sm font-600 text-white shadow-lg transition-colors hover:bg-brand-950 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save changes"}
            </button>
            {status === "saved" && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
            {status === "error" && <span className="text-sm font-600 text-red-600 dark:text-red-400">Could not save.</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
