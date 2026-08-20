"use client";

import { useState } from "react";
import { Baseline, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** A spread wide enough to be useful without becoming a colour system. */
const SWATCHES = [
  "#000000",
  "#3f3f46",
  "#71717a",
  "#a1a1aa",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#4f46e5",
  "#9333ea",
  "#db2777",
  "#7c2d12",
  "#14532d",
  "#1e3a8a",
];

/** Text colour for the selection. */
export function ColorPicker({
  value,
  onSelect,
  onClear,
}: {
  /** The selection's colour, or "" when it inherits. */
  value: string;
  onSelect: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 flex-col gap-0"
              aria-label="Text colour"
            >
              <Baseline className="size-3.5" />
              <span
                className="h-1 w-4 rounded-full border border-border/40"
                style={{ backgroundColor: value === "" ? "currentColor" : value }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Text colour</TooltipContent>
      </Tooltip>

      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={value.toLowerCase() === color}
              onClick={() => {
                onSelect(color);
                setOpen(false);
              }}
              className={cn(
                "size-6 rounded-md border",
                value.toLowerCase() === color && "ring-2 ring-ring ring-offset-1",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          <Input
            type="color"
            aria-label="Custom text colour"
            value={value === "" ? "#000000" : value}
            onChange={(event) => onSelect(event.target.value)}
            className="h-7 w-12 p-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            <Ban />
            Default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
