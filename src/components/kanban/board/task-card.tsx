"use client";

import * as React from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { boardDict } from "@/shared/studio/board";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useShallow } from "zustand/react/shallow";
import {
  AlignLeft,
  Copy,
  GripVertical,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import { PRIORITY_META, type Member, type Task } from "@/components/kanban/lib/types";
import { subtaskProgress, useBoardStore } from "@/components/kanban/store/board-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/kanban/ui/dropdown-menu";
import { ProgressRing } from "@/components/kanban/board/progress-ring";
import { AssigneeStack, MetaStat, PriorityBadge, TagPill } from "@/components/kanban/board/meta-bits";

/* -------------------------------------------------------------------------- */
/*                            presentational shell                            */
/* -------------------------------------------------------------------------- */

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  task: Task;
  members: Member[];
  /** Rendered inside <DragOverlay>: lifted, tilted, non-interactive. */
  overlay?: boolean;
  /** The card is airborne — keep its space in the list but hide the visuals. */
  isPlaceholder?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const TaskCardShellInner = React.forwardRef<HTMLDivElement, ShellProps>(
  function TaskCardShell(
    {
      task,
      members,
      overlay,
      isPlaceholder,
      onEdit,
      onDuplicate,
      onDelete,
      className,
      ...rest
    },
    ref,
  ) {
    const tr = boardDict(useStudioLocale());
    const { done, total } = subtaskProgress(task);
    const priority = PRIORITY_META[task.priority];

    return (
      <div
        ref={ref}
        {...rest}
        className={cn(
          "group/card relative isolate w-full select-none rounded-xl p-3.5",
          // `glass-flat`, not `glass`: no per-card backdrop-filter. See the
          // note on `.glass-flat` in kanban.css.
          "glass-flat glass-sheen shadow-card",
          "transition-[box-shadow,border-color,transform] duration-200 ease-out",
          !overlay &&
            "cursor-grab hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_16px_36px_-18px_hsl(var(--primary)/0.5)] active:cursor-grabbing",
          overlay && "cursor-grabbing shadow-lift ring-1 ring-primary/40",
          isPlaceholder && "opacity-0",
          className,
        )}
      >
        {/* Priority spine — a 3px bar reading the task's urgency at a glance. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 start-0 w-[3px] rounded-full opacity-70 transition-opacity duration-200 group-hover/card:opacity-100",
            priority.dot,
          )}
        />

        {/* Header: title + hover-revealed controls */}
        <div className="flex items-start gap-2 ps-2">
          <h4 className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
            {task.title}
          </h4>

          {!overlay && (
            <div
              data-no-drag
              className={cn(
                "flex shrink-0 items-center gap-0.5",
                // Controls stay hidden until the card is hovered or focused.
                "opacity-0 transition-opacity duration-200",
                "focus-within:opacity-100 group-hover/card:opacity-100",
              )}
            >
              <button
                type="button"
                onClick={onEdit}
                aria-label={tr.editTask2}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90"
              >
                <Pencil className="size-3.5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={tr.taskOptions2}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90 data-[state=open]:bg-[hsl(var(--kb-accent)/0.7)]"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => onEdit?.()}>
                    <Pencil /> Edit task
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate?.()}>
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => onDelete?.()}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Grip is a pure affordance — the whole card is the drag handle. */}
          <GripVertical
            aria-hidden
            className={cn(
              "mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 transition-opacity duration-200",
              overlay ? "opacity-70" : "opacity-0 group-hover/card:opacity-100",
            )}
          />
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="mt-1.5 line-clamp-2 ps-2 text-[12px] leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1 ps-2">
            {task.tags.slice(0, 3).map((t) => (
              <TagPill key={t} label={t} />
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] font-medium text-muted-foreground/70">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: priority · meta · avatars · progress ring */}
        <div className="mt-3 flex items-center gap-2 ps-2">
          <PriorityBadge priority={task.priority} />

          {total > 0 && (
            <MetaStat
              icon={ListChecks}
              label={`${done}/${total}`}
              tooltip={`${done} of ${total} subtasks complete`}
            />
          )}

          {task.description && (
            <MetaStat
              icon={AlignLeft}
              label=""
              tooltip={tr.hasDescription2}
              className="gap-0"
            />
          )}

          <div className="ms-auto flex items-center gap-2">
            <AssigneeStack members={members} />
            {total > 0 && <ProgressRing done={done} total={total} size={30} />}
          </div>
        </div>
      </div>
    );
  },
);

/**
 * Memoised: a cross-column move rewrites the `tasks` map, but the individual
 * task objects that did not change keep their identity, so every untouched card
 * bails out of re-rendering instead of rebuilding its badges, avatars and ring.
 */
export const TaskCardShell = React.memo(TaskCardShellInner);

/* -------------------------------------------------------------------------- */
/*                              sortable wrapper                              */
/* -------------------------------------------------------------------------- */

function TaskCardInner({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: (taskId: string) => void;
}) {
  // `useShallow` is required: the mapped array is a fresh reference each call
  // and zustand v5 no longer shallow-compares snapshots for you.
  const members = useBoardStore(
    useShallow((s) =>
      task.assigneeIds
        .map((id) => s.members[id])
        .filter((m): m is Member => Boolean(m)),
    ),
  );
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const duplicateTask = useBoardStore((s) => s.duplicateTask);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", taskId: task.id, columnId: task.columnId },
    });

  // NOMPANY SEAM: the original wrapped this in a `motion.div` that faded the
  // card in on mount and owned nothing else (dnd-kit kept sole ownership of the
  // drag transform). motion is fenced out of the studio bundle, so the wrapper
  // is a plain div and the mount "pop" is the CSS keyframe already on the shell
  // (`animate-in fade-in zoom-in-[0.97]`). A card leaving a column mid-drag
  // unmounts instantly — the user is watching the DragOverlay, not this node.
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "relative z-0")}
    >
      <TaskCardShell
        task={task}
        members={members}
        isPlaceholder={isDragging}
        className="animate-in fade-in zoom-in-[0.97] duration-300 ease-out"
        onEdit={() => onEdit(task.id)}
        onDuplicate={() => duplicateTask(task.id)}
        onDelete={() => deleteTask(task.id)}
      />
    </div>
  );
}

// `onEdit` is a useState setter (stable), and `task` only changes identity when
// that specific task changes — so this memo actually holds during drags.
export const TaskCard = React.memo(TaskCardInner);
