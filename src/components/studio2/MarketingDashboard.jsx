// THE MARKETING DASHBOARD (19/09/2026) — the department's landing page.
//
// WHAT CAME IN BESIDE WHAT WAS PLANNED. Leads and won value are real now — the
// Sales tickets each campaign sent (modules/sales/leads) — and each tile carries
// its target beneath it. Spend, ROI and cost per lead still need Finance's
// actuals, so they are not on the page: a tile reading "ROI 0%" would be a lie
// with a number on it.
//
// EVERY FIGURE IS THE SERVER'S (modules/marketing → campaignFigures), judged by
// its `asOf` rather than this browser's clock. All of it is the free floor, so
// nothing here is gated through the widget registry.
"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { marketingDeptDict } from "@/shared/studio/marketingDept";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { StatTile, money, fmtDate, btn } from "@/components/studio2/ui";
import { StatRow, DashGrid, Widget, DashEmpty } from "@/components/dashboard";
import { BarList } from "@/components/charts";
import { CAMPAIGN_STATUSES } from "@/modules/marketing/model";

// NAMED `*Dashboard.jsx` DELIBERATELY: the widget-gate scan reads exactly that
// filename pattern, and this one gates nothing because all of it is free.
// `initial` IS THIS SCREEN'S OWN ROUTE BODY, answered inside the studio page's
// render, so the dashboard paints with its figures rather than a skeleton and a
// second request. Absent — refused, or over the payload ceiling — it fetches.
export default function MarketingDashboard({ slug, initial }) {
  const tr = marketingDeptDict(useStudioLocale());
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/dashboard`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug]);

  useReload(load, initial);
  useLiveUpdates(slug, "marketing-campaigns", load);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error === "forbidden" ? tr.refused : error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { figures = {}, actual = {}, attention = [], running = [], currency = "", may = {} } = data;
  const cur = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;
  const register = may.campaigns ? `/${slug}/marketing-campaigns` : "";
  const byStatus = figures.byStatus || {};
  const statusMost = Math.max(1, ...CAMPAIGN_STATUSES.map((s) => byStatus[s] || 0));
  const channels = figures.byChannel || [];
  const channelMost = Math.max(1, ...channels.map((c) => c.open));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{tr.plannedNote}</p>
        {register && <Link href={register} className={btn}>{tr.openRegister}</Link>}
      </div>

      <StatRow>
        <StatTile label={tr.running} value={<span className="num">{figures.running ?? 0}</span>} href={register} />
        <StatTile label={tr.startingSoon} value={<span className="num">{figures.startingSoon ?? 0}</span>} href={register} />
        <StatTile label={tr.needsAttention} value={<span className="num">{figures.needsAttention ?? 0}</span>} href={register}
          tone={figures.needsAttention ? "text-rose-600 dark:text-rose-300" : ""} />
        <StatTile label={tr.openBudget} value={cur(figures.openBudget)} sub={`${tr.openCampaigns}: ${figures.open ?? 0}`} />
        {/* WHAT CAME IN, with what was planned beneath it — the Sales tickets
            each campaign sent, against the targets typed on the campaigns. */}
        <StatTile label={tr.leadsTile} value={<span className="num">{actual.leads ?? 0}</span>}
          sub={tr.target(String(figures.expectedLeads ?? 0))} />
        <StatTile label={tr.wonValueTile} value={cur(actual.wonValue)}
          sub={tr.target(cur(figures.expectedRevenue))} />
      </StatRow>

      <DashGrid>
        <Widget title={tr.attentionHeading} span={2}>
          {attention.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {attention.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.reference}</span>{" "}
                    {register
                      ? <Link href={register} className="font-600 text-slate-900 hover:underline dark:text-white">{c.name}</Link>
                      : <span className="font-600 text-slate-900 dark:text-white">{c.name}</span>}
                  </span>
                  <span className="text-xs text-rose-600 dark:text-rose-300">
                    {tr.attention(c.why)}
                    {c.why === "past-end" && c.endOn ? ` · ${fmtDate(c.endOn)}` : c.startOn ? ` · ${fmtDate(c.startOn)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : <DashEmpty text={tr.nothingNeeds} />}
        </Widget>

        <Widget title={tr.byStatus}>
          <BarList items={CAMPAIGN_STATUSES.filter((s) => byStatus[s]).map((s) => ({
            label: tr.status(s),
            value: Math.round(((byStatus[s] || 0) / statusMost) * 100),
            display: <span className="num text-xs text-slate-500 dark:text-slate-400">{byStatus[s]}</span>,
          }))} />
          {!CAMPAIGN_STATUSES.some((s) => byStatus[s]) && <DashEmpty text={tr.noCampaigns} />}
        </Widget>

        <Widget title={tr.runningNow} span={2}>
          {running.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {running.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.reference}</span>{" "}
                    <span className="font-600 text-slate-900 dark:text-white">{c.name}</span>
                    {(c.channels || []).length > 0 && (
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{c.channels.map(tr.channelName).join(" · ")}</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {c.budget !== null ? `${cur(c.budget)} · ` : ""}{c.endOn ? tr.endsOn(fmtDate(c.endOn)) : tr.noEnd}
                  </span>
                </li>
              ))}
            </ul>
          ) : <DashEmpty text={tr.nothingRunning} />}
        </Widget>

        <Widget title={tr.byChannel} hint={tr.byChannelHint}>
          {channels.length ? (
            <BarList items={channels.map((c) => ({
              label: tr.channelName(c.channel),
              value: Math.round((c.open / channelMost) * 100),
              display: <span className="num text-xs text-slate-500 dark:text-slate-400">{c.open}</span>,
            }))} />
          ) : <DashEmpty text={tr.noChannels} />}
        </Widget>
      </DashGrid>
    </div>
  );
}
