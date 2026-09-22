"use client";

// PLANNING & CALENDAR (22/09/2026) — what runs when, across channels.
//
// THE QUESTION IT ANSWERS is not "what is on" — the register answers that — but
// "what is on AT ONCE". Four email campaigns overlapping in one week look
// reasonable on four separate rows and unreasonable in one inbox, and this is
// the only screen where the collision is visible.
//
// IT CHANGES NOTHING. Every bar is a campaign; its dates are edited in the
// register, which is one click away on each bar. A calendar somebody could drag
// would be a second writer of the same field.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, sub, btnGhost, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingCalendarDict } from "@/shared/studio/marketingCalendar";
import { marketingDeptDict } from "@/shared/studio/marketingDept";

const SPANS = ["4", "8", "12", "26"];

// A campaign's bar takes the colour of its STATUS, not its channel: a channel
// can be several (a bar would have to pick one anyway) and what somebody scans
// for is whether a thing is live.
const STATUS_TONE = {
  Active: "bg-emerald-500",
  Planned: "bg-sky-500",
  Paused: "bg-amber-500",
  Draft: "bg-slate-400",
  Completed: "bg-slate-300 dark:bg-white/20",
};

export default function StudioMarketingCalendar({ slug }) {
  const locale = useStudioLocale();
  const tr = marketingCalendarDict(locale);
  const dept = marketingDeptDict(locale);
  const [from, setFrom] = useState("");
  const [weeks, setWeeks] = useState("12");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const params = `weeks=${weeks}${from ? `&from=${from}` : ""}`;
  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/calendar?${params}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, params, tr]);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await reload(); })();
    return () => { alive = false; };
  }, [reload]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { bars = [], load = [], week = {}, unscheduled = [], weeks: columns = [] } = data;
  const shift = (n) => setFrom(addWeeks(data.from, n));

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
          </div>
          <Link className={btnGhost} href={`/${slug}/marketing-campaigns`}>{tr.openRegister}</Link>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <button type="button" className={btnGhost} onClick={() => shift(-4)}>{tr.back}</button>
          <button type="button" className={btnGhost} onClick={() => setFrom("")}>{tr.today}</button>
          <button type="button" className={btnGhost} onClick={() => shift(4)}>{tr.forward}</button>
          <div className="min-w-[10rem]">
            <Field label={tr.span} as="select" value={weeks} onChange={setWeeks}
              options={SPANS.map((s) => ({ value: s, label: tr.spans[s] }))} />
          </div>
        </div>

        {/* WHAT NEEDS A PERSON THIS WEEK, above the chart: somebody opening the
            calendar on a Monday should not have to read a timeline to find it. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Summary title={tr.startingThisWeek} rows={week.starting} slug={slug} empty={tr.nothingStarting} />
          <Summary title={tr.endingThisWeek} rows={week.ending} slug={slug} empty={tr.nothingEnding} />
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{tr.crowded}</p>
            {(week.crowded || []).length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">{tr.nothingCrowded}</p>
            ) : (
              <>
                {week.crowded.map((c) => (
                  <p key={c.channel} className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {tr.crowdedOn(dept.channelName(c.channel), c.n)}
                  </p>
                ))}
                <p className="mt-1 text-[11px] text-slate-400">{tr.crowdedHint}</p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className={panel}>
        {bars.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.none}</p>
            <p className="mt-1 text-xs text-slate-400">{tr.noneHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* The week ruler. Every column is a Monday, so a bar never starts
                  between two labels. */}
              <div className="flex border-b border-slate-200/70 pb-2 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-400">
                {columns.map((day, i) => (
                  <div key={day} className="flex-1 border-s border-slate-100 ps-1 dark:border-white/5">
                    {fmtDate(day)}
                    <span className="block text-slate-400">{tr.running(load[i]?.running || 0)}</span>
                  </div>
                ))}
              </div>

              <ul className="mt-3 space-y-2">
                {bars.map((b) => (
                  <li key={b.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/${slug}/marketing-campaigns`} className="font-600 text-[var(--geex-ink)] hover:underline">
                        {b.name}
                      </Link>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {[b.reference, dept.status(b.status), (b.channels || []).map((c) => dept.channelName(c)).join(" · ")]
                          .filter(Boolean).join(" — ")}
                      </span>
                    </div>
                    <div className="relative mt-1 h-3 rounded-full bg-slate-100 dark:bg-white/5">
                      <span
                        className={`absolute h-3 rounded-full ${STATUS_TONE[b.status] || STATUS_TONE.Draft}`}
                        style={{ insetInlineStart: `${b.offset * 100}%`, width: `${Math.max(1, b.length * 100)}%` }}
                        title={`${b.startOn}${b.endOn ? ` → ${b.endOn}` : ""}`}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {[
                        b.cutStart ? tr.cutStart : "",
                        b.openEnded ? tr.openEnded : "",
                        b.cutEnd ? tr.cutEnd : "",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {unscheduled.length > 0 && (
        <section className={panel}>
          <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">{tr.unscheduled}</h3>
          <p className={sub}>{tr.unscheduledHint}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unscheduled.map((c) => (
              <li key={c.id}>
                <Link href={`/${slug}/marketing-campaigns`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15">
                  <span className="font-600">{c.name}</span>
                  <span className="text-slate-500 dark:text-slate-400">{dept.status(c.status)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Summary({ title, rows = [], slug, empty }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">{empty}</p>
      ) : (
        rows.map((b) => (
          <p key={b.id} className="mt-1 truncate text-xs text-slate-700 dark:text-slate-200">
            <Link href={`/${slug}/marketing-campaigns`} className="hover:underline">{b.name}</Link>
          </p>
        ))
      )}
    </div>
  );
}

/** Move the window by whole weeks, so the columns stay Mondays. */
function addWeeks(day, n) {
  const t = Date.parse(`${String(day).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + n * 7 * 86400000).toISOString().slice(0, 10) : "";
}
