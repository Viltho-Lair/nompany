"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RecordLink from "@/components/studio2/RecordLink";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { linkToProject, linkIf } from "@/lib/studioLinks";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

const STATUS_TONE = {
  Open: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "In progress": "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Blocked: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};
const PRIORITY_TONE = {
  Urgent: "text-rose-600 dark:text-rose-400",
  High: "text-amber-600 dark:text-amber-400",
};

const fmt = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "");

// TASKS. Managers run the board; everyone else gets on with their own work —
// moving a task assigned to them and ticking its checklist.
// `view` is the ACTIVE SUB-SECTION key. Tasks keeps its LIST on the parent —
// in the Old System the Tasks nav item is the list itself — and Task settings
// is its only sub-section.
export default function StudioTasks({ slug, view = "tasks" }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/tasks`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Tasks in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Someone else moved a task on this board — pick it up without a refresh.
  useLiveUpdates(slug, "tasks", load);

  const saveSettings = useCallback(async (payload) => {
    setError("");
    const res = await fetch(`/api/studios/${slug}/tasks/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) { setError("Only a manager can change task settings."); return false; }
    await load();
    return true;
  }, [slug, load]);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/tasks`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "read-only" ? "Only a manager can create or assign tasks."
        : out.error === "forbidden" ? "You can only change tasks assigned to you."
        : out.error === "forbidden-field" ? "You can move your task and tick its checklist — the rest is the manager's to change."
        : out.error === "title" ? "Give the task a title."
        : "That didn't save."
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  const shown = useMemo(() => {
    if (!data) return [];
    if (filter === "mine") return data.tasks.filter((t) => t.mine && t.status !== "Done");
    if (filter === "done") return data.tasks.filter((t) => t.status === "Done");
    if (filter === "overdue") return data.tasks.filter((t) => t.overdue);
    return data.tasks.filter((t) => t.status !== "Done");
  }, [data, filter]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Tasks…</p>;

  const { canManage, tasks, people, projects, summary, vocabulary, nav, me } = data;

  const filters = [
    ["open", `Open (${summary.open})`],
    ["mine", `Mine (${summary.mine})`],
    ["overdue", `Overdue (${summary.overdue})`],
    ["done", `Done (${summary.done})`],
  ];

  if (view === "tasks-settings") {
    return (
      <div className="space-y-6">
        <TaskSettings
          authorities={data.authorities || []}
          typeAuthorities={data.typeAuthorities || {}}
          assignees={data.taskAssignees || {}}
          people={people}
          canManage={data.canManageSettings}
          onSave={(next) => saveSettings({ taskAssignees: next })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <section className={panel}>
        <div className="flex flex-wrap gap-8">
          {[["Open", summary.open, ""], ["Assigned to you", summary.mine, ""],
            ["Overdue", summary.overdue, summary.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
            ["Unassigned", summary.unassigned, summary.unassigned > 0 ? "text-amber-600 dark:text-amber-400" : ""]].map(([name, value, tone]) => (
            <div key={name}>
              <p className={`font-display text-3xl font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {filters.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${filter === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canManage && !drafting && !editing && <button className={btn} onClick={() => setDrafting(true)}>New task</button>}
          {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">Your tasks only</span>}
        </div>
      </div>

      {(drafting || editing) && (
        <TaskForm task={editing} people={people} projects={projects} vocab={vocabulary} busy={busy}
          onCancel={() => { setDrafting(false); setEditing(null); }}
          onSave={async (v) => {
            const okd = await send(editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v);
            if (okd) { setDrafting(false); setEditing(null); }
          }} />
      )}

      {shown.length === 0 ? (
        <Empty title={filter === "mine" ? "Nothing assigned to you" : filter === "overdue" ? "Nothing overdue" : filter === "done" ? "Nothing finished yet" : "No open tasks"}
          body={canManage ? "Create a task and assign it to someone in this studio." : "Tasks assigned to you will appear here."} />
      ) : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {shown.map((t) => (
              <TaskRow key={t.id} task={t} canManage={canManage} meId={me.collaboratorId} busy={busy}
                slug={slug} nav={nav} statuses={vocabulary.statuses}
                onEdit={() => setEditing(t)} onSend={send} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task: t, canManage, meId, busy, slug, nav, statuses, onEdit, onSend }) {
  const [open, setOpen] = useState(false);
  // The assignee can act even without Manage — that is the whole point.
  const canAct = canManage || t.assigneeCollaboratorId === meId;

  // Send WHICH item was ticked, not the whole list — the server flips it against
  // the current row, so fast clicks can't overwrite each other with stale copies.
  const toggleItem = (itemId) => onSend("PUT", { id: t.id, toggle: itemId });

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_TONE[t.status]}`}>{t.status}</span>
            {t.priority !== "Normal" && <span className={`text-xs font-700 ${PRIORITY_TONE[t.priority] || "text-slate-400"}`}>{t.priority}</span>}
            {t.projectNumber && (
              <RecordLink href={linkIf(nav?.projects, linkToProject(slug, t.projectId))} title="Open the project">{t.projectNumber}</RecordLink>
            )}
            {t.overdue && <span className="text-xs font-700 text-rose-600 dark:text-rose-400">Overdue</span>}
          </div>

          <p className="mt-1 font-600 text-slate-900 dark:text-white">
            {t.title}
            {t.progress !== null && <span className="ms-2 text-xs font-400 text-slate-400">{t.progress}%</span>}
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.assigneeAlias ? <>{t.assigneeAlias}{t.mine && <span className="text-slate-400"> (you)</span>}</> : <span className="text-amber-600 dark:text-amber-400">Unassigned</span>}
            {t.dueDate && <> · due {fmt(t.dueDate)}</>}
            {(t.description || (t.checklist || []).length > 0) && (
              <button type="button" className="ms-2 text-brand-700 hover:underline dark:text-brand-300" onClick={() => setOpen(!open)}>
                {open ? "less" : "more"}
              </button>
            )}
          </p>

          {open && (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
              {t.description && <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{t.description}</p>}
              {(t.checklist || []).length > 0 && (
                <ul className={`space-y-1.5 ${t.description ? "mt-3" : ""}`}>
                  {t.checklist.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        {/* Deliberately NOT disabled while a save is in flight: a
                            burst of ticks used to be swallowed, because the first
                            one disabled the rest before they registered. The
                            server applies each tick to the live row, so letting
                            them all through is now the correct thing to do. */}
                        <input type="checkbox" checked={c.done} disabled={!canAct}
                          onChange={() => toggleItem(c.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-[#191921]" />
                        <span className={c.done ? "line-through text-slate-400" : ""}>{c.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAct && (
            <select className={`${input} w-auto`} value={t.status} disabled={busy}
              onChange={(e) => onSend("PUT", { id: t.id, status: e.target.value })}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {canManage && (
            <>
              <button className={btnGhost} onClick={onEdit}>Edit</button>
              <button className={btnDanger} disabled={busy} onClick={() => onSend("DELETE", { id: t.id })}>Delete</button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function TaskForm({ task, people, projects, vocab, busy, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assigneeCollaboratorId: task?.assigneeCollaboratorId || "",
    projectId: task?.projectId || "",
    priority: task?.priority || "Normal",
    dueDate: task?.dueDate || "",
  });
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [item, setItem] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{task ? "Edit task" : "New task"}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Title <span className="text-rose-500">*</span></label>
          <input className={input} value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className={label}>Assign to</label>
          <select className={input} value={form.assigneeCollaboratorId} onChange={set("assigneeCollaboratorId")}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Project</label>
          <select className={input} value={form.projectId} onChange={set("projectId")}>
            <option value="">— none —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Priority</label>
          <select className={input} value={form.priority} onChange={set("priority")}>
            {vocab.priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Due date</label>
          <input type="date" className={input} value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Description</label>
          <textarea rows={3} className={input} value={form.description} onChange={set("description")} />
        </div>
      </div>

      <div className="mt-5">
        <label className={label}>Checklist</label>
        {checklist.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {checklist.map((c, i) => (
              <li key={c.id || i} className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span>{c.text}</span>
                <button className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                  onClick={() => setChecklist((l) => l.filter((_, n) => n !== i))}>remove</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <input className={`${input} flex-1`} value={item} placeholder="Add a step…"
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && item.trim()) {
                e.preventDefault();
                setChecklist((l) => [...l, { id: `ck${l.length + 1}`, text: item.trim(), done: false }]);
                setItem("");
              }
            }} />
          <button className={btnGhost} disabled={!item.trim()}
            onClick={() => { setChecklist((l) => [...l, { id: `ck${l.length + 1}`, text: item.trim(), done: false }]); setItem(""); }}>
            Add
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.title.trim()} onClick={() => onSave({ ...form, checklist })}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}


// Task settings: who holds each authority. A task TYPE routes to one or more
// authorities, and two-party types need both to complete — so this screen shows
// which types each authority is on rather than leaving that implicit.
function TaskSettings({ authorities, typeAuthorities, assignees, people, canManage, onSave }) {
  const [map, setMap] = useState(assignees);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (code, id) => {
    setSaved(false);
    setMap((m) => {
      const cur = m[code] || [];
      return { ...m, [code]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  };
  const typesFor = (code) => Object.entries(typeAuthorities).filter(([, cs]) => cs.includes(code)).map(([t]) => t);

  return (
    <section className={panel}>
      <h2 className={h2}>Task settings</h2>
      <p className={sub}>
        Who holds each authority. Appointing someone routes the matching tasks to them straight away,
        existing ones included — assignment is read from here, not copied onto the task.
      </p>
      <div className="mt-4 space-y-3">
        {authorities.map((a) => {
          const types = typesFor(a.code);
          return (
            <div key={a.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{a.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {types.length ? types.join(", ") : "no task types"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {people.length === 0 && <span className="text-xs text-slate-400">Nobody in this studio yet.</span>}
                {people.map((p) => {
                  const on = (map[a.code] || []).includes(p.id);
                  return (
                    <button key={p.id} type="button" disabled={!canManage} onClick={() => toggle(a.code, p.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                        ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                        : "bg-slate-200/60 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400"}`}>
                      {p.alias || "Member"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {canManage ? (
        <div className="mt-5 flex items-center gap-3">
          <button className={btn} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSave(map); setBusy(false); setSaved(!!ok); }}>
            {busy ? "Saving..." : "Save task settings"}
          </button>
          {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You have view-only access to Task settings.</p>
      )}
    </section>
  );
}
