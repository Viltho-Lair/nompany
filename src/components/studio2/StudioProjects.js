"use client";

import { useCallback, useEffect, useState } from "react";

// Projects: delivery work opened from an approved quotation. Progress comes from
// the milestone checklist, so the bar and the stage can never disagree with what
// has actually been ticked off.

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const STAGE_TONE = {
  Received: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "In Progress": "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "On Hold": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};
const money = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(Number(n) || 0);

export default function StudioProjects({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState(null); // expanded project

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Projects in this studio."); return; }
    const next = await res.json();
    setData(next);
    setOpen((cur) => (cur ? next.projects.find((p) => p.id === cur.id) || null : null));
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  async function send(method, payload) {
    setError("");
    const res = await fetch(`/api/studios/${slug}/projects`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "read-only" ? "You have view-only access to Projects."
        : out.error === "not-approved" ? "That quotation hasn't been approved yet."
        : out.error === "already" ? "A project already exists for that quotation."
        : "That didn't save."
      );
      return false;
    }
    setOpening(false);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Projects…</p>;

  const { canManage, projects, approvedQuotations, people, vocabulary } = data;
  const aliasOf = Object.fromEntries(people.map((p) => [p.id, p.alias]));

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2}>Projects ({projects.length})</h2>
        {canManage ? (
          <button className={btn} onClick={() => setOpening(true)} disabled={approvedQuotations.length === 0}
            title={approvedQuotations.length === 0 ? "Approve a quotation first" : undefined}>
            Open project
          </button>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>
        )}
      </div>

      {opening && (
        <OpenProject quotations={approvedQuotations} people={people} onCancel={() => setOpening(false)}
          onSave={(p) => send("POST", p)} />
      )}

      {projects.length === 0 ? (
        <Empty
          title="No projects yet"
          body={approvedQuotations.length === 0
            ? "Projects open from an approved quotation. Approve one in Technical and it'll appear here."
            : "You have approved quotations ready — open one as a project to start delivering."}
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} expanded={open?.id === p.id} canManage={canManage}
              stages={vocabulary.stages} people={people} aliasOf={aliasOf}
              onToggle={() => setOpen(open?.id === p.id ? null : p)}
              onSave={(patch) => send("PUT", { id: p.id, ...patch })}
              onDelete={() => send("DELETE", { id: p.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, expanded, canManage, stages, people, aliasOf, onToggle, onSave, onDelete }) {
  const [milestones, setMilestones] = useState(p.milestones || []);
  useEffect(() => { setMilestones(p.milestones || []); }, [p.milestones]);

  function toggleMilestone(id) {
    const next = milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
    setMilestones(next);
    onSave({ milestones: next });
  }

  return (
    <section className={panel}>
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center justify-between gap-3 text-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{p.number}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STAGE_TONE[p.stage] || STAGE_TONE.Received}`}>{p.stage}</span>
          </div>
          <p className="mt-1 font-display text-base font-700 text-slate-900 dark:text-white">{p.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {p.clientName || "—"} · {money(p.value)}
            {p.managerCollaboratorId ? ` · ${aliasOf[p.managerCollaboratorId] || "unassigned"}` : ""}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Progress</span><span className="tabular-nums font-600">{p.progress}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-slate-100 pt-5 dark:border-white/5">
          {/* lineage — the chain this project came from */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-600 uppercase tracking-wide">From</span>
            {[p.ticketId && "Ticket", p.rfqId && "RFQ", p.quotationNumber].filter(Boolean).map((x, i, arr) => (
              <span key={x + i} className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono dark:bg-white/5">{x}</span>
                {i < arr.length - 1 && <span aria-hidden="true">→</span>}
              </span>
            ))}
          </div>

          <div>
            <p className={label}>Milestones</p>
            <ul className="space-y-1.5">
              {milestones.map((m) => (
                <li key={m.id}>
                  <label className={`flex items-center gap-2.5 text-sm ${canManage ? "cursor-pointer" : ""} text-slate-700 dark:text-slate-200`}>
                    <input type="checkbox" checked={!!m.done} disabled={!canManage}
                      onChange={() => toggleMilestone(m.id)} className="h-4 w-4 cursor-pointer accent-brand-600" />
                    <span className={m.done ? "line-through opacity-60" : ""}>{m.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Ticking every milestone marks the project Completed.</p>
          </div>

          {canManage && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Stage</label>
                <select className={input} value={p.stage} onChange={(e) => onSave({ stage: e.target.value })}>
                  {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Manager</label>
                <select className={input} value={p.managerCollaboratorId || ""} onChange={(e) => onSave({ managerCollaboratorId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {people.map((x) => <option key={x.id} value={x.id}>{x.alias}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Target end</label>
                <input type="date" className={input} defaultValue={p.endDate || ""} onBlur={(e) => onSave({ endDate: e.target.value })} />
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex justify-end">
              <button className={btnGhost} onClick={onDelete}>Delete project</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function OpenProject({ quotations, people, onSave, onCancel }) {
  const [quotationId, setQuotationId] = useState(quotations[0]?.id || "");
  const [managerCollaboratorId, setManager] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = quotations.find((q) => q.id === quotationId);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h2 className={h2}>Open a project</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only approved quotations can become projects.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Approved quotation</label>
          <select className={input} value={quotationId} onChange={(e) => setQuotationId(e.target.value)}>
            {quotations.map((q) => <option key={q.id} value={q.id}>{q.number} — {q.title}</option>)}
          </select>
          {chosen && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{chosen.clientName} · {money(chosen.total)}</p>}
        </div>
        <div>
          <label className={label}>Project manager</label>
          <select className={input} value={managerCollaboratorId} onChange={(e) => setManager(e.target.value)}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !quotationId} onClick={async () => { setBusy(true); await onSave({ quotationId, managerCollaboratorId }); setBusy(false); }}>
          {busy ? "Opening…" : "Open project"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}
