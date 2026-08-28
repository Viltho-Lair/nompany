"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import type { Editor } from "@tiptap/react";
import {
  Combine,
  Grid2x2Plus,
  Grid3x3,
  PaintBucket,
  Split,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

import { CellFormatDialog } from "@/components/quality/editor/cell-format-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const GRID_ROWS = 6;
const GRID_COLUMNS = 8;

/**
 * Insert a table, and — once the caret is inside one — edit its structure and
 * the formatting of the selected cells.
 */
export function TableMenu({
  editor,
  inTable,
}: {
  editor: Editor;
  inTable: boolean;
}) {
  const tr = qualityDict(useStudioLocale());
  const [gridOpen, setGridOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  return (
    <>
      <Popover open={gridOpen} onOpenChange={setGridOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={tr.insertTable}
              >
                <TableIcon />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tr.insertTable}</TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-auto p-2">
          <SizeGrid
            onPick={(rows, columns) => {
              editor
                .chain()
                .focus()
                .insertTable({ rows, cols: columns, withHeaderRow: true })
                .run();
              setGridOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {inTable && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  aria-label={tr.tableOptions}
                >
                  <Grid3x3 className="size-4" />
                  Table
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{tr.tableOptions}</TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{tr.rows}</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addRowBefore().run()}
            >
              {tr.insertRowAbove}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addRowAfter().run()}
            >
              {tr.insertRowBelow}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().deleteRow().run()}
            >
              {tr.deleteRow}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>{tr.columns}</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addColumnBefore().run()}
            >
              {tr.insertColumnLeft}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().addColumnAfter().run()}
            >
              {tr.insertColumnRight}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().deleteColumn().run()}
            >
              {tr.deleteColumn}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>{tr.cells}</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().mergeCells().run()}
            >
              <Combine className="text-muted-foreground" />
              {tr.mergeSelected}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().splitCell().run()}
            >
              <Split className="text-muted-foreground" />
              {tr.splitCell}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setFormatOpen(true)}>
              <PaintBucket className="text-muted-foreground" />
              {tr.cellFormat}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              <Grid2x2Plus className="text-muted-foreground" />
              {tr.toggleHeaderRow}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              <Grid2x2Plus className="text-muted-foreground" />
              {tr.toggleHeaderColumn}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onSelect={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 />
              {tr.deleteTable}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {formatOpen && (
        <CellFormatDialog editor={editor} onOpenChange={setFormatOpen} />
      )}
    </>
  );
}

/** Hover-to-size grid, the usual way of choosing a table's dimensions. */
function SizeGrid({
  onPick,
}: {
  onPick: (rows: number, columns: number) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const [hover, setHover] = useState<{ row: number; column: number } | null>(
    null,
  );

  return (
    <div>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1rem)` }}
        onPointerLeave={() => setHover(null)}
      >
        {Array.from({ length: GRID_ROWS }, (_, row) =>
          Array.from({ length: GRID_COLUMNS }, (_, column) => {
            const active =
              hover !== null && row <= hover.row && column <= hover.column;
            return (
              <button
                key={`${row}-${column}`}
                type="button"
                aria-label={`${row + 1} by ${column + 1} table`}
                onPointerEnter={() => setHover({ row, column })}
                onFocus={() => setHover({ row, column })}
                onClick={() => onPick(row + 1, column + 1)}
                className={cn(
                  "size-4 rounded-[2px] border",
                  active ? "border-primary bg-primary/30" : "bg-muted",
                )}
              />
            );
          }),
        )}
      </div>
      <p className="pt-2 text-center text-xs text-muted-foreground">
        {hover === null
          ? tr.pickSize
          : `${hover.row + 1} × ${hover.column + 1}`}
      </p>
    </div>
  );
}
