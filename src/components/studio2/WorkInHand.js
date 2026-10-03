"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, microLabel, fmtDate } from "@/components/studio2/ui";
import { mainDict } from "@/shared/studio/main";
import { stageLabel } from "@/shared/studio/stages";
import { useStudioLocale as useLocale } from "@/components/studio2/locale";
import { useReload } from "@/components/studio2/useReload";
import { useMoney } from "@/components/studio2/studioCurrency";
import { WORK_TYPES } from "@/modules/main/workTypes";

// THE WORK IN HAND, on the front door — the owner's decision C, 03/10/2026:
// every kind of work the studio runs, read one way. Each lane is a kind of work
// (deals, field jobs, work orders, counter sales); a lane the reader may not
// see, or the studio does not run, never arrives, so it is never drawn.
//
// It asks for itself after the page has painted (`/main/work`): a deal's
// progress costs several reads, and the figures above should not wait for it.

// Where "see all" goes for each kind of work — the screen it is worked on.
const LANE_HREF = {
  deal: "engagements",
  job: "field-service-schedule",
  workOrder: "maintenance-orders",
  counterSale: "pos-sales",
};

function Bar({ progress }) {
  // NULL IS NOT 0%: no bar at all when the progress cannot be said.
  if (progress === null || progress === undefined) return null;
  return (
    <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden="true">
      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.round(progress * 100)}%` }} />
    </span>
  );
}

export default function WorkInHand({ slug }) {
  const locale = useLocale();
  const tr = mainDict(locale);
  const money = useMoney();
  const [lanes, setLanes] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/main/work`, { cache: "no-store" });
    // A refusal or a failure hides the board rather than shouting: the front
    // door's other figures are still right, and this is one block on it.
    if (!res.ok) { setLanes([]); return; }
    const body = await res.json().catch(() => ({}));
    setLanes(Array.isArray(body.lanes) ? body.lanes : []);
  }, [slug]);
  useReload(load);
  // Each watch names where the rows are WRITTEN (invariant 14): jobs under
  // Field Service, work orders under Maintenance, receipts under CRM & Sales'
  // till row, deals' stages across Sales and Projects.
  useLiveUpdates(slug, "field-service", load);
  useLiveUpdates(slug, "maintenance", load);
  useLiveUpdates(slug, "crm-sales", load);
  useLiveUpdates(slug, "projects", load);

  if (!lanes || lanes.length === 0) return null;

  const words = (w) => (w ? (locale === "ar" ? w.ar : w.en) : "");
  const stepWords = (type, reading) => (type === "deal"
    ? stageLabel(reading.token, reading.label?.en || reading.token, locale)
    : words(reading.label));

  return (
    <section className={panel}>
      <p className={microLabel}>{tr.workInHand}</p>
      <div className="mt-3 grid gap-5 md:grid-cols-2">
        {lanes.map((lane) => {
          const def = WORK_TYPES[lane.type];
          return (
            <div key={lane.type} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-700 text-slate-900 dark:text-white">{words(def?.plural)}</h3>
                <Link href={`/${slug}/${LANE_HREF[lane.type]}`} className="shrink-0 text-xs font-600 text-brand-600 hover:underline dark:text-brand-300">
                  {tr.workSeeAll}
                </Link>
              </div>

              {lane.type === "counterSale" ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {tr.workSalesToday(lane.today?.count ?? 0, money(lane.today?.value ?? 0))}
                  {lane.doneRecently !== null && <span className="text-xs text-slate-500 dark:text-slate-400"> · {tr.workSalesRecently(lane.doneRecently)}</span>}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tr.workOpen(lane.open)}
                  {lane.overdue > 0 && <span className="text-rose-600 dark:text-rose-300"> · {tr.workOverdue(lane.overdue)}</span>}
                  {lane.doneRecently !== null && <> · {tr.workDoneRecently(lane.doneRecently)}</>}
                  {lane.sampled ? <> · {tr.workNewestDeals(lane.sampled)}</> : null}
                </p>
              )}

              {lane.type !== "counterSale" && (lane.items.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">{tr.workNothingOpen}</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
                  {lane.items.map((item) => (
                    <li key={item.id} className="py-2">
                      <Link href={item.href} className="block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-sm font-600 text-slate-900 dark:text-white">
                            {item.ref && item.ref !== item.title ? <span className="me-1.5 font-500 text-slate-400">{item.ref}</span> : null}
                            {item.title || words(def?.name)}
                          </span>
                          <span className={`shrink-0 text-xs ${item.reading.held ? "text-amber-600 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
                            {item.reading.held ? tr.workHeld : stepWords(lane.type, item.reading)}
                          </span>
                        </span>
                        {item.dueOn && (
                          <span className={`block text-xs ${item.overdue ? "text-rose-600 dark:text-rose-300" : "text-slate-400 dark:text-slate-500"}`}>
                            {tr.workDue(fmtDate(item.dueOn))}
                          </span>
                        )}
                        <Bar progress={item.reading.progress} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
