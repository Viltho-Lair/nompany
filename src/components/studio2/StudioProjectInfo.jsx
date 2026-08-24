"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, fmtDate } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";
import { Money } from "@/components/Currency";

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
  // The project's client, read from Sales (the projects payload joins it), so the
  // client box can draw the same logo and contacts the Sales ticket shows.
  const client = (data?.clients || []).find((c) => c.id === project?.clientId) || null;
  return { project, people, currency, nav, mine, hasSheet, lineCount, client };
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

// THE CLIENT BOX — the company this project is for, drawn the same way the Sales
// ticket profile draws it: logo (initials when there is none), name, and the
// primary contact. The client is read from Sales through the projects payload,
// so this is one reading of that record, not a second copy. Falls back to the
// project's own clientName when the viewer has no Sales grant to read the rest.
export function ClientSection({ client, clientName }) {
  const name = client?.name || clientName || "";
  const contact = (client?.contacts || [])[0] || {};
  const hasContact = contact.name || contact.phone || contact.email;
  return (
    <section className={card}>
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-24 w-32 items-center justify-center overflow-hidden rounded-geex border border-slate-200/70 bg-white p-2 dark:border-white/10 dark:bg-white/5">
          {client?.logo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={client.logo} alt="" className="h-full w-full object-contain" />
            : <span className="font-display text-2xl font-800 text-brand-700 dark:text-brand-300">
                {(name || "?").slice(0, 2).toUpperCase()}
              </span>}
        </span>
        <p className="mt-2 font-600 text-slate-900 dark:text-white">{name || "—"}</p>
      </div>
      {hasContact && (
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <Field label="Contact person" value={contact.name} />
          <Field label="Number" value={contact.phone} />
          <Field label="Email" value={contact.email} />
        </dl>
      )}
    </section>
  );
}

// ---- helpers ---------------------------------------------------------------

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
