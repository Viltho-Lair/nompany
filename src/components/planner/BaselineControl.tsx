'use client';

import * as React from 'react';
import { Flag, ChevronDown } from 'lucide-react';
import { useStudioLocale } from '@/components/studio2/locale';
import { plannerDict } from '@/shared/studio/planner';
import { fmtDate } from '@/lib/format';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import { readBaseline, takeBaseline } from '@/components/planner/lib/schedule/baseline';
import type { ScheduleResult } from '@/components/planner/lib/schedule/engine';
import { Button } from '@/components/planner/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/planner/ui/primitives';
import { cn } from '@/components/planner/lib/utils';
import { usePlannerReadOnly } from './ReadOnlyContext';

/* ------------------------------------------------------------------
 * INITIAL PLAN AGAINST ACTUAL — the owner, 03/10/2026. The trigger
 * shows the verdict at a glance (ahead / on plan / behind); the popover
 * gives the three figures behind it and the one act that matters: set
 * the baseline when the plan is agreed. Re-baselining and clearing ask
 * first, because both change what "late" means for everybody reading
 * the plan. A read-only reader sees the figures and no buttons.
 * ------------------------------------------------------------------ */

export function BaselineControl({ schedule }: { schedule: ScheduleResult }) {
  const tr = plannerDict(useStudioLocale());
  const readOnly = usePlannerReadOnly();
  const { baseline, setBaseline, showBaseline, setShowBaseline } = usePlannerStore();
  const [asking, setAsking] = React.useState<'' | 'rebaseline' | 'clear'>('');

  // The clock is read ONCE per render here, never inside the pure module.
  const reading = baseline
    ? readBaseline(baseline, schedule.tasks, schedule.stats.percentComplete, schedule.projectEnd, new Date())
    : null;

  const freeze = () => {
    setBaseline(takeBaseline(schedule.tasks, schedule.projectStart, schedule.projectEnd, new Date().toISOString()));
    setAsking('');
  };

  const verdictText = reading?.verdict === 'ahead' ? tr.aheadOfPlan
    : reading?.verdict === 'behind' ? tr.behindPlan
      : reading?.verdict === 'on-plan' ? tr.onPlan : '';
  const tone = reading?.verdict === 'behind' ? 'text-rose-600'
    : reading?.verdict === 'ahead' ? 'text-emerald-600' : 'text-slate-600';

  return (
    <Popover onOpenChange={() => setAsking('')}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" title={tr.baselineHint}>
          <Flag className="h-3.5 w-3.5" />
          {tr.baseline}
          {verdictText && <span className={cn('font-medium', tone)}>· {verdictText}</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {!baseline ? (
          <>
            <p className="text-[12px] leading-relaxed text-slate-500">{tr.baselineNone}</p>
            {!readOnly && (
              <Button size="sm" className="mt-3" onClick={freeze} disabled={!schedule.tasks.length}>
                {tr.setBaseline}
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {tr.baselineSetOn(fmtDate(baseline.setAt))}
            </p>
            {reading && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                <dt className="text-slate-500">{tr.plannedByToday}</dt>
                <dd className="text-end font-semibold tabular-nums">{reading.planned === null ? '—' : `${reading.planned}%`}</dd>
                <dt className="text-slate-500">{tr.actualDone}</dt>
                <dd className="text-end font-semibold tabular-nums">{reading.actual}%</dd>
                <dt className="text-slate-500">{tr.scheduleIndex}</dt>
                <dd className={cn('text-end font-semibold tabular-nums', tone)}>{reading.index === null ? '—' : reading.index.toFixed(2)}</dd>
              </dl>
            )}
            <p className={cn('mt-2 text-[13px] font-medium', tone)}>
              {verdictText || tr.notStartedYet}
            </p>
            {reading?.finishSlipDays !== null && reading?.finishSlipDays !== undefined && (
              <p className="mt-1 text-[12px] text-slate-500">{tr.finishSlip(reading.finishSlipDays)}</p>
            )}
            {!!reading?.added && <p className="mt-1 text-[12px] text-amber-600">{tr.tasksAddedSince(reading.added)}</p>}

            <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-600">
              <input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} />
              {tr.showOnChart}
            </label>

            {!readOnly && (
              asking ? (
                <div className="mt-3 rounded-md bg-amber-50 p-2 text-[12px] text-amber-800">
                  <p>{asking === 'clear' ? tr.clearBaselineConfirm : tr.rebaselineConfirm}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => (asking === 'clear' ? (setBaseline(null), setAsking('')) : freeze())}>{tr.confirmYes}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAsking('')}>{tr.cancel}</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAsking('rebaseline')}>{tr.rebaseline}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAsking('clear')}>{tr.clearBaseline}</Button>
                </div>
              )
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
