"use client";

import * as React from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { boardDict, boardWord } from "@/shared/studio/board";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useShallow } from "zustand/react/shallow";
import Tooltip from "@mui/material/Tooltip";
import {
  ArrowDownWideNarrow,
  ArrowLeftToLine,
  ArrowRightToLine,
  CalendarClock,
  Copy,
  Eraser,
  GripVertical,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  SortAsc,
  Trash2,
} from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import {
  ACCENT_META,
  ACCENT_ORDER,
  type Column as ColumnType,
  type Task,
} from "@/components/kanban/lib/types";
import { matchesFilter, useBoardStore } from "@/components/kanban/store/board-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/kanban/ui/dropdown-menu";
import { Button } from "@/components/kanban/ui/button";
import { TaskCard } from "@/components/kanban/board/task-card";

/* -------------------------------------------------------------------------- */
/*                                column header                               */
/* -------------------------------------------------------------------------- */

function ColumnHeader({
  column,
  visibleCount,
  totalCount,
  onAddTask,
  dragHandleProps,
}: {
  column: ColumnType;
  visibleCount: number;
  totalCount: number;
  onAddTask: () => void;
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
}) {
  const tr = boardDict(useStudioLocale());
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const setColumnAccent = useBoardStore((s) => s.setColumnAccent);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);
  const duplicateColumn = useBoardStore((s) => s.duplicateColumn);
  const clearColumn = useBoardStore((s) => s.clearColumn);
  const sortColumn = useBoardStore((s) => s.sortColumn);
  const moveColumnBy = useBoardStore((s) => s.moveColumnBy);
  const columnOrder = useBoardStore((s) => s.columnOrder);
  const columnIndex = columnOrder.indexOf(column.id);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(column.title);
  const accent = ACCENT_META[column.accent];

  const commit = () => {
    renameColumn(column.id, draft);
    setEditing(false);
  };

  const overLimit = column.wipLimit !== null && totalCount > column.wipLimit;
  const filtered = visibleCount !== totalCount;

  return (
    <div className="relative shrink-0 px-3.5 pb-2 pt-3.5">
      {/* Accent bar — the only saturated element in the column chrome. */}
      <div
        className={cn(
          "absolute inset-x-3.5 top-0 h-[3px] rounded-b-full bg-gradient-to-r",
          accent.bar,
        )}
      />

      <div className="flex items-center gap-2">
        <span
          {...dragHandleProps}
          aria-label={`Drag column ${column.title}`}
          className="-ml-1 grid size-6 cursor-grab place-items-center rounded-md text-muted-foreground/50 transition-all duration-150 hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </span>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(column.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[13px] font-semibold outline-none ring-1 ring-primary/40"
          />
        ) : (
          <Tooltip title={tr.doubleClickRename} placement="top">
            <h3
              onDoubleClick={() => {
                setDraft(column.title);
                setEditing(true);
              }}
              className="min-w-0 flex-1 truncate text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/85"
            >
              {column.title}
            </h3>
          </Tooltip>
        )}

        {/* Count / WIP pill */}
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
            overLimit
              ? "bg-rose-500/15 text-rose-500 ring-1 ring-inset ring-rose-500/30"
              : "bg-foreground/[0.06] text-muted-foreground",
          )}
        >
          {filtered ? `${visibleCount}/${totalCount}` : totalCount}
          {column.wipLimit !== null && !filtered && (
            <span className="opacity-60"> / {column.wipLimit}</span>
          )}
        </span>

        <div className="flex items-center gap-0.5">
          <Tooltip title={tr.addTask} placement="top">
            <button
              type="button"
              onClick={onAddTask}
              aria-label={tr.addTask}
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90"
            >
              <Plus className="size-4" />
            </button>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={tr.columnOptions}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90 data-[state=open]:bg-[hsl(var(--kb-accent)/0.7)]"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={() => {
                  setDraft(column.title);
                  setEditing(true);
                }}
              >
                <Pencil /> {tr.renameColumn}
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={columnIndex <= 0}
                onSelect={() => moveColumnBy(column.id, -1)}
              >
                <ArrowLeftToLine /> {tr.moveLeft}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={columnIndex >= columnOrder.length - 1}
                onSelect={() => moveColumnBy(column.id, 1)}
              >
                <ArrowRightToLine /> {tr.moveRight}
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette /> {tr.accentColour}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {ACCENT_ORDER.map((a) => (
                    <DropdownMenuItem
                      key={a}
                      onSelect={() => setColumnAccent(column.id, a)}
                    >
                      <span
                        className={cn(
                          "size-3 rounded-full bg-gradient-to-br",
                          ACCENT_META[a].bar,
                        )}
                      />
                      {boardWord(tr, ACCENT_META[a].labelKey)}
                      {column.accent === a && (
                        <span className="ms-auto text-[10px] text-primary">
                          current
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowDownWideNarrow /> {tr.sortCards}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => sortColumn(column.id, "priority")}
                  >
                    <ArrowDownWideNarrow /> {tr.byPriority}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => sortColumn(column.id, "created")}
                  >
                    <CalendarClock /> {tr.newestFirst}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => sortColumn(column.id, "title")}>
                    <SortAsc /> A → Z
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{tr.dangerZone}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => duplicateColumn(column.id)}>
                <Copy /> {tr.duplicateColumn}
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => clearColumn(column.id)}
              >
                <Eraser /> {tr.clearAllCards}
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => deleteColumn(column.id)}
              >
                <Trash2 /> {tr.deleteColumn}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             presentational shell                           */
/* -------------------------------------------------------------------------- */

export function ColumnShell({
  column,
  children,
  overlay,
  isDropTarget,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  column: ColumnType;
  overlay?: boolean;
  isDropTarget?: boolean;
}) {
  const accent = ACCENT_META[column.accent];

  return (
    <div
      {...rest}
      className={cn(
        "relative flex h-full w-[310px] shrink-0 flex-col overflow-hidden rounded-2xl",
        "glass glass-sheen",
        "transition-[box-shadow,border-color] duration-300 ease-out",
        isDropTarget && "border-primary/45 shadow-glow",
        overlay && "shadow-lift ring-1 ring-primary/40",
        className,
      )}
    >
      {/* Accent bloom in the column's top corner. Painted as a radial falloff
          rather than a blurred disc — same look, no filter layer. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -left-16 -top-24 size-56 rounded-full",
          accent.bloom,
        )}
      />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               sortable column                              */
/* -------------------------------------------------------------------------- */

function BoardColumnInner({
  columnId,
  onEditTask,
  onAddTask,
  isDropTarget,
}: {
  columnId: string;
  onEditTask: (taskId: string) => void;
  onAddTask: (columnId: string) => void;
  isDropTarget: boolean;
}) {
  const tr = boardDict(useStudioLocale());
  // Each column subscribes to *its own* slice. Reading the whole `columns` map
  // higher up would re-render every column whenever any task moved.
  const column = useBoardStore((s) => s.columns[columnId]);
  const query = useBoardStore((s) => s.query);
  const priorityFilter = useBoardStore((s) => s.priorityFilter);

  const tasks = useBoardStore(
    useShallow((s) =>
      (s.columns[columnId]?.taskIds ?? [])
        .map((id) => s.tasks[id])
        .filter((t): t is Task => Boolean(t)),
    ),
  );

  const visible = React.useMemo(
    () => tasks.filter((t) => matchesFilter(t, query, priorityFilter)),
    [tasks, query, priorityFilter],
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    data: { type: "column", columnId },
  });

  if (!column) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("h-full", isDragging && "opacity-40")}
    >
      <ColumnShell column={column} isDropTarget={isDropTarget}>
        <ColumnHeader
          column={column}
          visibleCount={visible.length}
          totalCount={tasks.length}
          onAddTask={() => onAddTask(column.id)}
          dragHandleProps={{ ...attributes, ...listeners } as never}
        />

        {/* Card list — the scroll container and the task drop zone. */}
        <div className="scroll-fade min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
          <SortableContext
            items={visible.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2.5 py-1">
              {/*
                NOMPANY SEAM: the original wrapped the list in AnimatePresence
                for card exits. motion is fenced out of the studio bundle, so
                cards mount with the CSS pop on their shell and unmount
                instantly — the moved card is what the user is watching, not a
                fading ghost.
              */}
              {visible.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} />
              ))}

              {visible.length === 0 && (
                <button
                  type="button"
                  onClick={() => onAddTask(column.id)}
                  className={cn(
                    "grid h-24 w-full place-items-center rounded-xl animate-in fade-in duration-200",
                    "border border-dashed border-border/70 text-[12px] text-muted-foreground/70",
                    "transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground/70 active:scale-[0.99]",
                  )}
                >
                  {tasks.length === 0
                    ? tr.dropCardHereClick
                    : tr.noCardsMatchCurrent}
                </button>
              )}
            </div>
          </SortableContext>
        </div>

        {/* Footer add button */}
        <div className="shrink-0 px-3 pb-3 pt-1">
          <Button
            variant="ghost"
            onClick={() => onAddTask(column.id)}
            className="h-9 w-full justify-start gap-2 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" /> {tr.addACard}
          </Button>
        </div>
      </ColumnShell>
    </div>
  );
}

export const BoardColumn = React.memo(BoardColumnInner);
