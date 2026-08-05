"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { NOTIFICATION_KINDS, wantsKind } from "@/lib/notifications";

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/settings", { cache: "no-store" });
      const data = res.ok ? await res.json() : { prefs: {} };
      setPrefs(data.prefs || {});
    } catch { setError("Could not load your settings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (key) => { setPrefs((p) => ({ ...p, [key]: !wantsKind(p, key) })); setSaved(false); };

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/notifications/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefs }) });
      if (!res.ok) throw new Error("Save failed.");
      setPrefs((await res.json()).prefs || {});
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Choose which notifications you receive. These are your own settings — they don&apos;t affect anyone else.</p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          {NOTIFICATION_KINDS.map((k) => {
            const on = wantsKind(prefs, k.key);
            return (
              <div key={k.key} className="flex items-center justify-between gap-4 border-b border-slate-50 px-5 py-4 last:border-0 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"><Icon name={k.icon} className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-600 text-slate-800 dark:text-slate-100">{k.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{k.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(k.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-300 dark:bg-white/15"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={saving || loading} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        {saved && <span className="text-sm font-600 text-emerald-600 dark:text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}
