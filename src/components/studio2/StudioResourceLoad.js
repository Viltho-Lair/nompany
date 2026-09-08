// WHO IS COMMITTED TO WHAT — every plan in the studio, read by person.
//
// THE QUESTION THIS EXISTS FOR could not be asked before it. The planner is
// per-project by construction, so "is Sara on three jobs that week" meant
// opening three schedules and holding them in your head. Every piece of the
// answer was already stored — a task has carried `assigneeIds` since the planner
// was built, plans carry their resources with a capacity each, and the engine
// writes `start` and `end` onto every row — and nothing read more than one plan
// at a time.
//
// THE ARITHMETIC IS IN `modules/projects/resources`, WHICH IS PURE, and this
// screen imports it rather than restating it. A person told "three clashes" here
// has to find the same three when they open the plan.
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { resourceLoadDict } from "@/shared/studio/resourceLoad";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { panel, h2, sub, btn, btnGhost, th, Empty, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

export default function StudioResourceLoad({ slug, backHref }) {
  const tr = resourceLoadDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });

  const read = useCallback(async (window) => {
    const qs = new URLSearchParams();
    if (window.from) qs.set("from", window.from);
    if (window.to) qs.set("to", window.to);
    const res = await fetch(
      `/api/studios/${slug}/operations/planner/resources${qs.toString() ? `?${qs}` : ""}`);
    return res.ok ? res.json() : { ok: false };
  }, [slug]);

  useEffect(() => {
    let current = true;
    (async () => {
      const out = await read({ from: "", to: "" });
      if (current) setData(out);
    })();
    return () => { current = false; };
  }, [read]);

  if (data === null) return <ScreenSkeleton />;

  const load = data?.load || { people: [], unassignedDays: 0 };

  return (
    <div className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.heading}</h2>
          <p className={sub}>{tr.lead}</p>
        </div>
        {backHref && <Link href={backHref} className={btnGhost}>{tr.backToPlanner}</Link>}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field type="date" label={tr.windowFrom} value={range.from}
          onChange={(v) => setRange((r) => ({ ...r, from: v }))} />
        <Field type="date" label={tr.windowTo} value={range.to}
          onChange={(v) => setRange((r) => ({ ...r, to: v }))} />
        <button type="button" className={btn}
          onClick={async () => setData(await read(range))}>{tr.applyWindow}</button>
      </div>

      {/* PARTIAL IS SAID OUT LOUD. A load report that quietly omitted half the
          studio's schedules would be worse than no report, because somebody
          would plan against it. */}
      {data?.truncated && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">{tr.partial(data.plansRead)}</p>
      )}

      {/* WORK NOBODY IS ON is the other half of the question, so it is stated
          either way round rather than only when there is some. */}
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {load.unassignedDays > 0 ? tr.unassignedWork(load.unassignedDays) : tr.nothingUnassigned}
      </p>

      {!load.people.length ? <Empty>{tr.empty}</Empty> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr.colPerson}</th>
                <th className={th}>{tr.colCapacity}</th>
                <th className={th}>{tr.colCommitted}</th>
                <th className={th}>{tr.colAssigned}</th>
                <th className={th}>{tr.colClash}</th>
                <th className={th}>{tr.colWork}</th>
              </tr>
            </thead>
            <tbody>
              {load.people.map((p) => (
                <tr key={p.id} className="border-t border-[var(--geex-line)] align-top">
                  <td className="py-3 pe-4 text-[var(--geex-ink)]">{p.name}</td>
                  {/* NULL IS NOT NOUGHT. "Nobody set a capacity" and "this person
                      cannot work at all" are different facts and must not render
                      the same. */}
                  <td className="py-3 pe-4">
                    {p.capacity === null
                      ? <span className="text-slate-400">{tr.capacityUnknown}</span>
                      : <span className="num">{tr.capacityPct(p.capacity)}</span>}
                  </td>
                  <td className="py-3 pe-4 num">{tr.dayCount(p.committedDays)}</td>
                  <td className="py-3 pe-4 num">{tr.dayCount(p.assignmentDays)}</td>
                  <td className="py-3 pe-4">
                    {p.conflictDays > 0 ? (
                      <span className="text-amber-600 dark:text-amber-300">
                        <span className="num">{tr.dayCount(p.conflictDays)}</span>
                        {p.firstConflict ? ` · ${tr.clashFrom(fmtDate(p.firstConflict))}` : ""}
                      </span>
                    ) : <span className="text-slate-400">{tr.noClash}</span>}
                  </td>
                  <td className="py-3">
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {p.work.map((w) => (
                        <li key={w.planId}>
                          {w.projectTitle || w.planName}
                          {" — "}<span className="num">{tr.dayCount(w.days)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
