"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
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
  money, fmtDate, useTablePrefs,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty,
} from "@/components/studio2/ui";
import { linkToTicket, linkToRfq, linkToQuotation, linkIf } from "@/modules/main/studioLinks";
// The contact-and-site block, and the free-text dropdown, a new quotation
// raises a client with. Both already sit in the studio chunk — reusing them is
// what keeps the direct-create form from being a poorer second copy of one.
import ClientBlock, { EMPTY_CLIENT_BLOCK, clientBlockPayload } from "@/components/studio2/ClientBlock";
import Combo from "@/components/studio2/Combo";
// One import, not two: BARE_CONTROL rides with Field rather than repeating the
// module specifier a second time.
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import {
  slaVisits, emergencyVisits, nextVisit, contractEndDate, supportStatus,
  fmtDate as slaDate,
} from "@/modules/projects/sla";
import { hoursBetween } from "@/modules/projects/projectSchedule";

// Projects: delivery work opened from an approved quotation, the support
// contracts that follow it, and the overtime logged against it. Progress is the
// project plan's overall completion (read back through the plans index), read-
// only on this screen — the schedule that moves it lives in the planner, opened
// from the project board. The chrome comes from studio2/ui.

// Project-stage colours now live in the shared StatusPill map (kind "project").
const rnd = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Columns the project list can show. Every one is toggleable; the Open action is
// not on the list because it is always drawn.
// THE KEYS ARE THE CONTRACT, THE LABELS ARE COPY. The saved column preference
// stores keys, so the order and the identity of a column must not depend on the
// reader's language; only what it is CALLED does. Hence a key list here and a
// labelled list built from the dictionary at render.
const PROJECT_COLUMN_KEYS = [
  "number", "title", "clientName", "location", "stage", "manager",
  "quotationNumber", "value", "progress", "startDate", "endDate", "createdAt",
];
const projectColumns = (words) => [
  { key: "number", label: words.number },
  { key: "title", label: words.title },
  { key: "clientName", label: words.client },
  { key: "location", label: words.location },
  { key: "stage", label: words.stage },
  { key: "manager", label: words.manager },
  { key: "quotationNumber", label: words.quotation },
  { key: "value", label: words.value },
  { key: "progress", label: words.progress },
  { key: "startDate", label: words.start },
  { key: "endDate", label: words.targetEnd },
  { key: "createdAt", label: words.createdAt },
];
// The nine the list showed before it had a picker, minus the always-drawn Open.
const DEFAULT_PROJECT_COLUMNS = [
  "number", "title", "clientName", "location", "stage", "value", "progress", "endDate",
];
const EMPTY_FILTERS = {
  client: "", location: "", stage: "", manager: "",
  valueMin: "", valueMax: "",
  progressMin: "", progressMax: "",
  startFrom: "", startTo: "",
  endFrom: "", endTo: "",
};

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
  // A quotation being approved is what makes a new project openable — and a
  // quotation is a CRM & Sales event now (restructure.ts's SECTION_KEY_MAP:
  // technical-quotations -> crm-sales-quotations), not an Engineering &
  // Documents one.
  useLiveUpdates(slug, "crm-sales", load);

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
        // A direct create refuses with "client" when this studio has no Sales
        // clients section — the form's `ready` gate cannot pre-empt it, because
        // it only knows the typed name, not whether the section exists.
        : out.error === "client" ? tr.noClientsListHere
        : out.error === "startDate" ? tr.startDateRequiredVisit
        : out.error === "emergency-cap" ? tr.nEmergencyVisitsAllowed(out.cap)
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
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingProjects2} />;

  // `canManage` is deliberately NOT destructured — see the note below. Binding
  // it under another name only to never read it made the same point, and cost a
  // lint warning to say it.
  const {
    canManageList, canManageSla, canManageOvertimes, canManageSettings,
    projects, approvedQuotations, people, clients = [], slas, overtimes, directory, settings, vocabulary, nav,
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
          clients={clients} industries={vocabulary.industries || []}
          studioDefaults={data.studioDefaults || {}}
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

function ProjectList({ projects, approvedQuotations, people, clients = [], industries = [],
  studioDefaults = {}, stages, canManage, slug, nav, focus, onOpen, onSave, onDelete }) {
  const tr = projectsDict(useStudioLocale());
  const PROJECT_COLUMNS = useMemo(() => projectColumns(tr), [tr]);
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const closeOpen = useCallback(() => setOpening(false), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const { columns, has: col, toggleCol, resetCols, filters, setFilter, clearFilters, activeFilters } =
    useTablePrefs("projects", slug, {
      columnKeys: PROJECT_COLUMN_KEYS,
      defaultColumns: DEFAULT_PROJECT_COLUMNS,
      emptyFilters: EMPTY_FILTERS,
    });

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

  // Search and filter only — SORTING is the Data Grid's, so the hand-rolled
  // comparator this useMemo used to carry is gone: the grid sorts each column by
  // its `field`, with `type: "number"` on the figures so they sort by magnitude
  // rather than lexically.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    const num = (v) => (v === "" || v == null ? null : Number(v));
    const valMin = num(f.valueMin), valMax = num(f.valueMax);
    const progMin = num(f.progressMin), progMax = num(f.progressMax);
    return projects.filter((p) => {
      if (f.stage && (p.stage || "Received") !== f.stage) return false;
      if (f.manager && p.managerCollaboratorId !== f.manager) return false;
      if (f.client && !`${p.clientName || ""}`.toLowerCase().includes(f.client.toLowerCase())) return false;
      if (f.location && !`${p.location || ""}`.toLowerCase().includes(f.location.toLowerCase())) return false;
      const value = Number(p.value ?? 0);
      if (valMin != null && Number.isFinite(valMin) && value < valMin) return false;
      if (valMax != null && Number.isFinite(valMax) && value > valMax) return false;
      const progress = Number(p.progress ?? 0);
      if (progMin != null && Number.isFinite(progMin) && progress < progMin) return false;
      if (progMax != null && Number.isFinite(progMax) && progress > progMax) return false;
      // A project with no date is OUT of a date range rather than in it — an
      // unscheduled project is not "ending in this window", it has no window.
      const start = (p.startDate || "").slice(0, 10);
      if (f.startFrom && (!start || start < f.startFrom)) return false;
      if (f.startTo && (!start || start > f.startTo)) return false;
      const end = (p.endDate || "").slice(0, 10);
      if (f.endFrom && (!end || end < f.endFrom)) return false;
      if (f.endTo && (!end || end > f.endTo)) return false;
      if (q && !`${p.title || ""} ${p.number || ""} ${p.clientName || ""} ${p.location || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, query, filters]);

  // The manager's ALIAS, so the Manager column sorts by name rather than by
  // CollaboratorID — computed once here rather than per cell.
  const gridRows = useMemo(() => rows.map((p) => ({
    ...p,
    managerName: aliasOf[p.managerCollaboratorId] || tr.unassigned,
  })), [rows, aliasOf, tr]);

  // One column def per PROJECT_COLUMNS key. The grid shows only the keys the
  // user has turned on (via `col`), in the fixed PROJECT_COLUMNS order, then the
  // always-drawn Open action — which is what carries KEYBOARD navigation to the
  // project's own page now that the row is not a semantic link.
  const colDefs = useMemo(() => ({
    number: { field: "number", headerName: tr.number, minWidth: 120, flex: 0.7,
      renderCell: ({ row }) => (row.number
        ? <span className="num text-xs text-slate-500 dark:text-slate-400">{row.number}</span>
        : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">{tr.noNumberYet}</span>) },
    title: { field: "title", headerName: tr.title, minWidth: 180, flex: 1.3,
      renderCell: ({ row }) => <span className="truncate font-600 text-slate-900 dark:text-white">{row.title}</span> },
    clientName: { field: "clientName", headerName: tr.client, minWidth: 140, flex: 1,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.clientName || "—"}</span> },
    location: { field: "location", headerName: tr.location, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.location || "—"}</span> },
    stage: { field: "stage", headerName: tr.stage, minWidth: 120, flex: 0.7,
      renderCell: ({ row }) => <StatusPill kind="project" status={row.stage} /> },
    manager: { field: "managerName", headerName: tr.manager, minWidth: 130, flex: 0.9,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.managerName}</span> },
    quotationNumber: { field: "quotationNumber", headerName: tr.quotation, minWidth: 130, flex: 0.8,
      renderCell: ({ row }) => <span className="num text-xs text-slate-500 dark:text-slate-400">{row.quotationNumber || "—"}</span> },
    value: { field: "value", headerName: tr.value, type: "number", minWidth: 110, flex: 0.7,
      align: "right", headerAlign: "right",
      renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.value)}</span> },
    progress: { field: "progress", headerName: tr.progress, type: "number", minWidth: 140, flex: 0.8,
      renderCell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${row.progress}%` }} />
          </span>
          <span className="num text-xs text-slate-500 dark:text-slate-400">{row.progress}%</span>
        </span>
      ) },
    startDate: { field: "startDate", headerName: tr.start, minWidth: 130, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.startDate)}</span> },
    endDate: { field: "endDate", headerName: tr.targetEnd, minWidth: 130, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.endDate)}</span> },
    createdAt: { field: "createdAt", headerName: tr.createdAt, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.createdAt)}</span> },
  }), [tr]);

  const gridColumns = useMemo(() => [
    ...PROJECT_COLUMNS.filter((c) => col(c.key)).map((c) => colDefs[c.key]),
    {
      field: "_open", headerName: "", minWidth: 90, flex: 0.5, sortable: false,
      align: "right", headerAlign: "right",
      renderCell: ({ row }) => (
        <button type="button" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
          onClick={(e) => { e.stopPropagation(); router.push(`/${slug}/projects-list/${row.id}`); }}>
          {tr.open}
        </button>
      ),
    },
  ], [PROJECT_COLUMNS, colDefs, columns, router, slug, tr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Toolbar canManage={canManage} label={tr.newProject} onAdd={() => setOpening(true)}>
        {projects.length > 0 && (
          <>
            <input type="search" className={`${input} sm:max-w-xs`} aria-label={tr.searchTitleNumberClient}
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
            <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>{tr.columns}</button>
          </>
        )}
      </Toolbar>

      {showFilters && projects.length > 0 && (
        <FilterPanel onClear={clearFilters}>
          <Field label={tr.client} value={filters.client} onChange={(v) => setFilter({ client: v })} />
          <Field label={tr.location} value={filters.location} onChange={(v) => setFilter({ location: v })} />
          {/* The stages are the STUDIO'S — vocabulary.stages, not a list this
              screen invented — so a tenant that renamed them filters by the
              names it actually uses. */}
          <Field label={tr.stage} as="select" value={filters.stage} onChange={(v) => setFilter({ stage: v })} options={stages} />
          <Field label={tr.manager} as="select" value={filters.manager} onChange={(v) => setFilter({ manager: v })}
            options={people.map((p) => ({ value: p.id, label: p.alias }))} />
          <div>
            <label className={microLabel}>{tr.value}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.min} type="number" min="0" value={filters.valueMin} onChange={(v) => setFilter({ valueMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label={tr.max} type="number" min="0" value={filters.valueMax} onChange={(v) => setFilter({ valueMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.progress}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.min} type="number" min="0" max="100" value={filters.progressMin} onChange={(v) => setFilter({ progressMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label={tr.max} type="number" min="0" max="100" value={filters.progressMax} onChange={(v) => setFilter({ progressMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.start}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.from} filled={!!filters.startFrom} className="flex-1"><StudioDate value={filters.startFrom} onChange={(iso) => setFilter({ startFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label={tr.to} filled={!!filters.startTo} className="flex-1"><StudioDate value={filters.startTo} onChange={(iso) => setFilter({ startTo: iso })} /></Field>
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.targetEnd}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.from} filled={!!filters.endFrom} className="flex-1"><StudioDate value={filters.endFrom} onChange={(iso) => setFilter({ endFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label={tr.to} filled={!!filters.endTo} className="flex-1"><StudioDate value={filters.endTo} onChange={(iso) => setFilter({ endTo: iso })} /></Field>
            </div>
          </div>
        </FilterPanel>
      )}

      {showColumns && (
        <ColumnPicker
          title={tr.projectColumns}
          columns={PROJECT_COLUMNS}
          selected={columns} onToggle={toggleCol} onReset={resetCols}
          onClose={() => setShowColumns(false)}
        />
      )}

      {/* NO `description` ANY MORE: it said "only approved quotations can become
          projects", which is no longer true — the screen would be lying about
          its own behaviour. The caveat now belongs to the quotation mode alone,
          which is where NewProject renders it. */}
      {opening && (
        <Dialog title={tr.newProject} onClose={closeOpen} width="max-w-[720px]">
          <NewProject quotations={approvedQuotations} people={people} clients={clients}
            industries={industries} studioDefaults={studioDefaults} onCancel={closeOpen}
            onSave={async (p) => { const ok = await onOpen(p); if (ok) setOpening(false); return ok; }} />
        </Dialog>
      )}

      {detail && (
        <Dialog title={`${detail.number} · ${detail.title}`} description={detail.clientName || undefined}
          onClose={closeDetail} width="max-w-[820px]">
          <ProjectDetail project={detail} people={people} stages={stages} canManage={canManage}
            slug={slug} nav={nav}
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
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.projectCount(rows.length, projects.length)}</p>
          <section className={panel}>
            {/* A Data Grid now — sortable columns, client-side paging, and the
                same toggleable column SET Sales' tickets list has, built from
                PROJECT_COLUMNS and the saved preference via `col`. Every cell
                reproduces the list it replaced: the mono number (or the amber
                "no number yet" badge until Finance issues one), title, client,
                location, the shared StatusPill for the stage, value tabular via
                `.num`, the same progress bar, the target-end date through
                fmtDate, and an Open action that pushes the project's own page.
                The whole row still opens that page too (onRowClick), the way it
                did before. A project nobody has started (stage Received) keeps
                its amber start-edge stripe — drawn as an inset box-shadow via
                getRowClassName so it costs no layout, reading the --sg-flag
                colour set on the wrapper so it flips in dark mode. The deep-link
                focus still opens the detail dialog (the useEffect above); only
                the row's brief scroll-and-ring, which client paging can't target
                across pages, is not carried over. */}
            <StudioDataGrid
              rows={gridRows}
              columns={gridColumns}
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
            />
          </section>
        </>
      )}
    </>
  );
}

// THE TWO WAYS A PROJECT BEGINS, in one dialog.
//
// From an approved quotation: the whole chain is already known, so the form
// asks for three things and the server reads the rest off the quotation.
// New client work: the studio was handed the job directly — no ticket, no RFQ,
// no quotation — so the client, the job and its figures are typed, and the
// contact and site are captured with the SAME block a new quotation captures
// them with. One block, not a poorer second copy of it.
//
// Which mode opens first is decided by what the studio actually has. A studio
// with no approved quotations used to get a dialog whose entire body said so
// and offered a Close button; it now gets the form that works.
function NewProject({ quotations, people, clients, industries, studioDefaults, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [mode, setMode] = useState(quotations.length > 0 ? "quotation" : "direct");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
        {[
          { key: "quotation", label: tr.fromApprovedQuotation },
          { key: "direct", label: tr.newClientWork },
        ].map((m) => (
          <button key={m.key} type="button" aria-pressed={mode === m.key}
            onClick={() => setMode(m.key)}
            className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${mode === m.key
              ? "bg-[var(--geex-surface)] text-brand-950 shadow-sm dark:text-white"
              : "text-slate-500 dark:text-slate-400"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "quotation"
        ? <FromQuotation quotations={quotations} people={people} busy={busy} setBusy={setBusy}
            onSave={onSave} onCancel={onCancel} />
        : <DirectProject people={people} clients={clients} industries={industries}
            studioDefaults={studioDefaults} busy={busy} setBusy={setBusy}
            onSave={onSave} onCancel={onCancel} />}
    </>
  );
}

// UNCHANGED IN BEHAVIOUR — today's form, minus the dead end. The "no approved
// quotations waiting" body is now a line inside the mode rather than the whole
// dialog, because the other mode is always available.
function FromQuotation({ quotations, people, busy, setBusy, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [quotationId, setQuotationId] = useState(quotations[0]?.id || "");
  const [managerCollaboratorId, setManager] = useState("");
  const [location, setLocation] = useState("");
  const chosen = quotations.find((q) => q.id === quotationId);

  if (quotations.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noApprovedQuotationsWaiting}</p>;
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{tr.onlyApprovedQuotationsCan}</p>
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

function DirectProject({ people, clients, industries, studioDefaults, busy, setBusy, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [f, setF] = useState({
    clientName: "", title: "", industry: "", notes: "", managerCollaboratorId: "",
    value: "", startDate: "", endDate: "",
    ...EMPTY_CLIENT_BLOCK,
    locationCountry: studioDefaults.country || "",
    locationCity: studioDefaults.city || "",
  });
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  // The client the typed name resolves to, if any — the same case-insensitive,
  // whitespace-collapsed match the ticket and the quotation use, so a name typed
  // with a stray double space is one client rather than two.
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const matched = clients.find((c) => norm(c.name) === norm(f.clientName)) || null;
  const ready = f.clientName.trim() && f.title.trim();

  async function save() {
    setBusy(true);
    const cb = clientBlockPayload(f);
    await onSave({
      ...(matched ? { clientId: matched.id } : { clientName: f.clientName.trim() }),
      title: f.title.trim(),
      industry: f.industry.trim(),
      notes: f.notes.trim(),
      value: Number(f.value) || 0,
      managerCollaboratorId: f.managerCollaboratorId,
      startDate: f.startDate, endDate: f.endDate,
      contactName: cb.contactName, contactEmail: cb.contactEmail,
      contactPhone: cb.contactPhone, contactPosition: cb.contactPosition,
      // THE SITE TRAVELS AS `site`, NOT AS `location`. The project row's own
      // `location` is a STRING — it is the list's Location column and its
      // filter — and the two would collide on one key. The site's city fills
      // it, so nothing downstream sees a new shape.
      site: cb.location,
      location: cb.location.city || cb.location.name || "",
    });
    setBusy(false);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.client} required filled={!!f.clientName}
          hint={matched ? tr.existingClient : (f.clientName.trim() ? tr.nameIsnListCreatesClient : undefined)}>
          <Combo value={f.clientName} onChange={(v) => set({ clientName: v })}
            options={clients.map((c) => c.name)} inputClassName={BARE_CONTROL} />
        </Field>

        <Field label={tr.typeIndustry} filled={!!f.industry}>
          <Combo value={f.industry} onChange={(v) => set({ industry: v })}
            options={industries} inputClassName={BARE_CONTROL} />
        </Field>

        <Field className="sm:col-span-2" label={tr.title} required value={f.title}
          onChange={(v) => set({ title: v })} />

        <Field className="sm:col-span-2" label={tr.descriptionOfTheWork} as="textarea"
          value={f.notes} onChange={(v) => set({ notes: v })} />

        <Field label={tr.projectManager} as="select" value={f.managerCollaboratorId}
          onChange={(v) => set({ managerCollaboratorId: v })}
          options={[{ value: "", label: tr.unassigned }, ...people.map((p) => ({ value: p.id, label: p.alias }))]} />

        {/* TYPED, because there is no quotation total to read it from. */}
        <Field label={tr.projectValue} type="number" min="0" value={f.value}
          onChange={(v) => set({ value: v })} />

        <Field label={tr.start} filled={!!f.startDate}>
          <StudioDate value={f.startDate} onChange={(iso) => set({ startDate: iso })} />
        </Field>
        <Field label={tr.targetEnd} filled={!!f.endDate}>
          <StudioDate value={f.endDate} onChange={(iso) => set({ endDate: iso })} />
        </Field>
      </div>

      {/* The same block a new quotation raises a client with. Positions are
          offered from the contacts this client already has — Projects has no
          contact-position vocabulary of its own, and inventing a second one to
          hold the same words is how two lists drift. */}
      <ClientBlock value={f} onChange={(patch) => set(patch)} client={matched}
        positions={[...new Set((matched?.contacts || []).map((c) => c.position).filter(Boolean))]} />

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={save}>
          {busy ? tr.creating : tr.createProject}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function ProjectDetail({ project: p, people, stages, canManage, slug, nav, onSave, onDelete, onClose }) {
  const tr = projectsDict(useStudioLocale());
  const support = supportStatus(p);
  // Location and the support period commit on blur, dates on pick — the same
  // save points the old uncontrolled inputs had. Field is controlled, so these
  // hold the edit locally and hand it to onSave at the same moment as before.
  const [loc, setLoc] = useState(p.location || "");
  const [start, setStart] = useState(p.startDate || "");
  const [end, setEnd] = useState(p.endDate || "");
  const [sup, setSup] = useState(p.supportPeriodDays ?? 365);

  // The chain this project came from. A directly-created project has none of
  // the three, and an empty strip after the "From" heading reads as a record
  // that failed to load — so the absence is named rather than left blank.
  // The nav lookup below used to read the bare pre-restructure department
  // name off the nav map (restructure.ts renamed that department to
  // crm-sales) — nav is never keyed by the retired spelling, so the link
  // could never render for anyone regardless of access. Same defect, same
  // fix, as the bracketed neighbours below (already correct because they
  // were swept), just in the dot-access shape a bracket-only check cannot
  // see. linkToTicket (studioLinks.ts) always builds a /crm-sales URL, so
  // the root key is what actually governs whether that URL opens.
  const lineage = [
    p.ticketId && { label: tr.ticket, href: linkIf(nav?.["crm-sales"], linkToTicket(slug, p.ticketId)) },
    p.rfqId && { label: "RFQ", href: linkIf(nav?.["engineering-docs-rfq"], linkToRfq(slug, p.rfqId)) },
    p.quotationNumber && { label: p.quotationNumber, href: linkIf(nav?.["crm-sales-quotations"], linkToQuotation(slug, p.quotationId)) },
    // A HANDOVER'S LINEAGE IS ONE STEP, not a chain: a won tender has no
    // ticket, RFQ or quotation behind it. `tenderRef` is the stored copy and
    // is what shows when the reader has no Tendering nav entry — the ref is
    // the number a client quotes, so it must read correctly even where the
    // link does not open.
    p.tenderRef && { label: p.tenderRef, href: linkIf(nav?.["tendering-register"], `/${slug}/tendering-register/${p.tenderId}`) },
  ].filter(Boolean);

  return (
    <>
      {/* Lineage — the chain this project came from, or "Direct" when there is none. */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-600 uppercase tracking-wide">{tr.from}</span>
        {lineage.length === 0 ? <span>{tr.direct}</span> : lineage.map((step, i, arr) => (
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
    if (emergency.length >= cap) return setEmergencyError(tr.nEmergencyVisitsAllowed(cap));
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
                  {tr.registerEmergencyVisit}
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
            ? <>{tr.thatIs} {tr.nHoursPerPerson(hours)}</>
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
          {hours > 0 ? <>{tr.thatIs} {tr.nHours(hours)}</> : tr.endTimeAfterStart}
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
          {tr.howCompletionSplits}
        </p>
        {serviceActions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400 dark:border-white/10">
            {tr.noServiceActionsYet}
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
            title={weightsOk ? "" : tr.weightsMustTotal100}>{busy ? tr.saving : tr.saveSettings}</button>
          {!weightsOk && <span className="text-sm text-rose-600 dark:text-rose-300">{tr.weightsMustTotal100}</span>}
          {saved && weightsOk && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessProjects}</p>
      )}
    </div>
  );
}
