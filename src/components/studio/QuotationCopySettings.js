"use client";

import { useEffect, useState } from "react";
import { canSeeAllIn, TECHNICAL_TAG } from "@/lib/authConstants";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const TYPES = ["Residential", "Commercial"];

export default function QuotationCopySettings() {
  const [copy, setCopy] = useState(null);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    (async () => {
      try {
        const [c, meJson] = await Promise.all([
          fetch("/api/quotation-copy", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/users/me", { cache: "no-store" }).then((r) => r.json()),
        ]);
        setCopy(c);
        setMe(meJson?.user || null);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  const canEdit = canSeeAllIn(me, TECHNICAL_TAG);
  const setField = (type, field) => (e) => setCopy((s) => ({ ...s, [type]: { ...s[type], [field]: e.target.value } }));

  async function save() {
    setStatus("saving");
    try {
      const payload = {};
      for (const t of TYPES) payload[t] = { intro: copy[t]?.intro || "", summary: copy[t]?.summary || "" };
      const res = await fetch("/api/quotation-copy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!copy) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">Quotation cover copy</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The Introduction and Summary printed on the quotation cover, per building type. Leave a field blank to use the default wording.
          {!canEdit && " You need the Technical + Leader tags (or admin) to edit these."}
        </p>
      </div>

      {TYPES.map((t) => (
        <section key={t} className={card}>
          <h2 className="mb-4 font-display text-base font-700 text-slate-900 dark:text-white">{t}</h2>
          <div className="space-y-4">
            <div>
              <label className={label}>Introduction</label>
              <textarea rows={4} disabled={!canEdit} className={`${input} resize-y`} value={copy[t]?.intro || ""} onChange={setField(t, "intro")} placeholder={copy[t]?.placeholder?.intro || ""} />
            </div>
            <div>
              <label className={label}>Summary</label>
              <textarea rows={4} disabled={!canEdit} className={`${input} resize-y`} value={copy[t]?.summary || ""} onChange={setField(t, "summary")} placeholder={copy[t]?.placeholder?.summary || ""} />
            </div>
          </div>
        </section>
      ))}

      {canEdit && (
        <div className="sticky bottom-4 flex items-center gap-4">
          <button onClick={save} disabled={status === "saving"} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-3 font-display text-sm font-600 text-white shadow-lg transition-colors hover:bg-brand-950 disabled:opacity-60">
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
          {status === "error" && <span className="text-sm font-600 text-red-600 dark:text-red-400">Could not save.</span>}
        </div>
      )}
    </div>
  );
}
