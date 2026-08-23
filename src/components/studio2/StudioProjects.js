"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { StudioDataGridSkeleton } from "@/components/studio2/StudioDataGrid.skeleton";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import ProjectsDashboard from "@/components/studio2/ProjectsDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  money, fmtDate, Dialog, Toolbar, Empty,
} from "@/components/studio2/ui";
import { linkToTicket, linkToRfq, linkToQuotation, linkIf } from "@/modules/main/studioLinks";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import {
  slaVisits, emergencyVisits, nextVisit, contractEndDate, supportStatus,
  fmtDate as slaDate, daysUntil,
} from "@/modules/projects/sla";
import { REQUIREMENT_WEIGHTS, hoursBetween } from "@/modules/projects/projectSchedule";

// Projects: delivery work opened from an approved quotation, the support
// contracts that follow it, and the overtime logged against it. Progress comes
// from the milestone checklist, so the bar and the stage can never disagree with
// what has actually been ticked off. The chrome comes from studio2/ui.

// Project-stage colours now live in the shared StatusPill map (kind "project").
const rnd = (n) => Math.round((Number(n) || 0) * 100) / 100;

function SupportTag({ project }) {
  const s = supportStatus(project);
  if (!s.known) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">Support not set</span>;
  if (s.inSupport) return <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-600 text-white">Support: {s.daysRemaining}d left</span>;
  return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-600 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">Support ended</span>;
}

// The project list is a Data Grid now — sortable columns and client-side paging
// come from the grid itself, so the hand-rolled SortHeader it replaced is gone.
// Loaded in its own async chunk (never folded into Projects' initial bundle) —
// see StudioDataGrid's header. The skeleton reserves the exact box for nine
// columns while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={9} pageSize={10} ariaLabel="Loading projects" />,
});

// `view` is the ACTIVE SUB-SECTION key, so each sub-section is its own screen:
//   projects            -> the dashboard: the board, the counts, the next visits
//   projects-list       -> the project list and its detail
//   projects-sla        -> support contracts and their visit schedules
//   projects-overtimes  -> hours logged outside the plan
//   projects-settings   -> requirement weights, default OT department, stages
export default function StudioProjects({ slug, view = "projects" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const focus = useFocusedRecord("project");
  const level = useAnalyticsLevel();

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Projects in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Project rows move from several desks at once — stay current.
  useLiveUpdates(slug, "projects", load);
  // A quotation being approved is what makes a new project openable.
  useLiveUpdates(slug, "technical", load);

  // `kind` is the sub-path: "" for the section itself, "sla", "overtimes".
  const send = useCallback(async (kind, method, payload) => {
    setError("");
    const url = kind ? `/api/studios/${slug}/projects/${kind}` : `/api/studios/${slug}/projects`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "read-only" ? "You have view-only access to this part of Projects."
        : out.error === "not-approved" ? "That quotation hasn't been approved yet."
        : out.error === "already" ? "A project already exists for that quotation."
        : out.error === "title" ? "Give it a name."
        : out.error === "startDate" ? "A start date is required — the visit schedule is counted from it."
        : out.error === "emergency-cap" ? `This contract allows ${out.cap} emergency visit${out.cap === 1 ? "" : "s"}.`
        : out.error === "project" ? "Pick a project."
        : out.error === "date" ? "Pick a date."
        : out.error === "times" ? "The end time must be after the start time."
        : out.error === "people" ? "Pick at least one person."
        : "That didn't save."
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Projects…</p>;

  const {
    canManage: canManageParent,
    canManageList, canManageSla, canManageOvertimes, canManageSettings,
    projects, approvedQuotations, people, slas, overtimes, directory, settings, vocabulary, nav,
  } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN — here by the canManageX flag
  // handed to each screen below, one per sub-section, each resolved from that
  // sub-section's own key. That is the same answer `manage[view]` gives, so
  // this module needs no combined flag of its own and deliberately has none:
  // a bare `canManage` in this scope is exactly the parent's answer standing in
  // for all of them, which is the thing that was wrong in the first place.
  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "projects-sla") {
    return (
      <div className="space-y-6">
        {banner}
        <Slas slas={slas} projects={projects} canManage={canManageSla}
          onSave={(method, payload) => send("sla", method, payload)} />
      </div>
    );
  }

  if (view === "projects-overtimes") {
    return (
      <div className="space-y-6">
        {banner}
        <Overtimes overtimes={overtimes} projects={projects} directory={directory}
          defaultDepartmentId={settings.overtimeDefaultDepartmentId} canManage={canManageOvertimes}
          onSave={(method, payload) => send("overtimes", method, payload)} />
      </div>
    );
  }

  if (view === "projects-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <ProjectsSettings settings={settings} departments={directory.departments} stages={vocabulary.stages}
          canManage={canManageSettings} onSave={(patch) => send("", "PATCH", patch)} />
      </div>
    );
  }

  if (view === "projects-list") {
    return (
      <div className="space-y-6">
        {banner}
        <ProjectList projects={projects} approvedQuotations={approvedQuotations} people={people}
          stages={vocabulary.stages} canManage={canManageList} slug={slug} nav={nav} focus={focus}
          onOpen={(p) => send("", "POST", p)}
          onSave={(id, patch) => send("", "PUT", { id, ...patch })}
          onDelete={(id) => send("", "DELETE", { id })} />
      </div>
    );
  }

  // Parent section: the Projects dashboard — every project's value and stage
  // at once, so it answers to projects.dashboard.view of its own.
  return (
    <div className="space-y-6">
      {banner}
      {data.canViewDashboard === false
        ? <Empty title="The dashboard isn't yours to see" body="This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar." />
        : <ProjectsDashboard projects={projects} slas={slas} overtimes={overtimes} people={people} level={level} slug={slug} nav={nav} />}
    </div>
  );
}

// ---- project list ----------------------------------------------------------

function ProjectList({ projects, approvedQuotations, people, stages, canManage, slug, nav, focus, onOpen, onSave, onDelete }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const closeOpen = useCallback(() => setOpening(false), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  // A deep link lands ON the project rather than at the top of the list.
  useEffect(() => {
    if (!focus.focusedId) return;
    const hit = projects.find((p) => p.id === focus.focusedId);
    if (hit) setDetail(hit);
  }, [focus.focusedId, projects]);
  // Keep the open dialog showing the freshly loaded row after a save.
  useEffect(() => {
    setDetail((cur) => (cur ? projects.find((p) => p.id === cur.id) || null : null));
  }, [projects]);

  // Search only — sorting is the Data Grid's now, so the hand-rolled comparator
  // this useMemo used to carry (numeric for value/progress, string otherwise) is
  // gone: the grid sorts each column by its `field`, with `type: "number"` on the
  // two figures so they sort by magnitude rather than lexically.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? projects.filter((p) => `${p.title || ""} ${p.number || ""} ${p.clientName || ""} ${p.location || ""}`.toLowerCase().includes(q))
      : projects;
  }, [projects, query]);

  return (
    <>
      <Toolbar canManage={canManage} label="Open project" onAdd={() => setOpening(true)}>
        {projects.length > 0 && (
          <input type="search" className={`${input} sm:max-w-xs`} aria-label="Search title, number, client or location"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </Toolbar>

      {opening && (
        <Dialog title="Open a project" description="Only approved quotations can become projects." onClose={closeOpen}>
          <OpenProject quotations={approvedQuotations} people={people} onCancel={closeOpen}
            onSave={async (p) => { const ok = await onOpen(p); if (ok) setOpening(false); return ok; }} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={`${detail.number} · ${detail.title}`} description={detail.clientName || undefined}
          onClose={closeDetail} width="max-w-[820px]">
          <ProjectDetail project={detail} people={people} stages={stages} canManage={canManage}
            aliasOf={aliasOf} slug={slug} nav={nav}
            onSave={(patch) => onSave(detail.id, patch)}
            onDelete={async () => { const ok = await onDelete(detail.id); if (ok) setDetail(null); }}
            onClose={closeDetail} />
        </Dialog>
      )}

      {projects.length === 0 ? (
        <Empty
          title="No projects yet"
          body={approvedQuotations.length === 0
            ? "Projects open from an approved quotation. Approve one in Technical and it'll appear here."
            : "You have approved quotations ready — open one as a project to start delivering."}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} of {projects.length} project{projects.length === 1 ? "" : "s"}.</p>
          <section className={panel}>
            {/* A Data Grid now — sortable columns, client-side paging — reproducing
                the list column for column: the mono number (or the amber "no
                number yet" badge until Finance issues one), title, client,
                location, the shared StatusPill for the stage, value tabular via
                tabular-nums, the same progress bar, the target-end date through
                fmtDate, and an Open action that pushes the project's own page.
                The whole row still opens that page too (onRowClick), the way it
                did before. A project nobody has started (stage Received) keeps its
                amber start-edge stripe — drawn as an inset box-shadow via
                getRowClassName so it costs no layout, reading the --sg-flag colour
                set on the wrapper so it flips in dark mode. The deep-link focus
                still opens the detail dialog (the useEffect above); only the row's
                brief scroll-and-ring, which client paging can't target across
                pages, is not carried over. No column and no behaviour else is. */}
            <StudioDataGrid
              rows={rows}
              getRowId={(r) => r.id}
              ariaLabel="Projects"
              emptyLabel="No projects match that search."
              emptyIcon="briefcase"
              className="[--sg-flag:251_191_36] dark:[--sg-flag:245_158_11]"
              onRowClick={(params) => router.push(`/${slug}/projects-list/${params.id}`)}
              getRowClassName={({ row }) => ((row.stage || "Received") === "Received" ? "sg-flag" : "")}
              sx={{
                "& .MuiDataGrid-row": { cursor: "pointer" },
                "& .MuiDataGrid-row.sg-flag": { boxShadow: "inset 4px 0 0 rgb(var(--sg-flag))" },
              }}
              columns={[
                {
                  field: "number", headerName: "Number", minWidth: 120, flex: 0.7,
                  renderCell: ({ row }) => (row.number
                    ? <span className="num text-xs text-slate-500 dark:text-slate-400">{row.number}</span>
                    : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">no number yet</span>),
                },
                {
                  field: "title", headerName: "Title", minWidth: 180, flex: 1.3,
                  renderCell: ({ row }) => <span className="font-600 text-slate-900 dark:text-white">{row.title}</span>,
                },
                {
                  field: "clientName", headerName: "Client", minWidth: 140, flex: 1,
                  renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.clientName || "—"}</span>,
                },
                {
                  field: "location", headerName: "Location", minWidth: 120, flex: 0.8,
                  renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.location || "—"}</span>,
                },
                {
                  field: "stage", headerName: "Stage", minWidth: 120, flex: 0.7,
                  renderCell: ({ row }) => <StatusPill kind="project" status={row.stage} />,
                },
                {
                  field: "value", headerName: "Value", type: "number", minWidth: 110, flex: 0.7,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.value)}</span>,
                },
                {
                  field: "progress", headerName: "Progress", type: "number", minWidth: 140, flex: 0.8,
                  renderCell: ({ row }) => (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <span className="block h-full rounded-full bg-brand-600" style={{ width: `${row.progress}%` }} />
                      </span>
                      <span className="num text-xs text-slate-500 dark:text-slate-400">{row.progress}%</span>
                    </span>
                  ),
                },
                {
                  field: "endDate", headerName: "Target end", minWidth: 130, flex: 0.8,
                  renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.endDate)}</span>,
                },
                {
                  field: "actions", headerName: "", minWidth: 90, flex: 0.5, sortable: false,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => (
                    <button type="button" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
                      onClick={(e) => { e.stopPropagation(); router.push(`/${slug}/projects-list/${row.id}`); }}>
                      Open
                    </button>
                  ),
                },
              ]}
            />
          </section>
        </>
      )}
    </>
  );
}

function OpenProject({ quotations, people, onSave, onCancel }) {
  const [quotationId, setQuotationId] = useState(quotations[0]?.id || "");
  const [managerCollaboratorId, setManager] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = quotations.find((q) => q.id === quotationId);

  if (quotations.length === 0) {
    return (
      <>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          There are no approved quotations waiting. Approve one in Technical and it will be selectable here.
        </p>
        <div className="mt-5"><button className={btnGhost} onClick={onCancel}>Close</button></div>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Approved quotation" as="select" required
          value={quotationId} onChange={(v) => setQuotationId(v)}
          options={quotations.map((q) => ({ value: q.id, label: `${q.number} — ${q.title}` }))}
          hint={chosen ? `${chosen.clientName} · ${money(chosen.total)}` : undefined} />
        <Field label="Project manager" as="select" value={managerCollaboratorId}
          onChange={(v) => setManager(v)}
          options={people.map((p) => ({ value: p.id, label: p.alias }))} />
        <Field label="Location" value={location} onChange={(v) => setLocation(v)} hint="Site or city" />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !quotationId} onClick={async () => {
          setBusy(true);
          await onSave({ quotationId, managerCollaboratorId, location });
          setBusy(false);
        }}>{busy ? "Opening…" : "Open project"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function ProjectDetail({ project: p, people, stages, canManage, aliasOf, slug, nav, onSave, onDelete, onClose }) {
  const [milestones, setMilestones] = useState(p.milestones || []);
  useEffect(() => { setMilestones(p.milestones || []); }, [p.milestones]);
  const support = supportStatus(p);

  function toggleMilestone(id) {
    const next = milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
    setMilestones(next);
    onSave({ milestones: next });
  }

  return (
    <>
      {/* Lineage — the chain this project came from. */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-600 uppercase tracking-wide">From</span>
        {[
          p.ticketId && { label: "Ticket", href: linkIf(nav?.sales, linkToTicket(slug, p.ticketId)) },
          p.rfqId && { label: "RFQ", href: linkIf(nav?.["technical-rfq"], linkToRfq(slug, p.rfqId)) },
          p.quotationNumber && { label: p.quotationNumber, href: linkIf(nav?.["technical-quotations"], linkToQuotation(slug, p.quotationId)) },
        ].filter(Boolean).map((step, i, arr) => (
          <span key={step.label + i} className="flex items-center gap-2">
            <RecordLink href={step.href} title={`Open ${step.label}`}>{step.label}</RecordLink>
            {i < arr.length - 1 && <span aria-hidden="true">→</span>}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div><label className={label}>Client</label><input className={inputRO} value={p.clientName || "—"} readOnly /></div>
        <div><label className={label}>Value</label><input className={inputRO} value={money(p.value)} readOnly /></div>
        <div>
          <label className={label}>Support</label>
          <div className={`${inputRO} flex items-center`}><SupportTag project={p} /></div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-600 uppercase tracking-wide">Progress</span>
          <span className="font-600 tabular-nums">{p.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${p.progress}%` }} />
        </div>
      </div>

      <div className="mt-5">
        <p className={microLabel}>Milestones</p>
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
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
            <label className={label}>Location</label>
            <input className={input} defaultValue={p.location || ""} onBlur={(e) => onSave({ location: e.target.value })} />
          </div>
          <div>
            <label className={label}>Start</label>
            <input type="date" className={input} defaultValue={p.startDate || ""} onBlur={(e) => onSave({ startDate: e.target.value })} />
          </div>
          <div>
            <label className={label}>Target end</label>
            <input type="date" className={input} defaultValue={p.endDate || ""} onBlur={(e) => onSave({ endDate: e.target.value })} />
          </div>
          <div>
            <label className={label}>Support period (days)</label>
            <input type="number" min="0" className={input} defaultValue={p.supportPeriodDays ?? 365} onBlur={(e) => onSave({ supportPeriodDays: e.target.value })} />
            {support.known && <p className="mt-1 text-[11px] text-slate-400">Runs to {slaDate(support.supportEnd)}.</p>}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {canManage
          ? <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>Delete project</button>
          : <span />}
        <button className={btnGhost} onClick={onClose}>Close</button>
      </div>
    </>
  );
}

// ---- SLA -------------------------------------------------------------------
// A support contract and the visits it owes. The planned schedule is DERIVED
// from the start, duration and count — change any of them and every date moves —
// so only the ticks and the emergency call-outs are stored.
function Slas({ slas, projects, canManage, onSave }) {
  const [form, setForm] = useState(null);   // { row } | { row: null }
  const [detail, setDetail] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const projName = (sla) => projectsById[sla.projectId]?.title || "—";

  // Keep the open visits dialog on the freshly loaded contract after a tick.
  useEffect(() => {
    setDetail((cur) => (cur ? slas.find((s) => s.id === cur.id) || null : null));
  }, [slas]);

  if (slas.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label="Add SLA" onAdd={() => setForm({ row: null })} />
        {form && (
          <Dialog title="Add SLA contract" description="The visit schedule is generated from the start date, duration and visit count." onClose={closeForm}>
            <SlaForm row={null} projects={projects} onCancel={closeForm}
              onSave={async (p) => { const ok = await onSave("POST", p); if (ok) setForm(null); }} />
          </Dialog>
        )}
        <Empty title="No SLA contracts yet" body="A contract covers a delivered project for a period, with a set number of planned visits and an allowance of emergency ones." />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label="Add SLA" onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.title}` : "Add SLA contract"}
          description="The visit schedule is generated from the start date, duration and visit count."
          onClose={closeForm}>
          <SlaForm row={form.row} projects={projects} onCancel={closeForm}
            onSave={async (p) => {
              const ok = await onSave(form.row ? "PUT" : "POST", form.row ? { ...p, id: form.row.id } : p);
              if (ok) setForm(null);
            }} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={detail.title || "SLA contract"} description={`${projName(detail)} · signed ${slaDate(detail.signingDate)}`}
          onClose={closeDetail} width="max-w-[620px]">
          <SlaVisits sla={detail} canManage={canManage} onSave={(patch) => onSave("PUT", { id: detail.id, ...patch })} onClose={closeDetail} />
        </Dialog>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {slas.length} SLA {slas.length === 1 ? "contract" : "contracts"} · ordered by signing date.
      </p>

      <section className={panel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                {["Contract", "Project", "Signed", "Visits", "Closest visit"].map((head) => (
                  <th key={head} className={`${th} ps-2 text-start`}>{head}</th>
                ))}
                <th className={`${th} text-end`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slas.map((sla) => {
                const next = nextVisit(sla);
                const done = (sla.completedVisits || []).length;
                // A contract with visits still owed and none of them upcoming has
                // fallen behind — every remaining visit is in the past.
                const behind = !next && done < (sla.visits || 0);
                return (
                  <tr key={sla.id}
                    className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${behind ? stripeOn : stripeOff}`}>
                    <td className="py-3 pe-3 ps-2 font-600 text-slate-900 dark:text-white">{sla.title || "—"}</td>
                    <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{projName(sla)}</td>
                    <td className="py-3 pe-3 ps-2 text-slate-500 dark:text-slate-400">{slaDate(sla.signingDate)}</td>
                    <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">
                      {done}/{sla.visits || 0}
                      {Number(sla.emergencyVisits) > 0 && (
                        <span className="ms-1.5 text-xs text-amber-600 dark:text-amber-400">
                          +{(sla.emergencyVisitsList || []).length}/{sla.emergencyVisits} SOS
                        </span>
                      )}
                    </td>
                    <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">
                      {next
                        ? <span>{slaDate(next.date)} <span className="ms-1 text-xs font-600 text-brand-700 dark:text-brand-300">({next.daysRemaining}d)</span></span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 text-end">
                      <span className="inline-flex gap-2">
                        <button className={btnGhost} onClick={() => setDetail(sla)}>Visits</button>
                        {canManage && <button className={btnGhost} onClick={() => setForm({ row: sla })}>Edit</button>}
                        {canManage && <button className={btnGhost} onClick={() => onSave("DELETE", { id: sla.id })}>Delete</button>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SlaForm({ row, projects, onSave, onCancel }) {
  const [f, setF] = useState({
    title: row?.title || "",
    projectId: row?.projectId || "",
    signingDate: row?.signingDate || "",
    startDate: row?.startDate || "",
    durationDays: row?.durationDays ?? 365,
    visits: row?.visits ?? 4,
    emergencyVisits: row?.emergencyVisits ?? 0,
    notes: row?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const ready = f.title.trim() && f.startDate;
  // The same maths the contract will use, previewed before it is saved.
  const preview = useMemo(() => slaVisits({ ...f, completedVisits: [] }), [f]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contract name" required value={f.title} onChange={(v) => setF((s) => ({ ...s, title: v }))} />
        <Field label="Project" as="select" value={f.projectId} onChange={(v) => setF((s) => ({ ...s, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        <Field label="Signed" filled={!!f.signingDate}>
          <StudioDate value={f.signingDate} onChange={(iso) => setF((s) => ({ ...s, signingDate: iso }))} />
        </Field>
        <Field label="Starts" required filled={!!f.startDate}>
          <StudioDate value={f.startDate} onChange={(iso) => setF((s) => ({ ...s, startDate: iso }))} />
        </Field>
        <Field label="Duration (days)" type="number" min="1" value={f.durationDays} onChange={(v) => setF((s) => ({ ...s, durationDays: v }))} />
        <Field label="Planned visits" type="number" min="1" value={f.visits} onChange={(v) => setF((s) => ({ ...s, visits: v }))} />
        <Field label="Emergency allowance" type="number" min="0" value={f.emergencyVisits} onChange={(v) => setF((s) => ({ ...s, emergencyVisits: v }))} />
      </div>
      <Field className="mt-4" label="Notes" as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} />

      {preview.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3.5 dark:border-white/15">
          <p className={microLabel}>Schedule</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visits fall on {preview.slice(0, 3).map((v) => slaDate(v.date)).join(", ")}
            {preview.length > 3 ? `… through ${slaDate(preview[preview.length - 1].date)}` : ""}. Changing any of the three fields above reschedules all of them.
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => { setBusy(true); await onSave(f); setBusy(false); }}>
          {busy ? "Saving…" : row ? "Save contract" : "Add contract"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function SlaVisits({ sla, canManage, onSave, onClose }) {
  const [emergencyDate, setEmergencyDate] = useState("");
  const [emergencyError, setEmergencyError] = useState("");
  const planned = slaVisits(sla);
  const emergency = emergencyVisits(sla);
  const cap = Number(sla.emergencyVisits) || 0;
  const end = contractEndDate(sla);

  function toggleVisit(index) {
    const set = new Set(Array.isArray(sla.completedVisits) ? sla.completedVisits : []);
    if (set.has(index)) set.delete(index); else set.add(index);
    onSave({ completedVisits: [...set].sort((a, b) => a - b) });
  }

  function addEmergency() {
    setEmergencyError("");
    if (!emergencyDate) return setEmergencyError("Pick a date first.");
    if (emergency.length >= cap) return setEmergencyError(`This contract allows ${cap} emergency visit${cap === 1 ? "" : "s"}.`);
    if (end && new Date(emergencyDate) > end) return setEmergencyError(`Date must be on or before the contract end (${slaDate(end)}).`);
    if (sla.startDate && new Date(emergencyDate) < new Date(sla.startDate)) {
      return setEmergencyError(`Date must be on or after the contract start (${slaDate(sla.startDate)}).`);
    }
    onSave({
      emergencyVisitsList: [
        ...(sla.emergencyVisitsList || []),
        { id: `ev_${Date.now().toString(36)}`, date: emergencyDate, completed: false },
      ],
    });
    setEmergencyDate("");
  }

  const patchEmergency = (list) => onSave({ emergencyVisitsList: list });

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Starts {slaDate(sla.startDate)} · {sla.durationDays || 365} days · {sla.visits || 0} planned visits
        {end ? ` · ends ${slaDate(end)}` : ""}
      </p>

      <ul className="mt-4 space-y-2">
        {planned.length === 0 && <li className="text-sm text-slate-400">Set a start date, duration and visit count to generate visits.</li>}
        {planned.map((v) => (
          <li key={v.index} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${v.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-200 dark:border-white/10"}`}>
            <label className={`flex min-w-0 flex-1 items-center gap-3 ${canManage ? "cursor-pointer" : ""}`}>
              <input type="checkbox" checked={v.completed} disabled={!canManage} onChange={() => toggleVisit(v.index)}
                className="h-4 w-4 cursor-pointer accent-emerald-600" />
              <span className={`min-w-0 ${v.completed ? "text-emerald-700 line-through dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
                Visit {v.index} · {slaDate(v.date)}
              </span>
            </label>
            <span className={`shrink-0 font-600 ${v.completed ? "text-emerald-700 dark:text-emerald-300" : v.daysRemaining < 0 ? "text-slate-400" : "text-brand-700 dark:text-brand-300"}`}>
              {v.completed ? "completed" : v.daysRemaining < 0 ? "past" : `${v.daysRemaining}d left`}
            </span>
          </li>
        ))}
      </ul>

      {/* Emergency visits — ad hoc, off schedule, bounded by the allowance and
          the contract's own end date. */}
      <div className="mt-6 border-t border-slate-200/70 pt-5 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">Emergency visits</h4>
          <span className="text-xs text-slate-400 dark:text-slate-500">{emergency.length}/{cap} used</span>
        </div>
        {cap === 0 ? (
          <p className="text-sm text-slate-400">This contract has no emergency visits.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {emergency.length === 0 && <li className="text-sm text-slate-400">No emergency visits registered yet.</li>}
              {emergency.map((e) => (
                <li key={e.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${e.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <label className={`flex min-w-0 flex-1 items-center gap-3 ${canManage ? "cursor-pointer" : ""}`}>
                    <input type="checkbox" checked={!!e.completed} disabled={!canManage}
                      onChange={() => patchEmergency((sla.emergencyVisitsList || []).map((x) => (x.id === e.id ? { ...x, completed: !x.completed } : x)))}
                      className="h-4 w-4 cursor-pointer accent-emerald-600" />
                    <span className={`min-w-0 ${e.completed ? "text-emerald-700 line-through dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>
                      Emergency · {slaDate(e.date)}
                    </span>
                  </label>
                  <span className={`shrink-0 font-600 ${e.completed ? "text-emerald-700 dark:text-emerald-300" : e.daysRemaining < 0 ? "text-slate-400" : "text-amber-700 dark:text-amber-300"}`}>
                    {e.completed ? "completed" : e.daysRemaining < 0 ? "past" : `${e.daysRemaining}d left`}
                  </span>
                  {canManage && (
                    <button type="button" className="shrink-0 text-xs font-600 text-rose-600 hover:underline dark:text-rose-400"
                      onClick={() => patchEmergency((sla.emergencyVisitsList || []).filter((x) => x.id !== e.id))}>Remove</button>
                  )}
                </li>
              ))}
            </ul>
            {canManage && emergency.length < cap && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input type="date" className={`${input} sm:max-w-[200px]`} value={emergencyDate}
                  min={sla.startDate || undefined} max={end ? end.toISOString().slice(0, 10) : undefined}
                  onChange={(e) => setEmergencyDate(e.target.value)} />
                <button type="button" className="rounded-full bg-amber-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-amber-700" onClick={addEmergency}>
                  Register emergency visit
                </button>
              </div>
            )}
            {emergencyError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{emergencyError}</p>}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end"><button className={btnGhost} onClick={onClose}>Close</button></div>
    </>
  );
}

// ---- overtime --------------------------------------------------------------
// Two readings of the same records: the MATRIX, which is what a manager wants —
// hours per project per person, with the totals — and the LIST, which is the
// individual entries, where a mistake gets corrected.
function Overtimes({ overtimes, projects, directory, defaultDepartmentId, canManage, onSave }) {
  const [tab, setTab] = useState("matrix");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const closeAdd = useCallback(() => setAdding(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const matrix = useMemo(() => {
    const projectMap = new Map(), personMap = new Map(), cells = {};
    for (const o of overtimes) {
      if (!projectMap.has(o.projectId)) projectMap.set(o.projectId, o.projectName || o.projectId);
      if (!personMap.has(o.collaboratorId)) personMap.set(o.collaboratorId, o.personName || o.collaboratorId);
      const key = `${o.projectId}::${o.collaboratorId}`;
      cells[key] = rnd((cells[key] || 0) + (Number(o.hours) || 0));
    }
    const rows = [...projectMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const cols = [...personMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    const at = (pid, uid) => cells[`${pid}::${uid}`] || 0;
    const rowTotal = (pid) => rnd(cols.reduce((a, c) => a + at(pid, c.id), 0));
    const colTotal = (uid) => rnd(rows.reduce((a, r) => a + at(r.id, uid), 0));
    return { rows, cols, at, rowTotal, colTotal, grand: rnd(rows.reduce((a, r) => a + rowTotal(r.id), 0)) };
  }, [overtimes]);

  // CSV rather than PDF: the matrix is a table of numbers, and a spreadsheet is
  // where those get used. Built here so it costs no dependency and no round trip.
  function exportCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Project", ...matrix.cols.map((c) => c.name), "Total"].map(esc).join(","),
      ...matrix.rows.map((r) => [r.name, ...matrix.cols.map((c) => matrix.at(r.id, c.id)), matrix.rowTotal(r.id)].map(esc).join(",")),
      ["Total", ...matrix.cols.map((c) => matrix.colTotal(c.id)), matrix.grand].map(esc).join(","),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
          {[["matrix", "Matrix"], ["list", "List"]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {lbl}
            </button>
          ))}
        </div>
        {tab === "matrix" && overtimes.length > 0 && (
          <button type="button" className={btnGhost} onClick={exportCsv}>Export CSV</button>
        )}
        <span className="ms-auto">
          {canManage
            ? <button type="button" className={btn} onClick={() => setAdding(true)} disabled={projects.length === 0}
                title={projects.length === 0 ? "Open a project first" : undefined}>Add overtime</button>
            : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
        </span>
      </div>

      {adding && (
        <Dialog title="Add overtime" description="One record is written per person selected." onClose={closeAdd}>
          <AddOvertime projects={projects} directory={directory} defaultDepartmentId={defaultDepartmentId}
            onCancel={closeAdd} onSave={async (p) => { const ok = await onSave("POST", p); if (ok) setAdding(false); }} />
        </Dialog>
      )}
      {editing && (
        <Dialog title="Edit overtime" description={`${editing.personName} · ${fmtDate(editing.date)}`} onClose={closeEdit} width="max-w-[560px]">
          <EditOvertime record={editing} projects={projects} directory={directory} onCancel={closeEdit}
            onSave={async (p) => { const ok = await onSave("PUT", { id: editing.id, ...p }); if (ok) setEditing(null); }}
            onDelete={async () => { const ok = await onSave("DELETE", { id: editing.id }); if (ok) setEditing(null); }} />
        </Dialog>
      )}

      {overtimes.length === 0 ? (
        <Empty title="No overtime recorded yet" body="Log the hours worked on a project outside the plan. They add up per project and per person here." />
      ) : tab === "matrix" ? (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={`${th} text-start`}>Project</th>
                  {matrix.cols.map((c) => (<th key={c.id} className={`${th} text-center`}>{c.name}</th>))}
                  <th className={`${th} text-end`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{r.name}</td>
                    {matrix.cols.map((c) => {
                      const hours = matrix.at(r.id, c.id);
                      return <td key={c.id} className="py-3 text-center tabular-nums text-slate-600 dark:text-slate-300">{hours || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>;
                    })}
                    <td className="py-3 text-end font-700 tabular-nums text-slate-900 dark:text-white">{matrix.rowTotal(r.id)}</td>
                  </tr>
                ))}
                <tr className="bg-brand-500/5">
                  <td className="py-3 pe-3 font-700 text-slate-900 dark:text-white">Total</td>
                  {matrix.cols.map((c) => (<td key={c.id} className="py-3 text-center font-700 tabular-nums text-slate-900 dark:text-white">{matrix.colTotal(c.id)}</td>))}
                  <td className="py-3 text-end font-700 tabular-nums text-brand-700 dark:text-brand-300">{matrix.grand}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Project", "Person", "Department", "Date", "From–To"].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {overtimes.map((o) => (
                  <tr key={o.id}
                    className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${canManage ? "cursor-pointer hover:bg-brand-500/5" : ""}`}
                    role={canManage ? "button" : undefined} tabIndex={canManage ? 0 : undefined}
                    onClick={() => canManage && setEditing(o)}
                    onKeyDown={(e) => { if (canManage && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditing(o); } }}>
                    <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{o.projectName}</td>
                    <td className="py-3 pe-3 text-slate-700 dark:text-slate-200">{o.personName}</td>
                    <td className="py-3 pe-3 text-slate-500 dark:text-slate-400">{o.departmentName || "—"}</td>
                    <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{fmtDate(o.date)}</td>
                    <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{o.from || "—"} – {o.to || "—"}</td>
                    <td className="py-3 text-end font-700 tabular-nums text-slate-900 dark:text-white">{o.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function AddOvertime({ projects, directory, defaultDepartmentId, onSave, onCancel }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
  const [collaboratorIds, setCollaboratorIds] = useState([]);
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("17:00");
  const [to, setTo] = useState("20:00");
  const [busy, setBusy] = useState(false);

  const people = useMemo(
    () => directory.people.filter((p) => !departmentId || p.departmentId === departmentId),
    [directory.people, departmentId],
  );
  const toggle = (id) => setCollaboratorIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const hours = hoursBetween(from, to);
  const ready = projectId && date && hours > 0 && collaboratorIds.length > 0;

  return (
    <>
      <div className="grid gap-4">
        <Field label="Project" as="select" required value={projectId} onChange={(v) => setProjectId(v)}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" filled={!!date}>
            <StudioDate value={date} onChange={(iso) => setDate(iso)} />
          </Field>
          <Field label="From" type="time" value={from} onChange={(v) => setFrom(v)} />
          <Field label="To" type="time" value={to} onChange={(v) => setTo(v)} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hours > 0
            ? <>That is <span className="font-600">{hours}</span> hour{hours === 1 ? "" : "s"} per person.</>
            : "The end time has to be after the start time."}
        </p>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className={`${label} mb-0`}>People {collaboratorIds.length ? `(${collaboratorIds.length})` : ""}</label>
            {directory.departments.length > 0 && (
              <select className="rounded-lg border border-slate-200 bg-[var(--geex-inset)] px-2 py-1 text-xs dark:border-white/15 dark:text-white"
                value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All departments</option>
                {directory.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/15">
            {people.length === 0 ? (
              <p className="p-2 text-sm text-slate-400">Nobody in this department.</p>
            ) : people.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                <input type="checkbox" checked={collaboratorIds.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-brand-600" />
                <span className="text-slate-700 dark:text-slate-200">{p.alias}</span>
                {p.departmentName && <span className="text-xs text-slate-400">· {p.departmentName}</span>}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => {
          setBusy(true);
          await onSave({ projectId, collaboratorIds, date, from, to });
          setBusy(false);
        }}>{busy ? "Saving…" : "Add overtime"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function EditOvertime({ record, projects, directory, onSave, onDelete, onCancel }) {
  const [f, setF] = useState({
    projectId: record.projectId || "",
    collaboratorId: record.collaboratorId || "",
    date: record.date || "",
    from: record.from || "17:00",
    to: record.to || "20:00",
  });
  const [busy, setBusy] = useState(false);
  const hours = hoursBetween(f.from, f.to);

  return (
    <>
      <div className="grid gap-4">
        <Field label="Project" as="select" required value={f.projectId} onChange={(v) => setF((s) => ({ ...s, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        {/* Somebody who has since left the studio still has to render, or saving
            would silently move their hours to whoever is first. */}
        <Field label="Person" as="select" required value={f.collaboratorId} onChange={(v) => setF((s) => ({ ...s, collaboratorId: v }))}
          options={[
            ...directory.people.map((p) => ({ value: p.id, label: p.alias })),
            ...(f.collaboratorId && !directory.people.some((p) => p.id === f.collaboratorId)
              ? [{ value: f.collaboratorId, label: `${record.personName} (no longer a member)` }]
              : []),
          ]} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" filled={!!f.date}>
            <StudioDate value={f.date} onChange={(iso) => setF((s) => ({ ...s, date: iso }))} />
          </Field>
          <Field label="From" type="time" value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v }))} />
          <Field label="To" type="time" value={f.to} onChange={(v) => setF((s) => ({ ...s, to: v }))} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hours > 0 ? <>That is <span className="font-600">{hours}</span> hour{hours === 1 ? "" : "s"}.</> : "The end time has to be after the start time."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>Delete</button>
        <div className="flex gap-3">
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
          <button className={btn} disabled={busy || hours <= 0} onClick={async () => { setBusy(true); await onSave(f); setBusy(false); }}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ---- settings --------------------------------------------------------------
function ProjectsSettings({ settings, departments, stages, canManage, onSave }) {
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(REQUIREMENT_WEIGHTS.map((w) => [w.key, settings.requirementWeights?.[w.key] ?? ""])));
  const [otDept, setOtDept] = useState(settings.overtimeDefaultDepartmentId || "");
  const [supportDays, setSupportDays] = useState(settings.supportPeriodDays ?? 365);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setSaved(false); setWeights((s) => ({ ...s, [k]: v })); };
  const total = REQUIREMENT_WEIGHTS.reduce((a, w) => a + (Number(weights[w.key]) || 0), 0);

  async function save() {
    setBusy(true);
    const ok = await onSave({
      requirementWeights: weights,
      overtimeDefaultDepartmentId: otDept,
      supportPeriodDays: supportDays,
    });
    setBusy(false);
    setSaved(!!ok);
  }

  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className={h2}>Requirement weights</h2>
        <p className={sub}>
          How a project&apos;s completion percentage splits across its requirements. Only the requirements a project
          actually carries are counted, and their shares are re-scaled to fill the bar — so a delivery-only project
          still reaches 100%.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {REQUIREMENT_WEIGHTS.map((w) => (
            <Field key={w.key} label={`${w.label} %`} type="number" min="0"
              value={weights[w.key] ?? ""} disabled={!canManage}
              onChange={(v) => set(w.key, v)} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {total === 0 ? "Nothing set — every requirement a project has weighs the same." : `They add up to ${total}%, and are re-scaled per project.`}
        </p>
      </section>

      <section className={panel}>
        <h2 className={h2}>Support</h2>
        <p className={sub}>How long a project stays in support after its end date. A new project starts with this, and can be changed on its own.</p>
        <div className="mt-4 max-w-xs">
          <Field label="Default support period (days)" type="number" min="0" value={supportDays} disabled={!canManage}
            onChange={(v) => { setSaved(false); setSupportDays(v); }} />
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>Overtime</h2>
        <p className={sub}>The department pre-selected in <span className="font-600">Add overtime</span>, so the people list opens filtered to it.</p>
        <div className="mt-4 max-w-xs">
          {departments.length === 0 ? (
            <>
              <label className={label}>Default department</label>
              <p className="text-xs text-slate-400">No departments — a department is a section, and this studio has none switched on.</p>
            </>
          ) : (
            <Field label="Default department" as="select" value={otDept} disabled={!canManage}
              onChange={(v) => { setSaved(false); setOtDept(v); }}
              options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          )}
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>Stages</h2>
        <p className={sub}>The stages a project moves through. These are fixed for now — the board and the list both read them.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stages.map((s) => (
            <StatusPill key={s} kind="project" status={s} />
          ))}
        </div>
      </section>

      {canManage ? (
        <div className="flex items-center gap-3">
          <button className={btn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</button>
          {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">You have view-only access to Projects settings.</p>
      )}
    </div>
  );
}
