"use client";

import { useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { Icon } from "@/components/studio2/icons";
import { panel, h2, sub, microLabel, money, fmtDate, StatTile } from "@/components/studio2/ui";
import MainDashboard from "@/components/studio2/MainDashboard";
import { mainDict } from "@/shared/studio/main";
import { sectionName } from "@/shared/studio/sections";
import { useStudioLocale as useLocale } from "@/components/studio2/locale";

// MAIN — the studio's front door: what is happening across the whole place, for
// the person looking at it.
//
// Every figure comes from a section this person can actually see. A tile for a
// section they were not granted is ABSENT, not zero — a zero would be a claim
// about a place they have no access to, and the API does not even read it.

const FEED_ICON = { ticket: "ticket", quotation: "report", project: "blueprint", task: "checkDouble" };

export default function StudioMain({ slug }) {
  const locale = useLocale();
  const tr = mainDict(locale);
  // The feed names the KIND of record that moved. A fixed four, defined by the
  // code and not by any tenant, so they translate.
  const FEED_WORD = { ticket: tr.feedTicket, quotation: tr.feedQuotation, project: tr.feedProject, task: tr.feedTask };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/main`, { cache: "no-store" });
    if (!res.ok) { setError(tr.loadFailed); return; }
    setData(await res.json());
  }, [slug, tr]);
  useEffect(() => { load(); }, [load]);
  // The front door reflects every desk, so it watches the busiest of them.
  useLiveUpdates(slug, "crm-sales", load);
  useLiveUpdates(slug, "tasks", load);
  useLiveUpdates(slug, "projects", load);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { studio, me, headlines, recent, sections, nav, executive } = data;
  const href = (key) => (nav?.[key] ? `/${slug}/${key}` : "");

  // Only the figures this person is entitled to. `null` means the section was
  // never read, so the tile simply is not here.
  const tiles = [
    { key: "tasks", label: tr.needsYou, value: headlines.awaitingMe, tone: headlines.awaitingMe > 0 ? "text-brand-700 dark:text-brand-300" : "" },
    { key: "crm-sales-tickets", label: tr.openTickets, value: headlines.openTickets },
    { key: "engineering-docs-rfq", label: tr.openRfqs, value: headlines.openRfqs },
    { key: "crm-sales-quotations", label: tr.liveQuotations, value: headlines.liveQuotations },
    { key: "projects-list", label: tr.projectsRunning, value: headlines.liveProjects },
    { key: "finance-cash", label: tr.outstanding, value: headlines.outstanding === null ? null : money(headlines.outstanding) },
    { key: "inventory-stock", label: tr.trackedItems, value: headlines.lowStock },
    { key: "hr-employees", label: tr.headcount, value: headlines.headcount },
  ].filter((tile) => tile.value !== null && tile.value !== undefined);

  // The top-level sections, as a way in. Sub-sections are reached from their
  // parent, so listing them here would just be the sidebar twice.
  const entrances = sections.filter((s) => !s.parentId && s.key !== "main");

  return (
    <div className="space-y-6">
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={h2}>{me.alias ? tr.welcomeNamed(me.alias) : tr.welcome}</h2>
            <p className={sub}>{tr.today(studio.name)}</p>
          </div>
          <span className="text-sm font-500 text-slate-400 dark:text-slate-500">
            {fmtDate(new Date())}
          </span>
        </div>

        {tiles.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {tr.nothingShared}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <StatTile key={tile.label} label={tile.label} value={tile.value} tone={tile.tone} href={href(tile.key)} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${panel} lg:col-span-2`}>
          <p className={microLabel}>{tr.recentActivity}</p>
          {recent.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{tr.nothingMoved}</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon name={FEED_ICON[r.kind] || "dot"} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-600 text-slate-900 dark:text-white">{r.label}</span>
                    <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                      {FEED_WORD[r.kind]}{r.meta ? ` · ${r.meta}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{fmtDate(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={panel}>
          <p className={microLabel}>{tr.yourSections}</p>
          {entrances.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{tr.noneYet}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {entrances.map((s) => (
                <a key={s.key} href={`/${slug}/${s.key}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon name="chevronRight" className="h-4 w-4 rtl:-scale-x-100" />
                  </span>
                  {sectionName(s.key, s.name, locale)}
                </a>
              ))}
            </div>
          )}
        </section>
      </div>

      {executive && <MainDashboard slug={slug} executive={executive} />}
    </div>
  );
}
