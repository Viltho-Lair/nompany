"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { card, WidgetTitle, FunnelChart, BarBreakdown, Checklist } from "@/components/studio/widgets";
import { applicationsFunnel, reviewsTrend, contentHealth } from "@/lib/analytics";
import { useLivePoll } from "@/lib/useLivePoll";

async function getJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Main (org-wide) analytics: applications funnel, reviews trend, and a
// content-health checklist. Self-fetches; used on the admin Studio home and in
// the per-tag My Dashboard for users with Main/dashboard access.
export default function MainAnalytics() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const [applications, reviews, careers, services, projects, team, gallery, previousProjects, settings] = await Promise.all([
      getJson("/api/applications"),
      getJson("/api/reviews"),
      getJson("/api/careers"),
      getJson("/api/services"),
      getJson("/api/projects"),
      getJson("/api/employees"),
      getJson("/api/galleryImages"),
      getJson("/api/previousProjects"),
      getJson("/api/settings"),
    ]);
    setData({
        applications: Array.isArray(applications) ? applications : [],
        reviews: Array.isArray(reviews) ? reviews : [],
        careers: Array.isArray(careers) ? careers : [],
        services: Array.isArray(services) ? services : [],
        projects: Array.isArray(projects) ? projects : [],
        team: Array.isArray(team) ? team : [],
        gallery: Array.isArray(gallery) ? gallery : [],
        previousProjects: Array.isArray(previousProjects) ? previousProjects : [],
        settings: settings && !Array.isArray(settings) ? settings : {},
      });
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(load, 10000);

  const apps = useMemo(() => (data ? applicationsFunnel(data.applications, data.careers) : null), [data]);
  const reviews = useMemo(() => (data ? reviewsTrend(data.reviews) : null), [data]);
  const health = useMemo(() => (data ? contentHealth(data) : null), [data]);

  if (!data) return <div className={`${card} text-center text-sm text-slate-400`}>Loading analytics…</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}>
        <WidgetTitle hint={`${apps.openRoles} open role${apps.openRoles === 1 ? "" : "s"}`}>Applications funnel</WidgetTitle>
        <FunnelChart data={apps.stages} />
      </div>

      <div className={card}>
        <WidgetTitle hint={`Avg ${reviews.avg.toFixed(1)}★ · ${reviews.approved} approved, ${reviews.pending} pending`}>Reviews trend</WidgetTitle>
        <BarBreakdown data={reviews.dist} />
      </div>

      <div className={`${card} lg:col-span-2`}>
        <WidgetTitle hint={`${health.passed} of ${health.total} checks passing`}>Content health</WidgetTitle>
        <Checklist items={health.checks} />
      </div>
    </div>
  );
}
