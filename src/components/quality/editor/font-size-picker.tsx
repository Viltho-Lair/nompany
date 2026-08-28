"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FONT_SIZES_PT } from "@/lib/docs/fonts";
import { cn } from "@/lib/utils";

/** Point sizes, with a free-entry box for anything off the list. */
export function FontSizePicker({
  value,
  onSelect,
}: {
  value: number;
  onSelect: (sizePt: number) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  function commitCustom() {
    const parsed = Number(custom);
    if (!Number.isFinite(parsed) || parsed < 4 || parsed > 400) return;
    onSelect(Math.round(parsed * 10) / 10);
    setCustom("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-16 justify-between gap-1 px-2 font-normal tabular-nums"
          aria-label={tr.fontSize}
        >
          {value}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-28 p-0">
        <div className="border-b p-1">
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitCustom();
              }
            }}
            onBlur={commitCustom}
            inputMode="decimal"
            placeholder={tr.custom}
            aria-label={tr.customFontSizePoints}
            className="h-7 text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {FONT_SIZES_PT.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onSelect(size);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-1 text-left text-sm tabular-nums hover:bg-muted",
                size === value && "bg-muted/60 font-medium",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
