"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { panel, h2, sub, fmtDate } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";
import { Money } from "@/components/Currency";
import { linkToTicket, linkToRfq, linkToQuotation, linkIf } from "@/modules/main/studioLinks";

// ONE PROJECT'S INFORMATION, in one place. This used to live inline in
// StudioProjectProfile.js; it was lifted out so the full-screen project board
// (StudioProjectBoard) can show the SAME project facts in its right sidebar
// without a second copy that drifts (house rule: never duplicate). Both the
// legacy profile and the board read the one /projects endpoint a project is a
// row of, and render these sections from it.
//
// EVERY UPSTREAM RECORD IS A KEY, NOT A COPY — the row carries ticketId, rfqId
// and quotationId, and the lineage section follows them.

const card = `${panel} min-h-0`;

// ---- data ------------------------------------------------------------------
// The board and the legacy profile both need the projects payload plus the two
// live channels a project changes on (its own, and Tasks — the number arrives
// from FINANCE on the Tasks board when they sign the PO). One hook, one fetch.
export function useProjectData(slug) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Projects in this studio."); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "projects", load);
  useLiveUpdates(slug, "tasks", load);

  return { data, error, reload: load };
}

// Pure derivation — no React — so the same numbers reach both surfaces.
export function deriveProject(data, projectId) {
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
  const done = (project?.milestones || []).filter((m) => m.done).length;
  return { project, people, currency, nav, mine, hasSheet, lineCount, done };
}

// ---- sections --------------------------------------------------------------

export function ProjectSection({ project, people, currency }) {
  return (
    <section className={card}>
      <h2 className={h2}>Project</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {/* BLANK UNTIL FINANCE ISSUES IT, and said so rather than shown as an
            empty cell — a project without a number is a normal state here. */}
        <Field label="Number" value={project.number || <span className="text-amber-700 dark:text-amber-300">Not issued yet</span>} mono />
        <Field label="Stage" value={<StatusPill kind="project" status={project.stage} />} />
        <Field label="Handler" value={people[project.managerCollaboratorId] || "Unassigned"} />
        <Field label="Value" value={project.value ? <Money amount={project.value} currency={currency} /> : ""} />
        <Field label="Received" value={fmtDate(project.receivedDate)} />
        <Field label="Start" value={fmtDate(project.startDate)} />
        <Field label="End" value={fmtDate(project.endDate)} />
        <Field label="Site" value={project.location} />
      </dl>
      {project.notes && (
        <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
          {project.notes}
        </p>
      )}
    </section>
  );
}

export function WhatWasSoldSection({ slug, projectId, hasSheet, lineCount }) {
  return (
    <section className={card}>
      <h2 className={h2}>What was sold</h2>
      {!hasSheet ? (
        <p className={sub}>
          Nothing to show yet — the quotation&apos;s lines appear here once a project is opened from an
          approved quotation.
        </p>
      ) : (
        <Link href={`/${slug}/projects-list/${projectId}/quotation`}
          className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 px-4 py-3 text-sm transition-colors hover:border-brand-500 hover:bg-slate-50 dark:border-white/10 dark:hover:border-brand-500/40 dark:hover:bg-white/5">
          <span className="font-600 text-slate-900 dark:text-white">Open the quotation viewer</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {lineCount} {lineCount === 1 ? "line" : "lines"} · installation and programming are yours to mark
          </span>
          <Icon name="chevronRight" className="ms-auto h-4 w-4 shrink-0 text-slate-300 rtl:-scale-x-100" />
        </Link>
      )}
    </section>
  );
}

export function MilestonesSection({ project, done }) {
  return (
    <section className={card}>
      <h2 className={h2}>Milestones</h2>
      {(project.milestones || []).length === 0 ? (
        <p className={sub}>None set.</p>
      ) : (
        <>
          <p className={sub}>{done} of {project.milestones.length} done · {project.progress}%</p>
          <ul className="mt-3 space-y-1.5">
            {project.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-700 ${
                  m.done ? "bg-emerald-500 text-white" : "border border-slate-300 dark:border-white/25"}`}>
                  {m.done ? "✓" : ""}
                </span>
                <span className={m.done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}>{m.name}</span>
                {m.doneAt && <span className="text-xs text-slate-400">{fmtDate(m.doneAt.slice(0, 10))}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function LineageSection({ slug, project, nav = {} }) {
  return (
    <section className={card}>
      <h2 className={h2}>Where it came from</h2>
      <p className={sub}>
        Each of these is a key on this project, not a copy — every name and number below is read
        back through it.
      </p>
      <dl className="mt-4 space-y-3">
        <Lineage label="Sales ticket" value={project.ticketRef || project.ticketId}
          href={linkIf(nav.sales, linkToTicket(slug, project.ticketId))} />
        <Lineage label="RFQ" value={project.rfqId ? "Raised" : ""}
          href={linkIf(nav.technical, linkToRfq(slug, project.rfqId))} />
        <Lineage label="Quotation" value={project.quotationNumber}
          href={linkIf(nav.technical, linkToQuotation(slug, project.quotationId))} />
        <Lineage label="Client" value={project.clientName} />
      </dl>
    </section>
  );
}

// ---- helpers ---------------------------------------------------------------

export function Lineage({ label, value, href }) {
  return (
    <div>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {!value ? <span className="text-slate-400">—</span>
          : href ? <RecordLink href={href} title={`Open the ${label.toLowerCase()}`}>{value}</RecordLink>
          : <span className="text-slate-700 dark:text-slate-200">{value}</span>}
      </dd>
    </div>
  );
}

export function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-800 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
