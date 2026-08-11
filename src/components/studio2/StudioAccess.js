"use client";

import { useCallback, useEffect, useState } from "react";

// Who can open which sections. A grid of people × sections with two toggles per
// cell: View (can open it) and Manage (can change things in it). Manage implies
// View, so ticking Manage ticks View too.
//
// Default is DENY — a newly approved person sees nothing until granted, which is
// why this screen exists.

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";

export default function StudioAccess({ slug }) {
  const [data, setData] = useState(null);
  const [busyCell, setBusyCell] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/grants`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have permission to manage access here."); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const has = (collaboratorId, sectionId, action) =>
    (data?.grants || []).some(
      (g) => g.subjectId === collaboratorId && g.sectionId === sectionId && g.action === action && g.effect === "allow"
    );

  async function toggle(collaboratorId, sectionId, action, enabled) {
    const cell = `${collaboratorId}:${sectionId}:${action}`;
    setBusyCell(cell); setError("");
    const res = await fetch(`/api/studios/${slug}/grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId, sectionId, action, enabled }),
    });
    setBusyCell("");
    if (!res.ok) { setError("We couldn't save that change."); return; }
    const { grants } = await res.json();
    setData((d) => ({ ...d, grants }));
  }

  // Ticking Manage grants View as well, so the section is actually reachable.
  async function setManage(collaboratorId, sectionId, enabled) {
    if (enabled && !has(collaboratorId, sectionId, "view")) {
      await toggle(collaboratorId, sectionId, "view", true);
    }
    await toggle(collaboratorId, sectionId, "manage", enabled);
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading access…</p>;

  const editable = data.collaborators.filter((c) => !c.alwaysFullAccess);
  const fullAccess = data.collaborators.filter((c) => c.alwaysFullAccess);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <section className={panel}>
        <h2 className={h2}>Section access</h2>
        <p className={sub}>
          People see nothing until you grant it. <b>View</b> lets them open a section; <b>Manage</b> also lets them change things in it.
        </p>

        {editable.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Everyone in this studio is an owner or admin, so they already see every section.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="pb-3 pe-4 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Section</th>
                  {editable.map((c) => (
                    <th key={c.id} className="px-3 pb-3 text-center">
                      <span className="block font-600 text-slate-900 dark:text-white">{c.alias || "Unnamed"}</span>
                      <span className="block text-[11px] font-400 text-slate-400">{c.role}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sections.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="py-3 pe-4 font-600 text-slate-700 dark:text-slate-200">{s.name}</td>
                    {editable.map((c) => {
                      const view = has(c.id, s.id, "view");
                      const manage = has(c.id, s.id, "manage");
                      const busy = busyCell.startsWith(`${c.id}:${s.id}:`);
                      return (
                        <td key={c.id} className="px-3 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <input
                                type="checkbox" checked={view} disabled={busy}
                                onChange={(e) => toggle(c.id, s.id, "view", e.target.checked)}
                                className="h-4 w-4 cursor-pointer accent-brand-600"
                                aria-label={`${c.alias || "member"} can view ${s.name}`}
                              />
                              View
                            </label>
                            <label className={`inline-flex items-center gap-1.5 text-xs ${view ? "cursor-pointer text-slate-500 dark:text-slate-400" : "cursor-pointer text-slate-400"}`}>
                              <input
                                type="checkbox" checked={manage} disabled={busy}
                                onChange={(e) => setManage(c.id, s.id, e.target.checked)}
                                className="h-4 w-4 cursor-pointer accent-brand-600"
                                aria-label={`${c.alias || "member"} can manage ${s.name}`}
                              />
                              Manage
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {fullAccess.length > 0 && (
        <section className={panel}>
          <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">Always full access</h3>
          <p className={sub}>Owners and admins can open every section — that isn't adjustable here.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {fullAccess.map((c) => (
              <li key={c.id} className="rounded-full bg-brand-500/10 px-3 py-1.5 text-sm font-600 text-brand-700 dark:text-brand-300">
                {c.alias || "Unnamed"} · {c.role === "owner" ? "owner" : "admin"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
