"use client";

import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import { useProjectData, deriveProject } from "@/components/studio2/StudioProjectInfo";

// THE PROJECT HUB'S BAR — the project's name and every screen it has (tier 5).
//
// A PROJECT'S PAGE WAS ITS KANBAN, and the kanban was the only way between its
// other screens: Costs, Billing, the diary and Closure each had a back link to
// the board and nothing to each other, and "Details" opened a dialog on the
// projects list. Every one of them draws this bar now, so the project reads as
// one place with tabs rather than a board with side doors.
//
// A TAB IS DRAWN ONLY FOR SOMEBODY WHO MAY OPEN IT, from the rights the
// /projects read reports — Overview, Board and Closure answer to
// `projects.list.view` (`canViewList`), the other three to their own areas. A
// costs-only holder used to be shown a Closure link that refused them.
//
// `segment` IS WHAT THE PAGE ROUTES ON, and tests/restructure.mjs reads it out
// of this file: a tab naming a segment page.js does not handle would open
// nothing, and that is caught there rather than on screen.
export const PROJECT_TABS = [
  { key: "overview", segment: "", right: "canViewList", label: (tr) => tr.projectOverview },
  { key: "board", segment: "board", right: "canViewList", label: (tr) => tr.projectBoardTab },
  { key: "costs", segment: "costs", right: "canViewCosts", label: (tr) => tr.costBreakdown },
  { key: "billing", segment: "billing", right: "canViewBilling", label: (tr) => tr.paymentSchedule },
  { key: "reports", segment: "reports", right: "canViewReports", label: (tr) => tr.siteReports },
  { key: "closure", segment: "closure", right: "canViewList", label: (tr) => tr.closure },
];

/**
 * THE BAR ITSELF, from data the caller already holds — the board and the
 * Overview read /projects for their own panels, so they hand it over rather
 * than paying for the same read twice.
 */
export function ProjectHubBar({ slug, projectId, active, data, trailing = null, className = "" }) {
  const tr = projectsDict(useStudioLocale());
  const { project } = deriveProject(data, projectId);
  const base = `/${slug}/projects-list/${projectId}`;

  return (
    <div className={`border-b border-slate-200/70 bg-[var(--geex-surface)] dark:border-white/10 ${className}`}>
      <header className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/${slug}/projects-list`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          <span aria-hidden="true" className="rtl:-scale-x-100">←</span> {tr.projects}
        </Link>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-800 text-[var(--geex-ink)]">
            {project?.title || tr.projectBoard}
          </p>
          <p className="truncate text-xs text-[var(--geex-muted)]">
            {project?.number ? <span className="font-mono tabular-nums">{project.number}</span> : tr.noNumberYet}
            {project?.clientName ? ` · ${project.clientName}` : ""}
          </p>
        </div>
        {trailing ? <div className="ms-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </header>
      {data && (
        <nav aria-label={tr.projectTabs} className="flex gap-1 overflow-x-auto px-4 pb-2">
          {PROJECT_TABS.filter((t) => Boolean(data[t.right])).map((t) => {
            const current = t.key === active;
            return (
              <Link
                key={t.key}
                href={t.segment ? `${base}/${t.segment}` : base}
                aria-current={current ? "page" : undefined}
                className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 font-display text-sm font-600 transition-colors ${current
                  ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-[var(--geex-muted)] hover:bg-slate-100 hover:text-[var(--geex-ink)] dark:hover:bg-white/5"}`}
              >
                {t.label(tr)}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** The bar for a screen that does not otherwise read /projects. */
export default function ProjectHubTabs({ slug, projectId, active, trailing = null }) {
  const { data } = useProjectData(slug);
  return <ProjectHubBar slug={slug} projectId={projectId} active={active} data={data} trailing={trailing} className="-mx-1 rounded-geex border" />;
}
