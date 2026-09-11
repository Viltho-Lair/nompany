"use client";

import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { InfoPanelSkeleton } from "@/components/studio2/RecordSkeleton";
import { projectsDict } from "@/shared/studio/projects";
import { ProjectHubBar } from "@/components/studio2/ProjectHubTabs";
import {
  useProjectData,
  deriveProject,
  ClientSection,
  ProjectSection,
  WhatWasSoldSection,
} from "@/components/studio2/StudioProjectInfo";

// A PROJECT'S OWN PAGE — the hub's first tab (tier 5).
//
// THERE WAS NO SUCH PAGE. `/projects-list/<id>` was the kanban, and "Details"
// opened a dialog on the projects list through a query string. The facts the
// board kept in its sidebar — the client, the project box, what was sold — are
// the page now, drawn from the same panels so the two cannot describe one
// project differently. Editing still happens in the list's dialog, which is
// where stage, manager, dates and delete already live; this links to it rather
// than growing a second editor.
export default function StudioProjectOverview({ slug, projectId }) {
  const tr = projectsDict(useStudioLocale());
  const { data, error } = useProjectData(slug);
  const { project, people, hasSheet, lineCount, client } = deriveProject(data, projectId);

  const edit = data?.canManageList && project ? (
    <Link
      href={`/${slug}/projects-list?project=${encodeURIComponent(projectId)}`}
      className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3.5 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
    >
      {tr.editDetails}
    </Link>
  ) : null;

  return (
    <div className="space-y-6">
      <ProjectHubBar slug={slug} projectId={projectId} active="overview" data={data} trailing={edit} className="-mx-1 rounded-geex border" />
      {error && !data ? (
        <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
      ) : !data ? (
        <InfoPanelSkeleton loadingLabel={tr.loadingProject} />
      ) : !project ? (
        <p className="text-sm text-slate-500">{tr.projectNoLongerExists}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <ProjectSection project={project} people={people} />
            <WhatWasSoldSection slug={slug} projectId={projectId} hasSheet={hasSheet} lineCount={lineCount} />
          </div>
          <ClientSection client={client} clientName={project.clientName} />
        </div>
      )}
    </div>
  );
}
