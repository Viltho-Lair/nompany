'use client';

import * as React from 'react';
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict } from "@/shared/studio/planner";
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import { Button } from '@/components/planner/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/planner/ui/primitives';

// SELECTION ONLY. This used to be the one place templates were both chosen and
// edited, and editing a template from inside a live plan proved unreliable — the
// plan you were standing in and the template you were changing shared a surface.
// So editing moved out to the planner landing (a column of its own), and inside a
// plan this dialog does exactly one thing: drop a template's tasks into the plan.
// The slug comes from the URL because this ported dialog has no nompany context;
// the templates are studio-level, so the same base works from either plan door.
function studioSlug(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.split('/').filter(Boolean)[0] || '';
}

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  accent: string;
}

export function TemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = plannerDict(useStudioLocale());
  const importTasks = usePlannerStore((s) => s.importTasks);
  const setMeta = usePlannerStore((s) => s.setMeta);
  const slug = React.useMemo(studioSlug, []);
  const base = `/api/studios/${slug}/operations/planner/templates`;

  const [templates, setTemplates] = React.useState<TemplateRow[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTemplates(null);
    fetch(base, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTemplates(Array.isArray(d?.templates) ? d.templates : []))
      .catch(() => setTemplates([]));
  }, [open, base]);

  // Use — drop this template's tasks into the current plan and name it.
  const use = async (t: TemplateRow) => {
    setBusy(true);
    try {
      const r = await fetch(`${base}/${t.id}`, { cache: 'no-store' });
      const d = r.ok ? await r.json() : null;
      const tasks = d?.plan?.tasks;
      if (Array.isArray(tasks)) {
        importTasks(tasks);
        setMeta({ name: t.name });
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          {tr.startFromTemplate}
        </DialogTitle>
        <DialogDescription>
          {tr.pickTemplateLayout}
        </DialogDescription>

        <div className="mt-4 grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pe-1">
          {templates === null ? (
            <p className="col-span-2 py-8 text-center text-[13px] text-slate-400">{tr.loadingTemplates}</p>
          ) : templates.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-[13px] text-slate-400">{tr.noTemplatesYet}</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: t.accent }} />
                  <span className="truncate text-[13px] font-semibold text-slate-900">{t.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-500">
                  {t.description || tr.noDescription}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button size="sm" onClick={() => use(t)} disabled={busy}>
                    <Sparkles className="h-3.5 w-3.5" /> {tr.use}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
