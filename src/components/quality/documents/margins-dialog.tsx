"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Margins, PagePreset } from "@/lib/docs/page-presets";

const SIDES: { key: keyof Margins; label: string }[] = [
  { key: "topMm", label: "Top" },
  { key: "bottomMm", label: "Bottom" },
  { key: "leftMm", label: "Left" },
  { key: "rightMm", label: "Right" },
];

/** Custom margins, in millimetres, bounded so the body cannot vanish. */
export function MarginsDialog({
  initial,
  paper,
  onOpenChange,
  onApply,
}: {
  initial: Margins;
  paper: PagePreset;
  onOpenChange: (open: boolean) => void;
  onApply: (margins: Margins) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  // Mounted only while open, so props seed state once and never restate it.
  const [draft, setDraft] = useState<Margins>(initial);

  // Leave at least 40mm of body in each direction.
  const maxHorizontal = Math.max(5, (paper.widthMm - 40) / 2);
  const maxVertical = Math.max(5, (paper.heightMm - 40) / 2);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr.customMargins}</DialogTitle>
          <DialogDescription>
            Millimetres from each edge of the {paper.label} sheet (
            {paper.dimensions}).
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onApply(draft);
            onOpenChange(false);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            {SIDES.map(({ key, label }) => {
              const max =
                key === "topMm" || key === "bottomMm"
                  ? maxVertical
                  : maxHorizontal;
              return (
                <div key={key} className="flex flex-col gap-2">
                  <Label htmlFor={`margin-${key}`}>{label}</Label>
                  <Input
                    id={`margin-${key}`}
                    type="number"
                    min={0}
                    max={Math.round(max)}
                    step="any"
                    value={draft[key]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [key]: clamp(Number(event.target.value), 0, max),
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{tr.apply}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
