"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        : out.error === "not-yours" ? "That decision belongs to whoever holds that authority."
        : out.error === "authority" ? "That authority isn't part of this task."
        : out.error === "not-approval" ? "That task isn't an approval."
        : out.error === "typed-immutable" ? "That task is a decision the system raised — it can't be edited or deleted. Withdraw the approval instead."
        : out.error === "cooldown" ? `An approval was just withdrawn — try again in ${Math.ceil((out.waitMs || 0) / 60000)} min.`
        : "That didn't save."
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  const shown = useMemo(() => {
    if (!data) return [];
    if (filter === "awaiting") {
      // Decisions genuinely waiting on this person — not merely visible to them.
      return data.tasks.filter((t) => t.status !== "Done" && (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved));
    }
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
    // Decisions waiting on you lead, because that is what this screen is for
    // once approval tasks are flowing through it.
    ["awaiting", `Needs you (${summary.awaitingMe})`],
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
          typeLabels={vocabulary.typeLabels || {}}
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
          {[["Open", summary.open, ""],
            ["Needs your decision", summary.awaitingMe, summary.awaitingMe > 0 ? "text-brand-700 dark:text-brand-300" : ""],
            ["Overdue", summary.overdue, summary.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
            ["Unassigned", summary.unassigned, summary.unassigned > 0 ? "text-amber-600 dark:text-amber-400" : ""]].map(([name, value, tone]) => (
            <div key={name}>
              <p className={`font-display text-3xl font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
            </div>
          ))}
        </div>
        {/* A typed task routed to an authority nobody holds can never finish,
            and only Task settings can unstick it — so it is named here rather
            than left to be discovered. */}
        {summary.stuck > 0 && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {summary.stuck} {summary.stuck === 1 ? "task is" : "tasks are"} waiting on an authority nobody has been
            appointed to{nav?.["tasks-settings"] ? <> — <a href={`/${slug}/tasks-settings`} className="font-600 underline">appoint someone in Task settings</a></> : " — an admin can appoint someone in Task settings"}.
          </p>
        )}
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
          typeAuthorities={data.typeAuthorities || {}} authorities={data.authorities || []}
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
              <TaskRow key={t.id} task={t} canManage={canManage} canDelete={data.canDelete} meId={me.collaboratorId} busy={busy}
                slug={slug} nav={nav} statuses={vocabulary.statuses} typeLabels={vocabulary.typeLabels || {}}
                onEdit={() => setEditing(t)} onSend={send} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task: t, canManage, canDelete, meId, busy, slug, nav, statuses, typeLabels, onEdit, onSend }) {
  const [open, setOpen] = useState(false);
  // The assignee can act even without Manage — that is the whole point.
  const canAct = canManage || t.assigneeCollaboratorId === meId;
  // A TYPED task is a decision, not a to-do: it is not moved along by hand or
  // ticked off, it is approved by whoever holds each authority.
  const typed = (t.authorityStates || []).length > 0;
  const meta = typeLabels[t.type];

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

          {/* Who is being waited on. Each authority shows its own state, so a
              half-approved task reads as half-approved rather than just
              "pending" — and the button is only offered to the person who
              actually holds that authority. */}
          {typed && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {t.authorityStates.map((a) => {
                const mine = (t.myAuthorities || []).includes(a.code);
                const canDecide = mine || canManage;
                return (
                  <span key={a.code}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-600 ${a.approved
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : a.orphaned
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}
                    title={a.approved
                      ? `Approved by ${a.byAlias || "someone"}${a.at ? ` on ${new Date(a.at).toLocaleString("en-GB")}` : ""}`
                      : a.orphaned
                        ? "Nobody is appointed to this authority yet"
                        : `Waiting on ${a.holders.join(", ") || "nobody"}`}>
                    {a.approved ? "✓" : a.orphaned ? "!" : "•"} {a.label}
                    {canDecide && !busy && (
                      <button type="button"
                        className="ms-1 font-700 underline underline-offset-2"
                        onClick={() => onSend("PUT", { id: t.id, authority: a.code, approved: !a.approved })}>
                        {a.approved ? "withdraw" : "approve"}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {typed
              ? <>{meta?.label || t.type}{t.approvalState && <> · {t.approvalState.approved} of {t.approvalState.required} approved</>}</>
              : t.assigneeAlias
                ? <>{t.assigneeAlias}{t.mine && <span className="text-slate-400"> (you)</span>}</>
                : <span className="text-amber-600 dark:text-amber-400">Unassigned</span>}
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
          {/* A typed task's status follows its approvals, so offering a status
              picker would let somebody claim it is Done while an authority has
              not signed. */}
          {canAct && !typed && (
            <select className={`${input} w-auto`} value={t.status} disabled={busy}
              onChange={(e) => onSend("PUT", { id: t.id, status: e.target.value })}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {/* NEITHER BUTTON IS OFFERED ON A TYPED TASK. It is a decision the
              product raised, not a to-do somebody wrote: editing it would
              change what the approvers are agreeing to, and deleting it would
              destroy the record of who signed while the quotation stays
              approved. Withdrawing an approval is the way back.

              Delete asks about DELETE rather than about `canManage`, which is
              true for anybody holding any write — so a Member or Team Lead used
              to be shown a button that always came back "That didn't save." */}
          {!typed && canManage && <button className={btnGhost} onClick={onEdit}>Edit</button>}
          {!typed && canDelete && (
            <button className={btnDanger} disabled={busy} onClick={() => onSend("DELETE", { id: t.id })}>Delete</button>
          )}
        </div>
      </div>
    </li>
  );
}

function TaskForm({ task, people, projects, vocab, busy, typeAuthorities, authorities, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    type: task?.type || "",
    description: task?.description || "",
    assigneeCollaboratorId: task?.assigneeCollaboratorId || "",
    projectId: task?.projectId || "",
    priority: task?.priority || "Normal",
    dueDate: task?.dueDate || "",
  });
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [item, setItem] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // NOT `ck${length + 1}`. Removing an item shortens the list, so the next one
  // added reuses an id that is still in use — and ticking one of the pair ticks
  // both, because the server flips by id.
  const newItem = (text) => ({ id: `ck_${Math.random().toString(36).slice(2, 10)}`, text, done: false });

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{task ? "Edit task" : "New task"}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Title <span className="text-rose-500">*</span></label>
          <input className={input} value={form.title} onChange={set("title")} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Kind</label>
          {/* An ordinary task is assigned to a person. A typed one is routed to
              whoever holds its authorities in Task settings, so the assignee
              picker below stops applying. */}
          <select className={input} value={form.type} disabled={!!task}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, assigneeCollaboratorId: "" }))}>
            <option value="">Ordinary task — assigned to a person</option>
            {Object.entries(vocab.typeLabels || {}).map(([code, meta]) => (
              <option key={code} value={code}>{meta.label}</option>
            ))}
          </select>
          {form.type ? (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {vocab.typeLabels?.[form.type]?.hint} Routed to:{" "}
              {(typeAuthorities[form.type] || [])
                .map((c) => authorities.find((a) => a.code === c)?.label || c).join(" and ")}.
            </p>
          ) : (
            task && <p className="mt-1 text-[11px] text-slate-400">A task&apos;s kind is fixed once it exists.</p>
          )}
        </div>
        {!form.type && (
        <div>
          <label className={label}>Assign to</label>
          <select className={input} value={form.assigneeCollaboratorId} onChange={set("assigneeCollaboratorId")}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
        )}
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
                setChecklist((l) => [...l, newItem(item.trim())]);
                setItem("");
              }
            }} />
          <button className={btnGhost} disabled={!item.trim()}
            onClick={() => { setChecklist((l) => [...l, newItem(item.trim())]); setItem(""); }}>
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


// A DROPDOWN, not a row of tags. Appointing to an authority is picking people
// out of a list that is as long as the studio is, and a wall of pills for every
// authority on every task made the screen unreadable at twenty collaborators
// and unusable at fifty.
//
// Multi-select, because an authority can be held by more than one person — any
// one of them can then sign for it. The button says who currently holds it, so
// the answer is legible with the list shut, which is how it is nearly always
// read.
function AssigneePicker({ people, selected, disabled, onToggle }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  // Shut on a click anywhere else and on Escape — a panel that can only be
  // closed by pressing the button that opened it is a trap on a screen with
  // several of them side by side.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const names = people.filter((p) => selected.includes(p.id)).map((p) => p.alias || "Member");
  const summary = names.length === 0 ? "Nobody appointed"
    : names.length <= 2 ? names.join(", ")
    : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;

  return (
    <div ref={box} className="relative">
      <button type="button" disabled={disabled || people.length === 0}
        aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-start text-sm transition-colors disabled:opacity-60 ${names.length === 0
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-slate-200 bg-white text-slate-900 hover:border-brand-500 dark:border-white/15 dark:bg-[#20202c] dark:text-white"}`}>
        <span className="truncate">{people.length === 0 ? "Nobody in this studio yet" : summary}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
          {people.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button key={p.id} type="button" role="option" aria-selected={on}
                onClick={() => onToggle(p.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-700 ${on
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 dark:border-white/25"}`}>
                  {on ? "✓" : ""}
                </span>
                <span className="truncate">{p.alias || "Member"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// TASK SETTINGS — ONE BOX PER TASK, not one per authority.
//
// It used to list the six authorities and, under each, every collaborator as a
// tag to switch on. That is the storage shape, not the question anybody comes
// here with: somebody opening this screen is looking at a KIND OF TASK — a
// quotation approval, a material PO — and asking who should be deciding it.
// Answering that meant knowing which authorities the type routes to before
// looking anything up, which is exactly what the screen should have been saying.
//
// So each box is a task: what it is, where it comes from, who handles it, and a
// dropdown for each authority it actually requires.
//
// WHAT IS STORED IS STILL PER AUTHORITY. Management decides quotation approvals
// AND POs, so appointing them under one shows up under the other — that is one
// appointment, not two, and the box says so rather than letting it look like a
// bug the first time it happens.
function TaskSettings({ authorities, typeAuthorities, typeLabels, assignees, people, canManage, onSave }) {
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
  const labelOf = (code) => authorities.find((a) => a.code === code)?.label || code;
  // The OTHER tasks one appointment reaches, so a shared authority reads as
  // shared at the moment somebody appoints to it.
  const alsoDecides = (code, type) => Object.entries(typeAuthorities)
    .filter(([t, cs]) => t !== type && cs.includes(code))
    .map(([t]) => typeLabels[t]?.label || t);

  const types = Object.keys(typeAuthorities);

  return (
    <div className="space-y-4">
      <section className={panel}>
        <h2 className={h2}>Task settings</h2>
        <p className={sub}>
          Every kind of task the studio raises, and who decides it. Appointing someone routes the matching
          tasks to them straight away, existing ones included — assignment is read from here on every load,
          never copied onto the task, so it can never keep pointing at whoever used to hold the job.
        </p>
        {canManage && (
          <div className="mt-5 flex items-center gap-3">
            <button className={btn} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSave(map); setBusy(false); setSaved(!!ok); }}>
              {busy ? "Saving..." : "Save task settings"}
            </button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
          </div>
        )}
        {!canManage && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You have view-only access to Task settings.</p>
        )}
      </section>

      {types.map((type) => {
        const meta = typeLabels[type] || {};
        const codes = typeAuthorities[type] || [];
        const unheld = codes.filter((c) => (map[c] || []).length === 0);
        return (
          <section key={type} className={panel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-800 text-slate-900 dark:text-white">{meta.label || type}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                {codes.length === 1 ? "One authority signs" : `${codes.length} authorities must sign`}
              </span>
            </div>
            {meta.hint && <p className={sub}>{meta.hint}</p>}

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className={label}>Where it comes from</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-300">{meta.from || "Raised on the Tasks board."}</dd>
              </div>
              <div>
                <dt className={label}>Who handles it</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-300">{meta.handling || codes.map(labelOf).join(" and ")}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {codes.map((code) => {
                const shared = alsoDecides(code, type);
                return (
                  <div key={code}>
                    <label className={label}>{labelOf(code)}</label>
                    <AssigneePicker
                      people={people}
                      selected={map[code] || []}
                      disabled={!canManage}
                      onToggle={(id) => toggle(code, id)}
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {shared.length > 0
                        ? <>Also decides {shared.join(", ")} — one appointment covers all of them.</>
                        : <>Only this task routes to {labelOf(code)}.</>}
                    </p>
                  </div>
                );
              })}
            </div>

            {unheld.length > 0 && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                Nobody holds {unheld.map(labelOf).join(" or ")}, so a {(meta.label || type).toLowerCase()} raised
                today can never be approved. Appoint someone above.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
