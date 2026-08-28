"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
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
import { hoursBetween } from "@/modules/projects/projectSchedule";

// Projects: delivery work opened from an approved quotation, the support
// contracts that follow it, and the overtime logged against it. Progress is the
// project plan's overall completion (read back through the plans index), read-
// only on this screen — the schedule that moves it lives in the planner, opened
// from the project board. The chrome comes from studio2/ui.

// Project-stage colours now live in the shared StatusPill map (kind "project").
const rnd = (n) => Math.round((Number(n) || 0) * 100) / 100;

function SupportTag({ project }) {
  const tr = projectsDict(useStudioLocale());
  const s = supportStatus(project);
  if (!s.known) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">{tr.supportNotSet}</span>;
  if (s.inSupport) return <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-600 text-white">Support: {s.daysRemaining}d left</span>;
  return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-600 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">{tr.supportEnded}</span>;
}

// The project list is a Data Grid now — sortable columns and client-side paging
// come from the grid itself, so the hand-rolled SortHeader it replaced is gone.
// Loaded in its own async chunk (never folded into Projects' initial bundle) —
// see StudioDataGrid's header. The skeleton reserves the exact box for nine
// columns while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={9} pageSize={10} />,
});

// `view` is the ACTIVE SUB-SECTION key, so each sub-section is its own screen:
//   projects            -> the dashboard: the board, the counts, the next visits
//   projects-list       -> the project list and its detail
//   projects-sla        -> support contracts and their visit schedules
//   projects-overtimes  -> hours logged outside the plan
//   projects-settings   -> requirement weights, default OT department, stages
export default function StudioProjects({ slug, view = "projects" }) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const focus = useFocusedRecord("project");
  const level = useAnalyticsLevel();

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessProjectsStudio); return; }
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
        out.error === "read-only" ? tr.viewOnlyAccessPart
        : out.error === "not-approved" ? tr.quotationHasnApprovedYet
        : out.error === "already" ? tr.projectAlreadyExistsQuotation
        : out.error === "title" ? tr.giveName
        : out.error === "startDate" ? tr.startDateRequiredVisit
        : out.error === "emergency-cap" ? `This contract allows ${out.cap} emergency visit${out.cap === 1 ? "" : "s"}.`
        : out.error === "project" ? tr.pickProject
        : out.error === "date" ? tr.pickDate
        : out.error === "times" ? tr.endTimeMustAfter
        : out.error === "people" ? tr.pickLeastOnePerson
        : tr.didnSave
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingProjects2}</p>;

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
          serviceActions={vocabulary.serviceActions || []}
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
        ? <Empty title={tr.dashboardIsnYoursSee} body={tr.studioKeepsModuleDashboards} />
        : <ProjectsDashboard projects={projects} slas={slas} overtimes={overtimes} people={people} level={level} slug={slug} nav={nav} />}
    </div>
  );
}

// ---- project list ----------------------------------------------------------

function ProjectList({ projects, approvedQuotations, people, stages, canManage, slug, nav, focus, onOpen, onSave, onDelete }) {
  const tr = projectsDict(useStudioLocale());
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
      <Toolbar canManage={canManage} label={tr.openProject} onAdd={() => setOpening(true)}>
        {projects.length > 0 && (
          <input type="search" className={`${input} sm:max-w-xs`} aria-label={tr.searchTitleNumberClient}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </Toolbar>

      {opening && (
        <Dialog title={tr.openProject2} description={tr.onlyApprovedQuotationsCan} onClose={closeOpen}>
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
          title={tr.noProjectsYet}
          body={approvedQuotations.length === 0
            ? tr.projectsOpenApprovedQuotation
            : tr.approvedQuotationsReadyOpen}
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
              ariaLabel={tr.projects}
              emptyLabel={tr.noProjectsMatchSearch}
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
                  field: "number", headerName: tr.number, minWidth: 120, flex: 0.7,
                  renderCell: ({ row }) => (row.number
                    ? <span className="num text-xs text-slate-500 dark:text-slate-400">{row.number}</span>
                    : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">{tr.noNumberYet}</span>),
                },
                {
                  field: "title", headerName: tr.title, minWidth: 180, flex: 1.3,
                  renderCell: ({ row }) => <span className="font-600 text-slate-900 dark:text-white">{row.title}</span>,
                },
                {
                  field: "clientName", headerName: tr.client, minWidth: 140, flex: 1,
                  renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.clientName || "—"}</span>,
                },
                {
                  field: "location", headerName: tr.location, minWidth: 120, flex: 0.8,
                  renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.location || "—"}</span>,
                },
                {
                  field: "stage", headerName: tr.stage, minWidth: 120, flex: 0.7,
                  renderCell: ({ row }) => <StatusPill kind="project" status={row.stage} />,
                },
                {
                  field: "value", headerName: tr.value, type: "number", minWidth: 110, flex: 0.7,
                  align: "right", headerAlign: "right",
                  renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.value)}</span>,
                },
                {
                  field: "progress", headerName: tr.progress, type: "number", minWidth: 140, flex: 0.8,
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
                  field: "endDate", headerName: tr.targetEnd, minWidth: 130, flex: 0.8,
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
  const tr = projectsDict(useStudioLocale());
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
        <div className="mt-5"><button className={btnGhost} onClick={onCancel}>{tr.close}</button></div>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label={tr.approvedQuotation} as="select" required
          value={quotationId} onChange={(v) => setQuotationId(v)}
          options={quotations.map((q) => ({ value: q.id, label: `${q.number} — ${q.title}` }))}
          hint={chosen ? `${chosen.clientName} · ${money(chosen.total)}` : undefined} />
        <Field label={tr.projectManager} as="select" value={managerCollaboratorId}
          onChange={(v) => setManager(v)}
          options={[{ value: "", label: tr.unassigned }, ...people.map((p) => ({ value: p.id, label: p.alias }))]} />
        <Field label={tr.location} value={location} onChange={(v) => setLocation(v)} hint={tr.siteCity} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !quotationId} onClick={async () => {
          setBusy(true);
          await onSave({ quotationId, managerCollaboratorId, location });
          setBusy(false);
        }}>{busy ? tr.opening : tr.openProject}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function ProjectDetail({ project: p, people, stages, canManage, aliasOf, slug, nav, onSave, onDelete, onClose }) {
  const tr = projectsDict(useStudioLocale());
  const support = supportStatus(p);
  // Location and the support period commit on blur, dates on pick — the same
  // save points the old uncontrolled inputs had. Field is controlled, so these
  // hold the edit locally and hand it to onSave at the same moment as before.
  const [loc, setLoc] = useState(p.location || "");
  const [start, setStart] = useState(p.startDate || "");
  const [end, setEnd] = useState(p.endDate || "");
  const [sup, setSup] = useState(p.supportPeriodDays ?? 365);

  return (
    <>
      {/* Lineage — the chain this project came from. */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-600 uppercase tracking-wide">{tr.from}</span>
        {[
          p.ticketId && { label: tr.ticket, href: linkIf(nav?.sales, linkToTicket(slug, p.ticketId)) },
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
        <div><label className={label}>{tr.client}</label><input className={inputRO} value={p.clientName || "—"} readOnly /></div>
        <div><label className={label}>{tr.value}</label><input className={inputRO} value={money(p.value)} readOnly /></div>
        <div>
          <label className={label}>{tr.support}</label>
          <div className={`${inputRO} flex items-center`}><SupportTag project={p} /></div>
        </div>
      </div>

      {/* Progress is the project plan's overall completion — read-only here; the
          schedule that moves it lives in the planner, opened from the board. */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-600 uppercase tracking-wide">{tr.progress}</span>
          <span className="font-600 tabular-nums">{p.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${p.progress}%` }} />
        </div>
      </div>

      {canManage && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label={tr.stage} as="select" value={p.stage}
            onChange={(val) => onSave({ stage: val })}
            options={stages.map((s) => ({ value: s, label: s }))} />
          <Field label={tr.manager} as="select" value={p.managerCollaboratorId || ""}
            onChange={(val) => onSave({ managerCollaboratorId: val })}
            options={[{ value: "", label: tr.unassigned }, ...people.map((x) => ({ value: x.id, label: x.alias }))]} />
          {/* Wrapper onBlur keeps the save-on-blur point without overriding
              Field's own input onBlur (which tracks the focus ring). */}
          <div onBlur={() => onSave({ location: loc })}>
            <Field label={tr.location} value={loc} onChange={(val) => setLoc(val)} />
          </div>
          <Field label={tr.start} filled={!!start}>
            <StudioDate value={start} onChange={(iso) => { setStart(iso); onSave({ startDate: iso }); }} />
          </Field>
          <Field label={tr.targetEnd} filled={!!end}>
            <StudioDate value={end} onChange={(iso) => { setEnd(iso); onSave({ endDate: iso }); }} />
          </Field>
          <div onBlur={() => onSave({ supportPeriodDays: sup })}>
            <Field label={tr.supportPeriodDays} type="number" min="0" value={sup}
              onChange={(val) => setSup(val)}
              hint={support.known ? `Runs to ${slaDate(support.supportEnd)}.` : undefined} />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {canManage
          ? <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>{tr.deleteProject}</button>
          : <span />}
        <button className={btnGhost} onClick={onClose}>{tr.close}</button>
      </div>
    </>
  );
}

// ---- SLA -------------------------------------------------------------------
// A support contract and the visits it owes. The planned schedule is DERIVED
// from the start, duration and count — change any of them and every date moves —
// so only the ticks and the emergency call-outs are stored.
function Slas({ slas, projects, canManage, onSave }) {
  const tr = projectsDict(useStudioLocale());
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
        <Toolbar canManage={canManage} label={tr.addSla} onAdd={() => setForm({ row: null })} />
        {form && (
          <Dialog title={tr.addSlaContract} description={tr.visitScheduleGeneratedStart} onClose={closeForm}>
            <SlaForm row={null} projects={projects} onCancel={closeForm}
              onSave={async (p) => { const ok = await onSave("POST", p); if (ok) setForm(null); }} />
          </Dialog>
        )}
        <Empty title={tr.noSlaContractsYet} body={tr.contractCoversDeliveredProject} />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label={tr.addSla} onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.title}` : tr.addSlaContract}
          description={tr.visitScheduleGeneratedStart}
          onClose={closeForm}>
          <SlaForm row={form.row} projects={projects} onCancel={closeForm}
            onSave={async (p) => {
              const ok = await onSave(form.row ? "PUT" : "POST", form.row ? { ...p, id: form.row.id } : p);
              if (ok) setForm(null);
            }} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={detail.title || tr.slaContract} description={`${projName(detail)} · signed ${slaDate(detail.signingDate)}`}
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
                {[tr.contract, tr.project, tr.signed, tr.visits, tr.closestVisit].map((head) => (
                  <th key={head} className={`${th} ps-2 text-start`}>{head}</th>
                ))}
                <th className={`${th} text-end`}>{tr.actions}</th>
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
                        <button className={btnGhost} onClick={() => setDetail(sla)}>{tr.visits}</button>
                        {canManage && <button className={btnGhost} onClick={() => setForm({ row: sla })}>{tr.edit}</button>}
                        {canManage && <button className={btnGhost} onClick={() => onSave("DELETE", { id: sla.id })}>{tr.delete}</button>}
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
  const tr = projectsDict(useStudioLocale());
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
        <Field label={tr.contractName} required value={f.title} onChange={(v) => setF((s) => ({ ...s, title: v }))} />
        <Field label={tr.project} as="select" value={f.projectId} onChange={(v) => setF((s) => ({ ...s, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        <Field label={tr.signed} filled={!!f.signingDate}>
          <StudioDate value={f.signingDate} onChange={(iso) => setF((s) => ({ ...s, signingDate: iso }))} />
        </Field>
        <Field label={tr.starts} required filled={!!f.startDate}>
          <StudioDate value={f.startDate} onChange={(iso) => setF((s) => ({ ...s, startDate: iso }))} />
        </Field>
        <Field label={tr.durationDays} type="number" min="1" value={f.durationDays} onChange={(v) => setF((s) => ({ ...s, durationDays: v }))} />
        <Field label={tr.plannedVisits} type="number" min="1" value={f.visits} onChange={(v) => setF((s) => ({ ...s, visits: v }))} />
        <Field label={tr.emergencyAllowance} type="number" min="0" value={f.emergencyVisits} onChange={(v) => setF((s) => ({ ...s, emergencyVisits: v }))} />
      </div>
      <Field className="mt-4" label={tr.notes} as="textarea" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} />

      {preview.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3.5 dark:border-white/15">
          <p className={microLabel}>{tr.schedule}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visits fall on {preview.slice(0, 3).map((v) => slaDate(v.date)).join(", ")}
            {preview.length > 3 ? `… through ${slaDate(preview[preview.length - 1].date)}` : ""}. Changing any of the three fields above reschedules all of them.
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => { setBusy(true); await onSave(f); setBusy(false); }}>
          {busy ? tr.saving : row ? tr.saveContract : tr.addContract}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function SlaVisits({ sla, canManage, onSave, onClose }) {
  const tr = projectsDict(useStudioLocale());
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
    if (!emergencyDate) return setEmergencyError(tr.pickDateFirst);
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
        {planned.length === 0 && <li className="text-sm text-slate-400">{tr.setStartDateDuration}</li>}
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
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.emergencyVisits}</h4>
          <span className="text-xs text-slate-400 dark:text-slate-500">{emergency.length}/{cap} used</span>
        </div>
        {cap === 0 ? (
          <p className="text-sm text-slate-400">{tr.contractNoEmergencyVisits}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {emergency.length === 0 && <li className="text-sm text-slate-400">{tr.noEmergencyVisitsRegistered}</li>}
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
                      onClick={() => patchEmergency((sla.emergencyVisitsList || []).filter((x) => x.id !== e.id))}>{tr.remove}</button>
                  )}
                </li>
              ))}
            </ul>
            {canManage && emergency.length < cap && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Field label={tr.date} filled={!!emergencyDate} className="sm:max-w-[200px]">
                  <StudioDate value={emergencyDate}
                    minDate={sla.startDate || undefined} maxDate={end ? end.toISOString().slice(0, 10) : undefined}
                    onChange={(iso) => setEmergencyDate(iso)} />
                </Field>
                <button type="button" className="rounded-full bg-amber-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-amber-700" onClick={addEmergency}>
                  Register emergency visit
                </button>
              </div>
            )}
            {emergencyError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{emergencyError}</p>}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end"><button className={btnGhost} onClick={onClose}>{tr.close}</button></div>
    </>
  );
}

// ---- overtime --------------------------------------------------------------
// Two readings of the same records: the MATRIX, which is what a manager wants —
// hours per project per person, with the totals — and the LIST, which is the
// individual entries, where a mistake gets corrected.
function Overtimes({ overtimes, projects, directory, defaultDepartmentId, canManage, onSave }) {
  const tr = projectsDict(useStudioLocale());
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
      [tr.project, tr.total].map(esc).join(","),
      ...matrix.rows.map((r) => [r.name, ...matrix.cols.map((c) => matrix.at(r.id, c.id)), matrix.rowTotal(r.id)].map(esc).join(",")),
      [tr.totalRow, ...matrix.cols.map((c) => matrix.colTotal(c.id)), matrix.grand].map(esc).join(","),
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
          {[["matrix", tr.viewMatrix], ["list", tr.viewList]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === k ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {lbl}
            </button>
          ))}
        </div>
        {tab === "matrix" && overtimes.length > 0 && (
          <button type="button" className={btnGhost} onClick={exportCsv}>{tr.exportCsv}</button>
        )}
        <span className="ms-auto">
          {canManage
            ? <button type="button" className={btn} onClick={() => setAdding(true)} disabled={projects.length === 0}
                title={projects.length === 0 ? tr.openProjectFirst : undefined}>{tr.addOvertime}</button>
            : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>}
        </span>
      </div>

      {adding && (
        <Dialog title={tr.addOvertime} description={tr.oneRecordWrittenPer} onClose={closeAdd}>
          <AddOvertime projects={projects} directory={directory} defaultDepartmentId={defaultDepartmentId}
            onCancel={closeAdd} onSave={async (p) => { const ok = await onSave("POST", p); if (ok) setAdding(false); }} />
        </Dialog>
      )}
      {editing && (
        <Dialog title={tr.editOvertime} description={`${editing.personName} · ${fmtDate(editing.date)}`} onClose={closeEdit} width="max-w-[560px]">
          <EditOvertime record={editing} projects={projects} directory={directory} onCancel={closeEdit}
            onSave={async (p) => { const ok = await onSave("PUT", { id: editing.id, ...p }); if (ok) setEditing(null); }}
            onDelete={async () => { const ok = await onSave("DELETE", { id: editing.id }); if (ok) setEditing(null); }} />
        </Dialog>
      )}

      {overtimes.length === 0 ? (
        <Empty title={tr.noOvertimeRecordedYet} body={tr.logHoursWorkedProject} />
      ) : tab === "matrix" ? (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={`${th} text-start`}>{tr.project}</th>
                  {matrix.cols.map((c) => (<th key={c.id} className={`${th} text-center`}>{c.name}</th>))}
                  <th className={`${th} text-end`}>{tr.total}</th>
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
                  <td className="py-3 pe-3 font-700 text-slate-900 dark:text-white">{tr.total}</td>
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
                  {[tr.project, tr.person, tr.department, tr.date, tr.fromTo].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`}>{tr.hours}</th>
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
  const tr = projectsDict(useStudioLocale());
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
        <Field label={tr.project} as="select" required value={projectId} onChange={(v) => setProjectId(v)}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tr.date} filled={!!date}>
            <StudioDate value={date} onChange={(iso) => setDate(iso)} />
          </Field>
          <Field label={tr.from} type="time" value={from} onChange={(v) => setFrom(v)} />
          <Field label={tr.to} type="time" value={to} onChange={(v) => setTo(v)} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hours > 0
            ? <>{tr.thatIs} <span className="font-600">{hours}</span> hour{hours === 1 ? "" : "s"} per person.</>
            : tr.endTimeAfterStart}
        </p>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className={`${label} mb-0`}>People {collaboratorIds.length ? `(${collaboratorIds.length})` : ""}</label>
            {directory.departments.length > 0 && (
              <select className="rounded-lg border border-slate-200 bg-[var(--geex-inset)] px-2 py-1 text-xs dark:border-white/15 dark:text-white"
                value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">{tr.allDepartments}</option>
                {directory.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/15">
            {people.length === 0 ? (
              <p className="p-2 text-sm text-slate-400">{tr.nobodyDepartment}</p>
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
        }}>{busy ? tr.saving : tr.addOvertime}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function EditOvertime({ record, projects, directory, onSave, onDelete, onCancel }) {
  const tr = projectsDict(useStudioLocale());
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
        <Field label={tr.project} as="select" required value={f.projectId} onChange={(v) => setF((s) => ({ ...s, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: `${p.number} — ${p.title}` }))} />
        {/* Somebody who has since left the studio still has to render, or saving
            would silently move their hours to whoever is first. */}
        <Field label={tr.person} as="select" required value={f.collaboratorId} onChange={(v) => setF((s) => ({ ...s, collaboratorId: v }))}
          options={[
            ...directory.people.map((p) => ({ value: p.id, label: p.alias })),
            ...(f.collaboratorId && !directory.people.some((p) => p.id === f.collaboratorId)
              ? [{ value: f.collaboratorId, label: `${record.personName} (no longer a member)` }]
              : []),
          ]} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tr.date} filled={!!f.date}>
            <StudioDate value={f.date} onChange={(iso) => setF((s) => ({ ...s, date: iso }))} />
          </Field>
          <Field label={tr.from} type="time" value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v }))} />
          <Field label={tr.to} type="time" value={f.to} onChange={(v) => setF((s) => ({ ...s, to: v }))} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hours > 0 ? <>{tr.thatIs} <span className="font-600">{hours}</span> hour{hours === 1 ? "" : "s"}.</> : "The end time has to be after the start time."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button className="text-sm font-600 text-rose-600 hover:underline dark:text-rose-400" onClick={onDelete}>{tr.delete}</button>
        <div className="flex gap-3">
          <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
          <button className={btn} disabled={busy || hours <= 0} onClick={async () => { setBusy(true); await onSave(f); setBusy(false); }}>
            {busy ? tr.saving : tr.save}
          </button>
        </div>
      </div>
    </>
  );
}

// ---- settings --------------------------------------------------------------
function ProjectsSettings({ settings, departments, stages, serviceActions, canManage, onSave }) {
  const tr = projectsDict(useStudioLocale());
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(serviceActions.map((a) => [a, settings.requirementWeights?.[a] ?? ""])));
  const [otDept, setOtDept] = useState(settings.overtimeDefaultDepartmentId || "");
  const [supportDays, setSupportDays] = useState(settings.supportPeriodDays ?? 365);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setSaved(false); setWeights((s) => ({ ...s, [k]: v })); };
  const total = serviceActions.reduce((a, act) => a + (Number(weights[act]) || 0), 0);
  // Block the save while the percentages exist but don't add up — a project's
  // completion split is only meaningful at exactly 100%. With no actions defined
  // there is nothing to weight, so nothing to block.
  const weightsOk = serviceActions.length === 0 || total === 100;

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
        <h2 className={h2}>{tr.requirementWeights}</h2>
        <p className={sub}>
          How a project&apos;s completion percentage splits across its requirements — your studio&apos;s
          service actions. Give each a share; together they must total 100%. Only the actions a project
          actually carries are counted, and their shares are re-scaled to fill the bar.
        </p>
        {serviceActions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-white/10">
            No service actions yet — add them in Studio Settings, then weight them here.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              {serviceActions.map((act) => (
                <Field key={act} label={`${act} %`} type="number" min="0" max="100"
                  value={weights[act] ?? ""} disabled={!canManage}
                  onChange={(v) => set(act, v)} />
              ))}
            </div>
            <p className={`mt-2 text-xs font-600 ${total === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-300"}`}>
              {total === 100
                ? tr.theyTotal100
                : `They total ${total}% — ${total > 100 ? "over" : "under"} by ${Math.abs(100 - total)}%. Adjust to 100% to save.`}
            </p>
          </>
        )}
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.support}</h2>
        <p className={sub}>{tr.howLongProjectStays}</p>
        <div className="mt-4 max-w-xs">
          <Field label={tr.defaultSupportPeriodDays} type="number" min="0" value={supportDays} disabled={!canManage}
            onChange={(v) => { setSaved(false); setSupportDays(v); }} />
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.overtime}</h2>
        <p className={sub}>{tr.departmentPreSelected} <span className="font-600">{tr.addOvertime}</span>{tr.peopleListOpensFiltered}</p>
        <div className="mt-4 max-w-xs">
          {departments.length === 0 ? (
            <>
              <label className={label}>{tr.defaultDepartment}</label>
              <p className="text-xs text-slate-400">{tr.noDepartmentsDepartmentSection}</p>
            </>
          ) : (
            <Field label={tr.defaultDepartment} as="select" value={otDept} disabled={!canManage}
              onChange={(v) => { setSaved(false); setOtDept(v); }}
              options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          )}
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.stages}</h2>
        <p className={sub}>{tr.stagesProjectMovesThrough}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {stages.map((s) => (
            <StatusPill key={s} kind="project" status={s} />
          ))}
        </div>
      </section>

      {canManage ? (
        <div className="flex items-center gap-3">
          <button className={btn} disabled={busy || !weightsOk} onClick={save}
            title={weightsOk ? "" : "Requirement weights must total 100%."}>{busy ? tr.saving : tr.saveSettings}</button>
          {!weightsOk && <span className="text-sm text-rose-600 dark:text-rose-300">{tr.weightsMustTotal100}</span>}
          {saved && weightsOk && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessProjects}</p>
      )}
    </div>
  );
}
