"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import type { Editor } from "@tiptap/react";
import { AlignVerticalJustifyCenter } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  borderToCss,
  CELL_SIDES,
  type CellBorder,
  type CellSide,
} from "@/components/quality/editor/table-cells";
import { cn } from "@/lib/utils";

const VERTICAL_ALIGNS = [
  { id: "top", label: "Top" },
  { id: "middle", label: "Middle" },
  { id: "bottom", label: "Bottom" },
] as const;

const BORDER_STYLES: CellBorder["style"][] = [
  "solid",
  "dashed",
  "dotted",
  "double",
  "none",
];

const BACKGROUNDS = [
  { label: "None", value: "" },
  { label: "Grey", value: "#f4f4f5" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Green", value: "#dcfce7" },
  { label: "Amber", value: "#fef3c7" },
  { label: "Rose", value: "#ffe4e6" },
];

/**
 * Formatting for the selected cells. Everything is applied through
 * `setCellAttribute`, which writes to every cell in the current cell selection,
 * so one pass formats a whole selected block of the table.
 */
export function CellFormatDialog({
  editor,
  onOpenChange,
}: {
  editor: Editor;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const current = editor.getAttributes("tableCell");
  const currentHeader = editor.getAttributes("tableHeader");
  const existing = { ...currentHeader, ...current };

  const [background, setBackground] = useState<string>(
    typeof existing.background === "string" ? existing.background : "",
  );
  const [verticalAlign, setVerticalAlign] = useState<string>(
    typeof existing.verticalAlign === "string" ? existing.verticalAlign : "top",
  );
  const [padding, setPadding] = useState<string>(
    typeof existing.paddingPx === "number" ? String(existing.paddingPx) : "6",
  );
  const [border, setBorder] = useState<CellBorder>({
    widthPx: 1,
    style: "solid",
    color: "#d4d4d8",
  });
  const [sides, setSides] = useState<Record<CellSide, boolean>>({
    Top: true,
    Right: true,
    Bottom: true,
    Left: true,
  });

  function apply() {
    const chain = editor.chain().focus();

    chain.setCellAttribute("background", background === "" ? null : background);
    chain.setCellAttribute("verticalAlign", verticalAlign);

    const paddingValue = Number.parseFloat(padding);
    chain.setCellAttribute(
      "paddingPx",
      Number.isFinite(paddingValue) ? paddingValue : null,
    );

    const css = borderToCss(border);
    for (const side of CELL_SIDES) {
      // Sides left unticked keep whatever they already had.
      if (sides[side]) chain.setCellAttribute(`border${side}`, css);
    }

    chain.run();
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr.cellFormat}</DialogTitle>
          <DialogDescription>
            Applies to every selected cell. Drag across cells first to format
            several at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{tr.background}</Label>
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUNDS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={background === option.value}
                  onClick={() => setBackground(option.value)}
                  className={cn(
                    "size-7 rounded-md border",
                    background === option.value &&
                      "ring-2 ring-ring ring-offset-1",
                    option.value === "" && "bg-background",
                  )}
                  style={
                    option.value === ""
                      ? undefined
                      : { backgroundColor: option.value }
                  }
                />
              ))}
              <Input
                type="color"
                aria-label={tr.customBackgroundColour}
                value={background === "" ? "#ffffff" : background}
                onChange={(event) => setBackground(event.target.value)}
                className="h-7 w-12 p-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                <AlignVerticalJustifyCenter className="size-3.5" />
                Vertical align
              </Label>
              <div className="flex gap-1">
                {VERTICAL_ALIGNS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={verticalAlign === option.id}
                    onClick={() => setVerticalAlign(option.id)}
                    className={cn(
                      "flex-1 px-1 text-xs",
                      verticalAlign === option.id &&
                        "border-foreground/30 bg-muted",
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cell-padding">Padding (px)</Label>
              <Input
                id="cell-padding"
                type="number"
                min={0}
                max={48}
                step="any"
                value={padding}
                onChange={(event) => setPadding(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{tr.borders}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={12}
                step="any"
                aria-label={tr.borderWidthPixels}
                value={border.widthPx}
                onChange={(event) =>
                  setBorder((currentBorder) => ({
                    ...currentBorder,
                    widthPx: Number(event.target.value) || 0,
                  }))
                }
                className="w-20"
              />
              <Select
                value={border.style}
                onValueChange={(value) =>
                  setBorder((currentBorder) => ({
                    ...currentBorder,
                    style: value as CellBorder["style"],
                  }))
                }
              >
                <SelectTrigger className="flex-1" aria-label={tr.borderStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BORDER_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="color"
                aria-label={tr.borderColour}
                value={border.color}
                onChange={(event) =>
                  setBorder((currentBorder) => ({
                    ...currentBorder,
                    color: event.target.value,
                  }))
                }
                className="h-9 w-12 p-1"
              />
            </div>

            <div className="flex gap-1">
              {CELL_SIDES.map((side) => (
                <Button
                  key={side}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={sides[side]}
                  onClick={() =>
                    setSides((currentSides) => ({
                      ...currentSides,
                      [side]: !currentSides[side],
                    }))
                  }
                  className={cn(
                    "flex-1 px-1 text-xs",
                    sides[side] && "border-foreground/30 bg-muted",
                  )}
                >
                  {side}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={apply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
