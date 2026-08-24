"use client";

import { useState } from "react";
import { Dialog, input, label, btn, btnGhost } from "@/components/studio2/ui";

// THE NEW-PLAN DEFAULTS EDITOR. What a fresh plan opens with — configured once
// per studio, persisted through the planner PUT, and applied to every plan the
// studio creates thereafter.
//
// Only the VIEW defaults are the studio's to preset now: a plan's PEOPLE are the
// studio's live collaborators and its WORKING WEEK is the studio's own working
// hours (Studio settings), both read fresh each load rather than copied into the
// plan — so the resource pool and the calendar are no longer defaults here.

const ZOOM_LEVELS = ["hour", "day", "week", "month", "quarter"];
const COLOR_BY = ["phase", "status", "assignee", "priority"];

export default function PlannerPresetsDialog({ slug, presets, canEdit, onClose, onSaved }) {
  const [zoom, setZoom] = useState(() =>
    ZOOM_LEVELS.includes(presets?.zoom) ? presets.zoom : "week",
  );
  const [colorBy, setColorBy] = useState(() =>
    COLOR_BY.includes(presets?.colorBy) ? presets.colorBy : "phase",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetToDefaults() {
    setZoom("week");
    setColorBy("phase");
    setError("");
  }

  async function save() {
    if (saving || !canEdit) return;
    setSaving(true);
    setError("");
    const payload = { presets: { zoom, colorBy } };
    try {
      const res = await fetch(`/api/studios/${slug}/operations/planner`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "You don't have permission to change these defaults."
            : "The defaults could not be saved. Please try again.",
        );
        setSaving(false);
        return;
      }
      const body = await res.json();
      onSaved?.(body?.presets ?? payload.presets);
      onClose?.();
    } catch {
      setError("The defaults could not be saved. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="New-plan defaults"
      description="How a new plan opens the first time it is viewed. Its working week and people come from the studio itself."
      onClose={onClose}
      width="max-w-[640px]"
    >
      <div className="flex flex-col gap-8">
        <Section
          heading="View defaults"
          hint="How a new plan opens the first time it is viewed."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Default zoom">
              <select className={input} value={zoom} onChange={(e) => setZoom(e.target.value)}>
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={z}>{z.charAt(0).toUpperCase() + z.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Default colour-by">
              <select className={input} value={colorBy} onChange={(e) => setColorBy(e.target.value)}>
                {COLOR_BY.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {error && (
          <p className="text-sm font-600 text-rose-600 dark:text-rose-300" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
          <button type="button" className={btnGhost} onClick={resetToDefaults} disabled={saving}>
            Reset to app defaults
          </button>
          <div className="ms-auto flex items-center gap-2">
            <button type="button" className={btnGhost} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={btn}
              onClick={save}
              disabled={saving || !canEdit}
              title={!canEdit ? "You don't have permission to change these defaults." : undefined}
            >
              {saving ? "Saving…" : "Save defaults"}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Section({ heading, hint, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h4 className="font-display text-sm font-800 uppercase tracking-wide text-[var(--geex-ink)]">
          {heading}
        </h4>
        {hint && <p className="mt-0.5 text-xs text-[var(--geex-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label: fieldLabel, children }) {
  return (
    <label className="block">
      <span className={label}>{fieldLabel}</span>
      {children}
    </label>
  );
}
