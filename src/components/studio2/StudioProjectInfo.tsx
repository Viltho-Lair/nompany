"use client";

import { useCallback, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, fmtDate } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";
import { useReload } from "@/components/studio2/useReload";
import type { ReactNode } from "react";
import type {
  listProjects, approvedQuotations, projectPeople, listProjectClients, listOvertimes,
  overtimeDirectory, readProjectsSettings, PROJECT_STAGES,
} from "@/modules/projects/projects";
import type { listProjectSheets } from "@/modules/inventory/inventory";
import type { sectionNav, manageMap } from "@/lib/studios";

// THE /projects GET BODY, field by field from the services its route returns
// (src/app/api/studios/[slug]/projects/route.ts). The route wraps a plain
// object, so there is no single function to take the return type of; each
// field is derived from the one that answers it instead.
//
// THREE FIELDS ARE NARROWED HERE rather than derived, because their services
// build them from rows whose type is open: `projectPeople` and
// `overtimeDirectory` map `listCollaborators` rows (every value `unknown`),
// `approvedQuotations` maps stored quotation rows the same way, and `Overtime`
// is a loose schema that does not declare the names `createOvertime` stamps on
// each entry. The values are the strings named below.
type DirectoryPerson = { id: string; alias: string; departmentId: string; departmentName: string };
export type ProjectsBody = {
  canManage: boolean;
  canViewDashboard: boolean;
  canManageList: boolean;
  canWriteInventoryColumns: boolean;
  canManageOvertimes: boolean;
  canManageSettings: boolean;
  canViewList: boolean;
  canRequisition: boolean;
  canViewCosts: boolean;
  canViewBilling: boolean;
  canViewReports: boolean;
  nav: ReturnType<typeof sectionNav>;
  manage: ReturnType<typeof manageMap>;
  projects: Awaited<ReturnType<typeof listProjects>>;
  sheets: Awaited<ReturnType<typeof listProjectSheets>>;
  approvedQuotations: (Omit<Awaited<ReturnType<typeof approvedQuotations>>[number], "id" | "number" | "total" | "clientName">
    & { id: string; number: string; total: number; clientName: string })[];
  people: (Omit<Awaited<ReturnType<typeof projectPeople>>[number], "id" | "alias"> & { id: string; alias: string })[];
  clients: Awaited<ReturnType<typeof listProjectClients>>;
  overtimes: (Awaited<ReturnType<typeof listOvertimes>>[number] & {
    projectName?: string; personName?: string; departmentName?: string; from?: string; to?: string;
  })[];
  directory: Omit<Awaited<ReturnType<typeof overtimeDirectory>>, "people"> & { people: DirectoryPerson[] };
  settings: ReturnType<typeof readProjectsSettings>;
  // `currency` is not sent by the route today; deriveProject reads it anyway.
  studioDefaults: { country: string; city: string; currency?: string };
  vocabulary: { stages: typeof PROJECT_STAGES; industries: string[] };
};
export type ProjectRow = ProjectsBody["projects"][number];
export type ProjectClient = ProjectsBody["clients"][number];

// ONE PROJECT'S INFORMATION, in one place. This used to live inline in
// StudioProjectProfile.js; it was lifted out so the full-screen project board
// (StudioProjectBoard) can show the SAME project facts in its right sidebar
// without a second copy that drifts (house rule: never duplicate). Both the
// legacy profile and the board read the one /projects endpoint a project is a
// row of, and render these sections from it.
//
// EVERY UPSTREAM RECORD IS A KEY, NOT A COPY — the row carries ticketId, rfqId
// and quotationId, and the lineage section follows them.

// SHRINK-0, NOT MIN-H-0. The board's sidebar is a scrolling flex COLUMN, and
// `min-h-0` let the column squeeze each box below its own content instead of
// scrolling. A panel does not clip, so each box drew over the one below it: the
// client's email under the Project box, and the "Create project plan" button
// under What was sold (the owner's screenshot, 12/10/2026).
const card = `${panel} shrink-0`;
// THE BOARD'S SIDEBAR IS NARROW, so its boxes are DENSE: 16px of padding rather
// than the panel's 24, a smaller title, and every fact on one row, label at the
// start and value at the end, so the three boxes line up with one another. The
// Overview tab keeps the roomy layout, because its Project box is wide.
const denseCard = "shrink-0 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10";
const denseH2 = "font-display text-base font-800 text-[var(--geex-ink)]";

// ---- data ------------------------------------------------------------------
// The board and the legacy profile both need the projects payload plus the two
// live channels a project changes on (its own, and Approvals — the number
// arrives when the client's PO is approved). One hook, one fetch.
//
// `initial` is that payload when the studio page already answered it in its own
// render; the first fetch is then skipped, and every reload is as before.
export function useProjectData(slug: string, initial?: ProjectsBody) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState<ProjectsBody | null>(initial ?? null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessProjectsStudio); return; }
    setData(await res.json());
  }, [slug, tr]);

  useReload(load, initial);
  useLiveUpdates(slug, "projects", load);
  // An approved Client PO issues the project number shown here.
  useLiveUpdates(slug, "approvals", load);

  return { data, error, reload: load };
}

// Pure derivation — no React — so the same numbers reach both surfaces.
export function deriveProject(data: ProjectsBody | null | undefined, projectId: string) {
  const project = data?.projects?.find((p) => p.id === projectId) || null;
  const people = Object.fromEntries(
    (data?.directory?.people || []).map((p) => [p.id, p.alias]),
  );
  const currency = data?.studioDefaults?.currency || "";
  const nav = data?.nav || {};
  // The project's Main sheet is what this side reads — the quotation as it was
  // sold. Bulk is a procurement view and belongs to Inventory.
  const mine = (data?.sheets || []).filter((s) => s.projectId === projectId);
  const hasSheet = mine.length > 0;
  const lineCount = (mine.find((s) => s.kind === "main") || mine[0])?.lineCount || 0;
  // The project's client, read from Sales (the projects payload joins it), so the
  // client box can draw the same logo and contacts the Sales ticket shows.
  const client = (data?.clients || []).find((c) => c.id === project?.clientId) || null;
  return { project, people, currency, nav, mine, hasSheet, lineCount, client };
}

// ---- sections --------------------------------------------------------------

// `action` is the decision this box leads to — the project plan button, handed
// in by the board rather than imported here, so the information module stays
// clear of the plans API. It reads facts first and the thing to do last.
export function ProjectSection({ project, people, action = null, dense = false }: {
  project: ProjectRow;
  people: Record<string, string>;
  action?: ReactNode;
  dense?: boolean;
}) {
  const tr = projectsDict(useStudioLocale());
  // `receivedDate` is stamped at create (openProject) but is not declared on ProjectSchema.
  const received = (project as ProjectRow & { receivedDate?: string }).receivedDate;
  if (dense) return (
    <section className={denseCard}>
      {/* The stage rides in the header: it is the fact read first. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className={denseH2}>{tr.project}</h2>
        <StatusPill kind="project" status={project.stage} />
      </div>
      <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-white/10">
        <Row label={tr.number} value={project.number
          ? <span className="font-mono">{project.number}</span>
          : <span className="text-amber-700 dark:text-amber-300">{tr.notIssuedYet}</span>} />
        <Row label={tr.handler} value={people[project.managerCollaboratorId] || tr.unassigned2} />
        <Row label={tr.progress} value={<span className="font-mono">{`${project.progress ?? 0}%`}</span>} />
        <Row label={tr.received} value={fmtDate(received)} />
        <Row label={tr.start} value={fmtDate(project.startDate)} />
        <Row label={tr.end} value={fmtDate(project.endDate)} />
        <Row label={tr.site} value={project.location} />
      </dl>
      {project.notes && (
        <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
          {project.notes}
        </p>
      )}
      {action && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">{action}</div>}
    </section>
  );
  return (
    <section className={card}>
      <h2 className={h2}>{tr.project}</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {/* BLANK UNTIL FINANCE ISSUES IT, and said so rather than shown as an
            empty cell — a project without a number is a normal state here. */}
        <Field label={tr.number} value={project.number || <span className="text-amber-700 dark:text-amber-300">{tr.notIssuedYet}</span>} mono />
        <Field label={tr.stage} value={<StatusPill kind="project" status={project.stage} />} />
        <Field label={tr.handler} value={people[project.managerCollaboratorId] || tr.unassigned2} />
        {/* NOT VALUE. What a project is worth is Finance's figure and Finance's
            screen; a project box that carries it invites the number to be read
            (and quoted) from a place nothing reconciles. Progress stands here
            instead — it was on the left rail that this box absorbed, and it
            would otherwise have gone with it. */}
        <Field label={tr.progress} value={`${project.progress ?? 0}%`} mono />
        <Field label={tr.received} value={fmtDate(received)} />
        <Field label={tr.start} value={fmtDate(project.startDate)} />
        <Field label={tr.end} value={fmtDate(project.endDate)} />
        <Field label={tr.site} value={project.location} />
      </dl>
      {project.notes && (
        <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
          {project.notes}
        </p>
      )}
      {action && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">{action}</div>
      )}
    </section>
  );
}

export function WhatWasSoldSection({ slug, projectId, hasSheet, lineCount, dense = false }: {
  slug: string; projectId: string; hasSheet: boolean; lineCount: number; dense?: boolean;
}) {
  const tr = projectsDict(useStudioLocale());
  return (
    <section className={dense ? denseCard : card}>
      <h2 className={dense ? denseH2 : h2}>{tr.whatSold}</h2>
      {!hasSheet ? (
        <p className={sub}>
          {tr.nothingToShowQuotationLines}
        </p>
      ) : (
        <Link href={`/${slug}/projects-list/${projectId}/quotation`}
          className={`mt-3 flex items-center gap-3 rounded-xl border border-slate-200/70 text-sm transition-colors hover:border-brand-500 hover:bg-slate-50 dark:border-white/10 dark:hover:border-brand-500/40 dark:hover:bg-white/5 ${dense ? "px-3 py-2.5" : "px-4 py-3"}`}>
          {/* The title over its count, and the arrow centred beside BOTH. With
              flex-wrap the count dropped to its own line and left the arrow
              alone in the corner. */}
          <span className="min-w-0 flex-1">
            <span className="block font-600 text-slate-900 dark:text-white">{tr.openQuotationViewer}</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{tr.soldLines(lineCount)}</span>
          </span>
          <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-400 rtl:-scale-x-100" />
        </Link>
      )}
    </section>
  );
}

// THE CLIENT BOX — the company this project is for, drawn the same way the Sales
// ticket profile draws it: logo (initials when there is none), name, and the
// primary contact. The client is read from Sales through the projects payload,
// so this is one reading of that record, not a second copy. Falls back to the
// project's own clientName when the viewer has no Sales grant to read the rest.
export function ClientSection({ client, clientName, dense = false }: { client: ProjectClient | null; clientName?: string; dense?: boolean }) {
  const tr = projectsDict(useStudioLocale());
  const name = client?.name || clientName || "";
  const contact = (client?.contacts || [])[0] || {};
  const hasContact = contact.name || contact.phone || contact.email;
  return (
    <section className={dense ? denseCard : card}>
      {/* A HEADER, NOT A POSTER. The logo was a 128×96 tile above a centred name,
          which took a third of the sidebar before a single fact. It sits beside
          the name now, at the size the Sales list draws it. */}
      <div className="flex items-center gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/70 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          {client?.logo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={client.logo} alt="" className="h-full w-full object-contain" />
            : <span className="font-display text-base font-800 text-brand-700 dark:text-brand-300">
                {(name || "?").slice(0, 2).toUpperCase()}
              </span>}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.client}</p>
          <p className="truncate font-600 text-slate-900 dark:text-white">{name || "—"}</p>
        </div>
      </div>
      {hasContact && (
        <dl className={`space-y-2 border-t border-slate-100 dark:border-white/10 ${dense ? "mt-3 pt-3" : "mt-4 pt-4"}`}>
          <Row label={tr.contactPerson} value={contact.name} />
          <Row label={tr.number} value={contact.phone ? <a href={`tel:${contact.phone}`} dir="ltr" className="hover:text-brand-600">{contact.phone}</a> : ""} />
          <Row label={tr.email} value={contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-brand-600">{contact.email}</a> : ""} />
        </dl>
      )}
    </section>
  );
}

// A label beside its value, on one row: the client box's contact, and every
// fact of a dense Project box. Stacked label-over-value pairs were most of the
// height of the board's sidebar, and most of that height was dashes.
function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 truncate text-end text-sm text-slate-800 dark:text-slate-100">
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

export function Field({ label, value, mono }: { label: ReactNode; value: ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-800 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
