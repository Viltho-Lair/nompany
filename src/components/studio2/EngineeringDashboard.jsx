// THE ENGINEERING & DOCUMENTS DASHBOARD — what is waiting, what is late, and
// where the questions and the reviews stand.
//
// EVERY FIGURE IS THE SERVER'S (modules/engineering/model, pure), including
// `asOf`, so the screen never reads its own clock and computes nothing.
//
// A BLOCK THE READER MAY NOT OPEN IS NOT DRAWN, and was never read either —
// `may` comes from the server. Somebody who holds only the RFI register sees the
// RFI figures, not an empty grid of six.
//
// THE FREE FLOOR IS NEVER GATED: what is waiting on you, what is open and late,
// and which reviews fall due. The analysis — the charts and the named list — is
// the paid widgets, registered in lib/dashboardWidgets like every other.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { engineeringDict } from "@/shared/studio/engineering";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub, StatTile, fmtDate } from "@/components/studio2/ui";
import { StatRow, DashGrid, Widget, DashEmpty, DonutLegend } from "@/components/dashboard";
import { BarChart, BarList, ChartFrame } from "@/components/charts";
import { monthLabel } from "@/components/dashboard/series";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";
import { engineSectionKey } from "@/platform/access";

// NAMED `*Dashboard.jsx` DELIBERATELY: the widget-gate scan reads that filename
// pattern to prove every registry key is drawn by something.
export default function EngineeringDashboard({ slug }) {
  const locale = useStudioLocale();
  const tr = engineeringDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const widgetVisible = useWidgetVisible();

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/engineering/dashboard`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  // THE DOCUMENT REGISTER IS WRITTEN UNDER `engineering-docs-register`, which
  // the root's fan-out hears. The engineering registers are engine sections
  // parented here, which the live provider reaches through the stored parent.
  useLiveUpdates(slug, "engineering-docs", reload);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refuse[error] || error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { may = {}, asOf, months = [], documents, rfi, submittal, transmittal, ebom, library, attention = [] } = data;
  const num = (n) => <span className="num">{n ?? 0}</span>;
  const late = "text-rose-600 dark:text-rose-400";
  const anyBlock = Object.values(may).some(Boolean);
  const hrefFor = (kind) => `/${slug}/${engineSectionKey(kind === "rfi" ? "rfi" : "submittal")}`;

  if (!anyBlock) {
    return (
      <div>
        <h2 className={h2}>{tr.dashboard}</h2>
        <p className={`${sub} mt-2`}>{tr.nothingYours}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className={h2}>{tr.dashboard}</h2>
        <p className={sub}>{tr.dashboardSub(fmtDate(asOf))}</p>
      </div>

      {/* THE FREE FLOOR — four facts somebody in this department acts on before
          any analysis. A tile appears only for a register the reader holds. */}
      <StatRow>
        {documents && (
          <StatTile label={tr.waitingOnYou} value={num(documents.awaitingMe)}
            tone={documents.awaitingMe > 0 ? "text-brand-700 dark:text-brand-300" : ""}
            sub={tr.inReview(documents.inReview)} href={`/${slug}/engineering-docs-register`} />
        )}
        {rfi && (
          <StatTile label={tr.openRfis} value={num(rfi.open)}
            tone={rfi.overdue > 0 ? late : ""} sub={tr.overdue(rfi.overdue)} href={`/${slug}/${engineSectionKey("rfi")}`} />
        )}
        {submittal && (
          <StatTile label={tr.submittalsOut} value={num(submittal.withReviewer)}
            tone={submittal.overdue > 0 ? late : ""} sub={tr.overdue(submittal.overdue)} href={`/${slug}/${engineSectionKey("submittal")}`} />
        )}
        {documents && (
          <StatTile label={tr.reviewsDue} value={num(documents.reviewDue)}
            tone={documents.reviewOverdue > 0 ? late : ""}
            sub={documents.reviewOverdue > 0 ? tr.overdue(documents.reviewOverdue) : tr.reviewsDueSub(30)}
            href={`/${slug}/engineering-docs-register`} />
        )}
      </StatRow>

      {(transmittal || ebom || library || rfi) && (
        <StatRow>
          {transmittal && (
            <StatTile label={tr.transmittalsAwaiting} value={num(transmittal.awaitingAcknowledgement)} href={`/${slug}/${engineSectionKey("transmittal")}`} />
          )}
          {rfi && (
            <StatTile label={tr.rfisAnswered} value={num(rfi.answered)} href={`/${slug}/${engineSectionKey("rfi")}`} />
          )}
          {ebom && (
            <StatTile label={tr.bomInReview} value={num(ebom.inReview)} href={`/${slug}/${engineSectionKey("ebom")}`} />
          )}
          {library && (
            <StatTile label={tr.libraryCurrent} value={num(library.current)} sub={tr.withdrawn(library.withdrawn)} href={`/${slug}/${engineSectionKey("techlib")}`} />
          )}
        </StatRow>
      )}

      <DashGrid>
        {(may.rfi || may.submittal) && (
          <Widget title={tr.attention} hint={tr.attentionHint} span={2}
            locked={!widgetVisible("engineering.attention")} lockedWhat={tr.attention}>
            {attention.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {attention.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <a href={hrefFor(a.kind)} className="min-w-0 truncate text-slate-700 hover:underline dark:text-slate-200">
                      <span className="font-mono text-xs text-slate-400">{a.reference}</span>
                      <span className="ms-2">{a.title}</span>
                      <span className="ms-2 text-xs text-slate-400">{tr.kind(a.kind)}</span>
                    </a>
                    <span className={`shrink-0 text-xs font-600 ${late}`}>{tr.daysLate(a.daysLate)}</span>
                  </li>
                ))}
              </ul>
            ) : <DashEmpty text={tr.nothingLate} />}
          </Widget>
        )}

        {documents && (
          <Widget title={tr.documentStatus} hint={tr.documentStatusHint}
            locked={!widgetVisible("engineering.document-status")} lockedWhat={tr.documentStatus}>
            {documents.total ? (
              <DonutLegend word={tr.documentsWord}
                data={(documents.byState || []).map((s) => ({ label: tr.state(s.state), value: s.count }))} />
            ) : <DashEmpty text={tr.noDocuments} />}
          </Widget>
        )}

        {rfi && (
          <Widget title={tr.ballInCourt} hint={tr.ballInCourtHint}
            locked={!widgetVisible("engineering.rfi-ball-in-court")} lockedWhat={tr.ballInCourt}>
            {rfi.open ? (
              <BarList items={(rfi.ballInCourt || []).filter((b) => b.count > 0).map((b) => ({
                label: tr.party(b.who),
                value: Math.round((b.count / Math.max(1, rfi.open)) * 100),
                display: num(b.count),
              }))} />
            ) : <DashEmpty text={tr.noOpenRfis} />}
          </Widget>
        )}

        {submittal && (
          <Widget title={tr.submittalOutcomes} hint={tr.submittalOutcomesHint}
            locked={!widgetVisible("engineering.submittal-outcomes")} lockedWhat={tr.submittalOutcomes}>
            {(submittal.outcomes || []).some((o) => o.count > 0) ? (
              <DonutLegend data={submittal.outcomes.map((o, i) => ({
                label: tr.outcome(o.outcome), value: o.count,
                color: ["rgb(var(--chart-2))", "rgb(var(--chart-4))", "rgb(var(--chart-3))"][i],
              }))} />
            ) : <DashEmpty text={tr.noOutcomes} />}
          </Widget>
        )}

        {rfi && (
          <Widget title={tr.rfiIntake} hint={tr.rfiIntakeHint}
            locked={!widgetVisible("engineering.rfi-intake")} lockedWhat={tr.rfiIntake}>
            {(rfi.raised || []).some((n) => n > 0) ? (
              <ChartFrame labels={months.map((m) => monthLabel(m, locale))} height={180}>
                <BarChart height={180} rtl={locale === "ar"} labels={months}
                  series={[{ name: tr.rfiIntake, data: rfi.raised, color: "rgb(var(--chart-1))" }]} />
              </ChartFrame>
            ) : <DashEmpty text={tr.noRfis} />}
          </Widget>
        )}

        {documents && (
          <Widget title={tr.reviewDueTitle} hint={tr.reviewDueHint}
            locked={!widgetVisible("engineering.review-due")} lockedWhat={tr.reviewDueTitle}>
            {(documents.reviewDueList || []).length ? (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {documents.reviewDueList.map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <a href={`/${slug}/engineering-docs-register/${d.id}`}
                      className="min-w-0 truncate text-slate-700 hover:underline dark:text-slate-200">
                      <span className="font-mono text-xs text-slate-400">{d.code}</span>
                      <span className="ms-2">{d.title}</span>
                    </a>
                    <span className={`shrink-0 text-xs font-600 ${d.daysLeft < 0 ? late : "text-slate-500 dark:text-slate-400"}`}>
                      {tr.dueIn(d.daysLeft)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <DashEmpty text={tr.nothingDue} />}
          </Widget>
        )}
      </DashGrid>
    </div>
  );
}
