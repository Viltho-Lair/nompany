"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { field } from "@/lib/i18n";
import { projectSlug } from "@/lib/slug";

// Editorial projects index: category filter chips + an image-forward card grid.
// Each card links to the project's detail page.
export default function ProjectsExplorer({ locale, dict, projects = [], servicesById = {} }) {
  const [active, setActive] = useState("all");

  const withMeta = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        slug: projectSlug(p),
        categoryLabel: servicesById[p.category] || p.category || "",
      })),
    [projects, servicesById]
  );

  const categories = useMemo(() => {
    const set = [];
    for (const p of withMeta) if (p.categoryLabel && !set.includes(p.categoryLabel)) set.push(p.categoryLabel);
    return set;
  }, [withMeta]);

  const shown = active === "all" ? withMeta : withMeta.filter((p) => p.categoryLabel === active);

  const chip = (isOn) =>
    `rounded-full px-4 py-2 font-display text-xs font-600 uppercase tracking-[0.12em] transition-colors ${
      isOn
        ? "bg-brand-700 text-white"
        : "border border-steel-400/30 text-steel-700 hover:border-brand-500 hover:text-brand-700 dark:border-white/15 dark:text-slate-300 dark:hover:text-white"
    }`;

  return (
    <section className="container-page py-14 sm:py-16">
      {/* Filter chips */}
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2.5">
          <button onClick={() => setActive("all")} className={chip(active === "all")}>{dict.common.filterAll}</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setActive(c)} className={chip(active === c)}>{c}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-16 text-center text-sm text-steel-500 dark:text-slate-400">{dict.projects.empty || "No projects yet."}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/projects/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-steel-400/15 bg-white transition-all hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_30px_60px_-35px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-950 via-brand-700 to-brand-500">
                {p.image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent" />
                  </>
                )}
                {p.categoryLabel && (
                  <span className="absolute start-4 top-4 rounded-full bg-white/15 px-3 py-1 font-display text-[10px] font-600 uppercase tracking-[0.14em] text-white backdrop-blur">
                    {p.categoryLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-display text-xl font-700 uppercase tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                  {field(p, "title", locale)}
                </h2>
                {(field(p, "location", locale) || p.year) && (
                  <p className="mt-1.5 font-display text-xs font-600 uppercase tracking-[0.1em] text-brand-500 dark:text-brand-300">
                    {[field(p, "location", locale), p.year].filter(Boolean).join(" · ")}
                  </p>
                )}
                {field(p, "desc", locale) && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-steel-700 dark:text-slate-300">{field(p, "desc", locale)}</p>
                )}
                <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-700 uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                  {dict.common.viewProject}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
