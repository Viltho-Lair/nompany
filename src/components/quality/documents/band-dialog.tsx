"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { BandAlign, BandSetup } from "@/lib/docs/page-presets";

// A FUNCTION OF THE DICTIONARY: module scope cannot read a hook.
const alignmentsFor = (tr: ReturnType<typeof qualityDict>): { id: BandAlign; label: string; icon: typeof AlignLeft }[] => [
  { id: "left", label: tr.left, icon: AlignLeft },
  { id: "center", label: tr.centre2, icon: AlignCenter },
  { id: "right", label: tr.right2, icon: AlignRight },
];

/**
 * Switching a band on opens this pre-filled with sensible defaults; nothing is
 * applied to the page until Apply is pressed, so cancelling leaves the band off.
 * Re-opening it later edits the band in place.
 */
export function BandDialog({
  band,
  initial,
  onOpenChange,
  onApply,
}: {
  band: "header" | "footer";
  initial: BandSetup;
  onOpenChange: (open: boolean) => void;
  onApply: (setup: BandSetup) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  // Mounted only while open, so the defaults are seeded fresh on each open.
  const [draft, setDraft] = useState<BandSetup>(initial);

  const title = band === "header" ? tr.header : tr.footer;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            The {title.toLowerCase()} reserves this much height inside the page
            margin. Its contents are edited on the page, and can hold anything
            the body can, including tables.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onApply({ ...draft, enabled: true });
            onOpenChange(false);
          }}
        >
          {initial.content === "" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="band-text">{tr.startingText}</Label>
              <Input
                id="band-text"
                autoFocus
                value={draft.text}
                placeholder={`${title} text`}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              The {title.toLowerCase()} is rich text — edit it directly on the
              page, including tables.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label>{tr.alignment}</Label>
            <div className="flex gap-1">
              {alignmentsFor(tr).map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={draft.align === id}
                  onClick={() =>
                    setDraft((current) => ({ ...current, align: id }))
                  }
                  className={cn(
                    "flex-1",
                    draft.align === id && "border-foreground/30 bg-muted",
                  )}
                >
                  <Icon />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="band-height">Height (mm)</Label>
              <Input
                id="band-height"
                type="number"
                min={4}
                max={60}
                step="any"
                value={draft.heightMm}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    heightMm: clamp(Number(event.target.value), 4, 60),
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="band-start">{tr.startPage}</Label>
              <Input
                id="band-start"
                type="number"
                min={1}
                step={1}
                value={draft.startPage}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startPage: Math.max(1, Math.floor(Number(event.target.value)) || 1),
                  }))
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Earlier pages keep the reserved space but leave the{" "}
            {title.toLowerCase()} blank, so the body stays in the same place
            throughout.
          </p>

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
