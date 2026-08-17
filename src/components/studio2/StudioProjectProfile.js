"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { panel, h2, sub, btnGhost, fmtDate, Empty } from "@/components/studio2/ui";
import { Money } from "@/components/Currency";
import { linkToTicket, linkToRfq, linkToQuotation, linkIf } from "@/lib/studioLinks";

// ONE PROJECT, on its own page — the same shape the sales ticket has, and for
// the same reason: a project is the end of a chain, and a dialog over a list
// cannot show a chain. Its ticket, its RFQ, its quotation, its sheets, its
// milestones and its money all belong on one screen.
//
// EVERY UPSTREAM RECORD IS A KEY, NOT A COPY. The row carries ticketId, rfqId
// and quotationId, and this page follows them: the client's name, the ticket's
// title, the quotation's number and its lines are read back through those ids
// on every load. Nothing here is a second answer that can age.
//
// It reads ONE endpoint — the same /projects the list does — because a project
// is one row of a list that already loads with everything hanging off it.

const card = `${panel} min-h-0`;

const STAGE_TONE = {
  Received: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "In Progress": "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "On Hold": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export default function StudioProjectProfile({ slug, projectId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Projects in this studio."); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "projects", load);
  // The number arrives from FINANCE, on the Tasks board, when they sign the PO —
  // so this page listens for it rather than making somebody reload to find out.
  useLiveUpdates(slug, "tasks", load);

  const project = data?.projects?.find((p) => p.id === projectId) || null;
  const people = useMemo(
    () => Object.fromEntries((data?.directory?.people || []).map((p) => [p.id, p.alias])),
    [data],
  );

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading project…</p>;
  if (!project) {
    return (
      <div className="space-y-4">
        <Back slug={slug} />
        <p className={`${panel} text-sm text-slate-500`}>That project no longer exists.</p>
      </div>
    );
  }

  const currency = data.studioDefaults?.currency || "";
  const nav = data.nav || {};
  // The project's Main sheet is what this side reads — the quotation as it was
  // sold. Bulk is a procurement view and belongs to Inventory.
  const mine = (data.sheets || []).filter((s) => s.projectId === projectId);
  const hasSheet = mine.length > 0;
  const lineCount = (mine.find((s) => s.kind === "main") || mine[0])?.lineCount || 0;
  const done = (project.milestones || []).filter((m) => m.done).length;

  return (
    <div className="space-y-4">
      <Back slug={slug} number={project.number} title={project.title} clientName={project.clientName} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---- left ---- */}
        <div className="space-y-4">
          <section className={card}>
            <h2 className={h2}>Project</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {/* BLANK UNTIL FINANCE ISSUES IT, and said so rather than shown
                  as an empty cell — a project without a number is a normal
                  state here, not a missing value. */}
              <Field label="Number" value={project.number || <span className="text-amber-700 dark:text-amber-300">Not issued yet</span>} mono />
              <Field label="Stage" value={<span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STAGE_TONE[project.stage] || ""}`}>{project.stage}</span>} />
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

          {/* THE PROJECT'S OWN QUOTATION VIEWER. What was sold, line by line,
              without prices — and beside each line what Projects has recorded
              against it and what Inventory has. The SHEETS themselves belong to
              Inventory and are worked there; this is the same rows read from
              this side. */}
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
        </div>

        {/* ---- right: WHERE THIS PROJECT CAME FROM ---- */}
        <div className="space-y-4">
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
        </div>
      </div>
    </div>
  );
}

function Lineage({ label, value, href }) {
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

function Field({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-800 dark:text-slate-100 ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function Back({ slug, number, title, clientName }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/${slug}/projects-list`} className={btnGhost}>← Projects</Link>
      {title && (
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">{title}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {number ? <span className="font-mono">{number}</span> : "No number yet"}
            {clientName ? ` · ${clientName}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
