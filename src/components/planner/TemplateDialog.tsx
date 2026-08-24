'use client';

import * as React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Check, LayoutTemplate, Sparkles } from 'lucide-react';
import { TEMPLATES } from '@/components/planner/lib/templates';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import { Button } from '@/components/planner/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/planner/ui/primitives';
import { cn } from '@/components/planner/lib/utils';

export function TemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const loadTemplate = usePlannerStore((s) => s.loadTemplate);
  const [selected, setSelected] = React.useState('software');
  const [startDate, setStartDate] = React.useState<Date | null>(new Date());

  const apply = () => {
    loadTemplate(selected, startDate ?? new Date());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Start a plan
        </DialogTitle>
        <DialogDescription>
          Generate a work breakdown from a preset, or begin with an empty grid
          and build it yourself. Presets carry their own dependency links, so
          the timeline lays itself out.
        </DialogDescription>

        <div className="mt-4 grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pe-1">
          {TEMPLATES.map((template) => {
            const active = selected === template.id;
            const taskCount = template.rows.filter((r) => r.parentRef).length;
            const phaseCount = template.rows.filter((r) => !r.parentRef).length;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template.id)}
                className={cn(
                  'relative rounded-lg border p-3 text-start transition-all',
                  active
                    ? 'border-primary bg-blue-50/50 ring-1 ring-primary'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {active && (
                  <span className="absolute end-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: template.accent }}
                  />
                  <span className="text-[13px] font-semibold text-slate-900">
                    {template.name}
                  </span>
                </div>
                <p className="mt-1 pe-4 text-[12px] leading-snug text-slate-500">
                  {template.description}
                </p>
                <div className="mt-2 text-[11px] text-slate-400">
                  {template.rows.length
                    ? `${phaseCount} phases · ${taskCount} tasks`
                    : 'Empty'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Project start
            </label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { width: 190, '& .MuiInputBase-root': { height: 34 } },
                },
              }}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Non-working days are skipped automatically.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={apply}>
              <Sparkles className="h-3.5 w-3.5" />
              Generate plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
