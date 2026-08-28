"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tasksDict } from "@/shared/studio/tasks";
import RecordLink from "@/components/studio2/RecordLink";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { linkToProject, linkToQuotation, linkIf } from "@/modules/main/studioLinks";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { StatusPill } from "@/components/studio2/StatusPill";

const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// Task-board status colours now live in the shared StatusPill map (kind "task").
const PRIORITY_TONE = {
  Urgent: "text-rose-600 dark:text-rose-400",
  High: "text-amber-600 dark:text-amber-400",
};

const fmt = (iso) => (iso ? fmtDate(iso) : "");

// TASKS. Managers run the board; everyone else gets on with their own work —
// moving a task assigned to them and ticking its checklist.
// `view` is the ACTIVE SUB-SECTION key. Tasks keeps its LIST on the parent —
// in the Old System the Tasks nav item is the list itself — and Task settings
// is its only sub-section.
export default function StudioTasks({ slug, view = "tasks" }) {
  const tr = tasksDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/tasks`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessTasksStudio); return; }
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
    if (!res.ok) { setError(tr.onlyManagerCanChange); return false; }
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
        out.error === "read-only" ? tr.onlyManagerCanCreate
        : out.error === "forbidden" ? tr.canOnlyChangeTasks
        : out.error === "forbidden-field" ? tr.canMoveTaskTick
        : out.error === "title" ? tr.giveTaskTitle
        : out.error === "not-yours" ? tr.decisionBelongsWhoeverHolds
        : out.error === "authority" ? tr.authorityIsnPartTask
        : out.error === "not-approval" ? tr.taskIsnApproval
        : out.error === "typed-immutable" ? tr.taskDecisionSystemRaised
        : out.error === "cooldown" ? `An approval was just withdrawn — try again in ${Math.ceil((out.waitMs || 0) / 60000)} min.`
        : tr.didnSave
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
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingTasks}</p>;

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
          {[[tr.open, summary.open, ""],
            [tr.needsYourDecision, summary.awaitingMe, summary.awaitingMe > 0 ? "text-brand-700 dark:text-brand-300" : ""],
            [tr.overdue2, summary.overdue, summary.overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""],
            [tr.unassigned2, summary.unassigned, summary.unassigned > 0 ? "text-amber-600 dark:text-amber-400" : ""]].map(([name, value, tone]) => (
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
            {summary.stuck} {summary.stuck === 1 ? tr.task : tr.tasks} waiting on an authority nobody has been
            appointed to{nav?.["tasks-settings"] ? <> — <a href={`/${slug}/tasks-settings`} className="font-600 underline">{tr.appointSomeoneTaskSettings}</a></> : tr.adminCanAppoint}.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {filters.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${filter === k ? "bg-[var(--geex-surface)] text-brand-950 shadow-sm dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canManage && !drafting && !editing && <button className={btn} onClick={() => setDrafting(true)}>{tr.newTask}</button>}
          {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.tasksOnly}</span>}
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
        <Empty title={filter === "mine" ? tr.nothingAssigned : filter === "overdue" ? tr.nothingOverdue : filter === "done" ? tr.nothingFinishedYet : tr.noOpenTasks}
          body={canManage ? tr.createTaskAssignSomeone : tr.tasksAssignedWillAppear} />
      ) : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {shown.map((t) => (
              <TaskRow key={t.id} task={t} canManage={canManage} canDelete={data.canDelete} canOpenProject={data.canOpenProject}
                people={people} slugForProject={slug} onOpened={load} meId={me.collaboratorId} busy={busy}
                slug={slug} nav={nav} statuses={vocabulary.statuses} typeLabels={vocabulary.typeLabels || {}}
                onEdit={() => setEditing(t)} onSend={send} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task: t, canManage, canDelete, canOpenProject, people, slugForProject, onOpened, meId, busy, slug, nav, statuses, typeLabels, onEdit, onSend }) {
  const tr = tasksDict(useStudioLocale());
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
            <StatusPill kind="task" status={t.status} />
            {t.priority !== "Normal" && <span className={`text-xs font-700 ${PRIORITY_TONE[t.priority] || "text-slate-400"}`}>{t.priority}</span>}
            {t.projectNumber && (
              <RecordLink href={linkIf(nav?.projects, linkToProject(slug, t.projectId))} title={tr.openProject}>{t.projectNumber}</RecordLink>
            )}
            {/* WHAT IS BEING DECIDED. An approval names a quotation in its
                title and had no way to reach it — so answering "should I
                approve this?" meant finding the document by hand in another
                module. The number is READ BACK through quotationId, never
                stored here, so a renumbered document still links correctly. */}
            {t.quotationNumber && (
              <RecordLink href={linkIf(nav?.technical, linkToQuotation(slug, t.quotationId))}
                title={tr.openQuotationBeingDecided}>{t.quotationNumber}</RecordLink>
            )}
            {t.overdue && <span className="text-xs font-700 text-rose-600 dark:text-rose-400">{tr.overdue}</span>}
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
                      ? `Approved by ${a.byAlias || "someone"}${a.at ? ` on ${fmtDateTime(a.at)}` : ""}`
                      : a.orphaned
                        ? tr.nobodyAppointedAuthorityYet
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

          {/* THE NEXT STEP AFTER AN APPROVAL. A signed-off quotation is work
              the studio has agreed to do, so this is where it becomes a
              project — named to a handler, carrying the ticket, the RFQ and
              the quotation as KEYS, with its sheet drawn up from what was
              quoted. The project number stays blank until Finance issues it
              against the client's PO. */}
          {t.type === "approval" && t.approvalState?.complete && canOpenProject && t.quotationId && (
            <OpenProject task={t} people={people} slug={slugForProject} onOpened={onOpened} />
          )}

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {typed
              ? <>{meta?.label || t.type}{t.approvalState && <> · {t.approvalState.approved} of {t.approvalState.required} approved</>}</>
              : t.assigneeAlias
                ? <>{t.assigneeAlias}{t.mine && <span className="text-slate-400"> (you)</span>}</>
                : <span className="text-amber-600 dark:text-amber-400">{tr.unassigned}</span>}
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
          {!typed && canManage && <button className={btnGhost} onClick={onEdit}>{tr.edit}</button>}
          {!typed && canDelete && (
            <button className={btnDanger} disabled={busy} onClick={() => onSend("DELETE", { id: t.id })}>{tr.delete}</button>
          )}
        </div>
      </div>
    </li>
  );
}

function TaskForm({ task, people, projects, vocab, busy, typeAuthorities, authorities, onCancel, onSave }) {
  const tr = tasksDict(useStudioLocale());
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
  // NOT `ck${length + 1}`. Removing an item shortens the list, so the next one
  // added reuses an id that is still in use — and ticking one of the pair ticks
  // both, because the server flips by id.
  const newItem = (text) => ({ id: `ck_${Math.random().toString(36).slice(2, 10)}`, text, done: false });

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{task ? tr.editTask : tr.newTask}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.title} required value={form.title}
          onChange={(v) => setForm((f) => ({ ...f, title: v }))} className="sm:col-span-2 lg:col-span-3" />
        <div className="sm:col-span-2 lg:col-span-3">
          {/* An ordinary task is assigned to a person. A typed one is routed to
              whoever holds its authorities in Task settings, so the assignee
              picker below stops applying. The empty (blank) choice is the
              ordinary task; the hint line below spells that out. */}
          <Field label={tr.kind} as="select" value={form.type} disabled={!!task}
            hint={!form.type && !task ? tr.blankOrdinaryTaskAssigned : undefined}
            onChange={(v) => setForm((f) => ({ ...f, type: v, assigneeCollaboratorId: "" }))}
            options={Object.entries(vocab.typeLabels || {}).map(([code, meta]) => ({ value: code, label: meta.label }))} />
          {form.type ? (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {vocab.typeLabels?.[form.type]?.hint} Routed to:{" "}
              {(typeAuthorities[form.type] || [])
                .map((c) => authorities.find((a) => a.code === c)?.label || c).join(" and ")}.
            </p>
          ) : (
            task && <p className="mt-1 text-[11px] text-slate-400">{tr.kindFixed}</p>
          )}
        </div>
        {!form.type && (
        <Field label={tr.assign} as="select" value={form.assigneeCollaboratorId}
          onChange={(v) => setForm((f) => ({ ...f, assigneeCollaboratorId: v }))}
          options={people.map((p) => ({ value: p.id, label: p.alias }))} />
        )}
        <Field label={tr.project} as="select" value={form.projectId}
          onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: p.number }))} />
        <Field label={tr.priority} as="select" required value={form.priority}
          onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={vocab.priorities} />
        <Field label={tr.dueDate} filled={!!form.dueDate}>
          <StudioDate value={form.dueDate} onChange={(iso) => setForm((f) => ({ ...f, dueDate: iso }))} />
        </Field>
        <Field label={tr.description} as="textarea" value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))} className="sm:col-span-2 lg:col-span-3" />
      </div>

      <div className="mt-5">
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
        <div className="flex flex-wrap items-start gap-2">
          <Field label={tr.checklist} className="flex-1" value={item}
            onChange={(val) => setItem(val)}
            inputProps={{
              onKeyDown: (e) => {
                if (e.key === "Enter" && item.trim()) {
                  e.preventDefault();
                  setChecklist((l) => [...l, newItem(item.trim())]);
                  setItem("");
                }
              },
            }} />
          <button className={btnGhost} disabled={!item.trim()}
            onClick={() => { setChecklist((l) => [...l, newItem(item.trim())]); setItem(""); }}>
            Add
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.title.trim()} onClick={() => onSave({ ...form, checklist })}>
          {busy ? tr.saving : tr.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
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
  const tr = tasksDict(useStudioLocale());
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

  const names = people.filter((p) => selected.includes(p.id)).map((p) => p.alias || tr.member);
  const summary = names.length === 0 ? tr.nobodyAppointed
    : names.length <= 2 ? names.join(", ")
    : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;

  return (
    <div ref={box} className="relative">
      <button type="button" disabled={disabled || people.length === 0}
        aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-start text-sm transition-colors disabled:opacity-60 ${names.length === 0
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          : "border-slate-200 bg-[var(--geex-surface)] text-slate-900 hover:border-brand-500 dark:border-white/15 dark:text-white"}`}>
        <span className="truncate">{people.length === 0 ? tr.nobodyStudioYet : summary}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-[var(--geex-surface)] p-1 shadow-lg dark:border-white/15">
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
                <span className="truncate">{p.alias || tr.member}</span>
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
  const tr = tasksDict(useStudioLocale());
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
        <h2 className={h2}>{tr.taskSettings}</h2>
        <p className={sub}>
          Every kind of task the studio raises, and who decides it. Appointing someone routes the matching
          tasks to them straight away, existing ones included — assignment is read from here on every load,
          never copied onto the task, so it can never keep pointing at whoever used to hold the job.
        </p>
        {canManage && (
          <div className="mt-5 flex items-center gap-3">
            <button className={btn} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSave(map); setBusy(false); setSaved(!!ok); }}>
              {busy ? tr.saving2 : tr.saveTaskSettings}
            </button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
          </div>
        )}
        {!canManage && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessTask}</p>
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
                {codes.length === 1 ? tr.oneAuthoritySigns : `${codes.length} authorities must sign`}
              </span>
            </div>
            {meta.hint && <p className={sub}>{meta.hint}</p>}

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className={label}>{tr.whereComes}</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-300">{meta.from || tr.raisedOnBoard}</dd>
              </div>
              <div>
                <dt className={label}>{tr.whoHandles}</dt>
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

// Turn an approved quotation into a project, from the task that approved it.
//
// The handler is asked for HERE rather than defaulted, because "who runs this
// job" is a decision somebody makes at this moment and the only person who can
// is whoever is looking at the approval. Everything else the project needs — the
// ticket, the client, the value, the lineage — is already reachable through the
// quotation, so it is never asked for and never retyped.
function OpenProject({ task, people, slug, onOpened }) {
  const tr = tasksDict(useStudioLocale());
  const [handler, setHandler] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  if (done) {
    return (
      <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
        Project opened{done.sheets?.length ? ` with its ${done.sheets.length} sheets` : ""}. Its number stays blank until Finance issues one against the PO.
      </p>
    );
  }

  async function open() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/projects`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotationId: task.quotationId, managerCollaboratorId: handler }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "already" ? tr.projectAlreadyOpenedQuotation
        : out.error === "not-approved" ? tr.quotationNotApproved
        : out.error === "forbidden" ? tr.canOpenProjects
        : tr.didnGoThrough,
      );
      return;
    }
    setDone(out);
    onOpened?.();
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <p className="text-xs font-600 text-slate-700 dark:text-slate-200">{tr.approvedOpenProject}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select className={`${input} w-auto`} value={handler} aria-label={tr.projectHandler}
          onChange={(e) => setHandler(e.target.value)}>
          <option value="">{tr.projectHandler2}</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
        </select>
        <button className={btn} disabled={busy || !handler} onClick={open}>
          {busy ? tr.opening : tr.createProjectSheet}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
