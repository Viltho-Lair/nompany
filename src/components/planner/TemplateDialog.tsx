'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import { Button } from '@/components/planner/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/planner/ui/primitives';

// THE STUDIO'S TEMPLATES. This was a picker over hardcoded presets; now it lists
// the studio's OWN templates (seeded once from those presets) and lets a plan
// start from one — or edit any of them in the planner, or add a new one. The
// slug comes from the URL because this ported dialog has no nompany context; the
// templates are studio-level, so the same base works from either plan door.
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
  const router = useRouter();
  const importTasks = usePlannerStore((s) => s.importTasks);
  const setMeta = usePlannerStore((s) => s.setMeta);
  const slug = React.useMemo(studioSlug, []);
  const base = `/api/studios/${slug}/operations/planner/templates`;

  const [templates, setTemplates] = React.useState<TemplateRow[] | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(base, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setTemplates(Array.isArray(d?.templates) ? d.templates : []);
        setCanEdit(Boolean(d?.canEdit));
      })
      .catch(() => setTemplates([]));
  }, [base]);

  React.useEffect(() => {
    if (!open) return;
    setTemplates(null);
    load();
  }, [open, load]);

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

  // Edit — open the template in the planner itself.
  const edit = (t: TemplateRow) => {
    onOpenChange(false);
    router.push(`/${slug}/operations-planner/templates/${t.id}`);
  };

  const create = async () => {
    setBusy(true);
    try {
      const r = await fetch(base, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const d = r.ok ? await r.json() : null;
      if (d?.templateId) {
        onOpenChange(false);
        router.push(`/${slug}/operations-planner/templates/${d.templateId}`);
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  const remove = async (t: TemplateRow) => {
    setBusy(true);
    try {
      await fetch(`${base}/${t.id}`, { method: 'DELETE' });
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Templates
        </DialogTitle>
        <DialogDescription>
          Start this plan from a template, or edit the studio&apos;s templates in the
          planner. A template carries its own dependency links, so a plan started
          from one lays its timeline out on its own.
        </DialogDescription>

        <div className="mt-4 grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pe-1">
          {templates === null ? (
            <p className="col-span-2 py-8 text-center text-[13px] text-slate-400">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-[13px] text-slate-400">No templates yet.</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: t.accent }} />
                  <span className="truncate text-[13px] font-semibold text-slate-900">{t.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-500">
                  {t.description || 'No description.'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button size="sm" onClick={() => use(t)} disabled={busy}>
                    <Sparkles className="h-3.5 w-3.5" /> Use
                  </Button>
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => edit(t)} disabled={busy}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(t)}
                      disabled={busy}
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          {canEdit ? (
            <Button variant="outline" onClick={create} disabled={busy}>
              <Plus className="h-3.5 w-3.5" /> New template
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
