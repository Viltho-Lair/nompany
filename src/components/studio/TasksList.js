"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import { alertDialog } from "@/lib/appDialog";
import { bothApproved } from "@/lib/tasks";
import { ADMIN_TAG } from "@/lib/authConstants";
import TaskSettingsModal from "@/components/studio/TaskSettingsModal";

const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950";
const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function fmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); } }

function statusOf(t) {
  if (t.done) return { label: "Done", cls: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" };
  if (t.sentToProjects) return { label: "Sent to Projects", cls: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" };
  if (bothApproved(t)) return { label: "Approved", cls: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" };
  return { label: "Pending", cls: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" };
}

export default function TasksList() {
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tRes, meRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
      ]);
      setRows(tRes.ok ? await tRes.json() : []);
      setMe((await meRes.json())?.user || null);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load tasks.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const isAdmin = Array.isArray(me?.tags) && me.tags.includes(ADMIN_TAG);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New and pending tasks assigned to you.</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className={btnGhost}>
              <Icon name="gear" className="h-4 w-4" /> Task settings
            </button>
            <button onClick={() => alertDialog({ title: "Create task", message: "Manual task creation is coming soon." })} className={btnPrimary}>
              <Icon name="plus" className="h-4 w-4" /> Create task
            </button>
          </div>
        )}
      </div>

      {showSettings && <TaskSettingsModal onClose={() => setShowSettings(false)} />}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No tasks assigned to you.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Task</th>
                  <th className="px-5 py-3.5 text-start font-600">Status</th>
                  <th className="px-5 py-3.5 text-start font-600">Date created</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const st = statusOf(t);
                  return (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                        {t.name}
                        {t.clientName && <span className="ms-1 text-xs font-400 text-slate-400">· {t.clientName}</span>}
                      </td>
                      <td className="px-5 py-3.5"><span className={`rounded-full px-2 py-0.5 text-xs font-600 ${st.cls}`}>{st.label}</span></td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{fmtDateTime(t.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end">
                          <a href={`/studio/tasks/${t.id}`} title="Open task" aria-label="Open task" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                            <Icon name="open" className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
