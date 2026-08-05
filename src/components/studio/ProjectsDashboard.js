"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionSchemas } from "@/lib/adminSchemas";
import EntityForm from "@/components/studio/EntityForm";
import { Icon } from "@/components/studio/icons";
import { PROJECT_STAGES } from "@/lib/projectKpis";
import { supportStatus, allVisits, fmtDate } from "@/lib/sla";
import { unreadCount } from "@/lib/updates";

// Small red "updates" pill shown next to a project name.
function UpdatePill({ n }) {
  if (!n) return null;
  return <span className="inline-flex min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-700 leading-none text-white" title={`${n} update${n === 1 ? "" : "s"}`}>{n}</span>;
}

const STAGE_ACCENT = {
  Received: "text-slate-500 dark:text-slate-400",
  "In Progress": "text-amber-600 dark:text-amber-400",
  Completed: "text-emerald-600 dark:text-emerald-400",
};

const card = "rounded-geex border border-slate-200/70 shadow-geex-sm bg-white p-5 dark:border-white/10 dark:bg-[#20202c]";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950";
const btnOutline =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-500/40 px-4 py-2.5 font-display text-sm font-600 text-brand-700 transition-colors hover:bg-brand-500/10 dark:text-brand-300";

// Human-friendly date range that doesn't stutter with em-dashes when the
// project has no dates yet ("— → —" was hard to parse at a glance).
function dateRange(start, end) {
  if (!start && !end) return "Not scheduled";
  if (start && !end) return `Starts ${fmtDate(start)}`;
  if (!start && end) return `Ends ${fmtDate(end)}`;
  return `${fmtDate(start)} → ${fmtDate(end)}`;
}

// Newest project by the timestamp embedded in its generated id (makeId).
function latestOf(projects) {
  if (projects.length === 0) return null;
  return [...projects].sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
}

function SupportTag({ project }) {
  const s = supportStatus(project);
  if (!s.known) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">Support not set</span>;
  if (s.inSupport)
    return <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-600 text-white">Support: {s.daysRemaining}d left</span>;
  return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-600 text-red-700 dark:bg-red-500/20 dark:text-red-300">Support ended</span>;
}

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState([]);
  const [slas, setSlas] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // 'project' | 'sla' | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, meRes] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/slas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/users/me", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      const me = meRes?.user || null;
      setMe(me);
      const tags = Array.isArray(me?.tags) ? me.tags : [];
      // Admins and Leaders see every project; a plain project manager sees only
      // the projects they own.
      const seeAll = !me || tags.includes("admin") || tags.includes("Leader");
      const all = Array.isArray(p) ? p : [];
      setProjects(seeAll ? all : all.filter((x) => x.ownerId === me.id));
      setSlas(Array.isArray(s) ? s : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const latest = useMemo(() => latestOf(projects), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.title_en || ""} ${p.title_ar || ""}`.toLowerCase().includes(q));
  }, [projects, query]);

  // Nearest 5 upcoming, not-yet-completed SLA visits across all contracts —
  // planned and emergency together.
  const upcomingVisits = useMemo(() => {
    const all = [];
    for (const sla of slas) {
      const proj = projectsById[sla.projectId];
      for (const v of allVisits(sla)) {
        if (v.completed || v.daysRemaining < 0) continue;
        all.push({ key: `${sla.id}-${v.emergency ? "e" + v.id : v.index}`, name: sla.title || proj?.title_en || "SLA", visit: v });
      }
    }
    return all.sort((a, b) => a.visit.daysRemaining - b.visit.daysRemaining).slice(0, 5);
  }, [slas, projectsById]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of registered projects and their SLA schedules.</p>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setModal("project")} className={btnPrimary}>+ Create project</button>
          <button onClick={() => setModal("sla")} className={btnOutline}>+ Create SLA</button>
        </div>
      </div>

      {/* Kanban board — projects by stage */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {PROJECT_STAGES.map((stage) => {
          const col = projects.filter((p) => (p.stage || "Received") === stage);
          return (
            <div key={stage} className="rounded-geex border border-slate-200/70 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#191921]">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`text-xs font-700 uppercase tracking-wide ${STAGE_ACCENT[stage] || ""}`}>{stage}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-slate-400">No projects</p>
                ) : col.map((p) => (
                  <Link key={p.id} href={`/studio/projects/list/${p.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-brand-400 hover:bg-brand-500/5 dark:border-white/10 dark:bg-[#20202c] dark:hover:border-brand-400/50">
                    <div className="flex min-w-0 items-center gap-1.5 font-600 text-slate-800 dark:text-slate-100"><span className="truncate">{p.title_en || p.title_ar || "Untitled"}</span><UpdatePill n={unreadCount(p.log, p.id, me)} /></div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className={`${card} text-center text-sm text-slate-400`}>Loading…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Projects registered */}
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Projects registered</p>
            <p className="mt-2 font-display text-4xl font-800 text-slate-900 dark:text-white">{projects.length}</p>
          </div>

          {/* Latest project */}
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Latest project registered</p>
            {latest ? (
              <div className="mt-2">
                <p className="font-display text-lg font-700 text-slate-900 dark:text-white">{latest.title_en || latest.title_ar || "Untitled"}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {dateRange(latest.startDate, latest.endDate)}
                </p>
                <div className="mt-2">
                  <SupportTag project={latest} />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No projects yet.</p>
            )}
          </div>

          {/* Closest SLA visits */}
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Closest SLA visits</p>
            {upcomingVisits.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No upcoming visits.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcomingVisits.map((u) => (
                  <li key={u.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate text-slate-700 dark:text-slate-200">
                      <span className="truncate">{u.name} · {u.visit.emergency ? "emergency" : `visit ${u.visit.index}`}</span>
                      {u.visit.emergency && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">SOS</span>
                      )}
                    </span>
                    <span className="shrink-0 font-600 text-brand-700 dark:text-brand-300">{u.visit.daysRemaining}d</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Project list with search */}
          <div className={`${card} lg:col-span-3`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Projects</p>
              <input
                type="search"
                placeholder="Search projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No projects match.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <Link href={`/studio/projects/list/${p.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-brand-500/5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-600 text-slate-800 dark:text-slate-100"><span className="truncate">{p.title_en || p.title_ar || "Untitled"}</span><UpdatePill n={unreadCount(p.log, p.id, me)} /></p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {dateRange(p.startDate, p.endDate)}
                        </p>
                      </div>
                      <SupportTag project={p} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {modal === "project" && (
        <EntityForm title="Create project" collection="projects" schema={collectionSchemas.projects} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal === "sla" && (
        <EntityForm title="Create SLA contract" collection="slas" schema={collectionSchemas.slas} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  );
}
